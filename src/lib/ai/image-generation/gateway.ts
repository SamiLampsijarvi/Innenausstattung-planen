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
 * The gateway intentionally ships without a provider implementation. Adding an
 * API key or provider adapter alone can therefore never activate photo transfer.
 */
export function createImageGenerationGateway(
  providers: readonly ImageGenerationProvider[],
  options: GatewayOptions,
) {
  const timeoutMs = options.timeoutMs ?? 120_000;

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

      if (request.maximumChargeCents < provider.maximumChargeCentsPerRequest) {
        throw new ImageGenerationBlockedError("Das Kostenlimit reicht für diesen Auftrag nicht aus.");
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await provider.generate(request, controller.signal);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

