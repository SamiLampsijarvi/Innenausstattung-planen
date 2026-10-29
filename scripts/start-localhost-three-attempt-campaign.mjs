import { readFile } from "node:fs/promises";

if (!process.argv.includes("--confirm")) {
  throw new Error("Zum bewussten Start der Drei-Versuche-Kampagne bitte --confirm angeben.");
}

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
}));
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Die lokale Supabase-Konfiguration ist unvollständig.");
}

const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/localhost_image_test_start_three_attempt_campaign`, {
  method: "POST",
  headers: {
    apikey: values.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
});
const payload = await response.json().catch(() => null);
if (!response.ok) {
  throw new Error("Die Kampagne konnte nicht gestartet werden. Prüfe zuerst Kostenrahmen, offenen Versuch und Billing-Abgleich.");
}
console.log(JSON.stringify(payload, null, 2));
