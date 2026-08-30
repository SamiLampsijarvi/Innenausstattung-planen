import { furnitureCatalog } from "@/lib/furniture-catalog";

export const LOCAL_DETECTION_MODEL = "Xenova/detr-resnet-50";

type RawDetection = {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
};

type FurnitureDetector = (image: string, options: { threshold: number }) => Promise<RawDetection[]>;

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

export const LOCALLY_DETECTABLE_FURNITURE_IDS = [...new Set(Object.values(cocoFurnitureMap))];

let detectorPromise: Promise<FurnitureDetector> | null = null;

async function createDetector() {
  const { pipeline } = await import("@huggingface/transformers");
  // The integrated Intel graphics used for the prototype returned empty results
  // with WebGPU. WASM is slower but produced reliable detections on the target PC.
  return pipeline("object-detection", LOCAL_DETECTION_MODEL, { dtype: "q8", device: "wasm" });
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

export async function detectFurnitureLocally(imageUrl: string): Promise<LocalFurnitureDetection[]> {
  detectorPromise ??= createDetector() as unknown as Promise<FurnitureDetector>;
  const rawDetections = await (await detectorPromise)(imageUrl, { threshold: 0.6 });
  const detections = rawDetections.flatMap(({ label, score }) => {
    const catalogId = cocoFurnitureMap[label.toLowerCase()];
    const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
    return catalogItem ? [{ catalogId, label: catalogItem.label, confidence: score }] : [];
  });
  return mergeLocalFurnitureDetections(detections);
}
