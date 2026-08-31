import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProviderId,
} from "./contracts";

export class ImageGenerationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageGenerationBlockedError";
  }
}

type GatewayOptions = {
  enabled: boolean;
  allowedProvider: ImageProviderId | null;
  timeoutMs?: number;
};

/**
 * Server-side safety boundary for future image providers.
 *
 * Persistent authorization and reservation are enforced by the test runner.
 */
export function createImageGenerationGateway(
  providers: readonly ImageGenerationProvider[],
  options: GatewayOptions,
) {
  const timeoutMs = Math.min(options.timeoutMs ?? 120_000, 120_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new ImageGenerationBlockedError("Ungültiges Zeitlimit.");

  return {
    async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
      if (!options.enabled) {
        throw new ImageGenerationBlockedError("Die externe Bild-KI ist nicht freigeschaltet.");
      }

      if (!request.consent.granted || !request.consent.grantedAt || !request.consent.policyVersion) {
        throw new ImageGenerationBlockedError("Für diese Bildübertragung fehlt eine gültige KI-Einwilligung.");
      }

      if (!options.allowedProvider) {
        throw new ImageGenerationBlockedError("Es wurde noch kein Bild-KI-Anbieter freigegeben.");
      }

      const provider = providers.find(({ id }) => id === options.allowedProvider);
      if (!provider) {
        throw new ImageGenerationBlockedError("Der freigegebene Bild-KI-Anbieter ist nicht eingerichtet.");
      }

      if (!Number.isSafeInteger(request.maximumChargeCents) || request.maximumChargeCents <= 0 ||
        !Number.isSafeInteger(provider.maximumChargeCentsPerRequest) || provider.maximumChargeCentsPerRequest <= 0 ||
        request.maximumChargeCents < provider.maximumChargeCentsPerRequest) {
        throw new ImageGenerationBlockedError("Das Kostenlimit reicht für diesen Auftrag nicht aus.");
      }

      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ImageGenerationBlockedError("Das Zeitlimit wurde erreicht; der Ausgang bleibt ungeklärt."));
        }, timeoutMs);
      });

      try {
        return await Promise.race([provider.generate(request, controller.signal), deadline]);
      } finally {
        clearTimeout(timer!);
      }
    },
  };
}

