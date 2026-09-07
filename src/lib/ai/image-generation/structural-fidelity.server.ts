import sharp from "sharp";

const ANALYSIS_SIZE = 192;
const EDGE_THRESHOLD = 38;

export type StructuralFidelityReport = {
  status: "passed" | "rejected";
  version: "structure-v3";
  reasons: string[];
  sourceWidth: number;
  sourceHeight: number;
  candidateWidth: number;
  candidateHeight: number;
  aspectRatioDifference: number;
  edgeRetention: number;
  alignedEdgeRetention: number;
  wallAppearanceChangeRate: number;
  orientationSimilarity: number;
  regionalStructureSimilarity: number;
};

export async function validateStructuralFidelity(
  source: Uint8Array,
  candidate: Uint8Array,
): Promise<StructuralFidelityReport> {
  const [sourceMeta, candidateMeta] = await Promise.all([sharp(source).metadata(), sharp(candidate).metadata()]);
  if (!sourceMeta.width || !sourceMeta.height || !candidateMeta.width || !candidateMeta.height) {
    throw new Error("Bildabmessungen konnten nicht geprüft werden.");
  }

  const [sourcePixels, candidatePixels] = await Promise.all([
    grayscale(source), grayscale(candidate),
  ]);
  const sourceEdges = sobel(sourcePixels);
  const candidateEdges = sobel(candidatePixels);
  const aspectRatioDifference = relativeDifference(
    sourceMeta.width / sourceMeta.height,
    candidateMeta.width / candidateMeta.height,
  );
  const edgeRetention = retainedEdges(sourceEdges.magnitude, candidateEdges.magnitude);
  const alignedEdgeRetention = retainedEdges(sourceEdges.magnitude, candidateEdges.magnitude, 0);
  const wallAppearanceChangeRate = wallAppearanceChanges(sourcePixels, candidatePixels);
  const orientationSimilarity = cosineSimilarity(
    orientationHistogram(sourceEdges),
    orientationHistogram(candidateEdges),
  );
  const regionalStructureSimilarity = regionalSimilarity(sourceEdges.magnitude, candidateEdges.magnitude);
  const reasons: string[] = [];

  if (aspectRatioDifference > 0.015) reasons.push("Das Seitenverhältnis und damit der Bildausschnitt wurde verändert.");
  // A full-room generation may add furniture edges, but it must still retain
  // almost all strong source edges. This deliberately favors false rejects.
  if (edgeRetention < 0.9) reasons.push("Zu viele feste Kanten des Ausgangsraums fehlen oder wurden verschoben.");
  if (alignedEdgeRetention < 0.82) reasons.push("Feste Raumkanten liegen nicht mehr an ihrer ursprünglichen Bildposition; der Bildausschnitt wurde wahrscheinlich verändert.");
  // New, large changes in the wall region are treated as architecture. This
  // deliberately rejects uncertain wall decoration rather than risk a door,
  // window, or wall being invented by a full-room image generator.
  if (wallAppearanceChangeRate > 0.015) reasons.push("Im Wandbereich wurden zu viele neue Bildflächen erkannt; eine zusätzliche Tür, ein Fenster oder eine Wand ist möglich.");
  if (orientationSimilarity < 0.72) reasons.push("Die Richtungen der Raumlinien und die Perspektive weichen zu stark ab.");
  if (regionalStructureSimilarity < 0.5) reasons.push("Die räumliche Verteilung der festen Strukturen hat sich zu stark verändert.");

  return {
    status: reasons.length ? "rejected" : "passed",
    version: "structure-v3",
    reasons,
    sourceWidth: sourceMeta.width,
    sourceHeight: sourceMeta.height,
    candidateWidth: candidateMeta.width,
    candidateHeight: candidateMeta.height,
    aspectRatioDifference,
    edgeRetention,
    alignedEdgeRetention,
    wallAppearanceChangeRate,
    orientationSimilarity,
    regionalStructureSimilarity,
  };
}

