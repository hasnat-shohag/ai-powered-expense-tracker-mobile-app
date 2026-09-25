# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal, offline-first Android expense tracker for a single side-loaded user. You capture an expense by text, receipt photo, or voice; an LLM parses the raw input into structured rows; you confirm an editable draft; rows are written to local SQLite (the UI's source of truth) and later synced to Neon Postgres. `README.md` holds the full product spec and data model; `PRODUCT.md` holds the product principles used by the design phase.

## Commands

Run from the repo root; Turborepo fans tasks out across the three workspaces.

```bash
pnpm build       # tsc build/typecheck across all packages (respects ^build order)
pnpm typecheck   # tsc --noEmit everywhere — the primary correctness gate
pnpm test        # vitest run in every package
pnpm lint        # currently a no-op stub in every package (no linter configured)
pnpm dev         # persistent dev tasks (api: `vercel dev`)
```

Scope to one workspace with a filter, e.g. `pnpm --filter @expense/api test`, `pnpm --filter @expense/mobile typecheck`. Package names are `@expense/shared`, `@expense/api`, `@expense/mobile`.

Run a single test file with vitest directly in the package: `cd apps/api && pnpm exec vitest run llm.test.ts` (or `-t "<name>"` for one test).

Backend DB (Drizzle, run in `apps/api`): `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`. Needs `DATABASE_URL`.

Mobile: `cd apps/mobile && pnpm start` (Expo dev server) or `pnpm android`. `pnpm build` here is a Phase-13 stub; production builds go through EAS.

## Architecture

Three workspaces, one contract:

- **`packages/shared` (`@expense/shared`)** — the single source of truth. Zod schemas + inferred TS types (`schema.ts`) and the Drizzle table (`drizzle.ts`, re-exported as the `db` namespace). Both api and mobile import from here; changing an expense field starts here and propagates by typecheck.
- **`apps/api`** — Vercel serverless (Node runtime). Holds every secret. Endpoints: `api/health.ts`, `api/parse.ts` (LLM parse + R2 receipt upload), `api/sync.ts` (push/pull). `lib/` has `env`, `auth` (bearer check on every request), `db` (Neon via `@neondatabase/serverless` + Drizzle), `llm` (OpenAI-compatible, prompt + Zod-validate + retry — no provider JSON mode), `r2` (proxy upload).
- **`apps/mobile`** — Expo React Native. `src/db/` is offline-first SQLite (the `expenses` mirror plus local-only `pending_captures` and `outbox`; migrates lazily on first query). `src/capture/` writes raw input to the pending queue; `src/drain/` sends pending through `/parse` and produces a `Draft`; `src/sync/engine.ts` does push-outbox + pull-by-`updated_at`-cursor in one pass, last-write-wins, soft-delete. `src/screens/` (home/capture/draft/edit) implement the approved design from `DESIGN.md`.

Data flow: capture → `pending_captures` → drain through `/parse` → editable draft (LLM never trusted blindly) → save to local SQLite + append to `outbox` → background sync to Neon. Client generates uuidv7 PKs so offline rows have stable ids; timestamps stored UTC, displayed Asia/Dhaka.

## Conventions and gotchas

- **ESM everywhere with `.js` import specifiers on relative imports** (e.g. `import { requireAuth } from "../lib/auth.js"`) even though the files are `.ts` — required by `moduleResolution: "Bundler"`. Match this; a bare `../lib/auth` will not resolve consistently.
- **`@expense/shared` is consumed from source** — its `main`/`exports` point at `src/*.ts`, so consumers don't need it built first. It still has a `build` task for declaration output.
- **Mobile vitest runs only framework-free logic.** `apps/mobile/vitest.config.ts` has an explicit include-list (`src/format.test.ts`, `src/lib/amount.test.ts`); screen and DB code import RN/Expo native modules that don't load under Node. Do not add a component/db test to this Node run — those belong in the RNTL + Maestro suites (device/CI). Keep new pure logic in a testable module and add it to the include-list.
- **Mobile device code is typecheck-verified only.** There is no emulator here and it can't run headless. `pnpm typecheck` is the only automated check for screens, db, sync, and capture — donut/animation/native behavior is unverified. State this when reporting mobile work.
- **`src/format.ts` month-abbrev spelling is ICU-build-dependent** (Node "Sept" vs device "Sep"); its test asserts the Dhaka day-roll by regex, not exact glyphs.
- **Mobile navigation is a hand-rolled 4-route stack in `App.tsx`** (home/capture/draft/edit), no react-navigation. Returning to home bumps a `reloadToken` to refresh the ledger from SQLite.
- **No secrets in the app.** Backend env vars are listed in `README.md` (Environment/Secrets) and `turbo.json` `globalEnv`; the mobile app takes only the public backend URL (`app.json` → `expo.extra.apiBaseUrl`, read via `src/config.ts`) plus a bearer token entered in-app into SecureStore.

## Status

Phases 1–12 done (backend + design + full RN capture/draft/edit UI; `pnpm typecheck`, `pnpm test`, `pnpm build` green). Phase 13 (EAS internal APK + on-device RNTL/Maestro suites) is next. Design was produced via the `/impeccable` skill; artifacts live in `.impeccable/` and the design system is documented in `DESIGN.md`. Neon URL, LLM base/key/model, and R2 creds must be supplied before deploy/run.

## Custom Rule
- dont read or write .env file insted use .env.example file