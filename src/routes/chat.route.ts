import type { Request, Response } from "express";
import { selectNextProvider } from "../providers";
import { logger } from "../logger";
import type { ChatMessage } from "../types";

export async function chatRoute(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as { messages?: unknown };

  // Basic validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res
      .status(400)
      .json({ error: "messages array is required and cannot be empty" });
    return;
  }

  const provider = selectNextProvider();

  if (!provider) {
    res.status(503).json({ error: "No AI providers available" });
    return;
  }

  logger.info({ provider: provider.name }, "Routing request to provider");

  try {
    const stream = await provider.chat(messages as ChatMessage[]);

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
  } catch (error) {
    logger.error(error, `Provider ${provider.name} failed`);

    if (!res.headersSent) {
      res.status(502).json({
        error: "AI provider error",
        provider: provider.name,
      });
    }
  }
}
