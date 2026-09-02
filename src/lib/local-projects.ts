import type { ProductConcept } from "./product-concept";

export const LOCAL_PROJECTS_KEY = "raumly.local-projects";
export const LOCAL_PROJECTS_VERSION = 5;

export type FurniturePreference = "none" | "keep" | "replace" | "add";
export type FurnitureSource = "simulated" | "ai" | "corrected" | "manual";

export type FurnitureItem = {
  id: string; catalogId: string; label: string; source: FurnitureSource;
  preference: FurniturePreference; comment: string; quantity: number; confidence?: number;
};

export type FurnitureReview = {
  status: "not_started" | "ready";
  method?: "simulation" | "local_ai";
  generalNote: string;
  items: FurnitureItem[];
};

export type DraftFurnitureItem = {
  label: string; preference: FurniturePreference; comment: string; quantity: number;
};

export type DesignDraft = {
  id: string; createdAt: string; variant: 1 | 2 | 3; title: string;
  style: string; postcode: string; budget: number; palette: string[]; concept: string;
  generalNote: string; furniture: DraftFurnitureItem[];
};

export type LivingRoomPlan = {
  style: string; postcode: string; budget: number; furnitureReview: FurnitureReview; drafts: DesignDraft[];
  productConcept: ProductConcept | null;
  emptyRoomConfirmed: boolean;
  scaleMode: "room-dimensions" | "reference";
  roomWidthCm: number | null;
  roomDepthCm: number | null;
  referenceLengthCm: number | null;
};

export type LocalProject = {
  id: string; name: string; createdAt: string; updatedAt: string; livingRoom: LivingRoomPlan;
};

type StoredEnvelope = { version?: number; projects?: unknown[] };

const emptyFurnitureReview = (): FurnitureReview => ({ status: "not_started", generalNote: "", items: [] });
const emptyPlan = (): LivingRoomPlan => ({ style: "", postcode: "", budget: 1500, furnitureReview: emptyFurnitureReview(), drafts: [], productConcept: null, emptyRoomConfirmed: false, scaleMode: "room-dimensions", roomWidthCm: null, roomDepthCm: null, referenceLengthCm: null });

export function normalizeLivingRoomPlan(value: unknown): LivingRoomPlan {
  if (!value || typeof value !== "object") return emptyPlan();
  const plan = value as Partial<LivingRoomPlan>;
  return {
    style: typeof plan.style === "string" ? plan.style : "",
    postcode: typeof plan.postcode === "string" ? plan.postcode : "",
    budget: typeof plan.budget === "number" ? plan.budget : 1500,
    furnitureReview: plan.furnitureReview?.status && Array.isArray(plan.furnitureReview.items) ? plan.furnitureReview : emptyFurnitureReview(),
    drafts: Array.isArray(plan.drafts) ? plan.drafts.filter(isDesignDraft) : [],
    productConcept: plan.productConcept && isProductConcept(plan.productConcept) ? plan.productConcept : null,
    emptyRoomConfirmed: plan.emptyRoomConfirmed === true,
    scaleMode: plan.scaleMode === "reference" ? "reference" : "room-dimensions",
    roomWidthCm: typeof plan.roomWidthCm === "number" ? plan.roomWidthCm : null,
    roomDepthCm: typeof plan.roomDepthCm === "number" ? plan.roomDepthCm : null,
    referenceLengthCm: typeof plan.referenceLengthCm === "number" ? plan.referenceLengthCm : null,
  };
}

export function createLocalProject(name: string): LocalProject {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: name.trim(), createdAt: now, updatedAt: now, livingRoom: emptyPlan() };
}

export function readLocalProjects(storage: Storage): LocalProject[] {
  try {
    const rawValue = storage.getItem(LOCAL_PROJECTS_KEY);
    if (!rawValue) return [];
    const stored = JSON.parse(rawValue) as StoredEnvelope;
    if (!Array.isArray(stored.projects)) return [];
    if (stored.version === 1) {
      const migrated = stored.projects.flatMap((value) => migrateVersionOneProject(value) ?? []);
      writeLocalProjects(storage, migrated);
      return migrated;
    }
    if (stored.version === 2) {
      const migrated = stored.projects.flatMap((value) => migrateVersionTwoProject(value) ?? []);
      writeLocalProjects(storage, migrated);
      return migrated;
    }
    if (stored.version === 3) {
      const migrated = stored.projects.flatMap((value) => migrateVersionThreeProject(value) ?? []);
      writeLocalProjects(storage, migrated);
      return migrated;
    }
    if (stored.version === 4) {
      const migrated = stored.projects.flatMap((value) => migrateVersionFourProject(value) ?? []);
      writeLocalProjects(storage, migrated);
      return migrated;
    }
    if (stored.version !== LOCAL_PROJECTS_VERSION) return [];
    return stored.projects.filter(isLocalProject);
  } catch {
    return [];
  }
}

