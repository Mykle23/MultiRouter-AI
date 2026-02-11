import pino from "pino";
import { env } from "./config/env";

const transport = !env.isProduction
  ? { target: "pino-pretty", options: { colorize: true } }
  : undefined;

export const logger = pino({
  level: env.logLevel,
  ...(transport && { transport }),
});
