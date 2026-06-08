# Maintenance Implementation Plan — 2026-03-23

**Source:** CODEBASE-MAINTENANCE-REVIEW-2026-03-21.md items #5, #6, #8, #9
**Status:** Research complete, implementation pending

---

## Item #5: Select Component Consolidation (17→8)

### Current State: 17 Select Variants

| Component | Lines | Imports | Category | Action |
|-----------|-------|---------|----------|--------|
| **SelectField** | 180 | **24** | single-select | KEEP (primary interface) |
| CustomSelect | 303 | 4 | single-select | MERGE → UnifiedSelect base |
| NewSelect | 375 | 4 | single-select | DEPRECATE → SelectField |
| DerivedSelect | 59 | 6 | single-select | DEPRECATE → SelectField |
| ApplicantSelect | 319 | 1 | single-select | MERGE → UnifiedSelect |
| BooleanSelect | 241 | 1 | single-select | MERGE → UnifiedSelect (mode=boolean) |
| SelectionCustom | 29 | 1 | single-select | ARCHIVE (thin wrapper) |
| **MultipleSelectField** | 500 | **6** | multi-select | KEEP (primary multi-select) |
| **MultiOptionsSelection** | 762 | **6** | multi-option | KEEP (Yes/No statements) |
| **IncomeProfileSelector** | 369 | **8** | domain-specific | KEEP (income-specific) |
| **LanguageSelector** | 150 | **2** | domain-specific | KEEP (app-level) |
| **OnboardingSelect** | 109 | **3** | single-select | KEEP (native HTML select) |
| ModuleSelectionSection | 219 | 1 | multi-select | KEEP (onboarding domain) |
| SelectedLendersSection | 225 | 0 | display-only | KEEP (not a selector) |
| MultiSelectFieldWithSwitchButton | 370 | **0** | multi-select | ARCHIVE (unused) |
| MultiSelectionTrueFalse | 303 | **0** | multi-option | ARCHIVE (unused) |
| TwoSideMultipleSelectField | 140 | **0** | multi-select | ARCHIVE (unused) |

### Implementation Plan

**Phase 1 (5 min): Archive 3 unused components**
- `MultiSelectFieldWithSwitchButton.svelte` → `_archive/`
- `MultiSelectionTrueFalse.svelte` → `_archive/`
- `TwoSideMultipleSelectField.svelte` → `_archive/`

**Phase 2 (4 hrs): Create UnifiedSelect.svelte**
- Merge features from CustomSelect, NewSelect, ApplicantSelect, BooleanSelect
- Props: searchable, icon, helperText, labelHtml, keyboard shortcuts (Y/N for boolean)
- SelectField remains primary public interface (24 imports, no migration)
- Deprecate: DerivedSelect, NewSelect, SelectionCustom

**Phase 3 (1 hr): Update importers**
- ApplicantSelect (1 import) → migrate to UnifiedSelect
- DerivedSelect (6 imports) → point to SelectField
- NewSelect (4 imports) → point to SelectField

**Result:** 17 → 8 public components, 3 archived, 3 deprecated

---

## Item #6: Shared Question Banks

### Current State
- 39 active question bank files across 6 loan types
- 1 shared pattern exists: `caseIntakeQuestions.ts` (used by all 6)
- 6 question types duplicated across 2-6 loan types

### Consolidation Candidates

| Question Type | Duplicated In | Variance | Approach |
|---------------|---------------|----------|----------|
| **Location (property)** | Home, LAP, Plot | Home uses separate fields; LAP/Plot use compound | Factory: `getPropertyLocationPage(prefix)` |
| **Location (residence)** | Personal, Business, Professional | Personal uses individual; Business/Professional use compound | Factory: `getResidenceLocationPage(prefix)` |
| **Loan Purpose** | All 6 types | Different option sets per loan type | Factory: `getLoanPurposeQuestion(loanCategory)` → domain-specific options |
| **Loan Tenure** | All 6 types | Home has custom option; others hardcoded ranges | Factory: `getLoanTenureQuestion(maxTenure, allowCustom)` |
| **Loan Amount** | LAP, Plot, Personal, Business, Professional | Min/max differ by product | Factory: `getLoanAmountQuestion(min, max)` |
| **Assessment Status** | All 6 types | Already shared ✓ | Done (`caseIntakeQuestions.ts`) |

### Implementation Plan

Create new shared modules in `src/lib/config/schema/`:

1. **`locationQuestions.ts`** — property + residence location factories
2. **`loanRequirementQuestions.ts`** — purpose, tenure, amount factories

