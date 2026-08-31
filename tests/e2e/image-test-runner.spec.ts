import { expect, test } from "@playwright/test";
import type { ImageGenerationProvider, ImageGenerationResult } from "../../src/lib/ai/image-generation/contracts";
import { runImageTest, type TestLedger } from "../../src/lib/ai/image-generation/test-runner";
import { assertImageTestWithinLimits } from "../../src/lib/ai/image-generation/test-limits";
import { isTrustedImageTestOrigin } from "../../src/lib/ai/image-generation/test-origin";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "../../src/lib/ai/image-generation/test-limits";

const result: ImageGenerationResult = { provider: "google-vertex", providerRequestId: "fake", image: new Uint8Array([1]),
  imageMimeType: "image/png", durationMs: 1, reservedCents: 30, actualChargedCents: null };

function fixture() {
  const events: string[] = [];
  const ledger: TestLedger = {
    async reserve() { events.push("reserve"); return { reservedCents: 30, style: "Japandi", budgetEuro: 1500, grantedAt: new Date().toISOString(), policyVersion: "vertex-test-v1" }; },
    async canDispatch() { events.push("consent"); return true; },
    async finish(value) { events.push(value ? "result" : "unknown"); return value ? "succeeded" : "unknown"; },
  };
  const provider: ImageGenerationProvider = { id: "google-vertex", maximumChargeCentsPerRequest: 30,
    async generate() { events.push("google"); return result; } };
  return { events, ledger, provider, options: { enabled: true, bytes: new Uint8Array([1]), mime: "image/png" as const, ledger, provider: () => provider } };
}

test("ohne Aktivierung weder Buchung noch Anbieterzugriff", async () => {
  const f = fixture();
  await expect(runImageTest({ ...f.options, enabled: false })).rejects.toThrow("ausgeschaltet");
  expect(f.events).toEqual([]);
});

test("zu großes Eingabefoto verbraucht weder Versuch noch Reservierung", async () => {
  const f = fixture();
  await expect(runImageTest({ ...f.options, bytes: new Uint8Array(MAXIMUM_VERTEX_SOURCE_BYTES + 1) })).rejects.toThrow("7 MB");
  expect(f.events).toEqual([]);
});

test("Foto genau an der Eingabegrenze bleibt zulässig", async () => {
  const f = fixture();
  await runImageTest({ ...f.options, bytes: new Uint8Array(MAXIMUM_VERTEX_SOURCE_BYTES) });
  expect(f.events).toEqual(["reserve", "consent", "google", "result"]);
});
test("bucht vor dem Versand und prüft unmittelbar vorher die Einwilligung", async () => {
  const f = fixture();
  await runImageTest(f.options);
  expect(f.events).toEqual(["reserve", "consent", "google", "result"]);
});
test("Widerruf nach Reservierung verhindert Versand", async () => {
  const f = fixture(); f.ledger.canDispatch = async () => false;
  await expect(runImageTest(f.options)).rejects.toThrow("ungeklärt");
  expect(f.events).toEqual(["reserve", "unknown"]);
});
test("unklare Reservierungsantwort wird niemals wiederholt", async () => {
  const f = fixture(); f.ledger.reserve = async () => { f.events.push("reserve"); throw new Error("connection lost after commit"); };
  await expect(runImageTest(f.options)).rejects.toThrow();
  expect(f.events).toEqual(["reserve"]);
});
test("Zeitlimit erzwingt Rückkehr auch wenn Anbieter Abbruch ignoriert", async () => {
  const f = fixture();
  f.provider.generate = async () => new Promise(() => {});
  await expect(runImageTest({ ...f.options, timeoutMs: 10 })).rejects.toThrow("ungeklärt");
  expect(f.events).toEqual(["reserve", "consent", "unknown"]);
});
test("Speicherfehler führen nicht zu zweiter Generierung", async () => {
  const f = fixture(); f.ledger.finish = async () => { f.events.push("save-failed"); throw new Error("offline"); };
  await expect(runImageTest(f.options)).rejects.toThrow("ungeklärt");
  expect(f.events.filter((event) => event === "google")).toHaveLength(1);
});
test("ungültige Geldbeträge werden gesperrt", () => {
  for (const cents of [NaN, Infinity, -1, 0, 0.1]) {
    expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 1, attemptsForPhoto: 0, reservedTotalCents: 0 }, cents)).toThrow();
  }
});
test("Herkunftsprüfung nutzt nur die ausdrücklich konfigurierte Testadresse", () => {
  expect(isTrustedImageTestOrigin("http://127.0.0.1:3102", "http://127.0.0.1:3102")).toBe(true);
  for (const origin of [null, "null", "https://evil.example", "http://localhost:3102"]) {
    expect(isTrustedImageTestOrigin(origin, "http://127.0.0.1:3102")).toBe(false);
  }
  for (const configured of [undefined, "null", "invalid", "https://example.test/path", "https://user:pass@example.test"]) {
    expect(isTrustedImageTestOrigin(configured ?? null, configured)).toBe(false);
  }
});
test("interner Bereich ist ohne Konfiguration gesperrt und mobil lesbar", async ({ page, request }) => {
  const response = await request.get("/api/internal/image-test");
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toBe("no-store");
  await page.goto("/internal/image-test");
  await expect(page.getByRole("heading", { name: "Interner Inspirationsbild-Test" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Einen kostenpflichtigen Versuch starten" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
