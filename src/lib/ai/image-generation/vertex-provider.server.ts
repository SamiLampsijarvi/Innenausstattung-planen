import { GoogleGenAI, Modality } from "@google/genai";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "./test-limits";
import { roomFidelityInstruction } from "./room-fidelity";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from "./contracts";

const MODEL_ID = "gemini-3.1-flash-image";

type VertexProviderConfig = {
  projectId: string;
  location?: string;
  maximumRequestCents: number;
};

type VertexResponse = Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;
type VertexClient = {
  models: {
    generateContent: GoogleGenAI["models"]["generateContent"];
  };
};

export class VertexImageResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VertexImageResponseError";
  }
}

export function createVertexImageProvider(
  config: VertexProviderConfig,
  injectedClient?: VertexClient,
): ImageGenerationProvider {
  const projectId = config.projectId.trim();
  const location = config.location?.trim() || "global";
  if (location !== "global") throw new VertexImageResponseError("Für diesen Test ist nur der geprüfte globale Endpunkt vorgesehen.");

  if (!projectId) {
    throw new VertexImageResponseError("Die Google-Cloud-Projektkennung fehlt.");
  }
  if (!Number.isSafeInteger(config.maximumRequestCents) || config.maximumRequestCents < 1 || config.maximumRequestCents > 300) {
    throw new VertexImageResponseError("Eine geprüfte Kostenreservierung fehlt.");
  }

  const client = injectedClient ?? new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
    apiVersion: "v1",
    httpOptions: { retryOptions: { attempts: 1 }, timeout: 120_000 },
  });

  return {
    id: "google-vertex",
    maximumChargeCentsPerRequest: config.maximumRequestCents,
    async generate(request, signal) {
      signal.throwIfAborted();
      if (!request.input.sourceImage.length || request.input.sourceImage.length > MAXIMUM_VERTEX_SOURCE_BYTES) {
        throw new VertexImageResponseError("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
      }
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: MODEL_ID,
        contents: [{
          role: "user",
          parts: [
            {
              inlineData: {
                data: Buffer.from(request.input.sourceImage).toString("base64"),
                mimeType: request.input.sourceImageMimeType,
              },
            },
            { text: buildRoomPrompt(request) },
          ],
        }],
        config: {
          abortSignal: signal,
          candidateCount: 1,
          maxOutputTokens: 2048,
          httpOptions: { retryOptions: { attempts: 1 }, timeout: 120_000 },
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          imageConfig: { imageSize: "1K" },
        },
      });

      signal.throwIfAborted();
      return toImageResult(response, Date.now() - startedAt, config.maximumRequestCents);
    },
  };
}

function buildRoomPrompt(request: ImageGenerationRequest) {
  return [
    "Erstelle aus diesem Wohnzimmerfoto ein realistisches Inspirationsbild.",
    `Designstil: ${request.input.style}.`,
    `Budgetrahmen für die spätere Einrichtung: höchstens ${request.input.budgetEuro} Euro.`,
    "Bewahre Raumgeometrie, Perspektive, Fenster, Türen, Wände und Boden so genau wie möglich.",
    "Erzeuge keine Personen, Texte, Logos, Grundrisse oder Maßangaben.",
    "Das Ergebnis ist eine Inspiration und keine maßgenaue Planung.",
    roomFidelityInstruction(request.input.roomFidelity),
  ].join(" ");
}

function toImageResult(response: VertexResponse, durationMs: number, reservedCents: number): ImageGenerationResult {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  const data = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType;

  if (!data || !isSupportedImageMimeType(mimeType)) {
    throw new VertexImageResponseError("Vertex AI hat kein unterstütztes Bild zurückgegeben.");
  }

  return {
    provider: "google-vertex",
    providerRequestId: response.responseId || crypto.randomUUID(),
    image: new Uint8Array(Buffer.from(data, "base64")),
    imageMimeType: mimeType,
    durationMs,
    // Vertex reports final costs asynchronously. The test ledger reserves the
    // conservative per-request ceiling and reconciles it with Cloud Billing.
    reservedCents,
    actualChargedCents: null,
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount,
      responseTokens: response.usageMetadata?.candidatesTokenCount,
      totalTokens: response.usageMetadata?.totalTokenCount,
    },
  };
}

function isSupportedImageMimeType(value: string | undefined): value is ImageGenerationResult["imageMimeType"] {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

