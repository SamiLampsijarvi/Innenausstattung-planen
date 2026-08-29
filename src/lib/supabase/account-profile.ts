import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function readAccountNumber(supabase: SupabaseClient, user: User): Promise<string> {
  const { data, error } = await supabase
    .from("account_profiles")
    .select("account_number")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data.account_number as string;
}
