import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { validateStructuralFidelity } from "../../src/lib/ai/image-generation/structural-fidelity.server";

async function roomImage(options?: { shifted?: boolean; width?: number; tint?: string }) {
  const width = options?.width ?? 640;
  const shift = options?.shifted ? 70 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="480">
    <rect width="100%" height="100%" fill="${options?.tint ?? "#eee7da"}"/>
    <path d="M0 330 L320 ${210 + shift} L${width} 330" fill="none" stroke="#4a453e" stroke-width="8"/>
    <path d="M320 ${210 + shift} L320 0 M40 40 L40 330 M600 40 L600 330" stroke="#4a453e" stroke-width="8"/>
    <rect x="80" y="80" width="140" height="160" fill="#b9d4df" stroke="#4a453e" stroke-width="8"/>
    <rect x="430" y="110" width="120" height="220" fill="#9b8068" stroke="#4a453e" stroke-width="8"/>
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
