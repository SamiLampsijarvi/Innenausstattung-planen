// Never persist provider error messages: they can contain request bodies or credentials.
export function safeTestErrorCode(error: unknown): string {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  if (["SCAN_EMPTY", "SCAN_TRUNCATED", "SCAN_INVALID"].includes(String(value.code))) return String(value.code);
  const status = value.status ?? value.code;
  if (status === 401 || status === 403) return "GOOGLE_AUTH";
  if (status === 429) return "GOOGLE_QUOTA";
  if (value.name === "AbortError" || value.name === "TimeoutError") return "TIMEOUT";
  if (value.name === "VertexImageResponseError") return "IMAGE_MISSING";
  return "UNCLASSIFIED";
}
