export interface ProviderErrorDetails {
  message: string;
  status: number;
}

const ERROR_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request — the provider rejected the request parameters",
  401: "Authentication failed — invalid API key for this provider",
  403: "Access denied — your API key lacks permission for this model",
  404: "Model not found — the requested model does not exist on this provider",
  429: "Rate limit exceeded — too many requests, try again later",
  500: "Provider internal error — the upstream service failed",
  503: "Provider unavailable — the upstream service is temporarily down",
};

/**
 * Extracts a clean, human-readable error from provider SDK exceptions.
 *
 * Most provider SDKs (OpenAI, Groq, Cerebras, Google, OpenRouter) attach
 * an HTTP `status` property to their error objects. We map that status to
 * a friendly message so the API consumer gets useful feedback without
 * leaking raw SDK internals.
 *
 * The full error is still available for server-side logging.
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
