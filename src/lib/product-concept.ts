import type { CatalogProduct, ProductCategory } from "./product-catalog";

export type ProductConceptItem = Pick<CatalogProduct, "id" | "title" | "category" | "priceCents" | "shippingCents" | "style" | "color" | "material" | "retailer" | "rights">;

export type ProductConcept = {
  version: 1;
  style: string;
  budgetCents: number;
  reserveCents: number;
  productSubtotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  remainingCents: number;
  completeness: "complete" | "incomplete";
  missingCategories: ProductCategory[];
  items: ProductConceptItem[];
  imageStatus: "blocked-missing-rights" | "eligible";
};

const essentialCategories: ProductCategory[] = ["sofa", "coffee-table", "rug", "floor-lamp"];
const optionalCategories: ProductCategory[] = ["armchair", "sideboard", "plant"];

export function calculateSafetyReserve(budgetCents: number) {
  return Math.min(10000, Math.max(2000, Math.floor(budgetCents * 0.05)));
}

export function createAutomaticProductConcept(style: string, budgetEuro: number, catalog: CatalogProduct[]): ProductConcept {
  const budgetCents = Math.max(0, Math.floor(budgetEuro * 100));
  const reserveCents = Math.min(budgetCents, calculateSafetyReserve(budgetCents));
  const spendLimit = budgetCents - reserveCents;
  const candidates = catalog.filter((product) =>
    product.style === style
    && product.availability === "test-only"
    && product.priceCents !== null
    && product.shippingCents !== null,
  );
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
    budgetCents,
    reserveCents,
    productSubtotalCents,
    shippingTotalCents,
    totalCents,
    remainingCents: budgetCents - totalCents,
    completeness: missingCategories.length ? "incomplete" : "complete",
    missingCategories,
    items,
    imageStatus: items.length > 0 && items.every((item) => item.rights === "licensed-display-and-ai")
      ? "eligible"
      : "blocked-missing-rights",
  };
}
