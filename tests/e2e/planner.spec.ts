import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("erstellt ein lokales Wohnzimmer-Planungsbriefing", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

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
});
