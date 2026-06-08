---
type: reference
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Performance Budgets

Numerical budgets for the 5 dimensions tracked by `.claude/protocols/performance-review.md`.

**Status**: **Initial baseline** — these are starting values seeded from intuition + best-practice, NOT measured. First performance review (per the protocol) will measure the actual values and either confirm or re-baseline these budgets.

When a budget is breached and the cause is "the budget was unrealistic" rather than "the code regressed," update the budget here AND log the change in `docs/CHANGELOG.md` so the trail is durable.

---

## 1. Bundle size

JavaScript shipped to the client per route (initial chunk only — lazy chunks don't count).

| Route family | Budget (KB gzipped) | Notes |
|---|---|---|
| Landing pages (`/`, `/about`, etc.) | 80 KB | Public site, SEO-sensitive — must stay light |
| Login / auth flow (`/login`, `/onboarding/*`) | 100 KB | Pre-auth — only the form + redirect logic |
| DSA dashboard shell (`/dashboard/dsa`) | 220 KB | Layout + sidebar + main content frame |
| RM dashboard shell (`/dashboard/rm`) | 220 KB | Same shape as DSA |
| Admin dashboard shell (`/dashboard/admin`) | 250 KB | Slightly heavier — more controls + tables |
| Form route (`/form/<loanType>`) | 280 KB | Form wizard + 11 page components + state machine |
| Case detail (`/dashboard/dsa/cases/[case_id]`) | 240 KB | Tabs + offers + file builder |
| Policy-capture wizard (`/dashboard/rm/policy-capture/*`) | 260 KB | Multi-step + 6 editor components |

**Top-level rule**: any route with `+page.svelte` is in scope. If a route serves multiple loan types via dynamic params, measure the largest variant.

**Tooling**: `pnpm build --mode production` produces `.svelte-kit/output/client/_app/immutable/entry/*.js`. Per-route entry is named `<route>.<hash>.js`.

---

## 2. MongoDB ops per API request

Total ops (find, findOne, insertOne, updateOne, aggregate, etc.) in the synchronous request path of a single API call.

| Endpoint family | Budget (ops) | Notes |
|---|---|---|
| Read endpoints (`GET /api/cases`, `GET /api/dsa/leads`) | 4 ops | Auth-resolve + permission + main read + side-data |
| Single-write endpoints (`PATCH /api/cases/...`) | 5 ops | Auth + permission + read-current + write + audit-log |
| Compute endpoints (`POST /api/evaluate-and-persist`) | 8 ops | Auth + DSA + quota + payload-write + result-write + 2 audit |
| Cron endpoints (`POST /api/cron/*`) | 30 ops/batch-row | Cron batches; per-row budget |

**Tooling**: code-walk the handler + count `MongoClient.collection(...).<op>(...)` call sites. CSFLE auto-encrypt/decrypt does NOT count as separate ops.

**Smell**: any endpoint that's reading the same collection more than twice in one request — usually a missing JOIN or a Pitfall #6X await-in-loop.

---

## 3. Rule engine eval time

Wall-clock ms inside `evaluatePayload(payload)` end-to-end, including policy resolution, JSON-Logic evaluation, all 7 components, but EXCLUDING DB fetch of lender rule docs (those count toward §2).

| Loan type | Budget (ms p95) | Notes |
|---|---|---|
| Home Loan (typical case, 1 applicant) | 80 ms | Most-traffic loan |
| Home Loan (multi-applicant + guarantor + secured BT) | 200 ms | Worst-case shape |
| Plot Loan / LAP (1 applicant) | 80 ms | Comparable to Home |
| Personal Loan (1 applicant) | 60 ms | Smaller rule set |
| Business Loan (1 director, 1 company applicant) | 120 ms | Multi-applicant overhead |
| Business Loan (3+ directors + obligations) | 250 ms | Worst-case shape |
| Professional Loan (typical) | 90 ms | Similar to Home complexity |

**Smell**: any single rule taking > 20ms — usually an unnecessary loop or a JSON-Logic operator over a large array.

---

## 4. Page load (p95 across 7-day window)

Real-user metrics from production (Vercel Analytics → Web Vitals).

| Route | LCP budget (p75) | INP budget (p75) | CLS budget |
|---|---|---|---|
| `/` (landing) | 1.8 s | 100 ms | 0.05 |
| `/login` | 1.5 s | 100 ms | 0.05 |
| `/dashboard/dsa` | 2.0 s | 150 ms | 0.10 |
| `/dashboard/dsa/cases` | 2.5 s | 200 ms | 0.10 |
| `/dashboard/dsa/cases/[case_id]` | 2.5 s | 200 ms | 0.10 |
| `/form/home-loan` | 2.2 s | 200 ms | 0.10 |
| `/form/*` (other 5 loan types) | 2.5 s | 200 ms | 0.10 |
| `/dashboard/rm` | 2.0 s | 200 ms | 0.10 |
| `/dashboard/rm/policy-capture/*` | 3.0 s | 250 ms | 0.10 |

**Sources**: production = Vercel Analytics ≥ 7-day window. Synthetic = Lighthouse CI against `https://www.rinn.in` (must be Mobile profile, simulated Slow 4G).

---

## 5. Form responsiveness

Perceived lag between user input and reactive UI update — captured manually via Chrome Performance tab.

| Interaction | Budget (ms) | Notes |
|---|---|---|
| Text input typing → reactive update | 50 ms | Below human perception threshold |
| Single-select / radio click → next-button enable | 100 ms | Includes validation + completion check |
| Multi-select toggle (with `showWhen` auto-clear) | 100 ms | Pitfall #12 hot path |
| Adding a Director (modal open + commit) | 300 ms | Heavier — entity wiring |
| Switching loan-type or variant (state cleanup) | 500 ms | Worst-case acceptable for a page transition |
| Page navigation (Next button → next page) | 400 ms | Includes serialization + route load |

**Smell**: any input where the user sees the character appear AFTER they've typed the next one — that's > 80ms reactive lag, blocked main thread.

---

## Tracking trends

Each performance review produces a `docs/reviews/PERFORMANCE-REVIEW-YYYY-MM-DD.md`. Reviews should reference the prior review's numbers and call out deltas. `docs/reviews/INDEX.md` (auto-generated) lists all reviews sorted by date.

When a budget changes here, log the rationale in `docs/CHANGELOG.md` with prefix `perf-budget: <dimension>`.

---

## Calibration roadmap

1. **First measurement pass** (next major release prep): run the protocol, capture actuals, adjust this file's budgets to be realistic.
2. **Lighthouse CI** (after T3.1 lands): add a `.github/workflows/lighthouse.yml` that runs synthetic Lighthouse on each PR and warns on budget breach.
3. **Bundle-size diff bot** (post-launch): a pre-push hook (or CI step) that compares per-route bundle sizes against the previous commit and reports breakers.
