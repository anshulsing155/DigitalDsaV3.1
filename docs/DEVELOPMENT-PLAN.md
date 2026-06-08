# DigitalDSA — Development Plan

> **Updated**: 2026-06-05 (S229 close — late evening continuation of S228 turned into 2 architecturally significant perf shipments: (1) **Vercel function region pin to bom1** (`38e664ed`) — diagnosed via X-Vercel-Id showing `bom1::iad1::…` routing; functions now run in Mumbai co-located with Atlas; **owner-verified TTFB drop ~700ms → 63.58ms (~82% reduction) on every API call**; (2) **ADR-0033 adaptive polling cadence + BroadcastChannel leader election** (`e747c193`) — full poller rewrite preserves owner's "kick immediately" UX for post-login 2-min window while reducing steady-state polling traffic ~80-95% via adaptive intervals (3s→5s focused→20s hidden) + one-tab-polls-per-browser leader protocol; the hook-level revoke check (security boundary) is unchanged. **3 task chips spawned for next session, owner-pinned next Highway = `task_a7ca5c9c` form label-for/input-id mismatch fix** across ~15-20 form components (Chrome DevTools Issues panel reports "Incorrect use of <label for=FORM_ELEMENT>" on every loan form page; ~2-4 hr estimated). Other 2 chips: `task_26b7dbcc` CSRF rotation on read endpoints (~30-60 min); `task_d43ddba2` trim cookie payload on polls (~1-2 hr). Husky hook clean both pushes. Prior session work (S228) — TWO-PHASE: Phase A SEC-10 silent-rotation hotfix (Pitfall #77) + same-session poller-test flake fix; Phase B 5-commit perf pass on submit→results flow (F1 animation overlap, F2 form-assessment cache projection, F3 phase-2 parallel read, F6 tail-parallelize writers, F9 WeakMap-memoize DSA resolution) + ADR-0032 Worker rule-engine planning doc. 8 commits all pushed (`7515d0cf` → `876d5759` → `5ea005f3` → `f6dc8965` → `220ce426` → `b7bca684` → `06c20115` → `692e04cc`). Estimated combined cold-path saving on user's pain (form submit → results): ~1.8-2.6s perceived. Dropped F4 (10s safety margin) + F5 (BOLA lock test) + F7/F8 (dashboard redesign coming). ADR-0032 status `proposed` for the next big perf lever when criteria trigger. Tests 13,202 → 13,205 (+3 from Phase A only). Type-check 0/0. End-verify workflow verdict **pass**. **Items 1 + 4 from /start menu** (cron-job.org entries + Pitfall #3 re-verify + Atlas orphan-index verify + Vercel flag flip confirm) ALL closed inline. **Item 3 (SEC-6 WAF)** explicitly deferred for the dashboard-redesign sequence. After S227 — audit follow-ups (ObligationCapture pure-module extraction + PMS delta route size-guard tests) both chips resolved inline. Top-of-queue still "pick next from backlog below" per S225/S226/S227/S228 close pattern — pick a new Highway from the backlog.)
>
> **🟡 DEFERRED (operator decision 2026-06-03 from S219):** **Render adapter-node migration** — swap `@sveltejs/adapter-vercel` → `@sveltejs/adapter-node`, deploy on Render Starter ($7/mo) or free tier. Eliminates 10s function timeout permanently. Full plan in ADR-0027. **Trigger to pick up: next user-reported 504 that today's structural fixes can't absorb.** Updated for S220: the 2-phase split + CSR pattern dramatically reduces likelihood the trigger fires; Render migration now firmly backburner.
>
> **🛣️ NEXT UP — UNIFIED EXECUTION ORDER (S225 close):**
>
> ### Operator actions pending (do these BEFORE next code work)
>
> 1. **🚨 Vercel flag flip + redeploy** — set `SESSION_ENFORCEMENT_KICK_ENABLED='true'` in `rinn` project (Production + Preview + Development) → trigger redeploy of `main`. Until this lands, SEC-10 conflict-modal stays in soak mode (detection runs silently, no modal, no kick on login). The close-account revoke path is NOT env-gated and works today (poller picks up the revoke within 3s; instant on next user action via the hook-level check).
> 2. **🟡 Atlas prod orphan-index verification** — after the redeploy, check Vercel function logs for `[ensureIndexes] dropped orphan Sessions index` lines. If they appear, the defensive cleanup ran. If they don't, the orphans were already gone (expected if local + prod share the Atlas cluster).
> 3. **🟢 Owner's two-browser smoke** of the redesigned kicked-modal (centered + "You have logged in on another device. Logging out from here." + 5s window + no console noise).
>
> ### Pinned for next code session
>
> Pick a new Highway from the backlog below. The SEC-10 epic is functionally complete pending the env-flag flip + soak observation. Top candidates:
>
> - **Site loading slowness investigation** (S218 carry-over; residual after S220's CSR pattern) — Lighthouse pass + bundle-size scan. ~2-4 hr.
> - **PERF-2** Streaming `load` for slow data — opportunistic per-page after the CSR pattern from S220.
> - **SEC-6** Vercel WAF / firewall rules — ~4 hr.
> - **Pitfall #3 re-verification** — last verified 2026-03-10 (now 87 days past, well past 6-month line). ~15 min.
> - **2 cron-job.org entries still un-provisioned** (`/api/cron/quota-blocked-archive` + `/api/cron/billing-reconcile`) — re-run `pnpm tsx scripts/setup-cron-jobs.mjs`. ~5 min.
>
> ### Backlog (owner-set order from S218, carry-forward + S220 additions)
>
> - **🟡 Secured-loan `applicantIndex` not forwarded to `IncomeSourceForm`** (S220 surfaced) — HL/LAP/Plot/Personal/Business/Professional secured-loan page mounts don't forward `applicantIndex`. Safe today via `isSingleApplicant` gate; latent fragility. Mechanical ~30-60 min audit + thread prop through 6 mounts + lock test. Pickup before next major form change.
> - **🟡 Tier 2 cold-start follow-ups** (S220 surfaced): CSFLE native binding lazy-load audit (~30 min, saves 200-500ms cold start when CSFLE_ENABLED unset). Per-lender Worker thread parallelism for the rule engine (multi-day; only if cold path becomes problematic again).
> - **Site loading slowness investigation** (S218 newly-added) — initial work done in S220 via per-phase timing logs + CSR pattern; the residual investigation (Lighthouse pass + bundle-size scan) folds into the pincode work above.
> - **PERF-2** Streaming `load` for slow data — partially addressed by S220's CSR pattern. Remaining streaming opportunities are opportunistic per-page.
> - **SEC-6** Vercel WAF / firewall rules — ~4 hr.
> - **LCR/LTV conflation investigation** at `evaluationEngine.ts:1071` — may not be a bug.
> - **PMS-authoring schema for Plot & Equity X/Y/Z** — ~30 min when PMS team picks up Plot Loan onboarding. Owner placed LAST.
> - **Audit follow-ups from S218** (still open): `email.ts:421` bounce-tracking TODO bundled with SEC-8 post-AWS-approval audit (~30-45 min).
> - **Idempotency dedupe coverage broadening** (S220 surfaced) — other write endpoints (lender-application creation, file-builder ops) could benefit from the same key pattern if ever called from auto-retry surfaces. Low priority.
>
> **Capacitor bundle (still gated on Android emulator session):** SEC-1 / SEC-3 / MOB-1.
>
> **Stack:** SEC-8 AWS SES production-access (external wait, age 12, case `177987930900751`).
>
> **Previous (S216)**: billing-UX deroute, no Highway advancement. 3 commits + 1 uncommitted batch (Razorpay preload lazy-load + structured 403 USER_NOT_DSA gate + dev-mode admin bypass + eMandate amount=0 provider bug fix + 2 §16 Rule 16 lock-test retargets + 4 new coverage tests). +4 net tests (12,899 → 12,903). Resolved 1 real Razorpay-API bug + 2 latent §16 violations. ConfirmModal Stack age 6 → 7 🚨.
>
> **Previous (S215)**: TECH-DEBT-CLEANUP §6 follow-ups B/A/C end-to-end + LEND-1 Phase 1a closure + RM Questionnaire Pass 2 resolved to backlog. 4 commits (`75453a58 / 56ffb89d / 019cdfe1 / 38af8e49`), −3 net tests, spec archived to `docs/specs/_archive/`. New Pitfall #71 documents the form-page-level payload-mutation trap.
>
> **Prior session header (carry-forward for context)**: (S208-S210 session close — TECH-DEBT-CLEANUP Highway advanced ~60% via 5 commits. **S208 Session 1 close-out** (D3 dead-interface delete + D11 Pitfall #33 obsolete-marker verify + D12 memory file RESOLVED header + D14 stale-comment grep-sweep). **S208.5 snapshot regen** (D-incoming-3 — 8 failing FM-1 snapshot tests stabilized via project's existing `_regenLapSnapshots` mechanism). **S209 Session 2 prop rename** (D1 + D2 — `loanVariant` → `loanScope` across 16 files + 4 test files; `OBLIGATION_IMPLIED_TYPES` → `SCOPES_THAT_IMPLY_OBLIGATIONS`; Path A locked, no `loanPurpose` axis). **S210 Phase 2 Level-3 architectural fix** (D-incoming-4 — payload-builder chain accepts `opts?: { now?: Date }` with `FIXTURE_NOW` default; new lock test `payloadBuilderTimeInjection.test.ts` enforces signature compliance + zero unguarded clock-reads; PLOT-BT time-bomb closed permanently). **S210 Phase 3-5 audit + drift cleanup** (D-incoming-1 + D-incoming-5 + 2 CRITICAL drift items surfaced by parallel sub-agents: formPathScenarios+auditor + archetypeTemplates had Plot variant misfiled on scope axis — silently bypassed `loanVariant` test gates; fixed inline). 5 commits all on origin, 12 cleanup items + 5 D-incomings closed, 12,879 tests passing (+10 from new lock test), type-check 0/0, working tree clean. User explicitly chose Level-3 architectural over Level-2 `vi.setSystemTime` patch per "no patchwork" mandate. CLAUDE.md §16 Rules 14-16 enforced 0 violations across all 5 commits.**
>
> **🛣️ Highway status:** TECH-DEBT-CLEANUP-2026-05-31 is the active Highway (owner-mandated 2026-05-31 spec at [`docs/specs/TECH-DEBT-CLEANUP-2026-05-31.md`](specs/TECH-DEBT-CLEANUP-2026-05-31.md)). 15-item §3 inventory across 6 planned sessions. S207 advanced D13 (sidebar gates landed, lock test still owed) + partial D14 (questionBank docstrings). **Next session pickup options** (owner picks):
> - **A. Finish Sessions 1 + 4 of cleanup spec** — write `wizardSidebarPageGatesLock.test.ts` (D13 Definition-of-Done — sidebar gates landed but lock test not authored), delete `LoanApplication` interface (D3), mark Pitfall #33 obsolete (D11), update `reference_plot_loan_field_naming.md` (D12), exhaustive grep-sweep for residual stale comments (D14). ~60 min total.
> - **B. Session 2 of cleanup spec** — prop rename `loanVariant` → `loanScope` across `IncomePageNew.svelte` + `ObligationCapture.svelte` + `applicantRestoreHandler.ts` (D1 + D2). TypeScript catches every consumer. ~90 min.
> - **C. Pick up stale escalation** — RM Questionnaire Pass 2 (🚨 9+ sessions idle, forcing-function overdue, owner 3-choice CANNOT defer further) OR LEND-1 Plot & Equity Phases 2-4 (🚨 6 sessions idle, prior nomenclature blocker now closed).
> - **D. Switch Highway entirely** — F.2 anonymous eligibility checker, Epic G integrations, or Epic H i18n. The cleanup spec can sit between sessions without rotting (each session self-contained).
> - **E. Pop a stack item** — ConfirmModal redesign (Age 3, still blocked on 5 owner decisions) OR SEC-8 SES production-access (Age 7+, external wait, owner can check AWS console — case 177987930900751 well past stated 24-72hr SLA).
>
> **✅ Forcing function RESOLVED (S215, 2026-06-02):** Owner picked option (b) for RM Questionnaire Pass 2 → moved from Stale In-Flight stack to this DEVELOPMENT-PLAN long-tail backlog. Reason: Pass 1 sufficient for current ~9-bank onboarding; Pass 2 matrix redesign not bottlenecking; revisit when bank-onboarding velocity demands. Pass 1 inventory at [`docs/specs/HOME-LOAN-RM-QUESTIONNAIRE-AUDIT.md`](specs/HOME-LOAN-RM-QUESTIONNAIRE-AUDIT.md) remains valid as the read-when-resuming source; the 4 deferred Qs (Page 0 lead-or-trail / branch dedup granularity / document answer buckets / Pages 7-12 sub-pass timing) have recommended pre-answers in the audit doc (lead / combined sub-table / 2 buckets / after).
>
> **Prior session (2026-06-01) one-paragraph recap (carried for context):** ✅ P0 production login fixed (CSFLE master-key mismatch from 2026-05-18 — owner unset `CSFLE_ENABLED` on Vercel `rinn`; Pitfall #68 added + diagnostic script kept); admin/`is_test:true` Pro-tier override re-implemented defensively (`b21ddda7`, +6 tests); P1 UI batch shipped (quota split into sidebar+chip+banner, Cases LOAN column format, Edit Application button prominence, File Builder copy fix, Add Lender dedup + modal with inline offers).
>
> **✅ P0 production login FIXED** — root cause was CSFLE master-key mismatch from 2026-05-18 `CSFLE_ENABLED='true'` env-var set on Vercel under the false belief that "DEKs not initialized = passthrough" (verbatim quote from 2026-05-19 morning-close handoff, now captured in Pitfall #68). Native binding failure (Pitfall #48) masked the break for 13 days; commit `70862a9f` exposed it. Owner unset `CSFLE_ENABLED` on Vercel `rinn` Production + Preview + Development; login confirmed back via incognito fresh-OTP flow. Code revert + Pitfall #68 + diagnostic script in commit `2915f7cc`. 10 orphan DEKs in production `__keyVault` are harmless until SEC-2 properly rolls out (will need drop + re-mint with current master key + backfills before next `CSFLE_ENABLED='true'` flip).
>
> **✅ Admin Pro-tier override SHIPPED defensively** — commit `b21ddda7`. AdminUsers + DsaApplications lookups wrapped in `try/catch` so any DB blip falls through to normal subscription resolution silently (structured `logger.warn` preserves signal). +6 tests (3 original override-coverage from `54882b87` + 3 new defensive-fallback). Admin accounts + DSAs flagged `is_test: true` now resolve as synthetic `{ plan_id: 'pro', state: 'active' }` — 50 cases/month, no real charge, no BillingSubscriptions row required.
>
> **✅ P1 UI batch SHIPPED** — commits `5aca6deb` (session-1) + `4fc0cc99` (session-2, after owner screenshot feedback). Items now live:
> 1. **Quota split into 3 placements** — sidebar "Basic Plan / 5 May 26 – 4 Jun 26" block, top-bar "Cases Consumed X/Y" chip (matching existing button styles + divider pattern), mobile `lg:hidden` banner. `quotaState.cycleStartAt` added. `DsaQuotaIndicator.svelte` mounted in SHARED parent `dashboard/+layout.svelte`, gated on `role === 'dsa'`.
> 3. **Edit button prominence** — per-row Edit-form on Cases list expanded row + top-of-page Edit Application on case Results page + promoted Edit Application button on case-detail header (next to Stage badge). All quota-aware (greyed + tooltip at exhaustion).
> 5. **Cases list LOAN column format** — "LoanName - FacilityType (if there) - LoanType" via existing snapshot-decryption loop enrichment.
> 6. **File Builder copy fix** — "Add lenders from the **Overview** tab" (was "Results page").
> 7. **Add Lender dedup on Overview** — empty-state duplicate button removed.
> 8. **Add Lender modal with inline offer details** — traffic-light dot + "₹X.XL approved · X.XX% ROI · Xy tenure" per lender; sorted has-offer first → green/amber/red → amount desc → alphabetical for no-offer.
>
> **🟡 P1 items still open:**
> - **(2) Submit/edit ConfirmModal redesign** — proposal in 2026-06-01 session-1 transcript: 4 modal states (normal/approaching/exhausted/edit), ≤2-sentence body, color-tinted quota badge, in-flight-case footer. Requires additive API on `dialogState.openConfirmModal` (`badge?` + `footerNote?`) + new `getInFlightCase(dsaId)` helper. **5 locked-decisions still needed before code**: headline copy / icon choice / exhausted-state UX / in-flight footer policy / quota badge wording. ~2 hours to implement once locked.
> - **(4) Generalize Plot-variant `_stashedLoanVariant` engine-level** — multi-hour architecture work, deferred per original handoff framing. Already chipped.
>
> **Task chips spawned this session** (separate worktree work, not blocking): IntroGuideHint z-index overlap with sidebar header ("✨ You can access the guide" badge covers "DSA Agent" label); duplicate-looking "Recent Cases" rows on DSA dashboard (investigation needed — label-collision vs data-fetch vs render bug).
>
> **🟢 P2 backlog (after Highway pick)**: LEND-1 Plot & Equity Loan **Phases 1b → 4** (Phase 1a closed S215 via FORM-4 rename; Phase 1b/1c are ~4-5 hr — natural next-session continuation if owner picks this Highway); **RM Questionnaire Pass 2** (resolved S215 → backlog with reason; revisit when bank-onboarding velocity demands; Pass 1 inventory + recommended pre-answers in audit doc); MOB-1/SEC-1/SEC-3 Capacitor; PERF-2; SEC-6 Vercel WAF; SEC-8 AWS SES production-access (case 177987930900751, external wait — first request rejected 2026-06-01, v3 reply drafted and ready to send per session-handoff).
>
> **🟢 P3 backlog — S216 spin-offs added this session** (from billing-UX deroute):
> - **₹1 disclosure copy mismatch for eMandate** — `SubscribeRecurringSection.svelte` disclosure modal says "Your bank may show a ₹1 debit and ₹1 refund" which is correct for Card / UPI-Autopay but WRONG for eNACH (NACH protocol does no debit/refund, mandate is authorized directly). Cosmetic but every DSA who clicks Subscribe sees it. Fix: branch the copy on method, OR replace with method-neutral "your bank will authorize the mandate directly; no money is debited" for the eMandate default. ~15 min.
> - **Dark-mode contrast latent bug in billing components** — `SubscribeRecurringSection.svelte` (and siblings) reference `--ddsa-error-50/200/800`, `--ddsa-warning-50/200/800`, `--ddsa-success-50/200` tokens that don't exist in `src/app.css`. Real tokens are `--ddsa-error / --ddsa-error-bg / --ddsa-error-dark` plus equivalents. Silently falls back to hardcoded light-mode hex literals on dark backgrounds; the wrong-identity banner now uses real tokens but the `.info-card.{active,pending,error}`, `.returning-note`, `.plan-badge` classes still reference fake tokens. Coordinated CSS-token sweep, ~30-45 min.
> - **Webhook reachability for local dev** — Razorpay test-mode webhooks can't reach `http://localhost:5173`. Without ngrok/cloudflared tunnel, the `pending_mandate → active` state flip never fires; testers can verify mandate registration but not the state transition. Two options: (a) document the tunnel-setup pattern in `docs/runbooks/`, (b) provide a `/api/test/billing/simulate-webhook` dev helper that posts a synthetic event signed with the test webhook secret. ~30-60 min depending on option.
> - **Hooks `locals.user` resolution for phantom JWT user_id** — S216 surfaced a stale JWT id (`69945147c3ee59f0cbb211d4`, role='dsa') reaching the endpoint even though the id wasn't in any user collection (DSA / Applicant / RM / Admin / deletedUsers). Hook expected to null `locals.user` (lines 425-431) but evidently isn't. Diagnostic dive needed next time login auth is touched. `scripts/diag-find-user-id.mjs` is the standing triage tool. Investigation only, fix scope unknown until traced.
>
> **🟢 P2 backlog — S215 spin-offs added that session** (from TECH-DEBT-CLEANUP-2026-05-31 §6 closure):
> - **PLOT-BT snapshot `loanVintageMonths` time-bomb** (S208.5 finding) — derived months field computed at test-run time as `now - loanDisbursementDate` with disbursement fixed at "2016-04"; PLOT-BT regen 2026-06-01 locked value at 122; CI will fail again ~2026-07-01 when live engine output computes 123. Recommended fix: `vi.setSystemTime` in snapshot tests (single change, stable forever). ~30-60 min, test-infra surface. Schedule before 2026-06-30.
> - **Smart\* calculator `'LAP'` value cluster alignment** (S211 finding) — `SmartEligibilityCalculator.svelte` + `SmartAffordabilityCalculator.svelte` + `smartEligibility.ts` use `LoanCategory = 'Home Loan' | 'LAP' | 'Plot Loan' | 'Personal Loan' | 'Business Loan'` (smartEligibility.ts:59) + option list `{ label: 'Loan Against Property', value: 'LAP' }` (smartEligibility.ts:444). Same lying-name pattern as D6 (which was closed for `EligibilityCalculator.svelte` + `staticEligibilityEngine.ts` only). Public-facing calculators, separate value space from form pipeline — cosmetic alignment, calculator behavior identical regardless of value name. ~30-45 min, low risk pure cleanup.
> - **Already-durably-tracked open items (no backlog entry needed; pointers below)**: per-lender `bt_topup_treatment` engine flag → PITFALLS.md #69 + ADR-0024 D-4 + KNOWN LIMITATION at `evaluationEngine.ts:854`; Unsecured DC+Extra payload bridge → PITFALLS.md #69 (conditional on the flag); form-page-level payload-mutation trap → new PITFALL #71 (covers the resolved plot-loan example; other 5 loan forms not yet audited for the same pattern, ~30-60 min sibling audit opportunistic); Plot Loan enricher gap (`direct_from_developer` + plain `resale` fall through `payloadEnricher.ts:976-998`) → PITFALL #71 Detection section + LEND-1 Phase 2 follow-up (needs lender-policy audit before patch).
>
> **🟡 Epic F.2 — user-deferred this session, tracked as backlog:** Public anonymous eligibility checker. Spec at POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.2 stands. ~5 days when picked up. **Investigation needed before code:** does the rule engine support a thin/anonymous-estimate mode (no full income profiling)? If not, build a capped estimator using a subset of policies. **Anti-scraping**: public compute endpoint = scraping risk; reuse `formGuard.ts` + IP rate limit + heavy fingerprinting per AD-14. **Teased output only** (counts + ranges, never specific lender names — that's the signup incentive AND moat protection).
>
> **🟡 Epic E + F follow-ups (backlog):** endpoint integration tests for E.1/E.2/E.3 (helpers well-unit-tested; endpoints are thin glue, ~30-45 min each); F.5 exit-survey wiring into D.1 ManageSubscriptionPanel cancel flow (endpoint ready, ~45 min); F.5 server-side NPS dismissal persistence (currently session-only); F.1 reward-credit integration test + void-this-reward admin tool; F.3 admin `GET /api/admin/acquisition` report; F.4 CRM Win/Loss report UI + B.5 bulk-drop parity; E.4 6-year sweep cron (deferred until 2033 when first records reach expiry); E.3 cleanup cron for 90-day-old revoked sessions.
>
> **QBC follow-ups (optional, not blocking)**: notification email templates for the 3 QBC log events (~30 min each, pattern in `dunningEmails.ts`); OTel span promotion for the QBC log events (currently structured `logger.info`); operator setup of the 6th cron-job.org entry for `/api/cron/quota-blocked-archive` (daily 04:30 IST) via `scripts/setup-cron-jobs.mjs`.
>
> **Branch**: `main` @ `1332eb42` (S222 close commit will land on top, pushable) | **Tests**: 13,035 passing | **Errors**: 0 | **Warnings**: 0 (3 pre-existing CSS in `rm/+page.svelte` unrelated) | **Working tree**: 3 modified docs (SESSION-HANDOFF + CHANGELOG + DEVELOPMENT-PLAN) + 1 new ADR-0030 all rolled into the S222 close commit
>
> **Prior session work** lives in `docs/SESSION-HANDOFF.md` (active block at top + historical session-by-session blocks below) and `docs/CHANGELOG.md` (per-commit narrative). The pendency review at session start (2026-05-29) lives in the chat transcript and the active SESSION-HANDOFF block.
>
> **🔑 Epic D planning artifacts (created 2026-05-23 night)**:
> - [`docs/specs/D-1-RECURRING-BILLING-SPEC.md`](specs/D-1-RECURRING-BILLING-SPEC.md) — provider-agnostic architecture, state machine, 8 slices (S1-S8), 14-risk register, security checklist, operator runbook outline, kill-switch revert procedure, Yes Bank 10-question RM agenda, 6 owner lock-down questions
> - [`docs/adr/0014-billing-rail-provider-agnostic.md`](adr/0014-billing-rail-provider-agnostic.md) — decision record: Path 2 architecture chosen; leaf provider (Razorpay vs Yes Bank) deferred pending RM call
>
> **Parallel workstream — form-fix batch (2026-05-22 → 2026-05-25, ALL SHIPPED):** the owner's uploaded-issue queue P1–P16. **Done & on `main`:** P1-P14 + P16 all fixed across `ed55170d..a0f07423` (P10 fix landed `69c959e1` 2026-05-22; P16 stake-threshold alignment landed `a0f07423` 2026-05-25 — backend 20% threshold now matches UI). **True remaining (owner-side only):** P15 browser-smoke (HL NRI-country scrub + director income field-hide — code shipped, never smoked). Full detail in CHANGELOG.

---

## Where We Are

DSA-first fintech SaaS for Indian loan brokers. Three roles: DSA (primary), RM (bank partners), Admin.

**Core flow**: Form → Rule Engine → Lender Results → Case → File Builder → PDF → Track to disbursement.

**Platform status**: Feature-complete through Phase G + PMS Phases 0–6 (admin review/approval shipped S87). All 3 dashboards (DSA/RM/Admin), 6 loan forms, in-house rule engine, policy engine (8 phases), CRM, team management, i18n (en/hi/mr), dark mode, walkthroughs, guest demo, 8-layer anti-scraping, CI/CD — all built, tested, merged to `main`. Full Svelte 5 runes migration done. Store redesign done. Billing secured. Security hardened. Performance optimized. Form optimized. Production stable on Vercel (rinn.in) — Node 22.x, gsap inlined into SSR bundle, error alerting active to tech@digitaldsa.com.

**What's blocking production**: 2 items — credential rotation (PB-7) + email hardening (PB-8). Do LAST before launch.

---

## Next Up — UNIFIED EXECUTION ORDER

> **This is the single sequencing authority.** It merges the architecture
> roadmap (`ARCHITECTURE-EVOLUTION.md`) and the post-audit feature program
> (`POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md`) into ONE ordered backlog, so
> every `/start` reads one coherent "do this next" — no reconciling parallel
> plans. Both of those docs point HERE for order; they own item *detail*, this
> owns *sequence*. `/end` folds any newly-discovered work into the right tier
> below. (Sequencing confirmed with owner 2026-05-20.)

**▶ DO THIS NEXT (post 2026-05-28 — D.1 S5 SHIPPED + review-audit sweep; remaining is S6(partial)-S8 ~7 days):**

**Immediate next-session action**: owner-driven smoke test of S3 renewal cron per [`docs/runbooks/D1-S3-RENEWAL-CRON-SMOKE.md`](runbooks/D1-S3-RENEWAL-CRON-SMOKE.md) (8 tests, ~20 min, ₹0 — uses dev-only `/api/test/billing/simulate-charge` against MockProvider). In parallel, operator wires external scheduler (cron-job.org or equivalent hitting both cron endpoints with `x-cron-secret` — Vercel Free tier caps at 2 crons/day per S3 I-5). After all 8 pass + scheduler is live → S4 retry state machine is safe to build.

1. ~~Final read-through~~ ✅ DONE 2026-05-25
2. ~~D.1 spec + ADR-0014 sign-off~~ ✅ DONE 2026-05-25 (APPROVED)
3. ~~S1 — Subscription state model + MockProvider + R11 driver~~ ✅ SHIPPED 2026-05-26 (`8543ba2b`)
4. ~~S2 — Razorpay adapter (5 SDK methods)~~ ✅ SHIPPED 2026-05-26 (`e33ab8db` + `3f99b6a0`)
5. ~~S2.1 — Endpoints + DB persistence + smoke runbook~~ ✅ SHIPPED 2026-05-26 (`cff735e7`/`d18064d0`/`77975108`/`bdc6f46d`)
6. ~~S2.5 — Capacitor mandate-auth helper~~ ✅ SHIPPED 2026-05-26 (`31a92c2a`)
7. ~~S2.1b — Subscribe UI + Billing mount~~ ✅ SHIPPED 2026-05-26 (`cb2355b2`)
8. ~~**S3** Renewal cron + pre-charge reminder cron~~ ✅ **SHIPPED 2026-05-27** (`012d41f1` M1 + `cc5ee1a4` M2/M3/M4 + `8c5e06bc` M5 webhook handlers + `26bc6023` M6 simulate-charge+runbook). Plus same-day smoke (caught the failed_attempt_count bug) + cron-job.org wiring + CSRF latent-bug fix. Production scheduled.
9. ~~**S4** Retry state machine~~ ✅ **SHIPPED 2026-05-27** (`e3a7c77a` M1 self-loops + `93ee0abc` M2 retry scheduling/recovery + `21bbbd33` M3 /retry-now + race fix + `3c183cac` M4 tests + `ab082c5d` M5 docs/runbook). +14 tests. Race-protected. Runbook at docs/runbooks/D1-S4-RETRY-SMOKE.md.
10. ~~**S5** Dunning escalation~~ ✅ **SHIPPED 2026-05-28** (`16ed8267`). 5 milestones in one commit: M1 pure day-N math (+29 tests), M2 `/api/cron/billing-dunning-advance` endpoint + batch driver (+10 tests), M3 4 email templates + `dispatchDunningAdvanceEmail` + t0 wired into chargeEngine.handleFailure (+12 tests), M4 `DunningBanner.svelte` + server-load helper (+19 tests), M5 smoke runbook + 3rd cron-job.org job (jobId 7682877 daily 03:00 IST).
11. **D.1 implementation ✅ COMPLETE 2026-05-28** — all 8 slices done or intentionally retired:
    - **S6** ✅ COMPLETE 2026-05-28 — all 7 milestones shipped. M1+M2 (`d4a98fe2`, pause/resume/cancel endpoints, +12 tests). M3-M7 (`fff2d65a` / `f2916f0e` / `f195a42f` / `943c832e` / `ee61edde`, +56 tests): update-payment-method endpoint with R6 advisory lock + atomic webhook swap, change-plan endpoint with asymmetric upgrade/downgrade + NEEDS_REMANDATE cap check, Manage subscription panel UI (3 tabs: Subscription / Transactions / Payment method) wired into /dashboard/dsa/billing, /api/billing/transactions paginated endpoint, 90-day pause auto-cancel cron (4th cron-job.org entry, 03:30 IST) with day-60 reminder email, D1-S6 smoke runbook + cross-module integration test file. **Operator follow-up**: run `node scripts/setup-cron-jobs.mjs` to provision the 4th cron; smoke per docs/runbooks/D1-S6-MANAGE-SUBSCRIPTION-SMOKE.md.
    - **S7** ✅ COMPLETE 2026-05-28 — all 6 sub-tasks shipped in 3 commits. Engine + cron + drift email (`d38130d6`, +28 tests): pure reconcileSettlements matcher with 4 discrepancy kinds (missing-our-side/missing-provider-side/amount-mismatch/unmatched-test-auth), ₹1 auth-pair within-1h heuristic, IST settlement-window math with month/year/leap-year boundary tests; /api/cron/billing-reconcile with x-cron-secret + cronLock + (run_date, provider) unique index for double-defense idempotency; operator-facing drift email with critical/standard severity routing. Admin view (`804e7a70`): /dashboard/admin/billing/reconciliation paginated table + row-expand drill-down + drift-only filter, admin-only. Provisioner + runbook (`57fddac9`): 5th cron-job.org entry d1-billing-reconcile @ 22:30 UTC (04:00 IST, runs after pause-sweep); D1-S7 smoke runbook with kill-switch dry-run reference. **Operator follow-up**: re-run provisioner (idempotent) to add 5th cron; live drift verification deferred to first real production drift (engine logic locked by 28 unit tests in interim).
    - **S8** ⛔ **SKIPPED 2026-05-28** — owner confirmed no legacy cohort exists; spec's detection filter (`state='active' AND mandate_token IS NULL`) would match zero rows. Replaced with a small cleanup pass (+14 tests, ~12,215 total): planResolver helper as the new SoT for "active plan"; 5 legacy reads migrated (`evaluate-and-persist` subscription gate + case-limit gate, `rule-engine/evaluate` subscription gate, `da-quota` + `da-topup` tier reads); 3 legacy route folders archived to SvelteKit-private `_archived/` (one-time `subscribe`/`cancel`, `billing-trial-reminder` cron); billing dashboard rewritten as a clean shell over `SubscribeRecurringSection` + `ManageSubscriptionPanel` + trust strip; `archived_at` field added to legacy txn type + filtered out of `/api/billing/transactions`; idempotent `scripts/d1-s8-skip-legacy-cleanup.mjs` produced for operator. Full rationale in `docs/specs/D-1-RECURRING-BILLING-SPEC.md` §4 S8.
4. **SEC-8 (Nodemailer → SES + SPF/DKIM/DMARC)** is now a **HARD PREREQUISITE for D.1 launch** (per R15 in the spec + critique P1-5). Bumped from "deferred until beta". Slot this in before S5 dunning ships.
5. **Then D.2-D.6** (GST invoicing → refund → dunning → reconciliation → pricing fence) per the original Epic D plan in `POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md`. D.4 (dunning) and D.5 (reconciliation) fold into D.1's S5 and S7 respectively — already covered.
    - **D.2 GST invoicing** ✅ **COMPLETE 2026-05-28** — 6 commits (`1aeb988c` retire DA top-up / `5eef8874` one-extra-case gesture / `8be710b7` schema / `b7596176` engine+PDF+email+19 tests / `ddb39571` endpoints+UI+chargeEngine-hook / `beca1c22` ADR-0019+docs). Inclusive-GST pricing locked (ADR-0019); back-computed taxable+tax; gapless per-FY counter via atomic `findOneAndUpdate`; PDF rendered on-demand via pdf-lib; invoice-ready email with deep-link (no attachment); admin Billing nav-link added (`d102f86d`). Operator follow-up: set the 4× `INVOICE_SELLER_*` env vars in the `rinn` Vercel project — done this session.
    - **D.3 Refunds** ⛔ **ABANDONED 2026-05-28** (owner decision). No in-app refund UI, no `/api/admin/billing/refund`, no `Refunds` collection, no credit-note counter, no DSA refund-notification email. **Rationale:** billing only fires after the 30-day Pro trial ends (ADR-0018 / D.1 S2), so the trial period IS the buyer's-remorse window. Edge-case refunds (duplicate debit, service-failure outage, etc.) handled manually by operator via `billing@digitaldsa.com` → Razorpay dashboard. Volume expected near-zero. Spec §D.3 marked ABANDONED with full rationale. **Companion policy-page revamp** ✅ done in commits `d290b2ab` + `a610e6e9` (TRIAL_DAYS consolidation + refund page removed).
    - **D.4 / D.5** — already folded into D.1's S5 (dunning) and S7 (reconciliation).
    - **D.6 Pricing fence** ✅ **COMPLETE 2026-05-28** (with 2026-05-29 follow-up: annual billing removed as a product feature, owner decision — `cb0f3139`. Spec D.6 listed annual as part of the pricing-fence audit fix but the owner reversed: monthly only, no annual product. Slice 3's toggle UI + the four annual-cycle helpers are gone; recommendation badge + GST disclosure + dedup features + 80% soft-warn + upgrade modal all preserved.) — 4 slices, 4 commits, 72 new tests. Slice 1 (`eea241b0`): helpers — `recommendPlan(activeCases)`, `getAnnualPrice` (× ANNUAL_PRICE_MULTIPLIER = 10), `getAnnualSavings` (= 2 months free), `getGstBreakdown` (ADR-0019 inclusive split), `BillingCycle` type; legacy dual-badge `plan.badge` field removed. Slice 2 (`8339d317`): 80% soft-warn ladder on case-limit gate — `warn_level: 'approaching' \| 'at_gesture'`, `recommended_plan` carried in payload. Slice 3 (`f76189ef`): SubscribeRecurringSection redesign — monthly/annual toggle, GST disclosure, single Recommended badge (defaults to Pro), feature dedup ("All plans include…" + per-card extras). Slice 4 (`6cea603c`): end-to-end upgrade modal — server returns structured 402 `case_limit_reached`, `confirmAndSubmit` auto-opens ConfirmModal with spec copy, Upgrade routes to `/dashboard/dsa/billing?recommend=<planId>`, panel reads + validates param. **~~Carry-over slice (KILLED 2026-06-02)~~**: annual billing backend work (anchor stamping + R6 mandate cap at annual amounts) is moot — annual was reversed as a product feature in `cb0f3139` (2026-05-29) per owner decision. Monthly-only is final. Any residual annual-cycle helpers that survived the `cb0f3139` reversal should be removed when next touching `billing.ts`.

### Landing-page revamp coordinated edits — ✅ ALL DONE 2026-05-28

(Was a deferred batch; landed in two commits ahead of the broader landing-revamp.)

1. ~~Refund policy page rewrite~~ — **page entirely removed** (archived to `(legal)/_archived_refund/` per "never delete files" rule). Owner decision: 30-day Pro trial covers buyer's-remorse; no refund policy needed. URL returns 404; footer / legal-layout / sitemap / routes constant all pruned. Commit: this session's archive-refund commit.
2. ~~Terms refund clause~~ — **bullet removed entirely** from `(legal)/terms/+page.svelte` (was "Refunds — case-by-case basis"). Same commit.
3. ~~DisclaimerSection trial duration~~ — done in `d290b2ab` (14 → 30 via shared TRIAL_DAYS constant); sentence rewritten in this session's archive-refund commit to drop the "See our refund policy" reference and lead with the trial.
4. ~~HeroSection + FinalCTASection trial duration~~ — done in `d290b2ab` (7 → 30 via shared TRIAL_DAYS constant).

Single source of truth: `TRIAL_DAYS` in [`lib/config/billing.ts`](../src/lib/config/billing.ts). All consumers (API handlers + landing surfaces) import from there.
6. After D-NOW closes, **Epic E (Compliance)** per the locked epic order.

**2026-05-23 night session — DONE**:
- ✅ F1 (impersonate/start rate-limit) fixed + locked by static-scan test (`5577be62`)
- ✅ C.7 PR-2 cleanup script shipped both `.ts` declarative (`543c445b`) + `.mjs` runnable (`d35658d9`); live dry-run + execute verified end-to-end against dev MongoDB (10 rows matched, 8 modified, 2 logged for review then deleted on owner authorization)
- ✅ Code review for 27-commit delta (`0ba274e3`)
- ✅ Worktree cleanup — 9 directories removed (~750 MB freed); 12 branch refs cleaned outside Claude
- ✅ F2 carry-forward comment shipped (`225df52f`)
- ✅ D.1 spec + ADR-0014 written (this commit) — provider-agnostic architecture; leaf provider TBD pending Yes Bank RM call

**Browser-smoke from late-evening session ✅ DONE** — all 8 Epic C items + admin Impersonate full path + billing UX back-nav guard verified live in `pnpm dev`.

**Tier 2 Epic C status: ✅ COMPLETE.** All 8 items shipped this session with documented follow-ups (C.7 PR-2 cleanup script; C.5 TTL routing for money rows tied to Epic E; C.4 teamContext elevation deferred; C.3 click tracking deferred; C.1 reputation card deferred).

**Then: Tier 2 — Audit Epic B remainder (B.6 analytics ✅ done 2026-05-22) + B.4 (c)/(d), then Epic C.** (Epic A.2 fully done; Epic B core done 2026-05-21: B.1/B.2/B.3/B.4-core/B.5. See the Tier 2 bullets below for exact status + deferrals.)

### Tier 0 — finish near-done ✅ DONE (2026-05-20)
1. ~~**SEC-2** read-site migration~~ — **already complete** (commit `52bb024c`). Verified 2026-05-20: every `FormSnapshots.payload` consumer routes through `resolveSnapshotPayload`; the "7 sites remaining" note was stale. SEC-2 is now **code-complete**; only operator backfills remain (see operator list).
2. ~~**PERF-3** closure~~ — **closed** (admin smoke verified zero idle polling; roadmap row flipped 🟢→✅).

### Tier 1 — launch-blocking (Audit Epic A)
3. ~~**RM Settings auto-provisioning fix**~~ — ✅ **done 2026-05-20** (`0fb59186`). ensureRmProfile + set-role hook + POST /api/rm/profile/complete + 3-state Settings page. i18n deferred to Epic H. Live-smoke verified.
4. **Gap A** — admin-proxy structured policy capture. Sliced (3–5 day item):
   - **Slice 1** ✅ done (`868f7aae`) — provenance model + `POST /api/admin/policies/proxy-capture` + `createProxyRmStub` + `GET /api/admin/rm-search` + tests.
   - **Slice 2** ✅ done (`769d8507`) — parameterized `PolicyCaptureWizard` (apiBase/banner/submitLabel) + admin autosave/submit endpoints + Step-0 page + admin wizard page + entry button. Browser-smoked 2026-05-21 (full path: entry → Step 0 → create 201 → wizard autosave PATCH persists → submit flips to `submitted`; both existing-RM and stub-RM modes; CSFLE search/decrypt OK).
   - **Slice 3** ✅ done 2026-05-21 — RM-side confirm. `canConfirmProxy()` guard + `POST /api/rm/policy-captures/[capture_id]/confirm-proxy` (ownership-gated by rm_id, flips `admin_manual_proxy` → `rm_confirmed` + confirmed_at/by, audit log). RM list chip ("Entered by admin · confirm" / "Confirmed by you") + detail-page banner with Confirm button. Surface is `/dashboard/rm/policy-capture` (not `/policies` — captures live there). **Also fixed (found during smoke):** both RM policy-capture load functions used a naive plaintext-mobile fallback that returned null for RMs whose session id isn't their `rmApplications._id` (and fails under CSFLE) — switched to the canonical CSFLE-aware `rmHelpers.resolveRmDoc`. Browser-smoked end-to-end (chip → banner → confirm → flip; double-confirm rejected 400). 4 guard tests.
   - **Slice 4a** ✅ done 2026-05-21 — admin capture-review surface (the orphaned-captures fix). New `captures` tab on `/approvals` lists submitted/under_review `PolicyCaptures` (RM + proxy) with provenance badge + completion/unknown-fields + Activate (reuses `POST /api/admin/policy-engine/captures/[id]/activate`) + "unconfirmed admin-proxy only" filter (this subsumes the spec's "Registry Health unconfirmed-proxy filter" — that page is the PMS *form-key* registry, unrelated). New read-only admin view `/dashboard/admin/policies/captures/[capture_id]`. Browser-smoked: tab → filter → review (read-only) → activate → capture leaves queue + live artifact created.
   - **Slice 4b** ✅ done 2026-05-21 — Step-0 dedup soft-warn. New `GET /api/admin/policies/proxy-capture/check-existing?lender_id=&product_type=` (admin-gated); Step-0 page debounce-checks when lender + product are both set and shows a non-blocking warning listing existing non-rejected captures (across all RMs, links to the read-only review view). Next stays enabled — `canSubmit` never references the dup state. Browser-smoked. **i18n deferred to Epic H** — completes Slice 4 / Epic A.2 except i18n.
   - **Fragility fixed 2026-05-21** (was: `ConditionalRuleEditor.svelte` 500 on partial `core_parameters`). Defaulted the array prop to `[]` in all 6 policy-capture editors that read `.length`/`.map`/`{#each}` on a prop array — ConditionalRuleEditor, SlabEditor, MultiplierEditor, DeviationBuilder, CustomEntryEditor, IncomeTypeGrid — so a capture with missing/partial step arrays renders empty instead of throwing on SSR. Repro verified: malformed capture review view 500 → 200.

### Tier 2 — polish + incremental grind (Audit Epics B/C, interleaved)
5. Audit **Epic B** (DSA polish) + **Epic C** (RM/Admin polish: 8 items). i18n for all of B/C deferred to Epic H.
   - **B.2** ✅ done 2026-05-21 — enum→label. `src/lib/config/loanTypeLabels.ts` (`loanTypeLabel`, idempotent: human strings pass through, raw enums canonicalise, variants tidy) applied at the load boundary on DSA cases list (filter + cards), DSA case detail, RM cases; demo loader matched. **Decision changed mid-slice (owner pushed back, correctly):** display-only → display **+ backfill**, because the mix (200 `"Home Loan"` + 18 raw `"home_loan"`) made the filter list "Home Loan" twice and silently miss the 18 — a correctness bug, not cosmetics. `scripts/backfill-loan-type-enums.mjs` (dry-run-first; rewrites ONLY enum-form values whose canonical label differs → safe by construction, variants untouched) ran on dev: 18 `home_loan`→`Home Loan`. Verified: filter now shows one "Home Loan", no raw values. **Residual:** RM encode wizard "home" is a product-slug domain (not case `loan.type`) — handle when touching that flow. **Operator:** run the backfill on prod/preview before relying on the filter there.
   - **B.1** ✅ done 2026-05-21 (forward-gen; existing-case backfill deferred) — case-label generator, NAME-FREE per owner. `src/lib/utils/caseLabel.ts`: stored `Case.label` = name-free descriptor **"{Type} — {Project?} — {City} — {Profile} case"** (e.g. "Home Loan — Ghaziabad — SENP case"); `classifyApplicantProfile` (applicantType/employmentType/incomeType → Salaried/SEP/SENP/Company/Pensioner, keyword-based + graceful null); `dsaCaseTitle(label, fullName)` appends the FULL name for the DSA's own views only. 14 tests. **Privacy:** the customer name is NEVER in the stored label, so every partner surface (RM portal, share links, share emails — all read `Case.label`) is name-free by construction; the DSA sees the full name only in their authenticated views. Wired at creation (`evaluate-and-persist`): project from `projectName{Manual,Selected}`, city from §10 route key, profile from primary applicant. `Case.label_is_custom` + cases-PATCH lock retained. **No locality field exists** in the forms — only project (builder cases) / pincode / area-*type*; "Arya Nagar"-style locality would need a new form field (separate slice). **REMAINING:** backfill of existing cases (deferred — applicant name is in the CSFLE-encrypted snapshot, needs CSFLE-aware operator tooling).
   - **B.5 — DSA daily triage table ✅ done + browser-verified 2026-05-21.** Owner reframed the cases list as the DSA's daily command center: triage what needs work, sort it to the top, hide detail until a row opens. `src/lib/utils/caseTriage.ts` (`computeCaseTriage` → priority bucket + `nextAction` + sort `rank`; 9 tests). Server load reworked: fetch full filtered set (cap 1000) → compute fields+triage → sort across ALL cases (default **needs-action-first**: rank → stalest → recent; `?sort=` also amount/stage/age/updated) → slice page → decrypt page snapshots for the Applicant/Location columns. UI: card/table **toggle** (default table, localStorage); triage columns **• priority dot · Applicant (full name) · Loan · Amount · Stage · Next action · Age · Updated**, click-to-sort headers, and **inline row-expand** → detail panel (per-lender breakdown, docs bar, Open case / File builder). Browser-verified: stuck cases float to top, dots/next-action render, sort headers re-query, row-expand works. Demo loader has parity.
   - **B.3** ✅ done 2026-05-21 — case-detail header leads with the primary applicant FULL name (decrypted from snapshot at load), descriptor label + case ID as subtitle. Works for old + new labels. DSA-only. Demo parity. Commit `606946c5`.
   - **B.4** core ✅ done 2026-05-21 (commit `606946c5`). (a) Needs Attention rows now show applicant name + reason chip ("Stuck Nd"/"Query open"/"Doc expiring") + "View all N →"; names decrypted for the ≤MAX_ATTENTION_ITEMS cases. (b) bell count badge — **already existed** (NotificationBell unread badge). **Deferred:** (c) Delete Account → profile danger-zone → fold into **Epic E** (account deletion); (d) global top-bar search → needs a role-aware change to the *shared* dashboard header + cases page already has search (low marginal value). Attention grouping (≥3 same-reason) also deferred.
   - **B.6** ✅ done 2026-05-22 (commit `36241273`) — analytics empty-state neutrality. Spec sub-items (a) sanctioned-amount target raised from ₹1K → ₹50L/month in `scorecardEngine.ts` DEFAULT_TARGETS; (b) empty-period metrics rated benign `good` via `ratingForSample()`, excluded from overall score, insights self-suppress. Sub-item (c) PRO label gating is **deferred by design** — spec line 1199 ties it to the Epic D pricing-fence (resolves B.6/D.6 together). "Soft-start for first 90 days" scoring also deferred (spec line 1243 — "park for a focused pass"). Verified live-smoke 2026-05-22 per SESSION-HANDOFF.
   - **Epic B status:** B.1/B.2/B.3/B.4-core/B.5/B.6 ✅. Remaining: B.4 (c)/(d), then Epic C (8 items). B.6 sub-item (c) and soft-start scoring tracked under Epic D pricing-fence / focused-pass park.
6. **Interleave per PR:** a few **DX-2** (Zod, ~137 routes left) routes alongside each polish change. **DX-4 (`apiOk/apiError`) — SAFE SURFACE EXHAUSTED 2026-05-22.** ~77 route files migrated across 4 batches (crm/scorecard `5f8a6f59`; rm/admin/dashboard/communication `2f98d340`; cases/team/leads/sources/share-link/user/dsa `f715a7a5`; onboarding/role/coins/form-submit/rule-engine/policy-engine `f3c351fb`). The **remaining ~30 raw `json()` are INTENTIONALLY bespoke and must stay**: auth/* (token/`exists`/`verified`/`userExists` contracts), `razorpay/verify` (payment), `security/honeypot-trap` (deceptive anti-scraping), `form/evaluate|options|location` (header-pervasive no-cache — apiOk can't carry headers), `location/*`+`pincodes` (bare-key list contracts), `test/*` (dev), and per-route bespoke success shapes (redirect, sessionId, validationErrors, rule-engine `code`, etc.). Migrating any of these would change the response and break clients. DX-4 is effectively closed. — folds the open-ended grind into real work instead of a standalone slog. (2026-05-22: crm-lenders + dashboard/scorecard [`5f8a6f59`], then a parallel-agent batch of 26 route files across rm/* + admin/dashboard/communication [`2f98d340`] — all byte-identical envelopes; bespoke top-level-key responses deliberately left as raw json(). Two isolated worktrees, merged linearly. Chosen while a parallel session held the UI files.)
7. **Interleave Android CODE (verify later):** **SEC-3** (Capacitor SecureStorage for tokens) + **MOB-1** (Capacitor HTTP plugin) — write the code now; on-device verification deferred to Tier 4.

### Tier 3 — money / compliance / growth (Audit Epics D → E → F, then G/H)
8. Per the locked epic order. D-now (billing/GST/refund/dunning/reconciliation/pricing-fence); D-later (corporate-DSA payout) sequenced after this program.

### Tier 3b — Rule engine: Guarantor eligibility assessment ✅ SHIPPED 2026-05-28

✅ **Guarantor eligibility assessment v1** — `c951ed09`. Owner-flagged gap ("we have missed this part in entire development") closed. Engine now answers "will this guarantor actually be ACCEPTED by Lender X?" not just "is guarantor income verified?". `evaluationEngine.ts` Step 8c: identifies guarantor via classification, computes capacity % = `max(0, g_income × max_foir − g_obligations) / proposed_EMI × 100`, runs age-at-maturity gate, demotes GREEN → AMBER on rejection. `LenderResultCard.svelte` shows compact 2-state row (✓ Accepted / ✗ Rejected with capacity % and reason) hidden entirely on no-guarantor cases. `ParsedLenderRuleDocument.guarantor_acceptance.min_emi_capacity_percent` carries per-lender threshold (default 80 HFC, `null` = lender refuses guarantors entirely). 18 tests in [`guarantorEligibilityAssessment.test.ts`](../src/lib/testing/__tests__/guarantorEligibilityAssessment.test.ts) lock the engine block + types + UI + pure-math. **v1.1 carry-overs** (deferred per spec): property-backed floor carve-out; family vs non-family threshold variation; capacity-gap-based ROI risk-adjust; auto-suggest "swap this guarantor for X". **Operator follow-up**: RM team can update per-lender thresholds via PMS encode wizard over time — engine works against HFC 80% default from day one (zero-blocker rollout).

### Tier 4 — Android on-device verification session (real phone or cloud farm)
9. **SEC-1** (cert pinning — needs a device/build) + **verify** SEC-3/MOB-1 from Tier 2. One dedicated session; physical Android phone or BrowserStack/Firebase Test Lab/AWS Device Farm. Sequence near the mobile release.

### Tier 5 — pre-launch, LAST (your standing decision)
10. **SEC-7** (`.env` credential rotation) + **SEC-8** (Nodemailer → SES + SPF/DKIM/DMARC). Do immediately before launch.

### Tier 6 — post-launch (do NOT start until coding roadmap clears)
11. **Public Site V2 — landing rebuild + multi-page architecture + knowledgebase + blog + SEO/LLM discoverability.** Full master plan in [`docs/specs/PUBLIC-SITE-V2-MASTER-PLAN.md`](specs/PUBLIC-SITE-V2-MASTER-PLAN.md). **Trigger conditions** (all must be true before starting): D.1 S3-S8 shipped + D.2-D.6 shipped or ADR-deferred + SEC-7 + SEC-8 + ≥30 days of post-beta GSC traffic data. Workstreams: W1 landing V2 (brief in [`LANDING-PAGE-V2-DESIGN-BRIEF.md`](specs/LANDING-PAGE-V2-DESIGN-BRIEF.md)), W2 ~120-route architecture (lenders/loan-types/cities/resources), W3 119-URL cleanup (KEEP/TRANSFORM/301/410 map driven by GSC data), W4 knowledgebase + blog (glossary-first, 50-term build), W5 SEO plumbing (robots.txt, llms.txt, JSON-LD, sitemap, OG). Est. 15-20 dev days + 6-8 weeks content writing. `/start` will surface this once Tiers 1-5 clear.

### Parked (pick up only opportunistically)
- 🟡 PERF-2 (streaming load), SEC-6 (Vercel WAF), FORM-1 (superforms new forms).
- ⚪ Deferred: PERF-6/7/8, SEC-9 (CSP), FORM-2 (superforms for the 6 loan forms).

---

### Operator-side (no code — enablement pending, not blocking the order above)
- **DATA-4:** set `ANALYTICS_ETL_ENABLED='true'` + `CRON_SECRET`; wire an external scheduler to `POST /api/cron/analytics-etl` (`x-cron-secret`, `30 20 * * *` UTC = 02:00 IST). `ANALYTICS_PEPPER` NOT needed in v1. Runbook: `docs/runbooks/DATA-4-ANALYTICS-ETL-RUNBOOK.md`.
- **SEC-2:** re-run `scripts/sec2-init-deks-standalone.mjs` (or .ts in Vite) on prod/preview Atlas — dev done. Then `sec2-backfill-users.ts` + `sec2-backfill-snapshots.ts` (`--dry-run` first).
- **DATA-2:** set `DATA2_TOKEN_PEPPER` + `DATA2_SWEEP_ENABLED='true'`, add a scheduler entry for `/api/cron/data2-revoke-sweep`. **Also a real pending feature:** the case-close consent UI (spec §7) — DATA-2 isn't usable end-to-end without it (slot into Tier 2/3 when prioritized).
- **DATA-3:** flip `DATA3_DELETION_ENABLED='true'` + scheduler when ready.

**Deferred (owner decision, DATA-4):** the 4 lender/eligibility fields (`recommended_banks`, `loan_amount_eligible`, `interest_rate_band`, `emi_amount`) are null in v1. Backfill from the immutable `LenderResultsSnapshot` when the first analytics dashboard is built — most valuable signal (engine accuracy / override rate), but no consumer yet and fully reconstructable later.

---

### COMPLETE — 2026-05-19 (afternoon): DATA-1 + DATA-2 server-side complete + BOLA regression net + DX-4 batch + SEC-5 R1 live smoke + 2 draft retention specs

**18 commits `cc36ce6d..48d2a54c`**, all pushed to `main`. See `docs/CHANGELOG.md` for the full per-commit narrative. High-level outcomes:

- **DATA-1 (lead-routing vault) — 7 slices complete.** Per `docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md`. Bucketing utilities (locality / price / quarter) → collection registration + indexes → `POST /api/dsa/lead-vault` (write with consent-doc gate) → `GET /api/dsa/lead-vault` (DSA transparency, BOLA-scoped) → `GET /api/lead-routing/match` (3-pass routing: pincode → locality → loan_type-only, with k-anonymity suppression k≥5 standard / k≥10 luxury) → privacy contract regression test (`vaultWritePathCheck`) → `DELETE /api/dsa/lead-vault` (DPDP §13 erasure with audit-log-first ordering).

- **DATA-2 (BT/DC outreach vault) — 9 slices complete.** Per `docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md`. Foundation (types + consent gates C1-C3 + HMAC revocation tokens with constant-time compare) → `OutreachVault` + `ConsentRevocationLog` collections + indexes → `buildVaultEntry()` orchestrator → `POST /api/dsa/btdc-vault` (CSFLE-deterministic mobile, duplicate guard via equality lookup on encrypted value) → list + single GET endpoints (BOLA-gated) → DSA revoke endpoint (90-day grace period) → eligibility query (0.5 bps floor, sorted by ROI gap) → **UNAUTHENTICATED** public self-revoke endpoint (HMAC token IS the auth, rate-limited 20/hr/IP) → daily grace-period sweep cron (audit-log-first hard-delete, ImageKit retry policy reused from DATA-3) → privacy contract regression test.

- **BOLA regression net (`cc36ce6d`).** Two static-scan test files (~480 lines combined) lock SEC-5 closure at source level. Walks every cases-API handler and asserts ownership-gate invocation; partitions parameterized SSR loads by family and asserts each family's expected scoping primitive. Catches the copy-paste regression that the type system cannot.

- **SEC-5 R1 live smoke verified (`c58535fa`).** Seeded dev MongoDB with a test RmLenderAssignment + 2 PolicyRules + 2 pending_rm_review versions; browser smoke confirmed positive (own-lender loads) + negative (cross-lender 403) paths end-to-end. Key finding documented in the seed script: `RmLenderAssignments.rmUserId` carries `AdminUsers._id` for admin-mirror users, not `rmApplications._id` (verified against 79 existing real-lender assignments).

- **DX-4 incremental — 9 cases-family routes migrated.** From raw `json()` to `apiOk/apiError/apiServerError/apiValidationError`. Roadmap counter: 36 → 48 / ~159 routes.

- **CSFLE bug fix (`fdf89b21`).** `src/lib/server/csfle/client.ts` used bare `require()` in Vite's ESM dev runtime — every dev session with `CSFLE_ENABLED=true` was hitting `ReferenceError`. Fixed via `createRequire(import.meta.url)`. Production was unaffected (SvelteKit adapter-vercel shims require) but the fix is correct everywhere. Also: logger Error serialization (was showing `{}` for Error objects due to non-enumerable props), and a new Node-runnable standalone init-deks script that doesn't depend on `$env/dynamic/private` (a Vite-only API).

- **Two draft architecture specs (`b4f5af46`).** `docs/specs/PII-RETENTION-POLICY-SPEC.md` covers four data audiences (borrower, DSA, RM, analytics plane). Captures the time-bounded approach driven by the offline-lender PDF-form-fill constraint: real PII while case is active, hash + last-4 + first-name-only after cooling-off (90 days borrower / 6 years DSA driven by GST). 16 open product/legal questions flagged. `docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md` is the focused Phase-6 case-feed-only scope: new `digitaldsa_analytics` MongoDB database, nightly Vercel cron ETL, `ANALYTICS_PEPPER` env var for the one-way `person_id` HMAC bridge. 8 v1-specific open questions. Both committed as drafts (NOT approved); user decision was to keep them as reference and defer DATA-4 implementation to next session.

**Tests:** 11,047 → 11,294 (+247). **Errors / warnings:** 0/0 throughout. **Production stable** — every new code path gated behind an env flag or behind the absence of a Vercel cron entry.

**Verification gaps:** DATA-2 production smoke (once env vars + cron are set), DATA-1 routing under thin-cohort load (synthetic seed needed to verify k-anonymity suppression fires), PERF-3 closure flip on the roadmap.

**Next up:** DATA-4 Slice 1 (per user direction — scheduled at end-of-session). Spec ready. About half a day.

---

### COMPLETE — 2026-05-19: SEC-2 Phase A+B + Director P4 + PERF-3 A+B + 5 design specs

**17 commits `c72bf9e2..2bd38807`** in a single long session, none pushed yet. See `docs/CHANGELOG.md` for the detailed narrative. High-level outcomes:

- **SEC-2 — pivoted from Atlas Queryable Encryption to CSFLE explicit mode.** QE required shipping a ~30 MB `crypt_shared` native binary with the Vercel function (250 MB compressed-bundle risk); we never range-query PII anyway. CSFLE explicit + local KMS now (CMK in Vercel secret), AWS KMS Mumbai later via `rewrapManyDataKey`. ADR-0009 captures the decision.

- **SEC-2 Phase A (CSFLE infrastructure).** New `src/lib/server/csfle/` module: client (lazy ClientEncryption factory), keys (9 DEK definitions), helpers (primitives), setup (idempotent DEK creator), userCrypto (per-collection encrypt/decrypt walkers + dual-query lookups). Plus `scripts/sec2-init-deks.ts` + 4 env vars. Gated by `CSFLE_ENABLED='true'`; passthrough plaintext when off, so code deploys safely BEFORE the operator runs the init script.

- **SEC-2 Phase B (38 routes + 4 shared helpers wired).** 14 commits across the auth chain (signup, check-dsa, check-email, detect-roles, create-rm, restore-account, delete-account), onboarding flows (dsa-onboarding v1+v2, rm-onboarding, team-member-onboarding), admin user mgmt (admin/admins, admin/users/dsa, admin/users/rm), RM portal (15 routes — submissions, policies, captures, threads, review, verify-email, cases/query, ratings, broadcasts, profile, sample-data), and 9 cross-cutting routes (scorecard, render-for-case, share-with-rm, set-role, get-coins, update-coins, sample-data flavors, team/invite). Plus 4 shared helpers (`caseHelpers.resolveDsaId`, `rmHelpers.resolveRmDoc`, `ensureApplicantProfile`, `adminParallelAccess.ensureAdminParallelRecords`) which propagate encryption-awareness to ~40 more consumer routes without per-route edits.

- **CSFLE passthrough contract tests (+20).** `csflePassthrough.test.ts` locks the off-mode behavior so future changes can't silently break the production safety net. Test-infra fix: `mongodb-client-encryption` native binding broke vitest's jsdom pool — resolved via lazy `require` inside the factory + `vi.mock` stubs in the test file.

- **Director firm-name Phase 4 (+22 tests).** `firmNameOptions.test.ts` (12 tests for dropdown source assembly: parent firm first, sibling order, "(already added)" suffix, dedup) + `borrowingFirmDeclaration.test.ts` (10 tests for the Partnership/LLP "at least one partner must declare" rule). All 4 phases now shipped (Phase 1 component + Phase 2 wiring + Phase 3 validation + Phase 4 tests).

- **PERF-3 test-runner — Phase A + B.** 659-line `admin/testing/test-runner/+page.svelte` reduced to 200 lines via `_components/TestCard.svelte` extraction (Phase A — mechanical refactor) + `createQuery` polling replacing the per-card setInterval pattern (Phase B — mirrors the e2e-run pilot from yesterday `40ea218a`). Auto-stops on terminal status, auto-cleans on unmount.

- **5 design specs from the parallel-agent fan-out.** `SEC-2-CSFLE-PLAN.md` (active), `SEC-2-ATLAS-QE-PLAN.md` (supersession redirect), `DATA-1-LEAD-ATTRIBUTION-SPEC.md` (redesigned per user direction — DSA-attributed lead-routing vault, bucketed values, k-anonymity gate, NO encryption needed), `DATA-2-CONSENTED-VAULT-SPEC.md`, `PERF-3-NEXT-CANDIDATE-PLAN.md`, `DIRECTOR-FIRM-NAME-SPEC.md`.

- **SEC-5 BOLA regression net (107 new tests).** Static-scan suite asserting every admin policy-engine route imports both `requireRoleApi` + `requireAdminPermission`. Closes the gap noted in ARCHITECTURE-EVOLUTION.md.

**Tests:** 10,978 → 11,020 (+42 net code tests; +107 SEC-5 regression tests included in the day's total). **Errors / warnings:** 0/0 throughout. **Production stable** (encryption code is no-op passthrough until operator runs init script).

**Verification gaps:** No real-encryption tests (encrypted-path requires live Atlas dev cluster + DEKs — separate nightly CI workflow). No browser smoke of TestCard.svelte or Director firm-name combobox yet — recommend team smoke-test both before next session.

**Next up:** Push the 17 unpushed commits. Operator runs `pnpm tsx scripts/sec2-init-deks.ts` against Atlas (Production / Preview / Dev). After that, SEC-2 Phase C (backfill script) + SEC-2 `formSnapshots.payload` walker (biggest remaining piece — architectural design needed) + DATA-1 / DATA-2 implementation.

### COMPLETE — 2026-05-17/18 multi-day run: DATA-3 end-to-end + Pitfall #39 (3 modals) + 5+2 team-reported bugs + SEC-5 sweep (81 → 107) + PERF-3 (pilot+2) + Pitfalls #40/#41/#42 (post-/end)

**11 commits `0114a655..655b3ff2`** spanning two calendar days, with three additional form-lifecycle pitfalls landing post-/end. See `docs/CHANGELOG.md` for the per-commit breakdown. High-level outcomes:

- **DATA-3 shipped end-to-end, gated off by default.** Design spec (`docs/specs/DATA-3-FILE-DELETION-SPEC.md`) + ADR-0006 (sequencing: DATA-3 → SEC-2 → DATA-2 → DATA-1) + full implementation across `src/lib/server/data3/` (types, state machine, 4-gate verify, retention floor, audit log, ImageKit deletion with retry, daily sweep) + cron endpoint `/api/cron/data3-sweep` + Mongo collections + 123 new tests. Operational runbook at `docs/runbooks/DATA-3-PRODUCTION-WIRING.md` ready for ops to flip `DATA3_DELETION_ENABLED='true'`.

- **Pitfall #39 — ConfirmModal dismissal class.** Original fix (Bug B FEMA dismissal) shipped 2026-05-16 as commit `0114a655` — added `dialogState.dismissConfirmModal()` canonical method + wired every dismissal path. Extended 2026-05-18 (`5823ae61`) with `afterNavigate` cleanup for SvelteKit route changes — applied to ConfirmModal, SameCompanyPromptModal, InfoModal. Extended again (`ec4e8979`) with `afterNavigate` for RestoreApplicantModal — same architectural class (state-singleton + layout mount + no DOM event on route change).

- **FEMA / foreign-firm gates extended to all 4 call sites.** QuestionRenderer (property loans), AddApplicantBusiness, AddApplicantProfessional (business + professional loan applicant flows), and IncomeSourceForm (director's partner-in-firm income). Every site now wires `onCancel: resetToIndia` so dismissal via any path reverts the offending selection.

- **SEC-5 sweep advanced 81 → 107 routes audited (~71%).** 3 batches (`40ea218a` RM portal 7 routes / `4ab00bdd` scattered 8 routes / `b2018790` PMS-policies family 11 routes). 0 hard BOLA gaps found this run; surfaced 5 defense-in-depth `findOne({owner_id}) + updateOne({})` slips (all fixed), 1 HTML-injection in DSA-notification email (escaped via `escapeHtml`), 1 admin-bypass divergence on `pms/policies/[id]` PATCH (brought to parity with sibling routes), 1 ITR profit-without-turnover validation gap (tightened `isMediumComplete`).

- **PERF-3 component migrations: pilot + 2.** S103 pilot was `admin/policies/[artifact_id]`. Added `admin/testing/e2e-run` (dropped `setInterval` + `pollStatus`+`stopPolling` for `createQuery` `refetchInterval`) and `NotificationBell.svelte` (shared component — `onMount` + `setInterval(60s)` + `mounted` guard replaced by two `createQuery`s sharing the `['notifications']` namespace; cache shared across every dashboard layout).

- **Capital contribution % validation.** Belt + suspenders: `maxLength: 3` on the config + numeric `question.max` clamp in the type='number' onInput handler. Catches keystroke + paste cases.

- **Clear Form navigation hardened.** Extracted `clearFormAndGotoPicker.ts` helper that awaits `goto` and falls back to `window.location.href` if URL didn't change. Fixed the "blank page" trap when navigation guards silently cancel the goto after a destructive state reset. All 6 loan pages migrated to use the helper.

- **Three additional form-lifecycle pitfalls (post-/end, commit `e8e467bb`).** Pitfall #40 — `PendingRestoreBanner` Cancel didn't resync the local `formApplicant` buffer in AddApplicantBusiness Sole-Prop inline form; new monotonic-counter signal (`restoreIntentState.markCancelled` + `cancelledAt` + `clearCancelled`) lets subscribers detect a fresh cancel event without coupling. Pitfall #41 — loan variant change (`loanType` / `PlotLoanActivity` / `unSecureLoanType` shifts within the same loan name) reshapes the form's visible-page set, so saved per-loan page index pointed at a semantically different page in the new variant; picker now detects variant-shaping-key writes and calls a new `resetLoanPageIndex(loanName)` from the orchestrator. Pitfall #42 — `performance.getEntriesByType('navigation')[0].type === 'reload'` was inlined across all 6 loan `+page.svelte` files but is stale across SvelteKit client-side nav (one F5 anywhere in the session made every subsequent client mount of any loan page read as a reload, re-firing SessionResumeModal); new `isReloadOfCurrentPath()` util compares the navigation-entry's `name` (URL frozen at document load) with `window.location.pathname` (live), all 6 loan pages migrated. +22 tests across 3 new test files.

**Tests:** 10,706 → 10,862 (+156 net across the run; +22 in the post-/end Pitfalls #40/#41/#42 batch). **Errors / warnings:** 0/0 throughout. **Production stable**.

**Verification gaps:** none outstanding — every visible bug from the 2 team screenshot reports was fixed in code. Suggest team re-test the 7 reported scenarios + the 3 form-lifecycle pitfalls against current `main` (commit `655b3ff2` or later).

**Next up:** Per ADR-0006 sequencing — DATA-3 production wiring (ops-side, runbook ready) → SEC-2 (AWS KMS partner-blocked) → DATA-2 → DATA-1. Continue SEC-5 sweep (~43 routes remain). PERF-3 #4 needs a sub-component refactor budget (test-runner, approvals, file-builder all candidates).

### COMPLETE — Session 104 (2026-05-16): chokepoint v1 + Pitfall #21/#24 redesigns + 7+ regressions + dev SSR unblock

**12 commits `787f70f4..ab48258a`** — see `docs/CHANGELOG.md` for the full per-commit breakdown. High-level outcomes:

- **Loan-switch chokepoint v1** (`c1f87898`). Registry + orchestrator + park/undo state + 6 route guards + Pitfall #38 + 25 integration tests. **Modal UX later reverted in `ab48258a` per user direction (ADR-0007)** — switch is silent; orchestrator infra retained as it drives parked-loans resume strip + tests.
- **Pitfall #21 retraction** (`586d5c07` → `ba0a6ef5`, ADR-0008). Server-side cross-field validation no longer fires per-keystroke; the Next-click `await evaluateOnServer + tick` flush is the sole trigger. Client-side field-level rules (max/min/regex) stay instant.
- **Pitfall #24 redraft** (`e376ff1c`). Salaried deselect→reselect now auto-restores: per-applicant `_stashedIncomeEntries` for the unsecured single-applicant path, `applicantDataStore.restoreProfileEntries` for the multi-applicant `IncomePageNew` path. No more missed "Restore?" banner.
- **Same-company prompt visibility** (`5eb3b798` → `94c57388`). Moved to form `+layout.svelte` level via `dialogState.sameCompanyPrompt` — escapes the nested-`<dialog>` stacking issue that hid it in some browsers.
- **Dev SSR jsdom unblocked** (`8bb1b289`, user's commit). `jsdom`/`isomorphic-dompurify`/`html-encoding-sniffer`/`@exodus/bytes` are now `noExternal` only in `command === 'build'`. Dev gets Node's native CJS loader; prod parity preserved.
- **CIBIL + FEMA + form-input UX fixes**: 5-component visual unification + mobile font parity (`787f70f4`); month-picker forward range + professional-loan card mobile stack + razorpay noExternal (`c7762a04`); CIBIL 999 no-badge + non-digit reject + FEMA dismiss reset (`4c950ee7`); CIBIL `beforeinput` keystroke block + TextField numeric error blur-gate (`ab48258a`).

**Verification gaps:** 6 items not walked through end-to-end this session — Bug B/C/E/G, same-company-on-top-of-income-page, Salaried auto-restore. See SESSION-HANDOFF for the full list. Next session's first task: browser verification sweep.

**Next up after verification:** DATA-3 (file deletion after Gemini extraction — bounded 3-sub-session plan agreed at S103 close still stands). Then ADR-0006 (data segregation — slot reserved at S103) → DATA-1 → DATA-2 → SEC-2 → continued SEC-5/DX-2/DX-4 sweep.

### COMPLETE — post-S103 final pass (2026-05-15/16): Items 1/2/4/5 from priority list

**5 commits `c32e525f..7a5a7de1`** — see `docs/CHANGELOG.md` for the full per-commit breakdown. High-level outcomes:

- **Item 1 — ApplicantSelect placeholder muted** (`13d72d7f`). Follow-up to morning visual-unification commit — placeholder text now stays muted gray instead of solid black/white.
- **Item 2 — Restore modal UX overhaul** (`b9292570`). 3 of 5 sub-items shipped: People/Companies section split (#35), profile-aware filter for director slots (#36), historical-company-overlap warning (#37). 2 sub-items explicitly deferred with rationale (separate director-context matches; recovery-bin snapshot immutability).
- **Item 4 — `/form/home-loan` 500 cleared** (`7a5a7de1`). S102 carry-forward bug already resolved by intervening commits; 6 new loader smoke tests now lock the contract for all 6 secured + unsecured loan-form page servers.
- **Item 5 — CLAUDE.md §3 → `docs/PITFALLS.md` split** (`7a5a7de1`). 1,790 → 656 lines (63% reduction). docs/PITFALLS.md 1,024 lines (read on-demand). §17 Doc Hygiene updated to pin the working pattern.
- Plus `a9a429b2` earlier today: Plot-BT banner fix (#33) + LAP-BT role-distribution check (#34) — 2 user-reported screenshots resolved.

9 new pitfalls catalogued (#29-#37). 46 new tests across 6 new test files. Tests: 10,630 → 10,676. CLAUDE.md size watch — RESOLVED.

**Next up:** DATA-3 (file deletion after Gemini extraction) — bounded plan agreed: 3 sub-sessions. (a) Design pass → `docs/specs/DATA-3-FILE-DELETION-SPEC.md` (state machine, verification gate, retention policy, audit ledger, failure recovery; ~30-45 min, no code). (b) Implement state machine + `ArtifactDeletionLog` collection (~1-2 hr). (c) Wire ImageKit deletion + retry/backoff + env flag (~1-2 hr). Then ADR-0006 → DATA-1 → DATA-2 → SEC-2 → continued SEC-5/DX-2/DX-4 sweep.

### COMPLETE — Session 103 (2026-05-15): form-bug fixes + regression-proof discipline + bundled sweep + OBS-2 + PERF-3 + SEC-2 ADR + DATA-1/2/3

**8 commits `3479a087..647bef38`** — see `docs/CHANGELOG.md` for the full per-phase breakdown. High-level outcomes:

- 8 user-reported form bugs fixed across all 6 loan flows, each with a CI test + CLAUDE.md §3 pitfall + §4 grep recipe pinning the contract (9 new pitfalls #19-#28, 15 new grep recipes, +54 tests).
- SEC-5: 63 → 81 routes audited (~55% of estimated ~150). 2 fixes shipped (apply-delta in S102, rm/review Finding M1 this session). 0 deferred design calls remaining.
- DX-2: 12 → 25 routes Zod-validated. DX-4: 31 → 36 routes on apiOk/apiError.
- **OBS-2 ✅** — OpenTelemetry traces with PII scrubber. Off by default; production enablement awaits Prashant.
- **PERF-3 🟢** — TanStack Query infrastructure shipped + 1 pilot polling-page migration. Per-component rollout opportunistic.
- **ADR-0005** — SEC-2 design pass (Atlas QE + AWS KMS Mumbai + 4-phase plan; impl deferred ~1 week).
- **DATA-1 / DATA-2 / DATA-3** added to roadmap per user direction at close — anonymized market-intel dataset, consented BT/DC vault (DPDP-compliant), and ImageKit file-deletion-after-extraction. **ADR-0006** queued to resolve DATA-2-vs-SEC-2 sequencing.

**Next up:** DATA-3 (smallest, ~1-2 days) → ADR-0006 (resolves sequencing) → DATA-1 → DATA-2 → SEC-2 impl. Or continue SEC-5 sweep opportunistically (~70 routes remain).

### COMPLETE — S99 verified (originally shipped across S89–S91): PMS Phase 8 Track B — Legacy Comparison Runner + Admin UI

**Track A (engine integration) shipped S90** — published PMS policies now drive evaluations. See "COMPLETE — Session 90" below.

**Track B verified complete S99** — all 5 deliverables already implemented (discovered during S99 audit):
- `src/lib/server/pms/legacyCompare.ts` — `compareLegacyVsPms()` field-by-field diff ✅
- `POST /api/pms/policies/[id]/legacy-compare` — admin-gated, persists `legacyCompareRun` ✅
- `POST /api/pms/policies/[id]/legacy-resolve` — 3-way resolution with `PendingChange` + RM notifications ✅
- `ChangesTab.svelte` — discrepancy table when `legacyCompareRun` is present ✅
- Deletion gate on admin sidebar (`canMarkForRemoval`) ✅

**S88 audit backlog items** (rolled into Track B scope):
- `PMS_SIGNING_SECRET` env-var separation; replace 4 `CRON_SECRET` usages
- `Math.random()` → `crypto.randomInt()` in `/api/pms/otp/send`
- Rate limits on `pms_otp_send` (5/min) and `pms_otp_verify` (3/15min)
- Zod-validate `aiPipeline.ts` `parseJsonResponse` output
- Delta pipeline unit tests (S89 shipped with none)

### COMPLETE — Session 90 (2026-04-24) — PMS Phase 8 Track A: Evaluation Engine Integration

**commit `ca31dc52`** — 5 files changed, 1,549 insertions, 3 deletions, 10,141 tests.

Published PMS policies now drive real DSA evaluations. The rule engine previously only read hardcoded TS rule docs (seeded from `realBankRuleDocs.ts`). PMS was a shadow system for 7+ sessions. Track A makes it live.

**`pmsToEngineAdapter.ts` (new — pure function, no I/O):**
- 9 PMS sections → JSON-Logic `ParsedLenderRuleDocument` rule arrays
- eligibility: age + defaulter hard gates; CIBIL: hard gate + `cibil_floor`
- FOIR: dual parameter rules (salaried/SE via `_computed._is_salaried_file`)
- income_assessment: one rule per profile type + `*` catch-all wildcard
- ltv: one parameter rule per loan-amount tier + property-type overrides
- obligations: `ParsedObligationRule[]` with `credit_line_method` mapping
- tenure: `max_tenure_months` + `max_age_at_maturity` parameter rules
- roi: midpoint of minRoi/maxRoi as the offer rate parameter
- geo: `allowedStates` + `excludedCities` as property hard gates (null if empty)
- `conditionalOverrides`: set-effect overrides injected into respective sections (custom_json requires adminCoApproved)
- `existingLenderMeta`: merges `lender_name` + `classification` from legacy rule doc

**`evaluationEngine.ts` — `applyPmsOverrides()` (new):**
- Called after `loadActiveRuleDocuments()` — PMS overrides happen before per-lender eval loop
- ONE `$in` MongoDB query for all lender IDs (O(1) round-trips regardless of lender count)
- In-process TTL cache (60s) keyed by `lenderId:loanProduct`; graceful fallback on any error
- `invalidatePmsCache()` + `invalidateAllPmsCache()` exported for publish hooks

**`policyService.ts` — `approvePolicy()` fix:**
- Immediate approval (no schedule) now sets `status: 'published'` directly (was `'approved'`, which `getPublishedPolicy()` never returned — a pre-existing gap)
- Cache invalidation called on immediate publish

**Cron `publish-scheduled`:** pre-fetches promoted docs → targeted per-lender cache eviction after `updateMany`.

**41 new unit tests** covering all sections + ConditionalOverride injection.

### COMPLETE — Session 89 (2026-04-24) — PMS Phase 5 Entry B (Delta Parse Pipeline) + prod console-error sweep

**Track 1 — Phase 5 Entry B shipped:**
- `src/lib/server/pms/deltaPipeline.ts` — single-pass OpenAI diff, Zod-validated, sentinel-framed against prompt injection, per-delta evidence quotes and confidence
- `POST /api/pms/pipeline/delta` — stateless (no DB write); 60% size guard, 100k token circuit breaker, 10/min rate limit, RM/admin gated
- `POST /api/pms/policies/[id]/apply-delta` — forks published→draft via new `applyDeltaRevision()`; creates PendingChanges with `reason: 'delta_parse'`; atomic lockVersion update
- RM UI `/dashboard/rm/policies/[lenderId]/[product]/delta/` — 3-step wizard; reuses Entry A OTP submit (zero new auth surface)
- "Upload addendum →" CTA on detail page next to "Edit policy →"
- **No orphaned drafts**: draft only created when RM clicks Save in Step 1 — the stateless pipeline is a deliberate architectural divergence from the encode wizard.

**Track 2 — three production console defects fixed (`199e1984`):**
- `/api/set-role` 403 (×3) — three callers (dashboard `switchRole`, login `setActiveRole`, partner-signup OTP verify) used raw `fetch` instead of `secureFetch` → CSRF validation blocked them. All switched to `secureFetch`.
- `/api/get-coins` 404 — admin/RM accounts aren't in `Applicant` collection. Home page now only calls for `data.user.activeRole === 'dsa'`.
- `/dashboard/dsa` 500 on client-nav from home — stale app-shell cache after Vercel redeploy. New `src/hooks.client.ts` detects `Failed to fetch dynamically imported module` and reloads once per 30-second window.
- Also: `window.matchMedia` SSR crash in Vite 7 dev runner guarded in `theme.svelte.ts`; 6 pre-existing type errors from Phase 5 Entry B `parseJsonBody` destructuring pattern fixed.

**Gaps flagged**: delta pipeline has zero unit tests; S88 audit items still open (see Phase 8 kickoff).

### COMPLETE — Session 88b (2026-04-24) — PMS BUG 5/7 + landing UX revert

- **BUG 5**: client now sends `rmStep1Decisions: decisions` in pass3 POST body; server persists to `pipelineState.rmStep1Decisions` in same `updateDraftPolicy` call. Fixes lost step-1 decisions on refresh between steps 1↔2. Files: `src/routes/api/pms/pipeline/+server.ts`, `src/routes/dashboard/rm/policies/[lenderId]/[product]/encode/+page.svelte`. Commit `86b1367c`.
- **BUG 7**: `goToStep` now async; PATCHes `reconciliation.status='in_progress'` when navigating from step 5 back to ≤4. Best-effort — UI navigation proceeds even if PATCH fails. OTP gate at submit is the real security check. Same file. Commit `86b1367c`.
- **Landing UX revert**: restored `isLoading=$state(true)` on `/+page.svelte`. S88's removal was a quick test during prod 500 debugging; actual prod bug was gsap interop, fixed independently in `aac59171`. Commit `2cdfcb80`.
- **Phase 5 encode wizard now zero-defect** — all 10 bugs from S85 review closed.

### COMPLETE — Session 88 (2026-04-24) — Production stability saga + error alerting

- **No PMS feature work** — entire session was production hardening.
- **Dev `transport invoke timed out`**: Vite 7.3.x + Node 24 + Windows transport bug. Fixed by Node 22 LTS + Vite 7.2.7 + dropping `host: '127.0.0.1'` and `watch.usePolling`.
- **Prod 500 on `/`**: gsap CommonJS interop. Fixed by `ssr.noExternal: ['gsap']` in `vite.config.ts` so Vite inlines/transforms at build time. Also normalized 3 components that imported gsap directly.
- **Vercel runtime kept defaulting to Node 24**: `engines.node: ">=22.0.0"` was being interpreted as "use the highest available major" → Node 24. Fixed by pinning `"22.x"`. **Documented as CLAUDE.md Pitfall #7** — Vercel picks highest matching major, not lowest.
- **Console 403 on every page load**: `+layout.svelte`'s `registerDevice()` used raw `fetch()` instead of `secureFetch`. Device fingerprints had been silently failing.
- **ErrorBoundary too aggressive**: refactored with `isCriticalError()` allow-by-default + explicit deny-list (browser extensions, Razorpay/GA, SW reg, ResizeObserver, cross-origin script error).
- **Email alerting**: new `src/lib/server/errorAlert.ts` + `POST /api/errors/report` endpoint. Per-fingerprint dedup (15min) + global cap (30/hour) + per-IP rate limit. Recipient: `tech@digitaldsa.com`.

### COMPLETE — Session 87 (2026-04-24) — PMS Phase 6: admin review & approval

Built admin-side review workspace at `/dashboard/admin/policies/pms/[policyId]`. PMS loop now closes end-to-end: RM encodes/edits → submits → admin reviews diff + reconciliation → approves (now or scheduled) or rejects with notes. Impact Report tab deferred (own phase-sized effort). Commit `9e17e9fe`.

### COMPLETE — Session 86 (2026-04-24) — PMS Phase 5 Entry A: RM edit mode

Built post-publish revision flow for RMs (Entry A: direct field edit). 9-section editor at `/dashboard/rm/policies/[lenderId]/[product]/edit` with single-page layout, save-to-draft + OTP-gated submit. Entry B (delta parse) deferred to S89. Commit `9e17e9fe`.

### COMPLETE — Session 85 (2026-04-24) — PMS Phase 4: RM encode wizard

Built complete 6-step encode wizard at `/dashboard/rm/policies/[lenderId]/[product]/encode`. 8 files: `+page.server.ts` + `+page.svelte` + 6 step components. Full flow: document setup → clause review → encoding → missed items → reconciliation → OTP submit. S85b patched 8 of 10 bugs from review; BUG 5 + BUG 7 deferred (now closed in S88b).

### COMPLETE — Session 77d (2026-04-21) — S77c Phase 1.6: server-side folded parity in `/api/evaluate-and-persist`

- **Context**: S77c shipped client-side Layer A+B filter wiring (`cleanPayloadStore.svelte.ts` now derives `cleanPayload` / `casePayload` from `buildFilteredAnswers()` instead of raw memory) and committed as `7b6870f0`. The server-side submission entry `src/routes/api/evaluate-and-persist/+server.ts` was the **second bug surface** — its `buildPayloadFromFormState` helper projected raw formState straight into `buildLoanPayload` with zero visibility filtering. A replayed session or scripted POST could punch stale-branch data into the rule engine even with the client-side fix in place. S77c handoff called this out as "server endpoint parity — recommended pair with Phase 1.6"; this session took it.
- **Scope framing (user-directed):**
  - "Light is acceptable for now but it should be thorough for all loan paths" — all 6 loan paths in the breadth sweep; light depth per assertion.
  - "Better you check and create dynamic fixture system which accommodate the changes in questions and design and flow" — user flagged that the existing `formPathScenarios.ts` (3,975 LOC) + `fixtureProfiles.ts` (194 LOC) + `syntheticGenerator.ts` (162 LOC) + `archetypeTemplates.ts` (1,850 LOC) + `archetypeHelpers.ts` (844 LOC) infrastructure has drifted from the schema. **Empirically confirmed this session** — `formGapReport.test.ts` output shows 22% average required-question coverage across scenarios with 2,287 unanswered required questions. User chose Option B (schema-driven regeneration) WIDE scope for next session (S77e).
  - Sequencing: Option 2 — narrow Phase 1.6 now with a throwaway inline fixture; factory overhaul in S77e; migrate these tests off the throwaway fixtures once the factory lands.
- **Action taken (code landed, host-verified, pending commit):**
  - `src/routes/api/evaluate-and-persist/+server.ts`:
    - Added `import { buildFilteredAnswers } from '$lib/utils/payloadFilter.js'`.
    - Renamed `buildPayloadFromFormState` → `_buildPayloadFromFormState` (underscore = test-only export convention, matching prior art `_validateEvaluateRequest`).
    - Inserted `buildFilteredAnswers(null, rawLoanAnswers, rawApplicants)` call BEFORE `buildLoanPayload`. Schema stays `null` — Layer A is passthrough symmetric with client; Layer B gates (`includeGuarantorObligations`, `includeSelectedIncomeProfiles`) now active server-side.
    - Added comprehensive JSDoc block above `_buildPayloadFromFormState` documenting the S77d Phase 1.6 rationale, the layer posture (A passthrough + B active), and why server-side filter is required even with client fix in place (replay/scripted-client attack surface).
    - Updated single internal caller (end-of-file handler) to the renamed function.
  - `src/lib/testing/__tests__/ruleEngine/evaluateAndPersistFilter.test.ts` (new, ~250 LOC, 9 tests):
    - Test strategy — `vi.hoisted` + `vi.mock('$lib/utils/payloadBuilder/index.js')` replaces `buildLoanPayload` with a spy (`buildLoanPayloadSpy`). Assertions inspect spy call args (the filter's output) rather than `buildLoanPayload`'s output, which decouples tests from the payload-builder complexity and avoids needing valid minimal payloads per loan type. Prevents the rabbit hole that motivated user's "fixtures have drifted" concern.
    - Breadth: 6 tests (one per loan path — Home Loan, Loan Against Property, Plot Loan, Personal Loan, Business Loan, Professional Loan) using `guarantorOnlyApplicantWithStaleIncome()` inline fixture. Each asserts Layer B gates strip non-guarantor obligations + deselected income entries end-to-end per loan type.
    - Layer A passthrough: 1 test asserts stale business keys (`businessVintage`, `gstRegistrationStatus`) still reach `buildLoanPayload` unchanged — Phase 1.6 posture, symmetric with client. Ceiling to break when Phase 1.6b activates Layer A.
    - Non-mutation invariant: 1 test deep-clones formState pre-call, asserts whole formState + applicant internal arrays (`obligations`, `incomeEntries`, `selectedIncomeProfiles`) identical post-call — back-navigation UX depends on raw memory staying pristine.
    - Legacy split-array normalization: 1 test using `tableLoanEntries` + `tableLimitEntries` (no unified `obligations` field) confirms fold into unified array with only guarantor rows surviving.
    - Inline fixtures carry a prominent `THROWAWAY FIXTURES` banner + comment pointing at SESSION-HANDOFF "Fixture Overhaul" entry so S77e migrates them cleanly.
- **Host verification (all green):**
  - `pnpm check` — 0 errors, 1 pre-existing `MonthYearModal.svelte:51` warning (unchanged).
  - `pnpm test:unit` — 94 files, 9,933 tests passing (9,924 prior + 9 new).
  - `pnpm build` — `✓ built in 1m 8s`; adapter-auto advisory only (expected locally).
- **Posture after Phase 1.6**:
  - **Layer B** is live on BOTH submission entry points (client `cleanPayloadStore` + server `/api/evaluate-and-persist`). Stale non-guarantor obligations and deselected income entries can no longer reach the rule engine from either side.
  - **Layer A** remains passthrough on both sides. Activating Layer A is Phase 1.6b — deferred past S77e (fixture factory). Consequence: stale loan-answer keys from switched branches still reach the rule engine on both paths. Known, documented, not a regression versus pre-S77c posture.
- **Deferred to S77e (next session) — schema-driven fixture factory, WIDE scope**:
  - Write `docs/specs/FIXTURE-FACTORY-SPEC.md` BEFORE coding.
  - Build `schemaFixtureFactory.ts` + `branchSelectors.ts` + `stalenessInjectors.ts` + `payloadAssembler.ts` as factory internals.
  - Rewrite internals of `fixtureProfiles.ts` (194 LOC), `formPathScenarios.ts` (3,975 LOC), `syntheticGenerator.ts` (162 LOC) preserving public API: 25 named fixture exports + 10 back-compat aliases + `ALL_FIXTURES` + `ALL_SCENARIOS` + `SCENARIO_BY_ID` + obligation helper + `generateAllProfiles`.
  - Physically delete `archetypeTemplates.ts` (1,850 LOC) + `archetypeHelpers.ts` (844 LOC) — no archive (user explicitly ruled it out for this overhaul).
  - Reuse `dataPools/*` (1,710 LOC across cityPool/namePool/incomePool/obligationPool/entityNamePool/incomeEntryPool/conditionalFieldEnforcer) unchanged.
  - Migrate Phase 1.6 integration tests off the throwaway inline fixtures once the factory lands.
  - Fix 13 downstream consumers one-by-one with documented shift notes (Option (a) test-fallout policy): 9 tests + 3 production-adjacent (`src/routes/api/admin/policies/seed/+server.ts`, `src/lib/server/testing/syntheticProfiles.ts`, `src/lib/database/seedPolicyEngine.ts`) + 1 admin UI.
- **Deferred to Phase 1.6b (post-S77e)**: activate Layer A on both sides. Options unchanged from S77c handoff. Recommended post-factory: server endpoint accepting raw + returning filtered (leverages `schemaLoader.ts` deep-frozen cache, no client bundle bloat).
- **Deferred to Phase 2**: `bindsToCoverage.test.ts` / `typeContract.test.ts` / `groupingShape.test.ts` guardrails. Orthogonal to Phase 1.6b and S77e — can be scheduled any time.
- **Commit plan**: single squash `fix(submission): S77d Phase 1.6 server-side folded parity in evaluate-and-persist` covering `+server.ts` changes + the new 9-test file + this doc block + SESSION-HANDOFF + CHANGELOG + PAYLOAD_DOCUMENTATION entries.
- **Course correction**: initial approach considered end-to-end integration tests through the HTTP boundary, which would have required building valid minimal payloads per loan type — exactly the rabbit hole user's "fixtures have drifted" warning flagged. Pivoted to the `vi.mock`-on-`buildLoanPayload` pattern which tests the filter wiring in isolation; valid per-loan-type payload construction moves entirely into S77e scope where it belongs (the factory).

### COMPLETE — Session 77c (2026-04-21, committed as `7b6870f0`) — Resolution Plan 4D rewritten: submission-pipeline correctness rewrite (not just bridge deletion)

- Scope reframe: §4D originally framed `cleanPayloadStore.ts` as a mechanical bridge deletion. A deeper survey with the user revealed a **correctness bug in the submission pipeline**. The bridge deletion is downstream of fixing the bug.
  - User fills forms → answers accumulate in `formState.loanData[loanName]` across navigation (by design — raw memory preserves UX for back-navigation).
  - The submission pipeline (`cleanPayloadStore.svelte.ts:cleanPayload → buildLoanPayload`) reads this **raw** memory with no visibility filter.
  - Stale keys from now-invisible pages (e.g. business fields after user switched to Salaried) leak into the payload, pollute rule-engine derivations (`_is_business_file`, `_computed._total_gross_monthly`, loanAmount fallbacks), and produce wrong assessments.
- **Agreed contract** (confirmed with user before implementation): one physical raw store (`formState.loanData`), two derivations on top. Memory payload (raw) = untouched full history for restoration UX. Submission payload (filtered) = derived, never mutates raw, contains only current-route visible keys + derived keys computed from them.
- **Filter architecture — Layer A + Layer B on top of raw memory**:
  - **Layer A** (floor, schema-driven): `buildCleanAnswers(schema, rawAnswers)` drops every key whose page or question is invisible. Default-safe. New questions auto-excluded when hidden. Requires schema at call site — currently passthrough (schema=null) because client-side schema plumbing needs async `import()` or server pivot. **Deferred as Phase 1.6.**
  - **Layer B** (exceptions, gate-driven): Pure functions `(filtered, raw) => filtered` that pull specific keys back when business rules demand. Live immediately. Two seeded gates: `includeGuarantorObligations` (obligations survive hidden obligations page when `isGuarantorOnOtherLoan=Yes` + `ObligationsRunning=No`), `includeSelectedIncomeProfiles` (only selected income profile types survive into payload).
- **Action** (code landed, host-verify pending):
  - **Phase 1.1** — `src/lib/utils/payloadFilter.ts` (new, ~290 LOC): `FilteredView` interface, `LoanAnswersGate` / `ApplicantGate` interfaces, `APPLICANT_GATES` frozen registry (2 gates seeded), `LOAN_ANSWERS_GATES` frozen empty array (reserved for future loan-level overrides), `buildFilteredAnswers(schema, rawLoanAnswers, rawApplicants)` entrypoint, `explainFilter()` diagnostic, `pickObligationsArray` / `writeObligationsArray` helpers normalizing legacy `tableLoanEntries` / `tableLimitEntries` to unified `obligations`.
  - **Phase 1.2** — `src/lib/stores/cleanPayloadStore.svelte.ts` rewrite: `cleanPayload` and `casePayload` `$derived.by` consume `currentFilteredView().loanAnswers` / `.applicants` instead of raw `currentLoanAnswers()`. `currentSchema()` returns `null` as documented Phase 1.6 placeholder.
  - **Phase 1.3** — `combinedAnswersMemo.ts` audit confirmed no change needed. Lifted meta flags (`__applicantCount`, `ObligationsRunning`, `selectedIncomeProfiles`) are used only by client rendering for `isQuestionVisible`. Payload builders read raw applicant fields directly, not lifted flags. Architectural separation already exists.
  - **Phase 1.4** — Layer B gate audit of all 6 form pages. Two gates seeded with documented justification.
  - **Phase 1.5** — `src/lib/testing/__tests__/payloadFilterRegression.test.ts` (new, ~250 LOC): 14 tests covering Layer A schema-driven drop + `explainFilter` diagnostic, guarantor-only mode + legacy-shape normalization, selectedIncomeProfiles filter, non-mutation invariant (shallow copies + deep equality), gate registry sanity (freeze + no duplicate names).
  - **Phase 3.1** — `PayloadDebugger.svelte` migrated off the bridge's `$cleanPayload` auto-subscription; now imports `cleanPayloadState` directly from `$lib/stores/cleanPayloadStore.svelte` and reads `.cleanPayload` / `.casePayload` runes fields.
  - **Phase 3.2** — 6 form pages (`home-loan`, `lap`, `plot-loan`, `unsecure-loan/personal-loan`, `unsecure-loan/business-loan`, `unsecure-loan/professional-loan`) updated to import from `$lib/stores/cleanPayloadStore.svelte` instead of the bridge. Function names unchanged.
  - **Phase 3.3** — Bridge archived per "archive, never delete" policy (confirmed mid-session by user). Full content preserved at `src/lib/stores/_archive/legacy-shims/cleanPayloadStore.ts` with dated archival header, migrated-importer list, restoration note, adjusted relative imports. Live file `src/lib/stores/cleanPayloadStore.ts` rewritten as tombstone (`export {};`) with explanatory header pointing at archive. `tsconfig.json` already excludes `**/_archive/**` so the archive is a restorable record, not a compilation participant. Any accidental `import { X } from '$lib/stores/cleanPayloadStore'` now fails TypeScript with "Module has no exported member X" (loud-fail guardrail).
  - **Phase 3.4** — Documentation sync in progress this session: `src/lib/stores/README.md` + `src/lib/stores/_archive/README.md` landed; SESSION-HANDOFF / DEVELOPMENT-PLAN / CHANGELOG / PAYLOAD_DOCUMENTATION / ARCHITECTURE updates in this session's tail.
- **Deferred to S77d**:
  - **Phase 1.6** — client-side schema plumbing. Options: dynamic `import()` keyed on `loanName` in `cleanPayloadStore` (async — requires `$derived.by` refactor to handle promise state); move filter invocation to `formSubmitHandler` where load-data has schema context; **recommended**: server endpoint accepting raw + returning filtered, leveraging `schemaLoader.ts`'s deep-frozen cache. No client bundle bloat, activates Layer A everywhere at once.
  - **Phase 2** — three guardrail tests: `bindsToCoverage.test.ts` (schema walk + UI_ONLY_ALLOWLIST), `typeContract.test.ts` (schema type ↔ stored value type), `groupingShape.test.ts` (snapshot per loan type of `groupAnswersBySchema`).
  - **Server endpoint parity** — `src/routes/api/evaluate-and-persist/+server.ts` reads raw memory too. Same bug surface. Has `schemaLoader.ts` in scope → cleanest place to apply `buildFilteredAnswers` with live Layer A. Recommended pair with Phase 1.6 server-endpoint path.
- **Verification state**: sandbox cannot run `pnpm check` / `pnpm test:unit` / `pnpm build` (Cygwin-path `pnpm` shim broken on Linux, `node_modules/vitest/vitest.mjs` path resolves to Windows via `.pnpm` cache). All verification deferred to host. Hand-verify: submit each of the 6 loan flows after switching one employment type mid-form; confirm stale keys from the dropped path do not appear in `cleanPayloadState.cleanPayload.applicants[i]`; confirm `isGuarantorOnOtherLoan=Yes + ObligationsRunning=No` still pushes guarantor obligations through.
- **Commits**: this session's work is uncommitted at the point of this doc update — commits will follow the S77c convention once host-verification passes. Expect one commit per phase (1.x, 3.1/3.2/3.3, 3.4) or a single squashed `fix(submission): S77c correctness rewrite` with references to each phase. Final decision on commit granularity made at host-verify time.

### COMPLETE — Session 77b (2026-04-21) — Resolution Plan 4C: `buildCombinedAnswers` — three different algorithms documented, no consolidation

- Investigated RESOLUTION-PLAN §4C (consolidate `buildCombinedAnswers` copies → 1). The `homeLoan/schema.ts` variant was already archived in §4B (zero live importers), so scope collapsed to two live copies — `$lib/utils/combinedAnswersMemo.ts` (canonical for the six form pages) and `$lib/form/firstPage/schema.ts` (loan-picker page) — plus the server method in `$lib/server/formEngine/engine.ts`. Physical survey confirmed these are **three different algorithms, not three copies**. Every row of the differences matrix differs from every other row in at least three of five dimensions:
  - `combinedAnswersMemo.ts` — flat merge, no schema walk, no defaults, applicant meta flags, paired with `stableReference()`. Used by all 6 form pages.
  - `firstPage/schema.ts` — schema walk WITH type-specific default injection, no applicant meta. Sole consumer: `how-can-we-help/+page.svelte`. Default injection is load-bearing because the loan-picker is paired with the naive `isQuestionVisible` evaluator from §4A.
  - `server/engine.ts` — schema walk but only copies real answers (opposite of firstPage — defaults would pollute the submission payload). Adds `locationConfig` pre-flatten branch AND flagKey resolution with a contextKey-collision guard. Lives inside the `jsonLogic.add_operation` singleton-override boundary from §4A — cannot be ported back to client.
- **Action** (no behaviour change; documentation-only):
  - Detailed header block above `buildCombinedAnswers` in `src/lib/form/firstPage/schema.ts` explaining the schema-walk-with-defaults semantics, the naive-evaluator pairing from §4A, and the sole consumer.
  - Extended the 4B-era header above the server `buildCombinedAnswers` method in `src/lib/server/formEngine/engine.ts` to enumerate both server-only specialisations (`locationConfig` branch, flagKey + contextKey-collision guard) and the "no default injection" semantic that is opposite to the firstPage variant.
  - Top-of-file "why three shapes, not three copies" block on `src/lib/utils/combinedAnswersMemo.ts` with the full differences matrix.
  - RESOLUTION-PLAN §4C rewritten as CLOSED with three-row algorithmic-differences table + "do not reopen without" footnote enumerating the load-bearing specialisations future refactors must reproduce. S77 execution-schedule row annotated.
- **Forward-looking**: if the loan-picker migrates to server-driven evaluation (same migration that subsumed the per-loan-type client namespaces in §4B), `firstPage/schema.ts`'s `buildCombinedAnswers` becomes archivable. Default injection is load-bearing only because the naive evaluator from §4A is. Until that migration happens, documenting is cheaper than pre-emptively refactoring.
- **Course correction**: None. Option A (pure documentation, matching the §4A pattern) was pitched correctly against the survey findings. Original RESOLUTION-PLAN §4C framed this as "3 copies → 1 (canonical: combinedAnswersMemo)" which conflated file count with algorithmic equivalence — the three shapes are not substitutable.

### COMPLETE — Session 77b (2026-04-21) — Resolution Plan 4B: `resolveBindsTo` — 2 dead files archived, 3 live copies documented

- Investigated RESOLUTION-PLAN §4B (consolidate 5 `resolveBindsTo` copies → 1). Physical survey at HEAD revealed the plan's count was over-stated and architecturally wrong:
  - `src/lib/utils/formUtils.ts` was already archived in S74 — plan listed it as live.
  - `src/lib/form/homeLoan/schema.ts` (111 lines) and `src/lib/form/homeLoan/validation.ts` (188 lines) had **zero live importers** at HEAD — the entire files were dead code, not just the `resolveBindsTo` body. All their exports were superseded by `$lib/server/formEngine/*` (server engine) and `$lib/utils/combinedAnswersMemo.ts` (memoised client combiners).
  - The three remaining copies (`firstPage/schema.ts`, `server/formEngine/engine.ts`, `ExistingLoanDetails.svelte`) are genuinely live and each has a structural reason to stay standalone.
- **Git archaeology:** `homeLoan/schema.ts` was introduced in `895470dd` as the first of an intended 6-per-loan-type client namespace structure (homeLoan/, lap/, plot/, personal/, business/, professional/). Before the other 5 could be built, architecture pivoted to server-driven evaluation (`e0534f0e` + `3104d918`) and the plan was abandoned. Only `firstPage/` and `homeLoan/` ever existed. The `// ✅ Home-loan-specific resolver` comment was aspirational — body stayed byte-equivalent to firstPage's because specialisation never arrived. This is a **frozen abandoned-migration artifact**, structurally different from §4A's active-invariant split — nothing relied on it, nothing suffered from it, but the stray parallel files were a future-refactor false-alarm magnet.
- **Reasons each live copy stays standalone (documented in each file's header):**
  - `firstPage/schema.ts` (3-arg) — canonical client; used by `how-can-we-help/+page.svelte`.
  - `server/formEngine/engine.ts` (3-arg) — canonical server; adds `locationConfig` pre-flatten branch (server sees compound location questions, client never does) AND lives inside the `jsonLogic.add_operation` singleton-override boundary from §4A + CLAUDE.md Pitfall #1.
  - `ExistingLoanDetails.svelte` (2-arg inline) — scoped to existing-loan sub-form; templates never reference `q1_loanName`, 3rd arg not meaningful.
- **Action** (no behaviour change):
  - `git mv` both dead files to `src/lib/form/_archive/homeLoan-schema.ts` + `homeLoan-validation.ts` with dated archival headers pointing at introduction SHA `895470dd` and per-export zero-importer proof.
  - New `src/lib/form/_archive/README.md` mirroring `src/lib/stores/_archive/README.md` convention (archive policy + per-file rationale + restore paths).
  - Canonical-copy header block added to `firstPage/schema.ts` explaining what the other two live copies are for.
  - Rationale blocks (replacing thin "Ported from" comments) added to `server/formEngine/engine.ts` on both `resolveBindsTo` and `buildCombinedAnswers` — three structural reasons each: `locationConfig` branch, singleton boundary, multi-ingestion key hygiene.
  - `server/formEngine/textResolver.ts` "Ported from" comments updated to point at archive path and mark the server copy as canonical.
  - Scoped-inline-copy comment added above `resolveBindsTo` in `ExistingLoanDetails.svelte` explaining the 2-arg signature and pointing at the canonical header.
  - RESOLUTION-PLAN §4B fully rewritten as CLOSED with 6-row status table (LIVE × 3, ARCHIVED-this-session × 2, ALREADY-ARCHIVED-S74 × 1). S77 execution-schedule row annotated.
- **Course correction**: scope grew mid-execution when a zero-importer trace showed the entire `homeLoan/schema.ts` was dead, not just the `resolveBindsTo` body. My original Option A pitch ("replace body with re-export from firstPage, keep `buildCombinedAnswers`") was built on an assumption that `buildCombinedAnswers` had live importers — it didn't. Re-confirmed with user before archiving the whole file rather than leaving a re-export shim (which would itself have been a future false-alarm generator).
- **4C** (`buildCombinedAnswers` — 3 copies) still open, now effectively "2 copies → 1" since the homeLoan variant went with the archived file. Pre-peek: `$lib/utils/combinedAnswersMemo.ts` is canonical; `firstPage/schema.ts` has its own copy consumed by `how-can-we-help/+page.svelte`. Will investigate whether firstPage's variant can collapse into the memoised version or whether it has loan-picker-specific defaults.

### COMPLETE — Session 77b (2026-04-21) — Resolution Plan 4A: `isQuestionVisible` split documented, no consolidation

- Investigated RESOLUTION-PLAN §4A (consolidate `isQuestionVisible` copies). Git archaeology on commit `3acc7489` (anti-scraping / form guard) showed the three surviving copies are a **deliberate architectural split**, not duplication. Consolidating any pair would silently regress either the form-guard session budget or the payload-cleaning parity with client rendering.
- **The split** (documented in both client file headers + RESOLUTION-PLAN):
  - `firstPage/visibility.ts` → naive `jsonLogic.apply(rule, full-answers)`; only called by `how-can-we-help/+page.svelte` (loanName + loanType radios — deps answered on click, dep guard unnecessary).
  - `homeLoan/visibility.ts` → fail-OPEN dep guard (show until dep answered); only called by `$lib/utils/payloadGrouping.ts` via `cleanPayloadStore` + `loanTransaction`. Must mirror client rendering so submission payloads don't drop answers the user filled while a dep was briefly empty mid-render.
  - `server/formEngine/visibility.ts` (canonical) → fail-HIDE via global `jsonLogic.add_operation('!='/'!==')` override; required by `formGuard.ts` session question-budget (under fail-open, every conditional question counts as visible on a blank form, instantly blowing the budget).
  - Structural constraint: the server overrides mutate the shared `jsonLogic` singleton process-wide; importing the server module from client code would flip every client JSON-Logic evaluation to fail-hide. The client copies cannot just re-export the server one.
- **Action** (no behaviour change): added explanatory headers to `homeLoan/visibility.ts` and `firstPage/visibility.ts` citing `3acc7489` and CLAUDE.md Pitfall #1; RESOLUTION-PLAN §4A fully rewritten as CLOSED with semantic/caller/reason table; S77 execution-schedule row annotated. The `formUtils.ts` copy from the original 4A list was already archived in S74 — nothing to do there.
- **Course correction**: original §4A was stale in three ways — listed already-archived/renamed files, treated unrelated in-use exports (`BT_TOPUP_PAGE_ORDER`, `resolveVisiblePages`, etc.) as deletable alongside, and ignored the deliberate `3acc7489` split. Plan entry rewritten accordingly.
- **4B** (`resolveBindsTo` — 5 copies) and **4C** (`buildCombinedAnswers` — 3 copies) still open — may be genuine duplication or may have similar hidden reasoning; will investigate each the same way before touching code.

### COMPLETE — Session 77a (2026-04-20) — Resolution Plan Batch 3 Part 2a (rule-engine & RERA performance)

- Executed `docs/RESOLUTION-PLAN.md` Batch 3 items 3E + 3F + PERF-036 — 3 commits (`2ca35bfa`, `c10f61b5`, `ea70973e`), zero behaviour change. S77 was split: S77a ships perf wins (this entry), S77b will take 4A–4C refactors.
- **3E** (`2ca35bfa` + `ea70973e`): per-request loan evaluation against N lenders was issuing 3N MongoDB queries (N× ProductVariations + N× PolicyRules + N× PolicyVersions) via `Promise.all` over `resolvePoliciesForLender`. Collapsed to a fixed 3 queries regardless of N using `$in` on the union of product_ids, matched variation_ids, and geo-scope IDs.
  - `policyResolver.ts`: extracted `buildEmptyResolvedPolicy` and `buildResolvedPolicyFromRules` helpers (single source of truth for sort/merge/provenance invariants); single-lender `resolvePolicy` now delegates — byte-equivalent output. Added `resolvePoliciesForMany(queries)` with phase-1 cache check (respects existing 1hr TTL so already-cached entries skip the DB round-trip), phase-2 union of axes, phase-3 one `PolicyRules.find($in)`, phase-4 one `PolicyVersions.find($in)`, phase-5 per-miss resolution via the extracted helper.
  - `variationMatcher.ts`: added `matchVariationsForProducts(productIds, payload)` — one `ProductVariations.find({$in})` for all products, `buildVariationContext(payload)` computed once (lender-independent), per-product filter + priority DESC sort. Same graceful-fallback semantics as the single-product function.
  - `policyResolverBridge.ts`: extracted `resolvedFieldsToParsedPolicies` helper reused by both paths. Added `resolvePoliciesForLenders(lenderIds, productType, geoContext, payload)` returning `Map<string, ParsedPolicy[]>`. Uses `as unknown as PolicyResolutionQuery[]` cast matching the single-lender path's `as any` (ProductType/ZoneType literal unions).
  - `evaluationEngine.ts`: call site switched from `Promise.all(evaluations.map(...))` to a single batched call + plain `for…of` applying `mergePolicies` in memory.
- **3F** (`c10f61b5`): `engineContext.ts` RERA lookups (getBuildersForCity / getBuildersForState / getProjectsForBuilder / hasBuildersForCity) now have per-function 5-minute TTL in-memory Map caches. RERA data is essentially static reference data — projects/builders don't change mid-session — yet every form render re-ran the 3-hop query chain. Cache keys are post-alias/post-sanitize/lowercased so "Gurgaon"/"Gurugram" share a slot; empty results cached too so "no data" queries skip the full probe chain on repeat; Delhi state-level fallback also caches under the city key. PERF-036: hoisted `import { ObjectId } from 'mongodb'` to module top-level, removed two dynamic `await import('mongodb')` in the hot path.
- Divergences (S77 split, 3F shipped cache-only without aggregation rewrite, PolicyResolutionQuery cast, sandbox git-lock workarounds) documented in commit bodies and CHANGELOG.
- Verification: tsc on touched files via direct binary invocation — 0 real errors post-cast-fix; all remaining output is TS7006/TS2307/TS2304 noise caused by sandbox `node_modules/typescript` I/O error (affects entire repo equally). `pnpm check` + `pnpm test:unit` deferred to host.
- **Not yet pushed** — 3 commits sit on local `main`, ready for user to push from Windows. `origin/main` tip still at `a5b862a3`.

### COMPLETE — Session 76 (2026-04-20) — Resolution Plan Batch 3 Part 1 (performance hot paths)

- Executed `docs/RESOLUTION-PLAN.md` Batch 3 items 3A–3D — 5 commits, zero behaviour change. 3E/3F deferred to S77 per prompt scope.
- **3A** (`e0b3f7ba`): replaced sequential 4-collection user lookup in `hooks.server.ts` primary auth path with `Promise.all` across `Applicant`, `DsaApplications`, `rmApplications`, `AdminUsers`. Precedence applicant → dsa → rm → admin preserved. Previously 2–4 sequential round-trips per authenticated request; now 1. Refresh path was already parallel — primary path now matches.
- **3B.1** (`eea9ee21`): `/dashboard/dsa/cases/+page.server.ts` — pushed filter/sort/pagination into MongoDB via `find().skip().limit()` + `countDocuments()` + `aggregate($facet)` for stage counts / loan types / lenders / overall total, all three queries run in parallel. User search escaped via `escapeRegex`. Stopped loading every non-archived case into Node.
- **3B.2** (`d333034c`): `/dashboard/dsa/+page.server.ts` — added 7-facet `$facet` aggregation (total / active / sampleSplit / activeStageCounts / filesSubmitted / sanctioned / avgProcessing) alongside existing queries. Deleted ~100 lines of JS loops; reshaped `allCases` projection to drop aggregation-owned fields and add `queries` + `document_checklist` still consumed by `computeAttentionItems`.
- **3C** (`f5670ead`): `form-wizard/wizardState.svelte.ts` — extracted each page-type branch in the monolithic `completionMap` derive into named helpers, added per-instance `Map` cache keyed by `pageId + fingerprint`. Applicants `JSON.stringify` computed once per derive and reused across every applicant-consuming branch. `checkGraphConnectivity` and `computeSectionCompletion` now short-circuit on unchanged inputs. Transient `isNextEnabled` override applied AFTER memo intentionally.
- **3D** (`43bd4fb4`): `api/notifications/digest/+server.ts` — the N+1 → `$in` batching was already done in S73; PERF-013's remaining concern was the leading `$match: { read: false }` scanning every unread notification up to the 90-day TTL. Added `created_at >= digestWindowStart` with 7-day default window (configurable via `DIGEST_WINDOW_DAYS` env). Bounds scan to recent traffic.
- Divergences (3D primary fix already in S73; mid-session branch divergence with `origin/main` at teammate commit `4f416fcd`; dashboard projection reshape) documented in commit bodies and CHANGELOG
- Verification: `tsc -p tsconfig.json --noEmit` on touched files: 0 errors (noise from stale `.svelte-kit/ambient.d.ts` + proxy files renamed aside during check). `pnpm test:unit` + `pnpm check` deferred to host — sandbox `node_modules/.bin/` shims broken.
- **Pushed to origin/main on 2026-04-20 after rebase onto `1555850d` (alokRaj's integration merge). Dropped teammate commit `65e590ba` ("payload for home loan, partially completed") — it broke `pnpm check` with 16 type errors across 5 loan pages (changed a shared `pageIndex: number→string` signature without updating all callers) and 3 Svelte 5 `state_referenced_locally` warnings. Force-pushed with `--force-with-lease`; Sudhanshu needs to re-base his home-loan payload work when next pulling. `pnpm check` clean post-drop (0 errors, 1 pre-existing warning in MonthYearModal).**

### COMPLETE — Session 75 (2026-04-20) — Resolution Plan Batch 2 (security hardening)

- Executed `docs/RESOLUTION-PLAN.md` Batch 2 (2A–2E) — 5 security fixes, zero behaviour change for legitimate callers
- **2A** (SEC-7): removed JWT-in-URL path from `GET /api/auth/validate-token` — token now accepted only via `Authorization: Bearer` header or `accessToken` httpOnly cookie (`3a40b509`). JWTs leaking through access logs / referer headers / browser history / analytics is closed.
- **2B** (SEC-8): added conservative allowlist `/^[\w\-./]+$/` on `pattern` input to `POST /api/test/run-vitest` before it reaches `exec()` — blocks backticks, `$()`, `&&`, `;`, spaces, quotes (`0f6e0f92`). Dev-only endpoint, but removes the shell-injection foot-gun entirely.
- **2C**: added 5 req/min/IP rate limit to `POST /api/share-link/validate` (`0f687bad`) — mirrors restore-account/subscribe pattern; plan also listed `newsletter/subscribe` but that endpoint already had rate limiting (plan stale, noted in commit body).
- **2D**: stripped CRLF from user-controlled `name` + `roleLabel` in `sendDeleteNotificationEmail` (subject + HTML body + text body) and `sendUserDeletionConfirmEmail` in `/api/auth/delete-account` (`ffecea17`). Closes header/MIME injection via display-name fields.
- **2E**: scoped CSRF dev bypass in `hooks.server.ts#validateCSRF` to `localhost` / `127.0.0.1` / `::1` only (`6b5a256b`). Previous blanket `if (dev) return true` left the gate open when the dev server was exposed via ngrok / cloudflared / LAN IP preview. Plan said line 27, actual location was line 416 (now ~424) — noted in commit body.
- Plan-vs-reality divergences (2B `apiError` arg order in spec, 2C stale newsletter item, 2D expanded scope to `roleLabel` and the second email helper) all documented in commit bodies and CHANGELOG
- `pnpm check` + full `pnpm test:unit` deferred to host — sandbox `node_modules/.bin/` shims are broken (truncated Cygwin wrappers); direct `tsc` invocation on touched files: 0 errors (the 70× TS1127 noise is in stale `.svelte-kit/ambient.d.ts`, pre-existing)

### COMPLETE — Session 74 (2026-04-20) — Resolution Plan Batch 1 (mechanical cleanup)

- Executed `docs/RESOLUTION-PLAN.md` Batch 1 (1A–1F) — low-risk hygiene, zero behaviour change
- **1A**: prettier-formatted the codebase (`eabae835`)
- **1B**: cleared 7 `state_referenced_locally` Svelte-5 warnings across `PartPaymentPlanner`, `FlexibleEmiPlanner`, `MonthYearInput` (`df7bd03a`)
- **1C**: introduced `src/lib/utils/clientLogger.ts`; routed 34 bare `console.*` through it across 5 services + 5 income components (`a5b26f29`, `48b2ae4c`)
- **1D**: archived 7 verified-unused files under `_archive/` with README updates (`e7e67ad4`, `03bb1102`) — skipped 2 of 9 planned targets that still had live importers
- **1E**: fixed 2 filename typos — `visibilty.ts → visibility.ts`, `topUpDetailst.ts → topUpDetails.ts` (+ function/page-id renames) (`c139766e`)
- **1F**: replaced LAP form SEO stub (`title="LAP "`) with the full product title pattern used by `home-loan` / `plot-loan` (`262631e4`)
- Plan-vs-reality divergences documented in commit bodies and CHANGELOG
- `pnpm check` + full `pnpm test:unit` deferred to host (sandbox exceeds 180s cap); touched-files `eslint` + `prettier --check` clean

### COMPLETE — Session 70 (2026-04-10) — Features + Audit Hardening
- 90+ files across 2 commits (S69 audit remediation + S70 features)
- **Security (S69)**: MongoDB regex injection (3 endpoints), coin update server-side, email XSS, CSRF bypass, set-role auth, OTP crypto, authService ?? true
- **Performance**: enrichPayload hoisted (7x→1x), DSA + RM dashboard parallelized, 8 admin query projections, Razorpay async
- **Cross-browser (S69)**: generateId fallback (10 components), safeLocalStorage (8 files), structuredClone, rate limiter TTL
- **Rule engine**: CIBIL floor as policy field + synthetic hard gate, payload enricher deep clone
- **Quality**: Zod validation (4 admin routes), DOMPurify sanitizer, ESLint no-console, page titles (33 pages), company evidence flag, devDeps cleanup
- **SEO**: robots.txt, canonical URLs
- **Discovery**: 5 "pending" items were already done in S67-S68 (classification, family detection, comm hub, help page, batch policies)
- 9,475 tests, 0 type errors

### COMPLETE — Sessions 62-68 (2026-04-08/09) — Classification + Income Intelligence + Audit Fixes
- **S67**: Company co-applicant fix, per-lender classification evaluator, CIBIL scope per lender, family <20% detection, rejection tips, email send endpoint, help page, V1 schema cleanup
- **S66**: Parity checks (Business/Personal incomeValueCheck, wizardState classification), R1 offer page "PREVIOUSLY REJECTED" badges + sorting
- **S65**: R4 income intelligence — per-entry qualifying questions, company auto-creation, Professional Loan non-financial directors, classification wired into all completion paths
- **S62-64**: Share link form, form audit, deep parity checks, case assessment data layer
- **S68**: Email service wiring, CompanyFinancials form, code quality cleanup
- 9,475 tests (84 files), 0 type errors

### COMPLETE — Session 61 (2026-04-08) — Offers E2E + Sprint A/B/C Hardening
- **Offers wired end-to-end**: All 6 loan forms now call `/api/evaluate-and-persist` and show real bank offers
- Shared `formSubmitHandler.ts` — centralized submit flow with specific error handling (401/402/429/409)
- `preSubmitReconciler.ts` — merges applicantDataStore → formState before submission
- Auto-seed real bank rules on first evaluation (non-blocking, in `evaluationEngine.ts`)
- Demo mode fix — `blockDemoWrite()` returns mock caseId
- **Sprint A**: JWT auto-refresh in secureFetch, unsaved changes guard on all 6 forms, JSON-Logic error logging (8 blocks), try-catch on 13 POST endpoints, loanAmount=0 validation
- **Sprint B**: File builder adapts sections by loan type, sessionStorage quota handling with amber banner, blockDemoWrite on share-link routes
- **Sprint C**: 7 loanAmount validation tests
- 51 new tests total (44 payload + 7 validation)
- 3-state warning system for applicants (complete/warnings/incomplete)
- E2E test hardening (5-pass progressive disclosure, robust selectors)
- 0 type errors, 9,343 tests passing (78 files)

### COMPLETE — Session 60 (2026-04-07)
- Payload Integrity Audit Phase 2B + 4: 39+ missing field mappings fixed across 3 files
- loanTransaction.ts: 21 fields (case intake, home loan signals, seller V2, BT merged, docs/legal, unsecured)
- applicantPayload.ts: 18 fields (residence, credit reasons, business profile, company office, DIN, GPA)
- types.ts: 20+ enricher-expected fields added to LoanTransactionPayload
- PAYLOAD_DOCUMENTATION.md updated with new sections
- Critical path analysis: pipeline architecturally complete, identified DB seed gap + unsecured form gap
- 0 type errors, 9,292 tests passing

### COMPLETE — Session 59 (2026-04-07)
- RM dashboard layout overhaul — rewrote from ~900 lines to ~400 using zone pattern (GlanceCard, NeedsAttentionZone, RecentCasesZone, new DSAConnectionsZone)
- New DSAConnectionsZone component — compact list with initials, preferred star toggle, case counts
- RecentCasesZone extended with optional dsa_name for RM view
- 6 old components archived (StatusCard, ActionList, PipelineChart, AttentionCard, CaseListCompact, ActivityFeed)
- Landing page content aligned to Bold & Premium mockup: hero headline, stats, CTA, pricing title, trust title, final CTA with badges
- DC wizard CaseIntake section added to business + professional loan variants
- 0 type errors, 9,292 tests passing

### COMPLETE — Session 58 (2026-04-07)
- DSA dashboard home page overhaul — 3-zone layout, 3 new components, 856→300 lines
- Progressive unlock sidebar with lockConfig
- WCAG AA 60-30-10 color system — 12 adaptive tokens across all 88 dashboard files
- See SESSION-HANDOFF.md for full details

### COMPLETE — Session 57 (2026-04-07)
- CP-6 ✅: $effect cascade reduction — 3 income components converted from $state+$effect to $derived.by() + 2 AddApplicant applicationStructure derivations memoized
- CP-8-14 ✅: Lazy imports — pdf-lib in emailSend.ts, 3 seed modules in admin endpoint
- CQ-9-12 ✅: Rate limiting on billing endpoints (razorpay/order, razorpay/verify, billing/subscribe)
- CF-3 ✅: NOT duplicate — intentional dual-path refresh (hooks.server.ts SSR + API client-side)
- CD-6-8 ✅: Deterministic payload_hash (recursive key sort), FormSnapshot created_at index
- Risk Signals ✅: RiskSignal type + pipeline (RawSchemaOption → optionResolver → ClientOption), 3 sample options tagged
- 9,292 tests (+2), 0 type errors, 21 files modified

### COMPLETE — Session 56 (5 commits, 2026-04-06)
- AD-1: ✅ Fixture fallback — evaluatePayload falls back to 10 static rule docs when DB empty
- AD-2: ✅ Facility branching — OD/CC/DOD per-facility FOIR/EMI/tenure
- Cat 4 Tier A ✅ complete (FG-1 = RM data, FG-3 = already implemented)
- Cat 4 Tier B ✅ complete (multi-company income already works, obligation = needs real data)
- Cat 6 Phase 1: shared applicantQuestions + applicantFormValidation
- Cat 6 Phase 4: IncomeModalContent extracted (dual render path separated)
- Cat 6 Phase 5a: LenderTrancheBreakdown extracted (-352 lines)
- 25 new tests (facilityBranching.test.ts), 9,290 total, 0 type errors

### COMPLETE — Session 55 (26 commits, 2026-04-06)
- Full docs audit + live site audit + UI/UX redesign mockup approved
- Cat 7 fully resolved, Cat 6 partial, Cat 4 FG-2 37/37, Cat 3 caching + memoization, Cat 2 cascade + cleanup
- 15+ live testing fixes: sole prop forms, NRI director logic, finance table persistence, warnings non-blocking, carpet area unit, company income locking, Next validation feedback
- See `docs/SESSION-HANDOFF.md` for complete inventory

### COMPLETE — Phase D: Form Quality (Session 54 + 55)
- FG-2: **37/37** cascading intelligence items complete (32 in S54 + 5 in S55)
- Form Optimization: 12 items implemented (derive/remove/combine)
- Property age wired to rule engine (40yr life cap)
- RERA gate for UC properties (banks excluded for non-RERA)

### COMPLETE — Phase E: Billing Security (Session 54)
- PB-1/PB-2: Server-side price enforcement + idempotent activation

### COMPLETE — Phase F: Security Hardening (Session 54 core + S57 + S69 + S70)
- S54: PB-3, CQ-1/2/3/4/5/8, CF-1/4/6, CD-2, CC-3 — 13 items
- S57: CQ-9-12 billing rate limits, CD-6-8 deterministic hash
- S69: MongoDB regex injection (3), coin update, email XSS, CSRF bypass, set-role auth, OTP crypto, authService fix
- S70: Rate limiting (6 endpoints), DOMPurify, Zod validation (4 routes)
- Remaining: CSP nonce + HSTS (needs HTTPS), deprecated csrf migration

### COMPLETE — Phase G: Performance (Session 54 core + S57 + S69 + S70)
- S54: CP-1/2/3/7 — MongoDB resilience, projections, index audit
- S57: CP-6 $effect cascade, CP-8-14 lazy imports
- S69: Dashboard parallelization (DSA), payload enricher clone, Razorpay async
- S70: enrichPayload hoist (7x→1x), RM dashboard parallelization, 8 admin projections
- Remaining: WOFF2 fonts (external tool), `any` type cleanup (incremental)

### COMPLETE — Other Session 54 Items
- 3 bug fixes (ITR table count, stale income entries, professionalCategory sync)
- Home Loan deep audit (8/10 rating, 1 bug fixed)
- Approval probability floating point fix
- Zero-lender empty state
- E11000 retry on evaluate-and-persist
- RM lastActive timestamp
- Cookie secure flags + refresh token reuse detection
- Dead code cleanup

---

## Completed Work (Sessions 17-54)

> Full details in `docs/CHANGELOG.md`. Summary table below.

| Session(s) | What | Key Commits |
|------------|------|-------------|
| 70 | Features + Audit Hardening: enrichPayload hoist, rate limiting, DOMPurify, Zod, page titles, CIBIL floor, company evidence (90+ files) | `4f62b340`..`2d0dd9d7` |
| 69 | Audit Remediation: 18 security/perf/cross-browser/SEO fixes (25+ files) | in `4f62b340` |
| 68 | Email service wiring, CompanyFinancials form, code quality | `144ddf40` |
| 67 | Company co-applicant fix, per-lender classification, CIBIL scope, family detection, comm hub, help page | `7ef90238` |
| 66 | Parity checks (Business/Personal), R1 offer page rejected badges | previous |
| 65 | R4 Income Intelligence, Professional Loan company flow (25+ files, 41 tests) | previous |
| 62-64 | Share link form, form audit, case assessment data layer | previous |
| 61 | Offers E2E + Sprint A/B/C hardening + audit fixes (8 commits) | `2bff51ee`..`7d4050cb` |
| 57 | Cat 3 perf ($effect→$derived, lazy imports) + Cat 2 security (billing rate limits, deterministic hash) + Risk Signals architecture | `8d2b7e1c` |
| 56 | AD-1 fixture fallback, AD-2 facility branching, Cat 6 shared extraction + component splits | `607938c3`..`f8123371` |
| 55 | 26 commits: docs audit, UI redesign mockup, Cat 7, 15+ live fixes, FG-2 completion | See CHANGELOG |
| 54 | 18 commits: 3 bug fixes, FG-2 (32/37), Phase E+F+G, form optimization (12 items), Home Loan audit | `74880b96`..`62b9968e` |
| 53 | Phase B (6/7) + Phase C (4/4) + obligation redesign + billing alignment + profCategory simplification + dormant links | `dd52758f`..`c83d7bac` |
| 52 | Docs overhaul, Phase A (5 critical fixes), affordability calculator (35 tests) | `57965d92`..`44a1d41d` |
| 51 | Director/Partner overhaul: onEMI/onProperty, UUID keying, OPC, prefix matching | `de9d9cc0`+ |
| 50 | E2E testing overhaul: 2-stage architecture, selector registry | `5efed959`..`9bb05672` |
| 47 | Orphan warning fix, income validation gate, auto-entry locking | `d7de803e`, `6c7e8b38` |
| 46 | Pincode data upgrade, builder flow, OPC auto-fill, nav fixes | `a379dbf0`, `9ffc7b4a` |
| 45 | Company wizard UX overhaul (18 items) | `6a01b942`..`2a32aad7` |
| 40 | Case creation E11000 duplicate key retry | `a3bc3dea` |
| 38 | Stale validation fix, entity/applicant type switch recovery | `d7be3899` |
| 37 | Stakeholder management (5 phases, 54 tests) | `5cc3aff0` |
| 35-36 | Maintenance: AddApplicant refactor, select/modal consolidation | `5eb73108`..`feededce` |
| 34 | Case intake redesign (all 6 types), applicant restoration, BT structure | `33e5f296`, `edc4246e` |
| 32-33 | Cascading intelligence, completion warnings, restoration redesign | 5 commits |
| 31 | Deep business profiling for Company applicants | per-phase |
| 30 | Unsecured loan lockdown (4 phases, bindsTo key standardization) | `2ce280f9`..`8c543e92` |
| 17-29 | Home loan redesign, form logic audit, anti-scraping, TS migration | multiple |

### BLOCKED — Production Blockers (Phase H — do LAST)

| # | Task | Why |
|---|---|---|
| 1 | **PB-7: Rotate all exposed credentials** | `.env` committed 19× to git. Atlas, Razorpay, MSG91, ImageKit, SMTP, JWT, HMAC, CSRF all need rotation. |
| 2 | **PB-8: Email service hardening** | Nodemailer SMTP → SES/SendGrid/Resend. SPF/DKIM/DMARC for digitaldsa.com. |

### NEXT — Post-Launch Growth (Phase I)

| # | Task | Priority |
|---|---|---|
| 3 | Push notifications (Web Push + email digests) | HIGH |
| 4 | Subscription/Payment UI (Razorpay wired, need plan selection + billing flow) | HIGH |
| 5 | Capacitor APK build (config ready, need Android Studio + Play Store) | MEDIUM |

### LATER — Competitive Advantage

Offline (Service Worker) · WhatsApp Business API · AI document parsing (OCR+LLM) · Blog · Commission tracker · Builder approval DB

### DEBT — Engineering (deferred, low urgency)

- **E1.1**: 5 loan pages share ~70% code (~7K lines). Extract shared FormPage. Deferred — high risk.
- **i18n replacement**: 374 keys defined, most UI still hardcoded English. Gradual `t()` pass.
- **V1 schema elimination**: Remove dual-key fallbacks, V2 bindsTo only (~4-6 hrs)
- **1,572 `any` instances**: Priority files: payloadEnricher, applicantFormManager, fileConfigurator
- **Duplicate implementations**: resolveDynamicText (3 copies), email modules (3 files)
- **50+ a11y suppressions**: svelte-ignore instead of fixing. Priority: modals, interactive elements
- **WOFF2 fonts**: Currently TTF only. Convert Poppins (~30% smaller, needs external tool)
- **Deprecated csrf package**: Migrate to `csrf-csrf`

---

## How We Work

### Loop

1. Pick task from "Next Up"
2. Read relevant code before writing
3. Follow conventions below
4. `pnpm run check` + `pnpm run test:unit` after every change
5. On completion: move task out of "Next Up", log to `CHANGELOG.md`, update header stats
6. If something new surfaces → add to "Next Up" with priority
7. Repeat

### Conventions

**Svelte 5**: `$state`, `$derived`, `$effect` — no legacy stores. Bridge: `fromRune()` in `_bridge.svelte.ts`.

**Server API**: `apiOk()` / `apiError()` / `apiServerError()` from `$lib/server/apiResponse`. Parse with `parseJsonBody(request)` — never bare `.json()`. Log with `logger` from `$lib/server/logger` — never bare `console`. Auth with guards from `$lib/server/guards`.

**Cloning**: `$state.snapshot()` (reactive→plain) · `securedClone()` (untrusted) · `structuredClone()` (trusted defaults)

**Rules**: Server-side everything. Zero PII required. Numbers immutable. Archive, never delete. Check `_archive/` before creating new.

### Key Files

```
src/hooks.server.ts                — Auth middleware, CSRF, headers
src/lib/database/mongo.ts          — All collections + indexes (retry + reconnect)
src/lib/types/index.ts             — Core types
src/lib/types/form.ts              — Applicant & form types
src/lib/config/routes.ts           — ALL route constants
src/lib/server/guards.ts           — 9 permission guards
src/lib/server/apiResponse.ts      — Response helpers
src/lib/server/logger.ts           — Structured logger
src/lib/server/rateLimiter.ts      — Rate limiting
src/lib/server/externalFetch.ts    — Third-party API timeout/retry wrapper
src/lib/server/utils.ts            — escapeRegex + shared utils
src/lib/utils/sanitizeHtml.ts      — HTML sanitizer for {@html}
src/lib/ruleEngine/                — Evaluation engine (5 modules)
src/lib/i18n/                      — Translations + helpers
src/lib/utils/securedClone.ts      — Secure clone/freeze/equals
```

---

## Architecture Decisions (Non-Negotiable)

AD-01: DSA primary, RM passive partner · AD-02: Cases wrap immutable form snapshots · AD-03: File Builder derived (no number editing) · AD-04: RM database centralized (crowdsourced) · AD-05: Every edit = new version (SHA-256 hash) · AD-06: v1 PDF NEVER has PII (system-enforced) · AD-07: CRM optional · AD-08: Sample data on onboarding (4 cases, `is_sample: true`) · AD-09: Guest demo (in-memory, no MongoDB) · AD-10: RM Portal (16+5 features) · AD-11: Disclaimers (7 points, server-enforced footer) · AD-12: RM value screens (4 pre-onboarding) · AD-13: Language (English default, native script, colloquial) · AD-14: Anti-scraping (8 layers)

---

## Commands

```bash
pnpm run dev        # localhost:5173
pnpm run check      # 0 errors target
pnpm run test:unit  # 9,237+ tests (74 files)
pnpm run test:e2e   # 15 specs (needs dev server + MongoDB)
pnpm run build      # Production
```

---

## Reference Docs

| File | When |
|---|---|
| **This file** | Always — plan, pending, methodology |
| `SESSION-HANDOFF.md` | **READ FIRST** every session |
| `CHANGELOG.md` | Log work done — append after every task |
| `ARCHITECTURE.md` | Before touching code — full system deep-dive |
| `RULE-ENGINE-SPECIFICATION.md` | Rule engine / policy work |
| `PAYLOAD_DOCUMENTATION.md` | Form → API data flow |
| `specs/FORM-OPTIMIZATION-SPEC.md` | Form derive/remove/combine analysis |
| `specs/PRIORITY-1-3-IMPLEMENTATION-PLAN.md` | 5-stream parallel plan (completed) |
| `reviews/2026-04-05-home-loan-deep-audit.md` | Home Loan audit findings |
| `reviews/2026-04-04-full-platform-audit.md` | Master audit — 115+ items |
