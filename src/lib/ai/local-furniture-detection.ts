import { furnitureCatalog } from "@/lib/furniture-catalog";

export const LOCAL_DETECTION_MODEL = "Xenova/detr-resnet-50";
export const SUPPLEMENTAL_DETECTION_MODEL = "Xenova/owlvit-base-patch32";

type RawDetection = {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
};

type ObjectDetector = (image: string, options: { threshold: number }) => Promise<RawDetection[]>;
type ZeroShotObjectDetector = (
  image: string,
  candidateLabels: string[],
  options: { threshold: number },
) => Promise<RawDetection[]>;

type SupplementalFurnitureLabel = {
  prompt: string;
  catalogId: string;
  minimumConfidence: number;
};

export type LocalFurnitureDetection = {
  catalogId: string;
  label: string;
  confidence: number;
};

const cocoFurnitureMap: Record<string, string> = {
  couch: "sofa",
  chair: "armchair",
  "dining table": "dining-table",
  tv: "television",
  "potted plant": "large-plant",
};

// OWL-ViT only searches for categories that the fixed COCO model cannot name
// precisely. Conservative per-category limits reduce visually similar false hits.
const supplementalFurnitureLabels: SupplementalFurnitureLabel[] = [
  { prompt: "coffee table", catalogId: "coffee-table", minimumConfidence: 0.28 },
  { prompt: "TV stand", catalogId: "tv-lowboard", minimumConfidence: 0.2 },
  { prompt: "rug", catalogId: "rug", minimumConfidence: 0.25 },
  { prompt: "floor lamp", catalogId: "floor-lamp", minimumConfidence: 0.24 },
  { prompt: "side table", catalogId: "side-table", minimumConfidence: 0.25 },
  { prompt: "ottoman", catalogId: "pouf", minimumConfidence: 0.25 },
  { prompt: "small bench", catalogId: "bench", minimumConfidence: 0.25 },
  { prompt: "dining chair", catalogId: "dining-chair", minimumConfidence: 0.28 },
  { prompt: "sideboard", catalogId: "sideboard", minimumConfidence: 0.24 },
  { prompt: "dresser", catalogId: "dresser", minimumConfidence: 0.25 },
  { prompt: "shelf", catalogId: "shelf", minimumConfidence: 0.22 },
  { prompt: "bookcase", catalogId: "bookcase", minimumConfidence: 0.2 },
  { prompt: "closed cabinet", catalogId: "closed-cabinet", minimumConfidence: 0.25 },
  { prompt: "plant stand", catalogId: "plant-stand", minimumConfidence: 0.25 },
  { prompt: "wall mirror", catalogId: "wall-mirror", minimumConfidence: 0.24 },
  { prompt: "curtains", catalogId: "curtains", minimumConfidence: 0.24 },
  { prompt: "decorative pillows", catalogId: "cushions", minimumConfidence: 0.24 },
  { prompt: "throw blanket", catalogId: "throws", minimumConfidence: 0.24 },
  { prompt: "table lamp", catalogId: "table-lamps", minimumConfidence: 0.25 },
  { prompt: "console table", catalogId: "console", minimumConfidence: 0.25 },
  { prompt: "pendant light", catalogId: "pendant-light", minimumConfidence: 0.25 },
];

export const LOCALLY_DETECTABLE_FURNITURE_IDS = [
  ...new Set([...Object.values(cocoFurnitureMap), ...supplementalFurnitureLabels.map(({ catalogId }) => catalogId)]),
];

const supplementalLabelByPrompt = new Map(
  supplementalFurnitureLabels.map((entry) => [entry.prompt.toLowerCase(), entry]),
);

let objectDetectorPromise: Promise<ObjectDetector> | null = null;
let supplementalDetectorPromise: Promise<ZeroShotObjectDetector> | null = null;

async function createObjectDetector() {
  const { pipeline } = await import("@huggingface/transformers");
  // The integrated Intel graphics returned empty results with WebGPU. WASM is
  // slower, but reliable on the target PC and keeps all photo data local.
  return pipeline("object-detection", LOCAL_DETECTION_MODEL, { dtype: "q8", device: "wasm" });
}

async function createSupplementalDetector() {
  const { pipeline } = await import("@huggingface/transformers");
  return pipeline("zero-shot-object-detection", SUPPLEMENTAL_DETECTION_MODEL, { dtype: "q8", device: "wasm" });
}

function toCatalogDetection(catalogId: string, confidence: number): LocalFurnitureDetection | null {
  const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
  return catalogItem ? { catalogId, label: catalogItem.label, confidence } : null;
}

export function mergeLocalFurnitureDetections(detections: LocalFurnitureDetection[]) {
  const bestDetectionByCatalogId = new Map<string, LocalFurnitureDetection>();
  detections.forEach((detection) => {
    const previous = bestDetectionByCatalogId.get(detection.catalogId);
    if (!previous || detection.confidence > previous.confidence) {
      bestDetectionByCatalogId.set(detection.catalogId, detection);
    }
  });
  return [...bestDetectionByCatalogId.values()].sort((a, b) => b.confidence - a.confidence);
}

async function detectReliableFurniture(imageUrl: string) {
  objectDetectorPromise ??= createObjectDetector() as unknown as Promise<ObjectDetector>;
  const rawDetections = await (await objectDetectorPromise)(imageUrl, { threshold: 0.6 });
  return rawDetections.flatMap(({ label, score }) => {
    const catalogId = cocoFurnitureMap[label.toLowerCase()];
    const detection = catalogId ? toCatalogDetection(catalogId, score) : null;
    return detection ? [detection] : [];
  });
}

async function detectSupplementalFurniture(imageUrl: string) {
  supplementalDetectorPromise ??= createSupplementalDetector() as unknown as Promise<ZeroShotObjectDetector>;
  const prompts = supplementalFurnitureLabels.map(({ prompt }) => prompt);
  const rawDetections = await (await supplementalDetectorPromise)(imageUrl, prompts, { threshold: 0.2 });
  return rawDetections.flatMap(({ label, score }) => {
    const definition = supplementalLabelByPrompt.get(label.toLowerCase());
    if (!definition || score < definition.minimumConfidence) return [];
    const detection = toCatalogDetection(definition.catalogId, score);
    return detection ? [detection] : [];
  });
}

export async function detectFurnitureLocally(imageUrl: string): Promise<LocalFurnitureDetection[]> {
  const detections: LocalFurnitureDetection[] = [];
  let successfulModels = 0;

  // Each model is isolated: if one is unsupported or fails, the other model can
  // still return its results. The proven detector therefore remains the fallback.
  try {
    detections.push(...await detectReliableFurniture(imageUrl));
    successfulModels += 1;
  } catch {
    objectDetectorPromise = null;
  }

  try {
    detections.push(...await detectSupplementalFurniture(imageUrl));
    successfulModels += 1;
  } catch {
    supplementalDetectorPromise = null;
  }

  if (successfulModels === 0) {
    throw new Error("No local furniture detector could be started.");
  }

  return mergeLocalFurnitureDetections(detections);
}
