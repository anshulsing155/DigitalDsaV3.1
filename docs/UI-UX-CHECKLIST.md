# DigitalDSA — UI/UX Standard Checklist

> **Purpose**: Mandatory checklist for every code change, code review, or new feature. Compiled from real user-reported issues across Sessions 17–23.
>
> **When to use**: Before committing ANY form, component, or page change.

---

## 1. Icons

| #   | Check                                           | Details                                                                                                                         |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | **All schema icons exist in `iconRegistry.ts`** | Every `uiMeta: { icon: 'Name' }` in question bank files must be present in `iconRegistry`. Grep question banks for `icon:` to verify. |
| 1.2 | **Kebab-case icons resolve correctly**          | `getIcon()` auto-converts `"calendar-clock"` to `"CalendarClock"`. Schema can use either format.                                |
| 1.3 | **Icons render on all question types**          | Verify icons appear in RadioField, SelectField, RadioIcon, and RadioCustom components.                                          |
| 1.4 | **Icon color changes on selection**             | Selected radio/option must show accent color (`--ddsa-accent-500` or white on colored bg). Unselected must show gray.           |
| 1.5 | **No broken/missing icon leaves blank gap**     | If `getIcon()` returns undefined, the icon slot must collapse gracefully (no empty div/space).                                  |

---

## 2. Form Questions — Visibility & showWhen

| #   | Check                                               | Details                                                                                                                                                               |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | **Progressive reveal works**                        | First question on a page shows immediately. Subsequent questions reveal only after their showWhen conditions are met.                                                 |
| 2.2 | **showWhen compares VALUES not LABELS**             | showWhen `"in"` conditions must use option VALUES (`"ORIGINAL_AVAILABLE"`) not LABELS (`"Original allotment letter available"`).                                      |
| 2.3 | **Empty/undefined fields hide dependents**          | `!= ""` correctly hides questions when the referenced field is undefined (via `isInvalid()` check in showWhenEngine).                                                 |
| 2.4 | **All questions on a page have showWhen coverage**  | First question: no showWhen (always visible). All subsequent questions: must have showWhen gating on a prior answer. Exceptions only for truly independent questions. |
| 2.5 | **Server returns ALL page questions with showWhen** | Verify `toClientQuestion()` includes `showWhen` (line 418 of engine.ts). Client `shouldShow()` is the sole visibility filter.                                         |
| 2.6 | **No server call on answer change**                 | `updateAnswer()` must NOT call `debouncedEvaluate()`. Server is called ONLY on Next/Previous navigation.                                                              |

---

## 3. Form Layout & Spacing

| #   | Check                                                        | Details                                                                                                                |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 3.1 | **Question container gap: `gap-6`**                          | The `{#each visibleQuestions}` wrapper must use `gap-6` (24px) for consistent spacing between questions.               |
| 3.2 | **No visible border, shadow, or background on form content** | Form content area: `rounded-xl px-2 py-4 md:p-6`. NO `border`, `shadow-md`, `bg-*`, or `backdrop-blur-md`.             |
| 3.3 | **Page title renders from `serverPage.pageTitle`**           | Page title at top of form area. No `{@html}` for user-controlled titles (XSS).                                         |
| 3.4 | **Mobile black header strip + FormLogo**                     | Mobile/native: `bg-black py-2 rounded-t-xl` strip with centered FormLogo. Desktop: FormLogo in top-right of title row. |

---

## 4. Loading & Transitions

