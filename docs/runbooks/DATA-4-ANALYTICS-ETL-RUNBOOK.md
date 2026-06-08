# DATA-4 — Analytics ETL Runbook

> Operating guide for the de-identified analytics warehouse ETL.
> Spec: [`docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md`](../specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md) §6–§8.
> Status: shipped server-side (Slices 1–6, 2026-05-20). **Dark by default** — does nothing until an operator enables it.

---

## What it does (one paragraph)

A job reads operational cases, strips each of identifying detail (bucketed
numbers, no names/contacts/PAN), and upserts the cleaned rows into a separate
`digitaldsa_analytics` MongoDB database that nothing else on the platform
touches. There are no dashboards in v1 — it just accumulates de-identified
history so future analytics has data to query. It is incremental (only
re-processes cases changed since the last successful run) and idempotent
(re-running is a safe no-op).

---

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `ANALYTICS_ETL_ENABLED` | to run | Must equal the literal string `'true'`. Anything else → the job is a pure no-op (no reads, no writes, no audit row). This is the master dark-launch switch. |
| `CRON_SECRET` | to trigger | Shared secret. The trigger must send it as the `x-cron-secret` header or the endpoint returns 401. |
| `ANALYTICS_PEPPER` | **not in v1** | Reserved for the future `person_id` bridge. `person_id` is `null` in v1 (the PAN isn't available for all cases — see spec §3 note), so the ETL does **not** read the pepper today. Set it only when per-applicant identity is added later. |

---

## Enabling in production (operator checklist)

1. Set `CRON_SECRET` in Vercel project secrets (if not already set for the
   other cron endpoints).
2. Set `ANALYTICS_ETL_ENABLED='true'` in Vercel project secrets.
3. Configure the scheduled trigger (see below).
4. Trigger one manual run and confirm an `analytics_etl_runs` row appears with
   `cases_processed > 0` (the first-run backfill).

The new database + collections (`analytics_cases`, `analytics_etl_runs`) and
their indexes auto-create on first write via `ensureIndexes()` — no manual
provisioning.

---

## Triggering the run

The endpoint is **`POST /api/cron/analytics-etl`**, authenticated by the
`x-cron-secret` header — the same convention as `/api/cron/data3-sweep` and
`/api/cron/data2-revoke-sweep`.

> **Why not a Vercel native cron entry in `vercel.json`?** Vercel's built-in
> Cron Jobs invoke the path with a **GET** request, but these data-pipeline
> endpoints are **POST** (a state-changing job shouldn't be a GET). That is why
> the repo has no `crons` block — DATA-2/DATA-3/DATA-4 are all driven by an
> **external scheduler** (e.g. cron-job.org, GitHub Actions, or an uptime
> monitor) that can send a POST with the secret header. Keep DATA-4 consistent
> with that pattern.

**Recommended schedule:** nightly at **02:00 IST** (low traffic). In UTC that
is **20:30 the previous day**, i.e. cron expression `30 20 * * *`.

**External scheduler call:**

```bash
curl -X POST https://<your-domain>/api/cron/analytics-etl \
  -H "x-cron-secret: $CRON_SECRET"
```

**Manual / debug run (same endpoint):** the curl above also serves as the
manual backfill trigger — the job figures out the cursor itself, so a manual
run on an already-current warehouse is a cheap no-op.

---

## Monitoring

Every run writes one row to `analytics_etl_runs`:

| Field | Read it to answer |
|---|---|
| `finished_at` (non-null) | Did the run complete? |
| `cases_processed` | How many rows were upserted. `0` is fine if nothing changed that day. |
| `cases_skipped` | Cases with no snapshot or an empty/undecryptable payload. |
| `cases_errored` | Cases that threw during transform (counted, never block the run). |

Watch for:
- **`cases_skipped` climbing** → CSFLE decrypt failures (missing/rotated DEKs).
- **`cases_errored` climbing** → schema drift in operational data vs.
  `buildAnalyticsCase`'s expectations.
- **No `analytics_etl_runs` row after a scheduled trigger** → the run threw
  before recording its audit row (check Vercel logs). Safe to re-trigger: the
  previous successful cursor is intact, so it reprocesses (upserts are
  idempotent).

---

## First-run backfill

The first-ever run has no prior cursor, so it processes **all** eligible cases
(everything except `is_sample` and `intake`-stage cases). On a large dataset
this run is longer than subsequent incremental runs — expected, one-time.

---

## What's NOT in v1

- `person_id` (unique-borrower counts) — see spec §3 note + the `AnalyticsCaseDoc`
  comment. The field and the `personIdFromPanHash` helper are ready plumbing.
- Several row fields are `null` by design (eligibility amount, EMI, interest
  band, property brackets, recommended banks) — see the spec §5 table.
- No admin UI for run history (spec Q8 — separate ticket).
- No standalone `scripts/run-analytics-etl.mjs` — the curl trigger covers
  manual runs for v1.
