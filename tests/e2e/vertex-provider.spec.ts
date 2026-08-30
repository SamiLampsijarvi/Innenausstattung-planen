import { expect, test } from "@playwright/test";
import type { ImageGenerationRequest } from "../../src/lib/ai/image-generation/contracts";
import {
  assertImageTestWithinLimits,
  IMAGE_TEST_LIMITS,
} from "../../src/lib/ai/image-generation/test-limits";
import {
  createVertexImageProvider,
  VertexImageResponseError,
} from "../../src/lib/ai/image-generation/vertex-provider.server";

const request: ImageGenerationRequest = {
  input: {
    sourceImage: new Uint8Array([1, 2, 3]),
    sourceImageMimeType: "image/jpeg",
    roomType: "living-room",
    style: "Japandi",
    budgetEuro: 3_000,
  },
  consent: { granted: true, grantedAt: "2026-08-30T12:00:00.000Z", policyVersion: "test-v1" },
  maximumChargeCents: 10,
};

test("verlangt eine Google-Cloud-Projektkennung, ohne eine Verbindung aufzubauen", () => {
  expect(() => createVertexImageProvider({ projectId: "" })).toThrow(VertexImageResponseError);
});

test("wandelt eine kontrollierte Vertex-Testantwort in das gemeinsame Format um", async () => {
  let receivedModel = "";
  const client = {
    models: {
      async generateContent(parameters: { model: string }) {
        receivedModel = parameters.model;
        return {
          responseId: "vertex-test-response",
          candidates: [{ content: { parts: [{ inlineData: { data: "BAUG", mimeType: "image/png" } }] } }],
        };
      },
    },
  };
  const provider = createVertexImageProvider({ projectId: "raumly-test" }, client as never);

  const result = await provider.generate(request, new AbortController().signal);

  expect(receivedModel).toBe("gemini-3.1-flash-image");
  expect(result.provider).toBe("google-vertex");
  expect(result.providerRequestId).toBe("vertex-test-response");
  expect(result.imageMimeType).toBe("image/png");
  expect(result.image).toEqual(new Uint8Array([4, 5, 6]));
  expect(result.chargedCents).toBe(10);
});

test("erzwingt fünf Fotos, zwei Versuche und fünf Euro Gesamtbudget", () => {
  expect(IMAGE_TEST_LIMITS).toEqual({ maximumPhotos: 5, maximumAttemptsPerPhoto: 2, maximumTotalCents: 500 });
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 1, reservedTotalCents: 490 }, 10)).not.toThrow();
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 6, attemptsForPhoto: 0, reservedTotalCents: 0 }, 10)).toThrow("fünf freigegebene Fotos");
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 2, reservedTotalCents: 0 }, 10)).toThrow("zwei Versuche");
  expect(() => assertImageTestWithinLimits({ distinctPhotoCount: 5, attemptsForPhoto: 0, reservedTotalCents: 495 }, 10)).toThrow("fünf Euro");
});

