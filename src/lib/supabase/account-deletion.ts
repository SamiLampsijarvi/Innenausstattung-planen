import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountDeletionRequest = {
  id: string;
  requestedAt: string;
  deleteAfter: string;
};

type AccountDeletionRow = {
  id: string;
  requested_at: string;
  delete_after: string;
};

export async function readAccountDeletionRequest(supabase: SupabaseClient): Promise<AccountDeletionRequest | null> {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id,requested_at,delete_after")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as AccountDeletionRow;
  return { id: row.id, requestedAt: row.requested_at, deleteAfter: row.delete_after };
}

export async function requestAccountDeletion(supabase: SupabaseClient): Promise<AccountDeletionRequest> {
  const { data: deleteAfter, error } = await supabase.rpc("request_account_deletion");
  if (error) throw error;
  const request = await readAccountDeletionRequest(supabase);
  if (!request) throw new Error("Der Löschantrag konnte nicht bestätigt werden.");
  await supabase.functions.invoke("send-deletion-notifications").catch(() => undefined);
  return { ...request, deleteAfter: String(deleteAfter ?? request.deleteAfter) };
}

export async function cancelAccountDeletion(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) throw error;
  await supabase.functions.invoke("send-deletion-notifications").catch(() => undefined);
}
