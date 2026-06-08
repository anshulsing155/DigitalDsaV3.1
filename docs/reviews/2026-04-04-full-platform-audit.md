# DigitalDSA V3 — Full Platform Audit (v2)

> **Date**: 2026-04-04 | **Session**: 52 | **Version**: 2 (updated after Phase A implementation + affordability spec)
> **Scope**: Every pending item across the entire platform — 115 items, 5 FIXED this session
> **Purpose**: Single reference document. Use item IDs (PB-3, AD-1, etc.) to plan sessions.

---

## SESSION 52 PROGRESS

### Completed This Session
| Item | What | Commit |
|---|---|---|
| **PB-5** | Server-side `applicantEmiShare` recompute — FOIR manipulation closed | `42a7728a` |
| **CF-9** | `evaluateOnServer` error handling — all 6 form pages show errors | `42a7728a` |
| **CD-1** | Snapshot version race condition — E11000 retry loop | `42a7728a` |
| **AD-10** | Professional + Business Loan geo scoring — `businessState`/`businessCity` mapped | `42a7728a` |
| **AD-12** | `downpaymentPercentage` V1→V2 dual-key fix | `42a7728a` |

### New Capability Built
| Item | What | Commit |
|---|---|---|
| **NEW** | Affordability back-calculator — pure math module with 35 tests | `0fa0bbcc` |
| | Piecewise linear DP→Property mapping with 1:1 transition zones | |
| | Three modes: eligibility, DP-constrained, unsecured bridge | |
| | Both tested fixed factors (0.22/0.3895/0.46) and dynamic formula | |
| | Spec: `docs/specs/PROPERTY-AFFORDABILITY-BACK-CALCULATOR.md` | `034c5620` |

### Decisions Made
1. **V1 schema elimination** — remove all V1 key fallbacks (`propertyCost`/`propCost` etc.), make V2-only
2. **Adaptive location question** — one question per applicant, stores to correct field by loan type
3. **Cross-lender affordability optimization** — HL from bank A + PL from bank B, best combination
4. **Per-applicant PL assignment** — best CIBIL person for PL, accounting for HL rate impact
5. **Coding standards** — top-priority standing instruction: readable names, step-by-step comments, small files

---

## IMPLEMENTATION ROADMAP (Dependency-Ordered)

### Phase A: Trustworthy Testing Foundation — DONE ✅

| # | Item | Status | Commit |
|---|---|---|---|
| 1 | PB-5: Server-side applicantEmiShare | ✅ DONE | `42a7728a` |
| 2 | CF-9: evaluateOnServer error handling (6 pages) | ✅ DONE | `42a7728a` |
| 3 | CD-1: Snapshot version race condition | ✅ DONE | `42a7728a` |
| 4 | AD-10: Professional/Business Loan geo scoring | ✅ DONE | `42a7728a` |
| 5 | AD-12: downpaymentPercentage V1→V2 | ✅ DONE | `42a7728a` |

### Phase B: Director/Company Chain — NEXT (2-3 sessions)

Each item unblocks the next. Cannot skip ahead.

| # | Item | Depends On | Status |
|---|---|---|---|
| 6 | AD-9: Trace duplicate UUID root cause | Nothing | TODO |
| 7 | AD-3: Directors as full applicants from save | AD-9 | TODO |
| 8 | AD-4: Full financial restoration (income/CIBIL/obligations) | AD-3 | TODO |
| 9 | AD-5: Wire auto-income for directors (`directorAutoIncome.ts` exists, not called) | AD-3 | TODO |
| 10 | AD-7: Orphan director Detach button (prop exists, no parent wiring) | AD-5 | TODO |
| 11 | AD-6: Multi-company income (3 boards = 3 locked entries) | AD-5 | TODO |
| 12 | AD-8: Company DC obligations split (company vs personal) | AD-3 | TODO |

### Phase C: Rule Engine Pipeline (2-3 sessions)

Makes lender results real — actual bank policies, correct FOIR, geo scoring, affordability.

