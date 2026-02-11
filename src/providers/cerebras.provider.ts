import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

interface CompletionChunk {
  choices: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
}

const client = env.cerebrasApiKey
  ? new Cerebras({ apiKey: env.cerebrasApiKey })
  : null;

const CEREBRAS_MODELS = [
  // Production
  "llama3.1-8b",
  "llama-3.3-70b",
  "gpt-oss-120b",
  "qwen-3-32b",
  // Preview
  "qwen-3-235b-a22b-instruct-2507",
  "zai-glm-4.7",
] as const;

export const cerebrasProvider: AIProvider = {
  name: "Cerebras",
  defaultModel: env.cerebrasModel,
  availableModels: CEREBRAS_MODELS,

  async chat(messages: ChatMessage[], model?: string) {
    if (!client) {
      throw new Error("Cerebras API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages: messages as unknown as [],
      model: model ?? env.cerebrasModel,
      temperature: 0.6,
      max_completion_tokens: 16384,
      stream: true,
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = (chunk as unknown as CompletionChunk).choices[0]?.delta
          ?.content;
        if (content) {
          yield content;
        }
      }
    })();
  },
};
