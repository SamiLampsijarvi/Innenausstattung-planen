import sharp, { type Sharp } from "sharp";
import { validateStructuralFidelity, type StructuralFidelityReport } from "./structural-fidelity.server";

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";
export type OrientedImage = { bytes: Uint8Array; mime: SupportedImageMime };
export type CandidateOrientationResult = OrientedImage & { report: StructuralFidelityReport; correctionDegrees: 0 | 90 | 180 | 270 };

// Browser previews honor EXIF orientation while image providers may process raw
// pixels. Bake orientation into the pixels and remove EXIF before dispatch.
export async function normalizeImageOrientation(bytes: Uint8Array, mime: SupportedImageMime): Promise<OrientedImage> {
  return { bytes: new Uint8Array(await encode(sharp(bytes).rotate(), mime)), mime };
}

// A provider may return an otherwise matching image with a rotated pixel
// canvas. Correct it only when the corrected image passes every fidelity gate.
export async function correctCandidateOrientation(source: Uint8Array, candidate: Uint8Array, mime: SupportedImageMime): Promise<CandidateOrientationResult> {
  const normalizedCandidate = await normalizeImageOrientation(candidate, mime);
  const initialReport = await validateStructuralFidelity(source, normalizedCandidate.bytes);
  if (initialReport.status === "passed") return { ...normalizedCandidate, report: initialReport, correctionDegrees: 0 };
  for (const degrees of [90, 180, 270] as const) {
    const rotated = new Uint8Array(await encode(sharp(normalizedCandidate.bytes).rotate(degrees), mime));
    const report = await validateStructuralFidelity(source, rotated);
    if (report.status === "passed") return { bytes: rotated, mime, report, correctionDegrees: degrees };
  }
  return { ...normalizedCandidate, report: initialReport, correctionDegrees: 0 };
}

function encode(image: Sharp, mime: SupportedImageMime) {
  if (mime === "image/jpeg") return image.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  if (mime === "image/webp") return image.webp({ quality: 92 }).toBuffer();
  return image.png({ compressionLevel: 9 }).toBuffer();
}
