<div align="center">

# MultiRouter AI

### OpenAI-Compatible AI Gateway with Multi-Account Load Balancing

Route chat completions across multiple AI providers **and accounts** with automatic failover. Works with Cursor, Windsurf, Claude Code, OpenCode, Continue.dev, Aider, and any OpenAI-compatible client.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

[Getting Started](#-quick-start) · [IDE Setup](#-ide-setup) · [API Reference](#-api-reference) · [Configuration](#-configuration)

</div>

---

## Why MultiRouter AI?

Most AI providers offer generous free tiers — Groq, Cerebras, and Gemini each give you thousands of free API calls. The problem? Once you hit the limit on one key, your IDE stops working.

MultiRouter AI solves this by exposing an **OpenAI-compatible API** that routes requests across every provider instance you configure. Stack multiple free-tier accounts, and when one runs out, the next picks up automatically.

- **OpenAI API Compatible** — Drop-in replacement for any tool that speaks the OpenAI protocol (`/v1/chat/completions`, `/v1/models`).
- **Multi-Account Stacking** — Add 5 Groq free-tier keys and exhaust them one by one. When all 5 are depleted, failover to Cerebras, then Gemini, then OpenAI.
- **Automatic Failover** — Rate-limited providers are temporarily disabled and re-enabled after a configurable cooldown.
- **Works with Every IDE** — Cursor, Windsurf, Claude Code, OpenCode, Continue.dev, Aider, Open WebUI — anything that can point to a custom OpenAI base URL.
- **Custom Endpoints** — Supports Ollama, LM Studio, vLLM, and any OpenAI-compatible API via the `openai-compatible` provider type.

---

## Table of Contents

- [Why MultiRouter AI?](#why-multirouter-ai)
- [Supported Providers](#-supported-providers)
- [Quick Start](#-quick-start)
- [IDE Setup](#-ide-setup)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Routing Strategies](#-routing-strategies)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [License](#-license)

---

## Supported Providers

| Provider | Type | OpenAI-Compatible | Streaming |
| :--- | :--- | :---: | :---: |
| **Groq** | `groq` | Yes | Yes |
| **Cerebras** | `cerebras` | Yes | Yes |
| **OpenAI** | `openai` | Yes | Yes |
| **OpenRouter** | `openrouter` | Yes | Yes |
| **Google Gemini** | `gemini` | Native SDK | Yes |
| **Ollama / LM Studio / vLLM** | `openai-compatible` | Yes | Yes |

> Any provider that implements the OpenAI chat completions API can be added using the `openai-compatible` type with a custom `base_url`.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [pnpm](https://pnpm.io/) (recommended) or npm

### 1. Clone & install

```bash
git clone https://github.com/Mykle23/MultiRouter-AI.git
cd MultiRouter-AI
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
cp providers.yaml.example providers.yaml
```

Edit `providers.yaml` and paste your API keys directly:

```yaml
providers:
  - id: groq-1
    type: groq
    api_key: gsk_your_key_here      # ← paste your real key
    models:
      - llama-3.3-70b-versatile
    priority: 1
```

Instances without a valid API key are automatically skipped. Optionally edit `.env` to set a gateway auth token, port, or rate limit.

### 3. Start the server

```bash
pnpm dev      # Development (hot reload + pretty logs)
pnpm start    # Production
```

### 4. Test it

```bash
# OpenAI-compatible endpoint (streaming)
curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "stream": true,
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'

# List available models
curl http://localhost:3000/v1/models
```

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## IDE Setup

MultiRouter AI is a drop-in OpenAI proxy. Point your IDE to `http://localhost:3000/v1` and it works.

### Cursor

1. Open **Settings → Models → OpenAI API Key**
2. Set **Base URL** to `http://localhost:3000/v1`
3. Set **API Key** to the value of your `API_KEY` env var (or any string if auth is disabled)
4. Add your desired models (e.g. `llama-3.3-70b-versatile`, `gemini-2.5-flash`, `multirouter-auto`)

### Windsurf

1. Open **Settings → AI Provider**
2. Select **OpenAI Compatible**
3. Set **Base URL** to `http://localhost:3000/v1`
4. Set the API key and model name

### Claude Code / OpenCode / Continue.dev / Aider

All support custom OpenAI base URLs. Set:

```
OPENAI_BASE_URL=http://localhost:3000/v1
OPENAI_API_KEY=your-api-key
```

### Special Models

| Model Name | Behaviour |
| :--- | :--- |
| `multirouter-auto` | Round-robin across ALL providers — maximises free-tier usage |
| Any real model name | Exhaust strategy — tries each provider that has this model in priority order |

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## API Reference

### `POST /v1/chat/completions`

OpenAI-compatible chat completions endpoint. Supports both streaming and non-streaming responses.

**Request Body** — identical to the [OpenAI API](https://platform.openai.com/docs/api-reference/chat):

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_completion_tokens": 4096
}
```

**Streaming response** — Server-Sent Events in OpenAI format:

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1700000000,"model":"llama-3.3-70b-versatile","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1700000000,"model":"llama-3.3-70b-versatile","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1700000000,"model":"llama-3.3-70b-versatile","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### `GET /v1/models`

Returns all available models in OpenAI format. Includes the virtual `multirouter-auto` model.

```json
{
  "object": "list",
  "data": [
    { "id": "multirouter-auto", "object": "model", "created": 1700000000, "owned_by": "multirouter" },
    { "id": "llama-3.3-70b-versatile", "object": "model", "created": 1700000000, "owned_by": "groq" },
    { "id": "gemini-2.5-flash", "object": "model", "created": 1700000000, "owned_by": "gemini" }
  ]
}
```

### `GET /health`

Returns server status with all provider instances, their status, and models.

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## Configuration

### `providers.yaml`

This is the heart of MultiRouter AI. It defines your provider instances and routing strategy.

```yaml
routing:
  default_strategy: exhaust        # exhaust | round-robin
  retry_after_seconds: 300         # Re-enable failed providers after 5 min

providers:
  # Free tiers first — they'll be tried top-to-bottom
  - id: groq-1
    type: groq
    api_key: gsk_your_first_key
    models:
      - llama-3.3-70b-versatile
      - llama-3.1-8b-instant

  - id: groq-2
    type: groq
    api_key: gsk_your_second_key
    models:
      - llama-3.3-70b-versatile

  # Paid providers last — only used when free tiers are exhausted
  - id: openai-1
    type: openai
    api_key: sk-your_openai_key
    models:
      - gpt-4o
      - gpt-4o-mini

  # Custom local endpoint
  - id: ollama
    type: openai-compatible
    base_url: http://localhost:11434/v1
    api_key: ollama
    models:
      - llama3.2
```

> **Security:** `providers.yaml` contains secrets and is git-ignored. Commit only `providers.yaml.example` (no real keys).
>
> **Order matters:** Providers are tried top-to-bottom. Put free tiers first and paid providers last.

**Key concepts:**

| Field | Description |
| :--- | :--- |
| `id` | Unique identifier for this instance |
| `type` | Provider type: `openai`, `groq`, `cerebras`, `openrouter`, `gemini`, `openai-compatible` |
| `api_key` | API key — paste directly, or use `${ENV_VAR}` for Docker/CI |
| `base_url` | Custom endpoint URL (required for `openai-compatible`, optional for others) |
| `models` | List of models this instance can serve |

### `.env`

Server-level settings only. Provider keys go in `providers.yaml`.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` / `production` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `API_KEY` | _(empty)_ | Bearer token for gateway auth — leave empty to disable |
| `RATE_LIMIT_MAX` | `100` | Max requests per minute per IP — `0` to disable |

> **Tip:** For Docker or CI, you can reference env vars in `providers.yaml` with `api_key: ${SECRET_NAME}` instead of pasting keys directly.

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## Routing Strategies

### Exhaust (default)

Stick with one provider instance until it's rate-limited, then failover to the next in order.

```
Request 1-50:    groq-1  ✓
Request 51:      groq-1  → 429 Rate Limit
                 groq-2  ✓  ← automatic failover
Request 51-100:  groq-2  ✓
Request 101:     groq-2  → 429 Rate Limit
                 groq-3  ✓  ← automatic failover
...
All exhausted:   → 429 "All providers for model exhausted"
After 5 min:     groq-1  recovers → back to first
```

**Best for:** Maximising free tiers. Each account's quota is fully used before moving to the next.

### Round-Robin

Distribute requests evenly across all active provider instances.

```
Request 1: groq-1     (llama-3.3-70b)
Request 2: cerebras-1 (llama-3.3-70b)
Request 3: gemini-1   (gemini-2.5-flash)
Request 4: groq-1     (wraps around)
```

**Best for:** Load distribution when you don't mind mixing models. Use the `multirouter-auto` model name to activate round-robin from any IDE.

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## How It Works

```
                      ┌───────────────────┐
                      │   IDE / Client    │
                      │ Cursor, Windsurf  │
                      │ Claude Code, etc. │
                      └─────────┬─────────┘
                                │  POST /v1/chat/completions
                                │  { model, messages, stream }
                                ▼
                      ┌───────────────────┐
                      │  MultiRouter AI   │
                      │                   │
                      │  Auth → Rate Lim  │
                      │  → Route Select   │
                      └─────────┬─────────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
        "multirouter-auto"   Real model      Model not
        (round-robin)        (exhaust)         found
               │                │                │
               ▼                ▼                ▼
          Next active     Instances in         404 error
          instance        YAML order
               │                │
               │         ┌──────┼──────┐
               │         ▼      ▼      ▼
               │      groq-1  groq-2  groq-3
               │      (1st)   (2nd)   (3rd)
               │         │
               │    Try groq-1 → 429? → Try groq-2 → OK!
               │                              │
               └──────────────┬───────────────┘
                              │  SSE stream (OpenAI format)
                              ▼
                      ┌───────────────────┐
                      │   IDE / Client    │
                      └───────────────────┘
```

1. **Request arrives** at `/v1/chat/completions` with a model name.
2. **Routing**: `multirouter-auto` triggers round-robin; any real model name triggers exhaust strategy.
3. **Exhaust**: Instances for the requested model are tried in the order they appear in `providers.yaml`.
4. **Failover**: If a provider returns 429/402/503, it's marked as rate-limited and the next instance is tried.
5. **Recovery**: After `retry_after_seconds`, failed instances are automatically re-enabled.
6. **Response**: Streamed back in OpenAI SSE format (`data: {…}\n\n` + `data: [DONE]`).

<p align="right">(<a href="#multirouter-ai">back to top</a>)</p>

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5.9 (strict mode) |
| **Framework** | Express 5 |
| **Configuration** | YAML with `${ENV_VAR}` interpolation |
| **Logging** | Pino + pino-http |
| **Security** | Helmet, express-rate-limit |
| **Provider SDKs** | `openai` (for all OpenAI-compatible), `@google/generative-ai` (for Gemini) |
| **Dev Tools** | ESLint 9, tsx (hot reload) |

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**[Back to Top](#multirouter-ai)**

</div>
