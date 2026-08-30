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

let detectorPromise: Promise<FurnitureDetector> | null = null;

async function createDetector() {
  const { pipeline } = await import("@huggingface/transformers");
  const options = { dtype: "q8" as const };
  // The integrated Intel graphics used for the prototype returned empty results
  // with WebGPU. WASM is slower but produced reliable detections on the target PC.
  return pipeline("object-detection", LOCAL_DETECTION_MODEL, { ...options, device: "wasm" });
}

export async function detectFurnitureLocally(imageUrl: string): Promise<LocalFurnitureDetection[]> {
  detectorPromise ??= createDetector() as unknown as Promise<FurnitureDetector>;
  const detector = await detectorPromise;
  const rawDetections = await detector(imageUrl, { threshold: 0.6 });
  const bestDetectionByCatalogId = new Map<string, LocalFurnitureDetection>();

  rawDetections.forEach(({ label, score }) => {
    const catalogId = cocoFurnitureMap[label.toLowerCase()];
    const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
    const previousDetection = bestDetectionByCatalogId.get(catalogId);
    if (catalogItem && (!previousDetection || score > previousDetection.confidence)) {
      bestDetectionByCatalogId.set(catalogId, { catalogId, label: catalogItem.label, confidence: score });
    }
  });

  return [...bestDetectionByCatalogId.values()].slice(0, 12);
}