| # | Item | Depends On | Status |
|---|---|---|---|
| 13 | AD-1: Wire RM Policy → Rule Engine (compiler + seeder exist) | Nothing | TODO |
| 14 | AD-2: Facility FOIR/EMI branching (OD/CC/DOD) | AD-1 | TODO |
| 15 | FG-1: NBFC Negative Area System | AD-1 + AD-10 ✅ | TODO |
| 16 | FG-3: Offer Card Phase 4 (tranche, NRI GPA, urgency, BT appreciation) | AD-1 + AD-2 | TODO |
| 17 | **NEW**: Affordability cross-lender optimization (HL×PL×applicant combos) | AD-1 + affordability module ✅ | TODO |
| 18 | **NEW**: V1 schema elimination (remove all dual-key fallbacks) | All form work stable | TODO |

### Phase D: Form Quality (1-2 sessions)

| # | Item | Depends On | Status |
|---|---|---|---|
| 19 | FG-2: Cascading Intelligence — 37 showWhen fixes | Nothing (schema-only) | TODO |
| 20 | FG-5: professionalCategory extraction from loanRequirementPage | Nothing (careful testing) | TODO |
| 21 | AD-11: Unsecured business loan dedup (parked) | FG-5 | PARKED |
| 22 | **NEW**: Adaptive location question (one per applicant, stores by loan type) | — | TODO |

### Phase E: Billing (1 session)

| # | Item | Depends On | Status |
|---|---|---|---|
| 23 | PB-1 + PB-2: Razorpay server-side verification + double-conversion fix | Nothing | TODO |
| 24 | FG-4: DSA Billing Page (plan selection, payment flow) | PB-1 + PB-2 | TODO |

### Phase F: Pre-Launch Security Hardening (2-3 sessions)

All independent. Can be done in any order. Must complete before launch.

| # | Item | Effort | Status |
|---|---|---|---|
| 25 | PB-3: Remove JWT from response body (8 code paths) | 1 hr | TODO |
| 26 | CQ-1: Sanitize `{@html}` vectors (29 instances, prioritize InfoModal) | 2 hrs | TODO |
| 27 | CQ-2: Stop leaking `err.message` (5 endpoints) | 30 min | TODO |
| 28 | CQ-3: Fix MongoDB regex injection (5 endpoints, one-line escape) | 30 min | TODO |
| 29 | CQ-4: Replace bare `fetch` with `secureFetch` (30+ files) | 2-3 hrs | TODO |
| 30 | CQ-5..12: Cookie secure, CSP nonce, HSTS, refresh validation, rate coupling, billing guards | 3-4 hrs | TODO |
| 31 | CF-1: JSON-Logic `!=` singleton isolation | 1 hr | TODO |
| 32 | CF-2: Logout clear `activeTokenIds` | 30 min | TODO |
| 33 | CF-3..8: Duplicate refresh, RM lastActive, isRole, zero-lender, relationship default, CIBIL | 2-3 hrs | TODO |
| 34 | CD-2: E11000 retry on evaluate-and-persist | 30 min | TODO |
| 35 | CD-3..5: Cascade deletions (archive, sample, account) | 2 hrs | TODO |
| 36 | CD-6..8: Deterministic payload_hash, FormSnapshot TTL, submit persistence | 2 hrs | TODO |
| 37 | CC-1..9: Remove V1 assessor, fix `as any`, logger, dedup director restore, dead code | 2-3 hrs | TODO |

### Phase G: Performance (1-2 sessions)

| # | Item | Impact | Effort | Status |
|---|---|---|---|---|
| 38 | CP-2: Add projections to 9 dashboard queries | Biggest win (5-10x data reduction) | 2 hrs | TODO |
| 39 | CP-3: Fix `is_archived: { $ne: true }` index bypass | Dashboard speed | 30 min | TODO |
| 40 | CP-1: MongoDB connection resilience | Prevents startup failures | 1 hr | TODO |
| 41 | CP-5..7: `combinedAnswers` memoization, $effect reduction, debounce isNextEnabled | Form responsiveness | 2-3 hrs | TODO |
| 42 | CP-4, CP-8..14: Schema clone cache, lazy imports, code splitting, misc | Incremental | 2-3 hrs | TODO |

### Phase H: Final Pre-Launch (1 session, do LAST)

