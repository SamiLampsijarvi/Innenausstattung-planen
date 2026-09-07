import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashTestPhoto } from "@/lib/ai/image-generation/test-runner";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "@/lib/ai/image-generation/test-limits";
import { isTrustedImageTestOrigin } from "@/lib/ai/image-generation/test-origin";

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
  if (error) throw new Error("Die Testaktion ist gesperrt oder konnte nicht bestätigt werden.");
  return data;
}

async function currentSession(create: boolean) {
  const jar = await cookies();
  const stored = jar.get(sessionCookie)?.value;
  if (stored) {
    const [id, secret] = stored.split(".");
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f]{64}$/i.test(secret)) return { id, secret, setCookie: false };
  }
  if (!create) throw new Error("Keine gültige Testsession.");
  return { id: randomUUID(), secret: createHash("sha256").update(randomUUID()).digest("hex"), setCookie: true };
}

function imageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  return null;
}

export async function GET() {
  try {
    const client = serverEnabled();
    const session = await currentSession(false);
    const state = await call(client, "guest_image_test_state", { target_session: session.id, target_secret_hash: session.secret });
    return Response.json(state ?? { prepared: false }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (!isTrustedImageTestOrigin(request.headers.get("origin"), process.env.RAUMLY_IMAGE_TEST_ORIGIN)) throw new Error("Ungültiger Ursprung oder fehlende serverseitige Testadresse.");
    const client = serverEnabled();
    const declaredSize = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAXIMUM_VERTEX_SOURCE_BYTES + 32_768) throw new Error("Anfrage zu groß.");
    const form = await request.formData();
    if (form.get("action") !== "prepare") throw new Error("Ungültige Testaktion.");
    const photo = form.get("photo");
    const style = form.get("style");
    const budget = Number(form.get("budgetEuro"));
    if (!(photo instanceof File) || typeof style !== "string") throw new Error("Ungültige Testvorbereitung.");
    if (!photo.size || photo.size > MAXIMUM_VERTEX_SOURCE_BYTES) throw new Error("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const mime = imageMime(bytes);
    if (!mime) throw new Error("Nicht unterstütztes Fotoformat.");
    const session = await currentSession(true);
    await call(client, "guest_image_test_prepare", {
      target_session: session.id, target_secret_hash: session.secret, target_style: style, target_budget: budget,
      target_profile: null, target_source_hash: hashTestPhoto(bytes), target_source_base64: Buffer.from(bytes).toString("base64"), target_source_mime: mime,
    });
    const response = Response.json({ ok: true, expiresInHours: 24 }, { headers });
    if (session.setCookie) response.headers.append("Set-Cookie", `${sessionCookie}=${session.id}.${session.secret}; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  } catch (error) { return failure(error); }
}
