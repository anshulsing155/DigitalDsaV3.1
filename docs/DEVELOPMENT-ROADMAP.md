# DigitalDSA — Development Roadmap (Dependency-Ordered)

> **Created**: 2026-04-04 | **Updated**: 2026-04-04 (Session 53)
> **Based on**: `docs/reviews/2026-04-04-full-platform-audit.md` (115 items)
> **Principle**: Order by what unblocks what. Independent items deferred to pre-launch batch.
> **Status**: Phases A ✅, B ✅, C ✅ complete. Phase D next.

---

## Dependency Map

```
CHAIN 1: Director/Company (biggest active area)
  AD-9 (UUID root cause) ──→ AD-3 (Directors as applicants)
                                    │
                                    ├──→ AD-4 (Financial restoration)
                                    │         │
                                    │         └──→ AD-5 (Auto-income wiring)
                                    │                    │
                                    │                    ├──→ AD-6 (Multi-company income)
                                    │                    └──→ AD-7 (Detach button — needs orphan logic)
                                    │
                                    └──→ AD-8 (DC obligations split)

CHAIN 2: Rule Engine Pipeline
  AD-1 (RM Policy → Rule Engine) ──→ AD-2 (Facility FOIR/EMI)
                                           │
                                           └──→ FG-1 (NBFC Negative Area)
  AD-10 (Pro Loan geo fix) ─────────────────┘  (geo scoring must work first)

  FG-3 (Offer Card Phase 4) ── needs correct rule output from Chain 2

CHAIN 3: Billing
  PB-1 + PB-2 (Razorpay fix) ──→ FG-4 (Billing page) ──→ PL-2 (Subscription UI)

INDEPENDENT (no blocking dependencies):
  PB-3 (JWT in body), PB-5 (applicantEmiShare), PB-7 (credentials), PB-8 (email)
  CQ-1..12 (security), CP-1..14 (performance), CD-1..8 (data integrity)
  CF-1..9 (logic/flow), CC-1..9 (consistency)
  FG-2 (Cascading Intelligence), FG-5 (professionalCategory), FG-6 (Admin Testing UI)
```

---

## Phase A: Unblock Confident Testing (1 session)

These are quick fixes that make all subsequent testing trustworthy. Without them, every test result is questionable.

| # | Item | Why First | Effort | Ref |
|---|------|-----------|--------|-----|
| 1 | **PB-5: Server-side `applicantEmiShare` recompute** | Every FOIR test is unreliable until server recomputes this. One function call in `payloadEnricher.ts`. | 30 min | PB-5 |
| 2 | **CF-9: `evaluateOnServer` error handling — all 6 form pages** | Without this, submit failures are silent. You can't trust form testing if errors are swallowed. | 1 hr | CF-9 |
| 3 | **CD-1: Snapshot version race condition** | Double-click on submit creates duplicate versions, corrupting audit trail. Add unique index + `findOneAndUpdate` with `$inc`. | 1 hr | CD-1 |
| 4 | **AD-10: Professional Loan geo scoring** | All professional loan lender results are wrong (geo = 0.5). Map `businessStateName`/`businessCityName` into payload + enricher. | 1 hr | AD-10 |
| 5 | **AD-12: downpaymentPercentage V1→V2 keys** | Quick fix while you're in the form page code. | 15 min | AD-12 |

**After Phase A**: You can test forms, submit, and trust the results.

---

## Phase B: Director/Company Chain (2-3 sessions)

The biggest active development area. Each item unblocks the next.

| # | Item | Depends On | Effort | Ref |
|---|------|------------|--------|-----|
| 6 | **AD-9: Trace duplicate UUID root cause** | Nothing | 1-2 hrs (investigation) | AD-9 |
| 7 | **AD-3: Directors as full applicants from save** | AD-9 fixed | 1 session | AD-3 |
| 8 | **AD-4: Full financial restoration** | AD-3 done | Half session | AD-4 |
| 9 | **AD-5: Wire auto-income for directors** | AD-3 done (code exists, just needs wiring) | 2 hrs | AD-5 |
| 10 | **AD-7: Orphan director Detach button** | AD-5 (needs `orphanIncomeForCompany()`) | 1 hr | AD-7 |
| 11 | **AD-6: Multi-company income** | AD-5 wired | 2 hrs | AD-6 |
| 12 | **AD-8: Company DC obligations split** | AD-3 (directors are applicants, so obligations attach to them) | Half session | AD-8 |

