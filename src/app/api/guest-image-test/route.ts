import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashTestPhoto } from "@/lib/ai/image-generation/test-runner";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "@/lib/ai/image-generation/test-limits";
import { isTrustedImageTestOrigin } from "@/lib/ai/image-generation/test-origin";
import { createVertexImageProvider } from "@/lib/ai/image-generation/vertex-provider.server";
import { scanRoomArchitecture } from "@/lib/ai/image-generation/vertex-architecture-scan.server";
import { validateStructuralFidelity } from "@/lib/ai/image-generation/structural-fidelity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const sessionCookie = "raumly_guest_image_test";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function failure(error: unknown) {
  const message = error instanceof Error && !error.message.includes("{") ? error.message : "Testvorbereitung fehlgeschlagen.";
  return Response.json({ error: message }, { status: 403, headers });
}

function serverEnabled() {
  if (process.env.RAUMLY_GUEST_IMAGE_TEST_ENABLED !== "true") throw new Error("Der kontrollierte Bildtest ist ausgeschaltet.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Testbereich noch nicht eingerichtet.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function call(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    console.error("guest-image-test RPC failed", { name, code: error.code, message: error.message });
    const failure = new Error("Die Testaktion ist gesperrt oder konnte nicht bestätigt werden.");
    Object.assign(failure, { code: error.code });
    throw failure;
  }
  return data;
}

function newSession() {
  return { id: randomUUID(), secret: createHash("sha256").update(randomUUID()).digest("hex"), setCookie: true };
}

async function currentSession(create: boolean) {
  const jar = await cookies();
  const stored = jar.get(sessionCookie)?.value;
  if (stored) {
    const [id, secret] = stored.split(".");
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f]{64}$/i.test(secret)) return { id, secret, setCookie: false };
  }
  if (!create) throw new Error("Keine gültige Testsession.");
  return newSession();
}

function isUnavailableSession(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P0001";
}

function imageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  return null;
}

