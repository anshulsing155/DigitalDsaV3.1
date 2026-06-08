# Session 56 — Rule Engine Wiring + Continued Bug Fixes

## Quick Context

You are continuing development on DigitalDSA V3, a fintech platform for Indian loan DSAs. Session 55 was the largest ever — **26 commits** spanning full docs audit, UI/UX mockup, 8+ parallel agents resolving Cat 2-7 items, and 15+ live testing bug fixes. The platform is now polished through Phases A-G with comprehensive business logic fixes.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — Session 55 summary with EVERY change, full pending inventory
3. This prompt — Session 56 priorities

**Current state:** `main` branch | 0 type errors | 9,263 tests (75 files) | Latest commit: `7ad457d5`

---

## Session 55 Highlights (for context)

**26 commits spanning:**
- Full docs audit (40+ deferred items cataloged across 12+ files)
- Live site audit (digitaldsa.com — footer, nav, calculators, blogs)
- UI/UX redesign mockup approved (Bold & Premium, progressive unlock)
- Cat 7 fully resolved (SOON badges, urgency, mobile, billing safety)
- Cat 6 partial (director restore dedup)
- Cat 4 Tier C: FG-2 **37/37** complete
- Cat 3: Schema caching + combinedAnswers memoization (30 tests)
- Cat 2: Cascade archive + V1 assessor removed + dead code (-314 lines)
- 15+ live testing fixes: sole prop forms, NRI director logic, finance table data persistence, warnings non-blocking, carpet area unit picker, company income profile locking, Next validation feedback

---

## Session 56 Priorities

### Priority 1: Cat 4 Tier A — Rule Engine Wiring (highest business impact)

The rule engine evaluates policies but doesn't load real RM policy data. Currently runs on hardcoded fixtures.

#### AD-1: Wire RM Policy → Rule Engine
**What exists:** `lender_rules` MongoDB collection, policy compiler, 77 lender configs in `bankData`
**What's needed:**
1. Load active rule artifacts from `lender_rules` at evaluation time
2. Pass loaded rules to evaluation engine alongside payload
3. Fall back to default/fixture rules when no RM-contributed rules exist
4. Test with synthetic fixtures (no real RM policy docs yet)
**Key files:** `evaluationEngine.ts`, `systemConfig.ts`, `mongo.ts`, `RULE-ENGINE-SPECIFICATION.md`

#### AD-2: Facility FOIR/EMI Branching
Credit-line facilities (OD, CC, DOD) currently get standard EMI-based FOIR — wrong.
**What's needed:**
1. Restore `FACILITY_TYPE_CONFIG` from git (`ab74bf9b:src/lib/ruleEngine/systemConfig.ts`)
2. Branch FOIR: Term Loan = EMI-based, OD/CC = % of limit, DOD = declining balance
3. Branch EMI display and tenure handling
**Spec:** `RULE-ENGINE-SPECIFICATION.md` Section 5.1, `specs/UNSECURED-FACILITY-TYPE-SPEC.md`

### Priority 2: Fix Pre-Existing Test Failures

`src/lib/testing/__tests__/showWhenTransform.test.ts` — 2 failing tests:
- "unwraps single-element ! arrays so client evaluateCondition works"
- "handles ! with variable reference (truthiness check)"
Expected assertion values need updating to match the string condition handling added in `showWhenEngine.ts`.

### Priority 3: Cat 4 Tier A Continued

| Item | What | Effort |
|------|------|--------|
| FG-1 | NBFC Negative Area System | 1 session |
| FG-3 | Offer Card Phase 4 (tranche, GPA, registry urgency, BT appreciation) | Half session |

### Priority 4: Cat 4 Tier B — Director/Company

| Item | What | Effort |
|------|------|--------|
| Multi-company income | 3+ directorships | 2 hrs |
| Obligation live testing | New ObligationCapture with real data flows | 2 hrs |

### Priority 5: Remaining Cat 3 + Cat 2

**Performance:**
- CP-6: $effect cascade reduction
- CP-8-14: Lazy imports, code splitting

**Security:**
- CQ-6/7: CSP nonce + HSTS (needs HTTPS)
- CQ-9-12: Rate coupling, billing guards
- CF-3: Duplicate refresh endpoint
- CD-6-8: Deterministic payload_hash, FormSnapshot TTL

---

## Full Pending Inventory (from Session 55 audit)

### Cat 6: Code Health
- 5 components >1000 lines need splitting (DirectorCards 1608, AddApplicantProfessional 1678, IncomePageNew 1565, LenderResultCard 1383, AddApplicantBusiness 1280)

### Cat 4 Tier C: Form Quality
- Risk Signals Architecture (`riskSignal` on schema options)
- Adaptive location question (per applicant, stores by loan type)
- V1 schema elimination (dual-key fallbacks)
- AD-11: Unsecured business loan dedup

### Cat 4 Tier D: Advanced Features
- Cross-lender affordability (calculator built, need UI integration)
- Per-applicant PL assignment
- Credit Risk Intelligence Layer 2 (full spec, 0% code)
- AI Rule Parsing Pipeline Stages 2-4 (prompt written, 0% code)
- Variation matching in policy resolver

### Cat 1: Production Blockers (do LAST)
- PB-7: Rotate all credentials
- PB-8: Email hardening (SES/SendGrid + SPF/DKIM/DMARC)

### Post-Launch (Phase I)
- Push notifications, Subscription UI, Capacitor APK, Admin testing UI
- i18n replacement pass, form page shared extraction
- Offline, WhatsApp, AI OCR, Blog, Commission tracker

### Dashboard/Landing Redesign (Sessions 61-64)
- Bold & Premium dark theme implementation
- DSA dashboard rebuild (task-first, progressive unlock)
- Landing page from scratch (6-7 sections + footer from live site)
- RM dashboard (dense variant)
- Mockup: `docs/mockups/dashboard-redesign.html`

---

## Key Files for Rule Engine Work

| File | Purpose |
|------|---------|
| `src/lib/ruleEngine/evaluationEngine.ts` | Main evaluation entry point |
| `src/lib/ruleEngine/incomeAssessor.ts` | V2 income assessment (V1 removed in S55) |
| `src/lib/ruleEngine/payloadEnricher.ts` | Payload enrichment before evaluation |
| `src/lib/ruleEngine/resultBuilder.ts` | Build results from evaluation |
| `src/lib/ruleEngine/systemConfig.ts` | System constants + EMI bounds (FACILITY_TYPE_CONFIG removed, restore from git) |
| `src/lib/database/mongo.ts` | All collections including `lender_rules` |
| `docs/RULE-ENGINE-SPECIFICATION.md` | Full spec (Section 5.1 for facility branching) |
| `docs/specs/UNSECURED-FACILITY-TYPE-SPEC.md` | Facility type branching spec |
| `docs/LOAN-ASSESSMENT-API-INTEGRATION.md` | External API contract |

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Co-Applicant terminology** — Anyone who signed = Co-Applicant. Guarantor = separate.
6. **Never delete files** — Move to `_archive/` instead
7. **Always stay on `main` branch**
8. **Never add Co-Authored-By lines** to commits
