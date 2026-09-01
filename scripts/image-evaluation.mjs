import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const metrics = ["room", "style", "realism", "usefulness", "accuracy"];
const statuses = ["succeeded", "failed", "unknown"];
const fail = () => { throw new Error("Ungültige Auswertungsdaten. Schema und Werte gemäß Phase-8-Anleitung prüfen."); };
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
function keys(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some((key) => !allowed.includes(key)) ||
      allowed.some((key) => !Object.hasOwn(value, key))) fail();
}

/** Offline only: no photo reads, credentials, network calls or campaign writes. */
export function evaluateImages(data) {
  keys(data, ["stage", "caseIds", "variants", "budgetCents", "privacyReviewed", "attempts"]);
  if (!["pilot", "comparison"].includes(data.stage) || !Array.isArray(data.caseIds) ||
      !Array.isArray(data.variants) || !Array.isArray(data.attempts) ||
      !integer(data.budgetCents, 1, 100_000) || typeof data.privacyReviewed !== "boolean") fail();
  const pilot = data.stage === "pilot";
  if (!integer(data.caseIds.length, pilot ? 1 : 20, pilot ? 5 : 30) ||
      data.caseIds.some((id) => typeof id !== "string" || !/^F[0-9]{2}$/.test(id)) ||
      new Set(data.caseIds).size !== data.caseIds.length ||
      data.variants.length !== (pilot ? 1 : 2) ||
      data.variants.some((variant) => !["A", "B"].includes(variant)) ||
      new Set(data.variants).size !== data.variants.length ||
      data.attempts.length > data.caseIds.length * data.variants.length * 2) fail();
  const seen = new Set();
  for (const attempt of data.attempts) {
    keys(attempt, ["caseId", "variant", "attempt", "status", "durationMs", "actualCents", "scores"]);
    if (!data.caseIds.includes(attempt.caseId) || !data.variants.includes(attempt.variant) ||
        !integer(attempt.attempt, 1, 2) || !statuses.includes(attempt.status) ||
        !(attempt.durationMs === null || integer(attempt.durationMs, 0, 86_400_000)) ||
        !(attempt.actualCents === null || typeof attempt.actualCents === "number" &&
          Number.isFinite(attempt.actualCents) && attempt.actualCents >= 0 && attempt.actualCents <= 100_000)) fail();
    const id = `${attempt.caseId}/${attempt.variant}/${attempt.attempt}`;
    if (seen.has(id)) fail();
    seen.add(id);
    if (attempt.scores !== null) {
      if (attempt.status !== "succeeded") fail();
      keys(attempt.scores, metrics);
      if (metrics.some((key) => !integer(attempt.scores[key], 1, 5))) fail();
    }
  }
  if (data.attempts.some((a) => a.attempt === 2 && !seen.has(`${a.caseId}/${a.variant}/1`))) fail();
  const usable = (a) => a.status === "succeeded" && a.scores !== null && a.scores.room >= 3 && a.scores.usefulness >= 3;
  const score = (a) => (2 * a.scores.room + a.scores.style + a.scores.realism + 2 * a.scores.usefulness + a.scores.accuracy) / 7;
  const variants = data.variants.map((variant) => {
    const attempts = data.attempts.filter((a) => a.variant === variant);
    const rated = attempts.filter((a) => a.status === "succeeded" && a.scores !== null);
    const complete = attempts.length > 0 && attempts.every((a) => a.status !== "unknown" && (a.status !== "succeeded" || a.scores !== null));
    const billed = attempts.length > 0 && attempts.every((a) => a.actualCents !== null);
    const good = attempts.filter(usable).length;
    const first = attempts.filter((a) => a.attempt === 1);
    return {
      variant, attempts: attempts.length, rated: rated.length,
      failed: attempts.filter((a) => a.status === "failed").length,
      unknown: attempts.filter((a) => a.status === "unknown").length,
      missingRatings: attempts.filter((a) => a.status === "succeeded" && a.scores === null).length,
      usable: good,
      usableRate: complete ? good / attempts.length : null,
      firstAttemptUsableRate: complete ? first.filter(usable).length / first.length : null,
      meanQualityOfRatedImages: rated.length ? rated.reduce((sum, a) => sum + score(a), 0) / rated.length : null,
      coverageComplete: data.caseIds.every((id) => seen.has(`${id}/${variant}/1`)),
      billingComplete: billed,
      actualCents: billed ? attempts.reduce((sum, a) => sum + a.actualCents, 0) : null,
      centsPerUsableResult: billed && complete && good ? attempts.reduce((sum, a) => sum + a.actualCents, 0) / good : null,
      meanDurationMs: attempts.length && attempts.every((a) => a.durationMs !== null) ? attempts.reduce((sum, a) => sum + a.durationMs, 0) / attempts.length : null,
    };
  });
  const billed = variants.every((v) => v.billingComplete);
  const total = billed ? variants.reduce((sum, v) => sum + v.actualCents, 0) : null;
  return {
    stage: data.stage, variants, actualCents: total,
    withinRecordedBudget: total === null ? null : total <= data.budgetCents,
    readyForHumanComparison: !pilot && data.privacyReviewed && total !== null && total <= data.budgetCents &&
      variants.every((v) => v.coverageComplete && v.usableRate !== null),
    qualityThresholdCandidates: variants.filter((v) => v.coverageComplete && v.usableRate !== null && v.usableRate >= 0.8).map((v) => v.variant),
    warning: "Keine Anbieter-, Kosten- oder Ausführungsfreigabe. Pilotdaten erlauben keine endgültige Anbieterwahl. Fehlversuche zählen mit; Bildqualität ersetzt keinen Datenschutz- und Abrechnungsnachweis.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error();
    const source = await readFile(process.argv[2]);
    if (source.length > 1_000_000) throw new Error();
    console.log(JSON.stringify(evaluateImages(JSON.parse(source.toString("utf8"))), null, 2));
  } catch {
    // Do not echo file contents, paths, arbitrary fields or JSON parser errors.
    console.error("Auswertung nicht möglich. Eine lokale JSON-Datei nach dem dokumentierten Schema angeben.");
    process.exitCode = 1;
  }
}
