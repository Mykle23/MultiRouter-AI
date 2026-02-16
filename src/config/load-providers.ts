import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { logger } from "../logger";
import type {
  ProvidersConfig,
  ProviderInstanceConfig,
  ProviderType,
  RoutingStrategy,
} from "../types";

const VALID_TYPES = new Set([
  "openai",
  "groq",
  "cerebras",
  "openrouter",
  "gemini",
  "openai-compatible",
]);

const VALID_STRATEGIES = new Set(["exhaust", "round-robin"]);

/**
 * Resolves `${ENV_VAR}` references in a string to their env-var values.
 * Returns the literal string if no `${…}` patterns are found.
 */
function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
    const envValue = process.env[varName.trim()];
    if (envValue === undefined) {
      logger.warn(
        { variable: varName.trim() },
        "Environment variable referenced in providers.yaml not found",
      );
      return "";
    }
    return envValue;
  });
}

function validateProviderEntry(
  raw: unknown,
  index: number,
): ProviderInstanceConfig | null {
  if (typeof raw !== "object" || raw === null) {
    logger.warn({ index }, "Invalid provider entry in providers.yaml, skipping");
    return null;
  }

  const entry = raw as Record<string, unknown>;

  const id =
    typeof entry.id === "string" ? entry.id : `provider-${index}`;
  const type = typeof entry.type === "string" ? entry.type : "";
  const apiKeyRaw =
    typeof entry.api_key === "string" ? entry.api_key : "";
  const baseUrl =
    typeof entry.base_url === "string"
      ? interpolateEnvVars(entry.base_url)
      : undefined;
  const models = Array.isArray(entry.models)
    ? entry.models.filter((m): m is string => typeof m === "string")
    : [];

  if (!VALID_TYPES.has(type)) {
    logger.warn({ id, type }, "Unknown provider type, skipping");
    return null;
  }

  const apiKey = interpolateEnvVars(apiKeyRaw);
  if (!apiKey) {
    logger.debug({ id }, "No API key resolved, skipping provider");
    return null;
  }

  if (models.length === 0) {
    logger.warn({ id }, "No models configured, skipping provider");
    return null;
  }

  if (type === "openai-compatible" && !baseUrl) {
    logger.warn(
      { id },
      "openai-compatible type requires base_url, skipping",
    );
    return null;
  }

  return {
    id,
    type: type as ProviderType,
    apiKey,
    baseUrl,
    models,
  };
}

export function loadProvidersConfig(): ProvidersConfig {
  const configPath = resolve(process.cwd(), "providers.yaml");

  if (!existsSync(configPath)) {
    logger.warn(
      "providers.yaml not found — create one from providers.yaml.example",
    );
    return {
      routing: { defaultStrategy: "exhaust", retryAfterSeconds: 300 },
      providers: [],
    };
  }

  const raw = parse(readFileSync(configPath, "utf-8")) as Record<
    string,
    unknown
  >;

  // ── Routing config ───────────────────────────────
  const routingRaw =
    typeof raw.routing === "object" && raw.routing !== null
      ? (raw.routing as Record<string, unknown>)
      : {};

  const defaultStrategy =
    typeof routingRaw.default_strategy === "string" &&
    VALID_STRATEGIES.has(routingRaw.default_strategy)
      ? (routingRaw.default_strategy as RoutingStrategy)
      : "exhaust";

  const retryAfterSeconds =
    typeof routingRaw.retry_after_seconds === "number"
      ? routingRaw.retry_after_seconds
      : 300;

  // ── Provider instances ───────────────────────────
  const providersRaw = Array.isArray(raw.providers) ? raw.providers : [];
  const providers: ProviderInstanceConfig[] = [];

  for (let i = 0; i < providersRaw.length; i++) {
    const config = validateProviderEntry(providersRaw[i], i);
    if (config) {
      providers.push(config);
    }
  }

  logger.info(
    { providers: providers.length, strategy: defaultStrategy },
    "Loaded providers.yaml",
  );

  return {
    routing: { defaultStrategy, retryAfterSeconds },
    providers,
  };
}