| # | Item | Why Last | Status |
|---|---|---|---|
| 43 | PB-7: Rotate all credentials | Invalidates all sessions. Do right before go-live. | TODO |
| 44 | PB-8: Email hardening (SES/SendGrid + SPF/DKIM/DMARC) | DNS propagation 24-48 hrs. Set up 2 days before launch. | TODO |

### Phase I: Post-Launch Growth

| # | Item | Priority | Status |
|---|---|---|---|
| 45 | PL-1: Push notifications (Web Push + email digests) | HIGH | TODO |
| 46 | PL-2: Subscription/Payment UI | HIGH (needs Phase E) | TODO |
| 47 | PL-3: Capacitor APK build | MEDIUM | TODO |
| 48 | FG-6: Admin Dashboard Testing UI | LOW | TODO |
| 49 | PL-4: i18n replacement pass (374 keys, UI hardcoded) | LOW (gradual) | TODO |
| 50 | PL-5: Form page shared extraction (~7K shared lines) | LOW (high risk) | TODO |
| 51 | PL-6..11: Offline, WhatsApp, AI OCR, Blog, Commission, Builder DB | LATER | TODO |

---

## SESSION ESTIMATE

| Phase | Sessions | Status | What You Get After |
|---|---|---|---|
| **A** | 1 | ✅ DONE | Trustworthy testing foundation |
| **B** | 2-3 | NEXT | Complete director/company system |
| **C** | 2-3 | — | Real bank policies + affordability optimization |
| **D** | 1-2 | — | Logically airtight forms |
| **E** | 1 | — | Working billing |
| **F** | 2-3 | — | Production-grade security |
| **G** | 1-2 | — | Production-grade performance |
| **H** | 1 | — | Launch-ready |
| **Total** | **~12-16 sessions to launch** | | |

---

# DETAILED ITEM REFERENCE

Items below are the full audit details. Use the IDs from the roadmap above to find specifics.

---

## SECTION 1: PRODUCTION BLOCKERS (8 items)

### PB-1: Razorpay Price Manipulation — TODO

**What**: Payment endpoint accepts `amount` from client. Server never verifies paid amount matches plan price.

**Why**: Enterprise plan subscribable for ₹1. Direct revenue loss.

**Where**: `src/routes/api/razorpay/order/+server.ts` lines 17-29, `src/routes/api/billing/subscribe/+server.ts` lines 46-57

**Fix**: Accept `planId` not `amount`. Look up `PLANS[planId].amountPaise` server-side. Verify `payment.amount === planConfig.amountPaise` after Razorpay callback.

---

### PB-2: Razorpay Amount Double-Conversion — TODO

**What**: Billing page sends `amountPaise` (99900). Endpoint does `amount * 100` = 9,990,000 paise = ₹99,900 instead of ₹999.

**Where**: `src/routes/api/razorpay/order/+server.ts` line 27

**Fix**: Solved by PB-1 fix (server looks up price from plan ID).

---

### PB-3: JWT Tokens in Response Body — TODO

**What**: Auth endpoints return `accessToken`/`refreshToken` in JSON body alongside HttpOnly cookies.

**Where**: `signup/+server.ts:120`, `check-dsa/+server.ts` (6 paths: 164,241,320,393,469,540), `verify-otp/+server.ts:130`, `create-rm/+server.ts:135` (NO native guard)

**Fix**: Remove from all JSON bodies. For Capacitor: custom header or dedicated endpoint.

---

### PB-4: Share Link OTP Bypass — ✅ FIXED

HMAC-signed proof cookie validates OTP. `src/lib/server/shareLinks.ts` lines 276-291.

**Remaining**: Verify `requiresOtp: true` is enforced for all production links.

---

### PB-5: applicantEmiShare Client Trust — ✅ FIXED (Session 52)

**What was**: Client-supplied `applicantEmiShare` trusted for FOIR calculation.

**Fix applied**: `payloadEnricher.ts` now recomputes using `computeApplicantEmiShare()` server-side. `obligationPayload.ts` passes `hasProofOverride` + `monthlyShare` for proof-based overrides. 5 enricher tests updated. Commit `42a7728a`.

---

### PB-6: Silent ObjectId on Parse Failure — PARTIALLY FIXED

**Fixed**: `engineContext.ts` uses `toSafeObjectId()` returning `null`.

