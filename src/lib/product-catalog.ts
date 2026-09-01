export type ProductRights = "synthetic-development-only" | "licensed-display-and-ai";

export type ProductCategory = "sofa" | "coffee-table" | "rug" | "floor-lamp" | "armchair" | "sideboard" | "plant";

export type CatalogProduct = {
  id: string;
  title: string;
  category: ProductCategory;
  priceCents: number | null;
  shippingCents: number | null;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  style: string;
  color: string;
  material: string;
  retailer: "Raumly Testkatalog";
  availability: "test-only" | "unavailable";
  rights: ProductRights;
  productUrl: null;
  checkedAt: string;
};

const styles = [
  ["Modern", "#d8d3ca", "Strukturstoff"],
  ["Skandinavisch", "#e4ddcc", "Leinenmix"],
  ["Japandi", "#b8a58c", "Naturgewebe"],
  ["Industrial", "#69645e", "Metall und Gewebe"],
  ["Boho", "#b97455", "Baumwollmix"],
  ["Mid-Century", "#a96945", "Holz und Gewebe"],
  ["1990er Revival", "#5d7772", "Chrom und Gewebe"],
  ["Landhaus", "#d4c5aa", "Holz und Baumwolle"],
  ["Neubau minimalistisch", "#cbc9c4", "Strukturstoff"],
] as const;

const templates: ReadonlyArray<Omit<CatalogProduct, "id" | "style" | "color" | "material"> & { title: string }> = [
  { title: "Sofa", category: "sofa", priceCents: 64900, shippingCents: 4900, widthCm: 205, heightCm: 82, depthCm: 92, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Couchtisch", category: "coffee-table", priceCents: 15900, shippingCents: 1900, widthCm: 90, heightCm: 42, depthCm: 55, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Teppich", category: "rug", priceCents: 19900, shippingCents: 1500, widthCm: 230, heightCm: 1, depthCm: 160, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Stehleuchte", category: "floor-lamp", priceCents: 8900, shippingCents: 900, widthCm: 38, heightCm: 155, depthCm: 38, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Sessel", category: "armchair", priceCents: 27900, shippingCents: 2900, widthCm: 78, heightCm: 84, depthCm: 80, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Sideboard", category: "sideboard", priceCents: 32900, shippingCents: 3900, widthCm: 150, heightCm: 72, depthCm: 42, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
  { title: "Zimmerpflanze", category: "plant", priceCents: 5900, shippingCents: 900, widthCm: 45, heightCm: 95, depthCm: 45, retailer: "Raumly Testkatalog", availability: "test-only", rights: "synthetic-development-only", productUrl: null, checkedAt: "2026-09-01" },
];

export const syntheticProductCatalog: CatalogProduct[] = styles.flatMap(([style, color, material], styleIndex) =>
  templates.map((template, productIndex) => ({
    ...template,
    id: `synthetic-${styleIndex + 1}-${productIndex + 1}`,
    title: `${style} ${template.title}`,
    style,
    color,
    material,
  })),
);
