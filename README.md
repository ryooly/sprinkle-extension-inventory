<div align="center">

# Sprinkle

**A backend that finds, checks, and serves browser extensions on a schedule.**

Sprinkle searches GitHub for browser extensions, runs them through an AI
security check, keeps the catalogue clean, and publishes a fresh showcase for
the frontend. It runs hourly and daily with no manual steps.

![Runtime](https://img.shields.io/badge/runtime-Bun-111111?logo=bun&logoColor=white)
![Framework](https://img.shields.io/badge/framework-Elysia-8C9EFF?logo=elysia&logoColor=white)
![Language](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Database](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)
![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?logo=googlegemini&logoColor=white)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [The Automation Engine](#the-automation-engine)
  - [Pipeline Stages](#pipeline-stages)
  - [Dual-Tier Output: Basic vs. Premium](#dual-tier-output-basic-vs-premium)
  - [Scheduling & Orchestration](#scheduling--orchestration)
  - [Self-Maintenance Loop](#self-maintenance-loop)
  - [Idempotency & Deduplication](#idempotency--deduplication)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Automation](#running-the-automation)
- [API Reference](#api-reference)
- [Command-Line Interface](#command-line-interface)
- [Testing](#testing)
- [Data Model](#data-model)
- [Error Handling Convention](#error-handling-convention)
- [Security](#security)
- [License](#license)

---

## Overview

Sprinkle tries to answer one question: which browser extensions are worth
showing today, and can they be trusted?

Instead of a hand-maintained directory, Sprinkle runs the whole flow on its own.
A scheduled job searches GitHub for public browser-extension repositories,
validates and normalises each candidate, saves it to PostgreSQL, and prunes
low-value entries over time. On top of that raw catalogue, an AI security engine
reads each repository (README, `manifest.json`, activity, permissions) and
produces a trust score, a plain-language description, a category, and the
browser permissions the extension asks for.

Clients read the result through two endpoints:

- The **daily showcase**: the latest curated set of extensions, open to
  everyone.
- The **premium showcase**: the same set, enriched on request by the AI security
  engine, for subscribers.

The API is an Elysia HTTP gateway. Auth uses JWT access tokens with rotating
refresh tokens. Payments and subscriptions run through Midtrans. A CLI and a
test suite cover every endpoint.

---

## Key Features

- **Autonomous discovery.** Searches GitHub hourly for browser extensions with a
  tuned query: `browser extension`, `stars:>=10`, `created:>=2017`, public only.
- **AI security checks.** A Gemini model inspects each repository and returns a
  trust verdict: `verificationPercentage` (0 to 100), a `verified` flag, the
  permissions it requests, a category, and a rewritten description.
- **Self-cleaning catalogue.** Extensions that get shown often but never viewed
  or downloaded are pruned on each run.
- **No duplicates.** A `fetched_repos` ledger and a unique `(name, developer)`
  index stop repeated runs from inserting the same extension twice.
- **Two tiers.** A free daily showcase, and a premium showcase that enriches on
  demand for subscribers.
- **Scheduled jobs.** Bun cron with per-step error handling, duration logging,
  and clean shutdown.
- **Full HTTP API.** Auth, builder CRUD and search, engagement metrics,
  payments, and showcase endpoints, all behind one error format.
- **Developer tooling.** A CLI that hits every endpoint, a one-command smoke
  test, an idempotent seed, and a Bun test suite split by area.

---

## System Architecture

Sprinkle is a modular monolith with three entry points that share one codebase
and one database:

```mermaid
flowchart LR
    subgraph Clients
        FE[Frontend / SPA]
        DEV[Developer]
    end

    subgraph Sprinkle
        GW["HTTP Gateway\n(Elysia, :3000)"]
        AUTO["Automation Runner\n(cron orchestrator)"]
        CLI["CLI\n(HTTP client)"]
    end

    subgraph Modules
        AUTH[auth]
        EXT[manual-extension]
        PAY[payment-gateway]
        SHOW[dailyShowcase]
        ENG["automation-engine\n(discovery · AI · saving · filtering · algorithm)"]
    end

    DB[(PostgreSQL 16)]
    GH[[GitHub API]]
    AI[[Gemini API]]
    MT[[Midtrans]]

    FE --> GW
    DEV --> CLI --> GW
    GW --> AUTH & EXT & PAY & SHOW
    SHOW --> ENG
    AUTO --> ENG
    ENG --> GH
    ENG --> AI
    AUTH & EXT & PAY & SHOW & ENG --> DB
    PAY --> MT
```

| Entry point           | File                                  | Responsibility                                                                            |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| **HTTP Gateway**      | `src/gateway/index.ts`                | Elysia server on port `3000`; mounts all route modules, CORS, and a global error handler. |
| **Automation Runner** | `src/modules/twentyFourHour/index.ts` | Background process that starts the hourly and daily cron jobs.                            |
| **CLI**               | `cli/index.ts`                        | A plain HTTP client used to drive and verify every endpoint without a frontend.           |

Each domain lives under `src/modules/<name>` and follows the same layering:
routes, controller, service, repository, db. That keeps every module easy to
read and test on its own.

---

## The Automation Engine

The automation engine (`src/modules/automation-engine`) is the core of Sprinkle.
It is not one script. It is a group of small engines, each with a single job,
wired into one pipeline by the `TwentyFourHourAutomation` orchestrator.

```
automation-engine/
├── github-explorer/    → Discovery: search & fetch candidate repositories
├── depends/            → Shared brain: prompt building, mapping, validation, dedupe
├── saving-engine/      → Persistence: idempotent insert / update / delete
├── filtering-engine/   → Self-maintenance: prune stale, low-value entries
├── algorithm-engine/   → Curation: latest-N selection + engagement metrics
└── premium-engine/     → AI enrichment: Gemini security audit
```

### Pipeline Stages

```mermaid
flowchart TD
    A["1. DISCOVER\ngithub-explorer\nOctokit search + pagination"] --> B["2. DEDUPE\ndepends/github-search-utils\nskip repos already in fetched_repos"]
    B --> C["3. NORMALISE & VALIDATE\ndepends/extension-utils\nname · description · zip URL · categories"]
    C --> D["4. PERSIST\nsaving-engine\nidempotent insert, mark repo fetched"]
    D --> E["5. CURATE\nalgorithm-engine\nlatest 25 by created_at DESC"]
    E --> F["6. DELIVER\ndailyShowcase\npublic + premium (AI-enriched)"]
    D --> G["7. SELF-MAINTAIN\nfiltering-engine\nprune stale rows"]
    F --> H["AI ENRICHMENT\npremium-engine\nGemini security audit"]
```

1. **Discover.** `github-explorer/api-engine.ts` uses `@octokit/rest` to run a
   tuned repository search, paginating up to 5 pages of 100 and short-listing
   eligible items.
2. **Dedupe.** Each candidate is checked against the `fetched_repos` ledger and
   existing extensions (`isRepoAlreadyProcessed`) before any work happens.
3. **Normalise and validate.** `depends/extension-utils.ts` builds the GitHub
   archive (`.zip`) download URL, infers categories from repository topics
   (`topics-library.ts`), and enforces quality gates: a non-empty name and
   publisher, a description of at least 10 characters, and a valid
   `github.com/.../archive/refs/heads/*.zip` link.
4. **Persist.** `saving-engine/save-service.ts` inserts validated extensions,
   skips duplicates by `(name, developer)`, and records the source repo as
   fetched. It returns a typed tally: `{ inserted, failed, skipped, failures }`.
5. **Curate.** `algorithm-engine` selects the latest 25 extensions
   (`ORDER BY created_at DESC LIMIT 25`) and tracks engagement (`views`,
   `downloads`, `amountDisplayed`).
6. **Deliver.** `dailyShowcase` stores the day's selection and serves it through
   `/showcase` (public) and `/showcase/premium` (enriched, gated).
7. **Self-maintain.** `filtering-engine` prunes stale entries, covered below.

### Dual-Tier Output: Basic vs. Premium

Sprinkle produces two tiers from the same discovered candidates. The premium
tier never re-searches GitHub. It reuses the shared candidate set and passes it
through the AI.

|                   | **Basic tier**            | **Premium tier**                                               |
| ----------------- | ------------------------- | -------------------------------------------------------------- |
| Source            | Raw GitHub metadata       | Same candidates plus AI enrichment                             |
| Category          | Inferred from repo topics | Chosen by the AI from a fixed taxonomy                         |
| Description       | Repository description    | Rewritten, plain-language summary                              |
| Trust signal      | `not_verified`, 0%        | `verificationPercentage` (0 to 100), `verified` at 80 or above |
| Permissions       | Not resolved              | Read from `manifest.json` or inferred from code                |
| `extensionStatus` | `basic`                   | `premium`                                                      |
| Cost              | Free                      | Requires an active subscription                                |

**The AI security audit.** `premium-engine/ai-engine/gpt.engine.ts` wraps a
`GeminiBrowsingProvider` (model `gemini-2.0-flash`, with the `urlContext` and
`googleSearch` tools) behind a `GithubAIEngine`. For each candidate it sends a
structured prompt (`depends/gpt-automation.ts`) that tells the model to act as a
security auditor and weigh:

- **Permission-to-function alignment** (heaviest weight): are the requested
  permissions reasonable for what the extension says it does?
- **Transparency and documentation**: README, license, readable source.
- **Community trust signals**: stars, forks, watchers.
- **Activity and maintenance**: how recent the commits are. An abandoned repo
  that asks for broad permissions is a red flag.
- **Suspicious indicators**: obfuscated code, unclear external data requests, or
  a description that does not match the code.

The model must reply with strict JSON. `depends/ai-response-mapper.ts` parses
it, sanitises it (permissions mapped through a manifest-permission dictionary,
categories constrained to the enum, the percentage clamped between 0 and 100),
and validates it before it is accepted. The engine runs candidates in batches of
3 with up to 2 retries each and discards anything that fails to parse, so one bad
response cannot corrupt the catalogue.

### Scheduling & Orchestration

`TwentyFourHourAutomation` (`src/modules/twentyFourHour/extension-automation.ts`)
binds the pipeline to Bun cron jobs. It runs as a global generator with no user
context: it builds the shared pool that every client reads from.

| Job        | Schedule          | Cron        | What it does                                                           |
| ---------- | ----------------- | ----------- | ---------------------------------------------------------------------- |
| **Hourly** | Top of every hour | `0 * * * *` | Discovers and saves new extensions, then prunes stale ones.            |
| **Daily**  | Midnight          | `0 0 * * *` | Reads the latest 25 extensions and records them into `daily_showcase`. |

Some details worth noting:

- **Per-step error isolation.** Insertion and cleanup run in separate `try/catch`
  blocks, so a failure in one does not abort the other. Errors collect into a
  typed `HourlyJobResult.errors` array.
- **Typed results.** `InsertionResult`, `CleanupResult`, `HourlyJobResult`, and
  `DailyJobResult` make every outcome explicit and easy to log.
- **Logging.** Each run logs a start line and a completion summary with
  `duration`, `inserted`, `failed`, `skipped`, and `deleted` counts.
- **Clean shutdown.** `stopCronJobs()` is wired to `SIGINT` and `SIGTERM`, so the
  process stops between runs instead of being killed mid-job.

### Self-Maintenance Loop

The catalogue prunes itself. Each run, `filtering-engine` deletes up to 10 rows
that match all of these:

- `amountDisplayed >= 5`: it has been shown to users several times,
- `downloads = 0`: nobody downloaded it,
- `views = 0`: nobody opened it.

`amountDisplayed` goes up every time an extension appears in the curated set, so
uninteresting entries age out on their own while anything a user has touched is
kept. The showcase stays fresh with no manual moderation.

### Idempotency & Deduplication

A job that runs every hour must not insert duplicates. Sprinkle guards against
this at three layers:

1. A **`fetched_repos` ledger** records every repository full name already
   processed, so repeat searches skip known repos before doing any work.
2. A **unique `(name, developer)` index** on `extensions` makes duplicate rows
   impossible at the database level.
3. The **saving engine** checks for an existing row, counts it as `skipped`
   rather than `failed`, and always marks the repo as fetched afterwards.

---

## Tech Stack

| Layer            | Technology                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Runtime          | [Bun](https://bun.com) v1.3.13+ (all-in-one runtime, bundler, cron, test runner) |
| Language         | TypeScript (`strict`)                                                            |
| HTTP framework   | [Elysia](https://elysiajs.com) v1.4.28 (plus `@elysiajs/cors`, `@elysiajs/jwt`)  |
| Database         | PostgreSQL 16 (via `docker-compose`, exposed on host port `5433`)                |
| ORM & migrations | Drizzle ORM v0.45.2 + Drizzle Kit                                                |
| DB driver        | `pg` v8.21.0                                                                     |
| Auth             | `jsonwebtoken`, `bcrypt`, httpOnly cookies with rotating refresh tokens          |
| Validation       | Zod v4 (services/CLI) + TypeBox (`t`) at the HTTP edge                           |
| GitHub API       | `@octokit/rest` v22                                                              |
| AI engine        | Google **Gemini** (`gemini-2.0-flash`) with browsing and search tools            |
| Payments         | `midtrans-client` v1.4.3 (subscriptions + signed webhooks)                       |
| Config           | `dotenv`                                                                         |

---

## Project Structure

```
sprinkle/
├── cli/                     # HTTP client used to drive & verify every endpoint
│   ├── commands/            # auth, extensions, metrics, payment, showcase, smoke
│   └── lib/                 # args, config, http, session, output helpers
├── drizzle/                 # Generated SQL migrations + snapshots
├── src/
│   ├── db/                  # migrate.ts, seed.ts (idempotent dev seed)
│   ├── gateway/             # Elysia app entry (index.ts) + CORS plugin
│   ├── middlewares/         # auth, builder role, premium gate, cookie policy, errors
│   ├── modules/
│   │   ├── auth/            # register / login / refresh / roles
│   │   ├── automation-engine/   # the discovery + AI + persistence pipeline
│   │   ├── dailyShowcase/   # daily & premium showcase delivery
│   │   ├── manual-ekstension/   # builder CRUD + search
│   │   ├── payment-gateway/ # Midtrans plans, subscriptions, webhooks
│   │   └── twentyFourHour/  # cron orchestrator for the automation engine
│   └── types/               # shared type declarations
├── tests/                   # Bun test suite (auth, automation, search, payment)
├── config.ts                # centralised env-derived configuration
├── docker-compose.yml       # local PostgreSQL 16
├── drizzle.config.ts        # Drizzle Kit configuration
└── package.json             # scripts & dependencies
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.com) **v1.3.13+**
- [Docker](https://www.docker.com) for PostgreSQL, or any local PostgreSQL 16
- A **GitHub personal access token** (for discovery)
- A **Gemini API key** (for premium AI enrichment)
- **Midtrans** server and client keys (for payments)

### 1. Install dependencies

```bash
bun install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL 16 as `postgres-sprinkle`, mapping host port **5433** to
container port 5432, database `sprinkle_extension`.

### 3. Configure the environment

Create a `.env` file at the project root (see
[Environment Variables](#environment-variables)). The database URL matching the
bundled compose file is:

```env
DATABASE_URL=postgres://postgres:password@localhost:5433/sprinkle_extension
```

### 4. Run migrations

```bash
bun run migrate
```

### 5. Seed reference data (optional but recommended)

```bash
bun run seed
```

The seed is idempotent. It creates the `basic`, `pro`, and `premium` plans plus
a premium demo account holding an active subscription, so premium endpoints can
be exercised without going through Midtrans:

```
email:    premium_demo@sprinkle.local
password: premium123
```

### 6. Start the HTTP gateway

```bash
bun run dev
```

The API is now available at **http://localhost:3000**.

### 7. Start the automation (separate process)

```bash
bun run automation
```

---

## Environment Variables

| Variable                 |     Required     | Default                 | Purpose                                             |
| ------------------------ | :--------------: | ----------------------- | --------------------------------------------------- |
| `DATABASE_URL`           |       Yes        | none                    | PostgreSQL connection string.                       |
| `JWT_SECRET`             |       Yes        | none                    | Signing secret for access tokens.                   |
| `SECRET_KEY`             |       Yes        | none                    | Application secret.                                 |
| `GITHUB_TOKEN`           | Yes (automation) | none                    | Authenticated GitHub API access for discovery.      |
| `GEMINI_API_KEY`         |  Yes (premium)   | none                    | Gemini key for the AI security-audit engine.        |
| `MIDTRANS_SERVER_KEY`    |  Yes (payments)  | none                    | Midtrans server key + webhook signature.            |
| `MIDTRANS_CLIENT_KEY`    |  Yes (payments)  | none                    | Midtrans client key.                                |
| `MIDTRANS_IS_PRODUCTION` |        No        | `false`                 | `"true"` to target Midtrans production.             |
| `API_BASE_URL`           |        No        | `http://localhost:3000` | Base URL used by internal metric calls.             |
| `CORS_ORIGIN`            |        No        | `http://localhost:5173` | Comma-separated list of allowed origins.            |
| `PORT`                   |        No        | `3000`                  | Reserved; the gateway binds `3000`.                 |
| `NODE_ENV`               |        No        | none                    | `production` tightens the default cookie policy.    |
| `COOKIE_MODE`            |        No        | derived                 | `local`, `same-origin`, or `cross-origin`.          |
| `COOKIE_SECURE`          |        No        | derived                 | Override the cookie `secure` flag (`true`/`false`). |
| `COOKIE_SAMESITE`        |        No        | derived                 | Override `SameSite` (`strict`/`lax`/`none`).        |

> When `COOKIE_MODE` is unset it defaults to `same-origin` under
> `NODE_ENV=production` and `local` otherwise.

---

## Running the Automation

```bash
bun run automation
```

On start you will see:

```
TwentyFourHour automation started (global generator: hourly basic+premium, daily export)
[cron] Scheduled hourly (0 * * * *) basic generation + cleanup and daily (0 0 * * *) showcase export
```

Each hourly run logs a completion summary, for example:

```
[hourly] Extension automation completed { duration: '4.2s', inserted: 6, failed: 0, skipped: 2, deleted: 3 }
```

Stop the process with `Ctrl+C` (`SIGINT`). The orchestrator stops both cron jobs
before exiting.

---

## API Reference

Base URL: `http://localhost:3000`. Protected routes require the session cookies
set by `/user/login` or `/user/register`.

### Auth (`/user`)

| Method  | Endpoint                            | Access | Description                                                          |
| ------- | ----------------------------------- | ------ | -------------------------------------------------------------------- |
| `POST`  | `/user/register`                    | Public | Create an account; sets `auth`, `accountId`, `refreshToken` cookies. |
| `POST`  | `/user/login`                       | Public | Authenticate; sets session cookies.                                  |
| `PATCH` | `/user/beBuilder`                   | Public | Upgrade an account to the `builder` role.                            |
| `GET`   | `/user/getUserByUsername/:username` | Public | Look up a user by username.                                          |

### Extensions (builder, `/extensions`)

Requires **auth** and the **builder** role.

| Method   | Endpoint                           | Description                     |
| -------- | ---------------------------------- | ------------------------------- |
| `POST`   | `/extensions/creating`             | Create an extension.            |
| `PATCH`  | `/extensions/:id`                  | Update an extension.            |
| `DELETE` | `/extensions/:id`                  | Delete an extension.            |
| `GET`    | `/extensions/search/by-name?name=` | Search by name (wildcard-safe). |
| `POST`   | `/extensions/search/by-category`   | Search by category.             |
| `POST`   | `/extensions/search/by-browser`    | Search by browser.              |

### Engagement metrics (`/extensions/:id`)

| Method | Endpoint                    | Description                      |
| ------ | --------------------------- | -------------------------------- |
| `POST` | `/extensions/:id/view`      | Increment the view counter.      |
| `POST` | `/extensions/:id/download`  | Increment the download counter.  |
| `POST` | `/extensions/:id/displayed` | Increment the displayed counter. |

### Showcase (`/showcase`)

| Method | Endpoint                            | Access              | Description                                                          |
| ------ | ----------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `GET`  | `/showcase?date=YYYY-MM-DD`         | Public              | The day's curated extensions (defaults to the latest showcase date). |
| `GET`  | `/showcase/premium?date=YYYY-MM-DD` | Auth + subscription | The same set, enriched live by the AI security engine.               |

### Payments (`/payment`)

| Method | Endpoint           | Access            | Description                                                  |
| ------ | ------------------ | ----------------- | ------------------------------------------------------------ |
| `POST` | `/payment/create`  | Auth              | Create a subscription/checkout for a plan.                   |
| `POST` | `/payment/refund`  | Auth              | Refund a payment.                                            |
| `POST` | `/payment/gateway` | Midtrans (signed) | Server-to-server webhook; verified with a SHA-512 signature. |

---

## Command-Line Interface

The CLI (`bun run cli`) is a self-contained HTTP client for driving the running
gateway. It is handy for verifying endpoints before the frontend exists.

```bash
bun run cli help            # list every command
bun run cli ping            # is the gateway up?
```

| Group          | Commands                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **auth**       | `register`, `login`, `logout`, `whoami`, `be-builder`, `user`                                                |
| **extensions** | `create-extension`, `edit-extension`, `delete-extension`, `search-name`, `search-category`, `search-browser` |
| **metrics**    | `metric-view`, `metric-download`, `metric-displayed`                                                         |
| **payment**    | `payment-create`, `payment-refund`, `payment-gateway`                                                        |
| **showcase**   | `showcase`, `showcase-premium`                                                                               |
| **system**     | `smoke` (aliases: `e2e`, `test-endpoints`), `ping`                                                           |

Global flags: `--api <url>`, `--session <path>`, `--json`, `--verbose/-v`,
`--help/-h`.

**End-to-end smoke test.** Runs the entire API surface in one pass:

```bash
bun run smoke
```

---

## Testing

Tests live in `tests/` and run on the Bun test runner.

```bash
bun test                 # run everything
```

| Script                    | Scope                                             |
| ------------------------- | ------------------------------------------------- |
| `bun run test`            | Full suite (`tests/`)                             |
| `bun run test:auth`       | Authentication flows                              |
| `bun run test:automation` | Automation engine behaviour                       |
| `bun run test:search`     | Extension search (includes LIKE-injection safety) |
| `bun run test:middleware` | Auth middleware scoping                           |
| `bun run test:payment`    | Payment webhook signature verification            |

---

## Data Model

Core tables (Drizzle schema under each module's `db/schema.ts`):

| Table                   | Purpose                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extensions`            | The catalogue. Unique on `(name, developer)`; tracks `views`, `downloads`, `amountDisplayed`, `extensionStatus` (`basic`/`premium`), and `verificationPercentage`. |
| `extension_categories`  | Extension to category (enum) join, unique per pair.                                                                                                                |
| `extension_permissions` | Browser permissions requested by an extension.                                                                                                                     |
| `fetched_repos`         | Dedupe ledger of already-processed repository full names.                                                                                                          |
| `daily_showcase`        | The extensions surfaced on a given calendar day (unique per extension/day).                                                                                        |
| `accounts`              | Users, roles (`users`/`builder`), verification status.                                                                                                             |
| `refresh_tokens`        | Rotating refresh tokens backing the auth middleware.                                                                                                               |
| `saved` / `inventory`   | Per-user saved items and inventory counters.                                                                                                                       |
| `plans`                 | Subscription tiers (`basic`/`pro`/`premium`) and pricing.                                                                                                          |
| `subscriptions`         | A user's plan subscription and status.                                                                                                                             |
| `payments`              | Midtrans transactions tied to a subscription.                                                                                                                      |

Migrations are generated by Drizzle Kit and applied with `bun run migrate`
(config in `drizzle.config.ts`; SQL under `drizzle/`).

---

## Error Handling Convention

The gateway has one global `onError` handler that turns every failure into a
single error shape, so clients only parse one format:

```json
{
  "success": false,
  "message": "Resource not found",
  "status": 404
}
```

Domain code throws a typed `AppError(message, status, { cause })`. The handler
maps `AppError`, Elysia `NOT_FOUND`, and `VALIDATION`/`PARSE` codes to the right
status, logs anything `5xx`, and hides internal details from the response.

---

## Security

- **Passwords** are hashed with `bcrypt` and never stored in plain text.
- **Sessions** use short-lived JWT access tokens (15 minutes) in `httpOnly`
  cookies, plus rotating 7-day refresh tokens stored server-side. The `accountId`
  and `refreshToken` pair is checked (UUID format) before any DB query, which
  avoids cast-error 500s.
- **Cookie policy** is centralised and driven by env (`secure` and `SameSite`),
  so routes never hardcode transport security.
- **Role-based access.** A scoped `builderMiddleware` guards builder-only
  routes, and premium routes check for an active subscription.
- **Payment webhooks** are authenticated with a Midtrans SHA-512 signature over
  `order_id + status_code + gross_amount + SERVER_KEY`. A mismatch returns `403`.
- **Search safety.** Extension name search escapes SQL `LIKE` wildcards to
  prevent injection.
- **AI output is not trusted blindly.** Every model response is parsed,
  constrained to known enums, clamped, and validated before it is saved.

> **Note:** Elysia `derive` plugins default to _local_ scope. Sprinkle's auth and
> builder guards are marked `.as("scoped")` so they actually protect the routes
> that `.use()` them.

---

## License

This project is currently private (`"private": true` in `package.json`) and is
not published under an open-source license. All rights are reserved by the
authors. Contact the maintainers before redistributing or reusing any part of
this codebase.

---

<div align="center">

**Sprinkle** finds, checks, and serves browser extensions on a schedule.

</div>
