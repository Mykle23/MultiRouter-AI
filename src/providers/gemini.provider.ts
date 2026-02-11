import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.geminiApiKey
  ? new GoogleGenerativeAI(env.geminiApiKey)
  : null;

const GEMINI_MODELS = [
  // Latest
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  // Stable
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  // Deprecated (shutdown March 2026)
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

export const geminiProvider: AIProvider = {
  name: "Gemini",
  defaultModel: env.geminiModel,
  availableModels: GEMINI_MODELS,

  async chat(messages: ChatMessage[], model?: string) {
    if (!client) {
      throw new Error("Gemini API key is not configured");
    }

    // Extract system instruction if present
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const generativeModel = client.getGenerativeModel({
      model: model ?? env.geminiModel,
      ...(systemMessage && { systemInstruction: systemMessage.content }),
    });

    // Build chat history (all messages except the last one)
    const history = chatMessages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    if (!lastMessage) {
      throw new Error("At least one user message is required");
    }

    const chat = generativeModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    return (async function* () {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    })();
  },
};
