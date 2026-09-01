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
  await page.getByLabel("Postleitzahl (optional)").fill("10115");
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
  await expect(result).toContainText("kein Raumfoto übertragen");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!).projects[0].livingRoom.productConcept.style)).toBe("Japandi");

  await page.reload();
  await page.waitForLoadState("networkidle");
  const projectCard = page.locator(".project-grid article").filter({ hasText: "Meine Wohnung" });
  await expect(projectCard).toBeVisible();
  await projectCard.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByRole("button", { name: /Japandi/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Postleitzahl (optional)")).toHaveValue("10115");
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

test("führt durch den einfachen Grundablauf ohne Möbelanalyse oder externe KI", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Neues Zuhause").fill("Einfacher Ablauf");
  await page.getByRole("button", { name: "Zuhause anlegen" }).click();

  await expect(page.getByText("Zimmer auswählen", { exact: true })).toBeVisible();
  await expect(page.getByText("Designstil wählen", { exact: true })).toBeVisible();
  await expect(page.getByText("Foto hochladen", { exact: true })).toBeVisible();
  await expect(page.getByText("Budget auswählen", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lokale KI-Erkennung starten" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Test-Erkennung starten" })).toHaveCount(0);
  await expect(page.locator(".draft-results")).toHaveCount(0);

  await page.getByRole("button", { name: /Japandi/ }).click();
  await page.getByLabel(/Budget:/).fill("3000");
  await page.locator('input[type="file"]').setInputFiles({ name: "raum.png", mimeType: "image/png", buffer: onePixelPng });
  const summaryButton = page.getByRole("button", { name: "Planung zusammenfassen" });
  await expect(summaryButton).toBeEnabled();
  await summaryButton.click();
  const result = page.getByRole("complementary", { name: "Ihre Zusammenfassung" });
  await expect(result).toContainText("Japandi");
  await expect(result).toContainText("3.000 €");
  await expect(result).toContainText("Noch nicht angegeben");
  await expect(result).toContainText("AUTOMATISCHE PRODUKTAUSWAHL");
  await expect(result).toContainText("Japandi Sofa");
  await expect(result).toContainText("Synthetisches Testprodukt");
  await expect(result).toContainText("KI-Bild gesperrt");
  await expect(result).toContainText("keine KI-Kosten");
});

test("bewahrt vorhandene Möbel- und Entwurfsdaten unsichtbar und ohne Verlust", async ({ page }) => {
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
  await expect(page.locator(".furniture-planner")).toHaveCount(0);
  await expect(page.locator(".draft-results")).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!));
  expect(stored.version).toBe(4);
  expect(stored.projects[0].livingRoom.furnitureReview.generalNote).toBe("Helle Farben");
  expect(stored.projects[0].livingRoom.furnitureReview.items[0].comment).toBe("Bitte behalten");
});
