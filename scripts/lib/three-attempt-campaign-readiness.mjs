const requiredCampaignFields = ["campaignAttemptsRemaining", "campaignActive", "campaignStoppedAt"];

export function evaluateThreeAttemptCampaignReadiness(ledger, pendingBilling) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger) || !Array.isArray(pendingBilling)) {
    throw new Error("Ungültige Bereitschaftsdaten.");
  }

  const migrationApplied = requiredCampaignFields.every((field) => Object.hasOwn(ledger, field));
  const carriedBilling = pendingBilling.length === 1 && pendingBilling[0]?.campaignBillingCarry === true;
  const checks = {
    migrationApplied,
    noActiveAttempt: ledger.activeAttempt === false,
    billingSafeForCampaign: pendingBilling.length === 0 || carriedBilling,
    enoughFreeBudget: Number.isSafeInteger(ledger.remainingCents) && ledger.remainingCents >= 90,
    campaignNotActive: migrationApplied && ledger.campaignActive === false,
    billingWasChecked: typeof ledger.billingCheckedAt === "string" && ledger.billingCheckedAt.length > 0,
  };
  const readyToStartCampaign = Object.values(checks).every(Boolean);
  const readyForImageAttempt = migrationApplied && checks.noActiveAttempt && checks.billingSafeForCampaign &&
    checks.billingWasChecked && ledger.campaignActive === true &&
    Number.isSafeInteger(ledger.campaignAttemptsRemaining) && ledger.campaignAttemptsRemaining > 0 &&
    Number.isSafeInteger(ledger.remainingCents) && ledger.remainingCents >= 30;
  const blockers = [];
  if (!checks.migrationApplied) blockers.push("Die Drei-Versuche-Migration ist in Supabase noch nicht installiert.");
  if (!checks.noActiveAttempt) blockers.push("Ein früherer Bildversuch ist noch aktiv.");
  if (!checks.billingSafeForCampaign) blockers.push("Mindestens ein Versuch wartet noch ohne konservativen Übertrag auf den Google-Billing-Abgleich.");
  if (!checks.enoughFreeBudget && ledger.campaignActive !== true) blockers.push("Im lokalen Testpool sind weniger als 90 Cent frei.");
  if (ledger.campaignActive === true && !readyForImageAttempt && ledger.activeAttempt !== true) blockers.push("Die aktive Kampagne hat keinen sicher verfügbaren nächsten Versuch.");
  if (!checks.billingWasChecked) blockers.push("Es liegt noch kein bestätigter Billing-Abgleich vor.");

  return {
    readyToStartCampaign,
    readyForImageAttempt,
    checks,
    blockers,
    remainingCents: Number.isSafeInteger(ledger.remainingCents) ? ledger.remainingCents : null,
    pendingBillingEntries: pendingBilling.length,
    carriedBillingEntries: carriedBilling ? 1 : 0,
    campaignAttemptsRemaining: migrationApplied ? ledger.campaignAttemptsRemaining : null,
    note: "Nur lesende Prüfung. Sie startet weder die Kampagne noch Vertex und ändert keine Kostenlimits.",
  };
}
