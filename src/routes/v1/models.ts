import type { Request, Response } from "express";
import { getRegistry } from "../../providers/registry";

/**
 * `GET /v1/models`
 *
 * Returns the list of available models in OpenAI-compatible format.
 * Includes the virtual `multirouter-auto` model for round-robin routing.
 */
export function modelsRoute(_req: Request, res: Response): void {
  const registry = getRegistry();
  const models = registry.getAllModels();

  res.json({
    object: "list",
    data: models,
  });
}
