# Maestro end-to-end flows

Device / CI only — Maestro drives the built APK on an emulator or physical
device, so these do not run in the headless dev environment. They are the
Phase 13 on-device suite referenced by the roadmap.

## Prerequisites

- A running Android emulator or a connected device with the app installed
  (`pnpm --filter @expense/mobile apk:preview`, then install the APK, or
  `pnpm --filter @expense/mobile android` for a dev build).
- Maestro installed: https://maestro.mobile.dev (`curl -Ls https://get.maestro.mobile.dev | bash`).
- The app configured on-device: open **Settings** (gear on Home), paste the
  `API_BEARER_TOKEN`, and confirm **Test connection** succeeds. `text_capture`
  needs the live backend because parsing goes through `/api/parse`.

## Run

```bash
maestro test apps/mobile/.maestro/text_capture.yaml
maestro test apps/mobile/.maestro/offline_capture.yaml
# or the whole folder:
maestro test apps/mobile/.maestro
```

`appId` in each flow is `com.personal.expensetracker` (see `app.json`).

## Flows

- `text_capture.yaml` — text capture → Review (parse) → Save → row appears on
  Home. Requires network + a configured token.
- `offline_capture.yaml` — capture queues while offline; asserts the capture is
  retained without a network round-trip (no Save, since parse needs the backend).
