import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashTestPhoto, runImageTest } from "../../../../lib/ai/image-generation/test-runner";
import { createVertexImageProvider } from "../../../../lib/ai/image-generation/vertex-provider.server";
import { isTrustedImageTestOrigin } from "../../../../lib/ai/image-generation/test-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error("Die Testaktion ist gesperrt oder konnte nicht bestätigt werden.");
  return data;
}

async function authorize(request: Request) {
  if (process.env.RAUMLY_IMAGE_TEST_ENABLED !== "true") throw new Error("Der interne Testbereich ist ausgeschaltet.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serverKey) throw new Error("Testbereich noch nicht eingerichtet.");
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error("Bitte zuerst im normalen Raumly-Bereich anmelden.");
  const userClient = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Anmeldung ungültig.");
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!await rpc(admin, "image_test_allowed", { target_user: data.user.id })) throw new Error("Dieses Konto ist nicht für den Test freigegeben.");
  return { userClient, admin, userId: data.user.id };
}

async function photo(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("project_photos").select("id, storage_path, project_id").eq("id", id).single();
  if (error || !data) throw new Error("Foto nicht verfügbar.");
  const { data: blob, error: downloadError } = await client.storage.from("room-photos").download(data.storage_path);
  if (downloadError || !blob || blob.size > 10 * 1024 * 1024) throw new Error("Foto nicht verfügbar.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // File signatures, not browser-provided content types.
  const mime: "image/jpeg" | "image/png" | "image/webp" | null = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg" :
    Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" :
    Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP" ? "image/webp" : null;
  if (!mime) throw new Error("Nicht unterstütztes Fotoformat.");
  return { ...data, bytes, mime };
}

export async function GET(request: Request) {
  try {
    const { admin, userClient, userId } = await authorize(request);
    const resultId = new URL(request.url).searchParams.get("result");
    if (resultId) {
      if (!uuid.test(resultId)) throw new Error("Ungültige Ergebniskennung.");
      const result = await rpc(admin, "image_test_read_result", { target_user: userId, request_id: resultId });
      if (!result) return new Response(null, { status: 404, headers });
      return new Response(Buffer.from(result.data, "base64"), { headers: { ...headers, "Content-Type": result.mime } });
    }
    const state = await rpc(admin, "image_test_state", { target_user: userId });
    const { data: photos, error } = await userClient.from("project_photos").select("id, original_name");
    if (error) throw new Error("Fotos konnten nicht geladen werden.");
    return Response.json({ ...state, availablePhotos: photos, externalEnabled: process.env.RAUMLY_IMAGE_AI_ENABLED === "true" }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    // No cookie authentication: bearer token plus same-origin mutation checks.
    if (!isTrustedImageTestOrigin(request.headers.get("origin"), process.env.RAUMLY_IMAGE_TEST_ORIGIN)) {
      throw new Error("Ungültiger Ursprung oder fehlende serverseitige Testadresse.");
    }
    if (Number(request.headers.get("content-length")) > 4096) throw new Error("Anfrage zu groß.");
    const raw = await request.text();
    if (raw.length > 4096) throw new Error("Anfrage zu groß.");
    let body;
    try { body = JSON.parse(raw); } catch { throw new Error("Ungültiges Anfrageformat."); }
    if (!body || typeof body !== "object") throw new Error("Ungültiges Anfrageformat.");
    const { admin, userClient, userId } = await authorize(request);
    const args = { target_user: userId };
    if (body.action === "grant" || body.action === "withdraw") {
      await rpc(userClient, "record_own_consent", { target_kind: "ai_processing", target_action: body.action === "grant" ? "granted" : "withdrawn", target_policy_version: "vertex-test-v1" });
    } else if (body.action === "approve" && uuid.test(body.photoId)) {
      const source = await photo(userClient, body.photoId);
      const { data: project, error } = await userClient.from("projects").select("living_room").eq("id", source.project_id).single();
      if (error || !project) throw new Error("Projekt nicht verfügbar.");
      await rpc(admin, "image_test_approve", { ...args, target_photo: body.photoId, photo_hash: hashTestPhoto(source.bytes), target_style: project.living_room.style, target_budget: project.living_room.budget });
    } else if (body.action === "delete" && uuid.test(body.requestId)) {
      await rpc(admin, "image_test_delete_result", { ...args, request_id: body.requestId });
    } else if (body.action === "generate" && uuid.test(body.testPhotoId) && uuid.test(body.requestId)) {
      if (process.env.RAUMLY_IMAGE_AI_ENABLED !== "true") throw new Error("Externe Bild-KI ist ausgeschaltet.");
      if (!process.env.GOOGLE_CLOUD_PROJECT) throw new Error("Google-Projekt fehlt.");
      const state = await rpc(admin, "image_test_state", args);
      const approved = state.photos.find((p: { id: string }) => p.id === body.testPhotoId);
      if (!approved?.photo_id) throw new Error("Foto nicht freigegeben.");
      const source = await photo(userClient, approved.photo_id);
      await runImageTest({ enabled: true, bytes: source.bytes, mime: source.mime,
        provider: (cents) => createVertexImageProvider({ projectId: process.env.GOOGLE_CLOUD_PROJECT!, location: process.env.GOOGLE_CLOUD_LOCATION, maximumRequestCents: cents }),
        ledger: {
          reserve: (hash) => rpc(admin, "image_test_reserve", { ...args, target_test_photo: body.testPhotoId, request_id: body.requestId, photo_hash: hash }),
          canDispatch: () => rpc(admin, "image_test_check_dispatch", { ...args, request_id: body.requestId }),
          finish: (result) => rpc(admin, "image_test_finish", { ...args, request_id: body.requestId,
            result_image: result ? Buffer.from(result.image).toString("base64") : null, result_mime: result?.imageMimeType ?? null,
            elapsed_ms: result?.durationMs ?? null, provider_id: result?.providerRequestId ?? null, usage_data: result?.usage ?? null }),
        },
      });
    } else throw new Error("Ungültige Testaktion.");
    return Response.json({ ok: true }, { headers });
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  // Never expose provider responses, SQL details, tokens or image content.
  const message = error instanceof Error && !error.message.includes("{") ? error.message : "Testaktion fehlgeschlagen.";
  return Response.json({ error: message }, { status: 403, headers });
}
