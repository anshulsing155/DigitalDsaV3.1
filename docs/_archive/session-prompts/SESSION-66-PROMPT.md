# Session 66 Prompt — Parity Checks + R1 Offer Page

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state (Session 65 complete)
3. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 65 completed R4 Company-Individual Income Intelligence + Professional Loan Company flow. User-tested and verified working. Key patterns established:
- `co_applicant_non_financial` classification for Professional Loan directors
- `resolveClassification()` in IncomePageNew for on-the-fly classification
- `incomeValueCheck` computes fresh (not trusting `__completion` flags)
- `NOT_MULTI_APPLICANT` showWhen hides flattened pages for Company path
- `isProfessionalLoan` prop on DirectorFormModal + directorFormUtils

**Current metrics**: 0 type errors | 9,465 tests passing (82 files)

## Objective

**Parity checks across loan types + R1 Offer Page visual implementation.**

## Tasks (in priority order)

### Task 1: Business Loan Parity Check

The Professional Loan Company flow now has non-financial directors, classification wiring, profile page skip, etc. Verify the Business Loan Company flow:

- **Does Business Loan need the same treatment?** Business Loan companies are different — they ARE the primary income entity. Directors in a Business Loan company may need full financial profiling (unlike Professional Loan where the firm's income IS the professional's income). Investigate and decide.
- **Check `incomeValueCheck`** in `business-loan/+page.svelte` — does it trust `__completion` flags or compute fresh? If flags, apply same fix.
- **Check `closeModal` reactive propagation** — same issue may exist.
- **Check `applicantProfilePage` showWhen** — Business Loan likely already has this correct.

### Task 2: Personal Loan Parity Check

- **Check `incomeValueCheck`** in `personal-loan/+page.svelte` — same `__completion` trust issue?
- **Check `nextDisabled` for applicant step 3** — same `applicantNextEnabled` vs `incomeValueCheck` issue?

### Task 3: Secured Loan Regression Check

- Home Loan, LAP, Plot Loan — verify `closeModal` always-replaceApplicants doesn't cause:
  - Infinite loops (the conditional was removed)
  - Performance issues (unnecessary re-renders)
  - Any completion status regression

### Task 4: wizardState.svelte.ts Classification Wiring (carried from S65)

**S65 originally asked for this but it wasn't done.** The sidebar wizard progress indicators use `wizardState.svelte.ts` to compute page completion. It calls `computeSectionCompletion()` at line ~262 but does NOT pass `applicantClassification`. This means the sidebar progress for income/credit pages may show incorrect completion for non-financial directors.

- Wire `applicantClassification` into `completionOpts` in `wizardState.svelte.ts`
- Verify sidebar progress shows correctly for Professional Loan Company path

### Task 5: R1 Offer Page Visual Changes (carried from S65)

Read `assessmentStatus`, `assessmentLenders`, `rejectionReasons` from case answers (bindsTo keys confirmed in S64).

- **Badge on offer cards**: "Previously rejected by this lender" for lenders in `assessmentLenders`
- **Sort**: Rejected lenders deprioritized (shown last)
- **Don't auto-exclude** — just warn

### Task 6: Classification Remaining Work (if time)

- Per-lender classification evaluation (PVT vs GOV vs NBFC treat Both=No differently)
- CIBIL floor for Guarantor Financial (750/725/700 per lender type)

## CRITICAL: Execution Path Verification

**Before writing ANY fix**: Trace the full execution path.
1. Which `.svelte` component actually mounts for this flow?
2. Which file sets the data? Which file reads it? Same component tree?
3. If adding an `$effect`, confirm the component is in the render tree for the target loan type.

**Before claiming done**: Grep all callers/consumers. Confirm the code executes in the right context. NEVER say "fix is done" based on type-check + tests alone.

## Verification

After each task:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing
3. For Professional Loan: test Company path end-to-end (directors → profile → credit → Next enabled)

## What NOT to Do

- Don't re-implement R4 — it's done and working
- Don't touch Professional Loan Company flow — it's user-tested
- Don't simplify income profiling
- Don't touch landing page, billing, CSP/HSTS, or credentials
