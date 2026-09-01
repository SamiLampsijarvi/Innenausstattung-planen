import { readFile } from "node:fs/promises";

if (process.argv[2] !== "--confirm") {
  console.error("Refusing to arm the image test. Re-run with --confirm after the required human cost approval.");
  process.exitCode = 2;
} else {
  const values = Object.fromEntries((await readFile(".env.local", "utf8"))
    .split(/\r?\n/).filter((line) => line && !line.startsWith("#"))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
  if (values.RAUMLY_IMAGE_AI_ENABLED === "true") throw new Error("Turn external AI off before arming the database ledger.");
  if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Local server configuration is incomplete.");
  const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/image_test_arm`, {
    method: "POST",
    headers: { apikey: values.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      target_price_review: "Google published list price reviewed 2026-09-01; one user-approved 30-cent reservation; no automatic retry.",
      target_reservation_cents: 30,
      active_for_seconds: 600,
    }),
  });
  if (!response.ok) throw new Error(`The controlled test could not be armed (HTTP ${response.status}).`);
  const result = await response.json();
  console.log(`Test armed until ${result.approvedUntil}; reservation: ${(result.reservationCents / 100).toFixed(2)} EUR.`);
}
