import type { Request, Response } from "express";
import { getAvailableProviders } from "../providers";

export function healthRoute(_req: Request, res: Response): void {
  const providers = getAvailableProviders();

  res.json({
    status: "ok",
    providers: providers.map((p) => p.name),
    providerCount: providers.length,
    timestamp: new Date().toISOString(),
  });
}
