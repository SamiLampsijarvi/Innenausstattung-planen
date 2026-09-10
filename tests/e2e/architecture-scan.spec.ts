import { expect, test } from "@playwright/test";
import { scanRoomArchitecture } from "../../src/lib/ai/image-generation/vertex-architecture-scan.server";
import { safeTestErrorCode } from "../../src/lib/ai/image-generation/safe-test-error";

const options = { projectId: "offline", bytes: new Uint8Array([1]), mime: "image/png" as const };
const profile = { doors: 1, windows: 2, openings: 0, protectedArchitecture: true };

test("Raumanalyse nutzt begrenzte strukturierte Antworten ohne Denkbudget", async () => {
  let received: unknown;
  const client = { models: { generateContent: async (input: unknown) => {
    received = input;
    return { candidates: [{ content: { parts: [{ thought: true, text: "ignored" }, { text: JSON.stringify(profile) }] } }] };
  } } };
  expect(await scanRoomArchitecture(options, client as never)).toEqual(profile);
  expect(received).toMatchObject({ config: { maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json", httpOptions: { retryOptions: { attempts: 1 } } } });
});

for (const [label, response, code] of [
  ["leere Antwort", {}, "SCAN_EMPTY"],
  ["abgeschnittene Antwort", { candidates: [{ finishReason: "MAX_TOKENS" }] }, "SCAN_TRUNCATED"],
  ["ungültiges JSON", { candidates: [{ content: { parts: [{ text: "{" }] } }] }, "SCAN_INVALID"],
  ["ungeschützte Architektur", { candidates: [{ content: { parts: [{ text: JSON.stringify({ ...profile, protectedArchitecture: false }) }] } }] }, "SCAN_INVALID"],
] as const) {
  test(`Raumanalyse klassifiziert ${label} ohne Wiederholung`, async () => {
    let calls = 0;
    const client = { models: { generateContent: async () => { calls++; return response; } } };
    await expect(scanRoomArchitecture(options, client as never)).rejects.toMatchObject({ code });
    expect(calls).toBe(1);
  });
}

test("Fehlerdiagnosen geben keine Providertexte oder Geheimnisse weiter", () => {
  expect(safeTestErrorCode({ status: 403, message: "secret-photo-token" })).toBe("GOOGLE_AUTH");
  expect(safeTestErrorCode(new Error("secret-photo-token"))).toBe("UNCLASSIFIED");
  expect(safeTestErrorCode({ code: "SCAN_TRUNCATED" })).toBe("SCAN_TRUNCATED");
});
