import { expect, test } from "@playwright/test";
import { syntheticProductCatalog } from "../../src/lib/product-catalog";
import { createAutomaticProductConcept, productPurchaseBlockers } from "../../src/lib/product-concept";

const room = { mode: "room-dimensions" as const, roomWidthCm: 450, roomDepthCm: 500 };

test("wählt automatisch stiltreue Testprodukte innerhalb des Gesamtbudgets", () => {
  const concept = createAutomaticProductConcept("Japandi", 1500, syntheticProductCatalog, room);
  expect(concept.completeness).toBe("complete");
  expect(concept.items.length).toBeGreaterThanOrEqual(4);
  expect(concept.items.every((item) => item.style === "Japandi")).toBe(true);
  expect(concept.totalCents + concept.reserveCents).toBeLessThanOrEqual(concept.budgetCents);
  expect(concept.totalCents).toBe(concept.productSubtotalCents + concept.shippingTotalCents);
});

test("überschreitet auch bei kleinem Budget niemals das Limit", () => {
  const concept = createAutomaticProductConcept("Modern", 100, syntheticProductCatalog, room);
  expect(concept.completeness).toBe("incomplete");
  expect(concept.totalCents + concept.reserveCents).toBeLessThanOrEqual(concept.budgetCents);
});

test("sperrt die Bildverwendung für synthetische Entwicklungsdaten", () => {
  const concept = createAutomaticProductConcept("Skandinavisch", 3000, syntheticProductCatalog, room);
  expect(concept.imageStatus).toBe("blocked-product-data");
  expect(concept.items.every((item) => item.rights === "synthetic-development-only")).toBe(true);
});

test("ignoriert Produkte ohne vollständigen Preis oder Verfügbarkeit", () => {
  const invalidCatalog = syntheticProductCatalog.map((product) => product.category === "sofa"
    ? { ...product, priceCents: null, availability: "out-of-stock" as const }
    : product);
  const concept = createAutomaticProductConcept("Boho", 3000, invalidCatalog, room);
  expect(concept.missingCategories).toContain("sofa");
  expect(concept.items.some((item) => item.category === "sofa")).toBe(false);
});

test("schließt Möbel aus, die nicht in die angegebenen Raummaße passen", () => {
  const concept = createAutomaticProductConcept("Modern", 3000, syntheticProductCatalog, { mode: "room-dimensions", roomWidthCm: 250, roomDepthCm: 200 });
  expect(concept.items.some((item) => item.category === "sofa")).toBe(false);
  expect(concept.missingCategories).toContain("sofa");
});

test("aktiviert Kauf und Bild erst bei vollständigem autorisiertem und aktuellem Datensatz", () => {
  const source = syntheticProductCatalog[0];
  const authorized = { ...source, dataSource: "authorized-feed" as const, availability: "in-stock" as const, rights: "licensed-display-and-ai" as const, productUrl: "https://haendler.example/produkt", imageUrl: "https://haendler.example/produkt.jpg", checkedAt: "2026-09-02T08:00:00.000Z" };
  expect(productPurchaseBlockers(authorized, new Date("2026-09-02T12:00:00.000Z"))).toEqual([]);
  expect(productPurchaseBlockers({ ...authorized, checkedAt: "2026-08-30T08:00:00.000Z" }, new Date("2026-09-02T12:00:00.000Z"))).toContain("Preis oder Verfügbarkeit älter als 24 Stunden");
  expect(productPurchaseBlockers({ ...authorized, productUrl: "http://unsicher.example" }, new Date("2026-09-02T12:00:00.000Z"))).toContain("Kein sicherer Kauf-Link");
  const authorizedCatalog = syntheticProductCatalog.map((product) => product.style === authorized.style && product.category === authorized.category ? authorized : product);
  expect(createAutomaticProductConcept(authorized.style, 3000, authorizedCatalog, room).items.some((item) => item.id === authorized.id)).toBe(true);
});
