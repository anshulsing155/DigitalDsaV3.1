# Code Review — 2026-03-20

**Scope:** 29 commits from `c554ba2d` to `77b5c65c` (Sessions 32–33: cascading warnings, multi-select exclusive options, authority filtering, applicant restoration redesign, professionalCategory lock, entity role sync, status column)
**Reviewer:** Automated daily review

---

## Commits Reviewed

| Hash | Summary |
|------|---------|
| `e325aed1` | Client-side dynamic warnings + scoped hasInputErrors across all 6 loan types |
| `9cb49e9c` | Docs: cascading intelligence and risk signals specification |
| `3384c2e3` | Home loan compliance cascading — NA doc filtering, exclusive None, dead case hiding |
| `721dbd0d` | Business loan cascading — GST/turnover validation, vintage/sector warnings |
| `b263334a` | Professional + personal loan cascading — qualification/vintage, CC/purpose warnings |
| `d915794d` | Multi-select auto-clear bug + exclusive option hiding |
| `5b7f8aa2` | Multi-select auto-clear bug in all 5 remaining pages + exclusive enforcement |
| `4e9e9aa3` | 3 flow simulation bugs — OC/CC BT path blocked, duplicate possession, mutation |
| `03da1ba4` | Type-safe exclusive options + stale multi-select cleanup across all 6 pages |
| `8a80b3ae` | Pass exclusive flag through optionResolver to client |
| `0e875dad` | Remove duplicate professionalCategory from professionalProfile page |
| `66fba412` | Sync primary applicant professionalCategory from loan-level answer |
| `678be1bf` | Primary applicant badge + locked profession display for professional loan |
| `4e51be91` | loanLevelProfCategory reads from applicationData.loanName |
| `6fb60d98` | Lock professionalCategory for primary applicant in AddApplicantProfessional |
| `0dfbc99b` | Filter authority options to selected city only |
| `892e71ce` | Show stored city/area value in CustomSelect while options are loading |
| `373ad070` | Validate area+pincode compatibility on restore after navigating back |
| `4eba9e12` | Add NBCC and DSIIDC to all Delhi sub-cities in authority data |
| `8e2a0fab` | Add Mumbai suburbs + MMR cities to authority data |
| `77485a44` | Expand authority data for major metros |
| `0415c2ec` | Add Status column to applicant table — OK/Pending badge |
| `be176e60` | Status column checks all visible required fields including onProperty/onEMI |
| `78bef16a` | Complete cascading intelligence warnings across all 6 loan types |
| `8ebc0008` | Restore adds directly to table instead of pre-filling form |
| `b42be865` | Lock professionalCategory for primary applicant with badge |
| `3779bb5f` | Sync director/partner roles when entity type changes |
| `c351664c` | professionalCategory shows warning instead of locking dropdown |
| `77b5c65c` | Single-applicant role warning only shows after onProperty/onEMI answered |

---

## Findings

### HIGH

**H1: `$derived` vs `$derived.by` misuse in ApplicantProfilePage (potential reactivity gap)**
- **File:** `src/lib/components/ApplicantProfilePage.svelte:39`
- `loanLevelProfCategory` is declared as `$derived(() => { ... })` which stores a *function reference*, not the computed value. It's then called as `loanLevelProfCategory()` at usage sites (lines 503, 660).
- **Why it matters:** `$derived(expr)` tracks dependencies in `expr`. Since `expr` is a function literal, there are zero reactive dependencies — Svelte will never re-evaluate it. The code works only because callers (`$effect`, template) are themselves reactive contexts that track the internal reads. But if `loanLevelProfCategory` were used in a non-reactive context (e.g., event handler), it would return stale data.
- **Risk:** Currently functional but fragile. A future developer calling `loanLevelProfCategory()` outside a reactive context will get stale results with no warning.
- **Fix:** Change to `$derived.by(() => { ... })` and use as a value (no `()` at call sites).

**H2: Secured `AddApplicant` still uses old restore pattern — inconsistent with unsecured redesign**
- **File:** `src/lib/components/AddApplicant.svelte:176-199`
- The three unsecured components (`AddApplicantPersonal`, `AddApplicantBusiness`, `AddApplicantProfessional`) were redesigned in `8ebc0008` so restore goes directly to the table and form resets. But the secured `AddApplicant.svelte` still uses the old pattern: it pulls restored data into the inline form and sets `editingIndex`.
- **Risk:** UX inconsistency between secured and unsecured loans. Secured loans still have the cancel/overwrite bugs that the redesign was meant to fix.
- **Fix:** Apply the same restoration redesign to `AddApplicant.svelte`.

