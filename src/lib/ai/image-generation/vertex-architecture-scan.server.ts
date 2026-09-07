import { GoogleGenAI } from "@google/genai";
import { isRoomFidelityProfile, type RoomFidelityProfile } from "./room-fidelity";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "./test-limits";

const MODEL_ID = "gemini-2.5-flash";

/**
 * Server-only semantic aid. Its output is deliberately never sent to the
 * browser; it only constrains generation and the later structural review.
 */
export async function scanRoomArchitecture(options: {
  projectId: string;
  location?: string;
  bytes: Uint8Array;
  mime: "image/jpeg" | "image/png" | "image/webp";
}): Promise<RoomFidelityProfile> {
  if (!options.bytes.length || options.bytes.length > MAXIMUM_VERTEX_SOURCE_BYTES) throw new Error("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
  const location = options.location?.trim() || "global";
  if (location !== "global" || !options.projectId.trim()) throw new Error("Der Architektur-Scan ist nicht eingerichtet.");
  const client = new GoogleGenAI({ vertexai: true, project: options.projectId.trim(), location, apiVersion: "v1", httpOptions: { retryOptions: { attempts: 1 }, timeout: 60_000 } });
  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts: [
      { inlineData: { data: Buffer.from(options.bytes).toString("base64"), mimeType: options.mime } },
      { text: "Analysiere dieses leere Wohnzimmer nur als interne Schutzgrundlage. Antworte ausschließlich mit JSON: {\"doors\":0-12,\"windows\":0-12,\"openings\":0-12,\"protectedArchitecture\":true}. Zähle nur klar sichtbare Elemente. Im Zweifel wähle 0. Keine Erklärung." },
    ] }],
    config: { candidateCount: 1, maxOutputTokens: 128, responseMimeType: "application/json", httpOptions: { retryOptions: { attempts: 1 }, timeout: 60_000 } },
  });
  const text = response.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
  if (!text) throw new Error("Der Architektur-Scan lieferte keine verwertbare Antwort.");
  let profile: unknown;
  try { profile = JSON.parse(text); } catch { throw new Error("Der Architektur-Scan lieferte kein gültiges Profil."); }
  if (!isRoomFidelityProfile(profile)) throw new Error("Der Architektur-Scan lieferte kein sicheres Profil.");
  return profile;
}
