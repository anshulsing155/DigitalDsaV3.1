# Plan: Unsecured Loan Applicant Type Selector (Secured Loan Pattern)

## Current State

**Secured loans** (Home/LAP/Plot) use `AddApplicant.svelte`:
- Shows "Who is applying?" with **2 card buttons**: Individual | Company
- User clicks one → form fields appear below based on selection
- Can add multiple applicants (each gets type selection)
- Saved applicants shown in table with Edit/Delete
- `applicationStructure` auto-derived from actual applicants

**Unsecured loans** have 3 separate components with different patterns:
- `AddApplicantPersonal`: No type selector. Always Individual. Can add multiple.
- `AddApplicantBusiness`: No type selector. Entity type derived from prior page (`businessEntityType`).
- `AddApplicantProfessional`: Has `practiceMode` selector (Individual Practitioner | Firm). Close to secured pattern but only 2 options.

## Proposed Changes

### Professional Loan — 3-Type Selector

Replace the current `practiceMode` (Individual Practitioner | Professional Firm) with a **3-card type selector** matching the secured loan UI style:

| Type | Icon | Description | Form | applicationStructure |
|------|------|-------------|------|---------------------|
| **Individual** | User | Single professional applying alone | Individual form (name, gender, age, marital, NRI) | `'individual'` |
| **Joint** | Users | Two or more professionals applying together | Same individual form, must add 2+ applicants | `'group_individuals'` |
| **Company / Firm** | Building2 | Professional firm (LLP, Partnership, Pvt Ltd, OPC) | Company form → DirectorCards | `'company'` or `'mix'` |

**UI flow:**
1. "Who is applying?" heading with 3 cards (grid-cols-3 on desktop, stacked on mobile)
2. User clicks a card → form appears below
3. Individual/Joint: Individual form fields + "Add Applicant" button + saved table
4. Company/Firm: Firm details form (company name, firm type, registration, partner count) + save → DirectorCards

**Key differences from current:**
- "Individual" locks to exactly 1 applicant (no "Add another" after first save)
- "Joint" requires 2+ applicants (validation error if only 1)
- "Company/Firm" replaces current firm mode (same flow, just better UI)

### Personal Loan — 2-Type Selector

Add a type selector to `AddApplicantPersonal`:

| Type | Icon | Description | applicationStructure |
|------|------|-------------|---------------------|
| **Individual** | User | Single person applying alone | `'individual'` |
| **Joint** | Users | Two or more people applying together | `'group_individuals'` |

No "Company" option — personal loans are for individuals only.

### Business Loan — Conditional Selector

Business Loan has `businessEntityType` already selected on Loan Requirement page:

- **If proprietorship**: Show 2-type selector (Individual | Joint) — sole proprietor(s)
- **If company type** (partnership, LLP, private_limited, OPC, trust_society): Show company form directly with entity badge (no selector needed — type is already determined)

This avoids redundant selection while still giving proprietorship users the Individual/Joint choice.

## Implementation Steps

### Step 1: Modify AddApplicantProfessional.svelte
- Replace `practiceMode` state with `applicantType: 'individual' | 'joint' | 'company' | null`
- Replace 2-card selector with 3-card selector (Individual | Joint | Company/Firm)
- Individual path: single applicant, lock "Add another" after 1st save
- Joint path: same form, allow multiple, validate 2+ on Next
- Company/Firm path: same as current firm mode (company form + DirectorCards)
- Update applicationStructure derivation

### Step 2: Modify AddApplicantPersonal.svelte
- Add `applicantType: 'individual' | 'joint' | null` state
- Add 2-card selector (Individual | Joint)
- Individual: lock to 1 applicant
- Joint: allow multiple, validate 2+ on Next

### Step 3: Modify AddApplicantBusiness.svelte
- If `businessEntityType === 'proprietorship'`: add 2-card selector (Individual | Joint)
- If company type: keep current company form (auto-selected, no selector needed)
- Individual: lock to 1 proprietor
- Joint: allow multiple proprietors

### Step 4: Verify all flows
- Type check, tests
- Verify DirectorCards navigation (Previous button fix already applied)
- Verify applicationStructure values downstream
