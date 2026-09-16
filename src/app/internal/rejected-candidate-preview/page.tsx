import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Raumly – interne Bildprüfung", robots: { index: false, follow: false } };
const sessionCookie = "raumly_guest_image_test";

export default async function RejectedCandidatePreviewPage() {
  if (process.env.RAUMLY_INTERNAL_REJECTED_CANDIDATE_PREVIEW !== "true") notFound();
  const stored = (await cookies()).get(sessionCookie)?.value;
  const [id, secret] = stored?.split(".") ?? [];
  if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(secret)) notFound();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) notFound();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("guest_image_test_read_latest_rejected_candidate", { target_session: id, target_secret_hash: secret });
  if (error || !data?.data || !["image/jpeg", "image/png", "image/webp"].includes(data.mime)) notFound();
  const source = `data:${data.mime};base64,${data.data}`;
  return <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
    <Link href="/">Zurück zu Raumly</Link>
    <p style={{ color: "#c25c2c", fontWeight: 700, marginTop: 28 }}>NUR INTERNE ANBIETEREVALUATION</p>
    <h1>Verworfener Vertex-Entwurf</h1>
    <p>Dieses Bild wurde nicht für den Produktablauf freigegeben, weil die automatische Raumtreue-Prüfung Architektur oder Perspektive als abweichend erkannt hat.</p>
    {/* eslint-disable-next-line @next/next/no-img-element -- private data URI; no external image proxy may receive it. */}
    <img src={source} alt="Verworfener Vertex-Entwurf zur internen Prüfung" style={{ display: "block", width: "100%", height: "auto", border: "1px solid #dedbd2", borderRadius: 12 }} />
  </main>;
}
