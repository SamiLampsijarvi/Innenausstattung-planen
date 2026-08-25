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
