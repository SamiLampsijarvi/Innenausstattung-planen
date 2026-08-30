import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("öffnet die Passwort-Wiederherstellung ohne technische Hilfe", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Passwort vergessen?" }).click();
  await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  await expect(page.getByLabel("Passwort", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Link zum Zurücksetzen senden" })).toBeVisible();

  await page.getByRole("button", { name: "Zurück zur Anmeldung" }).click();
  await expect(page.locator(".auth-form").getByRole("button", { name: "Anmelden", exact: true })).toBeVisible();
});

test("erklärt und markiert die sichere Übernahme des geöffneten Gastprojekts", async ({ page }) => {
  await page.route("**/auth/v1/signup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "55555555-5555-4555-8555-555555555555", email: "gast@example.test" },
        session: null,
      }),
    });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Neues Zuhause").fill("Mein Gastprojekt");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();
  const projectId = await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!).projects[0].id);

  await page.getByRole("button", { name: "Noch kein Konto? Registrieren" }).click();
  await expect(page.getByText("Nach der E-Mail-Bestätigung wird nur Ihr aktuell geöffnetes lokales Zuhause sicher in das neue Konto übernommen.")).toBeVisible();
  await page.getByLabel("E-Mail-Adresse").fill("gast@example.test");
  await page.getByLabel("Passwort", { exact: true }).fill("sicheres-test-passwort");
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page.getByText("Bitte bestätigen Sie Ihre E-Mail-Adresse.")).toBeVisible();

  expect(await page.evaluate(() => {
    const pending = JSON.parse(localStorage.getItem("raumly.pending-guest-transfer")!);
    return { projectId: pending.projectId, expectedEmail: pending.expectedEmail };
  })).toEqual({ projectId, expectedEmail: "gast@example.test" });
});

