export interface ProviderErrorDetails {
  message: string;
  status: number;
}

const ERROR_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request — the provider rejected the request parameters",
  401: "Authentication failed — invalid API key for this provider",
  402: "Payment required — provider quota or credits exhausted",
  403: "Access denied — your API key lacks permission for this model",
  404: "Model not found — the requested model does not exist on this provider",
  429: "Rate limit exceeded — too many requests, try again later",
  500: "Provider internal error — the upstream service failed",
  503: "Provider unavailable — the upstream service is temporarily down",
};

/** HTTP status codes that indicate a transient failure worth retrying. */
const RETRYABLE_STATUS_CODES = new Set([429, 402, 503]);

/**
 * Extracts a clean, human-readable error from provider SDK exceptions.
 *
 * Most provider SDKs attach an HTTP `status` property to their error
 * objects. We map that to a friendly message so the API consumer gets
 * useful feedback without leaking raw SDK internals.
 */
export function extractProviderError(error: unknown): ProviderErrorDetails {
  if (!(error instanceof Error)) {
    return { message: String(error), status: 502 };
  }

  const statusCode =
    "status" in error && typeof error.status === "number"
      ? error.status
      : 502;

  const friendlyMessage =
    ERROR_STATUS_MESSAGES[statusCode] ?? `Provider error (${statusCode})`;

  return { message: friendlyMessage, status: statusCode };
}

/**
 * Returns `true` when the error represents a transient provider failure
 * (rate-limit, quota exhaustion, temporary unavailability) that should
 * trigger a failover to the next provider instance.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const statusCode =
    "status" in error && typeof error.status === "number"
      ? error.status
      : null;

  return statusCode !== null && RETRYABLE_STATUS_CODES.has(statusCode);
}
