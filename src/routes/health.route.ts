import type { Request, Response } from "express";
import { getAvailableProviders } from "../providers";

export function healthRoute(_req: Request, res: Response): void {
  const providers = getAvailableProviders();

  res.json({
    status: "ok",
    providers: providers.map((p) => ({
      name: p.name,
      defaultModel: p.defaultModel,
      availableModels: p.availableModels,
    })),
    providerCount: providers.length,
    timestamp: new Date().toISOString(),
  });
}
