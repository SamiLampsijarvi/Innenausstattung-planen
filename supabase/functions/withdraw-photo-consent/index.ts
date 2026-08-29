import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
const serviceRoleKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error("Photo consent withdrawal configuration is incomplete.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data } = await userClient.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const { error: consentError } = await admin.from("consent_events").insert({
    user_id: userId,
    consent_kind: "photo_storage",
    action: "withdrawn",
    policy_version: "photo-storage-v1",
  });
  if (consentError) return Response.json({ error: "consent_record_failed" }, { status: 500, headers: corsHeaders });

  const { data: photos, error: readError } = await admin
    .from("project_photos")
    .select("storage_path")
    .eq("user_id", userId);
  if (readError) return Response.json({ error: "photo_lookup_failed" }, { status: 500, headers: corsHeaders });

  const paths = (photos ?? []).map(({ storage_path }) => storage_path as string);
  for (let index = 0; index < paths.length; index += 100) {
    const batch = paths.slice(index, index + 100);
    const { error } = await admin.storage.from("room-photos").remove(batch);
    if (error) return Response.json({ error: "photo_removal_failed" }, { status: 500, headers: corsHeaders });
  }
  if (paths.length) {
    const { error } = await admin.from("project_photos").delete().eq("user_id", userId);
    if (error) return Response.json({ error: "photo_metadata_removal_failed" }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ removed: paths.length }, { headers: corsHeaders });
});
