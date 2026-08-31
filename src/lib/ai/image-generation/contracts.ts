export const IMAGE_PROVIDER_IDS = ["google-vertex", "openai"] as const;

export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];

export type ImageGenerationInput = {
  sourceImage: Uint8Array;
  sourceImageMimeType: "image/jpeg" | "image/png" | "image/webp";
  roomType: "living-room";
  style: string;
  budgetEuro: number;
};

export type ImageGenerationConsent = {
  granted: true;
  grantedAt: string;
  policyVersion: string;
};

export type ImageGenerationRequest = {
  input: ImageGenerationInput;
  consent: ImageGenerationConsent;
  maximumChargeCents: number;
};

export type ImageGenerationResult = {
  provider: ImageProviderId;
  providerRequestId: string;
  image: Uint8Array;
  imageMimeType: "image/jpeg" | "image/png" | "image/webp";
  durationMs: number;
  reservedCents: number;
  actualChargedCents: number | null;
  usage?: { promptTokens?: number; responseTokens?: number; totalTokens?: number };
};

export interface ImageGenerationProvider {
  readonly id: ImageProviderId;
  readonly maximumChargeCentsPerRequest: number;
  generate(request: ImageGenerationRequest, signal: AbortSignal): Promise<ImageGenerationResult>;
}

