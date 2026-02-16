# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MultiRouter AI is a lightweight TypeScript/Express gateway that routes chat completion requests across multiple AI providers (Groq, Cerebras, OpenAI, OpenRouter, Google Gemini) through a unified API. It maximizes free-tier usage by stacking API keys and automatically failing over when a provider hits rate limits.

## Commands

```bash
pnpm dev          # Dev server with hot reload (tsx watch + pino-pretty)
pnpm start        # Production server
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint autofix
```

No test runner is configured.

## Architecture

### Request Flow

```
Client → Express middleware (Helmet, rate-limit, auth, logging)
  → Route handler (/chat or /v1/chat/completions)
    → ProviderRegistry selects provider (exhaust or round-robin strategy)
      → Adapter (openai-adapter or gemini-adapter) calls provider SDK
        → Returns AsyncIterable<string> → SSE or raw text response
```

### Key Abstractions

- **ProviderRegistry** (`src/providers/registry.ts`) — Singleton managing all provider instances. Tracks health status per provider (active/rate-limited/exhausted/error) with automatic recovery after configurable timeout. Implements two selection strategies: `getActiveForModel()` (exhaust by priority) and `getNextRoundRobin()`.

- **Adapters** (`src/providers/openai-adapter.ts`, `gemini-adapter.ts`) — Normalize different provider SDKs into a common `AsyncIterable<string>` interface. The OpenAI adapter handles all OpenAI-compatible providers (Groq, Cerebras, OpenRouter). The Gemini adapter handles Google's different API shape and role mapping.

- **Config loading** (`src/config/load-providers.ts`) — Reads `providers.yaml` with `${ENV_VAR}` interpolation. Falls back gracefully if no YAML config exists, using env vars from `.env` directly.

- **Error classification** (`src/utils/provider-error.ts`) — Extracts HTTP status from provider exceptions. Classifies 429/402/503 as retryable (triggers failover in exhaust mode); other errors are permanent.

- **SSE utilities** (`src/utils/sse.ts`) — Converts async text streams to OpenAI-compatible SSE format for `/v1/chat/completions`.

### Two API Surfaces

1. **`/v1/chat/completions`** — OpenAI-compatible endpoint (streaming and non-streaming). Works with any OpenAI SDK client.
2. **`/chat`** — Legacy endpoint returning raw text stream.

### Configuration

Providers can be configured two ways:
1. **`providers.yaml`** — Full control: provider type, API key (via env interpolation), models, priority. See `providers.yaml.example`.
2. **Environment variables** — Zero-config: set `GROQ_API_KEY`, `CEREBRAS_API_KEY`, etc. in `.env` and providers auto-activate. See `.env.example`.

Routing strategy (`exhaust` or `round-robin`) and `retry_after_seconds` are set in `providers.yaml` under `routing:`.

## Tech Stack

- TypeScript 5.9 (strict, ESM modules, bundler resolution)
- Express 5 with Pino logging
- ESLint 9 flat config — unused vars prefixed with `_` are allowed
- Package manager: pnpm
