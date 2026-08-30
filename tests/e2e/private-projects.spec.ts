import { expect, test } from "@playwright/test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { savePrivateProject } from "../../src/lib/supabase/private-projects";
import { createLocalProject } from "../../src/lib/local-projects";

test("aktualisiert Privatprojekte ohne geschützte Kontofelder zu überschreiben", async () => {
  const project = createLocalProject("Sicheres Projekt");
  const updates: Record<string, unknown>[] = [];
  let insertCalled = false;
  const supabase = {
    from: () => ({
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: () => ({ select: async () => ({ data: [{ id: project.id }], error: null }) }) };
      },
      insert: async () => { insertCalled = true; return { error: null }; },
    }),
  } as unknown as SupabaseClient;

  await savePrivateProject(supabase, { id: "user-1" } as User, project);

  expect(updates).toEqual([{
    name: project.name,
    living_room: project.livingRoom,
    updated_at: project.updatedAt,
  }]);
  expect(insertCalled).toBe(false);
});

test("legt ein noch nicht vorhandenes Privatprojekt vollständig an", async () => {
  const project = createLocalProject("Neues Projekt");
  const inserts: Record<string, unknown>[] = [];
  const supabase = {
    from: () => ({
      update: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }),
      insert: async (values: Record<string, unknown>) => { inserts.push(values); return { error: null }; },
    }),
  } as unknown as SupabaseClient;

  await savePrivateProject(supabase, { id: "user-1" } as User, project);

  expect(inserts).toEqual([{
    id: project.id,
    user_id: "user-1",
    name: project.name,
    living_room: project.livingRoom,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }]);
});
