import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { validateStructuralFidelity } from "../../src/lib/ai/image-generation/structural-fidelity.server";
import { transformRoom } from "./room-fidelity-transformations";

// These two Pexels rooms are outside Git and were not used to tune the gate.
const root = path.resolve("private-evaluation/room-fidelity-calibration");
for (const file of ["R07.jpg", "R08.jpg"]) {
  async function room() {
    const filePath = path.join(root, file);
    test.skip(!existsSync(filePath), `${file} fehlt im lokalen Rückhaltebestand.`);
    return new Uint8Array(await readFile(filePath));
  }

  test(`${file}: Lichtänderung bleibt erlaubt`, async () => {
    const source = await room();
    const report = await validateStructuralFidelity(source, await transformRoom(source, "light"));
    expect(report.status, JSON.stringify(report)).toBe("passed");
  });

  test(`${file}: Möblierung bleibt erlaubt`, async () => {
    const source = await room();
    const report = await validateStructuralFidelity(source, await transformRoom(source, "furniture"));
    expect(report.status, JSON.stringify(report)).toBe("passed");
  });

  test(`${file}: möblierter Raum mit Licht und Wanddekor bleibt erlaubt`, async () => {
    test.fail(file === "R08.jpg", "Die kombinierte Umgestaltung wird auf diesem zurückgehaltenen Raum fälschlich verworfen.");
    const source = await room();
    const furnished = await transformRoom(source, "furniture");
    const redesigned = await transformRoom(await transformRoom(source, "light"), "wallArt");
    const report = await validateStructuralFidelity(furnished, redesigned);
    expect(report.status, JSON.stringify(report)).toBe("passed");
  });

  for (const type of ["crop", "perspective", "door", "window"] as const) {
    test(`${file}: ${type} wird verworfen`, async () => {
      test.fail(file === "R07.jpg" && type === "window", "Das neue Fenster wird auf diesem zurückgehaltenen Raum fälschlich angenommen.");
      const source = await room();
      const report = await validateStructuralFidelity(source, await transformRoom(source, type));
      expect(report.status, JSON.stringify(report)).toBe("rejected");
    });
  }
}
