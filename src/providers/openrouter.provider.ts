import { OpenRouter } from "@openrouter/sdk";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.openrouterApiKey
  ? new OpenRouter({ apiKey: env.openrouterApiKey })
  : null;

/**
 * OpenRouter aggregates 400+ models from multiple providers.
 * This list includes popular models for reference only.
 * Any valid OpenRouter model ID can be used in the request.
 * Full list: https://openrouter.ai/models
 */
const OPENROUTER_MODELS = [
  "openai/gpt-5.2",
  "openai/gpt-5-mini",
  "openai/gpt-4.1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "meta-llama/llama-4-maverick",
  "meta-llama/llama-4-scout",
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-r1",
  "qwen/qwen3-235b-a22b",
] as const;

export const openRouterProvider: AIProvider = {
  name: "OpenRouter",
  defaultModel: env.openrouterModel,
  availableModels: OPENROUTER_MODELS,

  async chat(messages: ChatMessage[], model?: string) {
    if (!client) {
      throw new Error("OpenRouter API key is not configured");
    }

    const stream = await client.chat.send({
      chatGenerationParams: {
        messages: messages as unknown as [],
        model: model ?? env.openrouterModel,
        stream: true,
      },
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    })();
  },
};
