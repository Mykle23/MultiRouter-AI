import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatMessage } from "../types";
import { env } from "../config/env";

const client = env.geminiApiKey
  ? new GoogleGenerativeAI(env.geminiApiKey)
  : null;

export const geminiProvider: AIProvider = {
  name: "Gemini",

  async chat(messages: ChatMessage[]) {
    if (!client) {
      throw new Error("Gemini API key is not configured");
    }

    // Extract system instruction if present
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const model = client.getGenerativeModel({
      model: env.geminiModel,
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

    const chat = model.startChat({ history });
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
