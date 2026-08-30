import { expect, test } from "@playwright/test";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "../../src/lib/ai/image-generation/contracts";
import {
  createImageGenerationGateway,
  ImageGenerationBlockedError,
} from "../../src/lib/ai/image-generation/gateway";

const validRequest: ImageGenerationRequest = {
  input: {
    sourceImage: new Uint8Array([1, 2, 3]),
    sourceImageMimeType: "image/jpeg",
    roomType: "living-room",
    style: "Japandi",
    budgetEuro: 3_000,
  },
  consent: {
    granted: true,
    grantedAt: "2026-08-30T12:00:00.000Z",
    policyVersion: "test-v1",
  },
  maximumChargeCents: 10,
};

function createProvider(onCall: () => void): ImageGenerationProvider {
  return {
    id: "google-vertex",
    maximumChargeCentsPerRequest: 8,
    async generate() {
      onCall();
      return {
        provider: "google-vertex",
        providerRequestId: "test-request",
        image: new Uint8Array([4, 5, 6]),
        imageMimeType: "image/png",
        durationMs: 25,
        chargedCents: 8,
      };
    },
  };
}

test("blockiert die Bild-KI im sicheren ausgeschalteten Standard", async () => {
  let calls = 0;
  const gateway = createImageGenerationGateway([createProvider(() => calls += 1)], {
    enabled: false,
    allowedProvider: "google-vertex",
  });

  await expect(gateway.generate(validRequest)).rejects.toThrow(ImageGenerationBlockedError);
  expect(calls).toBe(0);
});

test("blockiert eine Anfrage ohne nachweisbare KI-Einwilligung", async () => {
  let calls = 0;
  const gateway = createImageGenerationGateway([createProvider(() => calls += 1)], {
    enabled: true,
    allowedProvider: "google-vertex",
  });
  const requestWithoutConsent = {
    ...validRequest,
    consent: { granted: false, grantedAt: "", policyVersion: "" },
  } as unknown as ImageGenerationRequest;

  await expect(gateway.generate(requestWithoutConsent)).rejects.toThrow("KI-Einwilligung");
  expect(calls).toBe(0);
});

test("blockiert einen Anbieter oberhalb des Auftragskostenlimits", async () => {
  let calls = 0;
  const gateway = createImageGenerationGateway([createProvider(() => calls += 1)], {
    enabled: true,
    allowedProvider: "google-vertex",
  });

  await expect(gateway.generate({ ...validRequest, maximumChargeCents: 7 })).rejects.toThrow("Kostenlimit");
  expect(calls).toBe(0);
});

test("ruft ausschließlich den vollständig freigegebenen Testanbieter auf", async () => {
  let calls = 0;
  const gateway = createImageGenerationGateway([createProvider(() => calls += 1)], {
    enabled: true,
    allowedProvider: "google-vertex",
  });

  const result = await gateway.generate(validRequest);

  expect(calls).toBe(1);
  expect(result.provider).toBe("google-vertex");
  expect(result.chargedCents).toBe(8);
});

