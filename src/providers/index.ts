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

export function selectNextProvider(): AIProvider | undefined {
  if (providers.length === 0) {
    return undefined;
  }

  const provider = providers[currentIndex];
  currentIndex = (currentIndex + 1) % providers.length;
  return provider;
}

export function getAvailableProviders(): AIProvider[] {
  return [...providers];
}
