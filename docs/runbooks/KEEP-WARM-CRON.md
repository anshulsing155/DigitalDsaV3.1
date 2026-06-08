---
type: runbook
epic: PERF
status: active
last_verified: 2026-06-03
owner: tech@digitaldsa.com
---

# Keep-warm cron — Vercel Hobby cold-start mitigation

## Why this exists

Vercel **Hobby plan kills any function that runs longer than 10 seconds**. When a
function instance is "cold" (idle for ~5-15 min, or just deployed), the first
request takes 1-3 extra seconds just for Node.js module loading + MongoDB
Atlas TLS handshake. On a 10s budget, that overhead can push real requests
into timeout territory — visible to users as 504 Gateway Timeout.

This runbook sets up an external cron that hits `/api/cron/keep-warm` every few
minutes to keep the function pool warm.

## What the keep-warm endpoint does (and doesn't)

**`GET /api/cron/keep-warm`** (implemented at `src/routes/api/cron/keep-warm/+server.ts`):

- Returns JSON `{ ok: true, ts, db: "ok" | "skipped" | "error" }` in ~10ms
- When called with the secret header, issues ONE Mongo `ping` admin command
  to keep the connection pool warm
- Without the secret, returns OK immediately (function still wakes up, but
  no DB work — anti-abuse)
- Does NOT verify CSFLE, Razorpay, SES, ImageKit, or other downstreams.
  This is keep-warm, not a comprehensive health check.

## Authentication — unified with the cron-endpoint pattern (S221+1)

The keep-warm endpoint reuses the **same `CRON_SECRET` + `x-cron-secret`
header** that protects every `/api/cron/*` endpoint. One secret to rotate,
one pattern across the whole cron surface. Prior versions of this runbook
introduced a separate `HEALTH_PING_SECRET` / `x-warm-secret` pair; that
was retired during the unification.

If `HEALTH_PING_SECRET` is still set on Vercel from the old setup, it's
dead — safe to unset whenever convenient (no production code reads it).

## One-time setup (automated)

The `scripts/setup-cron-jobs.mjs` script now provisions the keep-warm
entry alongside the existing billing crons. Idempotent — re-runs update
the existing entry rather than duplicating.

### Prerequisites

These should already be in place from the billing-cron setup. If not, see
`docs/runbooks/D1-S3-CRON-JOB-ORG-SETUP.md`:

- `CRON_SECRET` in `.env` AND in Vercel env vars (Production + Preview).
  Must be ≥32 chars per Pitfall #60.
- `CRON_JOB_ORG_API_KEY` in your shell env (generated at
  cron-job.org → Profile → API).

### Run

```powershell
$env:CRON_JOB_ORG_API_KEY = '<your cron-job.org API key>'
node scripts/setup-cron-jobs.mjs
```

The script reads `CRON_SECRET` from `.env`, lists existing cron-job.org
jobs, and upserts each entry by `title`. The `keepwarm-health` entry uses
GET (not POST like the billing crons) with `x-cron-secret` header and
8-second timeout.

After upsert, the script curls each endpoint as a verification probe.
For the keep-warm probe you want to see `db=ok` in the response body —
that confirms the secret matched and the Mongo ping landed.

### Schedule

The keep-warm spec in `setup-cron-jobs.mjs` provisions:

| Field | Value |
|---|---|
| Schedule | Every 4 minutes |
| Hours | 09:00 – 22:59 IST |
| Days | Mon – Sun |
| Timezone | Asia/Kolkata |
| Method | GET |
| Header | `x-cron-secret: <CRON_SECRET>` |
| Timeout | 8 seconds |

Business-hours-only halves the Vercel function-invocation burn — ~6,300
fires/month (14 hours × 15 fires/hour × ~30 days) vs ~10,800 for 24/7.

### Verify

After the script finishes, check cron-job.org's dashboard — the
`keepwarm-health` entry should appear with "next run" inside 4 min.
Once it fires, click into the history and inspect the response body:

- `{ "ok": true, "ts": "...", "db": "ok" }` → **working**. Secret matched,
  Mongo ping landed.
- `{ "ok": true, "ts": "...", "db": "skipped" }` → secret mismatch. Check
  the header value in cron-job.org matches `CRON_SECRET` in Vercel exactly.
- `{ "ok": true, "ts": "...", "db": "error" }` → endpoint reached Mongo but
  the ping failed. Check Vercel function logs (`rinn` project → Functions
  → `/api/cron/keep-warm`).
- `5xx` from cron-job.org → function is dead or the deploy is mid-flight.
  Check Vercel function logs.

## Trade-offs (per the 2026-06-02 explainer to the owner)

- **Burns Vercel quota.** ~3,500 of your 100K monthly invocations on
  business-hours-only schedule. Acceptable for now; revisit when traffic grows.
- **Doesn't help concurrent requests.** Only one function instance stays
  warm. If 5 DSAs submit simultaneously, 4 still hit cold starts.
- **Doesn't help heavy work.** A complex case still takes ~8s of real
  compute. Keep-warm only buys back the cold-start overhead.
- **Pollutes analytics.** Every dashboard sees "ghost traffic" from the
  cron. Filter `path = /api/cron/keep-warm` to hide it.
- **Adds a dependency.** Cron-job.org going down → no warming → next user
  request after that gets a cold start.

The real fix for sustained reliability is **Vercel Pro** ($20/mo, 60s
function limit). This runbook keeps you running until then.

## How to disable

- cron-job.org: disable or delete the job
- Vercel: unset `HEALTH_PING_SECRET` (the endpoint stays available but the
  DB ping just gets skipped — same behaviour as anonymous external pings)

## Related

- `src/routes/api/cron/keep-warm/+server.ts` — endpoint implementation
- `docs/PITFALLS.md` Pitfall #72 — "Promise.all in batch API routes"
- The cold-start fixes shipped 2026-06-02: commits `7a2e85c2`, `eac11c29`,
  `dc5b614e` (latency cuts on evaluate-and-persist + case-detail + snapshots)
