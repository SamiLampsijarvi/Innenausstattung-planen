import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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

  await expect(page.locator(".furniture-card")).toHaveCount(6);
  const sofaCard = page.locator(".furniture-card").filter({ has: page.getByRole("heading", { name: "Sofa / Couch", exact: true }) });
  await expect(sofaCard.getByLabel("Keine Vorgabe")).toBeChecked();
  await sofaCard.getByLabel("Behalten").check();
  await sofaCard.getByLabel("Freiwilliger Kommentar").fill("Dieses Sofa muss bleiben.");
  await page.getByLabel("Allgemeine Raumnotiz").fill("Keine schwarzen Möbel.");

  await sofaCard.getByText("Erkennung korrigieren").click();
  await sofaCard.getByLabel("Tatsächliche Möbelart").selectOption("armchair");
  const correctedCard = page.locator(".furniture-card").filter({ has: page.getByRole("heading", { name: "Sessel", exact: true }) });
  await expect(correctedCard).toContainText("Vom Nutzer korrigiert");
  await expect(correctedCard.getByLabel("Behalten")).toBeChecked();
  await expect(correctedCard.getByLabel("Freiwilliger Kommentar")).toHaveValue("Dieses Sofa muss bleiben.");

  await correctedCard.getByRole("button", { name: "Falsch erkannt – entfernen" }).click();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.locator(".furniture-card").filter({ has: page.getByRole("heading", { name: "Sessel", exact: true }) })).toBeVisible();

  await page.getByText("Möbel ergänzen").click();
  await page.getByLabel("Möbelart", { exact: true }).selectOption("dining-chair");
  await page.getByLabel("Anzahl").selectOption("4");
  await page.getByRole("button", { name: "Zur Planung hinzufügen" }).click();
  await expect(page.locator(".furniture-card").filter({ has: page.getByRole("heading", { name: "Esszimmerstuhl (4×)", exact: true }) })).toContainText("Vom Nutzer ergänzt");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator(".project-grid article").filter({ hasText: "Möbeltest" }).getByRole("button", { name: "Öffnen" }).click();
  await expect(page.locator(".furniture-card")).toHaveCount(7);
  await expect(page.getByLabel("Allgemeine Raumnotiz")).toHaveValue("Keine schwarzen Möbel.");
  await expect(page.getByAltText("Vorschau: raum.png")).toHaveCount(0);
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
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("raumly.local-projects")!).version)).toBe(2);

  await page.locator('input[type="file"]').setInputFiles({ name: "alt.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByRole("button", { name: "Test-Erkennung starten" }).click();
  for (let index = 0; index < 6; index += 1) {
    await page.locator(".furniture-card").first().getByRole("button", { name: "Falsch erkannt – entfernen" }).click();
  }
  await expect(page.locator(".furniture-card")).toHaveCount(0);
  await expect(page.getByText("Keine Möbel in der Planung.")).toBeVisible();
});
