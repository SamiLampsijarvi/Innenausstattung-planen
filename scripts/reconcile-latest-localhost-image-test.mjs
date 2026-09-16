import { readFile } from "node:fs/promises";

const confirmedActualCents = Number(process.argv[2]);
if (!Number.isInteger(confirmedActualCents) || confirmedActualCents < 0 || confirmedActualCents > 30) {
  throw new Error("Bitte den in Google Billing bestätigten Betrag in Cent zwischen 0 und 30 angeben.");
}
const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
}));
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Die lokale Supabase-Konfiguration ist unvollständig.");

const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/localhost_image_test_reconcile_completed_attempt`, {
  method: "POST",
  headers: { apikey: values.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ confirmed_actual_cents: confirmedActualCents }),
});
const payload = await response.json().catch(() => null);
if (!response.ok) {
  const detail = payload && typeof payload === "object" && typeof payload.message === "string"
    ? `: ${payload.message}`
    : "";
  throw new Error(`Abrechnungsabgleich konnte nicht sicher gespeichert werden (HTTP ${response.status})${detail}`);
}
console.log(JSON.stringify(payload, null, 2));
