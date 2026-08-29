import type { SupabaseClient, User } from "@supabase/supabase-js";
import { readLocalProjects, writeLocalProjects } from "@/lib/local-projects";
import { savePrivateProject } from "@/lib/supabase/private-projects";

const PENDING_GUEST_TRANSFER_KEY = "raumly.pending-guest-transfer";
const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type PendingGuestTransfer = { projectId: string; expectedEmail: string; preparedAt: string };

export function prepareGuestProjectTransfer(storage: Storage, projectId: string | null, expectedEmail: string) {
  if (!projectId) {
    storage.removeItem(PENDING_GUEST_TRANSFER_KEY);
    return;
  }
  storage.setItem(PENDING_GUEST_TRANSFER_KEY, JSON.stringify({
    projectId,
    expectedEmail: expectedEmail.trim().toLowerCase(),
    preparedAt: new Date().toISOString(),
  } satisfies PendingGuestTransfer));
}

export function clearPendingGuestProjectTransfer(storage: Storage) {
  storage.removeItem(PENDING_GUEST_TRANSFER_KEY);
}

function readPendingGuestProjectTransfer(storage: Storage): PendingGuestTransfer | null {
  try {
    const raw = storage.getItem(PENDING_GUEST_TRANSFER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingGuestTransfer>;
    if (typeof value.projectId !== "string" || typeof value.expectedEmail !== "string" || typeof value.preparedAt !== "string") return null;
    if (Date.now() - new Date(value.preparedAt).getTime() > MAX_PENDING_AGE_MS) return null;
    return value as PendingGuestTransfer;
  } catch {
    return null;
  }
}

export async function transferPendingGuestProject(
  storage: Storage,
  supabase: SupabaseClient,
  user: User,
): Promise<string | null> {
  const pending = readPendingGuestProjectTransfer(storage);
  if (!pending) {
    clearPendingGuestProjectTransfer(storage);
    return null;
  }
  if (!user.email || user.email.toLowerCase() !== pending.expectedEmail) return null;
  const localProjects = readLocalProjects(storage);
  const project = localProjects.find(({ id }) => id === pending.projectId);
  if (!project) {
    clearPendingGuestProjectTransfer(storage);
    return null;
  }

  await savePrivateProject(supabase, user, project);
  writeLocalProjects(storage, localProjects.filter(({ id }) => id !== project.id));
  clearPendingGuestProjectTransfer(storage);
  return project.name;
}
