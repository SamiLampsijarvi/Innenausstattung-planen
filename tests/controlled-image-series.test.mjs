import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateControlledSeries } from "../scripts/controlled-image-series.mjs";

const template = JSON.parse(await readFile(new URL("../docs/templates/controlled-image-series.example.json", import.meta.url)));
const preflightTemplate = JSON.parse(await readFile(new URL("../docs/templates/controlled-image-preflight.example.json", import.meta.url)));
const attempt = (overrides = {}) => ({
  caseId: "C01", status: "passed", consent: true, automaticGate: "passed", humanReview: "accepted",
  displayed: true, durationMs: 1200, actualCents: 12, scores: { style: 4, furniture: 4, usefulness: 4 }, ...overrides,
});
const series = (attempts = []) => ({ ...template, attempts });

test("empty example stays offline and reports both room states", () => {
  const result = evaluateControlledSeries(template);
  assert.equal(result.planned, 10);
  assert.equal(result.groups.empty.planned, 5);
  assert.equal(result.groups.furnished.planned, 5);
  assert.equal(result.actualCents, null);
  assert.equal(result.nextPlannedCase, "C01");
});

test("three-case preflight is an offline plan for furnished and empty rooms", () => {
  const result = evaluateControlledSeries(preflightTemplate);
  assert.equal(result.planned, 3);
  assert.equal(result.groups.furnished.planned, 2);
  assert.equal(result.groups.empty.planned, 1);
  assert.equal(result.reservedCents, 0);
  assert.equal(result.actualCents, null);
  assert.equal(result.nextPlannedCase, "C01");
});

test("offline evaluator has no provider, database or network integration", async () => {
  const source = await readFile(new URL("../scripts/controlled-image-series.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|createVertexImageProvider|@supabase\/|BigQuery/i);
});

test("one manually approved case counts one 30-cent reservation", () => {
  const result = evaluateControlledSeries(series([attempt()]));
  assert.equal(result.reservedCents, 30);
  assert.equal(result.actualCents, 12);
  assert.equal(result.usable, 1);
  assert.equal(result.meanDurationMs, 1200);
  assert.equal(result.nextPlannedCase, "C02");
});

test("missing consent and duplicate cases are rejected", () => {
  assert.throws(() => evaluateControlledSeries(series([attempt({ consent: false })])));
  assert.throws(() => evaluateControlledSeries(series([attempt(), attempt()])));
});

test("unknown outcome or billing blocks the next planned case", () => {
  for (const value of [attempt({ status: "unknown", automaticGate: "unavailable", humanReview: "pending", displayed: false, actualCents: null, scores: null }), attempt({ actualCents: null })]) {
    const result = evaluateControlledSeries(series([value]));
    assert.equal(result.nextPlannedCase, null);
    assert.equal(result.actualCents, null);
    assert.equal(result.usableRate, null);
  }
});

test("pending human review blocks the offline plan", () => {
  const result = evaluateControlledSeries(series([attempt({ humanReview: "pending", displayed: false, scores: null })]));
  assert.equal(result.nextPlannedCase, null);
  assert.equal(result.usableRate, null);
});

test("failed quality gate or pending human review can never be displayed", () => {
  assert.throws(() => evaluateControlledSeries(series([attempt({ status: "rejected", automaticGate: "rejected", displayed: true, scores: null })])));
  assert.throws(() => evaluateControlledSeries(series([attempt({ humanReview: "pending", displayed: true })])));
});

test("poor style or furniture choice is not counted as usable", () => {
  const result = evaluateControlledSeries(series([attempt({ scores: { style: 2, furniture: 4, usefulness: 5 } })]));
  assert.equal(result.usable, 0);
  assert.equal(result.usableRate, 0);
});

test("a human rejection is a complete unusable result even without scores", () => {
  const result = evaluateControlledSeries(series([attempt({ humanReview: "rejected", displayed: false, scores: null })]));
  assert.equal(result.usableRate, 0);
  assert.equal(result.nextPlannedCase, "C02");
});

test("budget and schema reject unapproved or private data", () => {
  assert.throws(() => evaluateControlledSeries({ ...template, maximumTotalCents: 270 }));
  assert.throws(() => evaluateControlledSeries({ ...template, cases: template.cases.map((item) => ({ ...item, roomState: "empty" })) }));
  assert.throws(() => evaluateControlledSeries({ ...template, sourcePhoto: "private" }));
  assert.throws(() => evaluateControlledSeries(series([attempt({ actualCents: 31 })])));
  assert.throws(() => evaluateControlledSeries(series([attempt({ filePath: "private" })])));
});