**Remaining**: Silent `catch {}` blocks (lines 399, 453, 528, 586) need `logger.warn()`.

---

### PB-7: Credentials in Git History — TODO (Phase H, do LAST)

`.env` committed 19×. Rotate: Atlas, Razorpay, MSG91, ImageKit, JWT, HMAC, CSRF. Do right before launch.

---

### PB-8: Email Hardening — TODO (Phase H, do LAST)

Nodemailer SMTP → SES/SendGrid/Resend. SPF/DKIM/DMARC for digitaldsa.com. DNS propagation 24-48 hrs. Spec: `docs/specs/EMAIL-HARDENING-PLAN.md`.

---

## SECTION 2: ACTIVE DEVELOPMENT (12 items)

### AD-1: RM Policy → Rule Engine — TODO (Phase C)

Two-thirds done. Compiler + seeder + wizard all built. Missing: RM capture → compiler bridge, evaluation engine consumption from MongoDB.

**Key files**: `compiler.ts`, `compileAll.ts`, `seedCompiledLenders.ts`, `PolicyCaptureWizard.svelte`

---

### AD-2: Facility FOIR/EMI Branching — TODO (Phase C)

Form + payload + enricher done. `FACILITY_TYPE_CONFIG` exists. Rule engine partially handles `isCreditLine`. Missing: full testing with real rule docs, EMI skip for OD/CC, test fixtures.

---

### AD-3: Directors Phase 2 — TODO (Phase B)

Directors committed only on company save via `commitDirectorsToApplicants()`. Phase 2: directors become Individual applicants immediately on creation in `DirectorFormModal`.

---

### AD-4: Directors Phase 3 — TODO (Phase B)

`_structured` snapshots captured but not unpacked into `applicantDataStore`. Financial data (income/CIBIL/obligations) lost on restore.

---

### AD-5: Auto-Income for Directors — TODO (Phase B)

`directorAutoIncome.ts` (227 lines) complete. Tests exist. Import exists in `applicantFormManager.svelte.ts` line 76. **Functions never called.** Wire `syncAutoIncomeEntries()` into commit/save flow.

---

### AD-6: Multi-Company Income — TODO (Phase B)

Blocked by AD-5. 3 boards = 3 locked income entries. Income system supports it via `entityName`.

---

### AD-7: Orphan Director Detach — TODO (Phase B)

`CrossFieldWarningBanner` has prop, `Company.svelte` has handler. Missing: orphan income entries, update `directorFormsMap`, confirmation dialog.

---

### AD-8: Company DC Obligations Split — TODO (Phase B)

No `obligationOwner: 'company' | 'personal'` field. No UI. Rule engine treats all obligations uniformly.

---

### AD-9: Duplicate UUID Root Cause — TODO (Phase B, first item)

3 dedup guards mask the root cause. Investigate before making directors full applicants (AD-3).

---

### AD-10: Professional Loan Geo Scoring — ✅ FIXED (Session 52)

**Fix applied**: `businessState`/`businessCity` added to `LoanTransactionPayload` type, `loanTransaction.ts` mapping, `resultBuilder.ts` + `evaluationEngine.ts` geo fallback chains. Also added `residenceState` fallback for Personal Loan. Commit `42a7728a`.

---

### AD-11: Unsecured Business Loan Dedup — PARKED

Removing `businessProfilePage` breaks Proprietorship. Needs redesign after FG-5.

---

### AD-12: downpaymentPercentage Keys — ✅ FIXED (Session 52)

**Fix applied**: `$effect` blocks now use `propCost || propertyCost` and `dealValue` dual-key pattern. Both down-payment and ATS calculation effects fixed. Commit `42a7728a`.

---

## SECTION 3: FEATURE GAPS (7 items + 2 NEW)

### FG-1: NBFC Negative Area System — TODO (Phase C)

Type `negativeAreas?: string[]` exists. No database, API, matching logic, or UI.

---

### FG-2: Cascading Intelligence (37 findings) — TODO (Phase D)

7 CRITICAL + 12 HIGH + 18 MEDIUM showWhen contradictions. Zero implementation. Spec: `docs/specs/CASCADING-INTELLIGENCE-AND-RISK-SIGNALS.md`

