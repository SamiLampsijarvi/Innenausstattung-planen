import { GoogleAuth } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

export class GoogleAuthPreflightError extends Error {
  constructor() {
    super("Die lokale Google-Anmeldung für Vertex ist nicht verfügbar.");
    this.name = "GoogleAuthPreflightError";
  }
}

export async function assertGoogleAuthReady(
  projectId: string,
  tokenProvider?: () => Promise<string | null | undefined>,
) {
  if (!projectId.trim()) throw new GoogleAuthPreflightError();
  const readToken = tokenProvider ?? (async () => {
    const auth = new GoogleAuth({ projectId, scopes: [CLOUD_PLATFORM_SCOPE] });
    const client = await auth.getClient();
    return (await client.getAccessToken()).token;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await Promise.race([
      readToken(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new GoogleAuthPreflightError()), 15_000);
        timer.unref?.();
      }),
    ]);
    if (typeof token !== "string" || token.length < 20) throw new GoogleAuthPreflightError();
  } catch {
    throw new GoogleAuthPreflightError();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
