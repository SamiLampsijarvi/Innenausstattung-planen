import { expect, test } from "@playwright/test";
import { isRoomFidelityProfile, roomFidelityInstruction } from "../../src/lib/ai/image-generation/room-fidelity";

test("Raumtreue verlangt ein begrenztes und ausdrücklich geschütztes Profil", () => {
  expect(isRoomFidelityProfile({ doors: 1, windows: 3, openings: 0, protectedArchitecture: true })).toBe(true);
  expect(isRoomFidelityProfile({ doors: -1, windows: 3, openings: 0, protectedArchitecture: true })).toBe(false);
  expect(isRoomFidelityProfile({ doors: 1, windows: 3, openings: 0, protectedArchitecture: false })).toBe(false);
});

test("der Raumtreue-Auftrag verbietet erfundene Architektur", () => {
  const instruction = roomFidelityInstruction({ doors: 1, windows: 3, openings: 0, protectedArchitecture: true });
  expect(instruction).toContain("1 Türen, 3 Fenster");
  expect(instruction).toContain("Füge keine Architektur hinzu");
});
