import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./logger";
import { initializeRegistry } from "./providers/registry";
import { chatCompletionsRoute } from "./routes/v1/chat-completions";
import { modelsRoute } from "./routes/v1/models";
import { healthRoute } from "./routes/health.route";

// ── Bootstrap ──────────────────────────────────────
const registry = initializeRegistry();

const app = express();

// ── Security ───────────────────────────────────────
app.use(helmet());

// ── HTTP request logging ───────────────────────────
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url === "/health" || req.url === "/v1/models",
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

// ── Body parsing ───────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Rate limiting ──────────────────────────────────
if (env.rateLimitMax > 0) {
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}

// ── Authentication ─────────────────────────────────
app.use((req, res, next) => {
  if (!env.apiKey) {
    next();
    return;
  }

  // Public endpoints — no auth required
  if (req.path === "/health" || req.path === "/v1/models") {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        message: "Missing or invalid Authorization header",
        type: "invalid_request_error",
      },
    });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== env.apiKey) {
    res.status(401).json({
      error: {
        message: "Invalid API key",
        type: "invalid_request_error",
      },
    });
    return;
  }

  next();
});

// ── Routes ─────────────────────────────────────────
app.post("/v1/chat/completions", chatCompletionsRoute);
app.get("/v1/models", modelsRoute);
app.get("/health", healthRoute);

// ── 404 ────────────────────────────────────────────
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: { message: "Route not found", type: "invalid_request_error" },
  });
});

// ── Global error handler ───────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(err, "Unhandled error");
    if (!res.headersSent) {
      res.status(500).json({
        error: { message: "Internal server error", type: "server_error" },
      });
    }
  },
);

// ── Start ──────────────────────────────────────────
app.listen(env.port, () => {
  const instances = registry.getAllInstances();
  logger.info(
    {
      port: env.port,
      strategy: registry.getDefaultStrategy(),
      instances: instances.map((i) => ({
        id: i.config.id,
        type: i.config.type,
        models: i.config.models.length,
      })),
      totalInstances: instances.length,
    },
    "MultiRouter AI started",
  );
});
