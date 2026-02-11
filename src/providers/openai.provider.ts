import OpenAI from "openai";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey })
  : null;

const OPENAI_MODELS = [
  // Frontier
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  // Reasoning
  "o3",
  "o3-mini",
  "o4-mini",
] as const;

export const openaiProvider: AIProvider = {
  name: "OpenAI",
  defaultModel: env.openaiModel,
  availableModels: OPENAI_MODELS,

  async chat(messages: ChatMessage[], model?: string) {
    if (!client) {
      throw new Error("OpenAI API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages,
      model: model ?? env.openaiModel,
      temperature: 0.7,
      max_completion_tokens: 4096,
      stream: true,
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