**H3: Primary applicant detection uses `.find()` instead of index-based check**
- **File:** `src/lib/components/AddApplicantProfessional.svelte:388`
- `formState.applicants.find((a) => a.applicantType === 'Individual')` finds the first Individual, which in the company path could be a director/partner at index > 0 rather than the true primary applicant.
- **Risk:** Profession mismatch warning may fire against the wrong applicant.
- **Fix:** Use `formState.applicants[0]` and check both index 0 and `applicantType === 'Individual'`.

**H4: Hardcoded `'Professional Loan'` key in AddApplicantProfessional**
- **File:** `src/lib/components/AddApplicantProfessional.svelte:277-279`
- `loanAnswers = (ld?.['Professional Loan'] ?? {})` hardcodes the loan name string. `ApplicantProfilePage.svelte` correctly uses the dynamic `applicationData.loanName` approach — this was the exact bug fixed in commit `4e51be91`.
- **Risk:** Will break if loan name string ever changes.
- **Fix:** Use `formState.applicationData.loanName` to look up the key dynamically.

**H5: Warnings block Next button on home loan ONLY — inconsistent across 6 loan types**
- **File:** `src/routes/(app)/form/home-loan/+page.svelte:578-581`
- Home loan's `isNextEnabled` has `visibleQuestions.some((q) => getWarning(q) !== null)` which makes ALL warnings hard blockers. The other 5 loan types do NOT have this check — their warnings are display-only.
- **Why it matters:** BT EMI count (6-11 paid), property age+tenure, title chain "CURRENT_OK_PREV_MISSING", and "LOST_BY_LENDER" all block the user even though the warning text says "Some lenders may still process." The `FieldWarning` type in `formEngine.ts` documents warnings as "non-blocking" — home loan contradicts this.
- **Fix:** Either remove the warning-blocking check from home loan (match other 5 types), or add a `severity: 'blocking' | 'advisory'` field on warning conditions so the schema controls which warnings actually block Next.

**H6: Warning conditions are now sent to client — information leakage surface**
- **File:** `src/lib/server/formEngine/engine.ts:567-569`
- Warning JSON-Logic conditions are now passed through to the client via `clientQ.warning.condition`. These conditions expose the internal rule structure (field names, thresholds, business logic).
- **Why it matters:** While the schema is already partially visible client-side (showWhen conditions), warning conditions may reveal additional business rules that competitors could reverse-engineer (e.g., FOIR thresholds, tenure caps, minimum turnover requirements).
- **Mitigation (already in place):** Anti-scraping layers (8 layers per AD-14) partially protect this. The build-time XOR encoding covers `showWhen` but NOT `warning.condition`.
- **Recommendation:** Consider encoding `warning.condition` with the same XOR cipher used for `showWhen` in production builds. Not urgent — warnings are advisory, not gating rules.

### MEDIUM

**M1: Competing `$effect` writers on multi-select state + missing loop guard**
- **Files:** All 6 form pages (e.g., `home-loan/+page.svelte:790-807`) + `MultipleSelectField.svelte:80-91`
- Two reactive writers can modify the same multi-select value: (1) page-level auto-clear `$effect` removes items hidden by `showWhen`, (2) component-level `$effect` in `MultipleSelectField` removes exclusive items when non-exclusive coexist. If both fire in the same tick, the second write could overwrite the first.
- Additionally, the page-level `$effect` has a `lastClearedKeys` guard for radio/select but **no equivalent guard for multi-select**. The `cleaned.length !== currentVal.length` check prevents infinite loops in practice (second pass sees equal lengths), but the `$effect` always runs at least twice per cleanup due to new array references.
- **Risk:** Low-medium. Works in practice but fragile. Document constraint: **exclusive options must not have `showWhen` conditions** to avoid competing writers.
- **Hardening:** Add a generation counter or `lastClearedKeys`-style guard for multi-select keys.

**M2: `CustomSelect` fallback shows raw value as label when options are loading**
- **File:** `src/lib/components/CustomSelect.svelte:64`
- When options haven't loaded yet, the selected option falls back to `{ label: String(value), value }`. This shows the raw value (e.g., "mumbai_suburban") instead of a user-friendly label ("Mumbai Suburban").
- **Risk:** Momentary UX flash of internal values during navigation-back or restore. The correct label appears once options load.
- **Recommendation:** Show a loading placeholder (e.g., "Loading...") instead of the raw value.

**M3: `getApplicantStatus` only checks non-empty, not valid values**
- **File:** `src/lib/components/AddApplicant.svelte:1616-1631`
- The Status column shows "OK" if all visible required fields have non-empty values. It does NOT validate correctness (e.g., age = "abc" would show OK).
- **Risk:** Misleading "OK" badge for applicants with invalid but non-empty data.
- **Recommendation:** Reuse the existing validation functions (`validateIndividualField`) for accurate status.

