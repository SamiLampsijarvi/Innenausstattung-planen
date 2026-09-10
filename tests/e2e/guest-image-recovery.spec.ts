import { expect, test } from "@playwright/test";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=", "base64");
for (const outcome of ["succeeded", "discarded", "unknown"] as const) {
  test(`Ein-Klick-Test und Wiederherstellung: ${outcome}`, async ({ page }) => {
    let posts = 0;
    let completed = false;
    await page.route("**/api/guest-image-test**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.has("candidate")) return route.fulfill({ contentType: "image/png", body: png });
      if (url.searchParams.has("session")) return route.fulfill({ json: { ok: true } });
      if (request.method() === "POST") {
        posts++;
        completed = true;
        return route.fulfill({ status: outcome === "unknown" ? 403 : 200, json: outcome === "unknown" ? { error: "Abbruch bei Raumanalyse (SCAN_EMPTY)." } : { ok: true, requestId: "offline-attempt" } });
      }
      return route.fulfill({ json: { prepared: true, attempts: completed ? [{ id: "offline-attempt", status: outcome, imageReady: outcome === "succeeded", progress_stage: "architecture" }] : [] } });
    });
    await page.goto("/");
    await page.getByLabel("Neues Zuhause").fill("Bildtest");
    await page.getByRole("button", { name: "Zuhause anlegen" }).click();
    await page.getByRole("button", { name: /Japandi/ }).click();
    await page.getByLabel("Dieses Foto zeigt einen leeren Raum ohne vorhandene Möbel.").check();
    await page.getByLabel("Raumbreite in cm").fill("400");
    await page.getByLabel("Raumtiefe in cm").fill("500");
    await page.locator('input[type="file"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: png });
    await page.getByLabel(/Ich willige ein/).check();
    await page.getByRole("button", { name: "Bild generieren" }).click();
    if (outcome === "succeeded") await expect(page.getByAltText("KI-Entwurf für das Wohnzimmer")).toBeVisible();
    else {
      await expect(page.getByText("Der Versuch wurde sicher angehalten")).toBeVisible();
      await expect(page.getByAltText("KI-Entwurf für das Wohnzimmer")).toHaveCount(0);
    }
    await page.reload();
    await page.locator(".project-grid article").filter({ hasText: "Bildtest" }).getByRole("button", { name: "Öffnen" }).click();
    if (outcome === "succeeded") await expect(page.getByAltText("KI-Entwurf für das Wohnzimmer")).toBeVisible();
    else await expect(page.getByText("Der Versuch wurde sicher angehalten")).toBeVisible();
    expect(posts).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
