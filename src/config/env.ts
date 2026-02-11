import "dotenv/config";

export const env = {
  // Server
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  isProduction: process.env.NODE_ENV === "production",

  // Authentication
  apiKey: process.env.API_KEY ?? "",

  // Rate limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),

  // Groq
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",

  // Cerebras
  cerebrasApiKey: process.env.CEREBRAS_API_KEY ?? "",
  cerebrasModel: process.env.CEREBRAS_MODEL ?? "llama-3.3-70b",

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  // OpenRouter
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel:
    process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct",

  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
} as const;
