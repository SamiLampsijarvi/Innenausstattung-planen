import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { validateStructuralFidelity } from "../../src/lib/ai/image-generation/structural-fidelity.server";

// Public test photos are deliberately excluded from Git. This test is a local
// calibration aid and never uploads photos, starts a provider, or writes data.
const root = path.resolve("private-evaluation/room-fidelity-calibration");
const files = ["R01.jpg", "R02.jpg", "R03.jpg", "R04.jpg", "R05.jpg", "R06.jpg"];

async function transformed(source: Uint8Array, type: "light" | "crop" | "perspective" | "furniture" | "door") {
  const image = sharp(source).rotate();
  if (type === "light") return new Uint8Array(await image.modulate({ brightness: 1.08, saturation: 0.9 }).jpeg().toBuffer());
  if (type === "crop") {
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error("Unlesbares Kalibrierungsbild.");
    const left = Math.round(width * 0.06);
    const top = Math.round(height * 0.04);
    return new Uint8Array(await image.extract({ left, top, width: width - 2 * left, height: height - 2 * top }).resize(width, height).jpeg().toBuffer());
  }
  if (type === "perspective") return new Uint8Array(await image.affine([[1, 0.12], [0, 1]], { background: { r: 240, g: 240, b: 240, alpha: 1 } }).jpeg().toBuffer());
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error("Unlesbares Kalibrierungsbild.");
  const overlay = type === "furniture"
    ? `<svg width="${width}" height="${height}"><ellipse cx="${width * 0.5}" cy="${height * 0.83}" rx="${width * 0.18}" ry="${height * 0.045}" fill="#cdbba5" opacity=".72"/><rect x="${width * 0.38}" y="${height * 0.67}" width="${width * 0.24}" height="${height * 0.13}" rx="18" fill="#807466" opacity=".78"/><rect x="${width * 0.35}" y="${height * 0.72}" width="${width * 0.3}" height="${height * 0.11}" rx="12" fill="#9f9384" opacity=".78"/></svg>`
    : `<svg width="${width}" height="${height}"><rect x="${width * 0.72}" y="${height * 0.16}" width="${width * 0.15}" height="${height * 0.58}" fill="#8c7561" stroke="#3d342e" stroke-width="10"/><circle cx="${width * 0.84}" cy="${height * 0.47}" r="9" fill="#d8ba77"/></svg>`;
  return new Uint8Array(await image.composite([{ input: Buffer.from(overlay) }]).jpeg().toBuffer());
}

for (const file of files) {
  test(`${file}: Lichtänderung besteht, Zuschnitt und Perspektive werden verworfen`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    const source = new Uint8Array(await readFile(filePath));
    const [light, crop, perspective] = await Promise.all([
      transformed(source, "light"), transformed(source, "crop"), transformed(source, "perspective"),
    ]);
    const [lightReport, cropReport, perspectiveReport] = await Promise.all([
      validateStructuralFidelity(source, light), validateStructuralFidelity(source, crop), validateStructuralFidelity(source, perspective),
    ]);
    expect(lightReport.status, JSON.stringify(lightReport)).toBe("passed");
    expect(cropReport.status, JSON.stringify(cropReport)).toBe("rejected");
    expect(perspectiveReport.status, JSON.stringify(perspectiveReport)).toBe("rejected");
  });

  test(`${file}: Möblierung besteht, zusätzliche Tür wird verworfen`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    const source = new Uint8Array(await readFile(filePath));
    const [furniture, door] = await Promise.all([transformed(source, "furniture"), transformed(source, "door")]);
    const [furnitureReport, doorReport] = await Promise.all([
      validateStructuralFidelity(source, furniture), validateStructuralFidelity(source, door),
    ]);
    expect(furnitureReport.status, JSON.stringify(furnitureReport)).toBe("passed");
    expect(doorReport.status, JSON.stringify(doorReport)).toBe("rejected");
  });
}
