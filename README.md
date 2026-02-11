<div align="center">

# ⚡ MultiRouter AI

### A Lightweight AI Gateway for TypeScript

Route chat completions across multiple AI providers with a single, unified API.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

[Getting Started](#-quick-start) · [API Reference](#-api-reference) · [Configuration](#-configuration) · [How It Works](#-how-it-works)

</div>

---

## Why MultiRouter AI?

Most AI providers offer generous free tiers — Groq, Cerebras, and Gemini each give you thousands of free API calls per month. The problem? Once you hit the limit on one key, your app stops working.

MultiRouter AI solves this by exposing a **single HTTP endpoint** that rotates requests across every API key you configure. When one provider's free quota runs out, the next request simply goes to another. You get **continuous, uninterrupted AI access** by stacking free tiers together — no code changes, no manual switching.

- **Maximize Free Tiers** — Stack free-tier keys from Groq, Cerebras, Gemini, and others behind one API. When one key hits its limit, the next provider picks up automatically.
- **Single API, Multiple Providers** — Send requests and let the gateway route them to Groq, Cerebras, OpenAI, OpenRouter, or Google Gemini.
- **Choose Your Provider & Model** — Target a specific provider and model per request, or let the gateway pick one automatically via round-robin.
- **Zero-Config Provider Loading** — Add an API key and the provider activates.

---

## Table of Contents

- [Why MultiRouter AI?](#why-multirouter-ai)
- [Supported Providers](#-supported-providers)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [License](#-license)

---

## 🔌 Supported Providers

| Provider | Default Model | Streaming | Status |
| :--- | :--- | :---: | :---: |
| **Groq** | `llama-3.3-70b-versatile` | Yes | Stable |
| **Cerebras** | `llama-3.3-70b` | Yes | Stable |
| **OpenAI** | `gpt-4o-mini` | Yes | Stable |
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct` | Yes | Stable |
| **Google Gemini** | `gemini-2.5-flash` | Yes | Stable |

> Only providers with a configured API key are loaded. You can use one provider or all five — it's up to you.
>
> Each provider exposes a list of available models via the `/health` endpoint so you can check what's available before sending a request.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [pnpm](https://pnpm.io/) (recommended) or npm

### 1. Clone the repository

```bash
git clone https://github.com/Mykle23/MultiRouter-AI.git
cd MultiRouter-AI
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add at least one provider API key. The gateway will auto-detect available providers on startup:

```env
# Add the providers you want to use
GROQ_API_KEY=gsk_your_key_here
OPENAI_API_KEY=sk-your_key_here
GEMINI_API_KEY=your_key_here

# Optional: protect the gateway with a Bearer token
API_KEY=my-secret-token
```

### 4. Start the server

```bash
# Development (hot reload + pretty logs)
pnpm dev

# Production
pnpm start
```

### 5. Send your first request

```bash
curl -N http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello! What can you do?" }
    ]
  }'
```

You should see a streaming text response from one of your configured providers.

<p align="right">(<a href="#-multirouter-ai">back to top</a>)</p>

---

## 📡 API Reference

### `POST /chat`

Send a chat completion request. The gateway selects a provider based on the request parameters and streams the response.

**Headers**

| Header | Required | Description |
| :--- | :---: | :--- |
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Conditional | `Bearer <token>` — required only if `API_KEY` is set |

**Request Body**

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `messages` | `array` | Yes | Array of `{ role, content }` objects |
| `provider` | `string` | No | Target a specific provider by name (e.g. `"Groq"`, `"Gemini"`) |
| `model` | `string` | No | Override the provider's default model. **Requires `provider`** |

**Routing logic:**

| Request | Behavior |
| :--- | :--- |
| Only `messages` | Round-robin — the gateway picks the next available provider with its default model |
| `messages` + `provider` | Uses that exact provider with its default model |
| `messages` + `provider` + `model` | Uses that exact provider with the specified model |
| `messages` + `model` (no provider) | **400 error** — provider is required when model is specified |

**Example — round-robin (no provider specified):**

```bash
curl -N -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

**Example — specific provider:**

```bash
curl -N -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Groq",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Explain quantum computing in simple terms." }
    ]
  }'
```

**Example — specific provider and model:**

```bash
curl -N -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "Write a haiku about TypeScript." }
    ]
  }'
