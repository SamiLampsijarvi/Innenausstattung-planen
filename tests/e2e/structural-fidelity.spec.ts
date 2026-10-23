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
