import { expect, test } from "@playwright/test";
import { syntheticProductCatalog } from "../../src/lib/product-catalog";
import { createAutomaticProductConcept } from "../../src/lib/product-concept";

test("wählt automatisch stiltreue Testprodukte innerhalb des Gesamtbudgets", () => {
  const concept = createAutomaticProductConcept("Japandi", 1500, syntheticProductCatalog);
  expect(concept.completeness).toBe("complete");
  expect(concept.items.length).toBeGreaterThanOrEqual(4);
  expect(concept.items.every((item) => item.style === "Japandi")).toBe(true);
  expect(concept.totalCents + concept.reserveCents).toBeLessThanOrEqual(concept.budgetCents);
  expect(concept.totalCents).toBe(concept.productSubtotalCents + concept.shippingTotalCents);
});

test("überschreitet auch bei kleinem Budget niemals das Limit", () => {
  const concept = createAutomaticProductConcept("Modern", 100, syntheticProductCatalog);
  expect(concept.completeness).toBe("incomplete");
  expect(concept.totalCents + concept.reserveCents).toBeLessThanOrEqual(concept.budgetCents);
});

test("sperrt die Bildverwendung für synthetische Entwicklungsdaten", () => {
  const concept = createAutomaticProductConcept("Skandinavisch", 3000, syntheticProductCatalog);
  expect(concept.imageStatus).toBe("blocked-missing-rights");
  expect(concept.items.every((item) => item.rights === "synthetic-development-only")).toBe(true);
});

test("ignoriert Produkte ohne vollständigen Preis oder Verfügbarkeit", () => {
  const invalidCatalog = syntheticProductCatalog.map((product) => product.category === "sofa"
    ? { ...product, priceCents: null, availability: "unavailable" as const }
    : product);
  const concept = createAutomaticProductConcept("Boho", 3000, invalidCatalog);
  expect(concept.missingCategories).toContain("sofa");
  expect(concept.items.some((item) => item.category === "sofa")).toBe(false);
});