```

**Response:** Streamed text via `text/event-stream`.

**Error Responses**

All errors return a JSON object with an `error` field and a human-readable message:

| Code | Reason | Example message |
| :--- | :--- | :--- |
| `400` | Invalid request | `"messages array is required and cannot be empty"` |
| `400` | Model without provider | `"provider is required when model is specified"` |
| `401` | Auth failed | `"Authentication failed — invalid API key for this provider"` |
| `404` | Invalid model | `"Model not found — the requested model does not exist on this provider"` |
| `429` | Rate limited | `"Rate limit exceeded — too many requests, try again later"` |
| `502` | Provider failure | `"Provider internal error — the upstream service failed"` |
| `503` | No providers | `"No AI providers available"` |

Error responses also include `provider` and `model` fields when available, so you know exactly which combination failed:

```json
{
  "error": "Rate limit exceeded — too many requests, try again later",
  "provider": "Gemini",
  "model": "gemini-2.5-pro"
}
```

---

### `GET /health`

Returns server status with the full list of active providers, their default models, and all available models. No authentication required.

```json
{
  "status": "ok",
  "providers": [
    {
      "name": "Groq",
      "defaultModel": "llama-3.3-70b-versatile",
      "availableModels": [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "qwen/qwen3-32b",
        "moonshotai/kimi-k2-instruct-0905"
      ]
    },
    {
      "name": "Cerebras",
      "defaultModel": "llama-3.3-70b",
      "availableModels": ["llama3.1-8b", "llama-3.3-70b", "gpt-oss-120b", "..."]
    }
  ],
  "providerCount": 2,
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```

> Use this endpoint to discover which providers are active and which models you can use in your requests.

<p align="right">(<a href="#-multirouter-ai">back to top</a>)</p>

---

## 🔧 Configuration

All settings are managed through environment variables. See [`.env.example`](.env.example) for the full template.

### Server

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` / `production` |
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `API_KEY` | _(empty)_ | Bearer token for auth — leave empty to disable |
| `RATE_LIMIT_MAX` | `100` | Max requests per minute per IP — set to `0` to disable |

### Providers

Each provider requires only its API key. The model is optional and falls back to a sensible default.

| Provider | API Key Variable | Model Variable | Default Model |
| :--- | :--- | :--- | :--- |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| Cerebras | `CEREBRAS_API_KEY` | `CEREBRAS_MODEL` | `llama-3.3-70b` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | `gpt-4o-mini` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` | `meta-llama/llama-3.3-70b-instruct` |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | `gemini-2.5-flash` |

<p align="right">(<a href="#-multirouter-ai">back to top</a>)</p>

---

## 🔄 How It Works

```
                    ┌──────────────┐
                    │    Client    │
                    └──────┬───────┘
                           │  POST /chat
                           │  { provider?, model?, messages }
                           ▼
                    ┌──────────────┐
                    │   Gateway    │
                    │  (Express)   │
                    │              │
                    │  Auth Check  │
                    │  Rate Limit  │
                    │  Validation  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         provider      provider     no provider
         + model       only        specified
              │            │            │
              ▼            ▼            ▼
         Use exact    Use provider   Round-Robin
         provider     + default      across all
         + model      model         providers
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   Groq   │ │  OpenAI  │ │  Gemini  │  ...
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │  Streaming response
                           ▼
                    ┌──────────────┐
                    │    Client    │
                    └──────────────┘
```

1. **Request arrives** at `POST /chat` with messages and optional `provider` / `model` fields.
2. **Middleware pipeline** runs: Helmet headers, rate limiting, Bearer token auth, body validation.
3. **Provider selection**: if a provider is specified, that exact provider is used. Otherwise, the round-robin selector picks the next available provider.
4. **Provider streams** the completion back through the gateway to the client in real time.
5. If a provider fails, the gateway returns a descriptive error with the HTTP status, provider name, and model.

<p align="right">(<a href="#-multirouter-ai">back to top</a>)</p>

---

## 🛠 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5.9 (strict mode) |
| **Framework** | Express 5 |
| **Logging** | Pino + pino-http |
| **Security** | Helmet, express-rate-limit |
| **Provider SDKs** | `groq-sdk`, `@cerebras/cerebras_cloud_sdk`, `openai`, `@openrouter/sdk`, `@google/generative-ai` |
| **Dev Tools** | ESLint 9, tsx (hot reload) |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**[Back to Top](#-multirouter-ai)**

</div>
