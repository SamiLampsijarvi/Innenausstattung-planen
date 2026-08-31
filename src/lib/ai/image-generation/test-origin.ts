/** Use an explicit trusted origin: Next/proxies may rewrite request.url. */
export function isTrustedImageTestOrigin(origin: string | null, configured: string | undefined) {
  if (!origin || !configured || origin !== configured) return false;
  try {
    const url = new URL(configured);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === configured;
  } catch {
    return false;
  }
}
