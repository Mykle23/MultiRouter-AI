import OpenAI from "openai";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey })
  : null;

export const openaiProvider: AIProvider = {
  name: "OpenAI",

  async chat(messages: ChatMessage[]) {
    if (!client) {
      throw new Error("OpenAI API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages,
      model: env.openaiModel,
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
