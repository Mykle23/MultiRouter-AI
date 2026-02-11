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

export const cerebrasProvider: AIProvider = {
  name: "Cerebras",

  async chat(messages: ChatMessage[]) {
    if (!client) {
      throw new Error("Cerebras API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages: messages as unknown as [],
      model: env.cerebrasModel,
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
