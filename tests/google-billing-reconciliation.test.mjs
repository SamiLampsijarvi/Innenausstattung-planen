import test from "node:test";
import assert from "node:assert/strict";
import { buildBillingQuery, ceilingEuroToCents, parseBigQueryCost, selectReconciliation } from "../scripts/lib/google-billing-reconciliation.mjs";

test("billing export selects exactly one completed attempt", () => {
  assert.deepEqual(selectReconciliation([{ status: "discarded", startedAt: "2026-09-16T10:00:00Z", providerReceipt: true }], { activeAttempt: false }), {
    kind: "completed", maximumCents: 30, startedAt: "2026-09-16T10:00:00Z",
  });
});

test("unknown and ambiguous attempts never reconcile automatically", () => {
  assert.equal(selectReconciliation([{ status: "unknown", startedAt: "2026-09-16T10:00:00Z", providerReceipt: false }], { activeAttempt: true }).kind, "manual-review");
  assert.equal(selectReconciliation([{ status: "unknown" }, { status: "discarded" }], { activeAttempt: false }).kind, "manual-review");
});

test("only a marked provisional hold can be reconciled as a two-attempt batch", () => {
  const result = selectReconciliation([
    { status: "unknown", startedAt: "2026-09-16T10:00:00Z", providerReceipt: false, provisionalBillingHold: true },
    { status: "succeeded", startedAt: "2026-09-16T10:01:00Z", providerReceipt: true },
  ], { activeAttempt: false });
  assert.deepEqual(result, { kind: "batch", maximumCents: 60, startedAt: "2026-09-16T10:00:00Z" });
});

test("EUR values round upward and foreign or incomplete data is rejected", () => {
  assert.equal(ceilingEuroToCents("0.120001"), 13);
  assert.equal(parseBigQueryCost({ jobComplete: true, rows: [{ f: [{ v: "EUR" }, { v: "0.12" }] }] }), 12);
  assert.throws(() => parseBigQueryCost({ jobComplete: true, rows: [{ f: [{ v: "USD" }, { v: "0.12" }] }] }), /EUR/);
  assert.throws(() => parseBigQueryCost({ jobComplete: false, rows: [] }), /nicht vollständig/);
});

test("BigQuery query uses only parameters for project, service and time", () => {
  const query = buildBillingQuery({ table: "billing-project.billing.gcp_billing_export_v1_ABC", projectId: "vertex-test", serviceDescription: "Vertex AI", startedAt: "2026-09-16T10:00:00Z" });
  assert.match(query.query, /project\.id=@project_id/);
  assert.equal(query.queryParameters[0].parameterValue.value, "vertex-test");
  assert.throws(() => buildBillingQuery({ table: "bad table", projectId: "p", serviceDescription: "s", startedAt: "t" }), /ungültig/);
});
