import Groq from "groq-sdk";
import type { ChatMessage, ChatOptions } from "../types";

export type GroqChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates a chat function backed by the native Groq SDK.
 */
export function createGroqAdapter(apiKey: string): GroqChatFn {
  const client = new Groq({ apiKey });

  return async function chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions,
  ): Promise<AsyncIterable<string>> {
    const stream = await client.chat.completions.create({
      messages,
      model,
      stream: true,
      ...(options?.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options?.maxCompletionTokens !== undefined && {
        max_completion_tokens: options.maxCompletionTokens,
      }),
      ...(options?.topP !== undefined && { top_p: options.topP }),
      ...(options?.stop !== undefined && { stop: options.stop }),
      ...(options?.frequencyPenalty !== undefined && {
        frequency_penalty: options.frequencyPenalty,
      }),
      ...(options?.presencePenalty !== undefined && {
        presence_penalty: options.presencePenalty,
      }),
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    })();
  };
}
