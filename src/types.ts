// ── Provider Types ─────────────────────────────────

export const PROVIDER_TYPES = {
  OPENAI: "openai",
  GROQ: "groq",
  CEREBRAS: "cerebras",
  OPENROUTER: "openrouter",
  GEMINI: "gemini",
  OPENAI_COMPATIBLE: "openai-compatible",
} as const;

export type ProviderType =
  (typeof PROVIDER_TYPES)[keyof typeof PROVIDER_TYPES];

// ── Routing ────────────────────────────────────────

export const ROUTING_STRATEGIES = {
  EXHAUST: "exhaust",
  ROUND_ROBIN: "round-robin",
} as const;

export type RoutingStrategy =
  (typeof ROUTING_STRATEGIES)[keyof typeof ROUTING_STRATEGIES];

// ── Instance Status ────────────────────────────────

export const INSTANCE_STATUSES = {
  ACTIVE: "active",
  RATE_LIMITED: "rate-limited",
  EXHAUSTED: "exhausted",
  ERROR: "error",
} as const;

export type InstanceStatus =
  (typeof INSTANCE_STATUSES)[keyof typeof INSTANCE_STATUSES];

// ── Chat ───────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxCompletionTokens?: number;
  topP?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ── Provider Instance ──────────────────────────────

export interface ProviderInstanceConfig {
  id: string;
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  models: string[];
}

export interface ProviderInstance {
  config: ProviderInstanceConfig;
  status: InstanceStatus;
  lastErrorAt: number | null;
  errorCount: number;
  chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions,
  ): Promise<AsyncIterable<string>>;
}

// ── Configuration ──────────────────────────────────

export interface RoutingConfig {
  defaultStrategy: RoutingStrategy;
  retryAfterSeconds: number;
}

export interface ProvidersConfig {
  routing: RoutingConfig;
  providers: ProviderInstanceConfig[];
}

// ── OpenAI API Compatibility ───────────────────────

export interface OpenAIChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenAIChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export interface OpenAIChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIModel {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

export interface OpenAIModelList {
  object: "list";
  data: OpenAIModel[];
}
