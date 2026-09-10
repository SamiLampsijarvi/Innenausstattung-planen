import { GoogleGenAI, Type } from "@google/genai";
import { isRoomFidelityProfile, type RoomFidelityProfile } from "./room-fidelity";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "./test-limits";

const MODEL_ID = "gemini-2.5-flash";

export class ArchitectureScanError extends Error {
  constructor(public readonly code: "SCAN_EMPTY" | "SCAN_TRUNCATED" | "SCAN_INVALID") {
    super(code);
    this.name = "ArchitectureScanError";
  }
}

/**
 * Server-only semantic aid. Its output is deliberately never sent to the
 * browser; it only constrains generation and the later structural review.
 */
export async function scanRoomArchitecture(options: {
  projectId: string;
  location?: string;
  bytes: Uint8Array;
  mime: "image/jpeg" | "image/png" | "image/webp";
}, injectedClient?: Pick<GoogleGenAI, "models">): Promise<RoomFidelityProfile> {
  if (!options.bytes.length || options.bytes.length > MAXIMUM_VERTEX_SOURCE_BYTES) throw new Error("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
  const location = options.location?.trim() || "global";
  if (location !== "global" || !options.projectId.trim()) throw new Error("Der Architektur-Scan ist nicht eingerichtet.");
  const client = injectedClient ?? new GoogleGenAI({ vertexai: true, project: options.projectId.trim(), location, apiVersion: "v1", httpOptions: { retryOptions: { attempts: 1 }, timeout: 60_000 } });
  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts: [
      { inlineData: { data: Buffer.from(options.bytes).toString("base64"), mimeType: options.mime } },
      { text: "Analysiere dieses leere Wohnzimmer nur als interne Schutzgrundlage. Antworte ausschließlich mit JSON: {\"doors\":0-12,\"windows\":0-12,\"openings\":0-12,\"protectedArchitecture\":true}. Zähle nur klar sichtbare Elemente. Im Zweifel wähle 0. Keine Erklärung." },
    ] }],
    config: {
      candidateCount: 1, maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, required: ["doors", "windows", "openings", "protectedArchitecture"], properties: {
        doors: { type: Type.INTEGER, minimum: 0, maximum: 12 },
        windows: { type: Type.INTEGER, minimum: 0, maximum: 12 },
        openings: { type: Type.INTEGER, minimum: 0, maximum: 12 },
        protectedArchitecture: { type: Type.BOOLEAN },
      } },
      httpOptions: { retryOptions: { attempts: 1 }, timeout: 60_000 },
    },
  });
  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new ArchitectureScanError("SCAN_TRUNCATED");
  const text = response.candidates?.[0]?.content?.parts?.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("");
  if (!text) throw new ArchitectureScanError("SCAN_EMPTY");
  let profile: unknown;
  try { profile = JSON.parse(text); } catch { throw new ArchitectureScanError("SCAN_INVALID"); }
  if (!isRoomFidelityProfile(profile)) throw new ArchitectureScanError("SCAN_INVALID");
  return profile;
}
