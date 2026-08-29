import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
const serviceRoleKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const emailFrom = Deno.env.get("DELETION_EMAIL_FROM");
const workerSecret = Deno.env.get("DELETION_WORKER_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-raumly-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

if (!supabaseUrl || !serviceRoleKey || !publishableKey || !resendApiKey || !emailFrom || !workerSecret) {
  throw new Error("Deletion notification configuration is incomplete.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

type Notification = { id: string; user_id: string; kind: string; scheduled_for: string };

function content(kind: string, scheduledFor: string) {
  const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(scheduledFor));
  if (kind === "request_confirmation") return { subject: "Ihre Kontolöschung wurde vorgemerkt", text: "Ihre Kontolöschung wurde vorgemerkt. Sie können sie innerhalb von 14 Tagen in Raumly widerrufen." };
  if (kind === "cancellation_confirmation") return { subject: "Ihre Kontolöschung wurde widerrufen", text: "Ihre vorgemerkte Kontolöschung wurde widerrufen. Ihr Konto kann wieder normal verwendet werden." };
  return { subject: "Erinnerung an Ihre bevorstehende Kontolöschung", text: `Ihr Raumly-Konto ist zur Löschung vorgemerkt. Bitte widerrufen Sie den Antrag rechtzeitig, wenn Sie Ihr Konto behalten möchten. Geplanter Verarbeitungstag: ${date}.` };
}

async function send(notification: Notification) {
  const { data, error } = await admin.auth.admin.getUserById(notification.user_id);
  if (error || !data.user?.email) throw new Error("recipient_not_available");
  const message = content(notification.kind, notification.scheduled_for);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `deletion_notification_${notification.id}`,
    },
    body: JSON.stringify({ from: emailFrom, to: [data.user.email], subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`email_provider_${response.status}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const isWorker = request.headers.get("x-raumly-worker-secret") === workerSecret;
  let userId: string | null = null;
  if (!isWorker) {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
    const { data } = await userClient.auth.getUser();
    userId = data.user?.id ?? null;
    if (!userId) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let query = admin.from("deletion_notifications").select("id,user_id,kind,scheduled_for").is("sent_at", null).lte("scheduled_for", new Date().toISOString()).lt("attempts", 5).order("scheduled_for").limit(50);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) return Response.json({ error: "notification_query_failed" }, { status: 500, headers: corsHeaders });

  let sent = 0;
  for (const notification of (data ?? []) as Notification[]) {
    try {
      await send(notification);
      await admin.from("deletion_notifications").update({ sent_at: new Date().toISOString(), last_error: null }).eq("id", notification.id);
      sent += 1;
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "email_failed";
      await admin.rpc("record_deletion_notification_failure", { target_notification_id: notification.id, failure_message: message });
    }
  }
  return Response.json({ sent }, { headers: corsHeaders });
});
