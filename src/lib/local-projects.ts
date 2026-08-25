export const LOCAL_PROJECTS_KEY = "raumly.local-projects";
export const LOCAL_PROJECTS_VERSION = 3;

export type FurniturePreference = "none" | "keep" | "replace" | "add";
export type FurnitureSource = "simulated" | "corrected" | "manual";

export type FurnitureItem = {
  id: string; catalogId: string; label: string; source: FurnitureSource;
  preference: FurniturePreference; comment: string; quantity: number;
};

export type FurnitureReview = {
  status: "not_started" | "ready";
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
};

export type LocalProject = {
  id: string; name: string; createdAt: string; updatedAt: string; livingRoom: LivingRoomPlan;
};

type StoredEnvelope = { version?: number; projects?: unknown[] };

const emptyFurnitureReview = (): FurnitureReview => ({ status: "not_started", generalNote: "", items: [] });
const emptyPlan = (): LivingRoomPlan => ({ style: "", postcode: "", budget: 1500, furnitureReview: emptyFurnitureReview(), drafts: [] });

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
    livingRoom: { style: plan.style, postcode: plan.postcode, budget: plan.budget, furnitureReview: emptyFurnitureReview(), drafts: [] },
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
    livingRoom: { style: plan.style, postcode: plan.postcode, budget: plan.budget, furnitureReview: review as FurnitureReview, drafts: [] },
  };
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
    && typeof review.generalNote === "string" && Array.isArray(review.items)
    && review.items.every(isFurnitureItem) && Array.isArray(plan.drafts) && plan.drafts.every(isDesignDraft);
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
    && ["simulated", "corrected", "manual"].includes(item.source ?? "")
    && ["none", "keep", "replace", "add"].includes(item.preference ?? "")
    && typeof item.comment === "string" && typeof item.quantity === "number";
}
