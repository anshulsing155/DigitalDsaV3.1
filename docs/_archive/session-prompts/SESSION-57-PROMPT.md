# Session 57 — Performance + Security Polish

## Quick Context

Session 56 completed Cat 4 Tier A-B (rule engine wiring, facility branching, fixture fallback) and Cat 6 partial (component splitting). The platform is feature-complete through all core phases. Remaining work is polish: performance, security, then the dashboard/landing redesign.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — Session 56 summary, full pending inventory
3. This prompt — Session 57 priorities

**Current state:** `main` branch | 0 type errors | 9,290 tests (76 files) | Latest commit: `008328e8`

---

## Session 56 Highlights (for context)

**5 commits spanning:**
- AD-1: Fixture fallback — evaluatePayload uses 10 static rule docs when DB empty
- AD-2: FACILITY_TYPE_CONFIG (4 types), per-facility FOIR/EMI/tenure branching
- Cat 6 Phase 1: Shared applicantQuestions.ts + applicantFormValidation.ts
- Cat 6 Phase 4: IncomeModalContent.svelte (dual render path separated)
- Cat 6 Phase 5a: LenderTrancheBreakdown.svelte (-352 lines from LenderResultCard)

**Resolved without code:**
- FG-1 (NBFC Negative Areas) = RM data, wiring already in evaluatePayload
- FG-3 (Offer Card Phase 4) = already fully implemented
- Multi-company income = already supports 3+ directorships
- Adaptive location = already implemented (compound location questions)
- V1 schema elimination = DEFERRED to form values redesign

---

## Session 57 Priorities

### Priority 1: Cat 3 — Performance

#### CP-6: $effect Cascade Reduction
**What**: Audit components for $effect chains that trigger redundant re-computations. Replace with $derived where possible.
**Key files**: `IncomePageNew.svelte`, `DirectorCards.svelte`, `AddApplicantProfessional.svelte`, `AddApplicantBusiness.svelte`
**Approach**: Search for `$effect` blocks that set $state — many can be converted to `$derived`

#### CP-8-14: Lazy Imports + Code Splitting
**What**: Large imports loaded eagerly on every page visit. Split heavy modules behind dynamic imports.
**Candidates**:
- Rule engine modules (only needed on evaluation page)
- PDF/pdf-lib (only needed for file builder)
- Chart components (only on dashboard)
- Policy engine modules (only admin)
**Approach**: Replace `import X from` with `const X = await import()` in `onMount` or event handlers

### Priority 2: Cat 2 — Security Polish

#### CQ-9-12: Rate Coupling + Billing Guards
**What**: Ensure rate limits are coupled per-user, billing guards are fail-closed on all paid endpoints
**Key files**: `src/lib/server/rateLimiter.ts`, `src/routes/api/*/+server.ts`

#### CF-3: Duplicate Refresh Endpoint
**What**: There may be a duplicate refresh token endpoint — consolidate
**Key files**: `src/routes/api/auth/refresh/`

#### CD-6-8: Deterministic payload_hash + FormSnapshot TTL
**What**: Payload hashing should be deterministic (sort keys). FormSnapshot documents should have TTL indexes.
**Key files**: `src/lib/database/mongo.ts`, payload-related utilities

### Priority 3: Cat 4 Tier C (if time)

#### Risk Signals Architecture
**What**: Add `riskSignal` declarations to schema option definitions so the form can flag risky answers
**Key files**: `src/lib/config/schema/schemaTypes.ts`, questionBank files

---

## Full Pending Inventory (from Session 56)

### Cat 3: Performance
- CP-6: $effect cascade reduction
- CP-8-14: Lazy imports, code splitting

### Cat 2: Security
- CQ-6/7: CSP nonce + HSTS (needs HTTPS)
- CQ-9-12: Rate coupling, billing guards
- CF-3: Duplicate refresh endpoint
- CD-6-8: Deterministic payload_hash, FormSnapshot TTL

### Cat 4 Tier C: Form Quality (remaining)
- Risk Signals Architecture
- V1 schema elimination (DEFERRED to form values redesign)
- AD-11: Unsecured business loan dedup

### Cat 4 Tier D: Advanced (post-launch)
- Cross-lender affordability, per-applicant PL, credit risk intelligence, AI rule parsing, variation matching

### Cat 6: Code Health (remaining — low priority)
- DirectorCards (1608), remaining template splits deferred
- Select/modal consolidation

### Cat 1: Production Blockers (do LAST)
- PB-7: Credential rotation
- PB-8: Email hardening

### Dashboard/Landing Redesign (Sessions 61-64)
- Mockup: `docs/mockups/dashboard-redesign.html`

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Never delete files** — Move to `_archive/` instead
6. **Always stay on `main` branch**
7. **Never add Co-Authored-By lines** to commits
