import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const fail = () => { throw new Error("Ungültiger Testserienplan. Format und Werte in docs/CONTROLLED_IMAGE_TEST_SERIES.md prüfen."); };
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const exact = (value, names) => {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some((key) => !names.includes(key)) || names.some((key) => !Object.hasOwn(value, key))) fail();
};

/** Pure, offline evaluation. This module never reads photos, calls a provider or changes a ledger. */
export function evaluateControlledSeries(data) {
  exact(data, ["seriesId", "maximumAttempts", "maximumTotalCents", "cases", "attempts"]);
  if (typeof data.seriesId !== "string" || !/^[A-Za-z0-9_-]{3,40}$/.test(data.seriesId) ||
      !integer(data.maximumAttempts, 1, 10) || !integer(data.maximumTotalCents, 30, 300) ||
      !Array.isArray(data.cases) || data.cases.length !== data.maximumAttempts || !Array.isArray(data.attempts) ||
      data.attempts.length > data.maximumAttempts || data.maximumAttempts * 30 > data.maximumTotalCents) fail();
  const ids = new Set();
  for (const item of data.cases) {
    exact(item, ["id", "roomState", "roomType", "style", "budgetEuro"]);
    if (typeof item.id !== "string" || !/^C\d{2}$/.test(item.id) || ids.has(item.id) ||
        !["empty", "furnished"].includes(item.roomState) || item.roomType !== "living-room" ||
        typeof item.style !== "string" || !item.style.trim() || item.style.length > 80 ||
        !integer(item.budgetEuro, 100, 10_000)) fail();
    ids.add(item.id);
  }
  const attempted = new Set();
  let reservedCents = 0;
  let settledCents = 0;
  let billingComplete = true;
  const durations = [];
  let usable = 0;
  const outcomes = { passed: 0, rejected: 0, failed: 0, unknown: 0 };
  const groups = { empty: { planned: 0, attempted: 0, usable: 0 }, furnished: { planned: 0, attempted: 0, usable: 0 } };
  for (const item of data.cases) groups[item.roomState].planned++;
  if (!groups.empty.planned || !groups.furnished.planned) fail();
  if (data.maximumAttempts === 10 && (groups.empty.planned !== 5 || groups.furnished.planned !== 5)) fail();
  for (const item of data.attempts) {
    exact(item, ["caseId", "status", "consent", "automaticGate", "humanReview", "displayed", "durationMs", "actualCents", "scores"]);
    if (!ids.has(item.caseId) || attempted.has(item.caseId) || item.consent !== true ||
        !["passed", "rejected", "failed", "unknown"].includes(item.status) ||
        !["passed", "rejected", "unavailable"].includes(item.automaticGate) ||
        !["accepted", "rejected", "pending"].includes(item.humanReview) || typeof item.displayed !== "boolean" ||
        !(item.durationMs === null || integer(item.durationMs, 0, 86_400_000)) ||
        !(item.actualCents === null || typeof item.actualCents === "number" && Number.isFinite(item.actualCents) && item.actualCents >= 0 && item.actualCents <= 30)) fail();
    if (item.status !== "passed" && (item.automaticGate === "passed" || item.humanReview === "accepted" || item.displayed)) fail();
    if (item.status === "passed" && item.automaticGate !== "passed") fail();
    if (item.displayed && (item.status !== "passed" || item.automaticGate !== "passed" || item.humanReview !== "accepted")) fail();
    if (item.scores !== null) {
      exact(item.scores, ["style", "furniture", "usefulness"]);
      if (item.status !== "passed" || [item.scores.style, item.scores.furniture, item.scores.usefulness].some((v) => !integer(v, 1, 5))) fail();
    }
    attempted.add(item.caseId);
    outcomes[item.status]++;
    reservedCents += 30;
    if (item.actualCents === null) billingComplete = false;
    else settledCents += item.actualCents;
    if (item.durationMs !== null) durations.push(item.durationMs);
    const group = groups[data.cases.find((c) => c.id === item.caseId).roomState];
    group.attempted++;
    if (item.status === "passed" && item.displayed && item.scores?.style >= 3 && item.scores?.furniture >= 3 && item.scores?.usefulness >= 3) {
      group.usable++;
      usable++;
    }
  }
  if (reservedCents > data.maximumTotalCents) fail();
  const unresolved = data.attempts.some((item) => item.status === "unknown" || item.actualCents === null ||
    item.status === "passed" && (item.humanReview === "pending" || item.humanReview === "accepted" && item.scores === null));
  for (const group of Object.values(groups)) {
    group.usableRate = !unresolved && group.attempted ? group.usable / group.attempted : null;
  }
  return {
    seriesId: data.seriesId,
    planned: data.cases.length,
    attempted: data.attempts.length,
    remaining: data.cases.length - data.attempts.length,
    reservedCents,
    actualCents: billingComplete && data.attempts.length ? settledCents : null,
    meanDurationMs: durations.length === data.attempts.length && durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    usable,
    usableRate: data.attempts.length && !unresolved ? usable / data.attempts.length : null,
    outcomes,
    groups,
    nextPlannedCase: unresolved ? null : data.cases.find((item) => !attempted.has(item.id))?.id ?? null,
    offlineStopReason: unresolved ? "Offener Versuch, ungeklärte Prüfung oder Abrechnung: vor weiteren Starts prüfen." :
      attempted.size === ids.size ? "Alle geplanten Fälle erfasst." : null,
    note: "Der nächste geplante Fall ist keine Startfreigabe. Ein echter Versuch braucht eine neue Einwilligung und die Freigabe durch die Supabase-Buchhaltung."
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) fail();
    const source = await readFile(process.argv[2]);
    if (source.length > 100_000) fail();
    console.log(JSON.stringify(evaluateControlledSeries(JSON.parse(source.toString("utf8"))), null, 2));
  } catch {
    console.error("Testserie konnte nicht ausgewertet werden. Lokale JSON-Datei nach der Anleitung prüfen.");
    process.exitCode = 1;
  }
}