export async function GET(request: Request) {
  try {
    const client = serverEnabled();
    if (new URL(request.url).searchParams.get("session") === "new") {
      const session = newSession();
      const response = Response.json({ ok: true }, { headers });
      response.headers.append("Set-Cookie", `${sessionCookie}=${session.id}.${session.secret}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
      return response;
    }
    const session = await currentSession(false);
    const candidate = new URL(request.url).searchParams.get("candidate");
    if (candidate && /^[0-9a-f-]{36}$/i.test(candidate)) {
      const result = await call(client, "guest_image_test_read_candidate", { target_session: session.id, target_secret_hash: session.secret, request_id: candidate });
      if (!result?.data || !["image/jpeg", "image/png", "image/webp"].includes(result.mime)) return new Response(null, { status: 404, headers });
      return new Response(Buffer.from(result.data, "base64"), { headers: { ...headers, "Content-Type": result.mime } });
    }
    const state = await call(client, "guest_image_test_state", { target_session: session.id, target_secret_hash: session.secret });
    return Response.json(state ?? { prepared: false }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (!isTrustedImageTestOrigin(request.headers.get("origin"), process.env.RAUMLY_IMAGE_TEST_ORIGIN)) throw new Error("Ungültiger Ursprung oder fehlende serverseitige Testadresse.");
    const client = serverEnabled();
    if (request.headers.get("content-type")?.includes("application/json")) return dispatch(request, client);
    const declaredSize = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAXIMUM_VERTEX_SOURCE_BYTES + 32_768) throw new Error("Anfrage zu groß.");
    const form = await request.formData();
    if (form.get("action") !== "generate" || form.get("consent") !== "true") throw new Error("Die Einwilligung für den Bildversuch fehlt.");
    const photo = form.get("photo");
    const style = form.get("style");
    const budget = Number(form.get("budgetEuro"));
    if (!(photo instanceof File) || typeof style !== "string") throw new Error("Ungültige Bildanfrage.");
    if (!photo.size || photo.size > MAXIMUM_VERTEX_SOURCE_BYTES) throw new Error("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const mime = imageMime(bytes);
    if (!mime) throw new Error("Nicht unterstütztes Fotoformat.");
    let session = await currentSession(true);
    const preparation = {
      target_style: style, target_budget: budget, target_profile: null, target_source_hash: hashTestPhoto(bytes),
      target_source_base64: Buffer.from(bytes).toString("base64"), target_source_mime: mime,
    };
    try {
      await call(client, "guest_image_test_prepare", { target_session: session.id, target_secret_hash: session.secret, ...preparation });
    } catch (error) {
      // A stale browser cookie has no usable database session. It is safe to
      // replace only before reserving a paid attempt; existing attempts are never retried.
      if (!isUnavailableSession(error)) throw error;
      session = newSession();
      await call(client, "guest_image_test_prepare", { target_session: session.id, target_secret_hash: session.secret, ...preparation });
    }
    const response = await generate(session, client);
    if (session.setCookie) response.headers.append("Set-Cookie", `${sessionCookie}=${session.id}.${session.secret}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  } catch (error) { return failure(error); }
}

async function dispatch(request: Request, client: SupabaseClient) {
  const body = await request.json();
  if (!body || body.action !== "review") throw new Error("Ungültige Testaktion.");
  const session = await currentSession(false);
  if (typeof body.accepted !== "boolean") throw new Error("Ungültige Prüfung.");
  const state = await call(client, "guest_image_test_state", { target_session: session.id, target_secret_hash: session.secret });
  const requestId = state?.attempts?.find((attempt: { status: string; room_fidelity_status: string }) => attempt.status === "succeeded" && attempt.room_fidelity_status === "pending")?.id;
  if (typeof requestId !== "string") throw new Error("Kein prüfbarer Entwurf verfügbar.");
  await call(client, "guest_image_test_review", { target_session: session.id, target_secret_hash: session.secret, request_id: requestId, accepted: body.accepted });
  return Response.json({ ok: true }, { headers });
}

async function generate(session: { id: string; secret: string }, client: SupabaseClient) {
  if (process.env.RAUMLY_IMAGE_AI_ENABLED !== "true") throw new Error("Externe Bild-KI ist ausgeschaltet.");
  if (!process.env.GOOGLE_CLOUD_PROJECT) throw new Error("Google-Projekt fehlt.");
  const requestId = randomUUID();
  let stage = "Testfoto lesen";
  try {
    const source = await call(client, "guest_image_test_read_source", { target_session: session.id, target_secret_hash: session.secret });
    if (!source?.data || !["image/jpeg", "image/png", "image/webp"].includes(source.mime)) throw new Error("Testfoto nicht verfügbar.");
    const bytes = new Uint8Array(Buffer.from(source.data, "base64"));
    const mime = source.mime as "image/jpeg" | "image/png" | "image/webp";
    stage = "Kostenreservierung";
    const reservation = await call(client, "guest_image_test_reserve", { target_session: session.id, target_secret_hash: session.secret, request_id: requestId });
    stage = "Architektur-Scan";
    const profile = await scanRoomArchitecture({ projectId: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION, bytes, mime });
    stage = "Architekturprofil speichern";
    await call(client, "guest_image_test_set_room_fidelity", { target_session: session.id, target_secret_hash: session.secret, profile });
    stage = "Versandfreigabe";
    if (!await call(client, "guest_image_test_check_dispatch", { target_session: session.id, target_secret_hash: session.secret, request_id: requestId })) throw new Error("Freigabe wurde zurückgezogen.");
    stage = "Vertex-Bildgenerierung";
    const provider = createVertexImageProvider({ projectId: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION, maximumRequestCents: reservation.reservedCents });
    const result = await provider.generate({ input: { sourceImage: bytes, sourceImageMimeType: mime, roomType: "living-room", style: reservation.style, budgetEuro: reservation.budgetEuro, roomFidelity: profile }, consent: { granted: true, grantedAt: reservation.grantedAt, policyVersion: reservation.policyVersion }, maximumChargeCents: reservation.reservedCents }, new AbortController().signal);
    stage = "Vertex-Ergebnis sichern";
    await call(client, "guest_image_test_record_provider_image", { target_session: session.id, target_secret_hash: session.secret, request_id: requestId,
      provider_image: Buffer.from(result.image).toString("base64"), provider_mime: result.imageMimeType, elapsed_ms: result.durationMs,
      provider_id: result.providerRequestId, usage_data: result.usage ?? {} });
    stage = "Raumtreue-Prüfung";
    const validation = await validateStructuralFidelity(bytes, result.image);
    stage = "Ergebnis speichern";
    const finishArgs = { target_session: session.id, target_secret_hash: session.secret, request_id: requestId, result_image: validation.status === "passed" ? Buffer.from(result.image).toString("base64") : null, result_mime: validation.status === "passed" ? result.imageMimeType : null, elapsed_ms: result.durationMs, provider_id: result.providerRequestId, usage_data: { ...result.usage, raumlyValidation: validation } };
    try { await call(client, "guest_image_test_finish", finishArgs); }
    catch { await call(client, "guest_image_test_finish", finishArgs); }
    return Response.json({ ok: true, requestId }, { headers });
  } catch (error) {
    console.error("guest-image-test generation failed", {
      stage,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown error",
    });
    try { await call(client, "guest_image_test_finish", { target_session: session.id, target_secret_hash: session.secret, request_id: requestId }); } catch { /* retain unresolved reservation */ }
    throw new Error("Versuch ungeklärt. Reservierung bleibt bestehen; keine automatische Wiederholung.");
  }
}
