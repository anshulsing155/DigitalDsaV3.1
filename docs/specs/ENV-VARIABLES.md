# Environment Variables Reference

**Last updated:** 2026-04-25 (Batch 5 of dashboard wiring sweep)

This document catalogs every environment variable the app reads. Use it as the authoritative source when populating `.env`, `.env.local`, the Vercel dashboard, or any deployment pipeline. Claude Code's dotfile policy blocks edits to `.env*` files, so this file is the canonical place to track required vars; copy entries into `.env.example` manually when shipping.

> Validation: see `src/lib/server/envValidation.ts` — required vars are checked once at server startup. Missing required vars fail fast with a clear log entry.

---

## Required (production must set, dev may override)

| Variable | Used by | Purpose | Failure mode if missing |
|---|---|---|---|
| `MONGODB_URI` | `src/lib/database/mongo.ts` | Atlas connection string | Connect throws, all DB-backed routes 500 |
| `JWT_SECRET` | `src/lib/services/jwtService.ts` | Sign/verify access + refresh tokens | All authenticated requests fail with invalid-token errors |
| `CSRF_SECRET` | `src/hooks.server.ts`, `src/lib/server/csrfTokens.ts` | HMAC for CSRF tokens | All POST/PATCH/PUT/DELETE return 403 |
| `OPENAI_API_KEY` | `src/lib/server/pms/aiPipeline.ts`, `deltaPipeline.ts` | PMS encode + delta parsing | RM encode/delta wizards fail at first AI step |
| `PMS_SIGNING_SECRET` | `src/lib/server/pms/signingKey.ts`, `adminImpersonation.ts`, `guards.ts` | HMAC for PMS OTP tokens + admin-impersonation cookies | Strict callers (admin impersonation) throw immediately. OTP path silently falls back to `CRON_SECRET` with a one-time warning — see *Cross-trust-domain risk* below. |
| `CRON_SECRET` | `src/routes/api/pms/cron/*` | Header check on `x-cron-secret` for scheduled cron callers | Cron endpoints return 401 |
| `MSG91_TOKEN_AUTH`, `MSG91_WIDGET_ID` | `src/routes/api/auth/send-otp/+server.ts`, `verify-otp` | Mobile OTP issuance | OTP send fails, login broken |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | `src/lib/server/imagekit.ts` | Document upload signing | Upload endpoint rejects requests |

## Required for billing (skip only in non-billing dev)

| Variable | Used by | Purpose |
|---|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `src/routes/api/billing/*` | Razorpay subscription create/verify + webhook signature |

## Required for email

| Variable | Used by | Purpose |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | `src/lib/server/email.ts` | Transactional email (login, OTP, notifications) |

> Note: see `docs/specs/EMAIL-HARDENING-PLAN.md` — Nodemailer SMTP is a Production Blocker (PB-8). Replace with SES/SendGrid/Resend before launch.

## Optional / Feature flags

| Variable | Default | Used by |
|---|---|---|
| `AI_PROVIDER` | `gemini` | `src/lib/server/aiService.ts` legacy admin parser. Set to `openai` to unify with PMS. |
| `AI_API_KEY` | — | Legacy parser key (separate from `OPENAI_API_KEY`). Will be deprecated when PMS Phase 8 ships. |
| `AI_MODEL` | provider default | Override model name for legacy parser |
| `LOG_LEVEL` | `info` (prod), `debug` (dev) | `src/lib/server/logger.ts` Pino level |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | — | Web push notifications. Subscription endpoint returns 503 if unset. |
| `NEWSLETTER_LIST_ID` | — | Optional Mailchimp/Sendgrid list segmentation |
| `DATA3_DELETION_ENABLED` | unset (off) | `/api/cron/data3-sweep`. Must be literal `'true'` to actually run deletions. When unset or any other value, the sweep loads candidates and logs queue depth but does NOT call ImageKit — dark-launch path per DATA-3 spec §3 invariant 6. See `docs/specs/DATA-3-FILE-DELETION-SPEC.md`. |

## Build-time

