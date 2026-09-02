import { expect, test } from "@playwright/test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { readPrivateProjects, savePrivateProject } from "../../src/lib/supabase/private-projects";
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

test("ergänzt Leerraumfelder bei älteren privaten Projekten ohne Datenverlust", async () => {
  const rows = [{ id: "alt", name: "Altbestand", living_room: { style: "Japandi", postcode: "10115", budget: 2200 }, created_at: "2026-01-01", updated_at: "2026-01-02", deleted_at: null }];
  const supabase = { from: () => ({ select: () => ({ order: async () => ({ data: rows, error: null }) }) }) } as unknown as SupabaseClient;
  const projects = await readPrivateProjects(supabase);
  expect(projects[0].livingRoom.style).toBe("Japandi");
  expect(projects[0].livingRoom.budget).toBe(2200);
  expect(projects[0].livingRoom.emptyRoomConfirmed).toBe(false);
  expect(projects[0].livingRoom.scaleMode).toBe("room-dimensions");
  expect(projects[0].livingRoom.productConcept).toBeNull();
});
