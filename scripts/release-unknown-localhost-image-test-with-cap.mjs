import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const values = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
}));
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Die lokale Supabase-Konfiguration ist unvollständig.");

const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/localhost_image_test_release_unknown_attempt_provisionally`, {
  method: "POST",
  headers: { apikey: values.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
});
const payload = await response.json().catch(() => null);
if (!response.ok) throw new Error(`Der ungeklärte Versuch konnte nicht vorsorglich freigegeben werden (HTTP ${response.status}): ${JSON.stringify(payload)}`);
console.log(JSON.stringify(payload, null, 2));
