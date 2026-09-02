import { expect, test } from "@playwright/test";

test("zeigt ausschließlich die sachliche Pilotoberfläche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Einrichtung, die zu Ihrem Raum, Stil und Budget passt." })).toBeVisible();
  await expect(page.getByText("PRODUKT IN ENTWICKLUNG")).toBeVisible();
  await expect(page.getByText("keinen Foto-Upload")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Anmelden/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /kaufen/i })).toHaveCount(0);
});

test("stellt transparente lokale Rechtstextvorlagen bereit", async ({ page }) => {
  await page.goto("/impressum");
  await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
  await expect(page.getByText("Nicht zur Veröffentlichung freigegeben")).toBeVisible();
  await page.goto("/datenschutz");
  await expect(page.getByText("Entwurf für den lokalen Pilotstand")).toBeVisible();
  await page.goto("/affiliate-hinweis");
  await expect(page.getByText("keine aktiven Händler- oder Affiliate-Links")).toBeVisible();
});

test("sperrt interne Oberfläche und API im Pilotmodus", async ({ request }) => {
  expect((await request.get("/internal/image-test")).status()).toBe(404);
  expect((await request.get("/api/internal/image-test")).status()).toBe(404);
});

test("verhindert die Suchmaschinenaufnahme der Vorabversion", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("Disallow: /");
});