| #   | Check                                               | Details                                                                                                                 |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **Loader is CSS ring spinner, NOT the brand logo**  | `FormStepContainer.svelte` uses `.spinner-ring` (36px border-radius circle). Never use the shield logo SVG as a loader. |
| 4.2 | **Loader uses theme color**                         | Spinner border uses `var(--ddsa-primary, #cb997e)`. Track ring uses 20% opacity of the same.                            |
| 4.3 | **Loader is viewport-centered**                     | `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 40;`                  |
| 4.4 | **Loader has no background**                        | Transparent overlay. No semi-opaque backdrop. `pointer-events: none` so user can still interact if needed.              |
| 4.5 | **Progress bar at top during evaluation**           | `.eval-indicator` at `top: 0; height: 2px; z-index: 50` with sliding gradient animation using `--ddsa-primary`.         |
| 4.6 | **City loading modal dismisses in `finally` block** | `showCityLoadingModal = false` must be in `finally` of `fetchDependentCityOptions()`, not dependent on evaluating flag. |

---

## 5. Auto-Scroll & Focus

| #   | Check                                                 | Details                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | **Smart auto-scroll on question reveal**              | When a showWhen reveals 1-3 new questions below the viewport, scroll _minimally_ (`window.scrollBy`) to bring the first off-screen one into view. Never snap to top/center — preserve questions above. Uses `createFormAutoScroll()` from `$lib/utils/formAutoScroll.ts`. |
| 5.2 | **Flow scroll to next unanswered question**           | When the user answers a question and the next unanswered one is below the fold, scroll just enough to reveal it. Same minimal scroll — don't push unanswered questions off the top.                                                                                       |
| 5.3 | **Pincode field retains focus on keystroke**          | No server call per-keystroke (Phase 2). `updateAnswer()` does NOT trigger `debouncedEvaluate()`.                                                                                                                                                                          |
| 5.4 | **Dropdown doesn't clip at viewport edge**            | `CustomSelect` dropdown opens upward if near bottom of viewport. No `navBarReserve` double-subtraction.                                                                                                                                                                   |
| 5.5 | **Sufficient space below last question for dropdown** | `mb-12` on question container ensures dropdowns on the last question don't get clipped by the nav bar.                                                                                                                                                                    |
| 5.6 | **No duplicate auto-scroll effects**                  | Each form must use the centralized `createFormAutoScroll()` utility. No inline `$effect` duplicates.                                                                                                                                                                      |

---

## 6. Next Button & Navigation

| #   | Check                                               | Details                                                                                                                                                          |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | **Next button enabled via client-side computation** | `isNextEnabled` computed from `visibleQuestions` (all required answered + no input errors + no pincode errors). NOT from `serverPage?.navigation?.pageComplete`. |
| 6.2 | **Server called only on Next/Previous**             | `evaluateOnServer(pageIndex)` fires via `$effect` when `currentPageIndex` changes. No per-answer calls.                                                          |
| 6.3 | **State-to-city option fetch is targeted**          | When state changes, call `/api/form/options` for the city question only. Show city loading modal during fetch.                                                   |

---

## 7. Schema Integrity

| #   | Check                                                    | Details                                                                                                                       |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | **Question bank is the single source of truth**          | All question definitions live in `src/lib/config/{loanType}/questionBank/`. The server `formEngine/schemas/` directory is archived — TS composition replaced JSON schemas. |
| 7.2 | **No duplicate bindsTo keys on same page**               | Each page must have unique `bindsTo_template` values. Run `node scripts/fix-duplicate-propertyType.cjs` pattern to verify.    |
| 7.3 | **showWhen references use field keys, not question IDs** | showWhen conditions reference `bindsTo_template` keys (e.g., `"propertyType"`), not question IDs (e.g., `"q3_propertyType"`). |
| 7.4 | **Required fields marked correctly**                     | Questions that gate other questions should be `required: true`. Optional follow-ups can be `required: false`.                 |

---

## 8. Data & Security

