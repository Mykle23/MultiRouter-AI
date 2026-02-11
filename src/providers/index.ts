import type { AIProvider } from "../types";
import { env } from "../config/env";
import { groqProvider } from "./groq.provider";
import { cerebrasProvider } from "./cerebras.provider";
import { openaiProvider } from "./openai.provider";
import { openRouterProvider } from "./openrouter.provider";
import { geminiProvider } from "./gemini.provider";
import { logger } from "../logger";

const providers: AIProvider[] = [];

if (env.groqApiKey) {
  providers.push(groqProvider);
}

if (env.cerebrasApiKey) {
  providers.push(cerebrasProvider);
}

if (env.openaiApiKey) {
  providers.push(openaiProvider);
}

if (env.openrouterApiKey) {
  providers.push(openRouterProvider);
}

if (env.geminiApiKey) {
  providers.push(geminiProvider);
}

if (providers.length === 0) {
  logger.warn(
    "No AI providers configured. Set at least one API key in your .env file."
  );
}

let currentIndex = 0;

interface ProviderSelection {
  provider: AIProvider;
  model: string;
}

/**
 * Selects a provider based on the request parameters.
 *
 * - If `providerName` is specified → use that exact provider (with custom model or its default).
 * - If nothing is specified → round-robin across available providers with their default models.
 *
 * The available models list in each provider is informational only (exposed via /health).
 * No validation or routing is performed based on it.
 */
export function selectProvider(
  providerName?: string,
  model?: string
): ProviderSelection | undefined {
  if (providers.length === 0) {
    return undefined;
  }

  // Explicit provider requested → use exactly that one
  if (providerName) {
    const provider = providers.find(
      (p) => p.name.toLowerCase() === providerName.toLowerCase()
    );

    if (!provider) {
      return undefined;
    }

    return {
      provider,
      model: model ?? provider.defaultModel,
    };
  }

  // No provider specified → round-robin
  const provider = providers[currentIndex];
  currentIndex = (currentIndex + 1) % providers.length;

  if (!provider) {
    return undefined;
  }

  return {
    provider,
    model: provider.defaultModel,
  };
}

export function getAvailableProviders(): AIProvider[] {
  return [...providers];
}
