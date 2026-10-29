import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { validateStructuralFidelity } from "../../src/lib/ai/image-generation/structural-fidelity.server";

async function roomImage(options?: { shifted?: boolean; width?: number; tint?: string; furniture?: boolean; wallArt?: boolean; extraDoor?: boolean; extraWindow?: "plain" | "divided" }) {
  const width = options?.width ?? 640;
  const shift = options?.shifted ? 70 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="480">
    <rect width="100%" height="100%" fill="${options?.tint ?? "#eee7da"}"/>
    <path d="M0 330 L320 ${210 + shift} L${width} 330" fill="none" stroke="#4a453e" stroke-width="8"/>
    <path d="M320 ${210 + shift} L320 0 M40 40 L40 330 M600 40 L600 330" stroke="#4a453e" stroke-width="8"/>
    <rect x="80" y="80" width="140" height="160" fill="#b9d4df" stroke="#4a453e" stroke-width="8"/>
    <rect x="430" y="110" width="120" height="220" fill="#9b8068" stroke="#4a453e" stroke-width="8"/>
    ${options?.furniture ? '<rect x="80" y="300" width="230" height="110" rx="18" fill="#494847" stroke="#393938" stroke-width="8"/>' : ''}
    ${options?.wallArt ? '<rect x="340" y="85" width="65" height="85" fill="#a79c87" stroke="#6b6053" stroke-width="7"/><circle cx="370" cy="125" r="20" fill="#ddd0b7"/>' : ''}
    ${options?.extraDoor ? '<rect x="320" y="135" width="95" height="195" fill="#ad9883" stroke="#393938" stroke-width="8"/>' : ''}
    ${options?.extraWindow ? `<rect x="345" y="95" width="100" height="105" fill="#b9d4df" stroke="#4a453e" stroke-width="8"/>${options.extraWindow === "divided" ? '<path d="M395 95v105M345 147h100" stroke="#f4f0e8" stroke-width="7"/>' : ''}` : ''}
  </svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

test("akzeptiert dieselbe Raumstruktur trotz anderer Farbwirkung", async () => {
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ tint: "#d8cdbb" }));
  expect(report.status).toBe("passed");
  expect(report.edgeRetention).toBeGreaterThan(0.9);
});

test("verwirft verschobene Perspektiv- und Raumkanten", async () => {
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ shifted: true }));
  expect(report.status, JSON.stringify(report)).toBe("rejected");
  expect(report.reasons.length).toBeGreaterThan(0);
});

test("verwirft einen veränderten Bildausschnitt", async () => {
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ width: 520 }));
  expect(report.status).toBe("rejected");
  expect(report.aspectRatioDifference).toBeGreaterThan(0.015);
});

test("bekannte Grenze: neue Wanddekoration bei fester Raumstruktur", async () => {
  test.fail(true, "structure-v3 verwechselt neue Wanddekoration mit möglicher Architekturänderung.");
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ wallArt: true }));
  expect(report.status, JSON.stringify(report)).toBe("passed");
});

test("bekannte Grenze: ersetzte Möbel bei fester Raumstruktur", async () => {
  test.fail(true, "structure-v3 zählt Kanten vorhandener Möbel als feste Raumkanten.");
  const report = await validateStructuralFidelity(await roomImage({ furniture: true }), await roomImage());
  expect(report.status, JSON.stringify(report)).toBe("passed");
});

test("bekannte Grenze: neue Wanddekoration und ersetzte Möbel zusammen", async () => {
  test.fail(true, "Der kombinierte Fall ist noch nicht sicher von Architekturänderungen zu unterscheiden.");
  const report = await validateStructuralFidelity(await roomImage({ furniture: true }), await roomImage({ wallArt: true }));
  expect(report.status, JSON.stringify(report)).toBe("passed");
});

test("verwirft eine zusätzlich erfundene Tür trotz vorhandener Möbel", async () => {
  const report = await validateStructuralFidelity(await roomImage({ furniture: true }), await roomImage({ extraDoor: true }));
  expect(report.status, JSON.stringify(report)).toBe("rejected");
});

test("erkennt ein neu eingefügtes Fensterkreuz im Wandbereich", async () => {
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ extraWindow: "divided" }));
  expect(report.status, JSON.stringify(report)).toBe("rejected");
  expect(report.newOrthogonalJunctions).toBeGreaterThan(0);
});

test("verwirft auch ein neues Fenster ohne sichtbare Mittelteilung", async () => {
  const report = await validateStructuralFidelity(await roomImage(), await roomImage({ extraWindow: "plain" }));
  expect(report.status, JSON.stringify(report)).toBe("rejected");
  expect(report.newOrthogonalJunctions).toBe(0);
});

