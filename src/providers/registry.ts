import type {
  ProviderInstance,
  ProviderInstanceConfig,
  ProvidersConfig,
  RoutingConfig,
  ChatMessage,
  ChatOptions,
  OpenAIModel,
} from "../types";
import { createOpenAIAdapter } from "./openai-adapter";
import { createGroqAdapter } from "./groq-adapter";
import { createCerebrasAdapter } from "./cerebras-adapter";
import { createOpenRouterAdapter } from "./openrouter-adapter";
import { createGeminiAdapter } from "./gemini-adapter";
import { loadProvidersConfig } from "../config/load-providers";
import { logger } from "../logger";

type ChatFn = (
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions,
) => Promise<AsyncIterable<string>>;

/**
 * Creates the chat function for a provider instance using its **native SDK**.
 * Each provider type uses its own SDK for optimal compatibility.
 */
function createChatFunction(config: ProviderInstanceConfig): ChatFn {
  switch (config.type) {
    case "groq":
      return createGroqAdapter(config.apiKey);
    case "cerebras":
      return createCerebrasAdapter(config.apiKey);
    case "openrouter":
      return createOpenRouterAdapter(config.apiKey);
    case "gemini":
      return createGeminiAdapter(config.apiKey);
    case "openai":
      return createOpenAIAdapter(config.apiKey);
    case "openai-compatible":
      return createOpenAIAdapter(config.apiKey, config.baseUrl);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

// ── Registry ───────────────────────────────────────

export class ProviderRegistry {
  private readonly instances: Map<string, ProviderInstance> = new Map();
  private readonly routingConfig: RoutingConfig;
  private roundRobinIndex = 0;

  constructor(config: ProvidersConfig) {
    this.routingConfig = config.routing;

    for (const providerConfig of config.providers) {
      try {
        const chatFn = createChatFunction(providerConfig);

        this.instances.set(providerConfig.id, {
          config: providerConfig,
          status: "active",
          lastErrorAt: null,
          errorCount: 0,
          chat: chatFn,
        });

        logger.info(
          {
            id: providerConfig.id,
            type: providerConfig.type,
            models: providerConfig.models.length,
          },
          "Provider instance registered",
        );
      } catch (error) {
        logger.error(
          { id: providerConfig.id, error },
          "Failed to create provider instance",
        );
      }
    }
  }

  // ── Recovery ─────────────────────────────────────

  /** Re-enable instances whose retry window has elapsed. */
  private recoverExpired(): void {
    const now = Date.now();
    const retryMs = this.routingConfig.retryAfterSeconds * 1000;

    for (const instance of this.instances.values()) {
      if (
        instance.status !== "active" &&
        instance.lastErrorAt !== null &&
        now - instance.lastErrorAt >= retryMs
      ) {
        logger.info({ id: instance.config.id }, "Provider instance recovered");
        instance.status = "active";
        instance.errorCount = 0;
        instance.lastErrorAt = null;
      }
    }
  }

  // ── Selection ────────────────────────────────────

  /**
   * **Exhaust strategy** — returns active instances for the requested model
   * in the order they were defined in providers.yaml. The caller iterates
   * through them, using each one until it fails, then moving to the next.
   */
  getActiveForModel(model: string): ProviderInstance[] {
    this.recoverExpired();
    return [...this.instances.values()].filter(
      (i) => i.status === "active" && i.config.models.includes(model),
    );
  }

  /**
   * **Round-robin** — picks the next active instance regardless of model.
   * Returns the instance together with its first configured model.
   */
  getNextRoundRobin(): { instance: ProviderInstance; model: string } | null {
    this.recoverExpired();
    const active = [...this.instances.values()].filter(
      (i) => i.status === "active",
    );
    if (active.length === 0) return null;

    const instance = active[this.roundRobinIndex % active.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % active.length;

    if (!instance) return null;
    const model = instance.config.models[0];
    if (!model) return null;

    return { instance, model };
  }

  // ── State management ─────────────────────────────

  /** Mark a provider instance as temporarily failed. */
  markFailed(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.status = "rate-limited";
    instance.lastErrorAt = Date.now();
    instance.errorCount++;

    logger.warn(
      { id: instanceId, errorCount: instance.errorCount },
      "Provider instance marked as rate-limited",
    );
  }

  // ── Queries ──────────────────────────────────────

  /**
   * Returns a de-duplicated list of every model across all instances,
   * plus the virtual `multirouter-auto` model for round-robin routing.
   */
  getAllModels(): OpenAIModel[] {
    const seen = new Map<string, string>();

    for (const instance of this.instances.values()) {
      for (const model of instance.config.models) {
        if (!seen.has(model)) {
          seen.set(model, instance.config.type);
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const models: OpenAIModel[] = [
      {
        id: "multirouter-auto",
        object: "model",
        created: now,
        owned_by: "multirouter",
      },
    ];

    for (const [id, ownedBy] of seen) {
      models.push({ id, object: "model", created: now, owned_by: ownedBy });
    }

    return models;
  }

  /** Check if a model exists across any instance (even exhausted ones). */
  hasModel(model: string): boolean {
    for (const instance of this.instances.values()) {
      if (instance.config.models.includes(model)) return true;
    }
    return false;
  }

  /** Get every registered instance (for health / debug). */
  getAllInstances(): ProviderInstance[] {
    return [...this.instances.values()];
  }

  /** The routing strategy configured in providers.yaml. */
  getDefaultStrategy(): string {
    return this.routingConfig.defaultStrategy;
  }

  get size(): number {
    return this.instances.size;
  }
}

// ── Singleton ──────────────────────────────────────

let _registry: ProviderRegistry | null = null;

export function initializeRegistry(): ProviderRegistry {
  const config = loadProvidersConfig();
  _registry = new ProviderRegistry(config);
  return _registry;
}

export function getRegistry(): ProviderRegistry {
  if (!_registry) {
    throw new Error(
      "ProviderRegistry not initialised. Call initializeRegistry() first.",
    );
  }
  return _registry;
}
