import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { validateStructuralFidelity } from "../../src/lib/ai/image-generation/structural-fidelity.server";
import { transformRoom } from "./room-fidelity-transformations";

// Public test photos are deliberately excluded from Git. This test is a local
// calibration aid and never uploads photos, starts a provider, or writes data.
const root = path.resolve("private-evaluation/room-fidelity-calibration");
const files = ["R01.jpg", "R02.jpg", "R03.jpg", "R04.jpg", "R05.jpg", "R06.jpg"];

test("R06.jpg: kleine Wanddekoration auf freier Wandfläche bleibt erlaubt", async () => {
  const filePath = path.join(root, "R06.jpg");
  test.skip(!existsSync(filePath), "Lokales Kalibrierungsbild R06.jpg fehlt.");
  const source = new Uint8Array(await readFile(filePath));
  const report = await validateStructuralFidelity(source, await transformRoom(source, "wallArt"));
  expect(report.status, JSON.stringify(report)).toBe("passed");
});

test("R06.jpg: entfernte Testmöbel dürfen feste Raumkanten nicht verändern", async () => {
  const filePath = path.join(root, "R06.jpg");
  test.skip(!existsSync(filePath), "Lokales Kalibrierungsbild R06.jpg fehlt.");
  const emptyRoom = new Uint8Array(await readFile(filePath));
  const furnishedRoom = await transformRoom(emptyRoom, "furniture");
  const report = await validateStructuralFidelity(furnishedRoom, emptyRoom);
  expect(report.status, JSON.stringify(report)).toBe("passed");
});

for (const file of files) {
  test(`${file}: Lichtänderung besteht, Zuschnitt und Perspektive werden verworfen`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    const source = new Uint8Array(await readFile(filePath));
    const [light, crop, perspective] = await Promise.all([
      transformRoom(source, "light"), transformRoom(source, "crop"), transformRoom(source, "perspective"),
    ]);
    const [lightReport, cropReport, perspectiveReport] = await Promise.all([
      validateStructuralFidelity(source, light), validateStructuralFidelity(source, crop), validateStructuralFidelity(source, perspective),
    ]);
    expect(lightReport.status, JSON.stringify(lightReport)).toBe("passed");
    expect(cropReport.status, JSON.stringify(cropReport)).toBe("rejected");
    expect(perspectiveReport.status, JSON.stringify(perspectiveReport)).toBe("rejected");
  });

  test(`${file}: Möblierung besteht, zusätzliche Tür wird verworfen`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    const source = new Uint8Array(await readFile(filePath));
    const [furniture, door] = await Promise.all([transformRoom(source, "furniture"), transformRoom(source, "door")]);
    const [furnitureReport, doorReport] = await Promise.all([
      validateStructuralFidelity(source, furniture), validateStructuralFidelity(source, door),
    ]);
    expect(furnitureReport.status, JSON.stringify(furnitureReport)).toBe("passed");
    expect(doorReport.status, JSON.stringify(doorReport)).toBe("rejected");
  });

  test(`${file}: möbliertes Ausgangsfoto mit Licht und Wanddekor`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    test.fail(file !== "R04.jpg", "Die kombinierte Umgestaltung wird derzeit fälschlich verworfen.");
    const source = new Uint8Array(await readFile(filePath));
    const furnished = await transformRoom(source, "furniture");
    const redesigned = await transformRoom(await transformRoom(source, "light"), "wallArt");
    const report = await validateStructuralFidelity(furnished, redesigned);
    expect(report.status, JSON.stringify(report)).toBe("passed");
  });

  test(`${file}: ein neues kleines Fenster muss verworfen werden`, async () => {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `Lokales Kalibrierungsbild ${file} fehlt; es gehört absichtlich nicht in Git.`);
    test.fail(["R04.jpg", "R06.jpg"].includes(file), "Das neue Fenster wird derzeit fälschlich angenommen.");
    const source = new Uint8Array(await readFile(filePath));
    const report = await validateStructuralFidelity(source, await transformRoom(source, "window"));
    expect(report.status, JSON.stringify(report)).toBe("rejected");
  });
}
