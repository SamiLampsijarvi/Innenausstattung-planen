import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { evaluateImages } from "../scripts/image-evaluation.mjs";

const scores = { room: 3, style: 4, realism: 5, usefulness: 3, accuracy: 4 };
const attempt = (overrides = {}) => ({ caseId: "F01", variant: "A", attempt: 1, status: "succeeded", durationMs: 1500, actualCents: 8, scores: { ...scores }, ...overrides });
const pilot = (attempts = []) => ({ stage: "pilot", caseIds: ["F01"], variants: ["A"], budgetCents: 500, privacyReviewed: true, attempts });

test("empty template never implies free generation or a recommendation", async () => {
  const report = evaluateImages(JSON.parse(await readFile(new URL("../docs/templates/image-evaluation.example.json", import.meta.url), "utf8")));
  assert.equal(report.actualCents, null);
  assert.equal(report.withinRecordedBudget, null);
  assert.equal(report.readyForHumanComparison, false);
  assert.deepEqual(report.qualityThresholdCandidates, []);
});

test("uses double weights for room and usefulness, no pilot recommendation", () => {
  const report = evaluateImages(pilot([attempt()]));
  assert.equal(report.variants[0].meanQualityOfRatedImages, 25 / 7);
  assert.equal(report.variants[0].usableRate, 1);
  assert.equal(report.readyForHumanComparison, false);
});

test("failed attempts remain in denominator and total cost", () => {
  const report = evaluateImages(pilot([attempt(), attempt({ attempt: 2, status: "failed", scores: null, actualCents: 6 })]));
  assert.equal(report.variants[0].usableRate, 0.5);
  assert.equal(report.variants[0].firstAttemptUsableRate, 1);
  assert.equal(report.variants[0].centsPerUsableResult, 14);
  assert.deepEqual(report.qualityThresholdCandidates, []);
});

test("unknown billing cannot masquerade as zero or a reconciled average", () => {
  const report = evaluateImages(pilot([attempt({ actualCents: null })]));
  assert.equal(report.actualCents, null);
  assert.equal(report.variants[0].centsPerUsableResult, null);
});

test("missing rating and unknown outcome block quality conclusions", () => {
  for (const a of [attempt({ scores: null }), attempt({ status: "unknown", scores: null })]) {
    const report = evaluateImages(pilot([a]));
    assert.equal(report.variants[0].usableRate, null);
    assert.equal(report.variants[0].centsPerUsableResult, null);
    assert.deepEqual(report.qualityThresholdCandidates, []);
  }
});

test("room and usefulness cannot be compensated by other excellent scores", () => {
  const report = evaluateImages(pilot([attempt({ scores: { room: 2, style: 5, realism: 5, usefulness: 5, accuracy: 5 } })]));
  assert.equal(report.variants[0].usableRate, 0);
  assert.equal(report.variants[0].centsPerUsableResult, null);
});

test("rejects duplicate attempts, invalid scores and cherry-picked second attempts", () => {
  for (const attempts of [[attempt(), attempt()], [attempt({ attempt: 2 })], [attempt({ scores: { ...scores, room: 6 } })], [attempt({ actualCents: -1 })], [attempt({ status: "failed" })]]) {
    assert.throws(() => evaluateImages(pilot(attempts)));
  }
});

test("rejects unknown fields so private text cannot leak through reports", () => {
  assert.throws(() => evaluateImages({ ...pilot(), sourcePhoto: "private" }));
  assert.throws(() => evaluateImages(pilot([attempt({ email: "private@example.test" })])));
});

test("comparison requires complete paired cases, ratings, privacy review and billing", () => {
  const caseIds = Array.from({ length: 20 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);
  const attempts = caseIds.flatMap((caseId) => ["A", "B"].map((variant) => attempt({ caseId, variant })));
  const data = { ...pilot(attempts), stage: "comparison", caseIds, variants: ["A", "B"] };
  assert.equal(evaluateImages(data).readyForHumanComparison, true);
  assert.equal(evaluateImages({ ...data, attempts: attempts.slice(1) }).readyForHumanComparison, false);
  assert.equal(evaluateImages({ ...data, privacyReviewed: false }).readyForHumanComparison, false);
  assert.equal(evaluateImages({ ...data, budgetCents: 100 }).readyForHumanComparison, false);
  assert.throws(() => evaluateImages({ ...data, caseIds: caseIds.slice(0, 5) }));
});

test("fractional settled costs and unavailable timing remain explicit", () => {
  const report = evaluateImages(pilot([attempt({ actualCents: 6.72, durationMs: null })]));
  assert.equal(report.actualCents, 6.72);
  assert.equal(report.variants[0].meanDurationMs, null);
});

test("CLI rejects missing input without echoing private paths", () => {
  const result = spawnSync(process.execPath, ["scripts/image-evaluation.mjs", "private-evaluation/missing-private-file.json"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.doesNotMatch(result.stderr, /missing-private-file/);
});
