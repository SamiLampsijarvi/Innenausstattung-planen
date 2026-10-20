import sharp from "sharp";

export type RoomTransformation = "light" | "crop" | "perspective" | "furniture" | "door" | "window" | "wallArt";

// Deliberately simple test overlays; they are not photo-realistic AI results.
export async function transformRoom(source: Uint8Array, type: RoomTransformation): Promise<Uint8Array> {
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
    : type === "wallArt"
      ? `<svg width="${width}" height="${height}"><rect x="${width * 0.69}" y="${height * 0.22}" width="${width * 0.16}" height="${height * 0.22}" fill="#bbac93" stroke="#6d5d49" stroke-width="9"/><circle cx="${width * 0.77}" cy="${height * 0.33}" r="${width * 0.045}" fill="#e3d4bb"/></svg>`
      : type === "window"
        ? `<svg width="${width}" height="${height}"><rect x="${width * 0.69}" y="${height * 0.22}" width="${width * 0.16}" height="${height * 0.22}" fill="#8bb8d3" stroke="#6d5d49" stroke-width="9"/><path d="M${width * 0.77} ${height * 0.22}v${height * 0.22}M${width * 0.69} ${height * 0.33}h${width * 0.16}" stroke="#efe9df" stroke-width="7"/></svg>`
        : `<svg width="${width}" height="${height}"><rect x="${width * 0.72}" y="${height * 0.16}" width="${width * 0.15}" height="${height * 0.58}" fill="#8c7561" stroke="#3d342e" stroke-width="10"/><circle cx="${width * 0.84}" cy="${height * 0.47}" r="9" fill="#d8ba77"/></svg>`;
  return new Uint8Array(await image.composite([{ input: Buffer.from(overlay) }]).jpeg().toBuffer());
}
