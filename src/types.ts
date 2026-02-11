export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: string;
  model?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly availableModels: readonly string[];
  chat(messages: ChatMessage[], model?: string): Promise<AsyncIterable<string>>;
}
