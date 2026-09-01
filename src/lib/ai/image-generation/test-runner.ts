import { createHash } from "node:crypto";
import type { ImageGenerationProvider, ImageGenerationResult } from "./contracts";
import { createImageGenerationGateway } from "./gateway";
import { MAXIMUM_VERTEX_SOURCE_BYTES } from "./test-limits";
import type { RoomFidelityProfile } from "./room-fidelity";

export type Reservation = { reservedCents: number; style: string; budgetEuro: number; grantedAt: string; policyVersion: string; roomFidelityProfile: RoomFidelityProfile };
export type TestLedger = {
  reserve(hash: string): Promise<Reservation>;
  canDispatch(): Promise<boolean>;
  finish(result: ImageGenerationResult | null): Promise<string>;
};

export function hashTestPhoto(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function runImageTest(options: {
  enabled: boolean;
  bytes: Uint8Array;
  mime: "image/jpeg" | "image/png" | "image/webp";
  ledger: TestLedger;
  provider(reservedCents: number): ImageGenerationProvider;
  timeoutMs?: number;
}) {
  if (!options.enabled) throw new Error("Externe Bild-KI ist ausgeschaltet.");
  if (!options.bytes.length || options.bytes.length > MAXIMUM_VERTEX_SOURCE_BYTES) throw new Error("Das Testfoto muss zwischen 1 Byte und 7 MB groß sein.");
  // Never retry a failed/ambiguous reservation: its database commit may have succeeded.
  const reservation = await options.ledger.reserve(hashTestPhoto(options.bytes));
  try {
    const provider = options.provider(reservation.reservedCents);
    if (!await options.ledger.canDispatch()) throw new Error("Freigabe wurde zurückgezogen.");
    const gateway = createImageGenerationGateway([provider], {
      enabled: true, allowedProvider: "google-vertex", timeoutMs: options.timeoutMs,
    });
    const result = await gateway.generate({
      input: { sourceImage: options.bytes, sourceImageMimeType: options.mime, roomType: "living-room",
        style: reservation.style, budgetEuro: reservation.budgetEuro, roomFidelity: reservation.roomFidelityProfile },
      consent: { granted: true, grantedAt: reservation.grantedAt, policyVersion: reservation.policyVersion },
      maximumChargeCents: reservation.reservedCents,
    });
    if (!result.image.length || result.image.length > 10 * 1024 * 1024) throw new Error("Ungültige Ergebnisgröße.");
    return await options.ledger.finish(result);
  } catch {
    // Retain accounting even when Google or the database is unreachable.
    try { await options.ledger.finish(null); } catch { /* A reserved row remains unresolved. */ }
    throw new Error("Versuch ungeklärt. Reservierung bleibt bestehen; keine automatische Wiederholung.");
  }
}
