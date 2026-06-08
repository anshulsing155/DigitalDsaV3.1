# Session 54 — Phase D: Form Quality + Security Hardening

## Quick Context

You are continuing development on DigitalDSA V3, a fintech platform for Indian loan DSAs. Session 53 was massive — completed Phase B (director chain), Phase C (rule engine pipeline), obligation system redesign, billing alignment, professionalCategory simplification, and a cross-field validation fix.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — current state, what was done, what's next
3. This prompt — specific Phase D + F instructions

**Current state:** `main` branch | 0 type errors | 9,237 tests (74 files) | Latest commit: `79812284`

---

## Completed Phases (for context)

| Phase | Status | What |
|---|---|---|
| A | ✅ Done (S52) | 5 critical fixes for trustworthy testing |
| B | ✅ Done (S53) | Director/company chain — 6/7 items, AD-8 replaced by obligation redesign |
| C | ✅ Done (S53) | Rule engine pipeline — policy activation, NBFC negative areas, facility FOIR |
| — | ✅ Done (S53) | Obligation capture redesign, billing alignment, profCategory, dormant links |

---

## What to Build: Phase D — Form Quality

### Item 1: FG-2 — Cascading Intelligence (37 showWhen fixes)

**Ref**: `docs/reviews/2026-04-04-full-platform-audit.md` → FG-2

All 6 loan forms have showWhen conditions that can create impossible answer combinations. This item fixes 37 specific contradictions across form schemas. The showWhen engine works correctly — the issue is missing/wrong conditions in the question configs.

**Key files:**
- `src/lib/config/home-loan/questionBank/*.ts` — Home loan questions
- `src/lib/config/lap/questionBank/*.ts` — LAP questions
- `src/lib/config/plot-loan/questionBank/*.ts` — Plot loan questions
- `src/lib/config/personalLoan/questionBank/*.ts` — Personal loan questions
- `src/lib/config/businessLoan/questionBank/*.ts` — Business loan questions
- `src/lib/config/professionalLoan/questionBank/*.ts` — Professional loan questions

**Approach**: Read the audit file for the specific 37 items. Fix each one by adding/correcting showWhen conditions in the TS question configs. Test with `pnpm check` after each batch.

### Item 2: AD-11 — Unsecured Business Loan Dedup

**Problem**: `businessProfilePage` (Getting Started) and `AddApplicantBusiness.svelte` (Applicants) both ask entity type and director count — duplicated questions.

**Parked**: Removing `businessProfilePage` breaks Proprietorship applicants. Revisit after FG-2.

---

## What to Build: Phase F — Security Hardening (if time permits)

### Priority Security Fixes

| # | Item | Files | Effort |
|---|------|-------|--------|
| 1 | **PB-3**: Remove JWT from response body (8 code paths) | `src/routes/api/auth/*.ts` | 1 hr |
| 2 | **CQ-1**: Sanitize `{@html}` vectors (29 instances, prioritize InfoModal) | `src/lib/components/*.svelte` | 2 hrs |
| 3 | **CQ-2**: Stop leaking `err.message` to client (5 endpoints) | `src/routes/api/*.ts` | 30 min |
| 4 | **CQ-3**: Fix MongoDB regex injection (5 endpoints) | `src/routes/api/*.ts` | 30 min |
| 5 | **CQ-4**: Replace bare `fetch` with `secureFetch` (30+ files) | Multiple | 2-3 hrs |
| 6 | **CF-1**: JSON-Logic `!=` singleton override isolation | `src/lib/server/formEngine/visibility.ts` | 1 hr |
| 7 | **CF-2**: Logout clear `activeTokenIds` | `src/routes/api/auth/logout/+server.ts` | 30 min |

---

## Deferred Items (Full List — Don't Forget)

| Item | Priority | Where |
|---|---|---|
| V1 schema elimination (remove dual-key fallbacks) | Medium | Session 52 decision |
| Adaptive location question (one per applicant) | Medium | Session 52 decision |
| Cross-lender affordability (HL + PL combo optimization) | Low | affordabilityCalculator.ts built |
| Per-applicant PL assignment (best CIBIL for PL) | Low | Session 52 decision |
| Variation matching in policy resolver | Low | AD-1 enhancement |
| Obligation live testing with real data | Medium | New component needs validation |
| Billing: Razorpay subscription API | Medium | Phase E |
| Admin Dashboard Testing UI | Low | Phase I |
| i18n replacement pass (374 keys) | Low | Phase I |
| Form page shared extraction (7K lines shared) | Low | High risk, Phase I |
| Credential rotation + email hardening | Highest (do LAST) | Phase H |
| Push notifications, APK, WhatsApp, AI OCR | Post-launch | Phase I |

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Co-Applicant terminology** — Anyone who signed = Co-Applicant. Guarantor = separate. No "primary borrower".

---

## Reference Documents

| Need | File |
|---|---|
| Full platform audit (115+ items) | `docs/reviews/2026-04-04-full-platform-audit.md` |
| Dependency-ordered roadmap | `docs/DEVELOPMENT-ROADMAP.md` |
| Obligation redesign spec | `docs/specs/OBLIGATION-CAPTURE-REDESIGN.md` |
| Director architecture | `docs/specs/COMPANY-DIRECTOR-ARCHITECTURE.md` |
| Rule engine spec | `docs/RULE-ENGINE-SPECIFICATION.md` |
