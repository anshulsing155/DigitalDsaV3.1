# Session 65 Prompt — Company-Individual Income Intelligence + Cleanup

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state (Session 64 complete)
3. `docs/specs/S64-QUEUED-REQUIREMENTS.md` — **Requirement 4** section (~300 lines, detailed decision trees + flows)
4. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 64 completed all form flow fixes (R2, R3, R5, R6, R7). R1 bindsTo keys verified. R4 spec fully reviewed.

**Current metrics**: 0 type errors | 9,424 tests passing (81 files)

## Objective

**Implement Company-Individual Income Intelligence (R4) — per-entry qualifying questions that determine whether a company co-applicant is needed, and auto-creation of that company from income data.**

This is the largest remaining requirement. One person can be director/partner in multiple companies of different types — each income entry must be evaluated independently.

## Tasks (in priority order)

### Task 1: S64 Cleanup — Dead Code Removal

**Quick wins from S64 feedback:**
- `AddApplicantProfessional.svelte` — `selectType()` function (line ~139) is dead code. The type selector was removed from the template but the function still exists. Remove it.
- Verify the locked badge renders correctly when `getLoanLevelApplicantType()` returns a value.

### Task 2: Per-Entry Qualifying Questions — Director Income

**The core R4 feature.** When an individual adds a "Director in Company" income entry, ask qualifying questions INSIDE that entry's income details form:

**Decision tree (read `docs/specs/S64-QUEUED-REQUIREMENTS.md` Requirement 4 for full detail):**

```
Q1: "Is this company registered in India?"
  ├── No (foreign) → capture director salary in INR, no company co-applicant needed → DONE
  └── Yes → Q2

Q2: "What type of company?"
  ├── OPC → capture financials inline, no co-applicant → DONE
  ├── Listed / Large Public → treat as salaried, no co-applicant → DONE
  ├── Pvt Ltd / Public (unlisted) / Section 8 → Q3

Q3: "Do you hold equity / ownership?"
  ├── No (professional/independent director) → salaried treatment → DONE
  └── Yes → Q3a: ownership %, COMPANY CO-APPLICANT NEEDED
```

**Files to modify:**
- Income profile config for director income (find via `directorIncome` or `director_in_company`)
- `src/lib/config/incomeProfiles/` — the per-profile form fields
- Income entry form component — add qualifying questions before financial fields

**Key rules:**
- Questions are PER ENTRY, not global — same person can have 3 director entries with different answers
- Foreign company = no co-applicant, just ITR income
- OPC = individual IS the company, no separate entity
- Listed company = salaried employment, no co-applicant
- Pvt Ltd + equity = company co-applicant NEEDED

### Task 3: Per-Entry Qualifying Questions — Partner Income

Same pattern as Task 2 but for "Partner in Firm" income entries:

```
Q1: "Is this firm registered in India?"
  ├── No → foreign income, no co-applicant → DONE
  └── Yes → Q2

Q2: "What type of firm?"
  → Partnership / LLP → Q3

Q3: "What is your role?"
  ├── Active / Working Partner → COMPANY CO-APPLICANT NEEDED
  └── Sleeping / Inactive Partner → Q3a

Q3a: "Is profit share >30% of total income?"
  ├── Yes → COMPANY CO-APPLICANT NEEDED
  └── No → passive income, no co-applicant → DONE
```

### Task 4: Auto-Create Company Co-Applicant from Income Data

When a qualifying entry determines "Company Co-Applicant Needed":

1. **Check if company already exists** in applicant list (by name, case-insensitive)
2. **If found** → auto-link individual to existing company
3. **If not found** → show inline confirmation: "[ABC Pvt Ltd] should be added as a co-applicant — [Add as Co-Applicant] [Skip for Now]"
4. **On Add** → create company entry pre-filled from income data (name, type, revenue, profit, ITR status), establish `linkedCompanyId`
5. **On Skip** → store `__pendingCompanyLink`, show persistent banner

**Dedup rule:** Two directors listing "ABC Pvt Ltd" → only one company entry, both linked.

### Task 5: R1 — Offer Page Visual Changes (if time permits)

- Read `assessmentStatus`, `assessmentLenders`, `rejectionReasons` from case answers
- Badge on offer cards: "Previously rejected by this lender"
- Sort: rejected lenders deprioritized
- Don't auto-exclude — just warn

### Task 6: Classification Wiring (if time permits)

- Wire `applicantClassification` into `completionOpts` in `wizardState.svelte.ts`
- Per-lender classification evaluation (PVT vs GOV vs NBFC)

## Key Decision Table (from spec)

| Profile | Company Type | Equity? | Role | Co-App? |
|---|---|---|---|---|
| Director | Foreign (any) | Any | Any | **No** |
| Director | OPC | Yes (100%) | Sole | **No** |
| Director | Listed/Large Public | No | Board | **No** |
| Director | Indian Pvt Ltd | **No** | Professional | **No** |
| Director | Indian Pvt Ltd | **Yes** | Promoter | **Yes** |
| Partner | Indian LLP/Partnership | Active | Working | **Yes** |
| Partner | Indian LLP/Partnership | Sleeping | <30% income | **No** |
| Partner | Indian LLP/Partnership | Sleeping | >30% income | **Yes** |
| Business Owner | Sole Prop | N/A | Owner | **No** |

## Implementation Files (from spec)

| File | Changes |
|---|---|
| `src/lib/config/incomeProfiles/` (director/partner configs) | Per-entry qualifying questions |
| `src/lib/stores/applicantFormManager.svelte.ts` | `autoCreateCompanyFromIncomeEntry()` |
| `src/lib/components/IncomePageNew.svelte` | Per-entry qualifying form fields + post-save trigger |
| `src/lib/utils/companyAutoDerive.ts` | **New** — evaluate entries, dedup, auto-create, link |
| `src/lib/components/form-wizard/FormShell.svelte` | Pending company warning banner |

## Verification

After each task:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing

After all tasks:
1. Director income entry: Indian Pvt Ltd + equity → prompted to add company
2. Director income entry: OPC → no prompt, financials inline
3. Director income entry: Foreign → no prompt, captured as foreign salary
4. Partner income entry: Active partner in LLP → prompted to add firm
5. Partner income entry: Sleeping partner, <30% income → no prompt
6. Two directors, same company → one company entry, both linked
7. Professional Loan: applicant type badge shows correctly on Applicants page

## What NOT to Do

- Don't touch R2/R3/R5/R6/R7 — already completed in S64
- Don't touch classification badges or override UI — already working
- Don't touch landing page, billing, CSP/HSTS, or credentials
- Don't simplify income profiling — it's the business moat
- Don't delete any files — archive only