**M4: `entityChangeWarning` auto-dismisses after 5 seconds with `setTimeout`**
- **File:** `src/lib/components/AddApplicantBusiness.svelte` (entityChangeWarning setTimeout)
- Uses `setTimeout(() => { entityChangeWarning = '' }, 5000)` without cleanup. If the component unmounts before 5s, the callback fires on a destroyed component.
- **Risk:** Svelte 5 may ignore stale writes (no crash), but it's technically a memory leak pattern.
- **Fix:** Clear the timeout in `onDestroy` or use a Svelte-idiomatic approach.

**M5: Duplicated `PROF_CATEGORY_LABELS` mapping**
- **Files:** `AddApplicantProfessional.svelte:105-114` and inline ternary chain in `ApplicantProfilePage.svelte:668-675`
- The professional category value→label mapping is defined twice: once as a proper object (`PROF_CATEGORY_LABELS`) and once as an inline ternary chain. They could drift out of sync.
- **Fix:** Extract to a shared constant in `$lib/config/` and import in both components.

**M6: Sole proprietor data loss on entity type switch (business loan)**
- **File:** `src/lib/components/AddApplicantBusiness.svelte:262-272`
- When user switches entity type, `formState.replaceApplicants([])` discards all applicants. For sole proprietor with filled form data, this is data loss with no recovery (no save to recovery bin before clear).
- **Risk:** User fills sole prop details, accidentally switches to "Partnership", loses all data.
- **Recommendation:** Save current applicants to recovery bin before clearing on entity type change.

**M7: Unused `previousNames` variable and `matchesByName` imports**
- **Files:** `AddApplicantPersonal.svelte:160` (`previousNames` Map declared but never used), `AddApplicantProfessional.svelte:33` and `AddApplicantPersonal.svelte:24` (`matchesByName` imported but never called)
- Dead code from prior detection implementation.

**M8: Client-side `evaluateWarning` lacks numeric coercion (server has it)**
- **File:** `src/lib/config/warningEngine.ts:32-34`
- Server-side `evaluateWarnings()` in `engine.ts` coerces `uiType === 'number'` and `type === 'currency'` values to actual numbers before JSON-Logic evaluation. The client-side `evaluateWarning()` passes raw string answers directly.
- **Affected:** `loanAmount > 5000000`, `remainingTenure > 60`, `btEmisPaid < 6`, `loanTenure > 1`, `mortgageYear > 10` — all compare string vs number.
- **Why it works (for now):** `json-logic-js` uses JavaScript coercion internally (`"60" > 5` is truthy in JS). But this is implicit and could break with library updates.
- **Fix:** Add numeric coercion in `evaluateWarning()` before calling `jsonLogic.apply()`, or pass question type info.

**M9: `{@html warning}` renders warning text as HTML — safe now but fragile**
- **Files:** `src/lib/components/RadioField.svelte:207`, `src/lib/components/ApplicantSelect.svelte:460`
- Warning strings are rendered with `{@html}` in at least two components. Currently safe because warning `then` strings are hardcoded in schema (developer-controlled). But if a future developer adds template interpolation (embedding user values in warning text), this becomes an XSS vector.
- **Recommendation:** Switch to plain `{warning}` rendering, or add a comment documenting that warning `then` strings must never include interpolated user input.

**M10: Business vintage warning — generic rule shadows construction-specific rule**
- **File:** `src/lib/config/businessLoan/questionBank/businessProfile.ts` (q3_businessVintage warning)
- Condition 1 matches `businessVintage === 'less_than_1'` (any sector). Condition 2 matches `businessVintage === 'less_than_1' AND businessIndustrySector === 'construction_realestate'`. Since `evaluateWarning()` returns the first match, the more-specific construction warning is dead code.
- **Fix:** Swap order — put the more-specific construction check first.

**M11: Authority code collisions — 13 codes map to different authorities across cities**
- **File:** `src/lib/server/formEngine/optionResolver.ts:402` (`extractAuthorityCode()`)
- The `^([A-Z]+)` regex extracts short codes like `BDA`, `JDA`, `GDA` etc. Multiple cities share the same code: BDA maps to 5 different authorities (Bihar, Bangalore, Bhopal, Bikaner, Bareilly), JDA to 4, GDA to 3, etc.
- **Why it's OK now:** Since `0dfbc99b` restricts options to the selected city, two colliding authorities never appear in the same dropdown. The stored value is unambiguous within the city context.
- **Risk (latent):** If authority codes are consumed downstream without city context (rule engine, PDF generation, API payloads), the stored `BDA` is ambiguous. Track this for any future feature that processes authority codes independently.
- **Future fix:** Store city-qualified codes (e.g., `BDA_BANGALORE`) or store both code and full label.

### LOW