**After Phase B**: Company/Director system is feature-complete. All director flows work end-to-end with income, obligations, and restoration.

---

## Phase C: Rule Engine Pipeline (2-3 sessions)

This chain makes the lender results accurate and real.

| # | Item | Depends On | Effort | Ref |
|---|------|------------|--------|-----|
| 13 | **AD-1: Wire RM Policy → Rule Engine** | Nothing (compiler + seeder exist) | 1 session | AD-1 |
| 14 | **AD-2: Facility FOIR/EMI branching** | AD-1 (need real rule docs to test) | 1 session | AD-2 |
| 15 | **FG-1: NBFC Negative Area System** | AD-10 (geo scoring must work) + AD-1 (lender policies loaded) | 1 session | FG-1 |
| 16 | **FG-3: Offer Card Phase 4** | AD-1 + AD-2 (correct rule output needed) | Half session | FG-3 |

**After Phase C**: Real bank policies evaluate real loan applications with correct FOIR/LTV/EMI, geographic scoring, and negative area filtering.

---

## Phase D: Form Quality (1-2 sessions)

Cascading intelligence fixes make the form logic airtight — 37 contradictions removed.

| # | Item | Depends On | Effort | Ref |
|---|------|------------|--------|-----|
| 17 | **FG-2: Cascading Intelligence — 37 showWhen fixes** | Nothing (schema-only, no backend) | 1-2 sessions | FG-2 |
| 18 | **FG-5: professionalCategory extraction** | Nothing but needs careful testing | 2-3 hrs | FG-5 |
| 19 | **AD-11: Unsecured business loan dedup** | FG-5 (related flow) | Revisit after FG-5 | AD-11 |

**After Phase D**: All 6 loan forms are logically consistent. No impossible answer combinations.

---

## Phase E: Billing (1 session)

Depends on Razorpay being secure first.

| # | Item | Depends On | Effort | Ref |
|---|------|------------|--------|-----|
| 20 | **PB-1 + PB-2: Razorpay server-side verification** | Nothing | 2-3 hrs | PB-1, PB-2 |
| 21 | **FG-4: DSA Billing Page** | PB-1 + PB-2 fixed | Half session | FG-4 |

**After Phase E**: Billing works securely. DSAs can subscribe to plans.

---

## Phase F: Pre-Launch Security Hardening (2-3 sessions)

All independent. Can be done in any order. Must be done before launch but doesn't block feature testing.

### Security fixes (CQ-1 through CQ-12)

| # | Item | Effort | Ref |
|---|------|--------|-----|
| 22 | **PB-3: Remove JWT from response body** (8 code paths) | 1 hr | PB-3 |
| 23 | **CQ-1: Sanitize `{@html}` vectors** (29 instances, prioritize InfoModal) | 2 hrs | CQ-1 |
| 24 | **CQ-2: Stop leaking `err.message`** (5 endpoints) | 30 min | CQ-2 |
| 25 | **CQ-3: Fix MongoDB regex injection** (5 endpoints, one-line escape each) | 30 min | CQ-3 |
| 26 | **CQ-4: Replace bare `fetch` with `secureFetch`** (30+ files) | 2-3 hrs | CQ-4 |
| 27 | **CQ-5..12: Cookie secure flag, CSP nonce, HSTS, refresh validation, rate coupling, billing guards** | 3-4 hrs total | CQ-5..12 |

### Logic/Flow fixes (CF-1 through CF-8)

