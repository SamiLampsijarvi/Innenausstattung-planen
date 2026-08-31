export const IMAGE_TEST_LIMITS = {
  maximumPhotos: 5,
  maximumAttemptsPerPhoto: 2,
  maximumTotalCents: 300,
} as const;

export class ImageTestLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageTestLimitError";
  }
}

export type ImageTestUsage = {
  distinctPhotoCount: number;
  attemptsForPhoto: number;
  reservedTotalCents: number;
};

/**
 * Pure guard for the future persisted test ledger. It deliberately does not
 * store counters in process memory because server processes can restart.
 */
export function assertImageTestWithinLimits(
  usage: ImageTestUsage,
  nextRequestMaximumCents: number,
) {
  if (![usage.distinctPhotoCount, usage.attemptsForPhoto, usage.reservedTotalCents].every(
    (value) => Number.isSafeInteger(value) && value >= 0,
  ) || !Number.isSafeInteger(nextRequestMaximumCents) || nextRequestMaximumCents <= 0) {
    throw new ImageTestLimitError("Ungültige Testbuchhaltung oder Kostenreservierung.");
  }
  if (usage.distinctPhotoCount > IMAGE_TEST_LIMITS.maximumPhotos) {
    throw new ImageTestLimitError("Der Test ist auf fünf freigegebene Fotos begrenzt.");
  }

  if (usage.attemptsForPhoto >= IMAGE_TEST_LIMITS.maximumAttemptsPerPhoto) {
    throw new ImageTestLimitError("Für dieses Foto wurden bereits zwei Versuche verwendet.");
  }

  if (usage.reservedTotalCents + nextRequestMaximumCents > IMAGE_TEST_LIMITS.maximumTotalCents) {
    throw new ImageTestLimitError("Das interne Testbudget von drei Euro ist erreicht.");
  }
}

