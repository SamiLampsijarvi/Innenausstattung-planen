const requiredCampaignFields = ["campaignAttemptsRemaining", "campaignActive", "campaignStoppedAt"];

export function evaluateThreeAttemptCampaignReadiness(ledger, pendingBilling) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger) || !Array.isArray(pendingBilling)) {
    throw new Error("Ungültige Bereitschaftsdaten.");
  }

  const migrationApplied = requiredCampaignFields.every((field) => Object.hasOwn(ledger, field));
  const checks = {
    migrationApplied,
    noActiveAttempt: ledger.activeAttempt === false,
    noPendingBilling: pendingBilling.length === 0,
    enoughFreeBudget: Number.isSafeInteger(ledger.remainingCents) && ledger.remainingCents >= 90,
    campaignNotActive: migrationApplied && ledger.campaignActive === false,
    billingWasChecked: typeof ledger.billingCheckedAt === "string" && ledger.billingCheckedAt.length > 0,
  };
  const blockers = [];
  if (!checks.migrationApplied) blockers.push("Die Drei-Versuche-Migration ist in Supabase noch nicht installiert.");
  if (!checks.noActiveAttempt) blockers.push("Ein früherer Bildversuch ist noch aktiv.");
  if (!checks.noPendingBilling) blockers.push("Mindestens ein Versuch wartet noch auf den Google-Billing-Abgleich.");
  if (!checks.enoughFreeBudget) blockers.push("Im lokalen Testpool sind weniger als 90 Cent frei.");
  if (checks.migrationApplied && !checks.campaignNotActive) blockers.push("Eine Drei-Versuche-Kampagne ist bereits aktiv.");
  if (!checks.billingWasChecked) blockers.push("Es liegt noch kein bestätigter Billing-Abgleich vor.");

  return {
    readyToStartCampaign: Object.values(checks).every(Boolean),
    checks,
    blockers,
    remainingCents: Number.isSafeInteger(ledger.remainingCents) ? ledger.remainingCents : null,
    pendingBillingEntries: pendingBilling.length,
    campaignAttemptsRemaining: migrationApplied ? ledger.campaignAttemptsRemaining : null,
    note: "Nur lesende Prüfung. Sie startet weder die Kampagne noch Vertex und ändert keine Kostenlimits.",
  };
}
