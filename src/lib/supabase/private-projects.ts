import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { LocalProject } from "@/lib/local-projects";

type ProjectRow = {
  id: string;
  name: string;
  living_room: LocalProject["livingRoom"];
  created_at: string;
  updated_at: string;
};

export type StoredRoomImage = { name: string; previewUrl: string; storagePath: string };

export async function readPrivateProjects(supabase: SupabaseClient): Promise<LocalProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,living_room,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProjectRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    livingRoom: row.living_room,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function savePrivateProject(supabase: SupabaseClient, user: User, project: LocalProject) {
  const { error } = await supabase.from("projects").upsert({
    id: project.id,
    user_id: user.id,
    name: project.name,
    living_room: project.livingRoom,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (error) throw error;
}

export async function deletePrivateProject(supabase: SupabaseClient, projectId: string) {
  const { data: photos, error: photoError } = await supabase
    .from("project_photos")
    .select("storage_path")
    .eq("project_id", projectId);
  if (photoError) throw photoError;
  const paths = (photos ?? []).map(({ storage_path }) => storage_path as string);
  if (paths.length) {
    const { error } = await supabase.storage.from("room-photos").remove(paths);
    if (error) throw error;
  }
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function uploadPrivatePhotos(
  supabase: SupabaseClient,
  user: User,
  projectId: string,
  files: File[],
): Promise<StoredRoomImage[]> {
  const uploaded: StoredRoomImage[] = [];
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${projectId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("room-photos").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await supabase.from("project_photos").insert({
      project_id: projectId,
      user_id: user.id,
      storage_path: path,
      original_name: file.name,
    });
    if (metadataError) {
      await supabase.storage.from("room-photos").remove([path]);
      throw metadataError;
    }
    const { data } = await supabase.storage.from("room-photos").createSignedUrl(path, 3600);
    if (!data?.signedUrl) throw new Error("Für das Foto konnte keine private Vorschau erstellt werden.");
    uploaded.push({ name: file.name, previewUrl: data.signedUrl, storagePath: path });
  }
  return uploaded;
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
    const { data } = await supabase.storage.from("room-photos").createSignedUrl(row.storage_path, 3600);
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

export async function deleteOwnAccount(supabase: SupabaseClient) {
  const { data: photos, error: photoError } = await supabase.from("project_photos").select("storage_path");
  if (photoError) throw photoError;
  const paths = (photos ?? []).map(({ storage_path }) => storage_path as string);
  if (paths.length) {
    const { error } = await supabase.storage.from("room-photos").remove(paths);
    if (error) throw error;
  }
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
  await supabase.auth.signOut();
}
