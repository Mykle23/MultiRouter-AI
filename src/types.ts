export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  readonly name: string;
  chat(messages: ChatMessage[]): Promise<AsyncIterable<string>>;
}
