import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
}));

if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Die lokale Supabase-Konfiguration ist unvollständig.");
}

const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/localhost_image_test_reconcile_dangling_lock`, {
  method: "POST",
  headers: {
    apikey: values.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
});
if (!response.ok) throw new Error(`Verwaiste Testsperre konnte nicht sicher bereinigt werden (HTTP ${response.status}).`);

const ledger = await response.json();
if (!ledger || ledger.activeAttempt !== false) throw new Error("Die Testsperre ist weiterhin aktiv.");
console.log(JSON.stringify(ledger, null, 2));