| #   | Check                                          | Details                                                                                                      |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 8.1 | **Use `secureFetch` not bare `fetch`**         | ALL dashboard/form API calls must use `secureFetch` (CSRF token included).                                   |
| 8.2 | **Use `parseJsonBody()` not `request.json()`** | Server API routes must use `parseJsonBody(request)` to prevent crashes on malformed JSON.                    |
| 8.3 | **Use `logger` not `console`**                 | All server-side logging via `$lib/server/logger`. Client-side `console.error` must be gated with `if (dev)`. |
| 8.4 | **No PII in system-generated content**         | Review PDF (v1) never contains customer name, PAN, Aadhaar, phone, or address.                               |
| 8.5 | **bindsTo keys used for answer storage**       | Answers stored at `answers[question.bindsTo]`, never at `answers[question.id]`.                              |

---

## 9. Modals & Overlays

| #   | Check                             | Details                                                                                                                                                        |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1 | **No duplicate modal rendering**  | Each modal (RestoreApplicant, AgreeModal, MonthYear, etc.) rendered ONCE in the component tree. Check for duplicates in both form pages and shared components. |
| 9.2 | **AgreeModal in form layout**     | FEMA/regulatory popups require `AgreeModal` mounted in `form/+layout.svelte`, not individual pages.                                                            |
| 9.3 | **MonthYearModal in form layout** | Rendered once at layout level. Components trigger via store flag, not direct rendering.                                                                        |

---

## 10. Cross-Loan Consistency

| #    | Check                                    | Details                                                                                                                                                  |
| ---- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | **Same fix applied to all 6 loan forms** | Any form page fix must be replicated across: home-loan, LAP, plot-loan, personal-loan, business-loan, professional-loan.                                 |
| 10.2 | **how-can-we-help page included**        | UI changes (borders, backgrounds, spacing) also apply to `how-can-we-help/+page.svelte`.                                                                 |
| 10.3 | **Wizard sections match schema pages**   | Every page `id` in the schema must have a matching entry in `wizardSections/{loanType}.ts`. Ghost sections (pages that no longer exist) must be removed. |

---

## 11. Conditional Content

| #    | Check                                                | Details                                                                                                          |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 11.1 | **Authority purchases skip compliance questions**    | Property condition/compliance questions hidden when `purchaseType == "direct_from_authority"`.                   |
| 11.2 | **Builder questions hidden for authority purchases** | Builder name, RERA, demand letter — all gated on `purchaseType != "direct_from_authority"`.                      |
| 11.3 | **BT/Top-up pages hidden for new loans**             | Pages with `showWhen: loanType in [BT, Top-up]` must not appear for "New Loan".                                  |
| 11.4 | **Lease period question only for "Lease Hold"**      | `leaseRemainingPeriod` gated on `propertyType == "Lease Hold"`.                                                  |
| 11.5 | **Construction page conditional for Plot loans**     | `constructionDetails_Plot` page visible only for "Plot and Construction Loan" or "Construction Only" loan types. |

---

## 12. Performance

| #    | Check                                                | Details                                                                             |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 12.1 | **No per-keystroke server calls**                    | Form answering is fully client-side. Server called only on page navigation.         |
| 12.2 | **Icon registry is tree-shaken**                     | Never `import * from 'lucide-svelte'`. Use `iconRegistry.ts` for all icon access.   |
| 12.3 | **Deterministic question shuffle is session-scoped** | Anti-scraping shuffle uses `sessionId + pageId` as seed. Same session = same order. |

---

## Quick Verification Commands

```bash
# Type check (must be 0 errors)
pnpm run check

# Icon coverage check (grep question banks for icon references)
grep -r "icon:" src/lib/config/*/questionBank/ | grep -oP "icon:\s*'(\w+)'" | sort -u

# Duplicate bindsTo check (grep for duplicate keys per page)
grep -r "bindsTo_template:" src/lib/config/*/questionBank/ | sort | uniq -d

# Unit tests
pnpm run test:unit
```

---

## Change Log

| Date       | Session | Items Added                                                       |
| ---------- | ------- | ----------------------------------------------------------------- |
| 2026-03-12 | 23      | Initial checklist — all 12 sections from Sessions 17–23 learnings |
