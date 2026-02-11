import Groq from "groq-sdk";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.groqApiKey
  ? new Groq({ apiKey: env.groqApiKey })
  : null;

export const groqProvider: AIProvider = {
  name: "Groq",

  async chat(messages: ChatMessage[]) {
    if (!client) {
      throw new Error("Groq API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages,
      model: env.groqModel,
      temperature: 0.6,
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