**L1: Authority filtering removed state-level fallback — edge case for unlisted authorities**
- **File:** `src/lib/server/formEngine/optionResolver.ts:365-368`
- Previously, authorities from other cities in the same state were shown as fallback options. Now only the selected city's authorities appear, plus generic "Other" options.
- **Risk:** DSAs in smaller cities may not find their authority without using "Other". The comment says "User can select Other if their authority isn't listed" — this is correct but reduces discoverability.
- **Impact:** Low. The "Other" option exists, and the metro data expansions (Delhi suburbs, Mumbai MMR) cover the high-traffic cases.

**L2: `LocationGroup` restore effects don't guard against component unmount**
- **File:** `src/lib/components/LocationGroup.svelte:98-139`
- Two `$effect` blocks trigger async fetches (`fetchCities`, `fetchAreas`) without abort controllers. If the component unmounts mid-fetch, the `.then()` callbacks write to component state.
- **Risk:** Benign in Svelte 5 (stale writes are silently ignored), but fetch-abort is still better practice.

**L3: `hasInputErrors` checks both `q.id` and `q.bindsTo` — possible double-count**
- **Files:** All 6 form pages
- `inputErrorsState.get(q.id) || inputErrorsState.get(q.bindsTo)` — if errors are stored under both keys for the same question, the OR logic is fine (returns first truthy). But if different questions share a `bindsTo` key (possible in multi-applicant scenarios), an error from one question could block another.
- **Risk:** Very low — `bindsTo` keys are unique per page in practice.

---

## Security Assessment

| Area | Status | Notes |
|------|--------|-------|
| XSS | **Low risk** | `RadioField.svelte` and `ApplicantSelect.svelte` render warnings with `{@html}` (M9). Safe now (developer-authored strings), but fragile if user values are ever interpolated into warning text. |
| CSRF | **OK** | No new API endpoints added. All existing patterns use `secureFetch`. |
| Injection | **OK** | `evaluateWarning` uses `json-logic-js` which evaluates a fixed AST — no code execution from user data. |
| Data leakage | **Low risk** | Warning conditions now sent to client (H2). Business rule structure partially exposed. Anti-scraping layers mitigate. |
| Auth | **OK** | No changes to auth flow, guards, or permission checks. |
| PII | **OK** | No PII handling changes. Warning messages are developer-authored strings. |

---

## Architecture Assessment

| Pattern | Status | Notes |
|---------|--------|-------|
| Server-side-first | **Adjusted** | Warnings moved from server-only to client-side evaluation. This is a deliberate architectural shift for UX (instant reactivity). Server still evaluates as fallback. Acceptable trade-off. |
| Warning engine | **Good** | Clean separation: `warningEngine.ts` is a pure function with no side effects. JSON-Logic reuse from showWhen engine. |
| Exclusive options | **Good** | Well-implemented mutual exclusivity in `MultipleSelectField.svelte`. Both toggle (click handler) and reactive (`$effect`) paths are covered. |
| Restoration redesign | **Good** | Simpler flow: restore adds directly to table. Eliminates complex form-prefill state sync bugs from prior approach. |
| Prof category lock | **Good** | Primary applicant inherits from loan requirement; secondary applicants are independent. Warning-based approach (c351664c) is better UX than hard lock. |

---

## Summary

29 commits reviewed. **6 high-priority issues**, **11 medium issues**, and **3 low issues**. No blocking security vulnerabilities but one fragile XSS pattern (M9). The cascading warning system is well-architected overall, but has an important inconsistency: warnings block Next on home loan but not the other 5 types (H5). Authority data corrections (Kolkata HMC, Kozhikode KUDA) were critical data fixes.

**Recommended actions (priority order):**
1. **Fix H5** (warning-blocking inconsistency) — either remove from home loan or add `severity` field. This is the most user-impacting issue: DSAs get blocked by advisory warnings on home loans.
2. **Fix H1** (`$derived` → `$derived.by` for `loanLevelProfCategory`) — silent stale data risk
3. **Fix H4** (hardcoded `'Professional Loan'` key → dynamic `applicationData.loanName`)
4. **Fix H3** (primary applicant detection: `.find()` → index-based check)
5. **Fix M10** (swap business vintage warning condition order — dead code)
6. **Fix M8** (add numeric coercion to client-side `evaluateWarning`)
7. Apply restoration redesign to secured `AddApplicant.svelte` (H2)
8. Harden M1 (add loop guard for multi-select auto-clear; document exclusive+showWhen constraint)
9. Address M9 (`{@html warning}` — switch to plain text or add safety comment)
10. Extract shared `PROF_CATEGORY_LABELS` constant (M5)
11. Track M11 (authority code collisions) for any downstream consumption
12. Consider encoding warning conditions in production (H6 — can defer)