const allowedRoomChanges = [
  { name: "Möbel hinzufügen", source: {}, candidate: { furniture: true } },
  { name: "Möbel entfernen", source: { furniture: true }, candidate: {} },
  { name: "Licht wärmer machen", source: {}, candidate: { tint: "#d8cdbb" } },
  { name: "Wandbild ergänzen", source: {}, candidate: { wallArt: true } },
  { name: "Licht ändern und Möbel ergänzen", source: {}, candidate: { furniture: true, tint: "#d8cdbb" } },
  { name: "Licht ändern und Wandbild ergänzen", source: {}, candidate: { wallArt: true, tint: "#d8cdbb" } },
  { name: "Möbel entfernen und Wandbild ergänzen", source: { furniture: true }, candidate: { wallArt: true } },
  { name: "Möbel austauschen und Licht ändern", source: { furniture: true }, candidate: { tint: "#d8cdbb" } },
  { name: "Möbel, Licht und Wandbild ändern", source: { furniture: true }, candidate: { furniture: true, wallArt: true, tint: "#d8cdbb" } },
  { name: "Möbel entfernen und Licht ändern", source: { furniture: true }, candidate: { tint: "#d8cdbb" } },
] as const;

const forbiddenRoomChanges = [
  { name: "Perspektive verschieben", source: {}, candidate: { shifted: true } },
  { name: "Bildausschnitt ändern", source: {}, candidate: { width: 520 } },
  { name: "Neue Tür ergänzen", source: {}, candidate: { extraDoor: true } },
  { name: "Neue geteilte Fensterfläche ergänzen", source: {}, candidate: { extraWindow: "divided" as const } },
  { name: "Neue ungeteilte Fensterfläche ergänzen", source: {}, candidate: { extraWindow: "plain" as const } },
  { name: "Tür bei vorhandenen Möbeln ergänzen", source: { furniture: true }, candidate: { extraDoor: true } },
  { name: "Fenster bei vorhandenen Möbeln ergänzen", source: { furniture: true }, candidate: { extraWindow: "divided" as const } },
  { name: "Perspektive mit Möbeln verschieben", source: { furniture: true }, candidate: { shifted: true } },
  { name: "Bildausschnitt mit Wandbild ändern", source: {}, candidate: { width: 520, wallArt: true } },
  { name: "Tür und Fenster ergänzen", source: {}, candidate: { extraDoor: true, extraWindow: "plain" as const } },
] as const;

for (const scenario of allowedRoomChanges) {
  test(`Testkorpus erlaubt: ${scenario.name}`, async () => {
    // Das ist das gewünschte Produktverhalten. Die bekannten Fehlablehnungen
    // bleiben als erwartete Fehler sichtbar, statt als richtiger Zustand zu gelten.
    test.fail(
      scenario.name !== "Licht wärmer machen",
      "structure-v4 sperrt diese erlaubte Umgestaltung aktuell noch.",
    );
    const report = await validateStructuralFidelity(await roomImage(scenario.source), await roomImage(scenario.candidate));
    expect(report.version).toBe("structure-v4");
    expect(report.status, JSON.stringify(report)).toBe("passed");
  });
}

for (const scenario of forbiddenRoomChanges) {
  test(`Testkorpus sperrt: ${scenario.name}`, async () => {
    const report = await validateStructuralFidelity(await roomImage(scenario.source), await roomImage(scenario.candidate));
    expect(report.status, JSON.stringify(report)).toBe("rejected");
  });
}

test("protokolliert Ausgangsmessung und unsicheren Wandtoleranz-Versuch", async () => {
  const allowedReports = await Promise.all(allowedRoomChanges.map(async (scenario) =>
    validateStructuralFidelity(await roomImage(scenario.source), await roomImage(scenario.candidate))));
  const forbiddenReports = await Promise.all(forbiddenRoomChanges.map(async (scenario) =>
    validateStructuralFidelity(await roomImage(scenario.source), await roomImage(scenario.candidate))));
  const baselineAllowed = allowedReports.filter((report) => report.status === "passed").length;
  const baselineForbidden = forbiddenReports.filter((report) => report.status === "rejected").length;
  const relaxedAllowed = allowedReports.filter((report) => report.reasons.every((reason) => reason.includes("Wandbereich"))).length;
  const relaxedForbidden = forbiddenReports.filter((report) => report.reasons.some((reason) => !reason.includes("Wandbereich"))).length;
  console.info(JSON.stringify({
    baseline: { allowedAccepted: `${baselineAllowed}/10`, forbiddenRejected: `${baselineForbidden}/10` },
    wallToleranceExperiment: { allowedAccepted: `${relaxedAllowed}/10`, forbiddenRejected: `${relaxedForbidden}/10` },
    conclusion: "Rejected: wall-only tolerance would allow structural edits.",
  }));
  // Die Messwerte halten den Ausgangspunkt fest. Wenn sie sich ändern, soll
  // der Test auffallen und die Dokumentation bewusst aktualisiert werden.
  expect(baselineAllowed).toBe(1);
  expect(baselineForbidden).toBe(10);
  expect(relaxedAllowed).toBeGreaterThan(baselineAllowed);
  expect(relaxedForbidden).toBeLessThan(10);
});
