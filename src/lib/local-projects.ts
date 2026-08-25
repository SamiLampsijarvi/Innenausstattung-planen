export const LOCAL_PROJECTS_KEY = "raumly.local-projects";
export const LOCAL_PROJECTS_VERSION = 1;

export type LivingRoomPlan = {
  style: string;
  postcode: string;
  budget: number;
};

export type LocalProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  livingRoom: LivingRoomPlan;
};

type LocalProjectsEnvelope = {
  version: typeof LOCAL_PROJECTS_VERSION;
  projects: LocalProject[];
};

const emptyPlan: LivingRoomPlan = { style: "", postcode: "", budget: 1500 };

export function createLocalProject(name: string): LocalProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    livingRoom: { ...emptyPlan },
  };
}

export function readLocalProjects(storage: Storage): LocalProject[] {
  try {
    const rawValue = storage.getItem(LOCAL_PROJECTS_KEY);
    if (!rawValue) return [];
    const stored = JSON.parse(rawValue) as Partial<LocalProjectsEnvelope>;
    if (stored.version !== LOCAL_PROJECTS_VERSION || !Array.isArray(stored.projects)) return [];
    return stored.projects.filter(isLocalProject);
  } catch {
    return [];
  }
}

export function writeLocalProjects(storage: Storage, projects: LocalProject[]) {
  const value: LocalProjectsEnvelope = { version: LOCAL_PROJECTS_VERSION, projects };
  storage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(value));
}

function isLocalProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<LocalProject>;
  const plan = project.livingRoom as Partial<LivingRoomPlan> | undefined;
  return typeof project.id === "string"
    && typeof project.name === "string"
    && typeof project.createdAt === "string"
    && typeof project.updatedAt === "string"
    && typeof plan?.style === "string"
    && typeof plan?.postcode === "string"
    && typeof plan?.budget === "number";
}
