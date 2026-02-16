import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, ChatOptions } from "../types";

export type GeminiChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates a chat function backed by the Google Generative AI SDK.
 *
 * Handles the role mapping (assistant → model) and system-instruction
 * extraction that the Gemini API requires.
 */
export function createGeminiAdapter(apiKey: string): GeminiChatFn {
  const client = new GoogleGenerativeAI(apiKey);

  return async function chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions,
  ): Promise<AsyncIterable<string>> {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const generativeModel = client.getGenerativeModel({
      model,
      ...(systemMessage && { systemInstruction: systemMessage.content }),
      generationConfig: {
        ...(options?.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options?.maxCompletionTokens !== undefined && {
          maxOutputTokens: options.maxCompletionTokens,
        }),
        ...(options?.topP !== undefined && { topP: options.topP }),
        ...(options?.stop !== undefined && {
          stopSequences: Array.isArray(options.stop)
            ? options.stop
            : [options.stop],
        }),
      },
    });

    const history = chatMessages.slice(0, -1).map((msg) => ({
      role:
        msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) {
      throw new Error("At least one user message is required");
    }

    const chatSession = generativeModel.startChat({ history });
    const result = await chatSession.sendMessageStream(lastMessage.content);

    return (async function* () {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    })();
  };
}