| Variable | Used by | Note |
|---|---|---|
| `PUBLIC_APP_URL` | Frontend SEO + canonical links | Public — exposed to client. Falls back to `https://digitaldsa.com` if unset. |

## SEC-2 — CSFLE field encryption

See `docs/specs/SEC-2-CSFLE-PLAN.md` for the design. All three vars are unset by default; the `csfleClient` factory returns null and the helpers passthrough plaintext until `CSFLE_ENABLED='true'` flips it on.

| Variable | Required | Used by | Purpose |
|---|---|---|---|
| `CSFLE_ENABLED` | No (gates the rest) | `src/lib/server/csfle/client.ts` | Set to literal `'true'` to enable CSFLE. When unset or any other value, the helpers passthrough plaintext (Phase A/B safety net). |
| `QE_LOCAL_MASTER_KEY` | Yes when `CSFLE_ENABLED='true'` | `src/lib/server/csfle/client.ts` | Base64-encoded 96-byte Customer Master Key. Generate with `node -e "require('crypto').randomBytes(96).toString('base64')"`. Independent keys per environment (prod / preview / dev). Never commit. Back up in a password manager separately from Vercel. The CMK is provider-agnostic — same bytes work for local KMS now and AWS KMS later. |
| `CSFLE_KEY_VAULT_NAMESPACE` | No | `src/lib/server/csfle/client.ts` | Override the default `encryption.__keyVault`. Only change for multi-tenant isolated vaults. |

---

## Cross-trust-domain risk: PMS_SIGNING_SECRET ← CRON_SECRET fallback

**Status:** Active fallback exists in `src/lib/server/pms/signingKey.ts:40-55` (`getPmsSigningKey()`). Strict callers (admin impersonation cookie signing via `getPmsSigningKeyStrict()`) already refuse to run without `PMS_SIGNING_SECRET`.

**Why it's a problem:** `CRON_SECRET` is sent as a bearer token to external cron schedulers (Vercel Cron, GitHub Actions). Anyone who observes one of those requests could forge PMS OTP tokens. The two secrets must live in different trust domains.

**Migration steps when ready to remove fallback:**

1. Generate a new high-entropy secret: `openssl rand -base64 48`
2. Add `PMS_SIGNING_SECRET=<new-secret>` to:
   - `.env.local` (dev)
   - Vercel project env vars (preview + production)
   - Any other deployment target
3. Deploy. Watch logs for the one-time warning to disappear.
4. Once you've confirmed all environments have the new secret, edit `src/lib/server/pms/signingKey.ts` to delete the fallback branch — make `getPmsSigningKey()` the same as `getPmsSigningKeyStrict()`.

Until step 4 ships, all 4 OTP/submit/onboard call sites remain on the fallback in environments that haven't provisioned `PMS_SIGNING_SECRET`.

---

## Two AI providers — pick one

The codebase currently has two AI integrations:

- `src/lib/server/aiService.ts` (legacy admin parser) — uses `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL`. Default is Gemini.
- `src/lib/server/pms/aiPipeline.ts` + `deltaPipeline.ts` (PMS encode + delta) — uses `OPENAI_API_KEY` directly.

**Recommended:** set `AI_PROVIDER=openai` and `AI_API_KEY=<your-OpenAI-key>` so both paths share one provider and one billing line. Legacy `aiService.ts` will be deprecated when PMS Phase 8 (evaluation engine wiring) ships — at that point this section becomes obsolete.

---

## Verifying your env at boot

`src/lib/server/envValidation.ts` exports `validateRequiredEnv()` which is called once from `src/hooks.server.ts` on the first request. It:

- Logs `[env] required variables OK` if all required vars are set.
- Logs `[env] missing required: VAR1, VAR2…` and throws on the first incoming request if any are missing.

To check from the CLI before deploying:

```bash
node -e "const { config } = require('dotenv'); config(); ['MONGODB_URI','JWT_SECRET','CSRF_SECRET','OPENAI_API_KEY','PMS_SIGNING_SECRET'].forEach(k => console.log(k, !!process.env[k]))"
```
