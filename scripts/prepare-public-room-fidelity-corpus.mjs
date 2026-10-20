import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// This is intentionally separate from the application and does not know about
// Supabase, Vertex, credentials, or the normal photo flow.
const calibrationRecords = [
  ["R01", "5353938", "Curtis Adams", "empty-living-room-with-wooden-floor-and-green-walls-5353938"],
  ["R02", "6835103", "Curtis Adams", "empty-living-room-6835103"],
  ["R03", "7027844", "Curtis Adams", "an-empty-living-room-with-hardwood-flooring-7027844"],
  ["R04", "15062100", "Curtis Adams", "empty-living-room-with-with-walls-15062100"],
  ["R05", "34764063", "Peter Vang", "bright-and-spacious-empty-living-room-interior-34764063"],
  ["R06", "34764078", "Peter Vang", "spacious-empty-living-room-with-carpet-flooring-34764078"],
];
const holdoutRecords = [
  ["R07", "7031603", "Max Vakhtbovych", "spacious-empty-room-with-white-walls-7031603"],
  ["R08", "18559639", "Stephen Leonardi", "a-empty-room-with-white-walls-and-carpet-18559639"],
];

const mode = process.argv[2];
if (process.argv.length !== 3 || !["--confirm-download", "--confirm-download-holdout"].includes(mode)) {
  console.error("Kein Download. Nur --confirm-download oder --confirm-download-holdout ruft den jeweiligen lokalen Testbestand von Pexels ab.");
  process.exitCode = 1;
} else {
  const holdout = mode === "--confirm-download-holdout";
  const records = holdout ? holdoutRecords : calibrationRecords;
  const directory = path.resolve("private-evaluation/room-fidelity-calibration");
  await mkdir(directory, { recursive: true });
  const manifestName = holdout ? "holdout-sources.json" : "sources.json";
  if (existsSync(path.join(directory, manifestName)) || records.some(([id]) => existsSync(path.join(directory, `${id}.jpg`)))) {
    throw new Error("Der ausgewählte lokale Testbestand existiert bereits; vorhandene Bilder werden nicht überschrieben.");
  }
  const downloadedAt = new Date().toISOString();
  const manifest = [];
  const images = [];
  for (const [id, photoId, author, slug] of records) {
    const assetUrl = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1280`;
    const response = await fetch(assetUrl, { headers: { Referer: "https://www.pexels.com/" } });
    if (!response.ok) throw new Error(`Abruf von ${id} fehlgeschlagen.`);
    // Re-encoding omits source EXIF/XMP metadata. The source response is never saved.
    const bytes = await sharp(Buffer.from(await response.arrayBuffer())).rotate().jpeg({ quality: 88 }).toBuffer();
    images.push([id, bytes]);
    manifest.push({
      id, file: `${id}.jpg`, author, downloadedAt, licenseUrl: "https://www.pexels.com/license/",
      sourceUrl: `https://www.pexels.com/photo/${slug}/`, assetUrl,
    });
  }
  for (const [id, bytes] of images) await writeFile(path.join(directory, `${id}.jpg`), bytes, { flag: "wx" });
  await writeFile(path.join(directory, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  console.log(`${records.length} lokale, metadatenbereinigte ${holdout ? "Rückhaltebilder" : "Kalibrierungsbilder"} gespeichert. Keine KI-Anfrage wurde ausgeführt.`);
}
