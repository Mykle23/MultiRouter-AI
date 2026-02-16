import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { ChatMessage, ChatOptions } from "../types";

interface CompletionChunk {
  choices: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
}

export type CerebrasChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates a chat function backed by the native Cerebras SDK.
 */
export function createCerebrasAdapter(apiKey: string): CerebrasChatFn {
  const client = new Cerebras({ apiKey });

  return async function chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions,
  ): Promise<AsyncIterable<string>> {
    const stream = await client.chat.completions.create({
      messages: messages as unknown as [],
      model,
      stream: true,
      ...(options?.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options?.maxCompletionTokens !== undefined && {
        max_completion_tokens: options.maxCompletionTokens,
      }),
      ...(options?.topP !== undefined && { top_p: options.topP }),
      ...(options?.stop !== undefined && {
        stop: options.stop as string,
      }),
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = (chunk as unknown as CompletionChunk).choices[0]?.delta
          ?.content;
        if (content) {
          yield content;
        }
      }
    })();
  };
}
