import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_STORAGE_POLICY_VERSION = "photo-storage-v1";

export async function readPhotoStorageConsent(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from("consent_events")
    .select("action")
    .eq("consent_kind", "photo_storage")
    .order("event_sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.action === "granted";
}

export async function grantPhotoStorageConsent(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("record_own_consent", {
    target_kind: "photo_storage",
    target_action: "granted",
    target_policy_version: PHOTO_STORAGE_POLICY_VERSION,
  });
  if (error) throw error;
}

export async function withdrawPhotoStorageConsent(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.functions.invoke("withdraw-photo-consent");
  if (error) throw error;
  if (typeof data?.removed !== "number") throw new Error("Der Widerruf konnte nicht bestätigt werden.");
  return data.removed;
}
