import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildBillingQuery, parseBigQueryCost, selectReconciliation } from "./lib/google-billing-reconciliation.mjs";

const execFileAsync = promisify(execFile);
const apply = process.argv.includes("--apply");
const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^[\"']|[\"']$/g, "")]] : [];
}));

if (values.RAUMLY_BILLING_EXPORT_ENABLED !== "true") {
  console.log(JSON.stringify({ status: "disabled", reason: "billing-export-not-enabled" }));
  process.exit(0);
}
if (!apply) {
  console.log(JSON.stringify({ status: "dry-run", reason: "pass---apply-only-from-the-approved-automation" }));
  process.exit(0);
}
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY || !values.RAUMLY_BILLING_EXPORT_BIGQUERY_PROJECT || !values.RAUMLY_BILLING_EXPORT_TABLE || !values.GOOGLE_CLOUD_PROJECT || !values.RAUMLY_BILLING_EXPORT_MAX_BYTES_BILLED) {
  throw new Error("Die lokale Billing-Export-Konfiguration ist unvollständig.");
}
const maxBytesBilled = Number(values.RAUMLY_BILLING_EXPORT_MAX_BYTES_BILLED);
if (!Number.isSafeInteger(maxBytesBilled) || maxBytesBilled <= 0) throw new Error("Das BigQuery-Abfragelimit ist ungültig.");

const supabaseHeaders = { apikey: values.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const rpc = async (name, body = undefined) => {
  const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: supabaseHeaders, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase RPC ${name} fehlgeschlagen (HTTP ${response.status}).`);
  return payload;
};
const [ledger, pending] = await Promise.all([
  rpc("localhost_image_test_ledger_status"),
  rpc("localhost_image_test_pending_billing_diagnostics"),
]);
const selection = selectReconciliation(pending, ledger);
if (selection.kind === "nothing-pending" || selection.kind === "manual-review") {
  console.log(JSON.stringify({ status: "not-reconciled", ...selection }));
  process.exit(0);
}

const { stdout } = await execFileAsync("gcloud", ["auth", "application-default", "print-access-token"], { windowsHide: true });
const accessToken = stdout.trim();
if (!accessToken) throw new Error("Kein kurzlebiges Application-Default-Token verfügbar.");
const query = buildBillingQuery({
  table: values.RAUMLY_BILLING_EXPORT_TABLE,
  projectId: values.GOOGLE_CLOUD_PROJECT,
  serviceDescription: values.RAUMLY_BILLING_EXPORT_SERVICE_DESCRIPTION || "Vertex AI",
  startedAt: selection.startedAt,
});
query.location = values.RAUMLY_BILLING_EXPORT_LOCATION || undefined;
query.maximumBytesBilled = String(maxBytesBilled);
const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(values.RAUMLY_BILLING_EXPORT_BIGQUERY_PROJECT)}/queries`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(query),
});
const billingPayload = await response.json().catch(() => null);
if (!response.ok) throw new Error(`BigQuery-Billing-Abfrage fehlgeschlagen (HTTP ${response.status}).`);
const actualCents = parseBigQueryCost(billingPayload);
if (actualCents === null) {
  console.log(JSON.stringify({ status: "not-reconciled", reason: "billing-export-not-yet-available", selection }));
  process.exit(0);
}
if (actualCents > selection.maximumCents) throw new Error("Billing-Betrag überschreitet die reservierte sichere Grenze.");
const method = selection.kind === "batch" ? "localhost_image_test_reconcile_pending_batch" : "localhost_image_test_reconcile_completed_attempt";
const updatedLedger = await rpc(method, { confirmed_actual_cents: actualCents });
console.log(JSON.stringify({ status: "reconciled", kind: selection.kind, actualCents, ledger: updatedLedger }));