export function writeLocalProjects(storage: Storage, projects: LocalProject[]) {
  storage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify({ version: LOCAL_PROJECTS_VERSION, projects }));
}

function migrateVersionOneProject(value: unknown): LocalProject | null {
  if (!value || typeof value !== "object") return null;
  const project = value as Partial<LocalProject>;
  const plan = project.livingRoom as Partial<LivingRoomPlan> | undefined;
  if (typeof project.id !== "string" || typeof project.name !== "string"
    || typeof project.createdAt !== "string" || typeof project.updatedAt !== "string"
    || typeof plan?.style !== "string" || typeof plan?.postcode !== "string"
    || typeof plan?.budget !== "number") return null;
  return {
    id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt,
    livingRoom: { ...emptyPlan(), style: plan.style, postcode: plan.postcode, budget: plan.budget },
  };
}

function migrateVersionTwoProject(value: unknown): LocalProject | null {
  if (!value || typeof value !== "object") return null;
  const project = value as Partial<LocalProject>;
  const plan = project.livingRoom as Partial<LivingRoomPlan> | undefined;
  const review = plan?.furnitureReview as Partial<FurnitureReview> | undefined;
  if (typeof project.id !== "string" || typeof project.name !== "string"
    || typeof project.createdAt !== "string" || typeof project.updatedAt !== "string"
    || typeof plan?.style !== "string" || typeof plan?.postcode !== "string" || typeof plan?.budget !== "number"
    || (review?.status !== "not_started" && review?.status !== "ready")
    || typeof review.generalNote !== "string" || !Array.isArray(review.items) || !review.items.every(isFurnitureItem)) return null;
  return {
    id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt,
    livingRoom: { ...emptyPlan(), style: plan.style, postcode: plan.postcode, budget: plan.budget, furnitureReview: review as FurnitureReview },
  };
}

function migrateVersionThreeProject(value: unknown): LocalProject | null {
  if (!isVersionThreeProject(value)) return null;
  return { ...value, livingRoom: { ...value.livingRoom, productConcept: null, emptyRoomConfirmed: false, scaleMode: "room-dimensions", roomWidthCm: null, roomDepthCm: null, referenceLengthCm: null } };
}

function migrateVersionFourProject(value: unknown): LocalProject | null {
  if (!isVersionFourProject(value)) return null;
  return { ...value, livingRoom: { ...value.livingRoom, productConcept: null, emptyRoomConfirmed: false, scaleMode: "room-dimensions", roomWidthCm: null, roomDepthCm: null, referenceLengthCm: null } };
}

function isVersionFourProject(value: unknown): value is Omit<LocalProject, "livingRoom"> & { livingRoom: Omit<LivingRoomPlan, "emptyRoomConfirmed" | "scaleMode" | "roomWidthCm" | "roomDepthCm" | "referenceLengthCm"> } {
  if (!isVersionThreeProject(value)) return false;
  const plan = value.livingRoom as Partial<LivingRoomPlan>;
  return plan.productConcept === null || (typeof plan.productConcept === "object" && plan.productConcept !== null);
}

function isVersionThreeProject(value: unknown): value is Omit<LocalProject, "livingRoom"> & { livingRoom: Omit<LivingRoomPlan, "productConcept"> } {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<LocalProject>;
  const plan = project.livingRoom as Partial<LivingRoomPlan> | undefined;
  const review = plan?.furnitureReview as Partial<FurnitureReview> | undefined;
  return typeof project.id === "string" && typeof project.name === "string"
    && typeof project.createdAt === "string" && typeof project.updatedAt === "string"
    && typeof plan?.style === "string" && typeof plan?.postcode === "string" && typeof plan?.budget === "number"
    && (review?.status === "not_started" || review?.status === "ready")
    && (review.method === undefined || review.method === "simulation" || review.method === "local_ai")
    && typeof review.generalNote === "string" && Array.isArray(review.items) && review.items.every(isFurnitureItem)
    && Array.isArray(plan.drafts) && plan.drafts.every(isDesignDraft);
}

function isLocalProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<LocalProject>;
  const plan = project.livingRoom as Partial<LivingRoomPlan> | undefined;
  const review = plan?.furnitureReview as Partial<FurnitureReview> | undefined;
  return typeof project.id === "string" && typeof project.name === "string"
    && typeof project.createdAt === "string" && typeof project.updatedAt === "string"
    && typeof plan?.style === "string" && typeof plan?.postcode === "string"
    && typeof plan?.budget === "number" && (review?.status === "not_started" || review?.status === "ready")
    && (review.method === undefined || review.method === "simulation" || review.method === "local_ai")
    && typeof review.generalNote === "string" && Array.isArray(review.items)
    && review.items.every(isFurnitureItem) && Array.isArray(plan.drafts) && plan.drafts.every(isDesignDraft)
    && (plan.productConcept === null || isProductConcept(plan.productConcept))
    && typeof plan.emptyRoomConfirmed === "boolean"
    && (plan.scaleMode === "room-dimensions" || plan.scaleMode === "reference")
    && (plan.roomWidthCm === null || typeof plan.roomWidthCm === "number")
    && (plan.roomDepthCm === null || typeof plan.roomDepthCm === "number")
    && (plan.referenceLengthCm === null || typeof plan.referenceLengthCm === "number");
}

function isProductConcept(value: unknown): value is ProductConcept {
  if (!value || typeof value !== "object") return false;
  const concept = value as Partial<ProductConcept>;
  const scale = concept.scaleBasis as Partial<ProductConcept["scaleBasis"]> | undefined;
  const scaleIsValid = scale?.mode === "room-dimensions"
    ? typeof scale.roomWidthCm === "number" && typeof scale.roomDepthCm === "number"
    : scale?.mode === "reference" && typeof scale.referenceLengthCm === "number";
  return concept.version === 1 && typeof concept.style === "string" && scaleIsValid
    && [concept.budgetCents, concept.reserveCents, concept.productSubtotalCents, concept.shippingTotalCents, concept.totalCents, concept.remainingCents].every((amount) => typeof amount === "number" && Number.isFinite(amount) && amount >= 0)
    && (concept.completeness === "complete" || concept.completeness === "incomplete")
    && Array.isArray(concept.missingCategories) && concept.missingCategories.every((category) => typeof category === "string")
    && Array.isArray(concept.items) && concept.items.every((item) => item && typeof item === "object"
      && typeof item.id === "string" && typeof item.sourceProductId === "string" && typeof item.title === "string" && typeof item.category === "string"
      && typeof item.style === "string" && typeof item.color === "string" && typeof item.material === "string"
      && typeof item.retailer === "string" && item.currency === "EUR"
      && [item.widthCm, item.heightCm, item.depthCm].every((dimension) => typeof dimension === "number" && dimension > 0)
      && (item.priceCents === null || typeof item.priceCents === "number") && (item.shippingCents === null || typeof item.shippingCents === "number")
      && (item.availability === "test-only" || item.availability === "in-stock" || item.availability === "out-of-stock")
      && (item.productUrl === null || typeof item.productUrl === "string") && (item.imageUrl === null || typeof item.imageUrl === "string")
      && (item.dataSource === "synthetic" || item.dataSource === "authorized-feed") && typeof item.checkedAt === "string"
      && (item.rights === "synthetic-development-only" || item.rights === "licensed-display-and-ai"))
    && (concept.imageStatus === "blocked-product-data" || concept.imageStatus === "eligible");
}

function isDesignDraft(value: unknown): value is DesignDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<DesignDraft>;
  return typeof draft.id === "string" && typeof draft.createdAt === "string"
    && [1, 2, 3].includes(draft.variant ?? 0) && typeof draft.title === "string"
    && typeof draft.style === "string" && typeof draft.postcode === "string" && typeof draft.budget === "number"
    && Array.isArray(draft.palette) && draft.palette.every((color) => typeof color === "string")
    && typeof draft.concept === "string" && typeof draft.generalNote === "string"
    && Array.isArray(draft.furniture) && draft.furniture.every((item) => item && typeof item === "object"
      && typeof item.label === "string" && ["none", "keep", "replace", "add"].includes(item.preference)
      && typeof item.comment === "string" && typeof item.quantity === "number");
}

function isFurnitureItem(value: unknown): value is FurnitureItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FurnitureItem>;
  return typeof item.id === "string" && typeof item.catalogId === "string" && typeof item.label === "string"
    && ["simulated", "ai", "corrected", "manual"].includes(item.source ?? "")
    && ["none", "keep", "replace", "add"].includes(item.preference ?? "")
    && typeof item.comment === "string" && typeof item.quantity === "number"
    && (item.confidence === undefined || typeof item.confidence === "number");
}
