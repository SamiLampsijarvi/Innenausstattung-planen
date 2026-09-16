const allowedStatuses = new Set(["succeeded", "discarded"]);

export function selectReconciliation(pending, ledger) {
  if (!Array.isArray(pending) || !ledger || typeof ledger !== "object") {
    throw new Error("Ungültige lokale Abrechnungsdiagnose.");
  }
  if (pending.length === 0) return { kind: "nothing-pending" };

  const unknown = pending.filter((attempt) => attempt.status === "unknown");
  const completed = pending.filter((attempt) => allowedStatuses.has(attempt.status));
  if (unknown.length === 1 && completed.length === 0) {
    return { kind: "manual-review", reason: "unknown-attempt" };
  }
  if (unknown.length === 0 && completed.length === 1 && pending.length === 1 && ledger.activeAttempt === false) {
    return { kind: "completed", maximumCents: 30, startedAt: completed[0].startedAt };
  }
  if (
    pending.length === 2 && unknown.length === 1 && completed.length === 1 &&
    unknown[0].provisionalBillingHold === true && unknown[0].providerReceipt === false &&
    ledger.activeAttempt === false
  ) {
    return { kind: "batch", maximumCents: 60, startedAt: unknown[0].startedAt };
  }
  return { kind: "manual-review", reason: "ambiguous-pending-attempts" };
}

export function ceilingEuroToCents(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("Google Billing lieferte keinen gültigen EUR-Betrag.");
  }
  const [whole, fraction = ""] = value.split(".");
  const euros = BigInt(whole);
  const padded = `${fraction}00`;
  const cents = BigInt(padded.slice(0, 2));
  const hasRemainder = /[1-9]/.test(padded.slice(2));
  const result = euros * 100n + cents + (hasRemainder ? 1n : 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Billing-Betrag ist zu groß.");
  return Number(result);
}

export function parseBigQueryCost(payload) {
  if (!payload || payload.jobComplete !== true || !Array.isArray(payload.rows)) {
    throw new Error("BigQuery-Abfrage ist nicht vollständig.");
  }
  if (payload.rows.length === 0) return null;
  if (payload.rows.length !== 1) throw new Error("Google Billing ist nicht eindeutig einer Währung zuordenbar.");
  const values = payload.rows[0]?.f?.map((field) => field.v);
  if (!values || values.length !== 2 || values[0] !== "EUR") {
    throw new Error("Der Billing-Export ist nicht eindeutig in EUR verfügbar.");
  }
  return ceilingEuroToCents(values[1]);
}

export function buildBillingQuery({ table, projectId, serviceDescription, startedAt }) {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_-]+$/.test(table ?? "")) {
    throw new Error("Die BigQuery-Exporttabelle ist ungültig.");
  }
  if (!projectId || !serviceDescription || !startedAt) throw new Error("Die Billing-Export-Konfiguration ist unvollständig.");
  return {
    query: `select currency, cast(round(sum(cost + ifnull((select sum(credit.amount) from unnest(credits) credit), 0)), 6) as string) as total_cost from \`${table}\` where project.id=@project_id and service.description=@service_description and usage_start_time>=@started_at group by currency`,
    useLegacySql: false,
    parameterMode: "NAMED",
    queryParameters: [
      { name: "project_id", parameterType: { type: "STRING" }, parameterValue: { value: projectId } },
      { name: "service_description", parameterType: { type: "STRING" }, parameterValue: { value: serviceDescription } },
      { name: "started_at", parameterType: { type: "TIMESTAMP" }, parameterValue: { value: startedAt } },
    ],
  };
}