---

### FG-3: Offer Card Phase 4 — TODO (Phase C)

Tranche display, NRI GPA, registry urgency, BT appreciation. Spec: `docs/specs/PHASE4-OFFER-CARD-HANDOFF.md`

---

### FG-4: DSA Billing Page — TODO (Phase E, after PB-1/PB-2)

Plan selection + Razorpay payment flow. Build after Razorpay vulnerabilities are fixed.

---

### FG-5: professionalCategory Extraction — TODO (Phase D)

Gates other questions via showWhen. Careful extraction needed.

---

### FG-6: Admin Dashboard Testing UI — TODO (Phase I)

Route E2E through admin buttons. Existing infrastructure: `e2e-runs` API + polling page.

---

### FG-7: Credit Risk Intelligence — TODO (Phase I)

Discretionary risk layer. Design phase only. Spec: `docs/specs/CREDIT-RISK-INTELLIGENCE-SPEC.md`

---

### FG-8 (NEW): Affordability Cross-Lender Optimization — TODO (Phase C)

**What**: For each (HL lender × PL lender × PL applicant) combination, compute dynamic allocation factor from actual per-lakh-EMI, find optimal pairing that maximizes property affordability.

**Why**: No competitor does cross-lender HL+PL pairing with CIBIL-aware applicant assignment. This is the MOAT.

**Module built**: `src/lib/ruleEngine/affordabilityCalculator.ts` — 3 modes, piecewise linear transitions, tested fixed factors + dynamic formula. 35 tests passing.

**Still needed**: Integration into evaluationEngine when `propertyIdentified = false`, UI on offer cards with "What if" toggle, per-applicant PL cascade logic.

---

### FG-9 (NEW): Adaptive Location Question — TODO (Phase D)

**What**: One location question per co-applicant/director that adapts label and storage by loan type:
- Secured → "Same city as property?" → stores `propertyStateName`/`propertyCityName`
- Personal → "Same city as residence?" → stores `residenceStateName`/`residenceCityName`
- Business/Professional → "Same city as business?" → stores `businessStateName`/`businessCityName`

**Why**: Eliminates the need for geo fallback chains in the rule engine (AD-10 fix was a patch; this is the proper solution).

---

## SECTION 4: CODE QUALITY & SECURITY (61 items)

*(Unchanged from v1 — all items remain TODO. Will be addressed in Phase F.)*

### Security (12 items): CQ-1 through CQ-12
### Performance (14 items): CP-1 through CP-14
### Data Integrity (8 items): CD-1 ✅ FIXED, CD-2 through CD-8 TODO
### Logic/Flow (9 items): CF-9 ✅ FIXED, CF-1 through CF-8 TODO
### Code Consistency (9 items): CC-1 through CC-9 TODO

See v1 for full details on each item.

---

## SECTION 5: POST-LAUNCH / GROWTH (11 items)

*(Unchanged from v1 — PL-1 through PL-11)*

---

## SECTION 6: CODE-LEVEL TODOs (16 items)

*(Unchanged from v1 — will be addressed during related feature work)*

---

# SUMMARY

| Category | Total | Fixed (Session 52) | Remaining |
|---|---|---|---|
| Production Blockers | 8 | 2 (PB-4 prior, PB-5) | 6 |
| Active Development | 12 | 2 (AD-10, AD-12) | 10 |
| Feature Gaps | 9 (+2 new) | 0 | 9 |
| Code Quality / Security | 61 | 2 (CD-1, CF-9) | 59 |
| Post-Launch / Growth | 11 | 0 | 11 |
| Code-Level TODOs | 16 | 0 | 16 |
| **TOTAL** | **117** | **6** | **111** |

### New Assets Created This Session
- `src/lib/ruleEngine/affordabilityCalculator.ts` — Pure math module (35 tests)
- `docs/specs/PROPERTY-AFFORDABILITY-BACK-CALCULATOR.md` — Full spec with threshold smoothing
- `docs/DEVELOPMENT-ROADMAP.md` — Dependency-ordered implementation plan
- `docs/reviews/2026-04-04-full-platform-audit.md` — This document (v2)
- Coding standards added to standing instructions (MEMORY.md)
