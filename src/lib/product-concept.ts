import type { CatalogProduct, ProductCategory } from "./product-catalog";

export type ScaleBasis = { mode: "room-dimensions"; roomWidthCm: number; roomDepthCm: number } | { mode: "reference"; referenceLengthCm: number };

export type ProductConceptItem = Pick<CatalogProduct, "id" | "sourceProductId" | "title" | "category" | "priceCents" | "shippingCents" | "widthCm" | "heightCm" | "depthCm" | "style" | "color" | "material" | "retailer" | "currency" | "availability" | "rights" | "productUrl" | "imageUrl" | "dataSource" | "checkedAt">;

export type ProductConcept = {
  version: 1;
  style: string;
  scaleBasis: ScaleBasis;
  budgetCents: number;
  reserveCents: number;
  productSubtotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  remainingCents: number;
  completeness: "complete" | "incomplete";
  missingCategories: ProductCategory[];
  items: ProductConceptItem[];
  imageStatus: "blocked-product-data" | "eligible";
};

const essentialCategories: ProductCategory[] = ["sofa", "coffee-table", "rug", "floor-lamp"];
const optionalCategories: ProductCategory[] = ["armchair", "sideboard", "plant"];

export function calculateSafetyReserve(budgetCents: number) {
  return Math.min(10000, Math.max(2000, Math.floor(budgetCents * 0.05)));
}

export function isProductCurrent(product: CatalogProduct, now = new Date()) {
  const checkedAt = new Date(product.checkedAt);
  const age = now.getTime() - checkedAt.getTime();
  return !Number.isNaN(checkedAt.getTime()) && age >= 0 && age <= 24 * 60 * 60 * 1000;
}

export function productPurchaseBlockers(product: CatalogProduct, now = new Date()) {
  const blockers: string[] = [];
  if (product.dataSource !== "authorized-feed") blockers.push("Keine autorisierte Händlerquelle");
  if (product.availability !== "in-stock") blockers.push("Nicht als verfügbar bestätigt");
  if (product.priceCents === null || product.shippingCents === null) blockers.push("Preis oder Versand fehlt");
  if (!product.productUrl || !/^https:\/\//.test(product.productUrl)) blockers.push("Kein sicherer Kauf-Link");
  if (!isProductCurrent(product, now)) blockers.push("Preis oder Verfügbarkeit älter als 24 Stunden");
  if (product.rights !== "licensed-display-and-ai" || !product.imageUrl) blockers.push("Bild- und KI-Rechte nicht belegt");
  return blockers;
}

function fitsRoom(product: CatalogProduct, scaleBasis: ScaleBasis) {
  if (scaleBasis.mode === "reference") return true;
  return product.widthCm <= scaleBasis.roomWidthCm * 0.75 && product.depthCm <= scaleBasis.roomDepthCm * 0.5;
}

export function createAutomaticProductConcept(style: string, budgetEuro: number, catalog: CatalogProduct[], scaleBasis: ScaleBasis): ProductConcept {
  const budgetCents = Math.max(0, Math.floor(budgetEuro * 100));
  const reserveCents = Math.min(budgetCents, calculateSafetyReserve(budgetCents));
  const spendLimit = budgetCents - reserveCents;
  const candidates = catalog.filter((product) =>
    product.style === style
    && (product.availability === "test-only" || product.availability === "in-stock")
    && product.priceCents !== null
    && product.shippingCents !== null,
  ).filter((product) => fitsRoom(product, scaleBasis));
  const items: ProductConceptItem[] = [];
  let totalCents = 0;

  for (const category of [...essentialCategories, ...optionalCategories]) {
    const candidate = candidates
      .filter((product) => product.category === category)
      .sort((left, right) => (left.priceCents! + left.shippingCents!) - (right.priceCents! + right.shippingCents!))[0];
    if (!candidate) continue;
    const itemTotal = candidate.priceCents! + candidate.shippingCents!;
    if (totalCents + itemTotal > spendLimit) continue;
    items.push(candidate);
    totalCents += itemTotal;
  }

  const selectedCategories = new Set(items.map((item) => item.category));
  const missingCategories = essentialCategories.filter((category) => !selectedCategories.has(category));
  const productSubtotalCents = items.reduce((sum, item) => sum + (item.priceCents ?? 0), 0);
  const shippingTotalCents = items.reduce((sum, item) => sum + (item.shippingCents ?? 0), 0);
  return {
    version: 1,
    style,
    scaleBasis,
    budgetCents,
    reserveCents,
    productSubtotalCents,
    shippingTotalCents,
    totalCents,
    remainingCents: budgetCents - totalCents,
    completeness: missingCategories.length ? "incomplete" : "complete",
    missingCategories,
    items,
    imageStatus: items.length > 0 && items.every((item) => productPurchaseBlockers(item).length === 0)
      ? "eligible"
      : "blocked-product-data",
  };
}
