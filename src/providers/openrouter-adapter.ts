import { OpenRouter } from "@openrouter/sdk";
import type { ChatMessage, ChatOptions } from "../types";

export type OpenRouterChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates a chat function backed by the native OpenRouter SDK.
 */
export function createOpenRouterAdapter(apiKey: string): OpenRouterChatFn {
  const client = new OpenRouter({ apiKey });

  return async function chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions,
  ): Promise<AsyncIterable<string>> {
    const stream = await client.chat.send({
      chatGenerationParams: {
        messages: messages as unknown as [],
        model,
        stream: true,
        ...(options?.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options?.maxCompletionTokens !== undefined && {
          max_tokens: options.maxCompletionTokens,
        }),
        ...(options?.topP !== undefined && { top_p: options.topP }),
        ...(options?.stop !== undefined && { stop: options.stop }),
        ...(options?.frequencyPenalty !== undefined && {
          frequency_penalty: options.frequencyPenalty,
        }),
        ...(options?.presencePenalty !== undefined && {
          presence_penalty: options.presencePenalty,
        }),
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
  };
}
