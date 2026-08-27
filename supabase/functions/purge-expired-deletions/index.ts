import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const serviceRoleKey = secretKeys.default ?? legacyServiceRoleKey;
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
const deletionWorkerSecret = Deno.env.get("DELETION_WORKER_SECRET");

if (!supabaseUrl || !serviceRoleKey || !publishableKey || !deletionWorkerSecret) {
  throw new Error("Supabase server configuration is incomplete.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown worker error";
}

async function removeStoredPhotos(query: { projectId?: string; userId?: string }) {
  let photoQuery = admin.from("project_photos").select("storage_path");
  if (query.projectId) photoQuery = photoQuery.eq("project_id", query.projectId);
  if (query.userId) photoQuery = photoQuery.eq("user_id", query.userId);
  const { data, error } = await photoQuery;
  if (error) throw error;
  const paths = (data ?? []).map(({ storage_path }) => storage_path as string);
  if (!paths.length) return;
  const { error: storageError } = await admin.storage.from("room-photos").remove(paths);
  if (storageError) throw storageError;
}

async function purgeProject(projectId: string) {
  await removeStoredPhotos({ projectId });
  const { error } = await admin.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

async function recordProjectFailure(projectId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await admin.rpc("record_project_purge_failure", { target_project_id: projectId, failure_message: message.slice(0, 1000) });
}

async function purgeDueProjects() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("projects").select("id").not("deleted_at", "is", null).lte("deleted_at", cutoff);
  if (error) throw new Error(`project_query_failed: ${describeError(error)}`);
  let completed = 0;
  for (const project of data ?? []) {
    try {
      await purgeProject(project.id);
      completed += 1;
    } catch (purgeError) {
      try {
        await recordProjectFailure(project.id, purgeError);
      } catch (recordError) {
        console.error("Project purge failure could not be recorded", recordError);
      }
    }
  }
  return completed;
}

async function recordAccountFailure(requestId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await admin.rpc("record_account_purge_failure", { target_request_id: requestId, failure_message: message.slice(0, 1000) });
}

async function purgeDueAccounts() {
  const { data, error } = await admin.from("account_deletion_requests").select("id,user_id").lte("delete_after", new Date().toISOString());
  if (error) throw new Error(`account_query_failed: ${describeError(error)}`);
  let completed = 0;
  for (const request of data ?? []) {
    try {
      await removeStoredPhotos({ userId: request.user_id });
      const { error: deleteError } = await admin.auth.admin.deleteUser(request.user_id, false);
      if (deleteError) throw deleteError;
      completed += 1;
      const { error: auditError } = await admin.from("deletion_audit").insert({ request_id: request.id, event_type: "completed" });
      if (auditError) console.error("Completed account deletion could not be recorded", auditError);
    } catch (purgeError) {
      try {
        await recordAccountFailure(request.id, purgeError);
      } catch (recordError) {
        console.error("Account purge failure could not be recorded", recordError);
      }
    }
  }
  return completed;
}

async function purgeOwnTrashedProject(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return new Response("Unauthorized", { status: 401 });
  const userClient = createClient(supabaseUrl!, publishableKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401 });
  const body = await request.json().catch(() => ({})) as { projectId?: string };
  if (!body.projectId) return new Response("Missing projectId", { status: 400 });
  const { data: project, error } = await admin.from("projects").select("id,user_id,deleted_at").eq("id", body.projectId).maybeSingle();
  if (error) throw error;
  if (!project || project.user_id !== user.id || !project.deleted_at) return new Response("Not found", { status: 404 });
  await purgeProject(project.id);
  return Response.json({ deleted: true });
}

Deno.serve(async (request) => {
  const isWorkerRequest = request.headers.get("x-raumly-worker-secret") === deletionWorkerSecret;
  try {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (isWorkerRequest) {
      const projects = await purgeDueProjects();
      const accounts = await purgeDueAccounts();
      return Response.json({ projects, accounts });
    }
    return await purgeOwnTrashedProject(request);
  } catch (error) {
    console.error("Deletion purge failed", error);
    return Response.json({
      error: "Deletion purge failed",
      ...(isWorkerRequest ? { detail: describeError(error) } : {}),
    }, { status: 500 });
  }
});
