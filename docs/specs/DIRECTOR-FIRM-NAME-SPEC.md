# Director Firm-Name Combobox + Cross-Applicant Validation (Design Spec)

**Feature**: Director partner-firm name combobox + cross-applicant borrowing-firm validation
**Status**: Design only — no code changed
**Date**: 2026-05-18
**Roadmap anchor**: `docs/DEVELOPMENT-PLAN.md` (add as new tactical item)

---

## Section Index

1. [Execution-Path Map](#1-execution-path-map)
2. [Combobox Component Selection](#2-combobox-component-selection)
3. [Option Source Algorithm](#3-option-source-algorithm)
4. [Inline-Add UX](#4-inline-add-ux)
5. [Data Model Impact](#5-data-model-impact)
6. [Cross-Applicant Validation Surface](#6-cross-applicant-validation-surface)
7. [Form Schema Changes](#7-form-schema-changes)
8. [Edge Cases](#8-edge-cases)
9. [Test Plan](#9-test-plan)
10. [Implementation Phases](#10-implementation-phases)
11. [Risks and Open Questions](#11-risks-and-open-questions)

---

## 1. Execution-Path Map

The `entityName` field for `business_partnership` income entries is rendered in **one component only** — `IncomeSourceForm.svelte`. However, that component is mounted in four distinct contexts. Every one must work correctly.

### Path A — Business Loan, single Individual applicant (most common)

Route: `src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte`
Page id: `incomeDetailsPage` (page definition in `src/lib/config/businessLoan/pages.ts` via `buildIncomeDetailsPage()`)
Component chain: `+page.svelte` → `IncomeSourceForm` (rendered inline at line 1168 of page)
Trigger: user selects `business_partnership` from the Income Source Type dropdown

### Path B — Business Loan, multi-applicant, Individual tab

Route: same `+page.svelte`
Component chain: `+page.svelte` → `IncomePageNew` → `IncomeModalContent` → `IncomeTabContent` → `IncomeSourceForm`
Trigger: user opens any Individual applicant's income modal, selects `business_partnership`

### Path C — Auto-created entry from a Partnership/LLP Company applicant link

`directorAutoIncome.ts` `buildAutoEntry()` is called from `applicantFormManager.svelte.ts` (line 492 region).
The `entityName` is set to `company.companyName` at creation time (line 201 of `directorAutoIncome.ts`).
This entry is NOT entered via the form — `IncomeSourceForm` only EDITS it afterward.
When the DSA opens the auto-created entry for editing (`isAutoEntry = true`), the `entityName` field is `disabled={isAutoEntry}` (line 1028 of `IncomeSourceForm.svelte`).
The combobox is irrelevant for auto-created entries — the name is locked.

### Path D — Professional Loan

Route: `src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte`
`business_partnership` is not in the standard professional loan income profiles. Not a live path today. Safe to ignore until the profile is explicitly added there.

### Path E — Personal Loan

`business_partnership` is available to any Individual regardless of loan type. Personal loan's `incomeDetailsPage` also mounts `IncomeSourceForm`.
Route: `src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte`

### Critical observation

The combobox enhancement applies **only to Paths A and B** (where the user types a firm name). Path C locks the field. Problem B validation (borrowing-firm declaration) applies **only to Business Loan** when the entity type is Partnership Firm or LLP — not to Personal/Professional loan flows where `business_partnership` income is also collected.

---

## 2. Combobox Component Selection

### What exists

`PincodeTypeahead.svelte` (`src/lib/components/PincodeTypeahead.svelte`) is the closest existing pattern: a `TextField` with a floating dropdown of suggestions rendered below it (fixed position via `z-100` absolute div). It supports free-text entry (user can type anything) and click-to-select from suggestions.

However, `PincodeTypeahead` is tightly coupled to the pincode API and the city/state context. It is not a general-purpose combobox.

`ApplicantSelect.svelte` is a full dropdown with no free-text entry capability.

**No existing component supports both dropdown suggestions AND accepting an arbitrary typed string as the final value.**

### Decision: extend `TextField` with a new `FirmNameCombobox.svelte` wrapper

Do NOT add `allowCustomValue` to an existing select component. The select components (`ApplicantSelect`, `BooleanSelect`, `NewSelect`) render a `<button>` trigger — adding a text input path would require restructuring their accessibility model and would bloat them. That path violates "small focused files."

Instead, model directly on `PincodeTypeahead`'s pattern: a thin wrapper around `TextField` that renders a suggestion dropdown. This is ~80 lines of new code, zero risk to existing select components, and perfectly matches the codebase's existing typeahead approach.

**New component**: `src/lib/components/FirmNameCombobox.svelte`

Responsibilities:
- Wraps `TextField` for all keyboard, focus, and error-display behavior
- Receives `options: { label: string; value: string }[]` as a prop
- Renders a floating suggestion list below the input when the list is non-empty and the input is focused
- Passes through any typed value verbatim — no validation that the value must be in the list
- Shows a "Use `X` as new firm name" pseudo-option at the top of the list when the typed text does not match any suggestion exactly (see section 4)
- Emits a single `onChange(value: string)` callback — caller does not need to know whether the value came from the list or was typed fresh

Interface:

```typescript
interface Props {
  id: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}
```

---

## 3. Option Source Algorithm

The dropdown for the `entityName` field when `profileType === 'business_partnership'` is assembled live each time the `IncomeSourceForm` is opened. The caller (`+page.svelte` or `IncomePageNew`) computes the list and passes it as a new prop to `IncomeSourceForm`. `IncomeSourceForm` passes it down to `FirmNameCombobox`.

New prop on `IncomeSourceForm`:

```typescript
firmNameOptions?: { label: string; value: string }[];
```

When `firmNameOptions` is provided AND `currentProfileType === 'business_partnership'`, the `entityName` TextField is replaced by `FirmNameCombobox`.

### Assembly algorithm (lives in the route's `$derived.by` block)

```typescript
// Called from +page.svelte or IncomePageNew when assembling props for IncomeSourceForm

function assembleFirmNameOptions(
  applicants: Array<Record<string, unknown>>,
  currentApplicantId: string
): { label: string; value: string }[] {
  const seen = new Set<string>();
  const options: { label: string; value: string }[] = [];

  function addIfNew(rawName: string, suffix: string) {
    const normalized = rawName.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    options.push({ label: rawName.trim() + suffix, value: rawName.trim() });
  }

  // 1. Parent borrowing firm (any Company applicant with companyType Partnership Firm or LLP)
  const partnershipCompanies = applicants.filter(
    (a) =>
      a.applicantType === 'Company' &&
      (a.companyType === 'Partnership Firm' || a.companyType === 'LLP')
  );
  for (const company of partnershipCompanies) {
    const name = (company.companyName as string) || '';
    if (name) addIfNew(name, ' (this firm)');
  }

  // 2. Sibling-applicant partnership income declarations (other applicants' incomeEntries)
  for (const applicant of applicants) {
    if (applicant.id === currentApplicantId) continue;
    const entries = (applicant.incomeEntries as Array<{ profileType: string; entityName: string }>) ?? [];
    for (const entry of entries) {
      if (entry.profileType === 'business_partnership' && entry.entityName) {
        addIfNew(entry.entityName, '');
      }
    }
  }

  // 3. Current applicant's own prior entries (for editing a second entry from a different firm)
  const self = applicants.find((a) => a.id === currentApplicantId);
  const selfEntries = (self?.incomeEntries as Array<{ profileType: string; entityName: string }>) ?? [];
  for (const entry of selfEntries) {
    if (entry.profileType === 'business_partnership' && entry.entityName) {
      addIfNew(entry.entityName, ' (already added)');
    }
  }

  // 4. (Future) recall from cached past entries — not in scope for Phase 1

  return options;
}
```

The parent firm always sorts first because it is pushed first and `seen` deduplication prevents it from reappearing in the sibling pass.

---

## 4. Inline-Add UX

### Dropdown appearance as the user types

- Field is a standard `TextField` (same visual style, same error/icon behavior)
- Suggestion list appears **only when** the field is focused AND there is at least one option OR the typed text is non-empty
- Suggestions are filtered to names that contain the typed text as a substring (case-insensitive)
- Maximum 6 options visible; list scrolls internally if more

### The "Use X" pseudo-option

When the typed text does not exactly match any suggestion (case/trim normalized), the first item in the list is:

```
+ Use "Prashant Trading Co." as new firm name
```

This item appears at position 0, visually differentiated (lighter background, `+` prefix). Selecting it sets the input value to the raw typed text and closes the dropdown. No separate "Other" mode, no secondary input — the user is already typing in-place.

When the typed text exactly matches a suggestion, the "Use X" item does not appear.

### Keyboard navigation

- Arrow Down / Arrow Up: move highlight through the visible list
- Enter: select the highlighted item (or the "Use X" pseudo-option if it is highlighted)
- Escape: close the dropdown, keep current typed value
- Tab: close dropdown, move to next field, keep typed value

### Mobile behavior

On `deviceState.isMobile === true`, the dropdown appears at `position: fixed` rather than `position: absolute` to avoid the scrollable-modal clipping issue (Pitfall #17). The `FirmNameCombobox` uses the same `fixed`-positioning guard as any other floating overlay — check the computed `getBoundingClientRect()` of the input and offset accordingly.

---

## 5. Data Model Impact

### Stored value type

`entityName` today is a `string` and is stored at `applicant.incomeEntries[*].entityName`. **Keep it as a string.** The combobox emits a string; no downstream consumer cares whether the name came from the list or was typed.

### Optional `linkedFirmId` field

The question: should the system also store a reference when the user picks a known Company applicant's firm (Path A / "this firm" option)?

**Recommendation: do not add `linkedFirmId` in Phase 1.** The existing cross-reference mechanism (`sourceCompanyId` on auto-created entries) already covers the auto-created-entry case (Path C). For manually-declared entries, linking by name string is sufficient for the cross-applicant validation in Problem B (see section 6). Adding `linkedFirmId` would require migrating existing entries and complicates orphaning logic — the cost exceeds the benefit at this stage.

If the rule engine later needs structured cross-references for manually-declared partnership income, revisit as a separate data-model migration.

---

## 6. Cross-Applicant Validation Surface

### The rule

For a Business Loan where the entity type is **Partnership Firm or LLP**: at least one director/partner listed under the Company applicant must have a `business_partnership` income entry with `entityName` matching the borrowing firm's name (normalized: lowercased, trimmed, collapsed whitespace).

### Where validation lives

**Not** in `IncomeSourceForm.svelte` — that component is per-applicant and does not have visibility into the full applicant list.

**Not** in `directorFormUtils.validateAllDirectors` — that function validates director identity fields, not income cross-references.

**Correct location**: `AddApplicantBusiness.svelte`, inside the `$derived` block that computes `isNextEnabled` (lines 206-221), and in the `validateStep()` function that the route's Next handler calls.

### Algorithm

```typescript
// Added to the existing $derived block in AddApplicantBusiness.svelte
// Only active when entityType is Partnership Firm or LLP

function checkBorrowingFirmDeclaration(
  companyName: string,
  applicants: Array<Record<string, unknown>>
): { valid: boolean; missingDirectorNames: string[] } {
  const normalizedFirmName = companyName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalizedFirmName) return { valid: true, missingDirectorNames: [] };

  // Find all Individual applicants linked to this Company
  const linkedIndividuals = applicants.filter((a) => {
    const ids = (a.linkedCompanyIds as string[]) ?? [];
    return a.applicantType === 'Individual' && ids.includes(currentCompanyId);
  });

  if (linkedIndividuals.length === 0) {
    // No linked Individuals yet — validation not applicable yet
    return { valid: true, missingDirectorNames: [] };
  }

  const hasDeclaration = linkedIndividuals.some((individual) => {
    const entries = (individual.incomeEntries as Array<{ profileType: string; entityName: string }>) ?? [];
    return entries.some(
      (e) =>
        e.profileType === 'business_partnership' &&
        e.entityName.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedFirmName
    );
  });

  if (hasDeclaration) return { valid: true, missingDirectorNames: [] };

  // Identify which partners are missing the declaration (for the hint)
  const missing = linkedIndividuals
    .filter((individual) => {
      const entries = (individual.incomeEntries as Array<{ profileType: string; entityName: string }>) ?? [];
      return !entries.some(
        (e) =>
          e.profileType === 'business_partnership' &&
          e.entityName.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedFirmName
      );
    })
    .map((a) => (a.fullName as string) || 'Unnamed');

  return { valid: false, missingDirectorNames: missing };
}
```

### Error surface

When `valid === false`, `isNextEnabled` is set to `false` and a inline error is displayed **below the director/partner table** in `AddApplicantBusiness.svelte`:

```
At least one partner must declare income from "{companyName}" in their Income section.
Partners without this declaration: Rajesh Kumar, Priya Sharma (tap to add)
```

The "(tap to add)" links are not wired in Phase 3 — they are a future enhancement. In Phase 3, just render the names as plain text.

The condition for firing this validation:
- `entityConfig.companyType` is `'Partnership Firm'` or `'LLP'`
- `companyName` is non-empty (the firm has a name)
- At least one Individual has been added as a partner (i.e., `linkedIndividuals.length > 0`)

**Do not fire** when directors/partners have not been added yet — the error would appear before the user has had a chance to enter any income, which is disorienting.

### Validation timing

This validation fires at **Next-click** only (Pitfall #21). The `isNextEnabled` derived value also reflects it, so the Next button disables reactively once income pages are filled without the required declaration. This is consistent with all other cross-applicant rules in the codebase.

---

## 7. Form Schema Changes

### No `bindsTo` changes

`entityName` is not a form-schema question — it is a field inside `IncomeSourceEntry` (typed in `src/lib/types/incomeProfile.ts`). It does not go through the `bindsTo` / `combinedAnswers` system. No schema changes are needed.

### No `showWhen` changes

The combobox replacement is conditional on `profileType === 'business_partnership'` — this is already a runtime condition inside `IncomeSourceForm`, not a schema-level `showWhen`.

### Auto-clear parity (Pitfall #12)

`IncomeSourceForm.handleProfileTypeChange()` already clears `entityName` when the user changes the income source type. The combobox value is just a string in `entityName` — the existing reset in `resetForm()` and `handleProfileTypeChange()` covers it.

### Cross-field validation timing (Pitfall #21)

The borrowing-firm validation lives in `AddApplicantBusiness.validateStep()`, which is called from `ApplicantFormUnsecured.nextFromAddApplicant()` (line 170), which is called from the route's Next handler. This conforms to the Pitfall #21 "fire on Next-click only" rule. No `debouncedEvaluate` calls are added.

---

## 8. Edge Cases

**What if there are no directors/partners (sole proprietor)?**
The `isSoleProp` branch in `AddApplicantBusiness` renders the Individual form, not the Company + director form. The borrowing-firm validation is inside the Company branch and never fires. No action needed.

**What if the parent firm is renamed mid-form?**
The borrowing-firm validation reads `companyName` live from `companyForm.companyName` (reactive `$derived`). If the DSA renames the firm, the normalized comparison immediately reflects the new name. Previously-entered partner income entries referencing the old name will now fail the check — the error banner reappears, prompting the DSA to update those entries. This is the correct behavior; the system should not silently accept stale data.
Edge: the `assembleFirmNameOptions` function also re-derives from the Company applicant's `companyName`, so the "(this firm)" option in the dropdown updates immediately too.

**What if a director is added after the validation passed?**
`isNextEnabled` is a `$derived` value. When a new partner is added, `formState.applicants` changes, which re-evaluates `checkBorrowingFirmDeclaration`. If the new partner has no income declaration yet, the check immediately goes `valid: false` and Next disables again. The DSA must go to that partner's income step and add the declaration before proceeding.

**What if the company has two partner types (Partnership + LLP) in different applicant entries?**
Each Company applicant is validated independently. The borrowing-firm check for a given Company only looks at Individuals linked to that Company (via `linkedCompanyIds`). Two separate Company applicants each run their own check.

**What if the user picks a sibling's firm from the dropdown but spells it differently than stored?**
The option value in `FirmNameCombobox` is the exact string from the sibling's `entityName`. When the user picks from the list, `onChange(value)` fires with the exact stored string. Normalization in the validation handles minor whitespace differences. If the user types a variant instead of picking, the normalization still handles it as long as the base name is the same. This is acceptable — the DSA controls the data.

**What if a firm appears in both the "this firm" slot and the sibling slot?**
The `seen` Set in `assembleFirmNameOptions` deduplicates by normalized name. The first occurrence (parent firm) takes the `(this firm)` label; subsequent references to the same name are silently dropped.

---

## 9. Test Plan

### Unit tests (all in `src/lib/testing/__tests__/`)

**`firmNameCombobox.test.ts`** — pure component behavior (no DOM):
- `assembleFirmNameOptions` with zero Partnership companies → empty list
- `assembleFirmNameOptions` with one Partnership Company → first option is `(this firm)` label
- Deduplication: sibling declares same firm as the parent → only one option
- Sibling declares different firm → both appear, parent first
- `checkBorrowingFirmDeclaration` with no linked Individuals → `valid: true`
- `checkBorrowingFirmDeclaration` with one partner who has the declaration → `valid: true`
- `checkBorrowingFirmDeclaration` with two partners, none declared → `valid: false`, both names in `missingDirectorNames`
- Name normalization: `" Prashant Trading Co.  "` matches `"prashant trading co."`

**`addApplicantBusinessValidation.test.ts`** — integration with `AddApplicantBusiness` validation:
- Partnership entity + all partners declared → `isNextEnabled: true`
- Partnership entity + zero partners declared → `isNextEnabled: false`
- LLP entity → same behavior as Partnership
- Pvt Ltd entity → validation does not fire (not Partnership/LLP)
- Rename company → check re-fires against new name

### Pre-flight greps for this feature (add to CLAUDE.md §4 after ship)

```bash
# Verify FirmNameCombobox uses position:fixed for mobile dropdown (Pitfall #17)
grep -n "position.*fixed\|position.*absolute" src/lib/components/FirmNameCombobox.svelte

# Verify borrowing-firm validation only fires for Partnership/LLP (not Pvt Ltd)
grep -n "Partnership Firm.*LLP\|companyType.*borrowing" src/lib/components/AddApplicantBusiness.svelte

# Verify entityName field still disabled for auto-created entries
grep -n "disabled.*isAutoEntry\|isAutoEntry.*disabled" src/lib/components/IncomeSourceForm.svelte
```

---

## 10. Implementation Phases

### Phase 1 — `FirmNameCombobox.svelte` component (~3 hours)

- [ ] Create `src/lib/components/FirmNameCombobox.svelte` per interface in section 2
- [ ] Implement dropdown: `TextField` + floating suggestion list
- [ ] Implement "Use X as new firm name" pseudo-option logic
- [ ] Keyboard navigation (Arrow, Enter, Escape, Tab)
- [ ] Mobile: `position: fixed` dropdown (avoid Pitfall #17)
- [ ] `pnpm check` passes, 0 new warnings

### Phase 2 — Wire `FirmNameCombobox` into `IncomeSourceForm` (~2 hours)

- [ ] Add `firmNameOptions` prop to `IncomeSourceForm`
- [ ] In the `entityName` render block: when `currentProfileType === 'business_partnership'` AND `firmNameOptions` is provided AND not `isAutoEntry` AND not `isLinkedEntry`, render `FirmNameCombobox` instead of `TextField`
- [ ] Add `assembleFirmNameOptions()` helper to `src/lib/utils/incomeUtils.ts` (create if absent, or add to existing utils file)
- [ ] Wire `firmNameOptions` prop from:
  - `business-loan/+page.svelte` (single-applicant path, line 1168 region)
  - `IncomePageNew.svelte` → `IncomeModalContent` → `IncomeTabContent` → `IncomeSourceForm` (prop-drill chain for multi-applicant path)
- [ ] Parity check: Personal loan page does NOT receive `firmNameOptions` — combobox does not activate there (no parent firm context)
- [ ] `pnpm check` passes, `pnpm test:unit -- --run` passes

### Phase 3 — Cross-applicant borrowing-firm validation (~2 hours)

- [ ] Add `checkBorrowingFirmDeclaration()` to `src/lib/utils/directorFormUtils.ts`
- [ ] Wire into `AddApplicantBusiness`'s `isNextEnabled` derived block
- [ ] Wire into `AddApplicantBusiness.validateStep()` so the route's `navigateNext()` call also blocks
- [ ] Add inline error banner below the director/partner table (amber, non-dismissable until resolved)
- [ ] Guard: only fires when `companyType` is `'Partnership Firm'` or `'LLP'`
- [ ] Guard: only fires when `companyName` is non-empty
- [ ] Guard: only fires when at least one Individual partner has been added
- [ ] `pnpm check` passes

### Phase 4 — Test coverage (~2 hours)

- [ ] Write `firmNameCombobox.test.ts` (unit tests listed in section 9)
- [ ] Write `addApplicantBusinessValidation.test.ts`
- [ ] `pnpm test:unit -- --run` all green

**Total estimated effort: 9 hours across 4 sessions.**

---

## 11. Risks and Open Questions

**Risk: prop-drilling `firmNameOptions` through IncomePageNew → IncomeModalContent → IncomeTabContent → IncomeSourceForm**

The multi-applicant modal path is a 3-level prop chain. This is verbose but safe — all four components are already tightly coupled by existing props. Alternative (store-based context) would be harder to test and violates the existing pattern. Accept the prop chain.

**Risk: stale option list when a sibling's income entry is added while both modals are open**

`assembleFirmNameOptions` is `$derived` from `formState.applicants`. When an income entry is committed to another applicant's `incomeEntries`, `formState.applicants` changes reactively, and `$derived` re-evaluates. The option list in the open modal updates automatically. No stale-cache risk.

**Open question: should Personal Loan or Professional Loan flows also receive `firmNameOptions`?**

Not in scope for this feature. For Personal Loan, there is no "borrowing firm" concept — the individual is borrowing on their own. The combobox is purely a usability assist; if no options are provided, it degrades gracefully to a plain TextField. The caller simply omits the prop.

**Open question: should the `(tap to add)` names in the error banner be links to open that partner's income modal directly?**

Deferred. The deep-link into `IncomePageNew`'s modal for a specific applicant is complex (it would need `dialogState.openIncomeModal(applicantId, 'incomeDetails')` — check if this exists first). Phase 3 renders plain names only.

**Open question: what about the Home/LAP/Plot loan flows?**

Secured loans also support `business_partnership` income (via `IncomeSourceForm` mounted inside `ApplicantFormSecured`). The combobox enhancement would benefit those flows too, but there is no "borrowing Company applicant" concept in secured loans (the borrowing entity is the Individual). `firmNameOptions` would be empty or contain only sibling-declared entries. Acceptable for Phase 1 to skip secured loans and revisit.
