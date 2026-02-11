import type { Request, Response } from "express";
import { selectProvider } from "../providers";
import { logger } from "../logger";
import type { ChatRequest } from "../types";

export async function chatRoute(req: Request, res: Response): Promise<void> {
  const { messages, provider: providerName, model } =
    req.body as Partial<ChatRequest>;

  // Validate messages (required)
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res
      .status(400)
      .json({ error: "messages array is required and cannot be empty" });
    return;
  }

  // Validate provider (optional, must be string if provided)
  if (providerName !== undefined && typeof providerName !== "string") {
    res.status(400).json({ error: "provider must be a string" });
    return;
  }

  // Validate model (optional, must be string if provided)
  if (model !== undefined && typeof model !== "string") {
    res.status(400).json({ error: "model must be a string" });
    return;
  }

  // Model requires a provider — without it we don't know where to send it
  if (model && !providerName) {
    res
      .status(400)
      .json({ error: "provider is required when model is specified" });
    return;
  }

  const selection = selectProvider(providerName, model);

  if (!selection) {
    const detail = providerName
      ? `Provider "${providerName}" is not available`
      : "No AI providers available";

    res.status(503).json({ error: detail });
    return;
  }

  const { provider, model: selectedModel } = selection;

  logger.info(
    { provider: provider.name, model: selectedModel },
    "Routing request to provider"
  );

  const startTime = Date.now();

  try {
    const stream = await provider.chat(messages, selectedModel);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      if (res.writableEnded) {
        break;
      }
      if (chunk) {
        res.write(chunk);
      }
    }

    if (!res.writableEnded) {
      res.end();
    }

    const durationMs = Date.now() - startTime;
    logger.info(
      { provider: provider.name, model: selectedModel, durationMs },
      "Chat completed"
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(
      { provider: provider.name, model: selectedModel, durationMs, error },
      "Provider failed"
    );

    if (!res.headersSent) {
      res.status(502).json({
        error: "AI provider error",
        provider: provider.name,
      });
    }
  }
}
