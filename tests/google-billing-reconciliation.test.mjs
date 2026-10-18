import test from "node:test";
import assert from "node:assert/strict";
import { buildBillingQuery, ceilingEuroToCents, parseBigQueryCost, selectReconciliation, waitForBigQueryQueryResult } from "../scripts/lib/google-billing-reconciliation.mjs";

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
  assert.equal(parseBigQueryCost({ jobComplete: true, totalRows: "0" }), null);
  assert.equal(parseBigQueryCost({ jobComplete: true, rows: [] }), null);
  assert.throws(() => parseBigQueryCost({ jobComplete: true, rows: [{ f: [{ v: "USD" }, { v: "0.12" }] }] }), /EUR/);
  assert.throws(() => parseBigQueryCost({ jobComplete: false, rows: [] }), /nicht vollständig/);
});

test("BigQuery query polling waits for the same job without submitting another query", async () => {
  const requested = [];
  const responses = [{ jobComplete: true, totalRows: "0" }];
  const result = await waitForBigQueryQueryResult({ jobComplete: false, jobReference: { jobId: "job_123", location: "EU" } }, {
    projectId: "billing-project",
    accessToken: "test-token",
    timeoutMs: 1_000,
    pollIntervalMs: 0,
    fetchImpl: async (url, options) => {
      requested.push({ url, method: options.method ?? "GET", authorization: options.headers.Authorization });
      return { ok: true, json: async () => responses.shift() };
    },
  });
  assert.equal(result.jobComplete, true);
  assert.equal(result.totalRows, "0");
  assert.equal(requested.length, 1);
  assert.match(requested[0].url, /queries\/job_123\?timeoutMs=10000&location=EU/);
  assert.equal(requested[0].method, "GET");
  assert.equal(requested[0].authorization, "Bearer test-token");
});

test("BigQuery query uses only parameters for project, service and time", () => {
  const query = buildBillingQuery({ table: "billing-project.billing.gcp_billing_export_v1_ABC", projectId: "vertex-test", serviceDescription: "Vertex AI", startedAt: "2026-09-16T10:00:00Z" });
  assert.match(query.query, /project\.id=@project_id/);
  assert.equal(query.queryParameters[0].parameterValue.value, "vertex-test");
  assert.throws(() => buildBillingQuery({ table: "bad table", projectId: "p", serviceDescription: "s", startedAt: "t" }), /ungültig/);
});
