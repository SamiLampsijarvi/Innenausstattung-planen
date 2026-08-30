import { expect, test } from "@playwright/test";
import { furnitureCatalog } from "../../src/lib/furniture-catalog";
import {
  LOCALLY_DETECTABLE_FURNITURE_IDS,
  mergeLocalFurnitureDetections,
} from "../../src/lib/ai/local-furniture-detection";

test("deckt den vollständigen Wohnzimmer-Möbelkatalog ab", () => {
  expect(new Set(LOCALLY_DETECTABLE_FURNITURE_IDS)).toEqual(
    new Set(furnitureCatalog.map(({ id }) => id)),
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
