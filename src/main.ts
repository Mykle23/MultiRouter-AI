import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./logger";
import { chatRoute } from "./routes/chat.route";
import { healthRoute } from "./routes/health.route";
import { getAvailableProviders } from "./providers";

const app = express();

// Security headers
app.use(helmet());

// HTTP request logging
app.use(pinoHttp({ logger }));

// JSON body parsing
app.use(express.json({ limit: "1mb" }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Authentication middleware
app.use((req, res, next) => {
  // Skip auth if no API_KEY is configured
  if (!env.apiKey) {
    next();
    return;
  }

  // Allow health check without auth
  if (req.path === "/health") {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== env.apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
});

// Routes
app.post("/chat", chatRoute);
app.get("/health", healthRoute);

// 404 handler
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler (must have 4 params for Express to recognize it)
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err, "Unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Start server
app.listen(env.port, env.host, () => {
  const providers = getAvailableProviders();
  logger.info(
    { port: env.port, host: env.host, providers: providers.map((p) => p.name) },
    "Server started"
  );
});
