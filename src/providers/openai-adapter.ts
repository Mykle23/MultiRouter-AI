import OpenAI from "openai";
import type { ChatMessage, ChatOptions } from "../types";

export type OpenAIChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates a chat function backed by the native OpenAI SDK.
 *
 * Used for:
 *  - `openai` type (official OpenAI API)
 *  - `openai-compatible` type (Ollama, LM Studio, vLLM, or any custom endpoint)
 */
export function createOpenAIAdapter(
  apiKey: string,
  customBaseUrl?: string,
): OpenAIChatFn {
  const client = new OpenAI({
    apiKey,
    ...(customBaseUrl && { baseURL: customBaseUrl }),
  });

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
