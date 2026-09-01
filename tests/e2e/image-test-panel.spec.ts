import { expect, test } from "@playwright/test";

// Only synthetic sessions and intercepted responses. Run with CI's example.supabase.co config.
test("Testoberfläche trennt Einwilligung, Fotozulassung und kostenpflichtigen Start", async ({ page, context }) => {
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const userId = "11111111-1111-4111-8111-111111111111";
  const token = `${encoded({ alg: "HS256", typ: "JWT" })}.${encoded({ sub: userId, exp: 4102444800 })}.offline-test-signature`;
  await context.addCookies([{ name: "sb-example-auth-token", value: `base64-${encoded({ access_token: token,
    refresh_token: "offline-fixture", token_type: "bearer", expires_at: 4102444800, expires_in: 3600,
    user: { id: userId, aud: "authenticated", role: "authenticated", email: "offline@example.test" } })}`,
    domain: "localhost", path: "/" }]);
  await page.route("https://**/auth/v1/**", (route) => route.fulfill({ json: { id: userId } }));
  const state = {
    consent: false, externalEnabled: false,
    campaign: { enabled: false, reserved_cents: 0, photo_count: 0, actual_cents: null, active_attempt: null },
    availablePhotos: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", original_name: "neutrales-testfoto.png" }],
    photos: [] as { id: string; photo_id: string; attempts: number; style: string; budget_euro: number; room_fidelity_profile: null | { doors: number; windows: number; openings: number; protectedArchitecture: true } }[], attempts: [],
  };
  const actions: string[] = [];
  await page.route("**/api/internal/image-test", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON(); actions.push(body.action);
      if (body.action === "grant") state.consent = true;
      if (body.action === "withdraw") state.consent = false;
      if (body.action === "approve") {
        state.photos = [{ id: "cccccccc-cccc-4ccc-8ccc-000000000001", photo_id: body.photoId, attempts: 0, style: "Japandi", budget_euro: 1500, room_fidelity_profile: null }];
        state.campaign.photo_count = 1;
      }
      if (body.action === "setRoomFidelity") state.photos[0].room_fidelity_profile = body.profile;
      await route.fulfill({ json: { ok: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto("/internal/image-test");
  await page.getByRole("button", { name: "Teststand laden" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: "KI-Einwilligung speichern" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "KI-Einwilligung speichern" }).click();
  await page.getByLabel("Eigenes gespeichertes Foto").selectOption(state.availablePhotos[0].id);
  await page.getByRole("button", { name: "Dieses Foto für den KI-Test freigeben" }).click();
  await page.getByLabel("Sichtbare Türen").fill("1");
  await page.getByLabel("Sichtbare Fenster").fill("2");
  await page.getByLabel("Sichtbare Durchgänge").fill("0");
  await page.getByLabel(/Ich bestätige: Türen/).check();
  await page.getByRole("button", { name: "Raumtreue-Profil speichern" }).click();
  await expect(page.getByText(/Raumtreue-Profil geschützt/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Einen kostenpflichtigen Versuch starten" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/image-test-panel-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "KI-Einwilligung widerrufen und Ergebnisse löschen" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(actions).toEqual(["grant", "approve", "setRoomFidelity", "withdraw"]);
});