Each factory returns `RawSchemaQuestion` or `RawSchemaPage` following the `caseIntakeQuestions.ts` pattern.

**Risk:** MEDIUM — showWhen conditions may differ per loan type. Each factory must accept loan-type-specific overrides.

**Effort:** ~1 day (create factories + update 6× pages.ts to use them)

### Non-Consolidatable (Stay Separate)
- Property-specific questions (character, condition, legal, deal financials, BT)
- Entity-specific profiles (business, professional)
- Counterparty questions (home loan only)

---

## Item #8: Modal Consolidation (15→~10)

### Current State

| Modal | Lines | State Pattern | Uses | Action |
|-------|-------|---------------|------|--------|
| **Modal.svelte** | 104 | Prop-driven | **70** | KEEP (already the base) |
| WideModal | 123 | Prop-driven | 1 | MERGE → Modal with `size` prop |
| **ConfirmModal** | 131 | Store (dialogState) | **13** | KEEP |
| **InfoModal** | 143 | Store (modal) | **8** | KEEP (fix `{@html}` XSS risk) |
| **EmailOtpModal** | 82 | Store | **6** | KEEP |
| **ApplicantModal** | 59 | Prop-driven | **6** | KEEP |
| **RestoreApplicantModal** | 633 | Prop-driven | **6** | KEEP (too specialized) |
| **SessionResumeModal** | 240 | Prop-driven | **6** | KEEP |
| **MonthYearModal** | 564 | dialogState | 2 | KEEP (too specialized) |
| AgreeModal | 123 | Store (dialogState) | 2 | MERGE → ConfirmModal variant |
| ContradictionWarningModal | 202 | Wraps Modal | 2 | KEEP (uses Modal as base) |
| ModalTabs | 145 | Props | 2 | KEEP (not a modal — stepper UI) |
| EmailVerificationModal | 269 | Local state | 1 | KEEP |
| DemoRestrictionModal | 72 | Props | 1 | KEEP |
| NavigationChoiceModal | 189 | Landing state | 1 | KEEP |

### Implementation Plan

**Phase 1 (30 min): Merge WideModal into Modal**
- Add `size` prop to Modal.svelte: `'sm' | 'md' | 'lg' | 'xl'`
- Default: 'md' (current max-w-lg behavior)
- Update 1 importer to use `<Modal size="xl">`
- Archive WideModal.svelte

**Phase 2 (1 hr): Merge AgreeModal into ConfirmModal**
- Both use dialogState store
- ConfirmModal: 2 buttons (cancel + confirm)
- AgreeModal: 1 button (acknowledge)
- Add `singleButton` mode to ConfirmModal
- Update 2 importers

**Phase 3 (optional): Extract OtpInput component**
- Reusable 6-digit OTP input shared by EmailOtpModal + EmailVerificationModal
- ~50 lines extracted

**Result:** 15 → 12 components (3 merged/archived), plus cleaner OTP handling

### Do NOT Consolidate
- MonthYearModal (564 lines, complex date picker)
- RestoreApplicantModal (633 lines, carousel + matching)
- NavigationChoiceModal (landing-specific)
- SessionResumeModal (form-specific)

---

## Item #9: Lifecycle → Runes Migration

### Research Finding: NO WORK NEEDED

**All 30 components checked — zero uses of deprecated `beforeUpdate`/`afterUpdate` hooks.**

All components use only valid Svelte 5 patterns:
- `onMount` (still valid in Svelte 5 for browser-only initialization)
- `$effect` (runes)
- `$state`, `$derived` (runes)

**The review's concern was about `beforeUpdate`/`afterUpdate` which are truly deprecated. Since none exist in the codebase, this item is complete.**

### What Remains (Low Priority)
- 30 components still use `onMount` — this is valid but could theoretically be replaced with `$effect` in some cases
- Migration is optional and provides no functional benefit
- **Recommendation:** Skip. Only migrate when touching a component for other reasons.

---

## Priority Summary

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| #9 Lifecycle migration | **0** (none needed) | — | ✅ DONE |
| #8 Modal consolidation | 2 hrs | Low (WideModal + AgreeModal merge) | LOW |
| #5 Select consolidation Phase 1 | 5 min | Quick win (archive 3 unused) | **HIGH** |
| #5 Select consolidation Phase 2-3 | 5 hrs | Medium (17→8 components) | MEDIUM |
| #6 Shared question banks | 1 day | Medium (reduce duplication) | MEDIUM |
| #4 V1 vs V2 income assessor | 2 hrs | Medium (clear technical debt) | LAST |

---

*Generated: 2026-03-23 | Session 35 | Research by: Claude Code*
