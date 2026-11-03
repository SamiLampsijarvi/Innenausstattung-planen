import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateThreeAttemptCampaignReadiness } from "../scripts/lib/three-attempt-campaign-readiness.mjs";

const readyLedger = (overrides = {}) => ({
  remainingCents: 120,
  activeAttempt: false,
  billingCheckedAt: "2026-10-29T10:00:00.000Z",
  campaignAttemptsRemaining: 0,
  campaignActive: false,
  campaignStoppedAt: null,
  ...overrides,
});

test("a fully checked idle ledger is ready for an operator-started campaign", () => {
  const result = evaluateThreeAttemptCampaignReadiness(readyLedger(), []);
  assert.equal(result.readyToStartCampaign, true);
  assert.equal(result.remainingCents, 120);
  assert.deepEqual(result.blockers, []);
});

test("a database without the campaign migration is not ready", () => {
  const ledger = readyLedger();
  delete ledger.campaignActive;
  delete ledger.campaignAttemptsRemaining;
  delete ledger.campaignStoppedAt;
  const result = evaluateThreeAttemptCampaignReadiness(ledger, []);
  assert.equal(result.readyToStartCampaign, false);
  assert.equal(result.checks.migrationApplied, false);
  assert.match(result.blockers[0], /Migration/);
});

test("an active attempt, pending billing or less than 90 free cents blocks readiness", () => {
  assert.equal(evaluateThreeAttemptCampaignReadiness(readyLedger({ activeAttempt: true }), []).readyToStartCampaign, false);
  assert.equal(evaluateThreeAttemptCampaignReadiness(readyLedger(), [{ status: "rejected" }]).readyToStartCampaign, false);
  assert.equal(evaluateThreeAttemptCampaignReadiness(readyLedger({ remainingCents: 89 }), []).readyToStartCampaign, false);
});

test("readiness explains every current blocker in plain language", () => {
  const result = evaluateThreeAttemptCampaignReadiness(readyLedger({ remainingCents: 30 }), [{ status: "rejected" }]);
  assert.equal(result.blockers.length, 2);
  assert.match(result.blockers.join(" "), /Billing-Abgleich/);
  assert.match(result.blockers.join(" "), /90 Cent/);
});

test("one explicitly carried stale billing entry is safe for a bounded campaign", () => {
  const result = evaluateThreeAttemptCampaignReadiness(readyLedger(), [{ status: "discarded", campaignBillingCarry: true }]);
  assert.equal(result.readyToStartCampaign, true);
  assert.equal(result.carriedBillingEntries, 1);
});

test("an active campaign reports that the next deliberate image attempt is ready", () => {
  const result = evaluateThreeAttemptCampaignReadiness(readyLedger({ campaignActive: true, campaignAttemptsRemaining: 3 }), [
    { status: "discarded", campaignBillingCarry: true },
  ]);
  assert.equal(result.readyToStartCampaign, false);
  assert.equal(result.readyForImageAttempt, true);
  assert.deepEqual(result.blockers, []);
});

test("the readiness command contains no mutating campaign or provider call", async () => {
  const source = await readFile(new URL("../scripts/check-three-attempt-campaign-readiness.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localhost_image_test_start_three_attempt_campaign|createVertexImageProvider|@google\/genai/i);
  assert.match(source, /localhost_image_test_ledger_status/);
  assert.match(source, /localhost_image_test_pending_billing_diagnostics/);
});
