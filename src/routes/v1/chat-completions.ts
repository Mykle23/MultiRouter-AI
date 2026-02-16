import type { Request, Response } from "express";
import type { OpenAIChatRequest, ChatMessage, ChatOptions } from "../../types";
import { getRegistry } from "../../providers/registry";
import { logger } from "../../logger";
import {
  extractProviderError,
  isRetryableError,
} from "../../utils/provider-error";
import {
  generateCompletionId,
  streamToSSE,
  collectToCompletion,
} from "../../utils/sse";

/**
 * `POST /v1/chat/completions`
 *
 * OpenAI-compatible chat completions endpoint.
 *
 * Routing behaviour:
 *  - `model: "multirouter-auto"` → round-robin across every active instance.
 *  - Any real model name → **exhaust** strategy: try each instance that
 *    advertises the model in priority order, failing over on transient errors.
 */
export async function chatCompletionsRoute(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as Partial<OpenAIChatRequest>;
  const registry = getRegistry();

  // ── Validation ─────────────────────────────────
  if (
    !body.messages ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    res.status(400).json({
      error: {
        message: "messages is required and must be a non-empty array",
        type: "invalid_request_error",
        param: "messages",
        code: null,
      },
    });
    return;
  }

  if (!body.model || typeof body.model !== "string") {
    res.status(400).json({
      error: {
        message: "model is required",
        type: "invalid_request_error",
        param: "model",
        code: null,
      },
    });
    return;
  }

  const isStreaming = body.stream === true;
  const completionId = generateCompletionId();
  const messages = body.messages as ChatMessage[];
  const requestedModel = body.model;

  const options: ChatOptions = {
    ...(body.temperature !== undefined && {
      temperature: body.temperature,
    }),
    ...(body.max_completion_tokens !== undefined && {
      maxCompletionTokens: body.max_completion_tokens,
    }),
    ...(body.max_tokens !== undefined &&
      body.max_completion_tokens === undefined && {
        maxCompletionTokens: body.max_tokens,
      }),
    ...(body.top_p !== undefined && { topP: body.top_p }),
    ...(body.stop !== undefined && { stop: body.stop }),
    ...(body.frequency_penalty !== undefined && {
      frequencyPenalty: body.frequency_penalty,
    }),
    ...(body.presence_penalty !== undefined && {
      presencePenalty: body.presence_penalty,
    }),
  };

  const startTime = Date.now();

  // ── Round-robin (multirouter-auto) ──────────────
  if (requestedModel === "multirouter-auto") {
    const selection = registry.getNextRoundRobin();
    if (!selection) {
      res.status(503).json({
        error: {
          message: "No providers available",
          type: "server_error",
          code: null,
        },
      });
      return;
    }

    try {
      logger.info(
        {
          instance: selection.instance.config.id,
          model: selection.model,
          mode: "round-robin",
        },
        "Routing request",
      );

      const stream = await selection.instance.chat(
        messages,
        selection.model,
        options,
      );

      if (isStreaming) {
        await streamToSSE(res, stream, selection.model, completionId);
      } else {
        const completion = await collectToCompletion(
          stream,
          selection.model,
          completionId,
        );
        res.json(completion);
      }

      logger.info(
        {
          instance: selection.instance.config.id,
          durationMs: Date.now() - startTime,
        },
        "Request completed",
      );
    } catch (error) {
      respondWithProviderError(
        res,
        error,
        selection.instance.config.id,
        selection.model,
      );
    }
    return;
  }

  // ── Exhaust strategy ───────────────────────────
  const instances = registry.getActiveForModel(requestedModel);

  if (instances.length === 0) {
    if (registry.hasModel(requestedModel)) {
      res.status(429).json({
        error: {
          message: `All providers for model "${requestedModel}" are currently rate-limited. Try again later.`,
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      });
    } else {
      res.status(404).json({
        error: {
          message: `Model "${requestedModel}" not found. Use GET /v1/models to see available models.`,
          type: "invalid_request_error",
          param: "model",
          code: "model_not_found",
        },
      });
    }
    return;
  }

  for (const instance of instances) {
    try {
      logger.info(
        {
          instance: instance.config.id,
          model: requestedModel,
          mode: "exhaust",
        },
        "Routing request",
      );

      const stream = await instance.chat(messages, requestedModel, options);

      if (isStreaming) {
        await streamToSSE(res, stream, requestedModel, completionId);
      } else {
        const completion = await collectToCompletion(
          stream,
          requestedModel,
          completionId,
        );
        res.json(completion);
      }

      logger.info(
        {
          instance: instance.config.id,
          durationMs: Date.now() - startTime,
        },
        "Request completed",
      );
      return;
    } catch (error) {
      if (isRetryableError(error) && !res.headersSent) {
        registry.markFailed(instance.config.id);
        logger.warn(
          {
            instance: instance.config.id,
            error: extractProviderError(error).message,
          },
          "Provider failed, trying next instance",
        );
        continue;
      }

      respondWithProviderError(
        res,
        error,
        instance.config.id,
        requestedModel,
      );
      return;
    }
  }

  // All instances exhausted during this request
  if (!res.headersSent) {
    res.status(429).json({
      error: {
        message: `All providers for model "${requestedModel}" failed. Try again later.`,
        type: "rate_limit_error",
        code: "rate_limit_exceeded",
      },
    });
  }
}

function respondWithProviderError(
  res: Response,
  error: unknown,
  instanceId: string,
  model: string,
): void {
  const details = extractProviderError(error);
  logger.error({ instance: instanceId, model, error }, "Provider error");

  if (!res.headersSent) {
    res.status(details.status).json({
      error: {
        message: details.message,
        type: details.status >= 500 ? "server_error" : "invalid_request_error",
        code: null,
      },
    });
  }
}
