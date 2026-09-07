import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// This is intentionally separate from the application and does not know about
// Supabase, Vertex, credentials, or the normal photo flow.
const records = [
  ["R01", "5353938", "Curtis Adams", "empty-living-room-with-wooden-floor-and-green-walls-5353938"],
  ["R02", "6835103", "Curtis Adams", "empty-living-room-6835103"],
  ["R03", "7027844", "Curtis Adams", "an-empty-living-room-with-hardwood-flooring-7027844"],
  ["R04", "15062100", "Curtis Adams", "empty-living-room-with-with-walls-15062100"],
  ["R05", "34764063", "Peter Vang", "bright-and-spacious-empty-living-room-interior-34764063"],
  ["R06", "34764078", "Peter Vang", "spacious-empty-living-room-with-carpet-flooring-34764078"],
];

if (process.argv.length !== 3 || process.argv[2] !== "--confirm-download") {
  console.error("Kein Download. Ausschließlich mit --confirm-download wird der lokale Testbestand von Pexels abgerufen.");
  process.exitCode = 1;
} else {
  const directory = path.resolve("private-evaluation/room-fidelity-calibration");
  await mkdir(directory, { recursive: true });
  const downloadedAt = new Date().toISOString();
  const manifest = [];
  for (const [id, photoId, author, slug] of records) {
    const assetUrl = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1280`;
    const response = await fetch(assetUrl, { headers: { Referer: "https://www.pexels.com/" } });
    if (!response.ok) throw new Error(`Abruf von ${id} fehlgeschlagen.`);
    // Re-encoding omits source EXIF/XMP metadata. The source response is never saved.
    const bytes = await sharp(Buffer.from(await response.arrayBuffer())).rotate().jpeg({ quality: 88 }).toBuffer();
    await writeFile(path.join(directory, `${id}.jpg`), bytes, { flag: "wx" });
    manifest.push({
      id, file: `${id}.jpg`, author, downloadedAt, licenseUrl: "https://www.pexels.com/license/",
      sourceUrl: `https://www.pexels.com/photo/${slug}/`, assetUrl,
    });
  }
  await writeFile(path.join(directory, "sources.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  console.log("Sechs lokale, metadatenbereinigte Kalibrierungsbilder gespeichert. Keine KI-Anfrage wurde ausgeführt.");
}
