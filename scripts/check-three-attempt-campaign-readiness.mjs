import { readFile } from "node:fs/promises";
import { evaluateThreeAttemptCampaignReadiness } from "./lib/three-attempt-campaign-readiness.mjs";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
}));

if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Die lokale Supabase-Konfiguration ist unvollständig.");
}

async function readRpc(name) {
  const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: values.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`Bereitschaftsprüfung nicht verfügbar (HTTP ${response.status}).`);
  return response.json();
}

const [ledger, pendingBilling] = await Promise.all([
  readRpc("localhost_image_test_ledger_status"),
  readRpc("localhost_image_test_pending_billing_diagnostics"),
]);

console.log(JSON.stringify(evaluateThreeAttemptCampaignReadiness(ledger, pendingBilling), null, 2));
