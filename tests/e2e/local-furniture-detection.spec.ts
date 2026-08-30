import { expect, test } from "@playwright/test";
import {
  LOCALLY_DETECTABLE_FURNITURE_IDS,
  mergeLocalFurnitureDetections,
} from "../../src/lib/ai/local-furniture-detection";

test("dokumentiert die zuverlässig unterstützten lokalen Möbelarten", () => {
  expect(new Set(LOCALLY_DETECTABLE_FURNITURE_IDS)).toEqual(
    new Set(["sofa", "armchair", "dining-table", "television", "large-plant"]),
  );
});

test("führt doppelte Treffer zusammen und behält den sichersten", () => {
  expect(mergeLocalFurnitureDetections([
    { catalogId: "sofa", label: "Sofa / Couch", confidence: 0.72 },
    { catalogId: "rug", label: "Teppich", confidence: 0.81 },
    { catalogId: "sofa", label: "Sofa / Couch", confidence: 0.96 },
  ])).toEqual([
    { catalogId: "sofa", label: "Sofa / Couch", confidence: 0.96 },
    { catalogId: "rug", label: "Teppich", confidence: 0.81 },
  ]);
});
