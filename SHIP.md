# Shipping (Phase 13)

Everything below runs once, in order. The app is single-user and side-loaded —
no Play Store. You supply the secrets; none are committed.

## 0. Prerequisites

- An [Expo account](https://expo.dev) (free) for EAS builds.
- Neon Postgres database, an OpenAI-compatible multimodal LLM endpoint, and a
  Cloudflare R2 bucket.
- Node + pnpm installed; `pnpm install` run at the repo root.

## 1. Choose the bearer token

The backend and the app share one static token (see README → Security). Generate
a high-entropy value:

```bash
openssl rand -hex 32
```

Keep it — it goes into Vercel env (step 2) and is entered once in the app (step 6).

## 2. Deploy the backend (Vercel)

From `apps/api`:

```bash
cd apps/api
vercel link          # link to a Vercel project (first time)
```

Set env vars (production) — values from `.env.example`, never committed:

```bash
vercel env add DATABASE_URL production
vercel env add OPENAI_BASE_URL production
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_MODEL production
vercel env add API_BEARER_TOKEN production      # the openssl value from step 1
vercel env add R2_ACCOUNT_ID production
vercel env add R2_BUCKET production
vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_PUBLIC_BASE_URL production    # optional
```

Run the Neon migrations (needs `DATABASE_URL` locally, e.g. in `apps/api/.env`):

```bash
pnpm db:generate   # only if the schema changed
pnpm db:migrate
```

Deploy:

```bash
vercel --prod
```

Note the deployment URL, e.g. `https://expense-tracker-xxxx.vercel.app`.

Smoke-test auth + DB:

```bash
curl -H "Authorization: Bearer <token>" https://<your-deployment>/api/health
# -> {"ok":true,"db":"up",...}
```

## 3. Point the app at the backend

Edit `apps/mobile/app.json` → `expo.extra.apiBaseUrl` to the deployment URL from
step 2 (public origin only, no secret):

```json
"extra": { "eas": {}, "apiBaseUrl": "https://<your-deployment>.vercel.app" }
```

## 4. Build the APK (EAS)

```bash
cd apps/mobile
pnpm eas:login                 # once
npx --yes eas-cli build:configure   # first time — writes the EAS project id into app.json extra.eas
pnpm apk:preview               # internal-distribution APK (build profile in eas.json)
```

EAS runs the build in the cloud and returns a download URL for the `.apk`.
`apk:production` is the same with `autoIncrement` for versioned releases.

## 5. Install

Download the `.apk` from the EAS build page and side-load it (transfer to the
device and open it, or `adb install <file>.apk`). Android will ask to allow
installs from this source.

## 6. Configure the token in-app

Open the app → **gear (Settings)** on Home → paste the `API_BEARER_TOKEN` from
step 1 → **Save token** → **Test connection**. A green "Connected" confirms the
URL + token. The token is stored in the OS keystore (SecureStore), never in the
bundle. Rotate later by pasting a new value and updating the Vercel env.

## 7. On-device test suite (optional but recommended)

RNTL component tests and the Maestro e2e flows run on a device/emulator, not in
the headless dev environment. See `apps/mobile/.maestro/README.md`.

```bash
maestro test apps/mobile/.maestro
```

## Notes

- Local dev of the backend: `cd apps/api && vercel dev` with the same vars in a
  gitignored `apps/api/.env`; point `apiBaseUrl` at the dev URL or use
  `pnpm --filter @expense/mobile android` against it.
- The app is offline-first: captures and edits work with no network and sync
  when it returns. Only parsing (`/api/parse`) needs connectivity.
