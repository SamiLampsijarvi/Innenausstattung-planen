export type RoomFidelityProfile = {
  doors: number;
  windows: number;
  openings: number;
  protectedArchitecture: boolean;
};

export function isRoomFidelityProfile(value: unknown): value is RoomFidelityProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return ["doors", "windows", "openings"].every((key) => Number.isSafeInteger(profile[key]) && Number(profile[key]) >= 0 && Number(profile[key]) <= 12)
    && profile.protectedArchitecture === true;
}

export function roomFidelityInstruction(profile: RoomFidelityProfile) {
  return [
    "Dies ist eine kontrollierte Raum-Bearbeitung, keine freie Neugestaltung.",
    `Im Ausgangsfoto sichtbar: ${profile.doors} Türen, ${profile.windows} Fenster und ${profile.openings} Durchgänge.`,
    "Erhalte jede sichtbare Tür, jedes Fenster, jeden Durchgang, alle Wände, den Boden und die Perspektive pixelgetreu.",
    "Füge keine Architektur hinzu, entferne oder verschiebe keine Architektur und verändere sie nicht.",
    "Verändere ausschließlich Möbel, Textilien, Dekoration und Farbwirkung innerhalb freigegebener Flächen.",
    "Wenn eine Fläche unklar ist, bewahre sie unverändert.",
  ].join(" ");
}
