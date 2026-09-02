import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeLivingRoomPlan } from "@/lib/local-projects";
import type { LocalProject } from "@/lib/local-projects";

type ProjectRow = {
  id: string;
  name: string;
  living_room: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoredRoomImage = { name: string; previewUrl: string; storagePath: string };
export type PrivateProject = LocalProject & { deletedAt: string | null };

export async function readPrivateProjects(supabase: SupabaseClient): Promise<PrivateProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,living_room,created_at,updated_at,deleted_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProjectRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    livingRoom: normalizeLivingRoomPlan(row.living_room),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }));
}

export async function savePrivateProject(supabase: SupabaseClient, user: User, project: LocalProject) {
  const { data: updatedProjects, error: updateError } = await supabase
    .from("projects")
    .update({
      name: project.name,
      living_room: project.livingRoom,
      updated_at: project.updatedAt,
    })
    .eq("id", project.id)
    .select("id");
  if (updateError) throw updateError;
  if (updatedProjects?.length) return;

  const { error: insertError } = await supabase.from("projects").insert({
    id: project.id,
    user_id: user.id,
    name: project.name,
    living_room: project.livingRoom,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (insertError) throw insertError;
}

export async function movePrivateProjectToTrash(supabase: SupabaseClient, projectId: string) {
  const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", projectId);
  if (error) throw error;
}

export async function restorePrivateProject(supabase: SupabaseClient, projectId: string) {
  const { error } = await supabase.from("projects").update({ deleted_at: null }).eq("id", projectId);
  if (error) throw error;
}

export async function permanentlyDeletePrivateProject(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase.functions.invoke("purge-expired-deletions", { body: { projectId } });
  if (error) throw error;
  if (!data?.deleted) throw new Error("Das Projekt konnte nicht endgültig gelöscht werden.");
}

export async function uploadPrivatePhotos(
  supabase: SupabaseClient,
  user: User,
  projectId: string,
  files: File[],
): Promise<StoredRoomImage[]> {
  const uploaded: StoredRoomImage[] = [];
  const uploadedPaths: string[] = [];
  try {
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${projectId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("room-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { error: metadataError } = await supabase.from("project_photos").insert({
        project_id: projectId,
        user_id: user.id,
        storage_path: path,
        original_name: file.name,
      });
      if (metadataError) throw metadataError;
      const { data, error: signedUrlError } = await supabase.storage.from("room-photos").createSignedUrl(path, 3600);
      if (signedUrlError || !data?.signedUrl) throw signedUrlError ?? new Error("Für das Foto konnte keine private Vorschau erstellt werden.");
      uploaded.push({ name: file.name, previewUrl: data.signedUrl, storagePath: path });
    }
    return uploaded;
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.from("project_photos").delete().in("storage_path", uploadedPaths);
      await supabase.storage.from("room-photos").remove(uploadedPaths);
    }
    throw error;
  }
}

export async function readPrivatePhotos(supabase: SupabaseClient, projectId: string): Promise<StoredRoomImage[]> {
  const { data: rows, error } = await supabase
    .from("project_photos")
    .select("storage_path,original_name")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;
  const result: StoredRoomImage[] = [];
  for (const row of rows ?? []) {
    const { data, error: signedUrlError } = await supabase.storage.from("room-photos").createSignedUrl(row.storage_path, 3600);
    if (signedUrlError) throw signedUrlError;
    if (data?.signedUrl) result.push({ name: row.original_name, previewUrl: data.signedUrl, storagePath: row.storage_path });
  }
  return result;
}

export async function removePrivatePhoto(supabase: SupabaseClient, storagePath: string) {
  const { error: storageError } = await supabase.storage.from("room-photos").remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("project_photos").delete().eq("storage_path", storagePath);
  if (error) throw error;
}
