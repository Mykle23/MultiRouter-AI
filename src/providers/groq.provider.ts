import Groq from "groq-sdk";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.groqApiKey
  ? new Groq({ apiKey: env.groqApiKey })
  : null;

const GROQ_MODELS = [
  // Production
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  // Preview
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "moonshotai/kimi-k2-instruct-0905",
] as const;

export const groqProvider: AIProvider = {
  name: "Groq",
  defaultModel: env.groqModel,
  availableModels: GROQ_MODELS,

  async chat(messages: ChatMessage[], model?: string) {
    if (!client) {
      throw new Error("Groq API key is not configured");
    }

    const stream = await client.chat.completions.create({
      messages,
      model: model ?? env.groqModel,
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