async function grayscale(bytes: Uint8Array) {
  const { data } = await sharp(bytes)
    .rotate()
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

type Edges = { magnitude: Float32Array; horizontal: Float32Array; vertical: Float32Array };

function sobel(pixels: Uint8Array): Edges {
  const magnitude = new Float32Array(pixels.length);
  const horizontal = new Float32Array(pixels.length);
  const vertical = new Float32Array(pixels.length);
  for (let y = 1; y < ANALYSIS_SIZE - 1; y += 1) {
    for (let x = 1; x < ANALYSIS_SIZE - 1; x += 1) {
      const i = y * ANALYSIS_SIZE + x;
      const gx = -pixels[i - ANALYSIS_SIZE - 1] + pixels[i - ANALYSIS_SIZE + 1]
        - 2 * pixels[i - 1] + 2 * pixels[i + 1]
        - pixels[i + ANALYSIS_SIZE - 1] + pixels[i + ANALYSIS_SIZE + 1];
      const gy = -pixels[i - ANALYSIS_SIZE - 1] - 2 * pixels[i - ANALYSIS_SIZE] - pixels[i - ANALYSIS_SIZE + 1]
        + pixels[i + ANALYSIS_SIZE - 1] + 2 * pixels[i + ANALYSIS_SIZE] + pixels[i + ANALYSIS_SIZE + 1];
      horizontal[i] = gx;
      vertical[i] = gy;
      magnitude[i] = Math.hypot(gx, gy);
    }
  }
  return { magnitude, horizontal, vertical };
}

function retainedEdges(source: Float32Array, candidate: Float32Array, tolerance = 2) {
  let total = 0;
  let retained = 0;
  for (let y = 2; y < ANALYSIS_SIZE - 2; y += 1) {
    for (let x = 2; x < ANALYSIS_SIZE - 2; x += 1) {
      const index = y * ANALYSIS_SIZE + x;
      if (source[index] < EDGE_THRESHOLD) continue;
      total += 1;
      let found = false;
      for (let dy = -tolerance; dy <= tolerance && !found; dy += 1) {
        for (let dx = -tolerance; dx <= tolerance; dx += 1) {
          if (candidate[(y + dy) * ANALYSIS_SIZE + x + dx] >= EDGE_THRESHOLD) { found = true; break; }
        }
      }
      if (found) retained += 1;
    }
  }
  return total ? retained / total : 0;
}

function wallAppearanceChanges(source: Uint8Array, candidate: Uint8Array) {
  let changed = 0;
  const wallEnd = Math.floor(ANALYSIS_SIZE * 0.7);
  for (let y = 2; y < wallEnd; y += 1) {
    for (let x = 2; x < ANALYSIS_SIZE - 2; x += 1) {
      if (Math.abs(source[y * ANALYSIS_SIZE + x] - candidate[y * ANALYSIS_SIZE + x]) >= 45) changed += 1;
    }
  }
  return changed / ((wallEnd - 4) * (ANALYSIS_SIZE - 4));
}

export function orientationHistogram(edges: Edges) {
  const histogram = new Array<number>(12).fill(0);
  for (let index = 0; index < edges.magnitude.length; index += 1) {
    if (edges.magnitude[index] < EDGE_THRESHOLD) continue;
    const angle = (Math.atan2(edges.vertical[index], edges.horizontal[index]) + Math.PI) % Math.PI;
    histogram[Math.min(11, Math.floor(angle / Math.PI * 12))] += edges.magnitude[index];
  }
  return histogram;
}

function regionalSimilarity(source: Float32Array, candidate: Float32Array) {
  const sourceGrid = edgeDensityGrid(source);
  const candidateGrid = edgeDensityGrid(candidate);
  return cosineSimilarity(sourceGrid, candidateGrid);
}

function edgeDensityGrid(edges: Float32Array) {
  const grid = new Array<number>(36).fill(0);
  for (let y = 0; y < ANALYSIS_SIZE; y += 1) {
    for (let x = 0; x < ANALYSIS_SIZE; x += 1) {
      const cell = Math.min(5, Math.floor(y / 32)) * 6 + Math.min(5, Math.floor(x / 32));
      if (edges[y * ANALYSIS_SIZE + x] >= EDGE_THRESHOLD) grid[cell] += 1;
    }
  }
  return grid;
}

export function cosineSimilarity(left: number[], right: number[]) {
  let dot = 0;
  let leftLength = 0;
  let rightLength = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftLength += left[index] ** 2;
    rightLength += right[index] ** 2;
  }
  return leftLength && rightLength ? dot / Math.sqrt(leftLength * rightLength) : 0;
}

function relativeDifference(left: number, right: number) {
  return Math.abs(left - right) / Math.max(left, right);
}
