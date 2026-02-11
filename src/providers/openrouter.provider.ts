import { OpenRouter } from "@openrouter/sdk";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.openrouterApiKey
  ? new OpenRouter({ apiKey: env.openrouterApiKey })
  : null;

export const openRouterProvider: AIProvider = {
  name: "OpenRouter",

  async chat(messages: ChatMessage[]) {
    if (!client) {
      throw new Error("OpenRouter API key is not configured");
    }

    const stream = await client.chat.send({
      chatGenerationParams: {
        messages: messages as unknown as [],
        model: env.openrouterModel,
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
