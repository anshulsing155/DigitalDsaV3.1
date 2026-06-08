# DigitalDSA — Architecture Evolution Roadmap

> **Purpose**: The long-term plan for making this codebase enterprise-grade and Capacitor-ready, captured as discrete work items with effort, risk, and protocol references. **This is the doc `/start` reads to know what's next.**
>
> **Updated**: 2026-06-04 (S223 session close — Production-down jsdom SSR incident resolved end-to-end via the durable architectural fix (replace `isomorphic-dompurify` with `sanitize-html`, eliminate jsdom from the SSR bundle). NEW **ADR-0031** codifies the "no browser-emulation libraries in the SSR bundle" architectural rule + NEW **Pitfall #74** + greps in PREFLIGHT-GREPS.md §74. This is a permanent architectural constraint, not a transitional workaround — it should never be sunsetted. SEC-10 single-session login enforcement Highway advanced: Commit A (`fafde97c`) + Commit B foundation + server (`88558fb5`) + Commit B UI (`974e2edf`) + post-B audit fix (`8cef9cea`) — all dormant behind `SESSION_ENFORCEMENT_KICK_ENABLED` env flag. Commit C remains (env-flag flip + session-status poll + KickedToast + ADR-0028 status flip). **🎉 AWS SES production-access GRANTED** (case `177987930900751`) — SEC-8 pops from deroute stack (was age 15). No items in the Active Roadmap below changed status this session — ADR-0031 is captured at the doc level only since it's an "always" rule, not a tracked work item with milestones.
>
> **Prior update (2026-06-02, S218 session close)** — **LEND-1 epic CLOSED end-to-end** across S217 + S218: all 4 phases shipped, ADR-0021 + ADR-0025 referenced, both lock tests linked, math + presentation surfaces live. LEND-1 row in the Active Roadmap table moved 🟢 in-flight → ✅ done. **ConfirmModal redesign popped from stack age 8** (forcing-function discharged); not a roadmap item but the longest-standing stack entry now gone. 2 open task chips cleared. 2 user-reported live bugs fixed same-session. **New ADR-0026** documents the 3-layer once-per-lifetime exposure marker pattern from the Product Guide fix — reusable for future "show once" features (NPS, onboarding hints). 8 commits all pushed to origin/main `5fe4327e`. +44 net tests (12,939 → 12,983), 0 errors, 0 warnings. Highway is OPEN — next pick per DEVELOPMENT-PLAN's S218 Next Up sequence (site slowness + single-session enforcement + audit follow-ups before PMS-schema). No other architecture-roadmap items changed status this session.
>
> **Prior update (2026-06-02, S206)** — Epic E + F majority shipped under the audit-implementation program. 11 commits, 234 net new tests (12,630 → 12,864). ✅ Epic E (Compliance) COMPLETE — E.1/E.2/E.3/E.4 + ADR-0023. ✅ Epic F (Growth) 4/5 COMPLETE — F.1/F.3/F.4/F.5; F.2 user-deferred. No architecture-roadmap cells changed; Epic E + F belong to the audit-implementation program tracked in DEVELOPMENT-PLAN.
>
> **Stale entries 🚨**: (none active — LEND-1 was the only escalated stale entry; it became the S217 Highway and shipped Phases 1-2. RM Questionnaire Pass 2 resolved to backlog S215 via owner option-(b).)
>
> **Prior update (2026-05-29)** — added FORM-4 + LEND-1. Long audit-and-design session triggered by team-reported Professional Loan no-offers bug. Two new ADRs: **ADR-0020** (four-field nomenclature) + **ADR-0021** (Plot & Equity as two-file purchase + LAP with 3-cap structure). FORM-4 (Loan field nomenclature alignment) was 🟡 ready; subsequently shipped end-to-end on 2026-05-31 via the hard-cutover rename. LEND-1 (Plot & Equity Loan Phases 2-4) remains 🟡 ready — now stale-escalated as noted above. Prior (2026-05-23 night) — closed F1 + C.7 PR-2 + Epic D opening with ADR-0014. Prior (2026-05-20): DATA-4 v1 COMPLETE. Prior (2026-05-19): DATA-1 + DATA-2 complete; SEC-5 R1 smoke; SEC-2 🟢 (operator backfills pending).
> **Branch**: `main` @ `31628d73` (post S206 — Epic E + F majority shipped under the audit-implementation program; no architecture-roadmap items changed status this session).
> **Scope**: Cross-cutting *architectural* improvements only. Per-feature work + session-by-session tactical roadmap live in [`DEVELOPMENT-PLAN.md`](DEVELOPMENT-PLAN.md). The historical 2026-04-04 audit-based phases live in [`DEVELOPMENT-ROADMAP.md`](DEVELOPMENT-ROADMAP.md) (superseded for architectural items by this file; product-feature items still tracked there).

---

## How To Use This Doc

1. **`/start`** reads §[Active Roadmap](#active-roadmap) to surface the next pending item.
2. **`/end`** updates item statuses (✅ done / 🟢 in-flight / 🟡 ready / ⚪ deferred) based on session outcomes.
3. **Per-item details** live in §[Item Catalog](#item-catalog). Each item carries effort, risk, dependencies, and a pointer to the protocol that executes it.
4. **Decisions** about each item (especially deferrals) are recorded as ADRs in [`docs/adr/`](adr/) and linked from the item.

---

## Status Legend

| Marker | Meaning |
|--------|---------|
| 🟢 in-flight | Work currently in progress in a worktree or session |
| 🟡 ready | Pre-flight clean, protocol exists, can be picked up next session |
| ⚪ deferred | Intentionally postponed (linked ADR or note explains why) |
| ✅ done | Completed (CHANGELOG entry references the session) |
| 🔴 blocked | Dependency or external decision required before progress |

**Priority**: P0 (production-blocker) · P1 (significant value, no blocker) · P2 (nice-to-have, opportunistic)

---

## Active Roadmap

**Next pending item pointer:** Sequencing now lives in ONE place — the **Unified Execution Order** in [`DEVELOPMENT-PLAN.md` → "Next Up"](DEVELOPMENT-PLAN.md). It merges this architecture roadmap with the `POST-AUDIT-IMPLEMENTATION` program into a single ordered backlog so `/start` reads one coherent next-action. **This file owns item *detail*; DEVELOPMENT-PLAN owns *order*.** **Current top of queue (2026-05-31, S207):** 🛣️ **TECH-DEBT-CLEANUP-2026-05-31** is the active Highway (owner-mandated, 15-item §3 inventory, 6 planned sessions). S207 advanced D13 (sidebar gates landed across 5 wizardSections, lock test still owed) + partial D14 (4 questionBank docstrings + 3 comment-fixes with ADR-0022 sunset triggers). S207 also caught 3 production-dead bugs off-plan (BT+Top-up dual-tenure gate, Plot & Equity payload patches, Plot Loan `confirmAndSubmit` arg) and added CLAUDE.md Hard Rules #14/#15/#16. Next session pickup options: (A) finish Sessions 1 + 4 of cleanup spec — ~60 min · (B) Session 2 prop rename `loanVariant` → `loanScope` — ~90 min · (C) stale escalation pickup (RM Questionnaire 9+ sessions 🚨 forcing-function CANNOT defer further / LEND-1 6 sessions 🚨) · (D) switch Highway entirely — F.2 Public eligibility checker / Epic G Integrations / Epic H i18n · (E) pop stack (ConfirmModal Age 3 blocked / SEC-8 Age 7+ external wait — owner can check AWS console). The architectural items below (DX-2, MOB-1/SEC-1/SEC-3, PERF-2, SEC-6, LEND-1, FORM-4) interleave into that order — don't re-sequence here. `DATA-4` is ✅ done. Epic E + F completion from S206 remains current state.

Operator-side DATA-4 items (not blocking code): set `ANALYTICS_ETL_ENABLED='true'` + `CRON_SECRET`, wire an external scheduler (POST, `x-cron-secret`, `30 20 * * *` UTC = 02:00 IST) — see `docs/runbooks/DATA-4-ANALYTICS-ETL-RUNBOOK.md`. `ANALYTICS_PEPPER` not needed in v1 (person_id null).

Operator-side items remain (not blocking code work): SEC-2 Phase C.2 backfills against prod / preview Atlas clusters (init-deks rerun + user + snapshot backfills + post-soak plaintext-drop). Use the new `scripts/sec2-init-deks-standalone.mjs` (Node-runnable, no Vite deps) or the original `.ts` script in Vite context.

After DATA-4 Slice 1, the natural next picks are: DATA-4 Slices 2-8 (~5 more working days for v1 case-feed-only ETL); more DX-4 batches (~111 routes left); DX-2 Zod schemas; PERF-2 streaming load (opportunistic per-page). MOB-1, SEC-1, SEC-3 remain higher-priority but deferred until an Android emulator session. PERF-3 is eligible for ✅ closure now that admin smoke is verified.

Sequenced by dependency-free quick wins first, then strategic migrations:

| Order | ID | Item | Status | Priority | Effort |
|-------|-----|------|--------|----------|--------|
| 1 | `DX-3` | MongoDB connection pool tuning | ✅ done | P1 | 5 min |
| 2 | `DX-1` | CI gating on `pnpm check` + tests | ✅ done | P1 | 30 min |
| 3 | `PERF-4` | Lazy-load pincode dataset by state | ✅ done | P1 | 4 hr |
| 4 | `PERF-5` | Audit `engineContext.js` 1.6MB bundle leak | ✅ done | P1 | 1 hr |
| 5 | `MOB-1` | Capacitor HTTP plugin adoption | 🟡 ready | P1 | 4 hr |
| 6 | `SEC-1` | Certificate pinning on Android | 🟡 ready | P0 | 4 hr |
| 7 | `SEC-3` | Verify Capacitor SecureStorage for tokens | 🟡 ready | P0 | 2 hr |
| 8 | `OBS-1` | Sentry client error tracking | ✅ done | P1 | 4 hr |
| 9 | `PERF-1` | `+page.server.ts` `load` for dashboards | ✅ done | P1 | per-page |
| 10 | `PERF-3` | TanStack Query (svelte-query) adoption | ✅ done (infra S103; pilot S103 admin/policies/[artifact_id]; +e2e-run S105; +NotificationBell.svelte S105; +test-runner Phase A+B 2026-05-19 — TestCard extraction reduces 659 → 200 lines, createQuery replaces 6 per-card setIntervals; +admin/policies/approvals 2026-05-19 resume — new /api/admin/policy-engine/parsing-status endpoint, page's setInterval+invalidateAll replaced by scoped createQuery with refetchInterval(count>0?10s:false). Re-scout post-approvals showed no further admin candidates; admin smoke verified zero idle polling — closed 2026-05-20.) | P1 | done |
| 11 | `DX-2` | Zod schemas at every API boundary | 🟢 in-flight (25 routes — S102 12 + S103 13: 6 legacy policy-engine + 7 admin/policies & settings & admins) | P1 | incremental |
| 12 | `SEC-5` | BOLA audit on parameterized routes | ✅ done (147 routes audited covering 100% of parameterized API + SSR-load surface; 3 BOLA fixes shipped — apply-delta S102 + rm/review GET+POST API Finding M1 S103 + rm/review SSR-load Finding R1 2026-05-19 resume; plus 5 defense-in-depth scopings + 1 HTML-injection escape + 1 admin-bypass divergence fix across S105; rm-contacts AD-04 crowdsource model confirmed; final SSR-loads batch 2026-05-19 resume — 23 +page.server.ts files covering admin/dsa/rm/share-link/team-invite surfaces) | P0 | done |
| 13 | `SEC-4` | Rate-limit coverage to 100% | ✅ done (8/8 critical auth routes hardened — S101 + S102) | P1 | incremental |
| 14 | `PERF-2` | Streaming `load` for slow data | 🟢 partially addressed (S220 — CSR-with-API-fetch pattern shipped on results page `be732a80`; 2-phase split shipped on submit endpoint `69d70ff7`; documented as reusable architecture in ADR-0029. Streaming `load` per SvelteKit's primitive remains 🟡 ready for other slow-data pages where SSR-with-streaming would be a better fit than full CSR.) | P2 | opportunistic |
| 15 | `SEC-2` | MongoDB field-level encryption for PII | 🟢 in-flight (Phase A CSFLE infrastructure shipped 2026-05-19 — src/lib/server/csfle/; Phase B 38 routes + 4 shared helpers wired in 14 commits. Pivoted from Atlas QE → CSFLE explicit per ADR-0009. Gated by CSFLE_ENABLED — no-op until operator runs `pnpm tsx scripts/sec2-init-deks.ts`. 2026-05-19 resume: M1 mobile-type fix; Phase C.1 user-collection backfill engine + CLI shipped (`backfill.ts` + `sec2-backfill-users.ts` + `csfleBackfillAudit` 90d TTL + 8 tests); Phase C.2 formSnapshots payload encryption Approach B shipped — new `payload-key` DEK, `snapshotCrypto.ts` helpers, dual-write at 2 insert sites, `snapshotBackfill.ts` + CLI, 12 tests; grep audit confirmed zero payload.X consumers. **Read-site migration COMPLETE** (commit `52bb024c` — every FormSnapshots.payload consumer goes through `resolveSnapshotPayload`; re-verified 2026-05-20: the only remaining direct `.payload` reads are LenderResultsSnapshots, out of scope. The earlier "7 sites remaining" note was stale). **Code-complete.** Remaining is OPERATOR-ONLY: init-deks rerun for payload-key + user/snapshot backfills on prod/preview Atlas.) | P0 | code done; operator backfills pending |
| 16 | `DX-4` | 159 routes from raw `json()` → `apiOk/apiError` | ✅ done (safe surface exhausted 2026-05-22 with ~80 routes migrated in batches `5f8a6f59`/`2f98d340`/`f715a7a5`/`f3c351fb`/`e51ffae3`/`b7c1c368`; "location boundary" carve-out closed 2026-05-23 PM with `2722847a`/`1d7f2992`/`19f16793` — `location/states|cities`+`pincodes` wrapped in `apiOk` with full consumer audit + 8 reads updated, live-verified in 6 form pickers; auth stragglers cleaned 2026-05-28 — `check-dsa` 9 `json()` → `apiOk` + login consumer unwrap, `signup` 1 `json()` → `apiOk(201)`; only `update-coins`/`demo-login` remain deliberately raw — low-value/missed-consumer risk) | P2 | done |
| 17 | `DX-5` | 30 routes from inline auth → `requireAuth*` guards | ✅ done | P2 | incremental |
| 18 | `SEC-6` | Vercel WAF / firewall rules | 🟡 ready | P2 | 4 hr |
| 19 | `FORM-1` | superforms for new forms | 🟡 ready | P2 | opportunistic |
| 20 | `FORM-3` | Pitfall #17 fix in ApplicantSelect / BooleanSelect / NewSelect | ✅ done | P2 | 1 hr |
| 21 | `OBS-2` | OpenTelemetry traces (request → DB → external) | ✅ done (S103 — SDK + MongoDB + Undici + manual root span + PII scrubber, off by default via OTEL_ENABLED) | P2 | multi-day |
| — | `SEC-7` | `.env` credential rotation (P0.1) | ⚪ deferred | P0 | 1 day |
| — | `SEC-8` | Nodemailer → SES + SPF/DKIM/DMARC (P0.2) | ✅ done (S225 2026-06-05 — pre-flip audit Option B shipped end-to-end: 5-element transactional footer module applied to OTP/invoice/dunning ×5; team-invite email template D wired with honest email_sent reflecting SES status; Notification Preferences + Close Account pages built; bounce TODO stub deleted (canonical webhook at /api/webhook/ses-bounce supersedes); 3 integrity gaps closed including delete-account Sessions revoke + replyTo→SES ReplyToAddresses verified. AWS case 177987930900751 approved 2026-06-04 — 50,000/day quota, 14 msg/sec, ap-south-1. Sender-side fully compliant with the 2026-06-01 v3 reply commitments.) | P0 | done |
| — | `SEC-9` | CSP `style-src` away from `unsafe-inline` | ⚪ deferred | P2 | 2 weeks |
| — | `FORM-2` | superforms for the 6 loan forms | ⚪ deferred | P2 | months |
| — | `PERF-6` | `@sveltejs/enhanced-img` | ⚪ deferred | P2 | 4 hr |
| — | `PERF-7` | Targeted `invalidate()` audit (30 sites) | ⚪ deferred | P2 | per-site |
| — | `PERF-8` | `Cache-Control` headers on stable data | ⚪ deferred | P2 | per-endpoint |
| — | `DATA-1` | DSA-attributed lead-routing vault (bucketed locality + price + DSA back-ref) | ✅ done (2026-05-19 afternoon — all 7 slices shipped: bucketing utilities + collection + POST/GET/DELETE endpoints + 3-pass routing query with k-anonymity suppression + privacy contract regression test. Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md; impl: src/lib/server/data1/ + src/routes/api/dsa/lead-vault/ + src/routes/api/lead-routing/match/) | P1 | done |
| — | `DATA-2` | BT/DC outreach vault (consented mobile + loan profile) | ✅ done server-side (2026-05-19 afternoon — all 9 slices shipped: foundation + collection + buildVaultEntry orchestrator + write/list/single/revoke/eligibility endpoints + UNAUTHENTICATED public self-revoke (HMAC-gated) + grace-period sweep cron + privacy contract regression test. Production rollout still gated on: SEC-2 operator backfills, `DATA2_TOKEN_PEPPER` env var, `DATA2_SWEEP_ENABLED` flag, Vercel cron entry, plus the case-close consent UI per spec §7 which is a separate ticket. Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md; impl: src/lib/server/data2/ + src/routes/api/dsa/btdc-vault/ + src/routes/api/public/consent-revoke/ + src/routes/api/cron/data2-revoke-sweep/) | P0 | done (server-side) |
| — | `DATA-3` | Original-file deletion after extraction (ImageKit) | ✅ implemented (gated off by default — `DATA3_DELETION_ENABLED='true'` flips it on; spec `docs/specs/DATA-3-FILE-DELETION-SPEC.md`; impl `src/lib/server/data3/`; cron `/api/cron/data3-sweep`) | P1 | done |
| — | `DATA-4` | Analytics warehouse v1 — de-identified case-feed ETL | ✅ done server-side (2026-05-20 — 8 slices + 1 fix, `3fdba220..94f2ac41`. Second DB `digitaldsa_analytics` (collections `analytics_cases` + `analytics_etl_runs`); de-id helpers (age/income bracket, industry, region tier); `buildAnalyticsCase` pure orchestrator; DI ETL job + `POST /api/cron/analytics-etl`; privacy-contract static scan; runbook. **Deviations from draft (reconciled in spec):** `person_id` null in v1 (PAN absent from payload + per-case attribution misleads on multi-applicant loans); §5 mapped to the real structured payload; 4 lender/eligibility fields null in v1 (backfillable later from immutable LenderResultsSnapshot — deferred per owner). Dark until `ANALYTICS_ETL_ENABLED='true'`. Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md; runbook: docs/runbooks/DATA-4-ANALYTICS-ETL-RUNBOOK.md) | P1 | done |
| — | `FORM-4` | Loan field nomenclature alignment — 4-field model across 6 loans + bank-loan-management API | 🟡 ready (owner-pinned next-session priority 2026-05-29. Multi-session rename: `loanName` (unchanged) / `loanType` (scope, consistent everywhere) / `facilityType` (renames `LAPType` + `unSecureLoanType`) / `loanVariant` (new field for Plot subproduct). Three-phase migration with dual-read transition + 30-day legacy shadow. Two-repo coordination with DigitalDSA-owned bank-loan-management API. Casing standardisation (PascalCase → camelCase) folded in. Closes Pitfall #33 class. Spec: docs/specs/LOAN-FIELD-NOMENCLATURE.md; decision: ADR-0020) | P1 | 3-5 days |
| — | `LEND-1` | Plot & Equity Loan modeling — 3-cap structure + 4-number offer card | ✅ done (closed S218 2026-06-02 — all 4 phases shipped across S217 + S218. Phase 1b/1c payload aliasing via ADR-0025; engine 3-cap math at `evaluationEngine.ts:1083-1180`; Phase 3 parser spec `LOAN_POLICY_PARSER_SPEC_V7.md` +309 lines (upfront framework + numbered §26-28 entries + table updates); Phase 4 offer card UI `LenderPlotEquityBreakdown.svelte` (additive) + net-new lender-offer-in-PDF infrastructure in `fileConfigurator.ts`; buyer-margin sub-note follow-up (2 new fields `plot_equity_market_value` + `plot_equity_registry_value`). 6 fields total on LenderEvaluation/LenderResult. Lock tests: `plotEquityCanonicalFields.test.ts` (14) + `plotEquity3CapEngine.test.ts` (22 after S218 +3) + `fileBuilderLenderOffer.test.ts` (5) = 41 LEND-1 tests. Math validated against gold-standard ₹1Cr/₹20L → ₹70L/₹18L/₹40L/₹42L ✓ and owner variant ₹1.4Cr/₹35L → ₹98L/₹31.5L/₹56L/₹52.5L ✓. PMS-authoring schema for per-lender X/Y/Z values deferred to backlog last-priority per owner direction at S218 /end. Spec: docs/specs/PLOT-EQUITY-LOAN-DESIGN.md; decisions: ADR-0021 + ADR-0025.) | P1 | done |
| — | `PERF-10` | Vercel function region pin to bom1 (Mumbai) — co-locate with Atlas | ✅ done (S229 2026-06-05, `38e664ed` — diagnosed via X-Vercel-Id showing `bom1::iad1::…` routing; functions ran in Washington DC (iad1) while Atlas Cluster0 is in Mumbai (ap-south-1); every Mongo call paid ~400ms cross-Pacific round-trip + ~400ms browser→function round-trip = ~800ms network overhead per request matching the observed ~700ms session-status responses. Fix: added `"regions": ["bom1"]` to vercel.json (Hobby plan supports single-region override; Pro supports multi-region). One-line change. After deploy: X-Vercel-Id became `bom1::bom1::…`; **measured TTFB dropped ~600ms → 63.58ms; total request time 130.58ms** (was ~700ms). ~82% reduction per API call across all endpoints. Pre-flight ruled out Pitfall #68 redux (CSFLE accidentally re-enabled) — owner confirmed no CSFLE* env vars set. Single-file reversibility via `git revert`. | P0 | done |
| — | `PERF-11` | Adaptive polling cadence + BroadcastChannel leader election for SEC-10 poller | ✅ done (S229 2026-06-05, `e747c193`, ADR-0033 — owner asked "is it good hitting same thing every 3 second?" after the region pin landed; triggered architectural conversation on push vs poll alternatives. Two AI architecture reviews converged on a hybrid design preserving owner's "kick immediately" UX for the post-login 2-min window where conflicts cluster, while reducing steady-state traffic ~80-95%. **Layer 1**: adaptive cadence — first 2 min after start → 3s (owner direction preserved); after 2 min focused → 5s (industry-standard active-but-idle); after 2 min hidden → 20s; visibilitychange + focus events → immediate poll. **Layer 2**: BroadcastChannel leader election — multiple tabs of same browser elect ONE leader via lowest-tabId protocol on `BroadcastChannel('digitaldsa.session-poller')`; followers receive revoke events via postMessage (sub-millisecond cross-tab, zero server cost); 30s heartbeat timeout triggers re-election if leader crashes; falls back to per-tab polling if BroadcastChannel unavailable. Hook-level revoke check in `hooks.server.ts` (security boundary) UNCHANGED — active users still kicked instantly. ADR-0033 captures full rationale, 4 alternatives considered (SSE/WebSockets/long-poll/Web Push all rejected for Vercel Hobby's 10s function cap), sunset trigger. 13 new lock tests. Reversibility: single-file revert restores pre-S229 flat-3s behavior. Spec: docs/adr/0033-adaptive-poll-leader-election.md. | P1 | done |
| — | `PERF-9` | Worker-thread per-lender rule-engine parallelism | 🟡 proposed (S228 2026-06-05 — ADR-0032 written as `status: proposed` (planning artifact, not committed to implementation). Captures the next big perf lever after F1-F6 + F9 captured the submit→results easy wins this session. Today phase-2 cold path is 4-6s, dominated by ~3-5s of sequential JSON-Logic / EMI / FOIR evaluation across ~30 lenders on Node's single thread. Proposal: fan out per-lender evaluation across a `worker_threads` pool (4-8 workers), aggregate on main thread — JSON-Logic is embarrassingly parallel per-lender, pure-CPU, no shared mutable state, so the speedup compounds. Estimated impact: 4-worker pool gives ~3.75× engine speedup → total user-perceived cold path 5.5-6.5s → 3-3.5s. 4-phase rollout each shippable independently behind `RULE_ENGINE_WORKERS_ENABLED` env flag: A. Extract per-lender evaluator (1 day, zero behavior change); B. Pool infrastructure (1 day, env-flag-gated); C. Wire in + output-equality soak (1-2 days, lock-tested against sequential baseline); D. Production flip (half day, instant rollback via env flag). 6 risks tracked with mitigations: output divergence (output-equality lock test); worker boot cost (~50-300ms cold, dwarfed by win); Vercel adapter compatibility (preview deploy validates); memory pressure (8 workers × 2-5MB policy index = 40MB max, fits 1GB limit); debugging difficulty (per-worker structured logs + env-flag fallback); worker crashes (graceful degradation as N-1 lenders). 5 alternatives considered (JIT-compile JSON-Logic — complementary; Vercel Pro — owner-vetoed; Render migration — ADR-0027 deferred; pre-compute cron — won't work for unique payloads; client-side — owner explicitly vetoed for competitive-moat reasons). 2-of-4 decision criteria for the go/no-go call: (1) cold-path submit→results consistently >5s; (2) lender count grows past 40; (3) Vercel Hobby cold-path approaches 9s; (4) Render migration rejected for >6 months. Spec: docs/adr/0032-rule-engine-worker-parallelism.md; supersedes ADR-0029's blanket "rejected for v1" with explicit reversal conditions.) | P2 | 3-5 days when criteria trigger |

---

## Item Catalog

Each item below has: **what** (concrete), **why** (problem today), **how** (protocol pointer), **effort**, **risk**, **dependencies**, **verification**.

---

### DX-1 — CI gating on `pnpm check` + tests

**What:** Husky pre-push hook + Vercel build configuration so that a commit fails to push (or fails to deploy) if `pnpm check` errors, tests fail, or contrast regresses.

**Why today:** Commit `c0cf8e18` shipped with 2 TypeScript errors that survived to `main`. Nothing blocks bad commits today. CLAUDE.md §5 "Done Checklist" is descriptive, not enforced.

**How:**
- Add `.husky/pre-push` that runs `pnpm check && pnpm test:unit -- --run --reporter=basic`
- Update Vercel build command to `pnpm check && pnpm build` so type-check failures block deploys
- Document the gate in `CLAUDE.md` §15 "Tooling Conventions"

**Effort:** 30 min · **Risk:** very low · **Dependencies:** none

**Verification:** Intentionally introduce a type error on a test branch; confirm `git push` is rejected.

**Protocol:** [`.claude/protocols/ci-gating.md`](../.claude/protocols/ci-gating.md) (write when picked up; small enough to inline in the session)

---

### DX-2 — Zod schemas at every API boundary

**What:** Every API endpoint (162 of them today) validates its request body via a Zod schema. The schema also generates the TypeScript request type. Same pattern for response shapes where it matters.

**Why today:** Most endpoints rely on `parseJsonBody<T>(request)` with a hand-written TypeScript type — the type is unchecked at runtime. Malformed payloads (old Android app version sending stale shape) produce 500s. Only ~5 endpoints (the new caseLock + a few PMS) use Zod.

**How:** Per-endpoint, per the protocol. Order: (1) define schema next to the handler, (2) `schema.safeParse(parsed.data)`, (3) return `apiValidationError(...)` on failure, (4) tighten the handler's type from the schema.

**Effort:** ~30-60 min per endpoint · **Risk:** low (validates input only — doesn't change happy path) · **Dependencies:** none

**Verification:** Send a malformed request via curl; expect 400 with structured error detail, not 500.

**Protocol:** [`.claude/protocols/zod-migration.md`](../.claude/protocols/zod-migration.md)

---

### DX-3 — MongoDB connection pool tuning

**What:** Add `maxPoolSize: 10` to the MongoClient options in `src/lib/database/mongo.ts`.

**Why today:** Default is 100 connections per app instance. On Vercel, each serverless function invocation is its own process. Under load (e.g., 50 concurrent functions), the system can hit MongoDB Atlas connection caps and start throwing 500s. The 100-default is sized for long-running processes, not serverless.

**How:** One-line change in the `MongoClient` instantiation options object.

**Effort:** 5 min · **Risk:** very low (each serverless function rarely needs >3 concurrent connections; 10 is generous) · **Dependencies:** none

**Verification:** Confirm pool size in MongoDB Atlas metrics dashboard post-deploy; no regression in p95 latency.

**Protocol:** Inline — too small for a dedicated file.

---

### DX-4 — Migrate 159 routes from raw `json()` to `apiOk/apiError`

**What:** Route handlers that currently use SvelteKit's `json()` to construct responses are migrated to `apiOk()`/`apiError()`/`apiServerError()`/`apiValidationError()` from `$lib/server/apiResponse.ts`. Result: every API response uses the same discriminated-union shape `{ success: true, data } | { success: false, error }`.

**Why today:** Inconsistent response shapes mean client code has to handle two patterns. The wrappers were added later; older routes still use raw `json()`. The 2026-05-13 review baseline reported "3 files" — actual count is 159.

**How:** Incremental per-route or per-folder. Often combined with DX-2 (Zod) and DX-5 (auth guards) since you're already in the file.

**Effort:** ~10-15 min per route · **Risk:** very low (mechanical translation) · **Dependencies:** consumer code should already handle the discriminated union (most does)

**Verification:** Spot-check client consumer of the migrated endpoint to ensure no shape regression.

**Protocol:** Bundled into [`.claude/protocols/zod-migration.md`](../.claude/protocols/zod-migration.md) (typically done together).

---

### DX-5 — Migrate inline `if (!locals.user)` to `requireAuth*` guards

**What:** ~30 routes that inline `if (!locals.user) return apiError('Auth required', 401)` are migrated to the canonical `requireRoleApi(locals, 'dsa')` / `requireAuthApi(locals)` guards from `$lib/server/guards.ts`.

**Why today:** Inline checks drift. A future permission change (e.g., team-member sub-roles) has to touch 30 places instead of one. Auth bugs in one inline check don't propagate to the others.

**How:** Per-route. Identify the inline check, replace with the guard helper, ensure error shape matches the rest of the codebase.

**Effort:** ~5 min per route · **Risk:** very low · **Dependencies:** none

**Verification:** Manually test the auth path on the migrated route.

**Protocol:** Bundled into [`.claude/protocols/zod-migration.md`](../.claude/protocols/zod-migration.md).

---

### PERF-1 — `+page.server.ts` `load` for dashboard initial data

**What:** Dashboard pages that currently `onMount(async () => fetch(...))` their initial data are migrated to a `+page.server.ts` `load` function that fetches server-side and ships data inside the SSR payload.

**Why today:** Most dashboard pages show a "Loading…" spinner for 300-800ms after first paint while a `secureFetch` resolves. The data could have shipped with the HTML.

**Premise re-verification (S101, 2026-05-15):** The cases listing (`/dashboard/dsa/cases`) — originally the most-cited example of this problem — **already has** a comprehensive `+page.server.ts` `load`. It runs the paginated case fetch, filtered count, and facet aggregation in a single `Promise.all`, builds derived per-case fields server-side, and ships everything via SSR. The `+page.svelte` reads `$page.data` directly, no `onMount`. Catalog estimate "per-page" remains correct, but the *scope* is narrower than originally stated.

**Actual remaining surface (49 dashboard `+page.svelte` files):** Pages that have a `+page.server.ts` for auth/layout context but still use `onMount` + `await secureFetch` for the main payload. Good pilot candidates are simple list pages with a single fetch:

- `dashboard/dsa/rm-contacts/+page.svelte` — flat list, single endpoint
- `dashboard/dsa/shared-links/+page.svelte` — flat list, single endpoint
- `dashboard/dsa/crm/leads/+page.svelte` — flat list with filters (similar shape)

Avoid as pilots: any `[case_id]/...` page (case context handled by layout load), `admin/qa` / `admin/testing/*` (complex state machines), `rm/policies/[lenderId]/[product]/...` (multi-step PMS wizards).

**How (per page):** (1) Create `+page.server.ts` next to the existing `+page.svelte` (or extend the existing one). (2) Move the fetch logic from `onMount` into `load` — call the underlying server function directly when possible rather than re-fetching the API endpoint over HTTP. (3) Read `data` prop in the component instead of local state. (4) Remove the `onMount` block. (5) Test the page works in both web SSR and Capacitor.

**Effort:** ~1 hr per page · **Risk:** medium (touches data-flow; can break a working page if `load` errors aren't handled) · **Dependencies:** `+error.svelte` boundary in the route group should exist (already added for `(app)` and `dashboard` 2026-05-14).

**Verification:** View page source; initial data should be in the HTML, not fetched after.

**Protocol:** [`.claude/protocols/load-migration.md`](../.claude/protocols/load-migration.md)

---

### PERF-2 — Streaming `load` for slow data

**What:** Pages where some data is fast and other data is slow use SvelteKit's streaming `load` — return a Promise from `load` for the slow data, so the page renders the fast data instantly and resolves the slow parts asynchronously.

**Why today:** Pages wait for the slowest query before rendering anything. The DSA cases page (with case list + monthly aggregation + RM directory) is the canonical candidate.

**How:** Per-page. Identify slow data sources, change `load` to return `{ fast: <value>, slow: <Promise> }`, use `{#await}` in the template.

**Effort:** ~1 hr per page · **Risk:** low · **Dependencies:** PERF-1 done for the page first.

**Verification:** Throttle network in DevTools, confirm fast data renders while slow data is still resolving.

**Protocol:** Bundled into [`.claude/protocols/load-migration.md`](../.claude/protocols/load-migration.md).

---

### PERF-3 — TanStack Query (svelte-query) adoption

**What:** Adopt `@tanstack/svelte-query` for client-side data fetching across dashboards. The `onMount + secureFetch + loading state + error state` pattern is replaced by `createQuery({ queryKey, queryFn })`. Provides automatic caching, dedup, retry, refresh-on-focus.

**Why today:** Same boilerplate copy-pasted across ~100+ components. Concurrent requests to the same endpoint aren't deduplicated. Navigation back to a recently-visited page re-fetches everything.

**How:** Multi-week rollout. (1) Install + configure QueryClientProvider in root layout. (2) Migrate one dashboard page as a reference example. (3) Per-component migration thereafter.

**Effort:** ~3 hr for setup + reference example; ~30-60 min per component · **Risk:** medium (changes data-flow; cache invalidation logic needs care after mutations) · **Dependencies:** PERF-1 should be done first for SSR-friendly hydration.

**Verification:** Navigate to a dashboard page, navigate away, come back — second visit should be instant (cache hit).

**Protocol:** [`.claude/protocols/tanstack-query-migration.md`](../.claude/protocols/tanstack-query-migration.md) (write when picked up).

---

### PERF-4 — Lazy-load pincode dataset by state

**What:** Split the single 3.5MB `pincode_IN_all.js` chunk into per-state chunks (~150KB each). Components load only the state(s) the DSA needs.

**Why today:** Every page that has pincode lookup ships the full national dataset. DSAs typically work in 1-3 states. 3.5MB on first launch over 4G is 15-30 seconds before the app is usable.

**How:** (1) Audit imports of the pincode dataset. (2) Split source into `pincode_IN_<state>.json` files. (3) Replace direct import with a dynamic `await import('./pincode_IN_${state}.json')` keyed by selected state. (4) Verify bundle splits.

**Effort:** ~4 hr · **Risk:** medium (touches a widely-used data file; missing states would break pincode UX) · **Dependencies:** none

**Verification:** `pnpm build` output shows ~28 small pincode chunks instead of one 3.5MB chunk. Network tab shows per-state chunks load on demand.

**Protocol:** [`.claude/protocols/pincode-lazy-load.md`](../.claude/protocols/pincode-lazy-load.md) (write when picked up).

---

### PERF-5 — Audit `engineContext.js` 1.6MB bundle

**What:** Investigate why the `engineContext.js` chunk is 1.6MB in the SSR bundle. Likely cause: rule engine code (server-only) is being imported by a route that ends up in the client bundle.

**Why today:** 1.6MB is suspicious. If it's leaking rule engine internals into the client bundle, that's both a perf issue AND a potential IP leak (rule engine is the moat per CLAUDE.md §2).

**How:** (1) Run `pnpm build`, inspect what's in `engineContext.js`. (2) Trace its import chain. (3) Identify the culprit (server file imported by a client route, or vice versa). (4) Move the import to the server-only side, or split with `noExternal` config.

**Effort:** 1-2 hr · **Risk:** medium (changing import boundaries can break SSR or client builds) · **Dependencies:** none

**Verification:** Bundle audit shows engineContext.js below 200KB (or removed from client bundle entirely).

**Protocol:** Inline — investigation, then targeted fix.

---

### PERF-6 — `@sveltejs/enhanced-img`

**What:** Replace raw `<img>` tags with the `<enhanced:img>` component that generates responsive `srcset` + WebP/AVIF + lazy loading.

**Why today:** Only 6 files use raw `<img>` today (already a small surface), but they're hero/landing images where size matters most. Enhanced-img gives ~50% file size reduction + responsive variants for free.

**How:** Install plugin, update vite.config, replace `<img>` with `<enhanced:img>` in the 6 files.

**Effort:** ~4 hr · **Risk:** low · **Dependencies:** none

**Verification:** Lighthouse audit shows smaller image payloads.

---

### PERF-7 — Targeted `invalidate()` audit (30 sites)

**What:** 30 sites use `invalidateAll()` which refetches every `load` function on the page. Many could use `invalidate('/api/specific-endpoint')` instead.

**Why today:** After a write, the entire page re-loads. If only one data source changed, the others are wasted refetches.

**How:** Per-site. Identify what actually changed, switch to targeted invalidate URL.

**Effort:** ~10 min per site · **Risk:** low · **Dependencies:** none

**Verification:** Network tab after a mutation shows only the relevant endpoint refetching.

---

### PERF-8 — `Cache-Control` headers on stable data

**What:** API endpoints serving relatively stable user data (DSA profile, lender list, RM directory) get `Cache-Control: private, max-age=60` so the browser/Capacitor can serve from cache during navigation.

**Why today:** Today most endpoints have `no-store`. Navigation between dashboard pages re-fetches the user profile every time. 60-second cache would eliminate 90% of those calls.

**How:** Per-endpoint. Identify endpoints where stale-for-60s is acceptable, add the header.

**Effort:** ~5 min per endpoint · **Risk:** low (60s staleness is conservative) · **Dependencies:** none

**Verification:** Network tab shows endpoints served from disk cache during navigation.

---

### MOB-1 — Capacitor HTTP plugin adoption

**What:** Install `@capacitor/http`. Configure `secureFetch` to use the native HTTP plugin when `Capacitor.isNativePlatform()`. Web continues to use browser `fetch`.

**Why today:** Android app currently calls APIs through the WebView's `fetch()` implementation, which goes through Android's WebView networking layer (slower, more CORS quirks, occasional cookie weirdness). Native HTTP uses OkHttp directly — 30-50% lower latency.

**How:** (1) `pnpm add @capacitor/http`. (2) Modify `secureFetch` in `src/lib/utils/csrf.ts` to branch on platform. (3) Test cookie + CSRF flow still works on Android.

**Effort:** ~4 hr (including Android emulator testing) · **Risk:** medium (changes core fetch path; web regression possible if branching is wrong) · **Dependencies:** none

**Verification:** Android app measurable latency improvement; web behavior unchanged.

**Protocol:** [`.claude/protocols/capacitor-http.md`](../.claude/protocols/capacitor-http.md) (write when picked up).

---

### SEC-1 — Certificate pinning on Android

**What:** Pin the production TLS certificate fingerprint in the Android app's network security configuration. The app refuses connections to any server presenting a different cert, even if the device trusts the issuing CA.

**Why today:** Standard HTTPS only. Anyone who can install a root CA on the user's device (corporate IT, malicious profile, attacker on coffee-shop WiFi) can MITM all API traffic — including the customer PII the DSA uploads (PAN, Aadhaar, bank statements).

**How:** (1) Get cert fingerprint(s) — current cert + the next CSR's planned cert. (2) Add to `android/app/src/main/res/xml/network_security_config.xml`. (3) Reference from `AndroidManifest.xml`. (4) Build cert-refresh playbook for cert renewal.

**Effort:** ~4 hr (including writing the refresh playbook) · **Risk:** medium-high (cert rotation must include app update; otherwise all installed apps break the day the cert rotates) · **Dependencies:** none, but pairs naturally with MOB-1.

**Verification:** Install mitmproxy as a custom CA on a test device; confirm the app refuses to connect when proxied.

**Protocol:** [`.claude/protocols/cert-pinning.md`](../.claude/protocols/cert-pinning.md) (write when picked up).

---

### SEC-2 — MongoDB field-level encryption for PII

**What:** Encrypt PII fields (PAN, Aadhaar, mobile, email, DOB, full name) at the MongoDB layer. Database stores ciphertext; app encrypts/decrypts via a KMS-managed key chain.

**Why today:** PII is plaintext in form snapshots. P0.1 (`.env` in git history) means historical credential leaks could be reachable. DPDP Act 2023 + RBI guidance treat Aadhaar/PAN as sensitive personal data requiring encryption at rest with application-managed keys (Atlas storage-level encryption isn't sufficient).

**Design pass shipped S103 → see [ADR-0005](adr/0005-mongodb-field-level-encryption.md).** The ADR resolves:
- **Approach:** MongoDB Atlas Queryable Encryption (QE) for searchable PII (mobile, email, PAN); application-level AES-256-GCM via existing `encryption.ts` for free-text fields. QE chosen over the older CSFLE because it's the modern API and supports equality queries.
- **KMS:** AWS KMS in Mumbai region (consolidates with SEC-8's SES adoption, India data-locality).
- **Migration phasing:** 4 phases over ~1 week — infrastructure (CMK + driver init), encryption-aware new writes, backfill of existing rows, read-path validation + cleanup.
- **Hard prerequisite:** SEC-7 (.env rotation) MUST be in flight or done first — otherwise historical credential leaks still reach the new ciphertext DB and FLE buys little.
- **Open decisions** for impl session: `fullName` mode (Mode 1 vs Mode 2), `Cases` collection embedded-snapshot strategy, PDF generator read path, test fixture DEK provisioning.

**Effort:** ~1 week implementation when picked up · **Risk:** high (touches every read/write of those fields; key loss = data loss) · **Dependencies:** SEC-7 done first.

**Verification:** DB shell with non-encrypted client returns ciphertext for marked fields; app with encrypted client returns plaintext transparently. CI test pins the contract per ADR-0005 Phase 3.

**Protocol:** [`.claude/protocols/mongodb-fle.md`](../.claude/protocols/mongodb-fle.md) (to be written at start of impl session — the ADR's Phase 0-4 checklist is the seed).

---

### SEC-3 — Verify Capacitor SecureStorage for tokens

**What:** Confirm the Android side stores access/refresh tokens in Android Keystore (via `capacitor-secure-storage-plugin`, which is already in `package.json`), NOT in `localStorage` / cookies / SQLite plaintext.

**Why today:** The `isNativePlatform(request)` branch in `check-dsa/+server.ts` returns tokens in the JSON response body. What happens after the Android side receives them is not currently audited in this codebase — we just shipped the server side. The archived `clientSession.ts` was writing to `localStorage` (PII exposure pattern); we need to confirm the production Android code doesn't.

**How:** (1) Locate the Android token-receive code (likely in an interceptor that calls `/api/auth/check-dsa`). (2) Verify it calls `SecureStoragePlugin.set(...)`. (3) If not, fix and test. (4) Document the path.

**Effort:** ~2 hr (mostly audit + verification on a test device) · **Risk:** low (if already correct, this is documentation only) · **Dependencies:** none

**Verification:** On a rooted test device, inspect `/data/data/<app>/shared_prefs` and confirm no plaintext tokens. Confirm tokens require device unlock.

**Protocol:** Inline.

---

### SEC-4 — Rate-limit coverage to 100%

**What:** Every state-changing API endpoint (POST/PUT/DELETE/PATCH) is wrapped in `rateLimit(...)` from `$lib/server/rateLimiter.ts`. Currently only 38 of 162 routes have rate limiting.

**Why today:** A buggy retry loop in the Android app, or a malicious DSA, can flood any unprotected endpoint. Auth endpoints, share-link endpoints, and the new DA lock endpoints are highest-priority (already done for lock); the rest of the surface is exposed.

**How:** Per-endpoint. Set conservative per-user limits (e.g., 60/min for read-side mutations, 10/min for expensive operations).

**Effort:** ~5 min per route · **Risk:** very low (legit users rarely hit conservative limits) · **Dependencies:** none

**Verification:** Spot-check via curl: 11th request in a minute returns 429.

**Protocol:** Bundled into [`.claude/protocols/zod-migration.md`](../.claude/protocols/zod-migration.md) (typically migrated together with Zod + auth-guard).

---

### SEC-5 — BOLA audit on parameterized routes

**What:** Every endpoint that takes a resource ID in the URL (`:case_id`, `:lender_id`, `:rule_id`, etc.) calls an ownership-verification function before reading/writing. `verifyCaseOwnership` is the existing canonical pattern.

**Why today:** OWASP API Top 10 #1 vulnerability is BOLA (Broken Object Level Authorization). A curious DSA changes `/api/cases/ABC-123` to `/api/cases/XYZ-456` in the URL and reads someone else's case.

**Cumulative audit (S101 + S102) — 63 routes verified, 1 real gap fixed (apply-delta), 1 deferred for design decision (legacy rm/review).** Five canonical ownership patterns identified in active use, all valid:

| Pattern | Where | Mechanism |
|---|---|---|
| `verifyCaseOwnership(params.case_id, result.dsaId)` | `cases/[case_id]/*` family | Explicit helper call; returns the verified document so caller avoids a re-fetch |
| `findOne({ ..._id_or_param, dsa_id: result.dsaId })` | `leads/[lead_id]`, `team/members/[member_id]` | Query-scoped — different DSA's resource returns null → 404 by construction |
| `findOne({ rm_id, case_id })` on `CommunicationThreads` | `rm/cases/[case_id]/query` | RM ownership is per-thread, not per-case |
| `requireRoleApi('admin')` + `requireAdminPermission('rule_authoring')` | `admin/policy-engine/*` family | Admin role gate + permission gate. The permission layer is the BOLA-equivalent — admins without `rule_authoring` cannot mutate policy/version/capture resources. Sub-IDs (e.g. `policy_rule_id` on version-activate) are **server-derived from the looked-up parent document**, not URL params — eliminates "swap version under a different rule" attacks. |
| `getPolicyById(id)` → `RmLenderAssignments.findOne({ rmUserId, lenderId: source.lenderId, status: 'active' })` | `pms/policies/[id]/*` family (RM-callable) | Two-step: fetch policy → derive `lenderId` from the server-side document → verify caller has an active assignment for that lender. The `lenderId` is **never read from the URL or body** — only from the looked-up policy doc — so URL substitution attacks fail. Admin bypasses this check (`isAdmin` short-circuit) since admins are fully scoped. |

S101 batches (18 routes): `cases/[case_id]/share-with-rm`, `cases/[case_id]/snapshots`, `cases/[case_id]/file-builder`, `cases/[case_id]/lock`, `cases/[case_id]/unlock-and-relock`, `leads/[lead_id]`, `leads/[lead_id]/convert`, `team/members/[member_id]`, `rm/cases/[case_id]/query`, plus the full `cases/[case_id]/lender-applications/*` family including the deepest `cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/*` chain.

S102 batch 3 (9 routes, 0 gaps): `admin/policy-engine/lenders/[lender_id]`, `admin/policy-engine/rules/[rule_id]/rollback`, `admin/policy-engine/rules/[rule_id]/versions`, `admin/policy-engine/versions/[version_id]/{activate,approve,status,verbal-approval}`, `admin/policy-engine/submissions/[id]/status`, `admin/policy-engine/captures/[capture_id]/activate`. All 9 pass.

S102 batch 4 (13 routes, **1 real gap found and fixed**): `pms/policies/[id]/+server.ts` (GET, PATCH), `pms/policies/[id]/{admin-json-edit,approve,clause-comment,legacy-compare,legacy-resolve,qa-run,reject,revise,submit}`, `pms/suggestions/[id]`, `pms/lender-assignments/[id]`.

S102 batch 5 (8 routes, 0 gaps): `admin/admins/[admin_id]` (PATCH), `admin/admins/[admin_id]/promote` (POST), `admin/policies/[artifact_id]/{delete,parse,publish,reparse,review}`, `admin/testing/e2e-runs/[runId]` (GET, PATCH), `admin/settings/api-keys/[key_id]` (PATCH, PUT, DELETE).

S102 batch 6 (15 routes, 13 pass, **1 deferred design call**, 1 informational design tradeoff):

Pass:
- `crm-lenders/[lender_id]` (Pattern 2: `{_id, dsa_id}`)
- `notifications/[id]/read` (PATCH — service `markAsRead(id, userId)` runs `updateOne({_id, user_id})` — Pattern 2 via service)
- `qa/scenarios/[id]` + `clone` (Pattern 4 with `qa_view`/`qa_write` permissions — new permission variant codified)
- `rm/policy-captures/[capture_id]` + `submit` (Pattern 2: `{capture_id, rm_id}`)
- `rm/submissions/[id]` + `documents` (Pattern 2: `{_id, rm_id}`)
- `rm/threads/[thread_id]/messages` (Pattern 2: `{_id, rm_id}`, explicit "belongs to this RM" comment in code)
- `rm-contacts/[rm_id]/confirm` (open-by-design: crowdsourced; adds caller's DSA to `contributed_by` set on each confirm)
- `sources/[source_id]` (Pattern 2 + `requireTeamPermission('sources_manage')` — 3-layer gate, strongest DSA-scope route audited)
- `test/screenshots/[...path]` (dev-only + directory-traversal protection)

**Finding M1 — `rm/review/[version_id]` GET + POST (✅ RESOLVED S103, 2026-05-15):**
- Design call: **tighten to assignment-scoped** (matches PMS pattern). Rationale: default-deny is the right security posture; asymmetric with PMS was an accident of timing, not a deliberate "cross-RM peer review" feature. If legitimate peer-review emerges later, it should be a deliberate feature (separate role/permission), not an accident of missing checks.
- Fix shipped: both `rm/review/[version_id]/+server.ts` (GET) and `rm/review/[version_id]/respond/+server.ts` (POST) now load the associated `PolicyRule`, then call `requireRmLenderAccess(locals, rule.lender_id)`. Admin bypasses inside the guard (synthetic active assignment). RMs without an active assignment for the rule's lender get a 403 with a clear message.
- Verified: type check 0 errors, 10,622 tests pass. No CI test for cross-RM access yet — recommended in "Future hardening" below alongside the broader `bola-cases.test.ts` proposal.

**Finding L1 — `rm-contacts/[rm_id]` PATCH (informational, by-design):**
- Any auth'd DSA can modify a centralized RM contact's core fields (name, phone, email). Only `is_active` is contributor-gated (line 99-111).
- Per CLAUDE.md AD-04 "Centralized RM database — crowdsourced from all DSAs, shared globally," this is the intentional crowdsource model. `notes_by_dsa` is keyed per-DSA so each DSA writes their own note.
- Documenting so future auditors don't flag this as a regression. Mitigation: audit trail + version history if directory vandalism becomes a real concern.

- All 8 use canonical pattern 4 (`requireRoleApi('admin')` + `requireAdminPermission(<perm>)`) with one of three permissions: `rule_authoring`, `system_settings`, or the stricter `requireSuperAdmin` for admin-mgmt routes.
- `admin/admins/[admin_id]/promote` adds **OTP re-verification** (MSG91) on top of super-admin gate — strongest auth chain audited so far. Plus self-protection (cannot demote self) and last-super-admin protection (prevents lockout).
- `admin/testing/e2e-runs/[runId]` is **dev-only** via `if (!dev) throw error(404)`. The PATCH handler has no auth check beyond the dev guard — intentional, since Playwright runs on localhost. Documenting this as "audited and confirmed dev-only" so a future reviewer doesn't flag it as a regression. Not a gap.

  - 12 of 13 use the 5th canonical pattern or admin-only role gate correctly.
  - **`pms/policies/[id]/apply-delta` had a real BOLA gap**: route handler had only `requireRoleApi(['rm','admin'])` and called `applyDeltaRevision(policyId, ...)` directly. The service-layer code `applyDeltaRevision` → `revisePublishedPolicy` only checked `status === 'published'` — no caller-vs-lender assignment check. An attacker RM could call `apply-delta` with any published policy ID, fork it into a draft for a lender they aren't assigned to, and pre-load garbage deltas — corrupting the real RM's revision flow.
  - **Fix shipped in same commit**: route-layer `RmLenderAssignments` check added before the service call, mirroring the sibling `revise/+server.ts` pattern.
  - `pms/suggestions/[id]` already had an explicit BOLA fix in place (code comment at line 42-46 explicitly identifies and addresses the same class of attack via `requireRmLenderAccess` after `findOne`) — used as the reference pattern.

**S102 defense-in-depth observations from PMS audit (in addition to the 5th pattern):**
- `pms/policies/[id]/submit` adds **OTP-bound submission** via `requirePmsOtpToken(request, userId, lenderId, policyId, draftHash, signingKey)`. Tokens are bound to (user, lender, policy, sections-hash, 15-min window) — a token issued for one policy can't be replayed against another. Strong even beyond ownership.
- `pms/policies/[id]/qa-run` runs `ObjectId.isValid(id)` before any MongoDB query, then rate-limits at 2/min/admin (CPU-bound — runs against 296 profiles, takes 2-5s). Layer correctly placed before the service call.
- `pms/lender-assignments/[id]` looks up the assignment before any mutation, validates `ObjectId.isValid()` inline. Admin-only — no RM-assignment-derived check needed.

**S102 defense-in-depth observations** (in addition to the dual-guard pattern):
- All routes that take an ObjectId from URL run `ObjectId.isValid()` before any MongoDB query — defends against `$ne`/`$in` injection from URL parameter manipulation.
- State-machine guards (`isValidStatusTransition()`, `VALID_TRANSITIONS` map) prevent bypassing the approval workflow regardless of caller — a hardened second layer beyond ownership.
- Audit-log inserts (`PolicyAuditLogs.insertOne`) on every state mutation record `actor_id` from `locals.user` (server-derived, not request body) — non-repudiation by construction.

**2026-05-19 batch (17 routes, 0 gaps).** Closed the `cases/[case_id]/*` long tail (16 routes) + `admin/policy-engine/comments/[id]/resolve` (1 route).

Cases family (16 routes, all Pattern 1 — `requireAuthApi` → `requireTeamPermission` → `resolveEffectiveDsaId` → `verifyCaseOwnership` per handler):
- `cases/[case_id]/+server.ts` (GET, PATCH, DELETE — 3 handlers)
- `cases/[case_id]/eligibility-sync` (POST)
- `cases/[case_id]/file-builder/download` (GET)
- `cases/[case_id]/file-builder/verify` (POST)
- `cases/[case_id]/file-config` (GET, PATCH)
- `cases/[case_id]/reminders` (GET)
- `cases/[case_id]/results` (GET, POST)
- `cases/[case_id]/results/history` (GET)
- `cases/[case_id]/results/staleness` (GET)
- `cases/[case_id]/selections` (GET, PATCH)
- `cases/[case_id]/snapshots/[version]` (GET)
- `cases/[case_id]/snapshots/compare` (GET)
- `cases/[case_id]/stage` (PATCH)
- `cases/[case_id]/tasks` (GET, POST)
- `cases/[case_id]/tasks/[task_id]` (PATCH, DELETE)
- `cases/[case_id]/timeline` (GET)

Admin family (1 route, Pattern 4):
- `admin/policy-engine/comments/[id]/resolve` (POST) — `requireRoleApi('admin')` + `requireAdminPermission('rule_authoring')` + `ObjectId.isValid()` validation. No per-resource BOLA needed — admin-scoped comment review.

**Running total after cases/* batch: 124 routes audited (107 + 17).**

---

**2026-05-19 resume — SSR-loads final batch (23 routes, 1 BOLA gap fixed → SEC-5 closed at 147 routes).**

Final audit pass: the "remaining ~25 routes" claim referred to **parameterized SSR loads (`+page.server.ts`)** — functionally equivalent to API routes for BOLA. Enumerated 23 such files; spot-checked each against the canonical patterns.

**22 of 23 clean** (one of three canonical patterns each):

- **DSA cases family (4 child pages: `+page.server.ts`, `file-builder`, `results`, `timeline`).** Parent `cases/[case_id]/+layout.server.ts` does `Cases.findOne({ case_id, dsa_id })` at line 159 (Pattern 2 query-scoped). Cross-DSA case_id returns null → 404. Child pages inherit via `await parent()`. `timeline/+page.server.ts` additionally runs the canonical Pattern 1 stack (requireAuth + requireTeamPermission + resolveEffectiveDsaId + verifyCaseOwnership) for defense-in-depth.
- **DSA team page (`dsa/team/[member_id]`).** Looks up Teams by `owner_dsa_id` then verifies member existence. Pattern 2 via parent ownership.
- **Admin pages (7 — `policies/[artifact_id]/*`, `policies/pms/[policyId]/*`, `policies/versions/[policy_rule_id]`, `qa/[id]`, `users/[user_id]`).** All inherit `requireRole('admin')` from `dashboard/admin/+layout.server.ts:9`. No per-resource BOLA needed (admin = global). Several add `ObjectId.isValid()` defensive guards.
- **RM policies family (4 — `policies/[lenderId]/[product]/{delta,edit,encode,suggestions}`).** All use Pattern 5: `RmLenderAssignments.findOne({ rmUserId, lenderId, status: 'active' })` with admin bypass via `activeRole === 'admin'`.
- **RM other (3 — `policy-capture/[capture_id]`, `submissions/[submission_id]`, `cases/[case_id]`).** Pattern 2 query-scoped by `rm_id` (or by `CommunicationThread` for the case detail page — Pattern 3-equivalent: RM must have a thread for the case).
- **Public share (`f/[token]`).** Token-based public access; `validateShareLink(token)` is the gate. Intentionally public per AD-12.
- **Team invite (`team-invite/[code]`).** Code-based public access; invite lookup by code with status checks.

**1 real BOLA gap fixed in this batch — Finding R1 — `rm/review/[version_id]/+page.server.ts`.**

The page-server load was the **SSR mirror** of the API route fixed in S103 (Finding M1). The API endpoint correctly added `requireRmLenderAccess(rule.lender_id)` after loading the PolicyRule. The page-server load did not — it checked only `requireRole('rm')` + `version.status === 'pending_rm_review'`. Any RM could open the review page for any lender's pending version, silently disclosing unapproved policy fields cross-bank.

Fix: load `PolicyRules.findOne({ policy_rule_id: version.policy_rule_id })`, then `RmLenderAssignments.findOne({ rmUserId, lenderId: rule.lender_id, status: 'active' })`. Admin bypass via `activeRole === 'admin'`. Mirrors the S103 API fix exactly + the four sibling `rm/policies/[lenderId]/[product]/*` page pattern.

**Effort:** 13 lines added. **Verification:** pnpm check 0/0, pnpm test 11,047 passing.

**SEC-5 is now ✅ done** — 147 routes audited covering 100% of the parameterized surface (124 API + 23 SSR-load), 3 real BOLA fixes shipped cumulatively (apply-delta S102, rm/review API M1 S103, rm/review SSR R1 2026-05-19 resume) plus defense-in-depth + HTML-injection + admin-bypass-divergence findings from S105.

**Future hardening (out of scope for SEC-5 closure):** No DB-backed BOLA regression tests exist. Adding `src/lib/testing/__tests__/security/bola-cases.test.ts` that seeds cross-DSA cases + asserts 403/404 on cross-access would catch future copy-paste regressions that the type system cannot. Recommend pairing with the SSR-load equivalent (`bola-pages.test.ts`).

**Future hardening:** No DB-backed BOLA regression tests exist. Adding a `src/lib/testing/__tests__/security/bola-cases.test.ts` that seeds cross-DSA cases and asserts 403/404 on cross-access would be a durable institutional safety net — catches a future copy-paste regression that the type system won't catch.

**Effort:** ~10-20 min per endpoint · **Risk:** low (additive check) · **Dependencies:** none

**Verification:** Test request with valid auth but cross-DSA case ID returns 403/404.

**Protocol:** [`.claude/protocols/bola-audit.md`](../.claude/protocols/bola-audit.md)

---

### SEC-6 — Vercel WAF / firewall rules

**What:** Configure Vercel's built-in firewall: geo-block countries you don't serve (you're India-focused), rate-limit at the edge, block known bot user-agents, block IPs that hit honeypot routes.

**Why today:** Today, anti-scraping happens *inside* your app — every bot request still spends server CPU before getting rejected. Edge blocking happens before requests reach your code.

**How:** Vercel dashboard configuration. No code changes.

**Effort:** ~4 hr (including rule design + monitoring setup) · **Risk:** low (rules can be relaxed if they false-positive) · **Dependencies:** none

**Verification:** Dashboard metrics show blocked-at-edge counts; no legitimate user complaints.

---

### SEC-7 — `.env` credential rotation (P0.1)

**What:** Rotate all credentials that were committed to git history (MongoDB Atlas, Razorpay, MSG91, ImageKit, JWT secret, HMAC, CSRF).

**Why today:** `.env` was committed 19 times historically. Even though it's been removed, the secrets are in the git history of anyone who cloned. Worst case: a former contributor or anyone with archive access has all production credentials.

**How:** Per the CLAUDE.md §8 production blockers + `docs/specs/ENV-VARIABLES.md`. Out of scope for incremental sessions — needs a coordinated rotation event.

**⚪ Deferred** per user decision 2026-04-22: beta first, tighten ~10 days after.

**Dependencies:** Coordinated with launch readiness.

---

### SEC-8 — Nodemailer → SES (P0.2)

**What:** Replace Nodemailer SMTP with AWS SES (or SendGrid/Resend). Configure SPF, DKIM, DMARC for `digitaldsa.com`.

**Why today:** Nodemailer has a moderate CVE (GHSA-vvjj-xcjg-gr5g — SMTP command injection). Self-hosted SMTP has deliverability issues at scale. SPF/DKIM/DMARC is required for transactional email reputation.

**How:** Per `docs/specs/EMAIL-HARDENING-PLAN.md`.

**⚪ Deferred** per user decision 2026-04-22.

**Dependencies:** Coordinated with launch readiness.

---

### SEC-9 — CSP `style-src` away from `unsafe-inline`

**What:** Replace `style-src 'unsafe-inline'` with nonce-based CSP. Migrate inline Tailwind utilities to nonce-attached `<style>` blocks or external CSS Modules.

**Why today:** `unsafe-inline` means any injected `<style>` tag executes. CSP nonces prevent that.

**⚪ Deferred** as a documented trade-off for Tailwind compatibility. Revisit if a CSS injection vulnerability is ever exploited (low likelihood given the rest of the XSS surface is tight).

---

### FORM-1 — superforms for new forms

**What:** Use `sveltekit-superforms` for any NEW form added to the app (CRM forms, RM contact forms, billing config, admin tools). NOT for the 6 loan forms.

**Why today:** Form state today is hand-rolled. New forms can adopt a better pattern without disturbing the loan-form ecosystem.

**How:** Install superforms, use Zod schema (shared with API), use `{form}` and `{enhance}` patterns from superforms docs.

**Effort:** ~2 hr per new form · **Risk:** low for new forms · **Dependencies:** none

---

### FORM-2 — superforms for loan forms

**What:** Migrate the 6 loan form pages from `formWizardEngine.ts` + custom state to superforms.

**⚪ Deferred** — the loan form is the heart of the product, has 6 variants × 80 questions each, plus complex `showWhen`/`bindsTo` mechanics. Migration is months of work for marginal gain. Revisit only if maintenance burden becomes prohibitive.

---

### FORM-3 — Pitfall #17 fix in ApplicantSelect / BooleanSelect / NewSelect

**What:** Migrate the dropdown wrappers in [`ApplicantSelect.svelte`](src/lib/components/ApplicantSelect.svelte), [`BooleanSelect.svelte`](src/lib/components/BooleanSelect.svelte), and [`NewSelect.svelte`](src/lib/components/NewSelect.svelte) from `position: absolute` to `position: fixed` with coordinates computed from `buttonRef.getBoundingClientRect()` and a capture-phase scroll/resize listener — the same canonical pattern from `CustomSelect.svelte` shipped in commit `80496866`.

**Why today:** These three components all exhibit the exact pattern that CLAUDE.md Pitfall #17 documents — a button-relative dropdown rendered with `position: absolute` and `left/right: 0`, which gets clipped at the edges of any ancestor with `overflow: auto | hidden | clip`. `ApplicantSelect` at minimum is rendered inside modals (via `BasicInfoFields.svelte` → `DirectorFormModal.svelte`), making the bug user-reachable. `BooleanSelect` and `NewSelect` usage not surveyed; safe assumption is they could end up in modals too. Bug class is latent today (no user reports), so this is a preventive fix.

**How:**
- Copy the coordinate-computation and scroll/resize listener block from `CustomSelect.svelte` (the source-of-truth)
- Apply to each of the 3 components' dropdown wrappers
- Keep the trigger button positioning unchanged — only the dropdown wrapper migrates
- Smoke-test each component in at least one modal context (existing applicant editor flows are good candidates)

**Effort:** ~1 hr · **Risk:** low — mechanical pattern copy, isolated to the 3 component files. CSS-only change for the wrapper + 1 lifecycle effect per component.

**Dependencies:** none

**Verification:**
- Run pre-flight grep from CLAUDE.md §4 — should show only `HoneypotField.svelte` (off-screen pattern) and non-popover hits after the fix
- Open the Director / applicant editor modal, click into any select that uses these components — confirm dropdown is fully visible, doesn't clip at modal edges
- Scroll the modal body while dropdown is open — confirm panel follows the trigger

**Protocol:** None needed — small enough to do inline in the session.

---

### OBS-1 — Sentry client error tracking

**What:** Install Sentry SDK for SvelteKit. Capture client-side unhandled exceptions, React-style error boundaries, performance traces.

**Why today:** Server side has Pino structured logging. Client side has `clientLogger` (writes to a route that drops to server logs). But unhandled client exceptions (uncaught promise rejections, render errors) aren't reliably captured. Sentry gives session replay + breadcrumbs + automatic capture.

**How:** (1) `pnpm add @sentry/sveltekit`. (2) Configure DSN via env var. (3) Wrap layouts with Sentry's error boundary. (4) Filter PII before sending events.

**Effort:** ~4 hr · **Risk:** low (additive observability) · **Dependencies:** PII-filter rules must be solid before enabling.

**Verification:** Intentionally throw a client error; confirm it shows up in Sentry dashboard with correct stack + user context (but no PII).

**Protocol:** [`.claude/protocols/sentry-setup.md`](../.claude/protocols/sentry-setup.md) (write when picked up).

---

### OBS-2 — OpenTelemetry traces

**What:** Add OpenTelemetry instrumentation for: incoming request → API handler → MongoDB → external API call. Spans show end-to-end latency breakdown.

**Why today:** Debugging "why is the cases page slow today?" is currently guesswork. Traces would show exactly where time is spent.

**Shipped S103 (2026-05-15):** SDK + auto-instrumentation + manual root span + PII scrubber.
- `src/lib/server/telemetry.ts` — single init module, idempotent, `OTEL_ENABLED=1` gate (off by default — local dev pays zero cost)
- `src/hooks.server.ts` — `startTelemetry()` called at module load; every request wrapped in a `<METHOD> <pathname>` root span
- MongoDB driver auto-instrumented (collection + operation; enhancedDatabaseReporting OFF to keep filters out of spans)
- Undici instrumented for outbound fetch — auto-captures HTTP details under each external call
- `src/lib/server/externalFetch.ts` — manual span `external.<service>.<METHOD>` for friendly grouping; auto Undici span appears as child with HTTP detail
- `buildScrubbingSpanProcessor` wraps every exporter; redacts `user.id`/`user.email`/`user.mobileNumber`/`db.statement`/`db.mongodb.filter`/`app.case_id`/`app.applicant_id`/`app.dsa_id`/`app.rm_id`/auth headers and PII-bearing URLs (OTP routes, paths with embedded phone numbers) BEFORE export. Lender IDs and route templates are kept (public business data).
- CLAUDE.md Pitfall #27 + grep recipe documents the contract
- [obsTelemetryScrubbing.test.ts](../src/lib/testing/__tests__/obsTelemetryScrubbing.test.ts) — 8 cases pin the scrubbing rules

**Production enablement (DSA's call):**
- Set `OTEL_ENABLED=1` + `OTEL_EXPORTER_OTLP_ENDPOINT=<collector-url>` on Vercel
- Optional `OTEL_LOG_TO_CONSOLE=1` for local dev (dumps spans to stdout)
- Cold-start cost ~50-100ms (SDK init, one-time per function instance)

**Follow-up work (deferred, not blocking):**
- Custom business spans (per-rule evaluation, per-form-page processing) — add as needed
- Trace-to-log correlation in Pino (`trace_id` / `span_id` fields) — when justified
- Sampling configuration tuned for production volume — use defaults until traffic dictates
- Frontend instrumentation — would be `OBS-3`

---

### DATA-1 — Market intelligence dataset (anonymized property + lender + price)

**What:** A separate, anonymized derived dataset capturing property location + price + approved lender + loan parameters from every completed case. Built incrementally as cases close. Intended as the seed for a future analytics product (sellable to lenders / builders / market-research firms) — and useful internally for the DSA app itself (suggest fair prices, comparable lender approvals in the same area).

**Why this is its own dataset and not a query on Cases:**
- Anonymization needs to be enforced at write-time, not query-time. A schema that NEVER has fields like `applicant_id`, `case_id`, `mobileNumber`, `panNumber` is the strongest guarantee against accidental re-identification.
- Future business use (selling/sharing) requires data with no PII back-references. If we query the live Cases table, every export carries the risk of leaking via FK joins.
- Separate storage allows different retention rules (this dataset can be kept forever) vs operational data (DPDP retention limits apply).

**Required fields (proposed shape):**
```
{
  state, city, area_or_pincode_prefix, property_type,
  agreement_value_lakh_bucket,   // rounded to nearest ₹1L
  registry_value_lakh_bucket,
  loan_amount_lakh_bucket,
  ltv_pct_bucket,                 // rounded to 5%
  lender_name, lender_classification,
  loan_type, property_age_bucket, carpet_area_bucket,
  month_bucket                    // YYYY-MM, not exact date
  // NO applicant_id, case_id, dsa_id, mobile, name, PAN, Aadhaar
}
```

**Hard anonymization rule — k-anonymity threshold:** before any export or analytics query, filter out rows where the combination of `(city, pincode_prefix, month, lender)` has fewer than **5** matching records. If a sparse cell, suppress (return aggregate "fewer than 5") rather than the row itself.

**Storage options (decide in ADR-0006):**
- Option A: a separate MongoDB Atlas database in the same cluster (cheap, low ops cost, mediocre isolation)
- Option B: BigQuery / Snowflake / DuckDB on S3 (analytics-native, pay-per-query, harder to operationally manage)
- Option C: a separate Atlas cluster (full isolation, ~₹5k/mo recurring cost)

**Storage recommendation:** Option A for first 12 months (cheap and good enough); migrate to B or C when external analytics access becomes a real ask. The write path is the same in all three; only the read endpoint changes.

**Effort:** 1-2 weeks · **Risk:** medium (anonymization needs to be airtight; one bug introduces re-identification risk) · **Dependencies:** ADR-0006 (data segregation strategy) decides storage; SEC-2 NOT required (this dataset has no PII).

**Verification:** Insert 5+ records; run aggregation query → see bucketed results. Run a re-identification attempt: given (city, month, lender) is the row distinguishable from public registry data? The answer should be "no, the bucketed values collapse to ranges".

**Protocol:** `.claude/protocols/market-intelligence-pipeline.md` (write when picked up).

---

### DATA-2 — BT/DC outreach vault (consented mobile + loan profile)

**What:** A dedicated, hyper-secured vault storing customer contact + their existing loan profile, used to nudge them when a Balance Transfer or Debt Consolidation opportunity arises. ONLY the BT/DC suggestion engine reads it. Strict DPDP Act 2023 compliance.

**Why this is the highest-sensitivity dataset in the app:**
- Combining mobile + outstanding loan + bank + EMI is the worst-case PII correlation. Leak this, every customer is identifiable AND their financial situation is exposed.
- Use case requires explicit consent (DPDP Act 2023 § 6) — purpose-limited to BT/DC notification only.
- Retention is purpose-bound: can't store indefinitely "just in case." RBI guidance suggests delete after 3y idle or sooner on consent withdrawal.

**Required fields (proposed shape):**
```
{
  mobile_token,                    // tokenized — vault stores the cleartext separately
  consent_timestamp, consent_ip,
  consent_text_version,            // which version of the consent text they agreed to
  existing_lender, current_emi, current_roi,
  tenure_remaining_months, outstanding_principal,
  loan_type, loan_purpose,
  next_check_due,                  // when the BT/DC engine should re-evaluate
  created_at, updated_at,
  withdrawn_at                     // set when user clicks "stop nudging me"
}
```

**Mandatory infrastructure:**

1. **Explicit consent UX** — at form submission, a separate UNCHECKED checkbox: *"May we contact you with better loan offers in the next 3 years if we find them? (You can withdraw anytime from your profile.)"* — only written to this vault if checked.
2. **Tokenization** — the `mobile_token` is an opaque ID; the actual mobile lives in a separate vault (Hashicorp Vault Transit / AWS Secrets Manager / dedicated cluster) with its own KMS chain.
3. **Audit log** — every read AND write to this vault produces a `BtDcVaultAccessLogs` entry with actor identity (system cron / admin user / API caller). Logs are append-only.
4. **Auto-purge cron** — daily job purges rows where `withdrawn_at IS NOT NULL` OR `updated_at < NOW() - 3 years`.
5. **Withdrawal mechanism** — one-click "stop suggesting loans" button in user profile that sets `withdrawn_at = now` and triggers immediate purge (don't wait for cron).
6. **Access narrow code path** — the BT/DC engine is the ONLY code that reads this vault. NOT the DSA dashboard, NOT case views, NOT admin reporting. Enforced by a separate connection string + IAM role for this one service.

**Storage:** Atlas M0 cluster (free tier sufficient for ~10k records) in a separate Atlas project from the main app — that's the cleanest IAM isolation. Different connection string, different KMS, different backup.

**Effort:** 1-2 weeks (incl. consent UX wiring + compliance review + dedicated cluster setup) · **Risk:** high (single biggest PII concentration in the app — any leak is catastrophic) · **Dependencies:** ADR-0006 (data segregation), SEC-7 (.env rotation) MUST be done first.

**Verification:** Submit form without consent → no row in vault. Submit form with consent → row present, mobile is tokenized in main vault, decryption requires KMS auth. Hit withdrawal endpoint → row purged within seconds. Audit logs show the purge.

**Protocol:** `.claude/protocols/btdc-outreach-vault.md` (write when picked up — needs careful compliance design).

---

### DATA-3 — Original-file deletion after extraction (ImageKit TTL)

**What:** After Gemini/OCR extracts structured data from an uploaded customer document (Aadhaar/PAN scan, bank statement, salary slip, registry doc), the original file in ImageKit becomes a PII liability with no operational value. Delete it after a configurable retention window (recommend 30 days for successful extractions, 90 days for failed extractions so admin can re-run). Keep only: SHA-256 hash + extraction summary + audit log entry.

**Why this is its own item:**
- Files in ImageKit are accessible by URL — a leak of ImageKit credentials OR a public-URL exposure leaks raw documents.
- Documents contain MORE than just the extracted fields — addresses, signatures, photos, account numbers we might not have extracted. Deleting the originals reduces PII surface to JUST the structured fields we deliberately store.
- DPDP Act 2023 purpose limitation: we extracted what we need; keeping the original "just in case" is not a recognized lawful basis after a reasonable window.

**Implementation:**

1. Add `extracted_at` + `retention_status` fields to the Documents collection.
2. Daily cron: find documents where `extracted_at < NOW() - 30 days` AND `extraction_succeeded = true` AND `retention_status != 'deleted'` → call ImageKit Delete API → set `retention_status = 'deleted'`.
3. Add a SHA-256 hash field at upload time (`Uploads.fileHash`) so we have proof we saw the document without the document itself.
4. Update Audit logs to include the deletion event with actor (`system_cron`) and deletion reason.
5. Admin override: a one-click "extend retention" button on individual documents that pushes `extracted_at` forward by 30 days, capped at 90 days total. Logged.

**Effort:** 1-2 days · **Risk:** low-medium (the cron must not delete documents that are mid-extraction or being re-reviewed; testable with a dry-run mode that just logs candidates for the first week) · **Dependencies:** none

**Verification:** Upload a doc → extraction completes → advance clock 30 days (or set `extracted_at` to 31 days ago) → run cron → verify ImageKit API returns 404 for the URL but Documents row still exists with the hash + extraction summary.

**Protocol:** Inline — small enough to do in one session.

---

## Done Log

- **2026-05-14 (S100)** — **PERF-4** (client pincode chunk eliminated — 763 KB chunk removed, new `/api/location/cities` endpoint), **PERF-5** (`engineContext.js` 1,607 KB → 6.23 KB via lazy reverse index), **OBS-1** (client error reporting closed via existing `sendErrorAlert` email pipeline — chose to extend over adopting Sentry; see ADR-0004), **DX-5** (43 routes migrated from inline `if (!locals.user)` to `requireAuthApi`/`requireAuth` guards; 2 layouts intentionally retained their redirect/null-user patterns). Commits: `129f7852`, `5b823d21`, `bc9f77e7`, `0fc64f99`, `0e3c6304`.

- **2026-05-14 (S99)** — **DX-1 CI gating** shipped: `.husky/pre-push` with divergence/linear-history/type-check/test gates + `vercel.json` build command override. `SKIP_PUSH_GUARD=1` admin bypass. Smoke-tested on actual push (10,568 tests ran). **DX-3 MongoDB pool tuning** verified already complete (`mongo.ts` line 55: `maxPoolSize: 10`). Commits: `3268f29e`, `801bc178`.

- **2026-05-14 (S98)** — **System bootstrap**. The session-lifecycle infrastructure that this roadmap depends on was put in place. `/start` and `/end` commands, 5 protocol files (`.claude/protocols/`), SessionStart context banner + PreToolUse Bash guards (`.claude/hooks/`), this roadmap doc itself, foundational ADRs (0001, 0002, 0003), CLAUDE.md / MEMORY.md cap relaxation, MEMORY.md wrap-up auto-detect rule. Commit: `7d23f73b`. No individual roadmap items moved status this session — this entry records the meta-event of the executor itself coming online. Next session can pick up `DX-3` (MongoDB pool tuning, P1, 5 min, zero risk) as the first actual item via `/start`.

---

## Deferred Decisions Log

See [`adr/`](adr/) directory for full ADRs. Quick index:

- `0001-no-v4-repo.md` — Why we're not doing a rewrite repo (incremental migration on V3 instead)
- `0002-api-first-architecture.md` — Why API-first JSON endpoints vs SvelteKit form actions (Capacitor compatibility)
- `0003-session-lifecycle-system.md` — The `/start` and `/end` system documented in this very file's adoption
- `0004-email-error-pipeline-over-sentry.md` — Why OBS-1 extended `sendErrorAlert` rather than adopting Sentry SDK
- `0005-mongodb-field-level-encryption.md` — SEC-2 design pass: Atlas QE for searchable PII + app-AES for free-text; AWS KMS Mumbai; phased migration plan (Proposed status — impl deferred)
- **Pending — ADR-0006 — Data segregation strategy.** Triggered by user direction 2026-05-15 (S103 close): split derived datasets into purpose-specific stores rather than co-locating with operational data. Two confirmed datasets:
  - Market intelligence (`DATA-1`) — anonymized property + lender + price, future analytics product
  - BT/DC outreach vault (`DATA-2`) — consented mobile + loan profile, DPDP-compliant retention

  Plus a related but smaller piece (`DATA-3`) — file deletion after extraction (ImageKit TTL).

  ADR-0006 will reconcile these against SEC-2 (FLE in main DB) — the sequencing question is whether tokenization in DATA-2 reduces what SEC-2 protects in the main DB. To be written when DATA-1/DATA-2 are picked up.

---

## Maintenance Rules

1. **`/end` is the only writer.** Sessions update item statuses through `/end`. Manual edits are allowed for adding new items or correcting drift but should be rare.

2. **Items are stable.** Once an item ID is assigned (DX-3, PERF-1, etc.), the ID never changes even if the title or scope is refined. Sessions reference IDs in CHANGELOG entries and commit messages.

3. **The "Next pending item pointer" at top is the source of truth** for `/start`. Update it when an item is picked up (→ 🟢 in-flight) and when one completes (→ point to the next 🟡 in priority order).

4. **Each new item needs**: ID, title, what/why/how, effort estimate, risk classification, dependencies, verification step, protocol pointer (or "inline" if too small for a protocol file).

5. **Deferred items must reference an ADR** or have a one-line deferral rationale.

6. **When a session discovers a NEW architectural item** (e.g., this morning's review found "159 routes use raw `json()`"), `/end` adds it to the catalog with a fresh ID and 🟡 ready status. Don't lose discoveries.