test("speichert ein Wohnzimmerprojekt lokal und öffnet es erneut", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Neues Zuhause").fill("Meine Wohnung");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();
  await expect(page.getByText("Aktives Zuhause")).toBeVisible();
  await expect(page.getByText("Meine Wohnung", { exact: true }).last()).toBeVisible();

  const summaryButton = page.getByRole("button", { name: "Planung zusammenfassen" });
  await expect(summaryButton).toBeDisabled();

  await page.getByRole("button", { name: /Japandi/ }).click();
  await page.getByLabel("Postleitzahl des Zuhauses").fill("123");
  await expect(summaryButton).toBeDisabled();

  await page.getByLabel("Postleitzahl des Zuhauses").fill("10115");
  await page.locator('input[type="file"]').setInputFiles({
    name: "wohnzimmer.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });

  await expect(page.getByAltText("Vorschau: wohnzimmer.png")).toBeVisible();
  await expect(summaryButton).toBeEnabled();
  await summaryButton.click();

  const result = page.getByRole("complementary", { name: "Ihre Zusammenfassung" });
  await expect(result).toContainText("Wohnzimmer");
  await expect(result).toContainText("Japandi");
  await expect(result).toContainText("10115");
  await expect(result).toContainText("1.500 €");
  await expect(result).toContainText("Noch keine KI-Ausführung");

  await page.reload();
  await page.waitForLoadState("networkidle");
  const projectCard = page.locator(".project-grid article").filter({ hasText: "Meine Wohnung" });
  await expect(projectCard).toBeVisible();
  await projectCard.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByRole("button", { name: /Japandi/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Postleitzahl des Zuhauses")).toHaveValue("10115");
  await expect(page.getByAltText("Vorschau: wohnzimmer.png")).toHaveCount(0);
  await expect(page.getByText("Fotos werden nicht dauerhaft gespeichert.")).toBeVisible();
});

test("verwaltet mehrere lokale Zuhause-Projekte", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const nameInput = page.getByLabel("Neues Zuhause");
  await nameInput.fill("Wohnung Berlin");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();
  await nameInput.fill("Ferienhaus");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();

  const firstProject = page.locator(".project-grid article").filter({ hasText: "Wohnung Berlin" });
  await firstProject.getByRole("button", { name: "Umbenennen" }).click();
  await page.getByLabel("Projektname").fill("Wohnung Hamburg");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Wohnung Hamburg", { exact: true })).toBeVisible();

  const secondProject = page.locator(".project-grid article").filter({ hasText: "Ferienhaus" });
  page.once("dialog", (dialog) => dialog.accept());
  await secondProject.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText("Ferienhaus", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Wohnung Hamburg", { exact: true })).toBeVisible();
});

test("prüft, korrigiert und ergänzt Möbel mit freiwilligen Angaben", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Neues Zuhause").fill("Möbeltest");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();

  const simulationButton = page.getByRole("button", { name: "Test-Erkennung starten" });
  await expect(simulationButton).toBeDisabled();
  await page.locator('input[type="file"]').setInputFiles({ name: "raum.png", mimeType: "image/png", buffer: onePixelPng });
  await expect(simulationButton).toBeEnabled();
  await simulationButton.click();

  await expect(page.locator(".furniture-selector button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Sofa \/ Couch Simuliert erkannt/ })).toHaveAttribute("aria-pressed", "true");
  const sofaCard = page.locator(".furniture-card");
  await expect(sofaCard.getByLabel("Keine Vorgabe")).toBeChecked();
  await sofaCard.getByLabel("Behalten").check();
  await sofaCard.getByLabel("Freiwilliger Kommentar").fill("Dieses Sofa muss bleiben.");
  await page.getByLabel("Allgemeine Raumnotiz").fill("Keine schwarzen Möbel.");

  await sofaCard.getByText("Erkennung korrigieren").click();
  await sofaCard.getByLabel("Tatsächliche Möbelart").selectOption("armchair");
  const correctedCard = page.locator(".furniture-card");
  await expect(correctedCard).toContainText("Vom Nutzer korrigiert");
  await expect(correctedCard.getByLabel("Behalten")).toBeChecked();
  await expect(correctedCard.getByLabel("Freiwilliger Kommentar")).toHaveValue("Dieses Sofa muss bleiben.");

  await correctedCard.getByRole("button", { name: "Falsch erkannt – entfernen" }).click();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.getByRole("button", { name: /Sessel Vom Nutzer korrigiert/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByText("Möbel ergänzen").click();
  await page.getByLabel("Möbelart", { exact: true }).selectOption("dining-chair");
  await page.getByLabel("Anzahl").selectOption("4");
  await page.getByRole("button", { name: "Zur Planung hinzufügen" }).click();
  await expect(page.locator(".furniture-card")).toContainText("Esszimmerstuhl (4×)");
  await expect(page.locator(".furniture-card")).toContainText("Vom Nutzer ergänzt");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator(".project-grid article").filter({ hasText: "Möbeltest" }).getByRole("button", { name: "Öffnen" }).click();
  await expect(page.locator(".furniture-selector button")).toHaveCount(7);
  await expect(page.getByLabel("Allgemeine Raumnotiz")).toHaveValue("Keine schwarzen Möbel.");
  await expect(page.getByAltText("Vorschau: raum.png")).toHaveCount(0);
});

test("startet die lokale KI-Erkennung nur nach ausdrücklicher Foto-Erlaubnis", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Neues Zuhause").fill("Lokaler KI-Test");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();

  const detectionButton = page.getByRole("button", { name: "Lokale KI-Erkennung starten" });
  await expect(detectionButton).toBeDisabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "raum.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(detectionButton).toBeDisabled();
  await expect(page.getByText(/Das Raumfoto bleibt auf diesem Gerät/)).toBeVisible();

  await page.getByLabel("Ich erlaube die lokale KI-Analyse dieses Fotos.").check();
  await expect(detectionButton).toBeEnabled();
});

test("migriert bestehende Version-1-Projekte und erlaubt eine leere Möbelliste", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("raumly.local-projects", JSON.stringify({
      version: 1,
      projects: [{
        id: "altes-projekt", name: "Bestehende Wohnung",
        createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-20T10:00:00.000Z",
        livingRoom: { style: "Japandi", postcode: "10115", budget: 2400 },
      }],
    }));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator(".project-grid article").filter({ hasText: "Bestehende Wohnung" }).getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByRole("button", { name: /Japandi/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Postleitzahl des Zuhauses")).toHaveValue("10115");
  await expect(page.getByText("Budget:").locator(".." )).toContainText("2.400 €");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!).version)).toBe(3);

  await page.locator('input[type="file"]').setInputFiles({ name: "alt.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByRole("button", { name: "Test-Erkennung starten" }).click();
  for (let index = 0; index < 6; index += 1) {
    await page.locator(".furniture-card").getByRole("button", { name: "Falsch erkannt – entfernen" }).click();
  }
  await expect(page.locator(".furniture-selector button")).toHaveCount(0);
  await expect(page.locator(".furniture-card")).toHaveCount(0);
  await expect(page.getByText("Keine Möbel in der Planung.")).toBeVisible();
});

test("erstellt höchstens drei unveränderliche Testentwürfe und vergleicht sie vertikal", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Neues Zuhause").fill("Entwurfstest");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();

  const createDraftButton = page.getByRole("button", { name: "3 Testentwürfe erstellen" });
  await expect(createDraftButton).toBeDisabled();
  await page.getByRole("button", { name: /Japandi/ }).click();
  await page.getByLabel("Postleitzahl des Zuhauses").fill("10115");
  await page.locator('input[type="file"]').setInputFiles({ name: "entwurf.png", mimeType: "image/png", buffer: onePixelPng });
  await createDraftButton.click();

  await expect(page.locator(".draft-card")).toHaveCount(3);
  await expect(page.locator(".draft-card").nth(0)).toContainText("Ruhige Basis");
  await expect(page.locator(".draft-card").nth(1)).toContainText("Warme Akzente");
  await expect(page.locator(".draft-card").nth(2)).toContainText("Klare Kontraste");
  await expect(page.getByRole("button", { name: "Fehlenden Testentwurf ergänzen" })).toBeDisabled();
  await expect(page.getByText("Die Grenze von drei Testentwürfen ist erreicht.")).toBeVisible();

  await page.getByRole("button", { name: /Modern/ }).click();
  await page.getByLabel(/Budget:/).fill("3000");
  const firstDraft = page.locator(".draft-card").nth(0);
  const secondDraft = page.locator(".draft-card").nth(1);
  await firstDraft.getByRole("button", { name: "Entwurf öffnen" }).click();
  const selectedDetail = firstDraft.locator(".draft-detail");
  await expect(selectedDetail).toContainText("Japandi");
  await expect(selectedDetail).toContainText("1.500 €");
  await secondDraft.getByRole("button", { name: "Entwurf öffnen" }).click();
  await expect(firstDraft.locator(".draft-detail")).toHaveCount(0);
  await expect(secondDraft.locator(".draft-detail")).toContainText("Warme Akzente");

  await firstDraft.getByLabel("Für Vergleich auswählen").check();
  await secondDraft.getByLabel("Für Vergleich auswählen").check();
  await expect(page.locator(".draft-comparison .draft-detail")).toHaveCount(2);
  await expect(page.locator(".draft-comparison")).toContainText("2 Entwürfe werden untereinander verglichen.");

  await firstDraft.getByRole("button", { name: "Entwurf löschen" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(2);
  await page.locator(".draft-undo").getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(3);
  await page.locator(".draft-card").first().getByRole("button", { name: "Entwurf löschen" }).click();
  await page.getByRole("button", { name: "Fehlenden Testentwurf ergänzen" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(3);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator(".project-grid article").filter({ hasText: "Entwurfstest" }).getByRole("button", { name: "Öffnen" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(3);
  await expect(page.getByAltText("Vorschau: entwurf.png")).toHaveCount(0);
});

test("migriert Möbelprojekte von Version 2 ohne Datenverlust auf Version 3", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("raumly.local-projects", JSON.stringify({
      version: 2,
      projects: [{
        id: "phase-4b", name: "Phase 4B Projekt", createdAt: "2026-08-25T10:00:00.000Z", updatedAt: "2026-08-25T11:00:00.000Z",
        livingRoom: {
          style: "Skandinavisch", postcode: "12163", budget: 1800,
          furnitureReview: { status: "ready", generalNote: "Helle Farben", items: [{ id: "sofa-1", catalogId: "sofa", label: "Sofa / Couch", source: "simulated", preference: "keep", comment: "Bitte behalten", quantity: 1 }] },
        },
      }],
    }));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByLabel("Allgemeine Raumnotiz")).toHaveValue("Helle Farben");
  await expect(page.locator(".furniture-card").getByLabel("Behalten")).toBeChecked();
  await expect(page.locator(".furniture-card").getByLabel("Freiwilliger Kommentar")).toHaveValue("Bitte behalten");
  await expect(page.locator(".draft-card")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!).version)).toBe(3);
});
