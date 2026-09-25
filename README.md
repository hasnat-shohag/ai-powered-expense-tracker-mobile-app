# Expense Tracker

A personal, offline-first expense tracker for Android. Capture expenses by **text**, **receipt image**, or **voice**; an LLM turns the raw input into structured rows, you confirm them, and they sync to a Neon (Postgres) database. Built for a single user, side-loaded, with a world-class UI.

## Goals

- Frictionless capture: type it, photograph a receipt, or speak it.
- LLM extraction into structured expense rows (amount, merchant, category, date, payment method).
- You review an editable draft before anything is saved — the LLM is never trusted blindly.
- Fully offline-first: capture and manage expenses with no network; everything syncs later.
- Secrets never live in the app. All LLM and database access goes through a thin backend.
- A design that feels premium, not a hobby CRUD app (see [Design](#design)).

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐         ┌──────────┐
│  Expo (React Native)     │  HTTPS  │  Vercel serverless (Node) │         │  Neon    │
│  apps/mobile             │ ──────► │  apps/api                 │ ──────► │ Postgres │
│                          │  Bearer │                           │ Drizzle │          │
│  - SQLite (source of     │  token  │  - POST /parse (LLM)      │         └──────────┘
│    truth for UI)         │         │  - POST /sync (push/pull) │
│  - Outbox + pending queue│         │  - Zod validation         │         ┌──────────┐
│  - FileSystem (images)   │         │  - R2 upload (proxy)      │ ──────► │ Cloudflare│
│  - On-device STT         │         │  - LLM (OpenAI-compatible)│         │    R2     │
└─────────────────────────┘         └──────────────────────────┘         └──────────┘
```

- **Local SQLite is the source of truth for the UI.** The app always reads/writes locally and stays instant and offline.
- The backend holds every secret (Neon URL, LLM key, R2 credentials) and is the only thing that talks to third parties.
- Sync reconciles local SQLite with Neon in the background.

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo (React Native), TypeScript |
| Backend | Vercel serverless functions, Node runtime |
| Database | Neon Postgres via Drizzle ORM + `@neondatabase/serverless` |
| Blob storage | Cloudflare R2 (S3-compatible) for receipt images |
| LLM | OpenAI-compatible endpoint (base URL + key), multimodal, swappable |
| Validation | Zod (shared schema, single source of truth) |
| Local store | Expo SQLite + Expo FileSystem |
| Speech-to-text | On-device (`expo-speech-recognition`), default `bn-BD` |
| Auth | Static bearer token (Expo SecureStore ↔ Vercel env) |
| Testing | Vitest, React Native Testing Library, Maestro |
| Distribution | EAS internal build, side-loaded APK |

## Data Model

Neon Postgres, defined in `packages/shared` via Drizzle. Local SQLite mirrors the `expenses` table and adds two local-only tables.

### `expenses` (Neon + local mirror)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | uuidv7, client-generated so offline rows have a stable id |
| `group_id` | uuid | Rows from one parse/receipt share this |
| `amount` | numeric | |
| `currency` | text | Default `BDT`, no FX conversion |
| `category` | text | LLM chooses freely (not an enum) |
| `merchant` | text | Original text preserved |
| `description` | text | |
| `payment_method` | text NULL | LLM extracts when mentioned (cash/bKash/card/bank) |
| `source` | text | `text` \| `image` \| `voice` |
| `raw_input` | text | Original input, kept for later re-parse |
| `receipt_key` | text NULL | R2 object key (image-source rows only) |
| `spent_at` | timestamptz | Stored UTC |
| `created_at` | timestamptz | Stored UTC |
| `updated_at` | timestamptz | Stored UTC, drives last-write-wins |
| `deleted_at` | timestamptz NULL | Soft-delete tombstone |

### Local-only tables (Expo SQLite)

- `pending_captures` — raw offline captures awaiting parse: `id`, `source`, `raw_text`, `image_path`, `created_at`.
- `outbox` — unsynced mutations on confirmed rows: `id`, `op` (create/update/delete), `expense_id`, `payload`, `created_at`.

### Time handling

All timestamps stored **UTC** (`timestamptz`). Rendered in device-local (Asia/Dhaka) only at display. The backend injects current time + timezone into the parse prompt so relative dates ("yesterday", "lunch today") resolve to an absolute UTC `spent_at`.

## Data Flows

### 1. Capture (works offline)

- **Text** — typed directly.
- **Voice** — on-device STT (`expo-speech-recognition`, default `bn-BD`, handles Bangla + English + mixed) transcribes to text on the phone; audio never leaves the device.
- **Image** — receipt photo compressed to JPEG (max ~1500px) and stored in Expo FileSystem.

Each capture is written to `pending_captures` locally. A badge shows the pending count.

### 2. Drain + Parse (requires network)

When online, all pending captures are sent to `POST /parse`:

- Image captures: backend uploads the JPEG to **R2** (proxy upload → returns `receipt_key`) and sends the image (base64) to the multimodal LLM.
- Text/voice captures: sent as text.
- The backend injects `now` + `Asia/Dhaka` into the system prompt.
- The LLM returns an **array** of expense objects (a receipt with 5 line items → 5 rows, sharing one `group_id`).
- Response is validated with **Zod**; on parse failure the backend retries, then surfaces a clear error.

### 3. Confirm

The app shows a single combined **editable draft list** across all parsed captures. You edit or delete any row, then **Save**. The LLM is never trusted without this review step.

### 4. Save

Saved rows are written to **local SQLite** (source of truth) and create-ops are appended to the `outbox`, in one transaction. The local pending image file is deleted.

### 5. Sync

`POST /sync` runs in the background:

- **Push**: drains the `outbox` (create/update/delete) to Neon.
- **Pull**: fetches remote rows changed since the last `updated_at` cursor.
- **Conflict**: last-write-wins by `updated_at` (single user, rare conflicts).
- **Delete**: soft-delete tombstones (`deleted_at`) propagate both ways; old tombstones purged periodically.
- **Triggers**: app foreground, network regained, debounced after a local mutation, and pull-to-refresh.

### 6. CRUD (offline-first)

List, edit, and delete all operate on local SQLite immediately and enqueue to the `outbox`. Edits/deletes made offline sync when the network returns.

## Security

- No third-party secret ever ships in the app. Neon URL, LLM key, and R2 credentials live only in Vercel env.
- The backend is a **public HTTPS endpoint**, so it is protected by a **static bearer token**: stored in Expo SecureStore on the device, set as a Vercel env var, and checked on every request. Any request missing/invalid is rejected. Token is rotatable.
- This is acceptable for a single-user, side-loaded app (low blast radius). If the token were to be a concern, upgrade to real auth later.
- Receipt images are uploaded through the backend (proxy), never with client-side R2 keys.

## Design

The UI is designed to a **world-class** bar using the **`/impeccable`** skill, not thrown together. Design is a first-class phase, not an afterthought.

- Run `/impeccable` to establish the visual direction (a chosen "world" / aesthetic), the design system (type scale, color, spacing, motion, component specs), and approved mockups **before** the screens are coded.
- The three capture surfaces (text, voice, image) and the draft-review list are the highest-craft screens — capture must feel instant and delightful; the draft list must make correcting the LLM effortless.
- Dark + light themes, accessible contrast, and consistent motion are requirements, not extras.
- Screens to design: Capture, Draft review (editable list), Expense list (+ month total + per-category breakdown), Edit/delete row, and empty/loading/error/offline states.

Design artifacts (mockups, `DESIGN.md`, tokens) are produced by the impeccable flow and then implemented in `apps/mobile`.

## Repo Layout

```
expense-tracker-app/
├─ apps/
│  ├─ mobile/            # Expo React Native app
│  │  ├─ src/
│  │  │  ├─ screens/     # capture, draft, list, edit
│  │  │  ├─ db/          # Expo SQLite: schema, migrations, queries
│  │  │  ├─ sync/        # outbox, pull/push, triggers
│  │  │  ├─ capture/     # text, voice (STT), image compression
│  │  │  └─ design/      # tokens + components from /impeccable
│  │  └─ app.json
│  └─ api/               # Vercel serverless
│     ├─ api/parse.ts    # LLM parse + R2 upload
│     ├─ api/sync.ts     # push/pull
│     └─ lib/            # llm client, r2 client, auth, db
├─ packages/
│  └─ shared/            # Zod schema + TS types + Drizzle schema
├─ turbo.json
├─ pnpm-workspace.yaml
└─ README.md
```

## Environment / Secrets

You supply these — I wire placeholders, you fill them.

**Backend (`apps/api`, Vercel env):**
```
DATABASE_URL=            # Neon Postgres connection string (pooled)
OPENAI_BASE_URL=         # OpenAI-compatible endpoint
OPENAI_API_KEY=          # LLM key (must be a multimodal model)
OPENAI_MODEL=            # e.g. a vision-capable model id
API_BEARER_TOKEN=        # shared secret checked on every request
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=      # optional, for serving stored receipts
```

**Mobile (`apps/mobile`):**
```
EXPO_PUBLIC_API_URL=     # deployed Vercel backend URL
# API_BEARER_TOKEN is entered once in-app and stored in SecureStore, not in env
```

## Testing (full pyramid)

- **Vitest** — Zod schema validation, `/parse` (happy + malformed LLM output + retry), `/sync` push/pull + last-write-wins + tombstones, outbox logic.
- **React Native Testing Library** — capture flow, draft-list editing, list screen.
- **Maestro** — end-to-end flows: text capture → confirm → save → appears in list; offline capture → reconnect → sync.

## Implementation Roadmap

Execute in order. Each phase ends in a runnable/verifiable state.

1. **Scaffold** — pnpm + Turborepo workspace; `apps/mobile` (Expo), `apps/api` (Vercel), `packages/shared`. Shared TypeScript config, lint.
2. **Shared schema** — Zod expense schema + TS types + Drizzle table in `packages/shared`. This is the contract both sides import.
3. **Backend: DB + auth** — Neon via Drizzle, migrations (`drizzle-kit`), bearer-token middleware. Health check endpoint.
4. **Backend: `/parse`** — LLM client (OpenAI-compatible), prompt (time/tz injection, Bangla+English, array output), Zod validation + retry, R2 proxy upload for images. Vitest coverage.
5. **Backend: `/sync`** — push outbox ops, pull-by-cursor, last-write-wins, soft-delete. Vitest coverage.
6. **Design (`/impeccable`)** — visual direction, design system, mockups for all screens + states. Approve before building UI.
7. **Mobile: local core** — Expo SQLite schema/migrations, `pending_captures` + `outbox`, uuidv7 ids, queries.
8. **Mobile: capture** — text, voice (on-device STT), image (compress + FileSystem). Writes to pending queue.
9. **Mobile: drain + draft review** — call `/parse`, combined editable draft list, batch save (local + outbox).
10. **Mobile: sync engine** — push/pull, triggers (foreground, network-regain, debounced, pull-to-refresh), conflict handling.
11. **Mobile: CRUD + analytics** — list, edit, soft-delete (offline-first), month total + per-category breakdown.
12. **Polish + tests** — implement approved design, RNTL + Maestro suites, error/offline/empty states.
13. **Ship** — EAS internal build, side-load APK.

## Prerequisites From You

Before build starts, provide: Neon connection string, LLM base URL + key + multimodal model id, R2 credentials (account id, bucket, keys), and choose the bearer token value. Design direction is decided during the `/impeccable` phase.




