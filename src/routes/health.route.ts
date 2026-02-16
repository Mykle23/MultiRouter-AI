import type { Request, Response } from "express";
import { getRegistry } from "../providers/registry";

/**
 * `GET /health`
 *
 * Returns server status with every registered provider instance
 * and its current status.
 */
export function healthRoute(_req: Request, res: Response): void {
  const registry = getRegistry();
  const instances = registry.getAllInstances();

  res.json({
    status: "ok",
    routing: registry.getDefaultStrategy(),
    providers: instances.map((i) => ({
      id: i.config.id,
      type: i.config.type,
      status: i.status,
      models: i.config.models,
      errorCount: i.errorCount,
    })),
    providerCount: instances.length,
    activeCount: instances.filter((i) => i.status === "active").length,
    timestamp: new Date().toISOString(),
  });
}
