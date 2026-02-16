import { randomUUID } from "node:crypto";
import type { Response } from "express";
import type { OpenAIChatCompletionChunk, OpenAIChatCompletion } from "../types";

/** Generate a unique chat-completion ID matching the OpenAI format. */
export function generateCompletionId(): string {
  return `chatcmpl-${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function createChunk(
  id: string,
  model: string,
  content?: string,
  role?: string,
  finishReason?: string | null,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {
          ...(role !== undefined && { role }),
          ...(content !== undefined && { content }),
        },
        finish_reason: finishReason ?? null,
      },
    ],
  };
}

/** Set the standard SSE response headers. */
export function setupSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

/**
 * Pipes an `AsyncIterable<string>` to an Express response as an
 * OpenAI-compatible SSE stream (`data: {…}\n\n` followed by `data: [DONE]`).
 */
export async function streamToSSE(
  res: Response,
  stream: AsyncIterable<string>,
  model: string,
  completionId: string,
): Promise<void> {
  setupSSEHeaders(res);

  // Initial chunk — announces the assistant role
  res.write(
    `data: ${JSON.stringify(createChunk(completionId, model, undefined, "assistant", null))}\n\n`,
  );

  for await (const text of stream) {
    if (res.writableEnded) break;
    res.write(
      `data: ${JSON.stringify(createChunk(completionId, model, text, undefined, null))}\n\n`,
    );
  }

  if (!res.writableEnded) {
    // Final chunk — signals completion
    res.write(
      `data: ${JSON.stringify(createChunk(completionId, model, undefined, undefined, "stop"))}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

/**
 * Collects all chunks from the stream and returns a complete
 * OpenAI `chat.completion` response object (non-streaming mode).
 */
export async function collectToCompletion(
  stream: AsyncIterable<string>,
  model: string,
  completionId: string,
): Promise<OpenAIChatCompletion> {
  const chunks: string[] = [];

  for await (const text of stream) {
    chunks.push(text);
  }

  const content = chunks.join("");

  return {
    id: completionId,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}
