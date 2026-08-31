import { expect, test } from "@playwright/test";
import type { ImageGenerationRequest } from "../../src/lib/ai/image-generation/contracts";
import {
  assertImageTestWithinLimits,
  IMAGE_TEST_LIMITS,
} from "../../src/lib/ai/image-generation/test-limits";
import {
  createVertexImageProvider,
  VertexImageResponseError,
} from "../../src/lib/ai/image-generation/vertex-provider.server";

const request: ImageGenerationRequest = {
  input: {
    sourceImage: new Uint8Array([1, 2, 3]),
    sourceImageMimeType: "image/jpeg",
    roomType: "living-room",
    style: "Japandi",
    budgetEuro: 3_000,
  },
  consent: { granted: true, grantedAt: "2026-08-30T12:00:00.000Z", policyVersion: "test-v1" },
  maximumChargeCents: 10,
};

test("verlangt eine Google-Cloud-Projektkennung, ohne eine Verbindung aufzubauen", () => {
  expect(() => createVertexImageProvider({ projectId: "", maximumRequestCents: 10 })).toThrow(VertexImageResponseError);
});

test("wandelt eine kontrollierte Vertex-Testantwort in das gemeinsame Format um", async () => {
  let receivedModel = "";
  let receivedConfig: unknown;
  const client = {
    models: {
      async generateContent(parameters: { model: string; config: unknown }) {
        receivedModel = parameters.model;
        receivedConfig = parameters.config;
        return {
          responseId: "vertex-test-response",
          candidates: [{ content: { parts: [{ inlineData: { data: "BAUG", mimeType: "image/png" } }] } }],
        };
      },
    },
  };
  const provider = createVertexImageProvider({ projectId: "raumly-test", maximumRequestCents: 10 }, client as never);

  const result = await provider.generate(request, new AbortController().signal);

  expect(receivedModel).toBe("gemini-3.1-flash-image");
  expect(receivedConfig).toMatchObject({ candidateCount: 1, maxOutputTokens: 2048, imageConfig: { imageSize: "1K" }, httpOptions: { retryOptions: { attempts: 1 }, timeout: 120000 } });
  expect(result.provider).toBe("google-vertex");
  expect(result.providerRequestId).toBe("vertex-test-response");
  expect(result.imageMimeType).toBe("image/png");
  expect(result.image).toEqual(new Uint8Array([4, 5, 6]));
  expect(result.reservedCents).toBe(10);
  expect(result.actualChargedCents).toBeNull();
});

test("erzwingt fünf Fotos, zwei Versuche und drei Euro internes Budget", () => {
  expect(IMAGE_TEST_LIMITS).toEqual({ maximumPhotos: 5, maximumAttemptsPerPhoto: 2, maximumTotalCents: 300 });
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 1, reservedTotalCents: 290 }, 10)).not.toThrow();
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 6, attemptsForPhoto: 0, reservedTotalCents: 0 }, 10)).toThrow("fünf freigegebene Fotos");
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 2, reservedTotalCents: 0 }, 10)).toThrow("zwei Versuche");
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 0, reservedTotalCents: 295 }, 10)).toThrow("drei Euro");
});

test("weist übergroße Fotos auch bei direktem Adapteraufruf ohne Netzaufruf ab", async () => {
  let called = false;
  const client = { models: { async generateContent() { called = true; return {}; } } };
  const provider = createVertexImageProvider({ projectId: "raumly-test", maximumRequestCents: 30 }, client as never);
  await expect(provider.generate({ ...request, input: { ...request.input, sourceImage: new Uint8Array(7_000_001) } }, new AbortController().signal)).rejects.toThrow("7 MB");
  expect(called).toBe(false);
});

