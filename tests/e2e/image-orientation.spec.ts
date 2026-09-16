import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { correctCandidateOrientation, normalizeImageOrientation } from "../../src/lib/ai/image-generation/image-orientation.server";

async function roomImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#eee7da"/><path d="M0 330 L320 210 L640 330 M320 210 L320 0 M40 40 L40 330 M600 40 L600 330" fill="none" stroke="#4a453e" stroke-width="8"/><rect x="80" y="80" width="140" height="160" fill="#b9d4df" stroke="#4a453e" stroke-width="8"/><rect x="430" y="110" width="120" height="220" fill="#9b8068" stroke="#4a453e" stroke-width="8"/></svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

test("bäckt eine EXIF-Drehung in die Vertex-Eingabepixel ein", async () => {
  const exifRotated = new Uint8Array(await sharp(await roomImage()).jpeg().withMetadata({ orientation: 6 }).toBuffer());
  const normalized = await normalizeImageOrientation(exifRotated, "image/jpeg");
  const metadata = await sharp(normalized.bytes).metadata();
  expect(metadata.width).toBe(480);
  expect(metadata.height).toBe(640);
  expect(metadata.orientation ?? 1).toBe(1);
});

test("korrigiert eine reine 90-Grad-Drehung nur nach bestandener Raumtreue", async () => {
  const source = await roomImage();
  const rotated = new Uint8Array(await sharp(source).rotate(90).png().toBuffer());
  const corrected = await correctCandidateOrientation(source, rotated, "image/png");
  expect(corrected.correctionDegrees).toBe(270);
  expect(corrected.report.status, JSON.stringify(corrected.report)).toBe("passed");
});
