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
  try {
    if ("gpu" in navigator) {
      return await pipeline("object-detection", LOCAL_DETECTION_MODEL, { ...options, device: "webgpu" });
    }
  } catch {
    // Some integrated graphics advertise WebGPU but cannot run every model.
  }
  return pipeline("object-detection", LOCAL_DETECTION_MODEL, { ...options, device: "wasm" });
}

export async function detectFurnitureLocally(imageUrl: string): Promise<LocalFurnitureDetection[]> {
  detectorPromise ??= createDetector() as unknown as Promise<FurnitureDetector>;
  const detector = await detectorPromise;
  const rawDetections = await detector(imageUrl, { threshold: 0.6 });

  return rawDetections.flatMap(({ label, score }) => {
    const catalogId = cocoFurnitureMap[label.toLowerCase()];
    const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
    return catalogItem ? [{ catalogId, label: catalogItem.label, confidence: score }] : [];
  }).slice(0, 12);
}