| # | Item | Effort | Ref |
|---|------|--------|-----|
| 28 | **CF-1: JSON-Logic `!=` singleton override isolation** | 1 hr | CF-1 |
| 29 | **CF-2: Logout clear `activeTokenIds`** | 30 min | CF-2 |
| 30 | **CF-3..8: Duplicate refresh endpoint, RM lastActive, isRole, zero-lender, relationship default, CIBIL lookup** | 2-3 hrs total | CF-3..8 |

### Data Integrity fixes (CD-2 through CD-8)

| # | Item | Effort | Ref |
|---|------|--------|-----|
| 31 | **CD-2: E11000 retry on evaluate-and-persist** | 30 min | CD-2 |
| 32 | **CD-3..5: Cascade deletions (archive, sample, account)** | 2 hrs | CD-3..5 |
| 33 | **CD-6..8: Deterministic payload_hash, FormSnapshot TTL, submit persistence** | 2 hrs | CD-6..8 |

### Code Consistency (CC-1 through CC-9)

| # | Item | Effort | Ref |
|---|------|--------|-----|
| 34 | **CC-1..9: Remove deprecated V1, fix `as any`, logger in hooks, dedup director restore, dead code cleanup** | 2-3 hrs total | CC-1..9 |

---

## Phase G: Performance (1-2 sessions)

Independent. Do before launch for production readiness.

| # | Item | Impact | Effort | Ref |
|---|------|--------|--------|-----|
| 35 | **CP-2: Add projections to 9 dashboard queries** | Biggest win — reduces data transfer 5-10x | 2 hrs | CP-2 |
| 36 | **CP-3: Fix `is_archived: { $ne: true }` index bypass** | Dashboard query speed | 30 min | CP-3 |
| 37 | **CP-1: MongoDB connection resilience** | Prevents startup/reconnection failures | 1 hr | CP-1 |
| 38 | **CP-5..7: `combinedAnswers` memoization, reduce `$effect` cascades, debounce `isNextEnabled`** | Form typing responsiveness | 2-3 hrs | CP-5..7 |
| 39 | **CP-4, CP-8..14: Schema clone caching, lazy imports, code splitting, misc** | Incremental improvements | 2-3 hrs | CP-4, CP-8..14 |

---

## Phase H: Final Pre-Launch (1 session, do LAST)

These are deliberately last because credentials rotation invalidates all active sessions, and email hardening requires DNS propagation time.

| # | Item | Why Last | Effort | Ref |
|---|------|----------|--------|-----|
| 40 | **PB-7: Rotate all credentials** | Invalidates every active token/session. Do right before go-live. | 2-3 hrs (provider consoles) | PB-7 |
| 41 | **PB-8: Email hardening** | DNS propagation (SPF/DKIM/DMARC) takes 24-48 hrs. Set up 2 days before launch. | 4-6 hrs + DNS wait | PB-8 |

---

## Phase I: Post-Launch Growth

| # | Item | Priority | Ref |
|---|------|----------|-----|
| 42 | Push notifications (Web Push + email digests) | HIGH | PL-1 |
| 43 | Subscription/Payment UI | HIGH (needs Phase E) | PL-2 |
| 44 | Capacitor APK build | MEDIUM | PL-3 |
| 45 | Admin Dashboard Testing UI | LOW | FG-6 |
| 46 | i18n replacement pass | LOW (gradual) | PL-4 |
| 47 | Form page shared extraction | LOW (high risk) | PL-5 |
| 48 | Offline, WhatsApp, AI OCR, Blog, Commission, Builder DB | LATER | PL-6..11 |

---

## Session Estimate

| Phase | Sessions | What You Get After |
|---|---|---|
| **A** | 1 | Trustworthy testing foundation |
| **B** | 2-3 | Complete director/company system |
| **C** | 2-3 | Real bank policy evaluation |
| **D** | 1-2 | Logically airtight forms |
| **E** | 1 | Working billing |
| **F** | 2-3 | Production-grade security |
| **G** | 1-2 | Production-grade performance |
| **H** | 1 | Launch-ready |
| **Total** | **~12-17 sessions to launch** |
