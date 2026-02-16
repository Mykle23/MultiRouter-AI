import "dotenv/config";

export const env = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  isProduction: process.env.NODE_ENV === "production",
  apiKey: process.env.API_KEY ?? "",
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
} as const;
