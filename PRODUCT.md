# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Stack

Expo (React Native) + TypeScript, in a pnpm + Turborepo monorepo (`apps/mobile`). Local Expo SQLite is the source of truth for the UI; a thin Vercel backend (`apps/api`) holds all secrets and talks to Neon Postgres, an OpenAI-compatible LLM, and Cloudflare R2. Side-loaded APK via EAS internal build — no Play Store. (Established codebase; recorded for design context, not a greenfield stack decision.)

## Users

A single user — the app's owner — tracking personal day-to-day expenses in Bangladesh. Situation: mid-activity, one-handed, often right after a purchase (at a shop counter, in a rickshaw, over lunch). The job: capture what was just spent in seconds and move on, then later review where the money went. Language is mixed Bangla + English, the way people actually speak and type here.

## Product Purpose

Make expense capture frictionless enough that it actually happens. The user types, photographs a receipt, or speaks; an LLM turns raw input into structured expense rows; the user confirms an editable draft; rows are saved locally and sync to the cloud. Success = capture feels instant and never blocked by network, and correcting the LLM is effortless. Beyond capture, the app answers "where did my money go this month?"

## Positioning

Three low-friction capture modes (text, receipt image, on-device voice) feeding one LLM-parsed, human-confirmed draft — offline-first, with the model never trusted blindly. Not a bank-linked aggregator and not a manual multi-field form: raw human input in, structured rows out, always reviewed before saving.

## Operating Context

- **Capture happens in the moment**, often offline, one-handed, in variable light (receipt photos indoors/outdoors).
- **Three capture surfaces**: typed text; receipt photo (compressed JPEG); voice (on-device STT, default `bn-BD`, Bangla + English + mixed — audio never leaves the device).
- **Draft review**: a single combined editable list across all parsed captures; edit or delete any row, then batch-save in one transaction.
- **Review over time**: expense list with month total and per-category breakdown.
- **Locale**: Asia/Dhaka. Timestamps stored UTC, displayed device-local. Relative dates ("yesterday", "lunch today") resolved at parse time.

## Capabilities and Constraints

- Offline-first: capture and CRUD work with no network; parse and sync require connectivity. A pending-count badge shows unparsed captures.
- Parse output is an **array** of expenses (a receipt with N line items → N rows sharing one `group_id`).
- Expense fields: amount, currency (default **BDT**, per-row, no FX conversion), category (LLM free-form text, not an enum), merchant, description, payment_method (nullable — cash/bKash/card/bank), source (text|image|voice), spent_at, receipt image (image-source rows).
- Sync: last-write-wins by `updated_at`; soft-delete tombstones; client-generated uuidv7 ids.
- Auth: single static bearer token; no multi-user, no accounts.
- Distribution: side-loaded APK, single device.

## Brand Commitments

No existing brand, logo, name lock, or palette. Working name "Expense Tracker." No binding visual constraints from the user yet — visual world is open and decided in the design phase. Voice should feel calm and unfussy; the app is a personal tool, not a hype product.

## Evidence on Hand

Full product plan in `README.md`. No real user expense data, screenshots, logos, or brand assets exist yet; sample/demonstration content in mockups must be authored and labeled synthetic, and real BDT amounts/merchants used in comps are illustrative.

## Product Principles

1. **Capture must never be blocked.** Offline-first; the network is a background concern, never a gate in front of the user.
2. **The LLM is a draft, not an authority.** Every parsed row is reviewed and correctable before it is saved.
3. **Seconds, not forms.** The fastest path from "I just spent money" to "it's recorded" wins over completeness of fields.
4. **Speak the user's language.** Mixed Bangla + English, BDT, Dhaka time — treated as the default, not an edge case.
5. **Personal and quiet.** One user, one device; the design serves focus and trust, not engagement metrics.

## Accessibility & Inclusion

Dark + light themes are both first-class and required. Accessible contrast required. Bangla and Latin scripts must both render cleanly at the type sizes used. One-handed reach and generous touch targets matter given the in-the-moment capture context.
