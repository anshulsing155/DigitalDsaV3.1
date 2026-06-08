# DigitalDSA — Critical Pitfalls

> **Catalog of 66 pitfalls** (extracted from `CLAUDE.md` §3 on 2026-05-16
> at 38 entries; grown organically since — file became too large to
> auto-load every session — see CLAUDE.md §17).
> Each entry: wrong example → right example → root cause → detection
> → grep recipe (which lives in `CLAUDE.md` §4).
>
> When a pitfall is no longer applicable, mark it
> `(verified obsolete YYYY-MM-DD)` rather than deleting — institutional
> memory is the point.

---

Each entry follows the same template: wrong example → right example → root cause → detection (session ID + symptom) → grep pattern. **When you add a pitfall, follow this template exactly.** When you suspect a pitfall is no longer applicable, mark it `(verified obsolete YYYY-MM-DD)` rather than deleting — institutional memory is the point.

### #1. `!=` in JSON-Logic is broken for null checks

`src/lib/server/formEngine/visibility.ts` overrides `!=` / `!==` with "unanswered = hide" semantics:
- `null != "anything"` → `false` (standard json-logic returns `true`)
- `undefined != "anything"` → `false`
- `"" != "anything"` → `false`

```ts
WRONG: { '!=': [{ var: 'unsetKey' }, true] }  // false when flag is unset — INVISIBLE!
RIGHT: { '!':  [{ var: 'unsetKey' }] }         // true when flag is unset/falsy
```

Use `!` for unset checks. `==`, `in`, `and`, `or`, `<`, `>`, `<=`, `>=` behave normally. **Last verified**: 2026-04-15.

### #2. Missing server→client field mapping → silent failures

The server explicitly picks which fields to pass through. A missing field is silently `undefined` on client — no error, no warning.

- New schema **option** field → `RawSchemaOption` → `toClientOption()` in `optionResolver.ts` → `ClientOption`
- New **question** field → `RawSchemaQuestion` → `toClientQuestion()` in `engine.ts` → `ClientQuestion`

**Never assume a schema field reaches the client automatically.** **Last verified**: 2026-04-20.

### #3. Rendering icon strings as components → full UI crash

Components (`StatCard`, `StatusCard`, `QuickActions`, `EmptyState`) accept both Lucide components AND string emojis via `icon: any`. Rendering a string as `<Icon size={18}/>` silently crashes the entire component tree — spinners stuck forever, no error logged.

```svelte
<!-- ALWAYS guard typeof -->
{#if typeof Icon === 'string'}
	<span>{Icon}</span>
{:else}
	<Icon size={18} />
{/if}
```

**Last verified**: 2026-06-05 (S226 — re-grepped per CLAUDE.md §17 6-month line; StatCard:50 / QuickActions:35 / EmptyState:32 all carry the `typeof Icon === 'string'` guard; StatusCard in `_archive/`; RendererInputField:268 uses inverse-guard variant. Pattern intact across all 4 originally-affected components.).

### #4. `fetch` at module scope → SSR failure

SvelteKit warns: "Avoid calling fetch eagerly during server-side rendering." Never call `fetch` / `secureFetch` at module top-level, in reactive declarations, or in store initialization. Always wrap in `onMount`, event handlers, or `load` functions. If a store needs initial API data, expose an `init()` called from `onMount`. **Last verified**: 2026-04-10.

### #5. Shared `bindsTo` keys — lock pattern

`loanRequirementPage` questions (e.g., `professionalCategory`) share `bindsTo` keys with applicant profile questions. The lock is implemented:

- Primary applicant: field `disabled` in `AddApplicantProfessional`, read-only badge in `ApplicantProfilePage`, `$effect` sync forces value to match loan-level answer
- Co-applicants: intentionally get independent profession selection (spouse of a doctor could be a CA)
- Pattern: hardcoded `isProfLockedByLoan` check (not via `disabledWhen` schema — works but not declarative)

**Last verified**: 2026-04-22.

### #6. Sandbox git locks on NTFS mounts (Cowork Linux sandbox only)

> **Scope:** Applies only when running in Cowork Linux sandbox writing to a Windows NTFS mount. Skip if you're on the Windows host directly or in a native Linux dev environment.

When the Cowork sandbox writes to a repo on NTFS, git's lock-file cleanup races against the mount's permission model. Symptoms: `fatal: Unable to create '.git/index.lock': File exists`, plus noisy `unable to unlink '.git/objects/...tmp_obj_...'` / `HEAD.lock` output. The sandbox cannot `rm` these locks (`Operation not permitted`).

Workaround — run before every git write that could re-enter a locked state:

```bash
mv .git/HEAD.lock  .git/HEAD.lock.stale-$(date +%s%N)  2>/dev/null || true
mv .git/index.lock .git/index.lock.stale-$(date +%s%N) 2>/dev/null || true
```

The `.stale-*` siblings accumulate but are benign; clean from Windows host occasionally. The sandbox also has no default git identity — use `git -c user.name='...' -c user.email='...' commit ...` inline. **Never** modify `.git/config`. **Last verified**: 2026-04-22 (S77e).

### #7. `engines.node` open-ended ranges → Vercel deploys highest major

Vercel reads `engines.node` from `package.json` and **picks the highest available Node version that satisfies the constraint**, then `engines.node` overrides the dashboard value. Burned us in S88: `"node": ">=22.0.0"` got deployed on Node 24, breaking gsap CommonJS interop in the SSR bundle (`/` returned 500 in production while `pnpm preview` rendered fine locally).

| `engines.node` | Vercel deploys |
| --- | --- |
| `"24.x"` / `">=20.0.0"` | latest **24.x** ❌ surprise |
| `"22.x"` / `"^22.0.0"` | latest **22.x** ✅ |
| `"20.x"` | latest **20.x** |

**Always pin to a specific major** (`"22.x"`, not `">=22.0.0"`). To verify the deployed runtime: log `process.version` from a request handler. `.nvmrc`, `engines.node`, and the Vercel dashboard "Node.js Version" are **three separate sources** — `engines.node` wins. Locally pin `.nvmrc` to the exact patch you've tested (e.g. `22.18.0`).

**Related — CJS packages that `require()` ESM-only transitive deps**: Vercel's adapter externalizes `node_modules` by default. When a CJS package `require()`s an ESM-only dependency, Node's CJS loader rejects it at runtime. Vite dev/preview always inlines, so the bug **never reproduces locally** — only on Vercel.

**General rule — after `pnpm install` / `pnpm update`**: if a new or updated dependency has CJS→ESM crossings in its transitive tree, add the entire chain to `ssr.noExternal` in `vite.config.ts`. Known instances:

| Package chain | Symptom | Added |
| --- | --- | --- |
| `gsap` (ESM source, no `type:"module"`) | `Cannot use import statement outside a module` | S88 |
| `gsap/dist/ScrollTrigger` (UMD, browser globals) | `ReferenceError: self is not defined` | S88c |
| `isomorphic-dompurify` → `jsdom` → `html-encoding-sniffer` → `@exodus/bytes` | `require() of ES Module encoding-lite.js not supported` | 2026-05-14 |

**Subpath gotcha** (S88c, commit `ca09dfe1`): `noExternal: ['gsap']` only matches the package name. Subpaths like `gsap/dist/ScrollTrigger` must be listed explicitly. Same rule applies to any subpath import of a CJS-wrapped UMD module.

**Detection**: after adding a dependency, run `pnpm build` and deploy to Vercel preview. If an SSR route 500s with `require() of ES Module` or `Cannot use import statement`, trace the chain and add all packages in it to `noExternal`. **Last verified**: 2026-05-14.

### #8. Returning a Capacitor proxy from an async function → `X.then() not implemented on web`

Capacitor plugin namespaces (`Preferences`, `Network`, `Filesystem`) are JavaScript Proxies that intercept every property access — including `.then`. JavaScript's `await` operator checks the resolved value for a `.then` method; if found, it treats the value as a thenable and recursively unwraps it.

```ts
// WRONG — await unwraps the Proxy by calling .then(), Capacitor errors
async function getPreferences() {
  const mod = await import('@capacitor/preferences');
  return mod.Preferences;  // ← Proxy
}
const Preferences = await getPreferences();  // throws "Preferences.then() is not implemented on web"

// RIGHT — wrap in a plain object envelope so .then is undefined
async function getPreferences() {
  const mod = await import('@capacitor/preferences');
  return { Preferences: mod.Preferences };
}
const { Preferences } = await getPreferences();  // ← clean
```

Symptom: client throws unhandled rejection on first plugin use → landing-page `ErrorBoundary` shows "Failed to load some content. Please refresh." Applies to **any Proxy-based API** awaited via async return. Canonical pattern: `src/lib/utils/capacitorPreferences.ts`. **Last verified**: 2026-04-23 (S94, commit `2ff2d747`).

### #9. `typeof window !== 'undefined'` SSR guard is broken in Vite 7

Vite 7 SSR exposes a **partial `window` object** — `typeof window === 'undefined'` returns `false` on the server, but `window.location`, `window.matchMedia`, and other browser APIs are `undefined`.

```ts
// WRONG — the guard passes but window.location is undefined in Vite 7 SSR
typeof window !== 'undefined' ? window.location.href : 'http://x'
// throws: Cannot read properties of undefined (reading 'href')

// RIGHT — SvelteKit's browser flag is Vite-aware and always reliable
import { browser } from '$app/environment';
browser ? window.location.href : 'http://x'

// RIGHT — for URL/search-params in templates, use the page store (SSR-safe)
import { page } from '$app/stores';
$page.url.searchParams.get('edit')
```

**Rule:** never use `typeof window` as a browser guard. Use `browser` from `$app/environment`, `$page.url`, or `onMount()`. Detected S95 (2026-04-25) — all 6 form pages crashed on SSR refresh. **Last verified**: 2026-04-25.

### #10. `state_referenced_locally` — reading reactive props inside `$state(...)` initializers

In Svelte 5, when you initialize `$state` with a value pulled from `$props()` or another reactive source, the rune captures that value **once at component creation** and never re-reads it.

```ts
let { data, initialQaRun } = $props();

// WRONG — captures only the initial value, freezes if parent re-passes
let statusFilter = $state(data.initialStatus);   // ⚠️ warning
let qaRun = $state(initialQaRun);                // ⚠️ warning
```

**Pattern A — `$derived` when the local value is a *view* of the prop.** Use for filter mirrors of URL state, page-data summaries, anything that should re-compute when the parent re-loads with new data.

```ts
let statusFilter = $derived(data.initialStatus);
```

You cannot assign to a `$derived` value — the source-of-truth is the prop. If you previously did `statusFilter = value` before calling `goto(...)`, drop the assignment; the URL change → load function → new `data` flows back through `$derived` automatically.

**Pattern B — `$state` + `// svelte-ignore state_referenced_locally` when the local value is *seeded* from the prop and then mutated locally.** Use for editor buffers, wizard state, OTP inputs.

```ts
// svelte-ignore state_referenced_locally
let qaRun = $state<QaRunSummary | null>(initialQaRun);
// svelte-ignore state_referenced_locally
let editorJson = $state(data.sectionsJson);  // ← needs the comment too
```

The svelte-ignore comment **only suppresses the immediately following statement** — repeat per line. **Always include a one-line comment above the suppression explaining why** so the next reviewer can tell intent vs laziness. Detected & cleared S96 (2026-05-02) — 30 warnings across 14 PMS / admin pages. **Last verified**: 2026-05-02.

### #11. Snapshot fixture drift after payload-shape changes

The factory test suite locks payload shape via JSON snapshots in `src/lib/testing/__tests__/factory/__snapshots__/*.pre-migration.json`. **Any change to the payload builder (`src/lib/utils/payloadBuilder/`) must regenerate these snapshots** — otherwise 16-34 FM-1 tests fail on `toEqual(snapshot)`.

Regeneration pattern (used in S95 / S96): write a temporary one-shot updater test under `__snapshots__/__updateSnapshots.test.ts` that:
1. Imports each journey from `src/lib/testing/journeys/`
2. Calls `toScenario(journey).payload`
3. Writes the result back to the matching `*.pre-migration.json` file (preserving `_comment`, `_source`, `_capturedAt`, `_shift_notes_*`)
4. Runs once via `pnpm test:unit -- --run __updateSnapshots`
5. Gets deleted before commit

Verify each diff is *only* the expected new/changed fields — accidentally regenerating everything to "match live" defeats the purpose of the snapshot lock. **Last verified**: 2026-05-02 (S96).

### #12. Auto-clear parity across all 6 form pages

When you add or modify a `multiple-select` / `radio` / `select` question with option-level `showWhen`, you must verify the auto-clear `$effect` runs in **all 6 loan form pages** (`home-loan/+page.svelte`, `lap/+page.svelte`, `plot-loan/+page.svelte`, `unsecure-loan/personal-loan/+page.svelte`, `unsecure-loan/business-loan/+page.svelte`, `unsecure-loan/professional-loan/+page.svelte`).

The shared engine is `src/lib/utils/formWizardEngine.ts` (`clearStaleOptionValues`, `getFilteredOptions`). Per-page `+page.svelte` files all wire it via the same `$effect` block — but extra page-specific clears (e.g., `key === 'loanType'` boundary clears, fix #4 in S96) live only in the page that needs them.

**Verification rule**: when fixing auto-clear in any one form page, grep the same `$effect` pattern in the other 5. If they don't match, decide whether parity is needed (usually yes) or page-specific behavior is intended (rare). **Last verified**: 2026-05-02 (S96).

### #13. `combinedAnswers` underscore-split aliasing collisions

`combinedAnswers` (used in `getDynamicGuidance`, `caseRouteData`, etc.) takes each answer key, splits on `_`, and creates a shorthand alias from the **last segment**. Two questions with different prefixes but the same suffix collide silently.

```
propertyStateName  →  alias: stateName
residenceStateName →  alias: stateName  ← collides
```

The most-recently-written wins. If a sidebar tip or case-route tracker reads `stateName` expecting one of these, it gets whichever loaded last. **Always use the full bindsTo key in lookups** (`propertyStateName`, not `stateName`). Aliases exist only as a backwards-compat convenience for shared widgets that don't know the prefix. **Last verified**: 2026-04-15.

### #14. Numeric questions must declare explicit `minLimit`

`isFieldAnswered(val, q)` in `formWizardEngine.ts` defaults `minLimit` to **1** for numeric fields (`uiType: 'number'` / `type: 'number'`) when the schema doesn't declare one. The default is correct for most cases (loan, salary, area, age) but **silently wrong** for count fields where 0 is a legitimate answer.

```ts
// WRONG — relies on implicit default of 1 → user typing 0 gets Next blocked
{ id: 'q3b_btEmisPaid', uiType: 'number', required: true, /* no minLimit */ }
// Brand-new BT applicant: "0 EMIs paid yet" → Next stays disabled, no
// error message explains why. Users get stuck.

// RIGHT — declare intent explicitly
{
  id: 'q3b_btEmisPaid',
  uiType: 'number',
  required: true,
  minLimit: 0,    // 0 is legit (fresh BT, no EMIs yet)
  maxLimit: 600,
}

// RIGHT — positive amount
{ uiType: 'number', minLimit: 1, maxLimit: 50000, ... }   // carpet area
{ uiType: 'number', minLimit: 5, maxLimit: 40, ... }      // loan tenure (years)
```

**Rule**: for any numeric question, set `minLimit` (and ideally `maxLimit`) explicitly. Use `0` only when 0 is a legitimate answer — counts (EMIs paid, dependents, late payments). Use `1` (or higher floor) for positive amounts.

**Enforcement**: `numericFieldsHaveExplicitLimits.test.ts` walks all 6 loan composers and fails CI if any numeric question is missing explicit `minLimit`. Caught the live latent bug on `q3b_btEmisPaid` during the 2026-05-04 audit.

**Last verified**: 2026-05-04.

### #15. `{@html}` directives must use `sanitizeHtml()`

Svelte auto-escapes `{expressions}` but `{@html ...}` raw-renders HTML. Any user-input data routed through `{@html}` is an XSS vector.

```svelte
<!-- WRONG — raw HTML rendering -->
{@html question.description}

<!-- RIGHT — wrap with the canonical sanitizer -->
{@html sanitizeHtml(question.description)}
```

**Approved unsanitized exceptions** (server/internal-controlled, do NOT add to this list without security review):
- `JsonLd.svelte` — structured JSON-LD `<script>` tag (escaped via `JSON.stringify`)
- `Toast.svelte` icon strings (internal SVG constants)
- Form `pageDescription` (server-controlled schema strings)
- Admin `policies/[artifact_id]/+page.svelte` — `a.human_readable` (admin-role only)

Everything else MUST use `sanitizeHtml()` from `$lib/utils/sanitizeHtml.ts`. The home-loan `question.description` was patched to comply on 2026-05-04 — it had been the only schema-data `{@html}` without sanitization across the 6 form pages.

**Last verified**: 2026-05-04.

### #16. Repurposed question — text override done in ONE place, drift everywhere else

When a question is repurposed (e.g. "applicant residence" → "loan processing branch city"), the override usually lands only on the question text. The page `title`, the default `description` (inherited from a shared factory like `buildResidenceLocationQuestion()`), and the wizard sidebar `dsaGuidance` are silently stale — different surfaces tell the user three different things.

Burned us on Personal Loan: page title still said "Residence Location", sidebar said "Loan Processing Location", and the question's description (inherited default) talked about "applicant currently resides" while the question itself asked "from which city do you want this loan to be processed?".

```ts
// WRONG — only the question text is overridden, everything else inherits the default
buildResidenceLocationQuestion({
  question: 'From which city do you want this loan to be processed?'
});
// page title still 'Residence Location'; description still says 'applicant currently resides'

// RIGHT — override question AND description; align page title + sidebar in parallel
buildResidenceLocationQuestion({
  question: 'From which city do you want this loan to be processed?',
  description: 'Pick the city where you want this loan processed — typically …'
});
// Also: pages.ts title, wizardSections sidebar title + dsaGuidance — all 4 surfaces
```

**Rule:** when you repurpose a question, change all 4 surfaces in lockstep — (1) question text, (2) question description, (3) page `title` in `pages.ts`, (4) wizard sidebar `title` + `dsaGuidance` in `wizardSections/*.ts`. The DC-flow sidebar in particular is a separate block from the Fresh-flow sidebar; both must match.

**Detection:** when you see a wording change, grep the bindsTo prefix (`propertyLocation`, `residenceLocation`, `businessLocation`) across `pages.ts`, `wizardSections/*.ts`, and the question-bank file — verify they agree.

```bash
# After repurposing a location/intake question
grep -rn "Residence Location\|Loan Processing Location\|Business Location" src/lib/config/
```

**Last verified**: 2026-05-14.

### #17. Floating popovers (dropdown / tooltip / autocomplete) inside scrollable modals get clipped

Any element with `position: absolute` rendered inside an ancestor that has `overflow: auto | hidden | clip` (modal body, sticky panel, dialog scroll region) gets clipped at that ancestor's edges. The CustomSelect dropdown was the first instance — burned us on the Existing Loans modal where the loan-type list options were visibly cropped at top and bottom.

```css
/* WRONG — position: absolute, gets clipped by Modal's overflow-y-auto body */
.custom-select-dropdown-wrapper {
  position: absolute;
  left: 0; right: 0;
  top: calc(100% + 0.5rem);
}

/* RIGHT — position: fixed with rect-derived left/top/width set inline;
   plus a scroll/resize listener (capture phase) to keep it anchored. */
.custom-select-dropdown-wrapper {
  position: fixed;
  /* left/top/width set inline from buttonRef.getBoundingClientRect() */
}
```

```ts
// On open, compute coordinates and listen for ancestor scroll/resize:
$effect(() => {
  if (!isOpen) return;
  const reposition = () => calculateDropdownPosition();
  window.addEventListener('scroll', reposition, true);   // capture catches nested scrollers
  window.addEventListener('resize', reposition);
  return () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
});
```

**Rule:** any floating UI rendered inside a modal/dialog/sticky region must use `position: fixed` with computed coordinates, NOT `position: absolute`. Canonical pattern: [CustomSelect.svelte](src/lib/components/CustomSelect.svelte). Same rule applies to DatePicker popovers, autocomplete dropdowns, tooltip arrows — any "escapes the parent box" UI.

**Detection:**

```bash
# Floating popovers using position:absolute
grep -rn "position:\s*absolute" src/lib/components/ | grep -iE "dropdown|popover|tooltip|menu|autocomplete"
```

**Last verified**: 2026-05-14.

### #18. Per-applicant validation that should be case-level (DC / BT / Top-up)

Debt Consolidation, Balance Transfer, and Top-up are **case-level** intents — the new loan refinances something that exists *somewhere* in the case, not necessarily on every applicant. But `computeSectionCompletion()` in [incomeTabState.ts](src/lib/utils/incomeTabState.ts) runs per-applicant and historically applied "at least one obligation with 'Close by this new loan'" per-applicant. In Joint(2) DC, a debt-free co-applicant was permanently blocked — the Done button stayed disabled forever because they had no debts to invent.

```ts
// WRONG — per-applicant check, blocks debt-free co-applicants in joint cases
if (isDcRoute) {
  const hasClosureByNewLoan = obligations.some(
    (o) => o.selectedToClose === 'Will be closed by Top-up amount'
  );
  result.obligations_details = hasClosureByNewLoan;
}

// RIGHT — case-level: this applicant OR any other applicant satisfies the rule
if (isDcRoute) {
  const hasClosureByNewLoan = obligations.some(...);
  const hasNoObligations = obligations.length === 0;
  result.obligations_details =
    hasClosureByNewLoan || (hasNoObligations && options?.caseHasDcClosure === true);
}
```

The case-level flag (`caseHasDcClosure`) is computed at the page-level Next-button check across `formState.applicants` and passed into each per-applicant call. See `incomeValueCheck` in `unsecure-loan/{personal,business,professional}-loan/+page.svelte` and `getCompletionOptionsFor()` in [IncomePageNew.svelte](src/lib/components/IncomePageNew.svelte:628).

**Rule:** any validation tied to "this case has X" — DC closure, BT loan declared on separate page, top-up source obligation — must be computed case-wide and passed into the per-applicant checker as an option. NEVER replicate a case-level requirement onto each applicant independently. Always test joint(2)+ flows when adding such a requirement.

**Detection:**

```bash
# Per-applicant completion checks that read loanVariant — ensure case-level flag is also passed
grep -rn "loanVariant" src/lib/utils/incomeTabState.ts src/routes/\(app\)/form/
```

**Last verified**: 2026-05-14.

### #19. Calendar-decorated text inputs with no picker — month/year questions must declare `uiType: 'monthYear'`

The 6 loan +page.svelte renderers route questions to the right input component by `type` + `uiType`. For month+year prompts (e.g. loan disbursement date, planned property-registration month), the **only** branch that wires a real picker (`DatePickerYearAndMonth`) is:

```svelte
{:else if question.type === 'text' && question.uiType === 'monthYear'}
  <DatePickerYearAndMonth … />
```

A plain `type: 'text'` question with a calendar icon + `YYYY-MM` placeholder falls through to the generic `TextField` branch — the calendar icon is purely decorative and tapping the field opens nothing. Users must hand-type "2026-06" with no validation, awful on mobile.

```ts
// WRONG — plain text, no picker, misleading calendar icon
{
  id: 'q7a_registryPlannedDate',
  type: 'text',
  uiMeta: { placeholder: 'YYYY-MM (e.g. 2026-06)', icon: 'calendar' },
  required: true,
  question: 'Planned registration month',
}

// RIGHT — opts into DatePickerYearAndMonth via uiType
{
  id: 'q7a_registryPlannedDate',
  type: 'text',
  uiType: 'monthYear',
  uiMeta: { placeholder: 'Select planned registration month', icon: 'calendar', minYear: 2026 },
  required: true,
  question: 'Planned registration month',
}
```

**Rule:** any schema question whose intent is "pick a month + year" MUST declare `uiType: 'monthYear'`. Canonical pattern: `q3_loanDisbursementDate` in [existingLoan.ts](src/lib/config/homeLoan/questionBank/existingLoan.ts). Don't rely on the calendar icon to communicate picker behavior — the icon is just decoration; the picker is wired by `uiType`.

**Enforcement:** [monthPickerWiring.test.ts](src/lib/testing/__tests__/monthPickerWiring.test.ts) walks all 6 composers and fails CI if any question whose placeholder/text/bindsTo suggests month+year intent is missing `uiType: 'monthYear'`.

**Last verified**: 2026-05-15.

### #20. Cross-loan applicant carryover — `formState.applicants` is global

`formState.applicants` is a SINGLE global store, NOT per-loan. Applicants from a prior loan persist when the user goes back to "How can we help" and picks a different loan type. Pre-S103 this manifested as:

- Plot Loan with an OPC Company → start Business Loan → pick Sole Proprietorship → the OPC company stayed visible in the new applicant list alongside the proprietor (Issue #4, 2026-05-15).
- Plot Loan with director "Kavita" → restore Kavita in Personal Loan → Kavita's auto-created `director_company` income entry rode along → `selectedIncomeProfiles` completion check (`incomeTabState.ts:218-225`) demanded it stay selected → Next disabled when user picked Salaried (Issue #3, 2026-05-15).

```ts
// WRONG — no cleanup on loan-type change; prior loan's applicants persist
if (question.id === 'q1_loanName') {
  selectedLoan = value as string;
  currentPageIndex = 0;
}

// RIGHT — migrate old applicants to recovery bin (for name-match restore in new loan)
// AND clear formState.applicants + relationships + income profile store
if (question.id === 'q1_loanName') {
  const previousLoan = selectedLoan;
  const newLoan = value as string;
  if (previousLoan && previousLoan !== newLoan) {
    migrateApplicantsToRecoveryOnLoanSwitch(previousLoan);
  }
  selectedLoan = newLoan;
  currentPageIndex = 0;
}
```

**Rule:** on every loan-type change, move existing applicants to the recovery bin (with their OLD loan's RecoveryScope) and clear `formState.applicants`, `clearAllRelationships()`, `incomeProfileStore.clearAll()`. The DSA can still restore by name on the new loan's Who's-Applying page — they're not lost, just decoupled. Helper: [`migrateApplicantsToRecoveryOnLoanSwitch`](src/lib/utils/loanTypeChangeCleanup.ts).

**Companion (defense in depth):** even with this cleanup, `syncAutoIncomeEntries` must orphan auto-created income entries whose parent Company is no longer in `applicants[]` (see Pitfall #22) — handles the case where a single Individual restores into a new loan with stale `linkedCompanyIds` pointing at companies that didn't carry over.

**Enforcement:** [loanTypeChangeCleanup.test.ts](src/lib/testing/__tests__/loanTypeChangeCleanup.test.ts) pins the scope mapping.

**Last verified**: 2026-05-15.

### #21. Cross-field validation fires on Next-click, NOT on every keystroke

Schema questions can carry `validation.condition` JSON-Logic rules that reference derived variables (e.g. `_maxPossibleEmis`, computed from `loanDisbursementDate`). These rules ONLY fire server-side (engine.ts `validatePage`). The client surfaces them via `serverPage.validationErrors` after a round-trip through `/api/form/evaluate`.

The original S103 bug was real: pre-S103, `debouncedEvaluate(pageIndex)` was defined in all 6 loan pages but never called, so cross-field rules silently let users advance with bad data — the error appeared only after Next-then-Back. The S103 fix wired `debouncedEvaluate` into `updateAnswerByKey` with a 300ms window. That over-corrected: every keystroke scheduled a server call, and on a brief pause mid-typing the server response clobbered in-progress input ("typing a digit then pausing reset the number"). S104 reverted the per-keystroke wiring entirely — the correct trigger is **Next-click only**.

Why Next-click is sufficient:
- **Field-level validation** (max/min, format, required, type) is client-side and instant via `getValidationErrorMessage` — the user sees those as they type.
- **Within-page progressive disclosure** (`showWhen`) is client-side via `deriveVisibleQuestions` → `shouldShowEncoded`, evaluated against the latest `formState.loanData` on every reactive read. No per-keystroke server call needed for disclosure.
- **Cross-field rules** (the only thing the server adds) only matter at page-transition time. The `await evaluateOnServer + await tick` flush in `onNext` validates the completed page, populates `serverPage.validationErrors`, and `isNextEnabled` blocks navigation if any error exists. User stays on the page until clean.

```ts
// WRONG — fire the server on every keystroke. 300ms windows clobber typing.
function updateAnswerByKey<T>(key: string, value: T): void {
  formState.replaceLoanData({ … });
  debouncedEvaluate(currentPageIndex);   // ← per-keystroke server call
}

// ALSO WRONG — even 1500ms windows just delay the same symptom (a typing
// pause longer than the window triggers a server response that re-renders
// the form on top of in-progress input).

// RIGHT — write to formState only. No server call from input.
function updateAnswerByKey<T>(key: string, value: T): void {
  formState.replaceLoanData({ … });
  // Per-keystroke server validation removed (S104). Cross-field rules
  // fire on Next-click via the await evaluateOnServer + tick flush.
}

// REQUIRED: isNextEnabled must check serverPage.validationErrors
let isNextEnabled = $derived.by(() => {
  // …existing checks…
  if (enabled && (serverPage?.validationErrors?.length ?? 0) > 0) {
    enabled = false;
  }
  return enabled;
});

// REQUIRED: onNext MUST flush + await fresh evaluation BEFORE navigating.
// This is the SOLE cross-field validation trigger after S104.
onNext={async () => {
  if (!onTellUs) {
    await evaluateOnServer(currentPageIndex);
    await tick();
    if (isNextEnabled) { goNext(); }
    …
  }
}}
```

**Rule:** every loan page's `updateAnswerByKey` MUST NOT call `debouncedEvaluate(...)` per-keystroke. `isNextEnabled` MUST consult `serverPage.validationErrors`. `onNext` MUST `await evaluateOnServer + await tick` before consulting `isNextEnabled`. Applicant-page subroutes (`onTellUs`) skip the flush since they have their own validation path. The `debouncedEvaluate` function may still exist for ad-hoc flush paths but must not be invoked from input handlers.

**Enforcement:** [loanPageValidationTiming.test.ts](src/lib/testing/__tests__/loanPageValidationTiming.test.ts) statically scans all 6 page sources. Post-S104, the contract is the **inverse** of the S103 era — the test asserts `updateAnswerByKey` does NOT call `debouncedEvaluate`.

**Last verified**: 2026-05-16.

### #22. Stale auto-created director income entries — orphan by Company-applicant existence, not just by linkedCompanyIds

`syncAutoIncomeEntries` orphans auto-entries when an Individual's `linkedCompanyIds` no longer contains the entry's `sourceCompanyId`. But cross-loan restore can leave the stale ID in `linkedCompanyIds` even when the Company applicant itself is gone from `formState.applicants`. The entry stays "active", and the income-profile completion check (`incomeTabState.ts:218-225`) forces the user's `selectedIncomeProfiles` to include `director_company`.

```ts
// WRONG — only checks linkedSet; leaves stale entries active when Company applicant is gone
if (entry.autoCreated && entry.sourceCompanyId && !linkedSet.has(entry.sourceCompanyId)) {
  // orphan
}

// RIGHT — also orphan when the Company applicant no longer exists in applicants[]
const companyExists = entry.sourceCompanyId
  ? applicants.some((a) => a.id === entry.sourceCompanyId && a.applicantType === 'Company')
  : false;
if (
  entry.autoCreated &&
  entry.sourceCompanyId &&
  (!linkedSet.has(entry.sourceCompanyId) || !companyExists)
) {
  // orphan — entry's parent is gone
}
```

**Rule:** auto-entries are valid only when BOTH (a) the parent's `linkedCompanyIds` still references the source company AND (b) the source company is still an active applicant. Either one missing = orphan. Symmetric with Pitfall #20 — Pitfall #20 prevents cross-loan carryover by clearing applicants on loan-switch; this Pitfall handles the case where a single applicant is restored cross-loan with stale references.

**Enforcement:** new test `orphans entries whose parent Company applicant no longer exists` in [directorAutoIncome.test.ts](src/lib/testing/__tests__/directorAutoIncome.test.ts).

**Last verified**: 2026-05-15.

### #23. Don't auto-derive `hasEquity` from a missing/zero ownership — leave it for the user to answer

`buildAutoSpecifics()` in [directorAutoIncome.ts](src/lib/utils/directorAutoIncome.ts) historically computed `hasEquity: ownershipPercent > 0` as part of the auto-created director income entry. `hasEquity` is in `AUTO_LOCKED_KEYS` — once set, the field locks read-only on the income card. When `ownershipPercent` is 0/missing (common on restore-after-delete where the recovered Company didn't match by UUID/name+entity, so `directorRestoreHandler` didn't restore ownership), this auto-derived false locked the question to "No, I am a professional / independent director" and hid all dependent questions (designation, shareholding %, activeInOperations, companyProfitable).

```ts
// WRONG — auto-derive even when ownership is 0/missing → locks field to "No"
const specifics: Record<string, unknown> = {
  registeredInIndia,
  companyType,
  shareholding: ownershipPercent,
  hasEquity: ownershipPercent > 0,   // ← false when ownership=0, locks question
  companySharesFinancials: true
};

// RIGHT — only auto-set when ownership is positively known. Otherwise leave
// hasEquity unset so the form ASKS the user (it's a required question).
const specifics: Record<string, unknown> = {
  registeredInIndia,
  companyType,
  shareholding: ownershipPercent,
  companySharesFinancials: true
};
if (ownershipPercent > 0) {
  specifics.hasEquity = true;
}
```

**Rule:** for keys in `AUTO_LOCKED_KEYS` whose value derives from input that may be missing on restore (most notably `ownershipPercent`), only auto-set when the source is positively known. Falling back to `false` on a missing source locks the field on a guessed wrong answer — worse UX than leaving the question unanswered for the user to fill.

**Enforcement:** updated test `hasEquity is left UNSET when ownership is 0/missing (so the form asks the user)` in [directorAutoIncome.test.ts](src/lib/testing/__tests__/directorAutoIncome.test.ts).

**Last verified**: 2026-05-15.

### #24. Deselecting an income profile must drop entries AND stash them for auto-restore on reselect

There are FIVE `handleProfileSelectionChange` implementations: one in each of the 3 secured loan pages (home/lap/plot), one in [IncomePageNew.svelte](src/lib/components/IncomePageNew.svelte) (multi-applicant), one in [unsecuredApplicantHandlers.ts](src/lib/utils/unsecuredApplicantHandlers.ts) (single-applicant Personal/Business/Professional).

Two requirements, both load-bearing:

1. **Drop on deselect** — when a profile is removed, its entries must not linger in `incomeEntries`. The submitted payload would otherwise carry data for profiles the user no longer claims, and downstream UI would surface entries the user doesn't expect to see. The Pitfall was introduced in S103 (Issue #6, 2026-05-15) — the unsecured-handlers version updated `selectedIncomeProfiles` but FAILED to filter `incomeEntries`.

2. **Auto-restore on reselect** — when a user deselects Salaried, fills new entries, then realizes the mistake and reselects Salaried within the same session, the original entries must come back. Pre-S104 the unsecured handler discarded outright (data loss); IncomePageNew rendered a "Restore?" banner that users routinely missed, and the secured pages had a component-local `stashedEntries` $state that worked but only survived component lifetime. S104 (Issue 2, 2026-05-16) made restore automatic across all five sites — deselect-reselect is overwhelmingly an "oops" correction, not a deliberate clear-and-refill.

```ts
// WRONG (pre-S103) — updates profiles but leaves stale entries
export function handleProfileSelectionChange(profiles): void {
  newList[APPLICANT_INDEX] = {
    ...newList[APPLICANT_INDEX],
    selectedIncomeProfiles: profiles,
    employmentType: deriveLegacyEmploymentType(profiles)
  };
  // ← incomeEntries left untouched
}

// PARTIAL FIX (S103) — drops entries but no restore path
const filteredEntries = existingEntries.filter((e) => profiles.includes(e.profileType));
newList[APPLICANT_INDEX] = { ...current, incomeEntries: filteredEntries, ... };
// ← user who reselects loses everything

// RIGHT (S104) — drop + stash + auto-restore
const stash = ((current as any)._stashedIncomeEntries ?? {}) as Record<string, IncomeSourceEntry[]>;
const removedProfiles = prevProfiles.filter((p) => !profiles.includes(p));
const addedProfiles = profiles.filter((p) => !prevProfiles.includes(p));
const newStash = { ...stash };

// Stash entries being removed
for (const r of removedProfiles) {
  const toStash = existingEntries.filter((e) => e.profileType === r);
  if (toStash.length > 0) newStash[r] = toStash;
}

// Drop from active list (Pitfall #24 part 1)
let updatedEntries = existingEntries.filter((e) => profiles.includes(e.profileType));

// Auto-restore stashed entries for re-added profiles (Pitfall #24 part 2)
for (const a of addedProfiles) {
  if (newStash[a]) {
    const existingIds = new Set(updatedEntries.map((e) => e.id));
    updatedEntries = [...updatedEntries, ...newStash[a].filter((e) => !existingIds.has(e.id))];
    delete newStash[a];
  }
}

newList[APPLICANT_INDEX] = {
  ...current,
  selectedIncomeProfiles: profiles,
  incomeEntries: updatedEntries,
  _stashedIncomeEntries: newStash
};
```

IncomePageNew uses `applicantDataStore.softDeleteProfileEntries` + `restoreProfileEntries` (sessionStorage-backed across remounts) instead of an applicant-level `_stashedIncomeEntries` field, but the user-facing behavior is identical. The 3 secured pages still use a component-local `stashedEntries` $state for the same purpose. All three patterns achieve drop-then-auto-restore.

**Rule:** every implementation of profile selection change MUST drop entries on deselect AND stash them for automatic restoration if the user reselects within the same session. Explicit "clear forever" is available via per-entry delete on the income table.

**Enforcement:** [unsecuredApplicantHandlers.test.ts](src/lib/testing/__tests__/unsecuredApplicantHandlers.test.ts) — pins both the drop behavior and the auto-restore cycle (including de-dup when an entry with the same id was added between deselect and reselect).

**Last verified**: 2026-05-16.

### #25. Modal-saved data must persist to formState immediately — never defer to Next-click

`handleDirectorSave` in [AddApplicantBusiness.svelte](src/lib/components/AddApplicantBusiness.svelte) and [AddApplicantProfessional.svelte](src/lib/components/AddApplicantProfessional.svelte) historically updated only the LOCAL component $state `directorForms`, deferring the `commitDirectorsToApplicants(...) + formState.replaceApplicants(...)` write to the Next-click validation block. So clicking Previous (which unmounts the component) lost the just-saved director data — on remount `initDirectorForms` read empty `company.directors` and fell back to "Director N" placeholders with `isComplete: false`, showing "Pending" in the summary table.

```ts
// WRONG — local-only update, lost on unmount
function handleDirectorSave(data: DirectorForm) {
  if (editingDirectorIdx === null) return;
  directorForms = directorForms.map((d, i) => (i === editingDirectorIdx ? data : d));
  editingDirectorIdx = null;
  directorModalOpen = false;
}

// RIGHT — local update + immediate persist to formState
function handleDirectorSave(data: DirectorForm) {
  if (editingDirectorIdx === null) return;
  const nextForms = directorForms.map((d, i) => (i === editingDirectorIdx ? data : d));
  directorForms = nextForms;
  editingDirectorIdx = null;
  directorModalOpen = false;
  // Persist immediately so a Previous-click doesn't lose the data.
  const company = formState.applicants.find((a) => a.applicantType === 'Company');
  if (!company?.id || !entityConfig) return;
  const newApplicants = commitDirectorsToApplicants(
    company.id as string,
    $state.snapshot(nextForms) as DirectorForm[],
    formState.applicants as Array<Record<string, unknown>>,
    ROLE_MAP[entityConfig.companyType ?? ''] ?? 'director'
  );
  formState.replaceApplicants(newApplicants);
}
```

**General principle:** any modal/dialog that captures user data MUST commit that data to the persistent store the moment Save is clicked — NOT deferred to a parent Next-click handler. Otherwise, any navigation that bypasses Next (Previous, sidebar jump, browser back) silently loses the data. The component's local state is by definition ephemeral.

**Enforcement:** [directorSavePersistence.test.ts](src/lib/testing/__tests__/directorSavePersistence.test.ts) — source-pattern test asserts both components' `handleDirectorSave` calls `commitDirectorsToApplicants` AND `formState.replaceApplicants`.

**Last verified**: 2026-05-15.

### #26. Disabled Next must always have a reason — surface validation gaps to the user

The 6 loan pages disable the Next button when the page's completion check fails — but the reason was historically computed only as a boolean (`incomeValueCheck`), never as a string. When the user filled an obligation in DC mode without picking "Close by this new loan" closure, the button silently disabled with no hint. Reported as Issue #8 (2026-05-15): "user must have some information why next is not enabled after first obligation gets entered".

```ts
// WRONG — disabledReason='' means the user sees a disabled button with NO hint
<FormNavigationBar
  nextDisabled={!incomeValueCheck}
  disabledReason={onApplicantPage ? applicantDisabledReason : ''}
/>

// RIGHT — compute a user-facing reason in parallel with the boolean gate
let obligationsDisabledReason = $derived.by(() => {
  if (currentPage?.id !== 'obligationsPage' || !isSingleApplicant) return '';
  const applicant = formState.applicants[0] ?? {};
  const loanVariant = combinedAnswers.loanType?.toString() ?? '';
  const caseHasDcClosure = formState.applicants.some(/* … */);
  return getObligationsDisabledReason(applicant, { loanVariant, caseHasDcClosure });
});
<FormNavigationBar
  nextDisabled={!incomeValueCheck}
  disabledReason={onApplicantPage ? applicantDisabledReason : obligationsDisabledReason}
/>
```

**Rule:** whenever a page disables Next based on a structured validation gate, write a reason-helper that mirrors the gate's logic and produces a user-facing string. The reason-helper and the boolean gate must stay in lockstep — when one changes, the other must change. Canonical reason-helper: [`getObligationsDisabledReason`](src/lib/utils/incomeTabState.ts) — mirrors the obligations_details branch of `computeSectionCompletion`.

**Enforcement:** [obligationsDisabledReason.test.ts](src/lib/testing/__tests__/obligationsDisabledReason.test.ts) — 12 cases covering DC + non-DC branches with the exact Issue #8 reproduction (obligation filled, wrong closure plan).

**Last verified**: 2026-05-15.

### #27. Telemetry spans must scrub PII before export — auto-instrumentation captures more than you think

OBS-2 (OpenTelemetry, S103) wires MongoDB + Undici auto-instrumentation so production traces show end-to-end latency. The catch: auto-instrumentation captures URL query strings, MongoDB filter documents, request/response headers, and full outbound-fetch URLs. In this app every one of those CAN carry PII — phone numbers in `/api/otp/<mobile>/...`, user IDs in MongoDB filters (`{_id: ObjectId(...)}`), session tokens in `cookie` / `set-cookie` headers, Bearer tokens in `authorization` headers.

If you just enable OTel and ship, the observability backend receives all of that. Compliance disaster.

```ts
// WRONG — auto-instrumentation defaults capture everything
import { NodeSDK } from '@opentelemetry/sdk-node';
const sdk = new NodeSDK({
  instrumentations: [
    new MongoDBInstrumentation({ enhancedDatabaseReporting: true }), // ← dumps query filters
    new UndiciInstrumentation() // ← captures full URL incl. path-embedded phone numbers
  ]
});

// RIGHT — disable enhanced reporting, and run every span through a scrubbing
// SpanProcessor BEFORE export. PII_ATTR_KEYS is the allowlist of redacted keys.
new MongoDBInstrumentation({ enhancedDatabaseReporting: false });
// SpanProcessor pipeline: scrubbingProcessor → BatchSpanProcessor → OTLPExporter
```

**Rule:** every SpanProcessor wired to an exporter MUST run through `buildScrubbingSpanProcessor` from [telemetry.ts](src/lib/server/telemetry.ts). The scrubber redacts known PII attribute keys (`user.id`, `user.email`, `user.mobileNumber`, `db.statement`, `db.mongodb.filter`, auth headers, `app.case_id`/`app.applicant_id`/`app.dsa_id`/`app.rm_id`) and redacts URLs containing phone numbers or `/otp/`/`/mobile/`/`/admins/` path fragments. Lender IDs, route templates, asset paths are LEFT ALONE — they're public business data, not PII.

Adding a new PII-bearing attribute? Add the key to `PII_ATTR_KEYS` in `telemetry.ts` AND add a test case to `obsTelemetryScrubbing.test.ts`. The test pins the contract: every key in `PII_ATTR_KEYS` has a corresponding assertion, every safe key has an "untouched" assertion.

**Enforcement:** [obsTelemetryScrubbing.test.ts](src/lib/testing/__tests__/obsTelemetryScrubbing.test.ts) — 8 cases covering identity keys, auth headers, MongoDB filters, URL-embedded phone numbers, route-template safety, application-domain IDs, and null-safety.

**Last verified**: 2026-05-15.

### #28. `@tanstack/svelte-query` v6 returns a reactive object — no `$`-prefix, no store

`@tanstack/svelte-query` v6 (the version pinned for PERF-3) dropped the v3-era store semantics. `createQuery(...)` returns a plain reactive OBJECT, not a Svelte store. Code copied from v3 tutorials that does `$artifactQuery.data` will fail with `Cannot use 'X' as a store. 'X' needs to be an object with a subscribe method on it.`

```svelte
<!-- WRONG — v3 store syntax -->
<script>
  const artifactQuery = createQuery(() => ({ queryKey: ['x'], queryFn: ... }));
  let a = $derived($artifactQuery.data);  // ← TypeError
</script>

<!-- RIGHT — access fields directly -->
<script>
  const artifactQuery = createQuery(() => ({ queryKey: ['x'], queryFn: ... }));
  let a = $derived(artifactQuery.data ?? data.artifact);
  let isLoading = $derived(artifactQuery.isFetching);
</script>
```

**Companion gotcha — query key capture (also Pitfall #10):** Query keys often capture an ID derived from `data.something._id` (where `data` is `$props()`). Svelte 5 flags this with `state_referenced_locally`. For URL-param-derived IDs this capture is correct (the URL can't change without a remount). Suppress with `// svelte-ignore state_referenced_locally` AND add a one-line comment explaining why.

```svelte
<script>
  let { data } = $props();
  // data.artifact._id is stable for this page's lifetime — URL param can't
  // change without navigation. Capture once at mount.
  // svelte-ignore state_referenced_locally
  const artifactQueryKey = ['admin-policy-artifact', data.artifact._id] as const;
</script>
```

**Rule:** when migrating a page to TanStack Query, follow `.claude/protocols/tanstack-query-migration.md` — it walks the before/after pattern with the pilot artifact-page migration from S103 as the reference.

**Enforcement:** No CI test yet (pinning component-level reactive behavior is hard without a Svelte testing harness). Pitfall documentation + protocol doc is the safety net for now.

**Last verified**: 2026-05-15.

### #29. Auto-entry display fields cached at create-time + locked at write-time = stale forever

Auto-created income entries (`autoCreated: true`, `sourceCompanyId` set) snapshot the parent Company's display fields into the entry at create-time, then **lock those fields at the IncomeSourceForm input level** so the DSA can't manually edit them (correct — they must stay coupled to the parent). The trap: `syncAutoIncomeEntries` has 5 reconcile passes for `specifics.*` keys (shareholding, type-mapping, registeredInIndia, hasEquity, designation, GST, profitability, CIN) but **none of them touch top-level entry fields like `entityName`**. AND the sync is only invoked from `commitDirectorsToApplicants` paths — never on a stand-alone parent-field edit.

Burned us 2026-05-15: user renamed a Company "Original" → "Original updated" in Applicant Details; every dependent director's Income Details modal kept showing "Original" forever. `entityName` field was locked (`disabled={isAutoEntry}` at [IncomeSourceForm.svelte:1005](src/lib/components/IncomeSourceForm.svelte:1005)) so no manual fix path either.

```ts
// WRONG — entry.entityName cached at create, never re-synced, locked from edits
export function createDirectorIncomeEntry(companyId, companyName, ...) {
  return {
    entityName: companyName,   // ← snapshot, never refreshed
    sourceCompanyId: companyId,
    ...
  };
}
// syncAutoIncomeEntries reconciles specifics.* but skips entityName → stays stale

// RIGHT — sync engine refreshes entityName from the parent's CURRENT name via
// sourceCompanyId (NOT name-match; id is the source of truth, name is display)
let updatedEntityName = entry.entityName;
const parent = applicants.find((a) => a.id === entry.sourceCompanyId);
const currentName = parent
  ? (((parent.companyName as string) || (parent.fullName as string)) ?? '').trim()
  : '';
if (currentName && currentName !== entry.entityName) {
  updatedEntityName = currentName;
  entryChanged = true;
}
// AND: trigger sync from updateApplicantField when key === 'companyName' / 'fullName'
// on a Company applicant — existing sync call sites only fire on director commits.
```

**Rule:** when an auto-entry caches a value from a parent that gets locked at the input level, ALL THREE of these must be true: (1) the sync engine re-derives the field from the parent on every pass, (2) at least one sync trigger fires whenever the parent's source field is edited (not just when downstream children change), (3) the parent is looked up by `sourceCompanyId` not by stale name-match. Missing any one of the three creates a "field permanently wrong, no way to fix" trap.

**Detection:** for any locked-on-auto field, ask: where does it come from on create? Does syncAutoIncomeEntries' reconcile pass include it? Is there a trigger on the parent-edit path?

**Enforcement:** [`directorAutoIncome.test.ts`](src/lib/testing/__tests__/directorAutoIncome.test.ts) — `entityName sync on Company rename` describe block pins the four cases (rename refreshes, no-op when names match, orphans stay frozen, `fullName` fallback).

**Last verified**: 2026-05-15.

### #30. Component-local `$state` for "already prompted" memory resets on remount

Form components held `let restoreAskedForKey: string | null = $state(null)` to suppress re-opening the restore-applicant modal for the same detection key. The trap: this state is COMPONENT-LOCAL — when the user clicks browser back (form page unmounts) → Next (remounts), the local state resets to `null` and the SAME detection key passes the suppression check, re-firing the modal even though the user had just dismissed it.

Burned us 2026-05-15: at Business-Loan Case Assessment the modal showed two cross-loan matches. User clicked browser-back → returned to "How Can We Help" → clicked Next → same modal re-appeared with same matches.

```ts
// WRONG — component-local; lost on remount
let restoreAskedForKey: string | null = $state(null);
// ... in detector ...
if (restoreAskedForKey === detectionKey) return null;  // ← skipped after remount
restoreAskedForKey = detectionKey;

// RIGHT — session-scoped store, sessionStorage-backed.
// Set of detection keys survives remount within the same tab session.
applicantState.markRestoreAsked(detectionKey);
// ... in detector ...
if (applicantState.hasRestoreAsked(detectionKey)) return null;
```

**Rule:** any "we already showed UI X for input Y in this session" memory MUST live on a session-scoped store (sessionStorage), not in component-local `$state`. Component state is by definition ephemeral; remount is a normal navigation event in SvelteKit, not an error condition. The persistence layer choice matters: sessionStorage (tab-scoped) is right for "already prompted in this tab" — restarting the browser legitimately re-arms detection.

**Detection:** any modal/popover/toast whose "don't show again for now" memory lives in a `let X: ... | null = $state(null)` or `let X = $state(...)` declaration inside a component is suspect. Promote to a store.

**Enforcement:** [`restoreAskedKeysPersistence.test.ts`](src/lib/testing/__tests__/restoreAskedKeysPersistence.test.ts) pins the contract.

**Last verified**: 2026-05-15.

### #31. Stored enum values become invalid when journey changes — without scrub the form silently passes Next

Cross-loan applicant restore can carry per-field enum values whose validity is JOURNEY-DEPENDENT. The most-burning instance: an obligation's `selectedToClose` set in a Personal-Loan DC flow (`'Will be closed by Top-up amount'`) survives restore into a Plot-Loan New journey — but the New journey's `getClosureOptionsFiltered` doesn't surface that option. Result: Saved Obligations chip renders a stale label, the form shows no option selected, the Next-disabled gate silently passes because it only checked "has value" not "value ∈ visible options".

Same class of bug applies to ANY journey-dependent enum: BT-specific fields after switching to Fresh, top-up amount after switching off Top-up, secured-vs-unsecured fields when switching families.

```ts
// WRONG — value carried verbatim across journeys
obligation.selectedToClose = 'Will be closed by Top-up amount'; // from prior DC journey
// New journey is "Plot Loan + New Loan" → option not visible
// Saved chip shows "Close (Top-up)" stale; Next stays enabled

// RIGHT — three-part defense:
//   1. Scrub stale values on cross-loan restore (clear → form re-asks).
//   2. UI chips show "⚠ Action needed" when stored value isn't currently visible.
//   3. Completion gate (Next button) requires value ∈ currently-visible options.
const scrubbed = scrubObligationsForJourney(active, journeyLoanVariant);
// ... rendering ...
{#if isClosureStale(entry)} ⚠ Action needed {:else} {shortClosure(...)} {/if}
// ... completion ...
const anyStale = obligations.some((o) => !isClosureValueValid(o.selectedToClose, ...));
if (anyStale) result.obligations_details = false;
```

**Rule:** when a stored enum value's validity depends on session/journey context, ALL THREE must be wired: (1) scrub on context-change/restore, (2) UI surfaces the stale state visually, (3) completion gate refuses stale values. Missing any one creates a "field permanently invalid, user can't tell why Next is disabled" or "field invalid but Next enabled" trap. Empty/unset is NOT invalid — only "has a value that isn't currently legal" is.

**Detection:** for each completion gate that checks "has value", ask: would a value from a DIFFERENT journey context pass this check while being meaningless in the current context? If yes, add the journey-validity check.

**Enforcement:** [`obligationClosureScrub.test.ts`](src/lib/testing/__tests__/obligationClosureScrub.test.ts) pins both the per-obligation validity check and the batch scrub semantics. Pre-flight grep below catches new closure-plan call sites missing the validity check.

**Last verified**: 2026-05-15.

### #32. Cross-type restore creates ghost applicants — guard ONLY on existingSlot type silently fails for push-new

`prefillApplicantRestore` had a defensive guard that refused restoring an Individual into a Company slot (or vice versa). The trap: the guard ONLY fired when `existingSlot.applicantType` was defined. For a push-new restore (`currentIndex === applicants.length`, no existing slot to inspect), `slotType` was `undefined` → guard's condition `slotType && restoredType && slotType !== restoredType` short-circuited → restored Individual got `newList.push(restoredEntry)`'d into a Company-form session as a ghost.

Burned us 2026-05-15: user filling Business-Loan OPC, system surfaced an Individual record by name, user clicked Restore, nothing visible appeared (field-key mismatch — Company form reads `companyName`, Individual data has `fullName`). User typed manually. On the next page, the ghost Individual showed up as a SEPARATE applicant alongside the manually-entered OPC.

Same class for cross-companyType: restoring a Pvt Ltd record into an OPC slot makes no DSA-comprehensible sense (different legal entities, different field shapes, downstream rule engine produces nonsense). The fix is symmetric — refuse mismatched companyTypes when both sides are Companies.

```ts
// WRONG — only checks the slot, silently passes push-new + cross-companyType
const slotType = existingSlot?.applicantType;
if (slotType && restoredType && slotType !== restoredType) { … refuse … }
// no companyType check; push-new case has slotType=undefined → no refusal

// RIGHT — caller passes slot type hints via restoreIntent (works even when
// applicants[currentIndex] doesn't exist yet). Guard checks both axes.
const slotType =
  (existingSlot?.applicantType as 'Individual' | 'Company' | undefined) ??
  restoreIntentState.slotApplicantType;
if (slotType && restoredType && slotType !== restoredType) { … refuse … }
if (slotType === 'Company' && restoredType === 'Company') {
  const slotCompanyType =
    ((existingSlot?.companyType as string | undefined) ??
      restoreIntentState.slotCompanyType ?? '').trim();
  const restoredCompanyType = ((restoredData.companyType as string | undefined) ?? '').trim();
  if (slotCompanyType && restoredCompanyType && slotCompanyType !== restoredCompanyType) {
    … refuse …
  }
}
```

Defense in depth pairs the guard with **upstream filtering** in the matcher: `filterCrossLoanMatches` now also filters by `currentCompanyType` so wrong-type matches don't surface in the first place. Both layers needed — the matcher reduces the chance of a wrong click, the guard kills the corruption if a wrong click happens anyway.

**Rule:** any Restore-style handler that writes into a typed slot MUST carry the slot's intended type via the intent payload, not just the slot's existing record. Push-new is a legitimate case but it has no slot to inspect — the type intent has to come from somewhere else (the caller).

**Detection:** look at every `restoreIntentState.set({ ... })` call site. If it doesn't pass `slotApplicantType` (and `slotCompanyType` for Companies), the guard can't fire on push-new restores.

**Enforcement:** [`restoreCrossTypeGuard.test.ts`](src/lib/testing/__tests__/restoreCrossTypeGuard.test.ts) covers the companyType sub-filter in the cross-loan matcher. Pre-flight grep catches `restoreIntentState.set` calls missing the type hint.

**Last verified**: 2026-05-15.

### #33. Plot Loan's `loanType` is the SCOPE, not the VARIANT — field-name overload across loan products  (verified obsolete 2026-05-31 — loan-field nomenclature rename closed the overload)

**Closed by the 2026-05-31 four-field nomenclature rename.** After the rename, every loan stores **scope** in `loanType` (consistent everywhere — Plot is no longer the exception) and **variant** in the new `loanVariant` field (Plot only). The dual-key fallback this pitfall warned about is no longer needed; consumers read `combinedAnswers.loanVariant` directly.

**Why it bit (historical, 2026-05-15):** three secured-loan `+page.svelte` files passed `loanVariant={combinedAnswers.loanType...}` to `ObligationCapture`. For Home Loan + LAP that worked because `loanType` carried the variant. For Plot Loan, `loanType` carried the **scope** and `PlotLoanActivity` carried the variant — so Plot-BT users missed the "Do NOT enter the BT loan here" banner that LAP-BT showed correctly.

**References:** [ADR-0020](adr/0020-loan-field-nomenclature.md) (four-field model decision), [`docs/specs/LOAN-FIELD-NOMENCLATURE.md`](specs/LOAN-FIELD-NOMENCLATURE.md) (full migration plan), commit `fc942743` and surrounding batches (`d969e1b5..fc942743`, 27 commits) shipped the rename.

**Last verified obsolete**: 2026-05-31.

### #34. BT applicant-structure validators that only check total count miss role-distribution drift

The `btMismatchWarning` derived in `applicantFormManager.svelte.ts` historically compared only `actualCount === btExpectedCount`. A user who declared `1 borrower + 0 co-applicants + 1 guarantor = 2 expected` could then add 2 applicants both as Co-Applicant Financial, and the form silently let them proceed — the count matched, no applicant was marked as Guarantor, the structure was logically inconsistent, validators didn't fire.

Burned us 2026-05-15 on the LAP-BT screenshot: user had `Guarantors: 1` in the structure stepper, but both applicants in the table below were Co-Applicant (Financial) with `On EMI = Yes, On Property = Yes`.

```ts
// WRONG — total count only; role distribution unchecked
if (actualCount !== btExpectedCount) return `Expected ${btExpectedCount}, got ${actualCount}`;
return '';

// RIGHT — also compare role distribution.
// Counts: declared (btCoApplicantCount, btGuarantorCount) vs actual classification.
if (actualCount === btExpectedCount) {
  const actualGuarantors = typed.filter((a) => isGuarantorApplicant(a)).length;
  if (actualGuarantors !== btGuarantorCount) {
    // surface specific message: "Edit one applicant's role to 'Guarantor'…"
  }
}
```

**Rule:** any validator that compares declared structure (counts of roles) against actual data MUST check the role distribution, not just totals. Two distinct mismatches need distinct messages so the DSA can fix the right thing:
- count mismatch → "Expected N, got M — add or remove applicant(s)"
- role mismatch → "Declared X guarantors, Y marked — edit role(s)"

The same class would apply to any future "declared X borrowers / co-applicants / guarantors / employees" structure.

**Enforcement:** [`btMismatchWarning.test.ts`](src/lib/testing/__tests__/btMismatchWarning.test.ts) pins the 8 cases including the exact LAP-BT screenshot reproduction. The warning logic was extracted to `computeBtRoleMismatchWarning` in [`applicantRoleValidation.ts`](src/lib/utils/applicantRoleValidation.ts) so it's pure-testable.

**Last verified**: 2026-05-15.

### #35. Restore modal mixed-list lets DSAs accidentally restore the wrong type

Pre-S104 the `RestoreApplicantModal` rendered all matches in one radio list with no visual segregation. At Case-Assessment time (before applicantType is known) cross-loan matches from BOTH People and Companies show up — burned us when image 1 of the user's screenshots showed `qw (One Person Company)` and `qwerty (Individual)` together with the same selected-radio styling. Field-key mismatch on the wrong-type Restore creates a ghost applicant (Pitfall #32).

```svelte
<!-- WRONG — single flat list, no visual section break -->
{#each matches as m, idx}
  <button class="match-card">...</button>
{/each}

<!-- RIGHT — sort by applicantType (stable, preserves same-scope→cross-loan within type),
     inject "People" / "Companies" section headers when both types are present. -->
{#each sortedMatches as m, idx}
  {@const mIsCompany = (m.data?.applicantType === 'Company')}
  {@const prevIsCompany = idx > 0 && (sortedMatches[idx-1].data?.applicantType === 'Company')}
  {#if showSectionHeaders && idx === 0 && !mIsCompany}
    <div class="section-header">People</div>
  {/if}
  {#if showSectionHeaders && mIsCompany && (idx === 0 || !prevIsCompany)}
    <div class="section-header">Companies</div>
  {/if}
  <button class="match-card">...</button>
{/each}
```

**Rule:** any multi-type chooser MUST visually segregate types. The user's mental model when filling an OPC slot is "I want a Company"; mixing People into the list invites mis-clicks. Defense-in-depth: the matching engine sub-filters by `applicantType` + `companyType` (Pitfall #32) so most wrong-type matches never reach the modal — but the UI separation handles the case where both types are legitimately present (Case-Assessment phase).

**Last verified**: 2026-05-15.

### #36. Restore modal must filter Individual matches by past-profile relevance for director slots

When DSA fills a Director slot via DirectorFormModal, the restore modal surfaces matches for the typed name. Without a profile-aware filter, a salaried-only "John" surfaces as a candidate director — but John has no past director / partner / business-owner profile, so restoring him into a director slot makes no sense and clutters the suggestion list.

```ts
// WRONG — every name-prefix match surfaces regardless of relevance
matches = recoveryBin.filter(m => m.fullName.startsWith(prefix));

// RIGHT — when restoreIntent.directorRestore is set, drop Individuals whose
// past profiles are all salaried/rental/freelance/etc. Companies and
// individuals with at least one business/director profile are kept.
const DIRECTOR_RELEVANT_PROFILES = new Set([
  'director_company',
  'business_partnership',
  'business_proprietorship',
  'professional_practice'
]);
function isMatchRelevantForDirectorSlot(m) {
  if (m.data.applicantType === 'Company') return true;
  const profiles = m.summary?.incomeSources?.map(s => s.profileType) ?? [];
  if (profiles.length === 0) return true;  // unknown — be permissive
  return profiles.some(p => DIRECTOR_RELEVANT_PROFILES.has(p));
}
```

**Rule:** when the restore target is a typed slot with semantic constraints (Director / Partner / Guarantor / etc.), the matcher OR modal must filter against the historical-profile relevance for that slot. The store flag `restoreIntent.directorRestore` already exists for this purpose; future slot types should add similar context.

**Last verified**: 2026-05-15.

### #37. Director restore — soft-warn when historical companies don't include the target

Even after filtering by past-profile relevance (#36), a match can still be wrong: John has a director_company profile but for Beta, not Acme. The modal now soft-warns when the match's historical linked companies don't include the current target.

```ts
function historicalCompanyOverlapWarning(m: MatchType): string {
  if (!isDirectorSlot || !directorSlotCompanyName) return '';
  const directorProfiles = m.summary?.incomeSources?.filter(s =>
    DIRECTOR_RELEVANT_PROFILES.has(s.profileType)) ?? [];
  if (directorProfiles.length === 0) return '';
  const matched = directorProfiles.some(s =>
    normalize(s.entityName) === directorSlotCompanyName);
  if (matched) return '';
  return `Past records show director of ${[…histNames…].join(', ')} — not ${target}. Confirm.`;
}
```

**Rule:** soft warnings, not hard blocks. A DSA may legitimately restore John when he's joined a NEW venture (Acme) after past records of Beta — refusing the restore would be wrong. The pink-styled `.historical-overlap-warning` chip gives the DSA the information; they decide.

**Last verified**: 2026-05-15.

### #38. Loan-scoped state must register with the switch chokepoint — partial cleanups guarantee stale-UI bleeds

`/form/how-can-we-help` originally called `migrateApplicantsToRecoveryOnLoanSwitch(prevLoan)` directly when the user changed loan type. That helper cleared three of ~seven globally-scoped loan-dependent stores (applicants, relationships, income profiles) and left the rest stale. Every leftover store became a future "wrong-loan UI bleeds into new loan" bug:

- `userFormConformationState` — page completion flags from the prior loan survived, breaking sidebar progress indicators.
- `applicantState.restoreAskedKeys` / `deniedRecoveryUUIDs` — UI memory caused stale "already prompted" suppression on the new loan.
- `formState.applicationData` — cross-loan answers (applicantCount, isCoApplicant flags) bled through.
- Obligation `selectedToClose` — per-applicant enums kept prior-journey values (covered separately by Pitfall #31).
- Plus the Noteworthy banner, structure-question option-level showWhen, and the resume modal all reading off the global `formState.loanData` map without a corresponding scrub.

The structural problem: there's no single function that owns "the loan-type transition." Each consumer file independently chose what to clear, and the union of those choices was always a strict subset of what *needed* to be cleared.

```ts
// WRONG — direct cleanup call from the consumer, knows about only the
// stores its author happened to remember
if (previousLoan && previousLoan !== newLoan) {
  migrateApplicantsToRecoveryOnLoanSwitch(previousLoan);
}
// Caller code continues. userFormConformationState, askedKeys, applicationData
// are silently stale. Six months later, a new store is added without anyone
// remembering to register it here.

// RIGHT — the orchestrator + registry pattern. Every loan-scoped store is
// registered once with dump/clear/restore callbacks. switchLoanType iterates
// the registry; adding a new store later is a one-line addition that's
// impossible to forget across N consumer files.
import { switchLoanType, hasMeaningfulPriorData } from '$lib/utils/loanSwitchOrchestrator.svelte';

if (previousLoan && previousLoan !== newLoan) {
  if (hasMeaningfulPriorData(previousLoan)) {
    // Show confirmation modal; on confirm, call switchLoanType(prev, new).
  } else {
    switchLoanType(previousLoan, newLoan);
  }
}
```

The chokepoint also enables two UX guarantees that piecemeal cleanups can't:
1. **Wholesale undo** — `lastSwitchUndo` captures the pre-switch state; the post-switch modal's "Go Back" rolls everything back atomically.
2. **Per-loan parking** — non-applicant state of the prior loan parks into `loanParkingState.parkedLoans[prevLoan]` for resume via the picker's "Saved work" strip. Applicants ride the existing recovery-bin pathway (cross-loan name-matching).

Pairs with the **runtime route guard** on every form page (`assertLoanRoute(expectedLoan)` in onMount): if a hard refresh / direct URL lands on `/form/plot-loan` with `formState.loanData.loanName !== 'Plot Loan'`, the page refuses to render and routes back to the picker.

**Rule:** any new global store that holds loan-scoped data MUST register with `loanSwitchRegistry` in the orchestrator. Three callbacks: `dumpForPark()`, `clearForLoanSwitch()`, `restoreFromPark(blob)`. The registry is intentionally minimal — owners are responsible for snapshot/restore semantics that make sense for their store. Owners that can be cleanly recomputed (e.g., income profile cache) can use `null` for dump and a no-op for restore.

**Detection:** when introducing a new global store that's logically scoped to the active loan, ask: "if the user changes loan type, should this be wiped?" If yes, register it. The §4 grep recipe catches new global stores via `applicantState\|formState\|...Store` pattern; pair with manual audit of the orchestrator's registration block.

**Enforcement:** [`loanSwitchOrchestrator.test.ts`](src/lib/testing/__tests__/loanSwitchOrchestrator.test.ts) pins clear / park / undo / resume behavior end-to-end across all currently-registered owners. New stores added to the registry get tested by adding their assertion to the existing describe blocks.

**Last verified**: 2026-05-16.

### #39. ConfirmModal dismissal paths must invoke `onCancel`

[`ConfirmModal.svelte`](src/lib/components/ConfirmModal.svelte) is dismissable five ways: explicit Confirm button, explicit Cancel button, X close-icon, Escape key, backdrop click (plus native `<dialog>` close events). Pre-S104 only the explicit Confirm and Cancel button paths invoked their respective callbacks; the X / Escape / backdrop paths simply closed the modal without firing anything.

This was fine for most modals (Cancel and dismiss were semantically equivalent — both meant "user backed out"). But it silently broke any caller that passed `cancelLabel: null` — the FEMA "Foreign Country" notice was the canonical example. With no Cancel button rendered, the only way to fire the supplied `onCancel: resetToIndia` callback was the (hidden) Cancel button. Pressing Escape or clicking backdrop closed the dialog and left `registrationCountry` stuck on "Foreign Country" — exactly the bug the original fix attempted to address.

```ts
// WRONG — split logic, only Cancel button fires onCancel
function handleClose() { dialogState.closeConfirmModal(); }                       // X / Escape / backdrop
function handleCancel() { onCancel?.(); dialogState.closeConfirmModal(); }        // Cancel button
// Result: cancelLabel:null modals have NO path to fire onCancel.

// RIGHT — single canonical dismiss method on dialogState; every non-confirm
// path routes through it. Idempotent against re-entry from native close event.
dismissConfirmModal(): void {
  if (!this.confirmModal.open) return;
  this.confirmModal.onCancel?.();
  this.closeConfirmModal();
}
```

In the component, wire ALL dismissal paths to the canonical method:

```svelte
<dialog
  onclose={() => dialogState.dismissConfirmModal()}
  onclick={(e) => { if (e.target === dialog) dialogState.dismissConfirmModal(); }}
  onkeydown={(e) => { if (e.key === 'Escape') dialogState.dismissConfirmModal(); }}
>
  <button onclick={() => dialogState.dismissConfirmModal()} aria-label="Close">  <!-- X -->
  <button onclick={() => dialogState.dismissConfirmModal()}>{cancelLabel}</button>  <!-- Cancel -->
  <button onclick={handleConfirm}>{confirmLabel}</button>
```

`handleConfirm` keeps its existing shape (call `onConfirm`, then `closeConfirmModal`). The native `close` event will then fire `dismissConfirmModal`, but the idempotency guard (`!this.confirmModal.open`) makes it a no-op — onCancel does NOT double-fire after Confirm.

**Detection:** any new "you cannot proceed with this value" notice that opens a confirm modal with `cancelLabel: null` and an `onCancel: revertValue` callback. Trace the dismissal paths — if pressing Escape / clicking backdrop doesn't invoke the revert, the bug recurs.

**Enforcement:** [`confirmModalDismissal.test.ts`](src/lib/testing/__tests__/confirmModalDismissal.test.ts) pins six scenarios: onCancel fires on dismiss, idempotency, no-onCancel close-safety, no-double-fire after Confirm, FEMA-style cancelLabel:null reverts value, and repeated open/dismiss cycles. The grep in `CLAUDE.md` §4 catches any new component-level `handleClose` or direct `closeConfirmModal` call that bypasses `dismissConfirmModal`.

**Update 2026-05-18 — sixth dismissal path: SvelteKit route change.** A team member reported the FEMA modal stayed visible after pressing the browser back button. The five DOM-level dismissal paths above (X / Escape / backdrop / native close + Cancel button) only fire from events on the modal itself. SvelteKit client-side route changes don't trigger any of them, but `dialogState.confirmModal` is a module-level singleton that persists across navigations — the modal element from the previous route stays mounted (because `(app)/+layout.svelte` and `dashboard/+layout.svelte` survive within-section nav) with its `open` flag still true. Fix: each layout-mounted modal subscribes to `afterNavigate` from `$app/navigation` and clears its state on every navigation completion. ConfirmModal calls `dialogState.dismissConfirmModal()` (so the FEMA `onCancel: resetToIndia` runs); SameCompanyPromptModal nulls `dialogState.sameCompanyPrompt` directly (because its `onDeny` callback may reference a parent component already mid-unmount); InfoModal calls `closeModal()` (no callback to invoke). `afterNavigate` runs both on mount and on every subsequent navigation while the component is alive — idempotent by design, so navigations during which no modal was open are safe no-ops via the `dismissConfirmModal` guard or the truthy check.

**Detection (Update):** any new modal that reads from a module-level state singleton (whether `dialogState`, a Svelte store, or a `$state` exported from a `.svelte.ts` module) and renders via a layout-mount must subscribe to `afterNavigate` and clear its slot. Verify with a manual back-button test: open the modal, navigate to a sibling route under the same layout, confirm the modal is gone.

**Last verified**: 2026-05-18.

---

### #40. PendingRestoreBanner Cancel must resync component buffers — formState rewind alone is silent on local copies

The 2-phase applicant restore writes pre-filled identity data to `formState.applicants[currentIndex]` in Phase 1 ([`prefillApplicantRestore`](src/lib/utils/applicantRestoreHandler.ts)), then shows a [`PendingRestoreBanner`](src/lib/components/PendingRestoreBanner.svelte) asking the DSA to confirm or cancel before income/obligations/CIBIL load. Cancel calls [`cancelApplicantRestore`](src/lib/utils/applicantRestoreHandler.ts) which correctly rewinds `formState.applicants` back to the user's previous slot.

But [`AddApplicantBusiness.svelte`](src/lib/components/AddApplicantBusiness.svelte) — uniquely among the 6 form pages — binds its Sole-Prop **inline Proprietor form** to a LOCAL `formApplicant` buffer, not to `formState.applicants` directly. A dedicated `$effect` copies the slot INTO that buffer when the restore modal closes after a confirm (so the freshly restored values appear in the form). Cancel never told the buffer to refresh, so the DSA saw rewound `formState` but UI fields still displaying qwerty/Male/78/Single. A subsequent Next-click silently re-persisted them — Cancel was a no-op for the visible UI.

```svelte
<!-- WRONG — local buffer only resyncs on confirm -->
$effect(() => {
  const isOpen = restoreIntentState.open;
  if (wasRestoreOpen && !isOpen) {
    if (isSoleProp && restoreIntentState.wasConfirmed) {
      formApplicant = { ...formState.applicants[restoreIntentState.confirmedIndex!] };
    } else {
      resetIndividualForm();
    }
  }
  wasRestoreOpen = isOpen;
});
// PendingRestoreBanner Cancel rewinds formState but never reaches this effect.
```

```svelte
<!-- RIGHT — separate $effect subscribes to a cancelledAt counter bumped by
     cancelApplicantRestore. The buffer resyncs from the rewound slot, OR
     resets when the slot was removed (previousSlot had no user data). -->
let lastCancelledAt = $state(0);
$effect(() => {
  const tick = restoreIntentState.cancelledAt;
  if (tick === lastCancelledAt) return;
  lastCancelledAt = tick;
  if (!isSoleProp) return;
  const idx = restoreIntentState.cancelledIndex;
  const slot =
    idx !== undefined && idx < formState.applicants.length
      ? formState.applicants[idx]
      : formState.applicants.find((a) => a.applicantType === 'Individual');
  if (slot && slot.applicantType === 'Individual') {
    formApplicant = { ...slot };
    formErrors = {};
    hasTriedToAdd = false;
  } else {
    resetIndividualForm();
  }
  restoreIntentState.clearCancelled();
});
```

The cross-component bridge mirrors the existing `wasConfirmed` mechanism: `cancelApplicantRestore` calls `restoreIntentState.markCancelled(currentIndex)`, which bumps `cancelledAt` (monotonic counter) and sets `cancelledIndex`. Subscribers diff the counter against a local cached value to detect a fresh signal; calling `clearCancelled()` resets `cancelledIndex` but NOT `cancelledAt` (monotonicity matters so a subsequent bump always looks fresh).

**Why only this one page is vulnerable:**
- **Business Loan / Sole Prop** — only path where a single inline form is the entire applicant, hence the local buffer.
- **Personal / Professional** — `AddApplicant{Personal,Professional}` always call `resetForm()` on modal close (confirm or cancel); the multi-applicant table reads `formState.applicants` directly. No buffer.
- **Home / LAP / Plot** — render directly from a multi-applicant table off `formState.applicants`. No buffer.

**Detection:** any new inline-form component that:
1. Holds a local `$state` buffer copied from `formState.applicants[idx]`, AND
2. Subscribes to `restoreIntentState.wasConfirmed` to populate that buffer on confirm,

must also subscribe to `restoreIntentState.cancelledAt` to keep the buffer in sync on cancel. The pairing is what makes Cancel actually undo the prefill end-to-end.

**Enforcement:** [`applicantRestoreCancel.test.ts`](src/lib/testing/__tests__/applicantRestoreCancel.test.ts) pins four scenarios: revert-to-previousSlot when the user had typed data, slot-removal when previousSlot was empty, monotonic counter bumping across multiple cycles, and `clearCancelled()` semantics. Plus a source-pattern check on `AddApplicantBusiness.svelte` for `restoreIntentState.cancelledAt` + `clearCancelled` references.

**Last verified**: 2026-05-18.

### #41. Loan variant change must reset the per-loan page index — saved index from prior variant points at a semantically different page in the new variant

The per-loan saved page index (`businessLoanPageIndex`, `personalLoanPageIndex`, etc.) is keyed by **loan name** ("Business Loan - Unsecured"), not by **variant** (`loanType` ∈ New Loan / Debt Consolidation / DC+Extra / Balance Transfer / BT+Top-up; `PlotLoanActivity` for Plot; `unSecureLoanType` Term Loan / OD-CC). Each variant produces a different visible-page set on the form route — DC drops the New-Loan obligation Yes/No question and replaces it with an entries-table page; OD-CC moves credit-limit fields earlier; BT routes through a different existing-loan capture page. The page **indices** therefore mean different things across variants.

When the user fills New Loan up to (say) the Obligations page at index 7, navigates away, then returns to the picker and changes `loanType` from "New Loan" to "Debt Consolidation", today's code mutates the answer in place — `businessLoanPageIndex` stays at 7. On the next visit to `/form/unsecure-loan/business-loan`, `SessionResumeModal` offers "Continue Where I Left Off"; accepting lands the user on DC's page 7, which is a **different** page than the one they left. From there, a Previous click hops them to DC's page 6, which they perceive as the "Obligations page" — but it's blank because their original "No, No" answers belong to a question that no longer renders in DC's flow. Reads as "data missing"; actual cause is a stale resume cursor.

```ts
// WRONG — variant mutates in place, page index stays at the prior variant's value
function updateAnswer(question, value) {
  const key = resolveBindsTo(question, currentAnswers, selectedLoan);
  updateAnswerByKey(key, value);
  // ← no page-index reset; businessLoanPageIndex remains 7 even though
  //   page 7 in DC is a different page than page 7 was in New Loan.
}
```

```ts
// RIGHT — detect change to a variant-shaping key inside the same loan name
// and reset the per-loan page index via the orchestrator helper.
const VARIANT_SHAPING_KEYS = new Set(['loanType', 'PlotLoanActivity', 'unSecureLoanType']);

function updateAnswer(question, value) {
  const key = resolveBindsTo(question, currentAnswers, selectedLoan);
  if (selectedLoan && VARIANT_SHAPING_KEYS.has(key)) {
    const previousValue = currentAnswers[key];
    if (previousValue && previousValue !== value) {
      resetLoanPageIndex(selectedLoan);   // ← Continue-Where-I-Left-Off now lands on page 1
    }
  }
  updateAnswerByKey(key, value);
}
```

The helper [`resetLoanPageIndex(loanName)`](src/lib/utils/loanSwitchOrchestrator.svelte.ts) lives in the loan-switch chokepoint alongside `switchLoanType` (Pitfall #38) and maintains the loan-name → page-index-field map in one place. It is NOT a full switch — applicants, relationships, income profiles, and applicationData stay intact across a variant change because the user is still inside the same loan product. Only the navigation cursor resets, so the user re-walks the new variant's flow from page 1 instead of resuming into a mismatched index.

**Detection:** any future change that introduces a new variant-shaping field (a key whose answer reshapes `visiblePages` in a loan's form route) MUST add it to `VARIANT_SHAPING_KEYS` in `how-can-we-help/+page.svelte` AND verify the loan-name → page-index-field map in `PAGE_INDEX_FIELD_BY_LOAN` covers every loan whose page set the field shapes.

**Enforcement:** [`loanVariantPageIndexReset.test.ts`](src/lib/testing/__tests__/loanVariantPageIndexReset.test.ts) pins per-loan resets for all 9 supported loan-name strings (Home Loan, LAP, Plot Loan + Plot and Construction alias, Business Loan + Business Loan - Unsecured alias, Personal Loan, Professional Loan + Business Loan - Secured alias) and the unknown/empty no-op cases. The picker-level wiring is tracked via the grep recipe in CLAUDE.md §4.

**Last verified**: 2026-05-18.

### #42. `performance.getEntriesByType('navigation')[0].type === 'reload'` is stale across client-side navigation — falsely re-fires resume modal on every loan-page mount after one earlier F5

The Performance Timeline's navigation entry is created when the **tab's document first loads** and is frozen thereafter. SvelteKit's client-side router mutates `window.location` and re-runs the matched route's components, but it does **not** push new navigation entries. So `navEntries[0].type === 'reload'` answers *"was the original document load a reload?"*, not *"is this mount the result of a reload?"*. Once the user hits F5 on any page in their session, every subsequent client-side mount in the same tab reads `isBrowserReload === true`.

In the loan-page resume gate, that compound-bug:

1. Unconditionally clears `sessionStorage.__resumeHandledHere` — the dedupe flag the how-can-we-help modal had just set on a normal nav.
2. Then re-renders the 3-option `SessionResumeModal` because the guard `!alreadyHandled && isBrowserReload && initialSavedPageIndex > 0` now passes.

The user's repro: F5'd Home earlier in the session → picker → click Next → land on `/form/unsecure-loan/business-loan` → modal pops up despite never refreshing this page.

```ts
// WRONG — true for every client-side mount in the tab once any earlier F5 happened
const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
const isBrowserReload = navEntries.length > 0 && navEntries[0].type === 'reload';
```

```ts
// RIGHT — distinguishes "F5'd on THIS page" from "F5'd elsewhere, client-navigated here"
import { isReloadOfCurrentPath } from '$lib/utils/isReloadOfCurrentPath';

const isBrowserReload = isReloadOfCurrentPath();
```

The util compares the navigation entry's `name` (URL frozen at document load) with `window.location.pathname` (live, updated by SvelteKit on every client nav). Match ⇒ user reloaded this exact page; mismatch ⇒ they F5'd elsewhere and routed here client-side. Query-string changes on the same path are still treated as a reload (the F5 happened on this path); a different pathname disqualifies it.

**Detection:** every loan +page.svelte that gates a Resume modal on reload MUST go through `isReloadOfCurrentPath()` — never inline `performance.getEntriesByType('navigation')` again. The 6 existing loan pages were converted in this fix; future ones should import the util.

**Enforcement:** [`isReloadOfCurrentPath.test.ts`](src/lib/testing/__tests__/isReloadOfCurrentPath.test.ts) pins 8 cases — match/mismatch/missing-entry/parse-error/back_forward/navigate/query-string/different-loan-path. The grep recipe in CLAUDE.md §4 fails the build if a new inline `getEntriesByType('navigation')` regex slips in.

**Last verified**: 2026-05-18.

### #43. Sanction-letter view (secured loan, property not identified) — stale property data leaks into the offer, and affordability card count must follow the user's answers

When a Home Loan user answers **"property identified = No"**, they want a sanction letter: a pre-approval showing the income-based eligibility Amount, EMI, ROI, and Tenure — but **no property cost** (there's no property yet). Two failures hid here:

**(a) Stale property leak.** Property answers are preserved across a Yes→No edit (hide-not-delete, correct). But the payload builder back-derives `loanAmount` from `propertyCost` (`cost − downPayment`) and also feeds `propertyCost` into the LTV cap. So a cost left over from a prior "Yes" run produced a stale property-based Amount/EMI instead of pure eligibility.

**(b) The coercion trap.** `toBoolean(undefined) === false`, and LAP/Plot **never ask** "property identified" — so their payloads carry `propertyIdentified: false` by coercion while legitimately having a real `propertyCost`. Any guard keyed off `payload.propertyIdentified === false` therefore mis-fires for LAP/Plot, stripping their property cost and zeroing their loan amount.

```ts
// WRONG — fires for LAP/Plot too (propertyIdentified coerced to false when unasked)
if (payload.loanAmount === 0 && !isUnsecuredLoan && payload.propertyIdentified !== false) { ... }
```

```ts
// RIGHT — key off the EXPLICIT "No" answer; only Home Loan ever asks this question
const propertyNotIdentified = loanAnswers.propertyIdentified === 'No';
if (payload.loanAmount === 0 && !isUnsecuredLoan && !propertyNotIdentified) { ... }
// ...and skip propertyCost/atsValue/marketValue/registryValue when propertyNotIdentified.
```

In the engine, surface the eligibility as the offered amount for the sanction view, and scope it on the **absence of propertyCost** so LAP/Plot (coerced-false but cost-bearing) are excluded:

```ts
// evaluationEngine.ts — sanction-letter offered amount = income eligibility
if (secured && payload.loanTransaction.propertyIdentified === false && !payload.loanTransaction.propertyCost) {
  offeredAmount = foirEligibleAmount;
}
```

**Affordability card count** is a business gating decision driven by the sanction-profile answers, NOT auto-inferred from "has a deposit / has spare EMI":
`sanctionType='Based On Eligibility'` → eligibility only (1 card); `'Based on Downpayment'` → + dpConstrained (2); + `withPersonalLoan='Yes'` → + bridge (3). Done in one pure place — `selectAffordabilityScenarios()` in `affordabilityCalculator.ts` — so the calculator stays math-only.

**Detection:** any new "property not identified" branch MUST key off the explicit `'No'` answer (or `!propertyCost`), never the coerced `propertyIdentified` boolean. Any new affordability scenario must be gated through `selectAffordabilityScenarios`, never auto-computed into the rendered list.

**Enforcement:**
- [`affordabilityScenarioGating.test.ts`](src/lib/testing/__tests__/ruleEngine/affordabilityScenarioGating.test.ts) — pins 1/2/3-card gating on the answers.
- [`propertyNotIdentifiedPayload.test.ts`](src/lib/testing/__tests__/propertyNotIdentifiedPayload.test.ts) — Home-loan-No excludes propertyCost + no derived loanAmount; LAP keeps both despite coerced false.
- [`propertyNotIdentifiedTrafficLight.test.ts`](src/lib/testing/__tests__/ruleEngine/propertyNotIdentifiedTrafficLight.test.ts) — end-to-end: offered_amount === eligible_amount > 0, and card gating through real `evaluatePayload`.

**Last verified**: 2026-05-21.

### #44. Director-in-Company income must LINK to a real Company applicant — free-typed company name silently breaks auto-fill and lets data conflict

A director's income entry (`director_company` profile) auto-fills + locks its company fields (type, registration, equity, designation, shareholding, `companySharesFinancials`, `companyProfitable`) ONLY when the entry is linked to a Company applicant — i.e. it carries `autoCreated:true` + `sourceCompanyId`, built via `directorAutoIncome.buildAutoSpecifics`. The form's `AUTO_LOCKED_KEYS` machinery keys off that.

The bug: on the manual "add income" path, the company name was a **free-text field**. A director could type a company ("xyz company") that doesn't match the actual Company applicant on the case ("sweets corner") → no link → no auto-fill → the director's company income conflicts with the company that's actually on the loan. The only linkage was a fragile exact free-text name match (`applicantFormManager` Check 2).

```svelte
<!-- WRONG — free text; no link, no auto-fill, allows a conflicting company -->
<TextField id="entityName" bind:value={entityName} />
```

```svelte
<!-- RIGHT — pick the real Company applicant (mirrors the partnership FirmNameCombobox).
     On select: set sourceCompanyId + run buildAutoSpecifics → company fields lock.
     "Other" falls back to free text for a company NOT on this loan. -->
{:else if currentProfileType === 'director_company' && companyNameOptions.length > 0 && !isAutoEntry && !isLinkedEntry && !useOtherCompany}
  <SelectField options={[...companies, { label: 'Other …', value: OTHER_COMPANY_SENTINEL }]}
    value={selectedCompanyId} onChange={handleCompanySelect} />
```

Two more rules locked in:
- **`companyNameOptions` lists only director-eligible companies** (Pvt Ltd / OPC / Public Ltd / Section 8 — `getProfileForCompanyType === 'director_company'`). Partnership/LLP use the firm combobox.
- **Completion gate:** a director linked to a Company applicant (`linkedCompanyIds`) MUST declare income from a company they direct — an entry with `sourceCompanyId ∈ linkedCompanyIds` and income filled. Extra "Other" company income is allowed; the same-company income is mandatory (`computeSectionCompletion` → `income_details`).

A director's income is their personal **salary/profit drawn** — there is NO company P&L table on the entry. The company's financials live on the Company applicant (`companyIncome`); the director entry only derives `companyProfitable`/`companySharesFinancials` from it. Don't try to copy a financials table onto the director.

**Detection:** any director_company company field must be a company SELECT (or locked auto field), never a bare free-text TextField. Any new linked-entry path must set `sourceCompanyId` so locks + the completion gate work.

**Enforcement:**
- [`companyNameOptions.test.ts`](src/lib/testing/__tests__/companyNameOptions.test.ts) — director-eligible filtering + dedupe.
- [`directorSameCompanyIncomeGate.test.ts`](src/lib/testing/__tests__/directorSameCompanyIncomeGate.test.ts) — Next blocked until same-company income is declared.

**Last verified**: 2026-05-21.

### #45. Business Loan applicant model — a Company is ALWAYS multi (cards+modal); count-based single/multi mistakes it for a single person

The single-vs-multi view was decided by **applicant count** (`applicants.length === 1`). A Company applicant keeps its directors/partners **nested inside the company record**, so a company case is one entry → it was wrongly routed into the **single-applicant inline flow**, which (a) mounted `<Company>` with a **dead Submit** (no `onSubmit`), and (b) duplicated the company applicant modal with separate flattened pages (`businessProfilePage`, `companyFinancialsPage`) under **divergent, dead keys** — i.e. "Problem D", and itself an over-engineered AI addition (see feedback_no_overengineering memory).

**Confirmed model (business loan):**
- A business loan is for **exactly one company** OR a **sole proprietor** (a lone Individual). No joint companies; no company+individual.
- **Sole-prop = single-applicant** flattened flow (income profiles/details, credit, obligations as pages).
- **Company (Pvt Ltd / OPC / Partnership / LLP) = multi-applicant cards+modal, ALWAYS** — even though it's one entry. Directors/partners are **non-financial co-applicants** (the company pays EMI). The company captures EVERYTHING in its applicant modal (Identity/Character/Income/CIBIL/Obligations); the flattened `businessProfilePage` + `companyFinancialsPage` are **retired**.
- (Secured loans: companies ALSO render multi, but the "directors are non-financial" rule is business-loan-specific — do NOT port it to Home/LAP/Plot.)

```ts
// WRONG — a lone Company is mistaken for a single person
const isSingle = applicants.length === 1;
```
```ts
// RIGHT — one shared decision, used by +page.svelte AND IncomePageNew
import { rendersAsSingleApplicant } from '$lib/utils/applicantViewMode';
const isSingle = rendersAsSingleApplicant(applicants); // length<=1 && [0]?.applicantType !== 'Company'
```

Also: the **borrowing-firm declaration** gate (Partnership/LLP — "at least one partner declared income from the firm") must be enforced on the **partner's income step, Next-before-navigate** — NOT on the "Who's Applying" page (income isn't entered there yet → chicken-and-egg block).

**Detection:** the single/multi view decision must go through `rendersAsSingleApplicant` — never a bare `applicants.length === 1`/`<= 1` in IncomePageNew or a loan `+page.svelte`. No `<Company>` mount without `onSubmit`. Borrowing-firm check must not gate the applicant-details page.

**Enforcement:**
- [`applicantViewMode.test.ts`](src/lib/testing/__tests__/applicantViewMode.test.ts) — company ⇒ multi, sole-prop ⇒ single.
- [`businessLoanPageVisibility.test.ts`](src/lib/testing/__tests__/businessLoanPageVisibility.test.ts) — businessProfilePage + companyFinancialsPage retired; sole-prop flattened pages remain.

**Last verified**: 2026-05-22.

### #46. Director auto-income sync must follow every `commitDirectorsToApplicants` call — otherwise the Director-in-Company income row never auto-creates and the company link is lost

Home Loan's `applicantFormManager.handleDirectorSave` always pairs `commitDirectorsToApplicants(...)` with `syncAutoIncomeEntries(...)` on each returned linked Individual. The sync is what (a) creates the locked auto-row in Income Details with `sourceCompanyId` set, (b) writes the auto-filled specifics (designation / shareholding / active-in-operations / ITR-reflects), and (c) re-orphans entries when a director is removed. Business Loan and Professional Loan had their OWN local director-save handlers (`AddApplicantBusiness` + `AddApplicantProfessional`) that called `commitDirectorsToApplicants` directly but **never** called `syncAutoIncomeEntries` — so the same OPC + same director that produced a fully-prefilled row in Home Loan produced an empty Income Details tab in Business Loan, an empty company combobox (Pitfall #44 territory), and a "Director in Company" income form with one bare question instead of four locked auto-filled fields.

```ts
// WRONG — BL/Prof director save pre-2026-05-23
const newApplicants = commitDirectorsToApplicants(companyId, forms, currentApplicants, role);
formState.replaceApplicants(newApplicants);  // ← no sync — auto-row never created
```
```ts
// RIGHT — pair every commit with a sync (HL pattern, now BL + Prof too)
let newApplicants = commitDirectorsToApplicants(companyId, forms, currentApplicants, role);
newApplicants = newApplicants.map((a) => {
    const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
    if (a.applicantType !== 'Individual' || ids.length === 0) return a;
    const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
    const name = (a.fullName as string) || '';
    return { ...a, incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name) };
});
formState.replaceApplicants(newApplicants);
```

This applies to **every** commit site, not just the modal-save handler — the director-restore path (`applyDirectorRestore`) also commits and must pair. Caught by an inter-fix interaction when this session's D (Restore button) added a new commit site that wasn't paired; the static-scan test in B caught it during merge.

**Detection:** the static-scan walks each loan's director-save component for `commitDirectorsToApplicants(` calls and asserts a `syncAutoIncomeEntries(` call follows within a small window. Any new commit site without a sync fails CI.

**Enforcement:**
- [`directorAutoIncomeWiring.test.ts`](src/lib/testing/__tests__/directorAutoIncomeWiring.test.ts) — every `commitDirectorsToApplicants` call in `AddApplicantBusiness.svelte` + `AddApplicantProfessional.svelte` must be paired with `syncAutoIncomeEntries`.
- [`directorAutoIncome.test.ts`](src/lib/testing/__tests__/directorAutoIncome.test.ts) — locks the auto-entry shape itself (Pitfall #29 companion).

**Last verified**: 2026-05-23.

### #47. Form submit MUST route through the pre-submit ConfirmModal; offer page MUST guard browser-back to form. Either omission silently consumes a case slot under the (incoming) monthly-quota billing model.

Under the upcoming monthly-quota billing model, **every form submission consumes one case from the DSA's monthly plan** — whether new or edit. The only no-cost adjustments live on the offer page (loan tenure slider, down-payment slider on Home / Plot). To make that cost visible **before** the network call commits the case, two UX surfaces must always be in place:

1. **Pre-submit modal** — every loan `+page.svelte` submit handler routes through `confirmAndSubmit(...)` (which opens the ConfirmModal). It must NOT call `submitFormForEvaluation(...)` directly, because that bypasses the modal.
2. **Back-to-form nav guard** — the offer page (`.../cases/[case_id]/results/+page.svelte`) registers a `beforeNavigate` handler that intercepts any navigation to a `/form/*` route and opens a "going back will cost another submission" ConfirmModal.

Both surfaces ship together. The modal copy tells the truth TODAY (no enforcement yet — the gate at [`evaluate-and-persist:367-390`](src/routes/api/evaluate-and-persist/+server.ts:367) is still the concurrent-cases model) AND TOMORROW (when monthly-quota billing lands and the gate flips to a monthly counter). When billing lands, no UI rework is needed — only the gate code changes; the modal copy already prepares the DSA.

```svelte
<!-- WRONG — direct call bypasses the pre-submit ConfirmModal. -->
<script>
  import { submitFormForEvaluation } from '$lib/utils/formSubmitHandler';
  // ...
  const result = await submitFormForEvaluation({ loanType, ..., editCaseId });
  if (!result.success) submitError = result.error;
</script>
```

```svelte
<!-- RIGHT — confirmAndSubmit opens the ConfirmModal first; only runs the
     real submit on confirm. The cancelled-result early-return covers the
     "Review details" dismissal path. -->
<script>
  import { confirmAndSubmit } from '$lib/utils/confirmAndSubmit';
  // ...
  const result = await confirmAndSubmit({ loanType, ..., editCaseId });
  if (result.cancelled) return;             // user wants to review — no error
  if (!result.success) submitError = result.error;
</script>
```

```svelte
<!-- WRONG — no beforeNavigate guard on the offer page. Browser-back lands
     the DSA back on the form with no warning that re-submitting costs another slot. -->
<script>
  // results/+page.svelte — no nav guard
</script>
```

```svelte
<!-- RIGHT — beforeNavigate intercepts /form/ destinations and opens the modal.
     The bypassFormNavGuard flag lets the confirm handler re-fire the
     navigation without re-prompting. -->
<script>
  import { beforeNavigate, goto } from '$app/navigation';
  import { dialogState } from '$lib/state/dialog.svelte';

  let bypassFormNavGuard = $state(false);
  beforeNavigate((nav) => {
    if (bypassFormNavGuard) { bypassFormNavGuard = false; return; }
    if (!nav.to || !nav.to.url.pathname.startsWith('/form/')) return;
    nav.cancel();
    const targetUrl = nav.to.url.pathname + nav.to.url.search;
    dialogState.openConfirmModal(
      'Edit this application?',
      'Going back to the form lets you change any detail, but re-submitting will count as one more submission under your monthly plan. ...',
      () => { bypassFormNavGuard = true; goto(targetUrl); },
      { confirmLabel: 'Edit and resubmit', cancelLabel: 'Stay on offers' }
    );
  });
</script>
```

A companion change (`evaluating/+page.svelte` → `goto(results, { replaceState: true })`) removes `/evaluating` from the back-history stack so browser-back from results goes straight to the form (not back through the animation page). Without `replaceState`, back-press replays the 3s progress bar before landing on the form — annoying but not a billing event (`/evaluating` is pure animation; the API call already happened inside `submitFormForEvaluation`).

**Detection:** static-scan walks each loan `+page.svelte` for `confirmAndSubmit` import + call AND zero direct `submitFormForEvaluation(` calls. Also asserts the results page imports `beforeNavigate` + `dialogState`, registers `beforeNavigate(`, filters on `'/form/'`, calls `nav.cancel()`, and opens the modal. Any new caller of `submitFormForEvaluation` outside `formSubmitHandler.ts` (definer) and `confirmAndSubmit.ts` (wrapper) fails CI.

**Enforcement:**
- [`preSubmitConfirmWiring.test.ts`](src/lib/testing/__tests__/preSubmitConfirmWiring.test.ts) — six per-loan-page scans + offer-page nav-guard scan + stray-caller check.

**Last verified**: 2026-05-23.

### #48. Fresh worktree `pnpm install` skips `mongodb-client-encryption` native build → auth + CSFLE endpoints 500

> **2026-05-31 UPDATE — PERMANENT FIX LANDED (`70862a9f`)**: the worktree-only caveat below is no longer accurate. The native build was also being skipped on Vercel production after a Vercel build-cache invalidation surfaced pnpm 10's strict `onlyBuiltDependencies` enforcement, causing the same 500 in production. Fixed at the **lockfile / config** layer rather than per-environment: `package.json` now declares `pnpm.onlyBuiltDependencies: ["esbuild", "mongodb-client-encryption", "protobufjs"]`, which approves the postinstall on every `pnpm install` invocation — worktree, main checkout, Vercel CI, all the same. `pnpm approve-builds` is no longer required as a manual step. The historical detail below is preserved for context.

`mongodb-client-encryption` is a native module — its `.node` binding is produced by a postinstall build script. pnpm's default behavior since v8 is to **skip** postinstall scripts for packages that haven't been explicitly allow-listed. A fresh worktree runs `pnpm install --prefer-offline`, sees the package in the lockfile, hard-links it from the store, and never runs its build. The package "installs" successfully — but `require('mongodb-client-encryption')` resolves to a module whose native binding is missing, and every CSFLE code path crashes the first time it loads at runtime.

Prior to `70862a9f`, the main repo escaped the issue only because its install state predated pnpm's strict default — the build artifact lived in the global store from an earlier approved install and got hard-linked into every subsequent install. Vercel's build cache was protecting production for the same reason. When the cache was invalidated (lockfile bump during the loan-field rename session), Vercel's clean install rebuilt without the native binding — and production OTP / detect-roles started 500ing. The allowlist fix in `70862a9f` makes the approval part of the lockfile-tracked config, eliminating the cache-dependency.

**Symptoms:**
- `/api/auth/*` returns 500 on the first OTP request from a fresh worktree
- `/api/admin/rm-search` (and any other CSFLE-encrypted query) silently fails
- The login / OTP flow appears "wedged" in a worktree even though `main` works fine
- Same commit SHA — runs in main, fails in worktree

**Burned us 2026-05-23** (`text-*` utility rename worktree session): the loan-picker smoke needed an OTP login to advance past the welcome modal. OTP flow returned 500 with no useful error. Worked around by using the demo-mode bypass to verify the visual change; the auth-path 500 is what triggered this pitfall write-up.

```bash
# WRONG — fresh worktree, native build silently skipped
cd .claude/worktrees/feature-x
pnpm install --prefer-offline   # postinstalls disabled by default
pnpm dev                         # /api/auth/* → 500

# RIGHT — approve builds for native modules after install
pnpm install --prefer-offline
pnpm approve-builds              # interactive — select mongodb-client-encryption
pnpm dev                         # auth works
```

**Quick diagnosis** (do this BEFORE digging into code when a worktree's auth 500s but main works):

```bash
ls node_modules/mongodb-client-encryption/build/Release/*.node 2>/dev/null
# Empty output → native build was skipped → run pnpm approve-builds
# Path lists a .node file → not this pitfall; investigate code
```

**Rule (post-`70862a9f`):** `package.json` `pnpm.onlyBuiltDependencies` is now the single source of truth. Any new native-build dependency added in the future (a Sharp, a node-canvas, a re2, etc.) must be appended to that array in the same commit, OR Vercel's next clean install will skip the build and the same symptom returns. Pre-merge check: `grep -A8 onlyBuiltDependencies package.json` after `pnpm install` — any postinstall warning in the install log about a native dep that isn't in the allowlist is a latent production failure.

**Detection:** Pre-2026-05-31 — worktree-scope only; symptom was "main fine, worktree 500" on auth/CSFLE pathway. Post-2026-05-31 — should not recur on existing native deps. If it does, check the allowlist first; if the dep is missing, add it.

**Enforcement:** Config-level (the allowlist) replaces the per-environment workaround. No CI test added — the lockfile + `package.json` diff makes the regression visible in code review.

**Last verified**: 2026-05-31 (permanent fix landed at `70862a9f`).

### #49. Entity-type switch must rewrite the PERSISTED applicant, not just the local form buffer — table/sidebar classification stays stale otherwise

In flows where a single entity has both a "local working copy" (component-scope `$state`) AND a "saved record" (an entry in `formState.applicants`), every mutation that changes a downstream-readable field MUST update BOTH. Updating only the local buffer makes the form re-render correctly, but every other surface that reads from `formState.applicants` (summary tables, sidebar badges, payload builders, exit-step validators) keeps showing the previous value.

The Business-Loan entity-type tile is the canonical example: picking Pvt Ltd → OPC → Pvt Ltd left "One Person Company (OPC)" in the **Added Applicants** table because `selectEntityType()` rewrote the local `companyForm.companyType` but never wrote back to the Company applicant already in `formState.applicants`. The tile + form looked right; the table lied.

**Burned us 2026-05-25** (Pvt Ltd ↔ OPC report) — user described it as "UI not updating properly". Real cause was state-drift between two stores of the same fact.

```ts
// WRONG — local buffer only; table reads from formState, stays stale
function selectEntityType(type: string) {
  const cfg = ENTITY_MAP[type];
  formState.replaceApplicationData({ ...formState.applicationData, businessEntityType: type });
  const existing = formState.applicants.find(a => a.applicantType === 'Company');
  if (existing) {
    companyForm = { ...existing, companyType: cfg.companyType }; // buffer only!
    isCompanySaved = true;
  }
}

// RIGHT — sync the persisted applicant too when the value actually changed
function selectEntityType(type: string) {
  const cfg = ENTITY_MAP[type];
  formState.replaceApplicationData({ ...formState.applicationData, businessEntityType: type });
  const existing = formState.applicants.find(a => a.applicantType === 'Company');
  if (existing) {
    companyForm = { ...existing, companyType: cfg.companyType };
    isCompanySaved = true;
    if (existing.companyType !== cfg.companyType) {
      const synced = formState.applicants.map(a =>
        a.applicantType === 'Company' ? { ...a, companyType: cfg.companyType } : a
      );
      formState.replaceApplicants(synced);
    }
  }
}
```

**Why a guard on the inequality?** Because `replaceApplicants` triggers a reactive cascade (cards, sidebar, payload builders all re-render). Skipping the call when the value is already correct avoids unnecessary re-renders + dedups infinite loops if any consumer writes back into formState transitively.

**Detection:** any component that holds a `$state` buffer (e.g. `companyForm`, `formApplicant`, `editingFoo`) AND mutates it in response to user input is a candidate. When that buffer's field is also displayed in a separate summary view (Added Applicants table, sidebar Case Route, etc.), the buffer write MUST be paired with a `formState.replaceApplicants(...)` write.

```bash
# Heuristic scan — find buffer-only writes in flows that have a "summary" surface
grep -rnE 'companyForm = \{ \.\.\.existing' src/lib/components | grep -v replaceApplicants
# Any hit warrants a manual review: does this buffer-write affect a field a
# downstream summary reads from formState.applicants?
```

**Enforcement:** no per-bug CI test (this is a class of bug, not a single regression). Reviewer eyes on any new `selectXxx` / `pickXxx` / `chooseXxx` handler that touches an entity already persisted.

**Last verified**: 2026-05-25.

### #50. Per-field bounds are insufficient for related numeric fields — need cross-field plausibility checks

`minLimit` / `maxLimit` on a single numeric field catches "obviously absurd values" (₹0 loan, 500-year tenure) but never catches **inter-field absurdities** where every field is individually plausible yet the combination is mathematically impossible.

Canonical case: a balance-transfer Current Loan Details page accepts `principal: ₹23,66,666` + `rate: 10%` + `tenure: 22 months` + `EMI: ₹557`. Each field passes its bounds. The combination is impossible — the zero-interest floor alone (`principal / months`) is ~₹1.07L/mo. Without a cross-field check, the DSA submits and a junk payload reaches the rule engine.

**Burned us 2026-05-25** (LAP Top-up validation report) — user attached a screenshot of exactly this case and asked "details in page are not validated".

```ts
// WRONG — per-field bounds only; ₹557 EMI on ₹23.66L / 22 months sails through
export const q5_EMI: RawSchemaQuestion = {
  required: true,
  minLimit: 500,
  maxLimit: 10000000,
  // ... no cross-field check
};

// RIGHT — JSON-Logic cross-field validators in addition to per-field bounds.
// The zero-interest floor (P/n) is the absolute physical minimum; a 0.9× slack
// covers rounding + partial-EMI quirks. Symmetric upper bound (1.6× P/n) catches
// extra-zero typos without false-rejecting legitimate high-rate cases.
export const q5_EMI: RawSchemaQuestion = {
  required: true,
  minLimit: 500,
  maxLimit: 10000000,
  validation: {
    condition: [
      {
        case: { and: [
          { '>': [{ var: 'principalOutstanding' }, 0] },
          { '>': [{ var: 'remainingTenureMonths' }, 0] },
          { '<': [
            { var: 'EMI' },
            { '*': [0.9, { '/': [{ var: 'principalOutstanding' }, { var: 'remainingTenureMonths' }] }] }
          ]}
        ]},
        then: 'EMI looks too low for this principal and remaining tenure — even at 0% interest the EMI would need to be at least the principal divided by the months remaining. Please re-check.'
      },
      {
        case: { and: [
          { '>': [{ var: 'principalOutstanding' }, 0] },
          { '>': [{ var: 'remainingTenureMonths' }, 0] },
          { '>': [
            { var: 'EMI' },
            { '*': [1.6, { '/': [{ var: 'principalOutstanding' }, { var: 'remainingTenureMonths' }] }] }
          ]}
        ]},
        then: 'EMI looks too high for this principal and remaining tenure — please re-check (possible typo of an extra zero).'
      }
    ]
  }
};
```

**Categorical tenure fields:** if the tenure is a string-enum select (e.g. Plot Loan's `<1`, `1`…`>15`), wrap the months conversion in an inline `switch` JSON-Logic block (one `case` per enum value, mapping to a months number). The validator referencing `TENURE_TO_MONTHS_SWITCH` then works the same. Pick bucket midpoints for ranges and the literal value for single-year options; use a conservative high value (e.g. 192 months for `>15`) so the upper-bound test doesn't over-warn.

**Other cross-field patterns worth a check:**
- Loan amount vs annual turnover (already in place for BL — `loanAmount > 2× turnover` warning)
- Property cost vs loan amount (LTV reasonableness)
- Income vs FOIR limit (existing-obligations-to-income ratio)
- Tenure vs age (loan tenure + applicant age ≤ retirement age + buffer)

**Detection:** grep for currency / number questions that reference OTHER fields in their `description` or `question` text — if the description says things like *"this should be around X based on Y"*, the validator should enforce that programmatically.

```bash
# Heuristic: numeric questions that mention OTHER field names in description
# but have no validation.condition referencing those vars
grep -A 5 'type:.*currency' src/lib/config/**/questionBank/*.ts | grep -B 2 'description.*based on'
```

**Enforcement:** no general CI test (this is a class of bug). When adding a new currency question to a page where related numeric fields exist, ask: "if a user typed an absurd value for THIS field given the values of THOSE fields, would Next still be enabled?" If yes, add cross-field validation.

**Last verified**: 2026-05-25.

### #51. Cross-applicant dropdowns must exclude already-represented entities in ADD mode — picking one creates a duplicate row instead of editing

Any dropdown that lists "applicants/entities on this case" for the user to LINK to from a new entry MUST filter out entries the current applicant already has a relationship to. Otherwise picking the same target in ADD mode creates a parallel entry; the user has to use a separate edit-existing path (pencil icon, click row) to update — but they don't know that and instead think they're "updating" by re-picking from the dropdown.

Canonical case: the Director-in-Company income form lists every eligible Company applicant on the case in its combobox. An auto-created income entry already exists for `decorators`. The DSA opens "Add another income source", picks "Director in Company" profile, picks `decorators` from the dropdown (still listed), fills fields, clicks Update Entry — gets a SECOND `decorators` row instead of updating the existing one.

**Burned us 2026-05-25** (BL Director-in-Company duplicate report).

```svelte
<!-- WRONG — every eligible company always listed; picking a duplicate creates a parallel row -->
let companyNameOptions = $derived(assembleCompanyNameOptions(formState.applicants));

<!-- RIGHT — exclude companies the applicant already has an entry for. Preserve the
     editing entry's own company so the combobox still reflects state in EDIT mode. -->
let companyNameOptions = $derived.by(() => {
  const all = assembleCompanyNameOptions(formState.applicants);
  const usedCompanyIds = new Set<string>();
  for (const e of existingEntries) {
    if (e.profileType === 'director_company' && e.sourceCompanyId) {
      usedCompanyIds.add(e.sourceCompanyId);
    }
  }
  if (editingEntry?.sourceCompanyId) {
    usedCompanyIds.delete(editingEntry.sourceCompanyId);  // keep current visible
  }
  return all.filter((o) => !usedCompanyIds.has(o.companyId));
});
```

**Why filter at the source instead of detecting duplicate-on-save?** Detecting duplicates at save-time means showing a modal ("you already have an entry for this company — edit existing or duplicate?") which adds clicks AND assumes the user wanted to edit. Filtering at the dropdown level removes the wrong choice from sight; the user naturally uses the pencil-on-existing-row path to edit.

**Where this class of bug lives:** any combobox in a form that lists "applicants" / "companies" / "firms" / "co-applicants" / "directors" / etc. with the intent to LINK the new entry to a chosen target. The list MUST be filtered against already-linked targets when in ADD mode.

**Detection:**

```bash
# Heuristic: comboboxes built from formState.applicants that don't reference existingEntries
grep -rnE 'assemble.*Options\(formState\.applicants\)' src/lib/components | grep -v existingEntries
# Each hit: does the consuming component support adding MULTIPLE entries linked to
# distinct targets? If yes, filter the options against existing linked entries.
```

**Enforcement:** no per-bug CI test. Reviewer eyes on any new "list of applicants/entities for linking" combobox added to a multi-entry form (income sources, obligations, properties).

**Last verified**: 2026-05-25.

### #52. Director-removal picker confirm must persist to `formState.applicants[Company].directors` — stale array resurrects removed director on remount

When a user reduces director count via `DirectorRemovePickerModal` (Pvt Ltd → OPC cap-trim, Partnership → smaller count, etc.) the modal's confirm handler must commit the kept list to `formState.applicants[Company].directors` **at the moment of confirmation**, not defer to the next Next-click validation. Otherwise the local `directorForms` buffer shows `[kept...]` but the persisted Company applicant keeps the pre-removal `directors` array. On a later Previous → Next remount, `initDirectorForms(company)` reads the stale array and silently resurrects the removed director.

This is a specialization of [[#25]] (modal-saved data must persist immediately) scoped to the *picker* confirm path. Pre-2026-05-26 BL/Prof had this gap: `handleDirectorSave`, `handleDirectorRestore`, and `validateAndCommit` all committed correctly, but `handleRemovePickerConfirm` updated only the local buffer.

**Burned us 2026-05-26** (BL "Director restoration and UI bug" PDF, Step 5(B) — user switched Pvt Ltd → OPC, removed Tanisha via picker, switched back to Pvt Ltd, set Stakeholders=2, Previous→Next, Tanisha reappeared in the applicant list without consent).

```ts
// WRONG — local buffer only; company.directors keeps stale [Surbhi, Tanisha]
function handleRemovePickerConfirm(keepIndexes: number[]) {
  const kept = keepIndexes.map((i) => removePickerFilled[i]);
  // ... save discarded to recovery bin ...
  while (kept.length < removePickerTargetCount) {
    kept.push(createEmptyDirectorForm(true, createOpts));
  }
  directorForms = kept;
  showRemovePicker = false;
}

// RIGHT — commit to formState immediately, mirroring handleDirectorSave
function handleRemovePickerConfirm(keepIndexes: number[]) {
  const kept = keepIndexes.map((i) => removePickerFilled[i]);
  // ... save discarded to recovery bin ...
  while (kept.length < removePickerTargetCount) {
    kept.push(createEmptyDirectorForm(true, createOpts));
  }
  directorForms = kept;

  if (companyId && entityConfig) {
    const role = ROLE_MAP[entityConfig.companyType ?? ''] ?? 'director';
    let newApplicants = commitDirectorsToApplicants(
      companyId,
      $state.snapshot(kept) as DirectorForm[],
      formState.applicants as Array<Record<string, unknown>>,
      role
    );
    // Pitfall #46: pair syncAutoIncomeEntries
    newApplicants = newApplicants.map((a) => { /* ...sync... */ });
    formState.replaceApplicants(newApplicants);
  }
  showRemovePicker = false;
}
```

**Why doesn't the existing $effect at `directorForms.length === 0 ? initDirectorForms(...)` catch this?** Because that branch fires on COMPONENT MOUNT only (when forms = []). The bug is the OTHER direction: stale persisted data leaking BACK into the buffer on remount. The fix is at write-time, not read-time.

**Where this class of bug lives:** any modal/picker that mutates `directorForms` and dismisses without going through the normal save path. Today that's just `DirectorRemovePickerModal`, but any future "swap director", "split director", "merge directors" UI must commit immediately too.

**Detection:**

```bash
# Find every assignment to directorForms in AddApplicant{Business,Professional}
grep -nE 'directorForms\s*=\s' src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte
# For each handler that mutates directorForms in response to a user action
# (NOT the init $effect), verify commitDirectorsToApplicants follows in the
# same function body. The static-scan test below enforces this for the
# Business component's picker confirm specifically.
```

**Enforcement:** [`directorRemovePickerCommit.test.ts`](src/lib/testing/__tests__/directorRemovePickerCommit.test.ts) — source-pattern scan asserting `handleRemovePickerConfirm` calls `commitDirectorsToApplicants` followed by `syncAutoIncomeEntries` and `formState.replaceApplicants` in the same function body. Same approach as `directorSavePersistence.test.ts` (Pitfall #25) and `directorAutoIncomeWiring.test.ts` (Pitfall #46).

**Last verified**: 2026-05-26.

### #53. Disabled-Next reason must cover multi-applicant case-level requirements, not just the per-applicant obligation page

Specialization of [[#26]]. `getObligationsDisabledReason()` was wired to surface the per-applicant blocker on the Existing Loans page. But case-level requirements (the canonical example: Debt Consolidation needs at least one obligation across ALL applicants marked "Close by this new loan") fail SILENTLY in multi-applicant view — each applicant's "Done" badge stays green individually because the joint debt-free-coapplicant branch allows empty obligations when `caseHasDcClosure` is true, but if NO applicant actually has the closure plan, the case still can't proceed. Result: DSA sees Next disabled, no reason surfaced. Pitfall #26 fix didn't cover this path because the original repro was single-applicant only.

**Burned us 2026-05-26** (BL Income & Credit Details screenshot, Issue 5 in the BL bug report PDF — DSA switched loanType from "New Loan" to "Debt Consolidation" after filling applicant details, all 3 applicants showed green Done, Next disabled, no message).

```ts
// WRONG — only surfaces per-applicant reason on a specific page
let obligationsDisabledReason = $derived.by(() => {
  if (currentPage?.id !== 'obligationsPage' || !isSingleApplicant) return '';
  // ... per-applicant check ...
});
// FormNavigationBar wired with just `obligationsDisabledReason` — silent on
// multi-applicant DC case-level gaps.

// RIGHT — pair with a case-level helper that aggregates across applicants
let obligationsDisabledReason = $derived.by(() => { /* per-applicant */ });
let caseLevelDisabledReason = $derived.by(() => {
  const loanVariant = combinedAnswers.loanType?.toString() ?? '';
  return getCaseLevelDisabledReason(
    formState.applicants as Array<Record<string, unknown>>,
    {
      loanVariant,
      onApplicantListPage: onApplicantPage && !isSingleApplicant
    }
  );
});
// FormNavigationBar: BOTH layered with fallback
disabledReason={onApplicantPage
  ? ownershipDisabledReason || applicantDisabledReason || caseLevelDisabledReason
  : obligationsDisabledReason || caseLevelDisabledReason}
```

**Where this class of bug lives:** every loan +page.svelte (HL / Plot / LAP / Personal / BL / Professional). DC routes only exist for the 3 unsecured loans today (Personal / BL / Professional); the helper is a no-op for secured loans but should still be wired for future-proofing if secured-BT case-level requirements get added later.

**Detection:**

```bash
# Every unsecured loan +page.svelte must import getCaseLevelDisabledReason
grep -L "getCaseLevelDisabledReason" \
  src/routes/\(app\)/form/unsecure-loan/personal-loan/+page.svelte \
  src/routes/\(app\)/form/unsecure-loan/business-loan/+page.svelte \
  src/routes/\(app\)/form/unsecure-loan/professional-loan/+page.svelte
# Expected: zero output (every file matches). Any listed file is missing the wiring.
```

**Enforcement:** `caseLevelDisabledReasonWiring.test.ts` (static-scan) — same enforcement model as `directorRemovePickerCommit.test.ts`. Mechanically asserts every unsecured loan +page.svelte imports `getCaseLevelDisabledReason` AND wires `caseLevelDisabledReason` into the FormNavigationBar `disabledReason` prop.

**Last verified**: 2026-05-26.

### #54. Long form-fill sessions must proactively refresh the JWT — reactive-on-401 alone leaves users mid-form on the 401 error page

The reactive `secureFetch` wrapper refreshes tokens on 401 for API calls. But a SvelteKit full page navigation (`/form/business-loan` → `/form/business-loan/applicant` etc.) doesn't go through `secureFetch` — it hits the server-side load function which gets the 401 directly and renders `(app)/+error.svelte`. A DSA filling a long form (>15 min, the access-token TTL) silently expires mid-flow and the next navigation drops them on "Session expired" with no graceful recovery.

**Burned us 2026-05-26** (user's own browser session at localhost:5173 — saw the 401 error page on `/form/how-can-we-help` mid-testing).

```svelte
<!-- WRONG — reactive-only refresh; long form sessions hit hard 401 on nav -->
<script lang="ts">
  // (app)/+layout.svelte before fix — nothing schedules token renewal.
  let { children } = $props();
</script>

<!-- RIGHT — schedule a proactive refresh ~2 min before access-token expiry -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { startTokenRefreshScheduler, stopTokenRefreshScheduler } from '$lib/utils/csrf';
  let { children } = $props();
  onMount(() => {
    startTokenRefreshScheduler();
    return () => stopTokenRefreshScheduler();
  });
</script>
```

The scheduler reschedules itself on success, stops on failure (next request fails naturally). It MUST also be cancelled in `auth.logout()` BEFORE the network call so it can't fire a renew against a session being torn down — done in `src/lib/state/auth.svelte.ts`.

**Where this class of bug lives:** the single `(app)/+layout.svelte` wiring point. Future route groups that wrap auth-protected pages (e.g. a future `(rm)/` group) MUST also mount the scheduler.

**Detection:**

```bash
# (app) layout must mount the scheduler
grep -nE "startTokenRefreshScheduler|stopTokenRefreshScheduler" \
  src/routes/\(app\)/+layout.svelte
# Both names must appear.
# Logout path must stop it:
grep -n "stopTokenRefreshScheduler" src/lib/state/auth.svelte.ts
```

**Enforcement:** no per-bug CI test (single wiring point, low drift risk). If a new auth-protected route group is added, reviewer eyes on its `+layout.svelte`.

**Last verified**: 2026-05-26.

### #55. `<InputField>` with `onInput=` requires `validateOnInput={true}` — otherwise the callback is silently dead

[`InputField.svelte:200-202`](src/lib/components/InputField.svelte) calls the `onInput` callback ONLY when `validateOnInput === true`. The prop's default is `false`. A caller that passes `onInput={...}` without `validateOnInput={true}` has a silently dead callback — typing into the input never invokes it. The DOM updates via `bind:value` but any side-effects intended to run on input (persistence, validation, computed derivations) never fire.

This is invisible at type-check (both props optional) AND at runtime (no console warning). It's only catchable by exercising the form behavior — which is exactly the slow expensive E2E path the user is fed up with.

**Burned us 2026-05-26** (user's "Father Details" screenshot — Business Loan Sole Proprietorship Runner page): `BusinessRunnerPage.svelte` had `onInput={() => { touched.name = true; onNameInput(); }}` where `onNameInput` called `persistRunnerField()` to write `formState.applicants[runner].fullName`. Without `validateOnInput={true}`, the persistence NEVER FIRED. The DOM showed "ramesh" because `bind:value={formName}` worked, but on Next-then-Previous remount the hydration `$effect` re-read `runner.fullName` from formState (still empty since persistence never ran) and cleared the fields. User saw a "data disappears on navigation" bug; the actual root cause was a dead callback.

```svelte
<!-- WRONG — onInput is silently dead; persistence/validation never runs -->
<InputField
  bind:value={formName}
  onInput={() => { touched.name = true; onNameInput(); }}
  onBlur={() => { touched.name = true; }}
/>

<!-- RIGHT — validateOnInput={true} activates the callback chain -->
<InputField
  bind:value={formName}
  validateOnInput={true}
  onInput={() => { touched.name = true; onNameInput(); }}
  onBlur={() => { touched.name = true; }}
/>
```

**Where this class of bug lives:** every `<InputField ...>` site under `src/lib/components` and `src/routes`. The static-scan covers both.

**Detection:**

```bash
# Find every InputField with onInput= that doesn't pair it with validateOnInput=
# (manual scan — the authoritative check is the CI test below).
for f in $(grep -rl "<InputField" src/lib src/routes --include="*.svelte"); do
  if grep -A30 '<InputField' "$f" | grep -q 'onInput='; then
    has=$(grep -A30 '<InputField' "$f" | grep -c 'validateOnInput')
    cnt=$(grep -A30 '<InputField' "$f" | grep -c 'onInput=')
    [ "$has" -lt "$cnt" ] && echo "$f"
  fi
done
```

**Enforcement:** [`inputFieldOnInputWiring.test.ts`](src/lib/testing/__tests__/inputFieldOnInputWiring.test.ts) — recursive source scan of every `.svelte` file (excluding `_archive`). For each `<InputField ...>` block, asserts that if `onInput=` is present, `validateOnInput=` is also present. Same enforcement model as `directorRemovePickerCommit.test.ts` (Pitfall #52) and `caseLevelDisabledReasonWiring.test.ts` (Pitfall #53).

**Why not fix InputField to always call onInput?** Changing the default would silently change behavior of every other call site (some intentionally use onInput as a validate-on-blur-only hook). The conservative fix is to make the implicit contract explicit at every call site, then lock it in CI.

**Last verified**: 2026-05-26.

---

### #56. BL/Prof director stake % must recompute on entity-type AND director-count change — and a guard-failed restore MUST reset `restoreIntentState`

Two intertwined bugs, both reproed by the same user PDF (2026-05-26).

**WRONG (Bug A — stake stuck):**
- Private Limited + 2 directors @ 50/50.
- Switch to **One Person Company (OPC)** → DirectorRemovePickerModal removes one director.
- Remaining director's `ownershipPercent` stays at **50%** — but OPC has exactly one director who owns 100% by definition.
- The stake input is disabled (OPC locks it), so the user cannot fix it manually.
- Only a Next → Previous navigation cycle "fixes" the display (because `initDirectorForms()` re-applies the `isOPC ? '100' : saved` rule on remount).

**WRONG (Bug B — stale OPC 100% lingers):**
- Continuing from above: switch back to **Private Limited**.
- The former-OPC director is still locked at **100%** with `ownershipPercent` in `lockedFields`.
- User manually adds Director 2 at 50% → total = **150%** → "Cannot exceed 100%" error.
- Workaround: another Next → Previous cycle, after which the helper finally recomputes.

**WRONG (Bug C — Restore button unresponsive):**
- After entity churn, user opens DirectorFormModal on a new stakeholder slot → RestoreApplicantModal opens with a recovery-bin match → user clicks **Restore** → **nothing happens**.
- Root cause: `AddApplicantBusiness.applyDirectorRestore` guarded with `if (!company || dirIdx < 0 || dirIdx >= directorForms.length) return;` — a silent return left `restoreIntentState.open === true` forever. The button "worked" (handleConfirm → onConfirm → chain reached applyDirectorRestore) but bailed without resetting state, so the modal stayed mounted and the user saw no UI change.
- Mirrors the 2026-05-23 "modal stayed open forever" fix on a different code path. The pattern: any short-circuit in a director-restore handler MUST reset the intent state, otherwise downstream state-bind users have no signal to close the modal.

**RIGHT:**

1. **Pure helper** `recomputeStakeAfterEntityChange(forms, newCompanyType, previousCompanyType)` in [`directorFormUtils.ts`](src/lib/utils/directorFormUtils.ts):
   - `newCompanyType === OPC` → `forms[0].ownershipPercent = '100'` + add `'ownershipPercent'` to `lockedFields`.
   - `previousCompanyType === OPC && newCompanyType !== OPC` → unlock `ownershipPercent` AND clear the value if it was the synthetic `'100'` (preserves any user-entered non-100 value defensively).
   - Multi → multi → no-op (returns input).

2. **Wire into both entity-mutation paths** in `AddApplicantBusiness.svelte`:
   - `handleRemovePickerConfirm` (OPC cap forces picker) — call helper BEFORE `commitDirectorsToApplicants`, then snapshot from `directorForms` (the recomputed array), not `kept` (pre-recompute).
   - `selectEntityType` (transition without cap-violation, e.g. OPC → Pvt Ltd) — call helper and persist via `commitDirectorsToApplicants` + `syncAutoIncomeEntries` (Pitfall #46 pairing).

3. **Reset on guard-fail** in `applyDirectorRestore` (BL + Professional):
   ```ts
   if (!company || dirIdx < 0) {
     restoreIntentState.reset();   // ← without this, modal stuck open forever
     return;
   }
   while (dirIdx >= directorForms.length) {
     // Defensive grow — fast count-bump → click-card sequence can land here
     // before the $effect that grows directorForms has flushed.
     directorForms = [...directorForms, createEmptyDirectorForm(...)];
   }
   ```

**Why does this happen?**
- `directorForms` is a local Svelte 5 `$state` array. Its persistence to `formState.applicants[Company].directors` is explicit (via `commitDirectorsToApplicants`), not reactive.
- `initDirectorForms()` is the only place that re-applies `isOPC ? '100' : saved.ownershipPercent`, and it only runs on component remount (i.e., a page-navigation cycle).
- So any mutation that changes entity type OR the kept-directors array WITHOUT going through `initDirectorForms` leaves the OPC-100% invariant unenforced — until the user happens to navigate away and back.
- The fix is to apply the rule inline at every mutation site, AND lock the pattern via static-scan so a future refactor that adds a new mutation site can't silently regress.

**Detection:**

```bash
# Helper must be imported by both AddApplicantBusiness + AddApplicantProfessional
grep -n "recomputeStakeAfterEntityChange" \
  src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte
# Authoritative CI test:
pnpm test:unit -- --run directorStakeRecompute 2>&1 | grep -E "FAIL"
```

**Enforcement:** [`directorStakeRecompute.test.ts`](src/lib/testing/__tests__/directorStakeRecompute.test.ts) — two parts:
- **Behavior unit tests** for the pure helper (OPC force-100 + lock, leaving-OPC unlock + clear, multi↔multi no-op, defensive extra-slots handling).
- **Static source-pattern scan**: `AddApplicantBusiness.handleRemovePickerConfirm` and `selectEntityType` must both invoke `recomputeStakeAfterEntityChange(`; BL + Prof `applyDirectorRestore` bodies must both contain `restoreIntentState.reset()`.

**Last verified**: 2026-05-26.

---

### #57. Unsecured loans — isNRI flip MUST stash NRI-incompatible business income entries (parity with secured-loan `applyNriCleanup`)

**WRONG (user-reported 2026-05-26):**
- An existing Business Loan applicant has director_company + business_proprietorship income entries.
- DSA edits the applicant and flips `isNRI` from `No` to `Yes`.
- The income-profile cards (which gate their `showWhen` on `isNRI === 'No'`) disappear from the UI — looks like the data is gone.
- But the income ENTRIES in `formState.applicants[idx].incomeEntries` are still there. The submitted payload carries director-company rows against an isNRI=Yes applicant → invalid (lenders cannot verify NRI business income; product rule is "NRIs are only supported as salaried").

**Where the gap was:**
- The secured-loan flow (Home/LAP/Plot) already handles this via `applicantFormManager.applyNriCleanup` → `applicantDataStore.updateSelectedProfiles` → `softDeleteProfileEntries`. Entries soft-move to `data.incomeEntries.deleted[profileType]` and can be restored later.
- The unsecured-loan flow (BL/Prof/PL) writes income entries to `formState.applicants[idx].incomeEntries` (single-applicant) — a different storage path. Nothing was wiring the NRI flip to a stash there.

**RIGHT:**

1. New helper [`applyNriIncomeStashForApplicant(applicantId, becomingNRI)`](src/lib/utils/unsecuredApplicantHandlers.ts):
   - `becomingNRI === true` → for each NRI-incompatible profile in `selectedIncomeProfiles`, move matching entries from `incomeEntries` into `_stashedIncomeEntries[profileType]`. Drop those profiles from `selectedIncomeProfiles`. NRI-compatible entries (salaried, rental, pension, etc.) are untouched.
   - `becomingNRI === false` → for each stashed key under `_stashedIncomeEntries` that is NRI-incompatible, pop entries back into `incomeEntries` and restore the profile into `selectedIncomeProfiles`.

2. Wired into `updateFormField` of all three unsecured AddApplicant components — `AddApplicantBusiness`, `AddApplicantProfessional`, `AddApplicantPersonal`. When `key === 'isNRI'` AND the value actually changed, invoke the helper with `becomingNRI = (value === 'Yes')`.

**User-facing behavior (matches user's mental model):**
> "if any income type is hidden then related income should go to bin (because user can remove NRI status and want to see earlier entered details)"

The stash is the "bin." A later isNRI=No flip pops it back automatically.

**Detection:**

```bash
# Every unsecured AddApplicant must import + call the helper.
grep -n "applyNriIncomeStashForApplicant" \
  src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte \
  src/lib/components/AddApplicantPersonal.svelte   # all three must match
#
# Authoritative CI test:
pnpm test:unit -- --run nriIncomeStash 2>&1 | grep -E "FAIL"
```

**Enforcement:** [`nriIncomeStash.test.ts`](src/lib/testing/__tests__/nriIncomeStash.test.ts) — behavior tests for the pure helper (stash on Yes, restore on No, no-op when no business profiles, no-op when applicantId not found, preserves NRI-compatible entries, handles repeated cycles) AND a static source-pattern scan asserting each of the 3 unsecured AddApplicant components imports the helper AND calls it inside `updateFormField` in the `isNRI` branch.

**Why not also wire `applicantDataStore.updateSelectedProfiles` for multi-applicant unsecured?** The user's reported repro lives in the formState.applicants path. The multi-applicant path goes through `applicantFormManager` which already has `applyNriCleanup`. If future repros surface a multi-applicant unsecured gap, extend this helper to dual-write — but don't over-engineer ahead of an actual report.

**Last verified**: 2026-05-26.

---

### #58. Corporate Debt Consolidation — directors/partners must NOT see "Close by this loan", and case-level validation must require a COMPANY obligation

**WRONG (user-reported 2026-05-26):**
- A Company applies for Debt Consolidation (DC). The case has the Company + its directors/partners as co-applicants.
- The DSA navigates to a DIRECTOR's obligations page (not the Company's), enters a personal loan, and toggles "Close by this new loan".
- The case passes the existing Pitfall #53 case-level gate because some-applicant-has-closure-mark is true.
- But this is invalid by product rule: a corporate loan cannot close a director's PERSONAL debt. Only company-level debt can be consolidated by a corporate DC.

**Two intertwined gaps:**

1. `getClosureOptionsFiltered(role, loanType, loanVariant)` filtered by role and variant but NOT by the applicant type the obligation is being captured against. So the "Close by this loan" toggle was offered to Director/Partner obligations on a corporate DC case.

2. `getCaseLevelDisabledReason()` (Pitfall #53) counted ANY applicant's `selectedToClose === 'Will be closed by Top-up amount'` as satisfying the DC requirement. A director's personal loan marked for closure silently satisfied a Company DC — completely wrong.

**RIGHT:**

1. **Filter signature extended:**
   ```ts
   getClosureOptionsFiltered(
     role: ObligationRole,
     loanType: string,
     loanVariant: string,
     applicantType: 'Individual' | 'Company' = 'Individual',
     caseHasCompany: boolean = false
   )
   ```
   When `isDcVariant && caseHasCompany && applicantType !== 'Company'` → drop the "Will be closed" option. So a Director on a Company DC sees only "Continue running" / "Keep running" — no closure toggle.

2. **ObligationCapture** passes both new args:
   ```svelte
   const caseHasCompany = $derived(
     allApplicants.some((a) => a?.applicantType === 'Company')
   );
   getClosureOptionsFiltered(role, loanType, loanVariant, applicantType, caseHasCompany)
   ```

3. **`getCaseLevelDisabledReason`** — when `caseHasCompany`, require ≥1 obligation with `selectedToClose === 'Will be closed by Top-up amount'` **on a Company applicant specifically**. Surface a specific message: "Debt Consolidation requires at least one COMPANY-level loan to be marked 'Close by this new loan'. A corporate loan cannot close a director/partner's personal debt." When the Company has no obligations at all, surface a different message pointing the DSA to the Company applicant.

4. **Stale-saved-closure** detection in `ObligationCapture.isClosureStale()` re-evaluates with the same applicant-type-aware filter, so a saved Director "Close by this loan" entry from before this fix shows the "Action needed" chip.

**Backward compatibility:** the new `applicantType` and `caseHasCompany` parameters have defaults (`'Individual'` and `false`), so existing 3-arg call sites keep working as before. The behavior change is opt-in via the new args.

**Detection:**

```bash
# ObligationCapture must pass applicantType + caseHasCompany.
grep -n "caseHasCompany\|getClosureOptionsFiltered" \
  src/lib/components/ObligationCapture.svelte    # both must match
# Authoritative CI test: companyDCObligationGate.test.ts
pnpm test:unit -- --run companyDCObligationGate 2>&1 | grep -E "FAIL"
```

**Enforcement:** [`companyDCObligationGate.test.ts`](src/lib/testing/__tests__/companyDCObligationGate.test.ts) — covers BOTH the filter signature (Director on corporate DC drops closure, Company on corporate DC keeps closure, Individual on non-corporate DC keeps closure, non-DC routes unaffected, backward-compat default args) AND the case-level reason (Company obligation closed = pass, only-director closed = blocks with corporate-debt message, no obligations at all = blocks with company-obligation message, non-corporate DC = original aggregate rule still applies).

**Last verified**: 2026-05-26.

---

### #59. Token refresh scheduler — MUST fire eagerly on mount AND coalesce via singleton to avoid token-reuse session nuke

**WRONG (user-reported 2026-05-26, persistent through Pitfall #54):**
- User logs in, lands on `/dashboard`, browses around for ~5 min.
- Clicks into the form → `(app)/+layout.svelte` mounts → `startTokenRefreshScheduler()` queues the FIRST refresh at `T + 13min` (15 min access TTL − 2 min lead = 13 min from now).
- At `T_login + 15min` the access token expires — but `T_now + 13min` is `T_login + 18min`, which is 3 min PAST expiry.
- The user's next SvelteKit page navigation hits `requireAuth` server-side, throws 401, and renders the "Session expired" error page mid-form. Pitfall #54's scheduler was supposed to prevent this — but only covered the case where the user stayed logged in for ≥13 min after layout mount. Anything before that fell through the gap.

**SECOND WRONG (race condition the naive fix introduces):**
- If you "just fire a refresh immediately on mount" without coalescing, you re-open this race:
  1. Server-side `hooks.server.ts` (line 73+) ALREADY auto-refreshes the JWT when it sees an expired access token + valid refresh token. It rotates the DB record + cookies.
  2. If the client scheduler fires its own POST `/api/auth/refresh-token` near-simultaneously, the request carries the OLD refresh token (the response with the new one hasn't been processed yet by the browser cookie store).
  3. The endpoint validates JWT signature OK, then DB-matches against the OLD token: NOT FOUND (already rotated by step 1).
  4. This trips the endpoint's **token-reuse detection** at `/api/auth/refresh-token` lines 99–128 → **nukes ALL sessions for that user** (unset refreshToken, refreshTokenExpiry, activeTokenId, activeTokenIds across all 3 collections). User is logged out everywhere.

**RIGHT:**

1. **Eager first refresh on `startTokenRefreshScheduler()` call** — instead of waiting 13 min for the first tick, fire immediately, then schedule the next at T+13min from THAT success:
   ```ts
   export function startTokenRefreshScheduler(): void {
     if (!browser) return;
     stopTokenRefreshScheduler();
     void (async () => {
       const ok = await requestTokenRefresh();
       if (!ok) return;        // refresh-token already dead — let next nav redirect to /login
       scheduleNextRefresh();  // queue T+13min
     })();
   }
   ```

2. **`requestTokenRefresh()` is the ONLY public entry to a refresh attempt** — it wraps `attemptTokenRefresh()` in the existing `refreshInFlight` singleton so the scheduler + `secureFetch` 401-retry coalesce to a single fetch:
   ```ts
   export function requestTokenRefresh(): Promise<boolean> {
     if (!refreshInFlight) {
       refreshInFlight = attemptTokenRefresh().finally(() => { refreshInFlight = null; });
     }
     return refreshInFlight;
   }
   ```

3. **`secureFetch` 401-retry path** switches from inline `refreshInFlight = attemptTokenRefresh()...` to `await requestTokenRefresh()`. Same behavior, but enforces all entries through one wrapper so future refactors can't accidentally bypass the singleton.

**Why not poll the access-token TTL and refresh lazily only when close to expiry?** Two reasons:
- Access tokens are httpOnly — JS can't read them or their `exp` claim. We'd need a new endpoint just to expose TTL, which adds attack surface.
- The eager-on-mount approach costs one extra refresh per browser session (since `(app)/+layout` mounts once per session). That's cheap compared to the operational cost of a mid-form 401.

**Detection:**

```bash
# startTokenRefreshScheduler must invoke requestTokenRefresh (eager first call)
grep -A20 "export function startTokenRefreshScheduler" src/lib/utils/csrf.ts \
  | grep -c "requestTokenRefresh"     # ≥1
# secureFetch must use the public wrapper, not inline refreshInFlight=
grep -B2 -A4 "response.status === 401" src/lib/utils/csrf.ts | grep "requestTokenRefresh"   # must match
#
# Authoritative CI test:
pnpm test:unit -- --run tokenRefreshScheduler 2>&1 | grep -E "FAIL"
```

**Enforcement:** [`tokenRefreshScheduler.test.ts`](src/lib/testing/__tests__/tokenRefreshScheduler.test.ts) — five behavior tests on `requestTokenRefresh` (singleton coalescing of concurrent callers, sequential post-completion re-fetch, server-reported failure, network error, in-flight singleton clears after completion) PLUS two static source-pattern locks asserting `startTokenRefreshScheduler` invokes `requestTokenRefresh` AND `secureFetch`'s 401-retry uses the public wrapper.

**Last verified**: 2026-05-26.

---

### #60. `.env` parsers silently truncate values containing `#` (comment marker) or `$` (variable interpolation) — affects every HMAC/JWT/Razorpay/MSG91 secret stored locally

**WRONG (D.1 S2 smoke 2026-05-26):**
- Owner's `.env` had `CRON_SECRET=MW@Lj#bd^Rh$rw4...` (a 40-char random secret with `#` and `$` in it).
- Test 14 ran `curl -H "x-cron-secret: $CRON_SECRET" /api/cron/billing-pending-cleanup` with the literal 40-char value from `.env`. Endpoint kept returning **401**.
- Diagnostic log on the endpoint showed: `env.CRON_SECRET` was only **5 chars** long on the server side (`"MW@Lj"`), the rest silently dropped.
- Root cause (in two parts):
  1. **`#` starts a comment** in standard `.env` parsers (dotenv-style). Everything after the first unquoted `#` on a value line is treated as a trailing comment and discarded. `MW@Lj#bd...` → server reads `MW@Lj`.
  2. **`$` triggers variable interpolation.** Dotenv-style parsers expand `$NAME` (or `${NAME}`) inside values to whatever the env var `NAME` resolves to (empty string if undefined). `MW@Lj#bd^Rh$rw4...` → after the `#` truncation is bypassed via quoting, `$rw4` still expands to empty, dropping 4 more chars.
- The cron had been silently 401-ing in production for however long this secret had been in place — nobody noticed because there's no successful-baseline alarm on the cron endpoint and the failures don't bubble up as user-visible errors.

**RIGHT:**

Two compatible fixes; pick either:

1. **Regenerate the secret with hex-only chars (preferred — defense in depth):**
   ```powershell
   # PowerShell — 32-byte hex secret, no special chars possible
   -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
   ```
   ```bash
   # Bash equivalent
   openssl rand -hex 32
   ```
   Same length (64 chars hex = 256 bits of entropy), zero risk of parser collision. Use this for any NEW secret you generate.

2. **Quote the existing value with single quotes** (single quotes disable both `#` comments AND `$` interpolation in dotenv-style parsers; double quotes only disable `#`):
   ```bash
   # ❌ unquoted — # truncates, $rw4 expands to empty
   CRON_SECRET=MW@Lj#bd^Rh$rw4`R?CJJHn1U^*5`CK*.T@#qhw>

   # ⚠️ double-quoted — # safe, but $rw4 STILL expands to empty
   CRON_SECRET="MW@Lj#bd^Rh$rw4`R?CJJHn1U^*5`CK*.T@#qhw>"

   # ✅ single-quoted — full value preserved literally
   CRON_SECRET='MW@Lj#bd^Rh$rw4`R?CJJHn1U^*5`CK*.T@#qhw>'
   ```

**Production note:** Vercel (and most cloud env-var stores) stores values as raw strings — no parser layer — so this issue is local-`.env`-only. But local cron testing, smoke runs, and any operator-script that reads `.env` directly via dotenv-style parsing WILL truncate. Affects: `CRON_SECRET`, `JWT_SECRET`, `HMAC_SECRET`, `CSRF_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `MSG91_TOKEN_AUTH`, `IMAGEKIT_PRIVATE_KEY`, `MONGODB_URI` (if password contains `#`/`$`).

**Detection:**

```bash
# Scan .env for any unquoted value containing # or $ (excluding comment-only lines)
grep -nE '^[A-Z_][A-Z0-9_]*=[^"'\''#]*[#$]' .env
# Empty output = safe. Any hit = potentially-truncated value; either quote it or regenerate.

# Or check the running app's view of a specific env var at runtime (proves what the parser actually read):
# In a Node REPL or a one-off script under SvelteKit's $env/dynamic/private:
#   import { env } from '$env/dynamic/private';
#   console.log(env.CRON_SECRET?.length);  // compare against expected length
```

**Enforcement:** No CI test currently — the bug exists at the operator boundary, not in committed code. Adding a `scripts/check-env-secrets.mjs` that warns on unquoted `#`/`$` in `.env` (run as a pre-launch / pre-deploy gate) is a candidate. Until then, the convention is: **all new secrets MUST be generated as hex** (option 1 above), and any existing secret with `#` or `$` MUST be wrapped in single quotes. Re-check this whenever D.1 S5 dunning (more crons) or SEC-8 (SES + DKIM keys) work begins — that's the moment new secrets get added.

**Last verified**: 2026-05-26 (D.1 S2 smoke).

---

### #61. D.1 charge cron — chargeEngine MUST probe ChargeAttempts BEFORE provider.chargeMandate (else double-charge on cron-fires-twice)

**WRONG:**

```ts
// Naive engine — skips the idempotency probe
async function processOne(sub) {
  const attempt_id = randomUUID();
  await ChargeAttempts.insertOne({ attempt_id, ..., status: 'pending' });
  const result = await provider.chargeMandate({ mandate_token, amount_paise, attempt_id });
  // ... handle result
}
```

**Failure mode** (the bug this pitfall locks against):

1. Owner is on Vercel FREE tier (S3 I-5 decision) → uses an external scheduler (cron-job.org) hitting `/api/cron/billing-charge` with `x-cron-secret`
2. The scheduler's HTTP client times out at 30s but Vercel function runs to 50s; the scheduler retries on timeout
3. Both invocations find the SAME eligible subscriptions (next_charge_at <= now, state=active)
4. Each invocation generates its OWN fresh `attempt_id` (UUID v4 — uniquely random per call)
5. Razorpay's per-receipt dedup keys on `attempt_id`, so different IDs = different orders = DOUBLE CHARGE on the DSA's bank account
6. The `withCronLock` is a partial defense — it makes the WINDOW for this race narrow (5-min TTL with 60s heartbeat) but does NOT close it. The probe is the only deterministic defense.

**RIGHT** (the pattern enforced by `chargeEngineIdempotency.test.ts`):

```ts
async function processOne(sub) {
  // ── STEP 1: idempotency probe ──
  // Query the (subscription_id, cycle_anchor) compound index for an
  // existing succeeded attempt on THIS cycle. The cycle_anchor is the
  // subscription's CURRENT next_charge_at — that's what makes the probe
  // per-cycle: a successful charge in this cycle moves next_charge_at
  // forward ~30 days, so the next cycle's probe sees no match.
  const probe = await probeExistingAttempt(sub._id, sub.next_charge_at, now);
  if (probe.kind === 'already_succeeded') {
    return { kind: 'skipped_already_charged', ... };
  }

  // ── STEP 2: pick attempt_id (fresh OR resume) ──
  // If a stale 'pending' row exists (>30 min old), a prior cron crashed
  // mid-call. REUSE its attempt_id so Razorpay's per-receipt dedup catches
  // the duplicate and returns the original payment status.
  const attempt_id = probe.kind === 'resume_pending'
    ? probe.row.attempt_id
    : randomUUID();

  // ── STEP 3: two-phase persist BEFORE the provider call (R1) ──
  if (probe.kind !== 'resume_pending') {
    await ChargeAttempts.insertOne({ attempt_id, ..., status: 'pending' });
  } else {
    await ChargeAttempts.updateOne({ attempt_id }, { $set: { updated_at: now } });
  }

  // ── STEP 4: NOW call the provider ──
  const result = await provider.chargeMandate({
    mandate_token, amount_paise, attempt_id, customer_id, customer_email, customer_mobile
  });
  // ... handle result
}
```

**Three layers of defense (defense in depth):**

| Layer | Mechanism | Catches |
| --- | --- | --- |
| 1 | `cronLock('billing-charge')` — atomic acquire with heartbeat | Two cron invocations within the lock window |
| 2 | `probeExistingAttempt(subscription_id, cycle_anchor)` | Two cron invocations where the lock window expired but the same cycle is still eligible (the lock is best-effort, the probe is deterministic) |
| 3 | Razorpay per-`attempt_id` receipt dedup | Same `attempt_id` retried — this is the RESUME path (crashed cron's pending row resumed with original attempt_id) |

Without layer 2, a cron firing more than 5 minutes apart (the lock TTL) can both find the same eligible subscription and produce different `attempt_id`s, which layer 3 cannot catch.

**Root cause:**

The cron is fundamentally an at-LEAST-once delivery system (scheduler retries on timeout / 5xx, multiple regions on Vercel deploy race). The application layer MUST be idempotent for it to be safe. The natural application-layer idempotency key is `(subscription_id, cycle_anchor)` — that's the per-cycle business identity. The compound index on `ChargeAttempts` was specifically created in S3 M1 to make this probe O(1).

**Detection:**

D.1 S3 build, 2026-05-27. The pattern was articulated in the M2 architecture blueprint and locked at write time. Source-pattern scan catches a regression IMMEDIATELY (any new `provider.chargeMandate(` call site without a preceding `probeExistingAttempt` reference in the same function fails CI).

**Enforcement:**

```bash
pnpm test:unit -- --run billing/chargeEngineIdempotency 2>&1 | grep -E "FAIL"
# 0 expected. Test details: src/lib/testing/__tests__/billing/chargeEngineIdempotency.test.ts
# Four assertions:
#   1. chargeEngine.ts imports ChargeAttempts from $lib/database/mongo
#   2. probeExistingAttempt helper exists and queries ChargeAttempts.findOne
#      with subscription_id + cycle_anchor + 'succeeded'
#   3. every provider.chargeMandate call site is preceded (within the
#      enclosing function) by a reference to probeExistingAttempt
#   4. the pending ChargeAttempt insert/update comes BEFORE the first
#      provider.chargeMandate call (two-phase persist, R1)
```

Plus runtime behavioral coverage in `chargeEngine.test.ts` — "SKIPS when a succeeded ChargeAttempt already exists" + "RESUMES a stale pending attempt with the original attempt_id".

When S4 (retry state machine) introduces new charge paths (dunning retries from operator-triggered jobs, etc.), the same invariant MUST hold. Add the new file's call sites to the static-scan if the pattern lives in a different file.

**Last verified**: 2026-05-27 (D.1 S3 M2 ship — chargeEngineIdempotency.test.ts passing).

---

### #62. Income profile cards hidden by `showWhen` must auto-clear `selectedProfiles` (and route through the parent cleanup cascade)

**WRONG:**

```svelte
<!-- IncomeProfileSelector.svelte (pre-fix) -->
<script>
  // Cards are filtered by showWhen for RENDERING
  let visibleCards = $derived.by(() => {
    const base = loanName ? getProfileCardsForLoan(loanName) : INCOME_PROFILE_CARDS;
    return base.filter((card) => shouldShow(card.showWhen, answersContext));
  });

  // BUT there is no $effect that drops selectedProfiles when a card is hidden.
  // The only existing $effect ADDS missing locked profiles.
</script>
```

**Failure mode** (the bug this pitfall locks against):

1. DSA selects `business_proprietorship` as an income profile for an Individual applicant — entries get filled in (FY data, GST, evidence).
2. DSA flips `isNRI = Yes`. `business_proprietorship` card has `showWhen: { ==: [isNRI, 'No'] }` so it disappears from the UI.
3. BUT `selectedProfiles` array still contains `business_proprietorship`. `applicantDataStore.selectedProfiles[applicantId]` still has it. `incomeEntries` still has the filled entry.
4. Right-panel guidance reads `selectedProfiles` and still says *"2 income sources selected: business proprietorship, salaried regular"*.
5. Next step (Income Details) iterates `selectedProfiles` and demands an entry for `business_proprietorship` — but the card is hidden, so the DSA has no UI to fulfil the requirement. **Dead-end.**

The secured-loan path has `applyNriCleanup` in `applicantFormManager.svelte.ts:1379` but it routes through a modal gate at `:1574` (`hasBusinessData`) that the user explicitly reported does NOT fire in their flow. The unsecured-loan path has `applyNriIncomeStashForApplicant` (Pitfall #57) but that fix lands inside the AddApplicant components, not the selector. So either:

- The modal-gate path misses some applicant states → entries linger.
- The unsecured-only fix doesn't cover secured loans → entries linger.

**RIGHT:**

```svelte
<!-- IncomeProfileSelector.svelte (post-fix) -->
<script>
  // Track profiles auto-dropped in THIS lifecycle so a reappearance toast
  // can fire on the inverse flip (Yes→No), separately from this $effect.
  let autoDroppedProfiles = $state<Set<IncomeProfileType>>(new Set());

  $effect(() => {
    // Defensive: don't run when answers haven't loaded yet. shouldShow on
    // undefined isNRI hides business cards by default; dropping a legit
    // selection during a transient empty state would be silent data loss.
    if (Object.keys(answersContext).length === 0) return;
    if (selectedProfiles.length === 0) return;

    const lockedSet = new Set(lockedProfiles);
    const filtered = selectedProfiles.filter((p) => {
      // Locked profiles are NEVER dropped — the locked-auto-add $effect
      // above would re-add them next tick. Excluding here prevents an
      // effect-vs-effect ping-pong.
      if (lockedSet.has(p)) return true;
      const card = INCOME_PROFILE_CARDS.find((c) => c.type === p);
      if (!card) return false;
      return shouldShow(card.showWhen, answersContext);
    });
    if (filtered.length !== selectedProfiles.length) {
      const dropped = selectedProfiles.filter((p) => !filtered.includes(p));
      autoDroppedProfiles = new Set([...autoDroppedProfiles, ...dropped]);
      selectedProfiles = filtered;
      onSelectionChange?.(filtered);
    }
  });
</script>
```

**Why this is the right shape:**

- **Emit via `onSelectionChange`, not direct store mutation.** The parent already has `handleProfileSelectionChange` which cascades into `applicantDataStore.updateSelectedProfiles` → `softDeleteProfileEntries`. Re-routing through that path means entries soft-delete (recoverable via S104 auto-restore on re-select) AND `_stashedIncomeEntries` semantics (unsecured loans) work unchanged.
- **Exclude locked profiles.** Without this, the locked-auto-add `$effect` (which re-adds missing locked profiles) would fight the auto-drop `$effect` (which dropped them because `showWhen` evaluated false) — infinite render loop.
- **Empty-answers guard.** `shouldShow` returns false for cards whose `showWhen` references an unset answer (e.g. `isNRI === undefined` makes `{ '==': ['isNRI', 'No'] }` false). On first mount, when `answersContext` is briefly empty, every business card would look hidden. The guard prevents silent data loss during that window.
- **Track auto-dropped profiles in a Set.** A separate `$effect` watches for those cards becoming visible again (Yes→No flip) and shows a toast — past-tense "Earlier {X} details restored." for unsecured loans (where `_stashedIncomeEntries` auto-pops), or "tap to restore" for secured loans (where the user must re-select to trigger S104 auto-restore). Two honest messages, not one ambiguous one.

**Detection:**

Team-reported 2026-05-27 morning (Home Loan, secured) and persistent across reports. The team had already shipped Pitfall #57 the day before (unsecured-only NRI stash); the assumption that secured was already covered by `applyNriCleanup` turned out to be wrong because the modal-gate at `applicantFormManager.svelte.ts:1574` does not fire in some applicant states (`hasBusinessData` resolves false). The selector-level `$effect` is the unified safety belt that closes the hole regardless of loan family.

**Enforcement:**

```bash
# Grep — every IncomeProfileSelector usage must pass selectedProfiles bindable
# AND an onSelectionChange that routes through a parent-level cleanup cascade.
grep -rnE "<IncomeProfileSelector\s" src/routes src/lib/components
```

A CI lock-test (similar to `directorAutoIncomeWiring.test.ts`) is **not yet written** — candidate next-session task. The source pattern to enforce: `IncomeProfileSelector.svelte` must contain BOTH `$effect`s (the locked-auto-add at line ~111 AND the auto-drop at ~122-155) and the parent components rendering it must pass `onSelectionChange` to a handler that calls `applicantDataStore.updateSelectedProfiles`.

**Last verified**: 2026-05-27 (team report resolved, IncomeProfileSelector.svelte:122-155).

### #63. Archived route folders (`_archived_*`) must still COMPILE — Rollup ignores SvelteKit's `_`-prefix privacy convention

SvelteKit's `_`-prefix on a route folder prevents the URL from being **registered** (no route record in the manifest), but Vite/Rollup still discovers and bundles every `+server.ts` under `src/routes/` during `vite build`. A `@ts-nocheck` directive silences svelte-check (so `pnpm check` is green locally and on Vercel) but does NOT silence Rollup's import resolution. The result: a missing import in an archived route compiles fine in `pnpm check`, then explodes in production `vite build`.

```ts
// WRONG — relies on the false belief that Rollup skips `_`-prefixed folders
// src/routes/api/billing/_archived_da_topup/+server.ts
// @ts-nocheck — Archived, folder is SvelteKit-private, won't be built
import {
  purchaseTopup,     // ← retired in a later commit; daQuota.ts no longer exports it
  getUsageSummary,
  currentYearMonth
} from '$lib/server/billing/daQuota.js';
// ...full original handler that calls purchaseTopup(...)
```

Build output on Vercel:

```
src/routes/api/billing/_archived_da_topup/+server.ts (30:1):
"purchaseTopup" is not exported by "src/lib/server/billing/daQuota.ts"
✗ Build failed in 47.25s
ELIFECYCLE  Command failed with exit code 1.
```

The route URL is genuinely unreachable (`_archived_da_topup` is folder-private), but Rollup still needs every imported symbol to resolve at bundle time. The retirement commit deleted `purchaseTopup` from `daQuota.ts` while leaving the archived consumer importing it.

```ts
// RIGHT — archived handler is self-contained, imports nothing that might be deleted later
// src/routes/api/billing/_archived_da_topup/+server.ts
/**
 * POST /api/billing/da-topup — RETIRED 2026-05-28
 * ══════════════════════════════════════════════════════════════════
 * Top-up purchases retired in commit 1aeb988c. Original handler
 * (Razorpay signature verify + purchaseTopup call) is recoverable
 * from git history at that SHA. This stub exists only because
 * Vite/Rollup bundles every `+server.ts` under src/routes/ —
 * SvelteKit's `_archived_*` prefix prevents the URL from registering
 * but does NOT exclude the file from the build graph.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
  return apiError('Document Assessment top-up packs have been retired.', 410);
};
```

**Why this is the right shape:**

- **Self-contained.** The only imports are framework + apiResponse — both will outlive any business-logic refactor. No business symbol from `daQuota.ts` / `billing.ts` / `planResolver.ts` etc. can break this file by being deleted.
- **Honest about reachability.** The 410-Gone response is defense in depth — the route URL can't be hit because of the folder prefix, but if a future SvelteKit version changes that semantic, the stub still degrades gracefully instead of crashing.
- **Original code preserved via git, not via the working tree.** The retirement commit (`1aeb988c` in this case) holds the full original handler; restoring it is `git show 1aeb988c^:src/routes/api/billing/da-topup/+server.ts > <restored-path>`. The no-delete rule is satisfied because the file still exists at the same path — it's just been reduced to a tombstone.
- **`@ts-nocheck` is the wrong tool.** It only suppresses TypeScript checking. Rollup is a different layer; it does its own import graph analysis. The only honest fix is to make the imports actually resolve.

**Detection:**

Surfaced 2026-05-28 — last 3 Vercel deploys (`c1d1c072`, `a8b2d9e7`, `d102f86d`, plus the rule-engine commit `dac1bca2` after) all failed with `"purchaseTopup" is not exported`. Local `pnpm check` had been green every time because svelte-check honored `@ts-nocheck`. `pnpm build` was never run locally before push — the only signal was the red "0/1" status check in the GitHub commits view.

**Why local pnpm check passed:** svelte-check / tsc respects `@ts-nocheck` at the file level. **Why Vercel failed:** `vite build` runs Rollup, which walks the import graph from every entry SvelteKit registers — and SvelteKit's manifest INCLUDES `+server.ts` files inside `_`-prefixed folders (the prefix only affects URL routing, not build graph). The `@ts-nocheck` directive doesn't reach Rollup at all.

**Enforcement:**

```bash
# Every archived route folder under src/routes/ must contain a +server.ts
# that compiles standalone. Scan: any archived +server.ts importing from
# `$lib/server/billing/` or other domain modules is a regression risk.
find src/routes -type d -name "_archived*" -o -name "_archive" \
  | xargs -I {} grep -lE "from '\\\$lib/server/billing/" {}/+server.ts 2>/dev/null
# Expected: empty. Any match means that archived handler has a live
# import dependency that can break the build when the imported symbol
# is retired.
```

A CI lock-test is **not yet written** — candidate next-session task. Pattern to enforce: every `+server.ts` inside a folder matching `_archive*` MUST import only from `'./$types'` and `$lib/server/apiResponse.js` (no business-logic imports). Locking this with a vitest source-pattern scan prevents future archival of a route by adding `@ts-nocheck` rather than reducing it to a stub.

**Companion fix this session:** `_archived_da_topup` (broken — was the actual blocker), plus proactive stub conversion of the three sibling archives that compile today but carry the same latent risk:

- `src/routes/api/billing/_archived_cancel/+server.ts` (imports DsaApplications, BillingTransactions, sendEmail, …)
- `src/routes/api/billing/_archived_da_quota/+server.ts` (imports getUsageSummary, resolveActivePlanId, tierAllowsDocAssessment, …)
- `src/routes/api/billing/_archived_subscribe/+server.ts` (imports Razorpay SDK, PLANS, DsaApplications, BillingTransactions, sendEmail, createNotification, …)

All four are now self-contained 410 stubs.

**Last verified**: 2026-05-28 (commit `b1a6d2ee` shipped the da-topup stub; this session converts the other three proactively).

### #64. Guarantor / independent-income capacity calcs must use `assessed_amount`, NEVER `final_amount`

`incomeAssessorV2.ts:146` deliberately sets `final_amount = 0` for any source whose applicant is classified `guarantor_financial` or `non_applicant_full_financial`. The semantics are: the applicant's income IS assessed (so we know how much they earn) but it is NOT pooled into the borrower's eligibility (that's the whole point of a guarantor — independent backstop, not a co-applicant). Sources keep `assessed_amount = gross × (1 - haircut)`; `final_amount` is the post-pooling figure used for FOIR/eligibility math, which is zero by design for non-pooled applicants.

```ts
WRONG: // Tier 3b Step 8c — capacity calc on the "real" income field
const guarantorIncome = incomeSources
  .filter((s) => s.applicant_index === guarantorIdx)
  .reduce((sum, s) => sum + (s.final_amount ?? 0), 0);
// Always 0 for guarantors → every guarantor reads as 0% capacity → universal reject.
```

```ts
RIGHT: // evaluationEngine.ts:1198 — sum the assessed (per-source, post-haircut) income
const guarantorIncome = incomeSources
  .filter((s) => s.applicant_index === guarantorIdx)
  .reduce((sum, s) => sum + (s.assessed_amount ?? 0), 0);
// Reads what the guarantor actually earns; pooling stays zero.
```

**Why this is the right shape:**

- **Three reasonable readings of the code, only one correct.** A reviewer can plausibly defend "use `final_amount` because it's the post-haircut, post-pooling truth" — but `final_amount=0` is the deliberate output of the non-pooling branch, not a bug. Comment markers at `incomeAssessorV2.ts:134` document the intent; future engine code that reads guarantor / non-applicant-financial income must look at `assessed_amount`.
- **Same shape applies to non-applicant-full-financial.** Any future "co-signer income visibility" or "additional comfort income" feature that surfaces non-pooled income on a per-lender screen MUST use `assessed_amount`. The `final_amount=0` rule extends to that classification too.
- **Locked by negative-check.** `guarantorEligibilityAssessment.test.ts` includes `expect(block).not.toMatch(/s\.final_amount/)` for the capacity-calc block.

**Detection:**

Surfaced 2026-05-28 during Tier 3b (Guarantor eligibility assessment v1 / commit `c951ed09`). The first-draft engine code summed `final_amount` and was caught only because the implementer ran the test scenario and saw 0% capacity even for a high-earning guarantor. Pattern is a future-bite trap: any new engine block that reads guarantor income will repeat the mistake unless the contract is visible.

**Enforcement:**

```bash
# Every engine block computing guarantor / independent-financial income must
# use assessed_amount, never final_amount.
grep -rnE "applicant_index === guarantorIdx|classification === 'guarantor_financial'|classification === 'non_applicant_full_financial'" \
  src/lib/ruleEngine/ -A 5 | grep -E "s\.final_amount"
# Expected: empty. Any match means a downstream consumer is reading the
# always-zero pooled field instead of the assessed (per-source) field.
```

CI lock: `guarantorEligibilityAssessment.test.ts` static-scan of the engine block.

**Last verified**: 2026-05-28 (Tier 3b ship; `evaluationEngine.ts:1198`).

### #65. UX-bug investigations on auth / nav / redirect surfaces must grep for adjacent validation helpers

When fixing a UX bug on an authentication, navigation, or redirect-handling flow, grep the surrounding file for any neighbouring validator / sanitiser / safe-path helper before declaring the fix complete. The adjacent helper may be present, plausible-looking, and either (a) never called from the site you're editing, or (b) weak under its own rules. A UX-only fix that ignores it leaves the security smell in place — sometimes a worse one than the UX bug.

```ts
WRONG: // login.svelte — UX fix only, no scan for sibling validators
async function navigateAfterLogin(redirectUrl: string) {
  await goto(redirectUrl !== 'dashboard' ? redirectUrl : dashboardPath);
  // Ship it — bug fixed, deep-link preserved.
  // (Doesn't notice that the file imports an unused `isSafeRedirect` from
  // 2024 whose allowlist permitted /api/... and // bypasses.)
}
```

```ts
RIGHT: // Step 1 — grep adjacent validators in the file BEFORE writing the fix:
//   grep -n "isSafe\|safeRedirect\|sanitize\|validate" src/routes/(legal)/login/...
// Step 2 — discover legacy `isSafeRedirect` helper (weak rules, never called),
//          replace with strict `safeRedirectPath`, drop the legacy, lock with
//          a file-header rule + negative-check tests.
const safe = safeRedirectPath(redirectUrl, dashboardPath);
await goto(safe);
```

**Why this is the right shape:**

- **Adjacent code is the highest-priority neighbour.** A UX bug on `/login` proves you are reading `login.svelte`. Whatever security-adjacent helpers it imports or defines are the cheapest possible review surface — you're already in the file.
- **Two classes of regression caught.** (a) Validator exists but isn't wired to the site you're editing — silent gap. (b) Validator is wired but its rules are weak — false confidence. Both surface on the same grep.
- **Trade-off is bounded.** The grep takes 5 seconds. The cost of missing the smell can be a CVE.

**Detection:**

Surfaced 2026-05-29 (`0372e6c6`) — the operator-at-leisure deep-link OTP redirect bug was a UX issue. While tracing it I found `isSafeRedirect` (legacy domain-allowlist helper) in the same file: never called on the nav site AND its allowlist would have matched `/api/...` / `//<protocol-relative>` even if called. The bug fix shipped a strict `safeRedirectPath` and dropped the legacy in the same commit — but only because the grep happened. A narrow UX-only fix would have left the open-redirect in place.

**Enforcement:**

Heuristic — apply when working on any of these surfaces:

```bash
# Auth / nav / redirect file you're editing — grep ADJACENT validators
grep -nE "isSafe|safeRedirect|sanitize|validate|allowlist|whitelist|safelist" "<file>"

# Specifically for redirect / window.location / goto sites
grep -rnE "window\.location\.href\s*=|goto\(" "<file>" | head -20
# Verify each call wraps its target through a strict same-origin validator
```

No CI lock — this is an investigative heuristic, not a code shape. Codifying it: when a session's diff touches any file matching `src/routes/**/(login|signup|auth|onboarding)/**` or imports from `$app/navigation`, the session MUST log the adjacent-validator scan in its `/end` notes.

**Last verified**: 2026-05-29 (`0372e6c6` commit — discovered `isSafeRedirect` legacy + fixed both UX bug and pre-existing open-redirect together).

### #66. Negative-check regexes must target USAGE shapes, not bare identifier strings

When you write a CI lock asserting "this identifier is gone from the codebase" (the removal-lock pattern from `cb0f3139` annual-billing revert / `c951ed09` Tier 3b guarantor / `b9d2ed81` annual-billing revert tests), match the **usage shape** — `type Foo`, `<Foo>`, `getFoo(`, `s.bar`, `.cycle-toggle` — NOT the bare identifier. Bare-identifier matches trip on comments, in-place removal-doc lines, JSDoc references, and import paths that mention the name even after the symbol itself is gone.

```ts
WRONG: // pricingFenceHelpers.test.ts — removal lock for the annual cycle
const src = readFileSync('src/lib/config/billing.ts', 'utf8');
expect(src).not.toMatch(/BillingCycle/);
// FAILS — the file STILL contains the comment:
//   // BillingCycle / ANNUAL_PRICE_MULTIPLIER / getAnnualPrice / getAnnualSavings
//   // removed 2026-05-29 — see commit cb0f3139 if product reverses.
// The removal documentation IS the regression signal we want to keep!
```

```ts
RIGHT: // Match the usage shape, not the bare name
expect(src).not.toMatch(/type BillingCycle\b/);     // type declaration
expect(src).not.toMatch(/<BillingCycle>/);          // type usage
expect(src).not.toMatch(/getAnnualPrice\s*\(/);      // call site
expect(src).not.toMatch(/ANNUAL_PRICE_MULTIPLIER\s*[:=]/);  // const decl
expect(src).not.toMatch(/s\.final_amount\b/);        // property access
```

```ts
ALSO RIGHT: // Tier 3b — negative-check on the engine block
const block = readFileSync('src/lib/ruleEngine/evaluationEngine.ts', 'utf8')
  .split('// Step 8c')[1]?.split('// Step 8d')[0] ?? '';
expect(block).not.toMatch(/s\.final_amount/);  // usage shape, not bare 'final_amount'
```

**Why this is the right shape:**

- **Decision documentation is durable; identifier mentions are not.** When a symbol is removed, the right pattern is to leave an in-place comment marking the date + commit + re-add path. A bare-identifier negative-check destroys this institutional memory by failing on the very comment that explains why the symbol is gone.
- **The bug surfaces twice on the same shape.** Once when the removal lock first ships (fails CI on its own documentation), once when the next developer adds a re-add comment ("considered re-adding `BillingCycle` for biennial billing — see ADR-XXXX"). Both are valid; the test should care about USAGE.
- **Two classes of acceptable false-positive remain.** `import` paths and `from '...'` lines mentioning the symbol's module are fine for the bare grep too — but if those import the now-removed symbol, the call site (also caught by the usage-shape pattern) will fail. So the usage-shape match catches strictly less and strictly enough.

**Detection:**

Repeated three times in close succession:
- 2026-05-29 (`cb0f3139` annual-billing revert tests — first draft used `expect(src).not.toMatch(/BillingCycle/)`, failed on the in-place removal comment, fixed to `type BillingCycle` / `<BillingCycle>` / `getAnnualPrice(`).
- Same day later — `expect(src).not.toMatch(/redirectUrl/)` would have tripped on `safeRedirectPath(redirectUrl, ...)` call sites; the strict version was `expect(src).not.toMatch(/= redirectUrl\s*!==/)` (the vulnerable expression shape).
- 2026-05-28 (`c951ed09` Tier 3b) — `expect(block).not.toMatch(/final_amount/)` would have tripped on the comment explaining why we DON'T use `final_amount`; correct version is `s\.final_amount` (property-access shape).

**Enforcement:**

No grep — this is a test-design rule. When reviewing a PR that adds a `expect(...).not.toMatch(/X/)` assertion:

1. Look at `X` — is it a bare identifier, or is it a usage shape (`type X` / `<X>` / `X(` / `.X` / `X:` / `X =`)?
2. If bare, ask whether the symbol's NAME would legitimately appear in (a) removal-decision comments, (b) ADR references, (c) imports that resolve to a different export, (d) JSDoc cross-references.
3. If any of (a)-(d) apply, tighten the pattern to the usage shape.

**Last verified**: 2026-05-29 (three same-day occurrences this session).

---

### #67. Multi-year self-employed income calc must use "average of last TWO FILED ITRs" (not all-years average) — gated on the per-year `itrFiled` flag, not value-presence alone

`payloadEnricher.ts` `case 'professional_practice'` read `inc.netProfessionalIncome` / `inc.averageMonthlyReceipts` / `inc.averageMonthlyExpenses`. The live form (`profileFormConfig.ts` `PROFESSIONAL_INCOME_FIELDS`) emits NONE of those keys — it emits `inc.financialsTable.netProfitArray` / `depreciationArray` / `grossReceipts` + a per-year `itrFiled: boolean[]`. So every Professional Loan submission returned `0` from this branch → `_total_gross_monthly: 0` → FOIR-eligible amount 0 → every lender RED → no offers. The contract drifted when the professional form was migrated to the table shape but the enricher was never re-pointed.

**The fix is not "read the right keys" alone** — owner audited the math and corrected the policy:

- Take the **first TWO valid filed years** (positions 0 and 1, where position 0 is the most recent year per form column ordering), average them, divide by 12.
- "Valid filed year" = `itrFiled[i] === true` AND `netProfit[i]` is a real number (`typeof === 'number' && Number.isFinite`). The double-gate matters because the form can ship inconsistent state (e.g., `itrFiled` flag still `true` while the corresponding net-profit cell is `""`). Trusting one signal alone misclassifies; trusting both filters gracefully.
- 3rd-year + current-FY-in-progress cells are collected for **trend/vintage signal**, not income calc. Engine emits a separate `trend: 'growing' | 'flat' | 'declining'` flag per `_computed._income_signals[]` entry, computed over the full filed-year history (avg YoY %, ±5% threshold).
- **April-September case**: many individuals haven't filed their FY-just-ended ITR yet (deadline July 31 for individuals, Sept 30 for audited). The form sets `itrFiled[0] = false` for that year. Engine rolls to positions 1 + 2 (last two ACTUALLY filed years). Operators don't get penalized for the calendar.
- **Loss years participate in the average** (owner answer 2: `(a) average them`). Negative-net-profit years reduce but don't disqualify. Two-loss-year average clamps to `0` to avoid downstream FOIR/EMI math weirdness.
- **One filed ITR only**: use it as monthly income AND raise `limited_vintage: true` on the signal record. Lender rules may require ≥2 filed ITRs (some accept with haircut, some reject).
- **Declining trend still averages** (owner answer 3) — the engine doesn't take "lower of two"; it averages and lets the `trend = 'declining'` flag surface for lender comfort. Lenders that want "lower-of-two" can derive it from `_income_signals[]` themselves.

```ts
WRONG: // payloadEnricher.ts:146-151 — pre-fix
case 'professional_practice':
    return (
        (inc.netProfessionalIncome as number) ??
        ((inc.averageMonthlyReceipts as number) ?? 0) -
            ((inc.averageMonthlyExpenses as number) ?? 0)
    );
// `inc.netProfessionalIncome` is undefined, falls through to
// `(0 ?? 0) - (0 ?? 0)` = 0. Always returns 0 in production.
```

```ts
RIGHT: // Mirror form contract + owner policy
case 'professional_practice':
    return computeMultiYearMonthly(inc).monthly;

// where computeMultiYearMonthly walks netProfitArray + itrFiled, takes
// first 2 valid (itrFiled === true AND numeric) positions, averages,
// divides by 12, and clamps to >= 0.
```

**Foreign-salaried director / partner — sibling bug, also fixed here:**

`director_company` / `business_partnership` have TWO paths: standard (Indian firm) emits `drawsSalary` / `receivesProfit` / `monthlySalaryAmount` / etc., while the salaried path (foreign-company director, foreign-firm partner) emits ONLY `grossMonthlySalary` + `netMonthlySalary`. Old code returned 0 for the salaried path → no offers for these segments. Now:

- Detect foreign salaried entries by signature: `grossMonthlySalary` set AND none of the standard-path keys populated. Per-entry signal carries `is_foreign_salaried: true`.
- Use **NET** monthly salary (post-foreign-tax, credited-in-India) — that's what lenders actually evaluate for foreign income. Falls back to gross if net wasn't captured.
- Engine produces three NEW `_computed` fields lenders can read for differential treatment:
  - `_income_signals: IncomeSignal[]` — per-entry metadata (trend, limited_vintage, is_foreign_salaried, gross_monthly)
  - `_total_foreign_salaried_monthly_net: number` — sum of net across foreign-salaried pooled entries (the figure flowing into `_total_gross_monthly`)
  - `_total_foreign_salaried_monthly_gross: number` — sum of gross (lenders that evaluate on gross with their own haircut)
- `_total_gross_monthly` stays unchanged in behaviour — foreign income still flows into the total so existing lender rules don't break. New flags are additions, not replacements. Each lender rule doc can choose (post PMS work) to subtract foreign for FOIR, apply a custom haircut, or reject the case outright.

**Why this is the right shape:**

- **The form is the source-of-truth for income-entry shape.** `profileFormConfig.ts` declares what each profile emits per-key; the enricher consumes those keys. Any drift = the consumer reads `undefined` and silently returns 0 instead of failing loudly.
- **Double-gate on filed-year validity is critical.** Form data can be inconsistent: `itrFiled[3] = true` with `netProfitArray[3] = ""` is common when operators tick the boolean but skip the value. Single-gate logic (numeric-only OR itrFiled-only) trips on this; the AND of both filters cleanly.
- **Per-year `itrFiled` matters because of calendar timing.** The April–September gap is a real operational reality for Indian DSA cases — most non-audit-required individuals haven't filed their FY-just-ended ITR yet. Index-based heuristics ("always use [0] and [1]") penalize these operators for the calendar.
- **Trend as a separate flag is the right abstraction.** Embedding "growing/declining" judgment into the income calc itself would couple the calculation to a lender-policy concern. Keep the math simple (average two years), expose the trend, let lenders decide what to do with it.
- **Test fixtures must use the live form shape OR THIS BUG NEVER SURFACES IN CI.** Pre-fix `payloadEnricher.test.ts` fed the legacy flat shape (`averageMonthlyReceipts: 200000, ...`) — so the test passed green against the broken branch. Same for `incomeAssessorV2.test.ts` and the synthetic data generator in `incomeEntryPool.ts`. **Three places had to be updated to match the form.** When the form schema changes, the test fixtures + generators are part of the same contract surface.

**Detection:**

Reported by team member 2026-05-29 (`bug_fix.docx`) — Professional Loan submissions returning no offers from a clean ₹40L application with ₹3.5L/3.4L/3.0L net profit history. Audit of the same function class surfaced the foreign-salaried path gap in `director_company` / `business_partnership`. Owner's domain review of the first-pass fix corrected the income-calc rule from "all-year average" to "average of last 2 filed ITRs", added the trend signal, and required `itrFiled`-gated year selection to handle the April-September calendar gap.

**Enforcement:**

Pre-flight greps (CLAUDE.md §4):

```bash
# Stale flat-shape reads (Pitfall #67) — should be 0 in payloadEnricher.ts
grep -n "inc.netProfessionalIncome\|inc.averageMonthlyReceipts\|inc.averageMonthlyExpenses" \
  src/lib/ruleEngine/payloadEnricher.ts  # 0 expected
```

Authoritative CI tests (live in this commit):
- `payloadEnricher.test.ts`:
  - `business_proprietorship: averages first two filed ITRs / 12 (owner policy 2026-05-29)`
  - `professional_practice: averages first two filed ITRs / 12 (bug report payload)`
  - `multi-year profile: itrFiled[0]=false (April–Sept case) shifts the window to positions 1 & 2`
  - `multi-year profile: only one filed ITR available raises limited_vintage signal`
  - `multi-year profile: loss year participates in average, negative result clamps to 0`
  - `multi-year profile: trend = growing when avg YoY > +5%`
  - `multi-year profile: trend = declining when avg YoY < -5%`
  - `multi-year profile: trend = flat when avg YoY is within ±5%`
  - `director_company foreign salaried: uses NET salary in monthly income`
  - `business_partnership foreign salaried: same NET-preferred treatment`
  - `director_company foreign salaried: net missing → falls back to gross`
  - `foreign salaried totals: sums net + gross across multiple foreign entries`
  - `domestic director (standard path): NOT flagged as foreign salaried`
- `incomeAssessorV2.test.ts`:
  - `business_proprietorship: averages first two filed ITRs / 12 (owner policy)`
  - `professional_practice: averages first two filed ITRs / 12 (owner policy)`
  - `professional_practice: bug-report payload (current-FY empty, 3 filed ITRs)`
  - `professional_practice: April–Sept case where latest year ITR not yet filed`

**Follow-ups not yet addressed (out of scope for this hotfix, tracked separately):**

1. **Applicant-selection heuristics still read the stale flat keys** — `suggestPrimaryApplicant.ts:136`, `plApplicantSelector.ts:211`, `SuggestPrimaryBanner.svelte:129`. Affects who's ranked as primary, not whether offers appear. Quiet bug.
2. **Static-scan test: every `profileFormConfig.ts` profile type must have a matching enricher branch reading keys the form actually emits.** Would have caught the original migration drift. Pattern: read `getIncomeFieldsForProfile()` for each profile, intersect with enricher switch-case keys, assert non-empty intersection.
3. **Depreciation+interest add-back** — `business_proprietorship` + `professional_practice` average Net Profit only, ignoring the `depreciationArray` that the form collects for exactly this purpose. Standard self-employed gross = Net Profit + Depreciation + Interest. Probably understates income by 20-40%. Product decision needed.
4. **ITR-first redesign** — owner-raised insight 2026-05-29: ITR is filed once inclusive of all income types, so the current "fill each profile separately" model invites operator double-counting + doesn't differentiate ITR-accounted vs cash income for haircut purposes. Spec deferred until after RM questionnaire Pass 2.
5. **Lender rule docs consuming new fields** — `_income_signals[].trend`, `_income_signals[].limited_vintage`, `_income_signals[].is_foreign_salaried`, `_total_foreign_salaried_monthly_net/gross` are all available for lender rule authoring. PMS team work: add per-lender policies (haircut for foreign income, gating on `limited_vintage`, declining-trend deviation rules, etc.).
6. **UI surfacing** — file builder / offer cards should surface the trend flag ("Growing business +8% YoY") and the limited-vintage warning. Separate UI ticket.
7. **"Volatile" as a 4th trend value** — owner deferred for this hotfix (3 values suffice). Add later if PMS or risk team wants to distinguish mixed-direction YoY patterns (e.g., `[40L, 30L, 50L]` → currently 'flat', could be 'volatile').

**Last verified**: 2026-05-29 (hotfix commit, this session — corrected policy after owner review).

### #68. `CSFLE_ENABLED='true'` IS the switch — there is NO "code shipped but encryption dormant" intermediate state

The CSFLE feature flag has a binary contract that the implementor of the 2026-05-19 morning-close handoff misread. `src/lib/server/csfle/client.ts:getClientEncryption()` only short-circuits to the passthrough/null path when `env.CSFLE_ENABLED !== 'true'`. Once the env var is `'true'` AND `QE_LOCAL_MASTER_KEY` is set to a valid 96-byte key AND the native binding `mongodb-client-encryption` loads, EVERY call to `encryptValue()` / `decryptValue()` is real — there is no "DEKs haven't been initialized yet, so this is still a no-op" middle ground.

```ts
WRONG mental model (captured verbatim in SESSION-HANDOFF.md:2210 on 2026-05-19):
// "Production stable (all new code gated behind CSFLE_ENABLED='true' which
//  is set in Vercel but the DEK init script has NOT been run — so encryption
//  is still a no-op passthrough until the operator flips that final switch)."
//
// There is no "final switch". CSFLE_ENABLED='true' IS the switch. If DEKs
// don't exist, encrypt() throws 'key not found'. If DEKs exist but were
// minted with a different master key, encrypt() throws MongoCryptError:
// HMAC validation failure. Either way: 500 on every fresh login that hits
// findUserByMobile / findUserByEmail / findUserByPan.
```

```ts
RIGHT — the actual rollout order is non-negotiable:
// 1. Generate a 96-byte CMK once. Store it durably (1Password etc.) AND set
//    QE_LOCAL_MASTER_KEY on Vercel. Losing it later orphans every DEK forever.
// 2. Run sec2-init-deks against the target Atlas cluster. Verify 10 DEKs
//    exist in encryption.__keyVault with masterKey: { provider: 'local' }.
// 3. Run the user/snapshot backfills (sec2-backfill-users + sec2-backfill-snapshots).
// 4. ONLY THEN flip CSFLE_ENABLED='true' on Vercel + redeploy.
//
// Reverse the order even ONCE and prod auth 500s immediately.
```

**Root cause:** the flag-gating code reads as if "CSFLE off = passthrough" is the safe fallback, leading the implementor to conclude "we can flip the flag now because the rest isn't wired yet." But the flag and the wiring are coupled — every consumer call site (`findUserByMobile` in `detect-roles`, `verify-otp`, `signup`, every onboarding/admin/RM route migrated in SEC-2 Phase B) goes through `encryptValue` unconditionally; whether that call short-circuits depends ENTIRELY on the env var. There is no per-row "is this row encrypted yet?" check that gates the encrypt path.

**Why the breakage stayed invisible for 13 days:**

The Vercel screenshot (2026-05-31) shows `CSFLE_ENABLED` was added across Production / Preview / Development on 2026-05-18 at 02:00 UTC (07:30 IST). DEKs were minted in production `encryption.__keyVault` on 2026-05-19 at 08:41 UTC (per `creationDate` field on all 10 DEK documents). For the next 13 days production looked fine because:

1. **The native binding `mongodb-client-encryption` wasn't actually loading on Vercel** under pnpm 10's strict `onlyBuiltDependencies` policy (Pitfall #48). On every cold-started function instance, the first call to `getClientEncryption()` reached `nodeRequire('mongodb')` + `new ClientEncryption(...)` and one of those threw. The `getClientEncryption` function sets `initAttempted = true` BEFORE its potentially-throwing init block, so every subsequent call on the same warm instance returned `null` and `encryptValue()` passthrough'd. Login worked on instance N+1+ after the first failed N.
2. **Existing user sessions held 7-day refresh tokens.** The `secureFetch` scheduler refreshes silently in the background and never re-enters the OTP/`detect-roles` flow. Only a fresh OTP login hits the encrypt path.

Both masks lifted on 2026-05-31. Commit `70862a9f` added `mongodb-client-encryption` + `protobufjs` to `pnpm.onlyBuiltDependencies` (the legitimate Pitfall #48 fix). The next no-cache Vercel redeploy actually built the native binding for the first time → `getClientEncryption()` now succeeds on first call → `encrypt('9811556664', 'mobile-key')` actually runs → libmongocrypt loads the `mobile-key` DEK from the key vault → tries to unwrap it using the current Vercel `QE_LOCAL_MASTER_KEY` → HMAC mismatch (because the master key value at this moment is different from the value used on 2026-05-19 when the DEKs were minted locally) → 500 on every fresh login.

**Detection:** Surfaced 2026-05-31 P0 production-down incident. Owner reported "Failed to detect roles" banner on www.rinn.in login. Temp debug patch (`5e5fccfd`) exposed `MongoCryptError: HMAC validation failure` from `ClientEncryption._encrypt`. Local diagnostic (`scripts/diagnose-csfle-state.mjs`, this session) confirmed 10 DEKs in vault, 0 encrypted rows in any of the 4 auth collections (44 PII rows total, all plaintext numbers/strings), owner mobile exists in all 4 collections plaintext. Fix: unset `CSFLE_ENABLED` on Vercel `rinn` project Production env, redeploy — login back instantly.

**Enforcement:**

Heuristic, not code-shape — no CI lock possible because the failure is env-state, not code. Apply this discipline whenever the CSFLE_ENABLED state changes anywhere:

1. **Before flipping `CSFLE_ENABLED='true'` on any environment**: confirm via `node scripts/diagnose-csfle-state.mjs` (this session's read-only diagnostic, kept in `scripts/`) that the target cluster's `encryption.__keyVault` has 10 DEKs minted with the master key currently set on that environment's `QE_LOCAL_MASTER_KEY`. If the DEKs were minted with a DIFFERENT master key (HMAC test fails on a sample encrypt), the encrypted-data state is broken and you must either restore the original master key OR re-mint DEKs against the current key (only safe if no data is encrypted yet).
2. **After flipping `CSFLE_ENABLED='true'`**: do a real fresh-OTP login in incognito on the deployed environment within 5 minutes. Don't rely on existing sessions to "verify" the deploy — refresh tokens hide the break.
3. **Never trust a session-close note that says "CSFLE_ENABLED is set but DEKs aren't, so it's a no-op."** That sentence is the lie this pitfall exists to document.

**Last verified**: 2026-05-31 (this session — root-caused + fixed).

---

### #69. BT+Top-up dual-tenure math is currently HARDCODED for all lenders — real-world treatment is bank-dependent

The dual-tenure FOIR / EMI calculation in `evaluationEngine.ts:854-1086` fires for every BT+Top-up case at every lender, gated only on `loanType === 'Balance Transfer With Top-up'` plus the presence of the four BT-specific payload fields. The fix was authored 2026-05-28 (commit `8e73d2cc`, BUG-E from a senior-teammate audit) to address a real ~₹12k/mo EMI under-statement at lenders whose backend treats BT+Top-up as TWO SEPARATE loans with different tenures (base BT 15-20yr, top-up 3-7yr).

**The hardcoded assumption is wrong for two other lender behaviours that exist in the wild:**

1. **Single-loan-backend lenders** open ONE combined account with one tenure. For these, single-tenure math is correct. Current engine OVER-states their EMI estimate, lighting cases AMBER/RED that should be GREEN.
2. **Conditional lenders** flip per case. The most common trigger: when the customer's chosen base tenure fits within the lender's top-up tenure cap (e.g. HL: top-up cap 15yr, customer's base 12yr → both fit → collapses to single), the lender opens one account. When base exceeds the top-up cap, they must split. Same lender, same product, different cases, different backend → different math.

```ts
WRONG (current state — evaluationEngine.ts:899):
// Universal gate — assumes ALL BT+Top-up lenders use dual-tenure backend
const isBTTopUp = String(lt.loanType ?? '') === 'Balance Transfer With Top-up';
const dualTenureEligible =
    isBTTopUp &&
    !isCreditLine &&
    baseBtPrincipal > 0 &&
    topUpAmountReq > 0 &&
    baseBtTenureMonths !== undefined &&
    topUpTenureMonths !== undefined;
// Lender's actual backend structure is invisible to the gate.
```

```ts
RIGHT (deferred future implementation — design preserved here for the audit
session that ships it):

// 1. Extend ParsedLenderRuleDocument with a per-lender treatment field:
interface ParsedLenderRuleDocument {
    // ... existing top-level policy flags (cibilScope, cibil_floor,
    //     guarantor_acceptance) ...

    /**
     * BT+Top-up backend structure policy — bank-dependent.
     *  - undefined         → defaults to 'dual_tenure' (preserves current
     *                        behavior; audit pending for this lender)
     *  - 'single_tenure'   → always single-tenure math regardless of case
     *  - 'dual_tenure'     → always dual-tenure math regardless of case
     *  - {single_when}     → JSON-Logic predicate over the payload; true
     *                        means single-tenure for this case
     */
    bt_topup_treatment?:
        | 'single_tenure'
        | 'dual_tenure'
        | { single_when: object };
}

// 2. Resolve the (case, lender) treatment before the dual-tenure gate:
function resolveBtTopupTreatment(
    policy: ParsedLenderRuleDocument['bt_topup_treatment'],
    payload: LoanApplicationPayload,
    lenderId: string
): { mode: 'single_tenure' | 'dual_tenure'; source: 'default' | 'static' | 'conditional' } {
    if (policy === undefined) return { mode: 'dual_tenure', source: 'default' };
    if (typeof policy === 'string') return { mode: policy, source: 'static' };
    try {
        const single = jsonLogic.apply(policy.single_when, payload);
        return { mode: single ? 'single_tenure' : 'dual_tenure', source: 'conditional' };
    } catch (err) {
        logger.warn(
            { lender_id: lenderId, err: String(err) },
            '[EvaluationEngine] bt_topup_treatment.single_when failed — defaulting to dual_tenure'
        );
        return { mode: 'dual_tenure', source: 'default' };
    }
}

// 3. Fold into dualTenureEligible (the existing 3 use sites at lines 923, 938,
//    1073 inherit automatically):
const { mode: btTopupMode, source: btTopupSource } =
    resolveBtTopupTreatment(ruleDoc.bt_topup_treatment, payload, ruleDoc.lender_id);

if (isBTTopUp && !isCreditLine && btTopupSource === 'default') {
    logger.info(
        { lender_id: ruleDoc.lender_id },
        '[EvaluationEngine] bt_topup_treatment unset — defaulting to dual_tenure (audit pending)'
    );
}

const dualTenureEligible =
    isBTTopUp &&
    btTopupMode === 'dual_tenure' &&   // ← NEW per-case lender policy
    !isCreditLine &&
    baseBtPrincipal > 0 &&
    topUpAmountReq > 0 &&
    baseBtTenureMonths !== undefined &&
    topUpTenureMonths !== undefined;

// 4. Update the BUG-E warning so it only fires for lenders that WANT dual
//    but received incomplete inputs (not for intentionally single_tenure lenders):
if (isBTTopUp && !isCreditLine && btTopupMode === 'dual_tenure' && !dualTenureEligible) {
    // existing warn block — unchanged
}
```

**Example: bank's conditional rule modelled with `single_when`:**

```json
{
  "bt_topup_treatment": {
    "single_when": {
      "<=": [
        { "var": "loanTransaction.newTenure" },
        { "*": [{ "var": "loanTransaction.topUpTenure" }, 12] }
      ]
    }
  }
}
```

This says: "Single-tenure when the customer's chosen base tenure (in months) is ≤ the top-up tenure cap (years × 12)." Base 12yr + cap 15yr → `144 ≤ 180` → single. Base 20yr + cap 15yr → `240 ≤ 180` is false → dual.

**Why this is deferred (not shipped in S213):**

The flag is only useful once each lender's actual backend treatment is audited and recorded in their rule doc. Until that audit happens (likely with the lender-policy team's input), the flag does nothing but add a complexity scaffold:

- Engine code grows a discriminated union, a JSON-Logic resolver, and conditional branches that all collapse to the current "dual_tenure" path because no rule doc sets the field.
- Test surface doubles to cover both paths even though only one fires today.
- Sample / real rule docs all need updating for documentation clarity.
- Operators see info-level log spam for the default path until audit-classification rolls out lender-by-lender.

Better discipline: keep the engine simple today (with this pitfall documenting the assumption), ship the per-lender flag as a focused refactor when the lender audit is actually in scope. The design above is preserved verbatim so the future implementer doesn't redesign from scratch.

**Detection (heuristic — no automated lock):**

```powershell
# Anyone adding new hardcoded loanType gates against 'Balance Transfer With Top-up'
# outside the existing dual-tenure block should re-read this pitfall first.
Select-String -Path "src/lib/ruleEngine/**/*.ts" `
  -Pattern "Balance Transfer With Top-up" `
  | Where-Object { $_.Path -notmatch "evaluationEngine\.ts" }
```

Any new lender-rule-touching code referencing the literal string outside `evaluationEngine.ts` is a smell — it may be re-encoding the same universal assumption this pitfall warns about.

**Symptom shape (for the audit session that ships the fix):**

- Single-loan-backend lender's traffic light is wrong: customer with affordable case lights AMBER/RED at lender X but GREEN at otherwise-equivalent lender Y. Investigation reveals lender X's actual policy is single-tenure but the engine computed dual-tenure EMI.
- Cases where customer's base tenure ≤ top-up tenure cap show a tighter FOIR than the same case at a different lender. Operations sees AMBER lights that shouldn't be — root cause is the wrong math for the lender's actual backend.

**Reference for the audit session:**

- The full design is in this pitfall body — discriminated union + JSON-Logic resolver + 3-source resolution tag (`'default' | 'static' | 'conditional'`).
- The 3 engine use sites that depend on `dualTenureEligible` (`evaluationEngine.ts` lines 923, 938, 1073) all inherit the fix automatically when the gate is updated.
- Comment block at `evaluationEngine.ts:854-905` documents the BUG-E history + this future-fix design.
- ADR-0024 (`docs/adr/0024-loan-vocabulary-and-dual-tenure-deferral.md`) records the deferral rationale.
- TECH-DEBT-CLEANUP-2026-05-31.md §6 carries the incoming-debt entry for tracking.

**Last verified**: 2026-06-02 (S213 — pitfall authored as part of D8/D9 cleanup; engine state unchanged, design documented for future).

### #70. Tailwind v4 escape-decoder crashes on a backslash-followed-by-6-hex-digits substring in any scanned source file

`@tailwindcss/vite@4.x` content-scans every source file in the Vite build graph — `.md` AND `.ts` / `.svelte` / `.mjs` / `.css` — for utility-class candidates. Tokens shaped like CSS variables (leading `--`) get passed to the escape-decoder `Se()` (`chunk-CT46QCH7.mjs:5382` in `tailwindcss@4.1.18`), whose regex `/\\([\dA-Fa-f]{1,6}[\t\n\f\r ]?|[\S\s])/g` scans for a backslash followed by 1-6 hex digits. When the matched run is 6 hex digits AND the value exceeds `0x10FFFF` (Unicode's max code point = 1,114,111), `Se()` calls `String.fromCodePoint` on the out-of-range value, throws `RangeError: Invalid code point`, and aborts the build with `Plugin: @tailwindcss/vite:generate:build` (or `:serve` for HMR). **Tailwind's error message points only at `src/app.css`, never the file that actually contributed the crashing token.**

> **Meta-note — this pitfall was authored twice in one session.** The first attempt at the WRONG-example code block embedded a literal Windows path with backslashes — saving the file crashed dev HMR within seconds. A subsequent diagnostic probe script written to verify the fix used literal single-backslash test inputs in source bytes — crashed again. Lessons baked in below: never embed the literal trigger sequence in source bytes anywhere. Use prose, forward-slash paths, and `0x<HEX>` notation.

**WRONG** — Windows absolute path embedded in a markdown link, source bytes contain a backslash immediately before a filename whose first 6 chars are hex digits decoding > `0x10FFFF` (e.g. a filename starting with `feedback_` decodes to `0xFEEDBA` = 16,707,002):

> The actual incident was a markdown link in a code-review doc pointing at a Claude Code auto-memory file. The bytes in the doc looked like a normal Windows path: drive letter, then path segments separated by backslashes, ending in a backslash followed by `feedback_diagnose_before_revert.md`. The leading `--` token Tailwind extracted contained that backslash-`feedback` substring; the decoder matched the first 6 chars after the backslash (`f`, `e`, `e`, `d`, `b`, `a`) as hex, decoded to `0xFEEDBA`, exceeded the Unicode max, RangeError, build dies.

**RIGHT** — code-span with a forward-slash path (or no link target at all):

```
`~/.claude/projects/F--TECH-DigitalDSA-REPOs-DigitalDSA-V3/memory/feedback_diagnose_before_revert.md`
```

Forward slashes never trigger the escape-decoder. The link target wasn't resolvable from the repo anyway, so dropping the `()` link wrapper loses nothing.

**Why this is recurrent risk:** the Claude Code auto-memory directory uses Windows backslash paths in its on-disk references on Windows hosts. Anyone pasting one into a doc — review notes, ADRs, runbooks, PR descriptions, session-close summaries — recreates the bug if the filename's first 6 chars decode to a hex value exceeding `0x10FFFF`. The specific filename starting with `feedback_` isn't a special case; `0xFEEDBA` just happens to be the value spelled by the first 6 hex chars of "feedback". ANY filename starting with 6 chars that are all in `[0-9a-fA-F]` and decode > `0x10FFFF` is unsafe. Examples (described without writing the literal trigger): a file starting with `200000_` preceded by a backslash, a file starting with `abcdef_`, a file starting with `ffffff_`. Conversely, `0x10FFFF` is the largest 6-hex value that decodes safely.

**Detection:**

The simplest reliable gate is `pnpm build` itself — it catches the bug in ~15s locally and reports "Invalid code point N" where N is the decoded value. Grep gates are best-effort (the precise regex would need to model Tailwind's consume-and-advance behaviour, which over-counts simple greps); manual review of doc PRs that include paths or escape-looking sequences is the practical complement.

See [`PREFLIGHT-GREPS.md`](PREFLIGHT-GREPS.md) §69 for the grep recipes (best-effort, over-inclusive — use as a triage filter, not a final gate).

**Enforcement:**

1. **Code review** on any doc PR that includes a Windows path or a backslash-followed-by-letters/digits sequence.
2. **`pnpm build` locally** before pushing any doc that contains a path. Pre-commit hook does NOT run `pnpm build`; only pre-push + Vercel CI surface the crash, by which point the bad commit is already on `main`.
3. **Recovery if it lands on `main`:** the failing file is usually visible only via patching Tailwind's `Se()` to log its input (the function lives at column 5382 of the `chunk-CT46QCH7.mjs` file in `tailwindcss@4.1.18`). The owner-friendly variant: grep the diff since the last successful deploy for Windows paths or backslash-prefixed filenames whose first 6 chars are all hex digits — the failing file is almost always among the matches. Fix forward by switching to forward-slash representation; do not double-escape backslashes (that works but adds visual noise and confuses future editors).
4. **When documenting THIS pitfall** (or anything else that references the bug): never write the literal trigger substring in source bytes. Use prose ("backslash followed by 6 hex digits decoding to `0x<HEX>`"), use `0x<HEX>` notation for hex values, use forward-slash paths in code examples. The author of this entry self-triggered the bug TWICE while writing it — see meta-note.

**Last verified:** 2026-06-01 — root-caused + fixed in commit `f6fcc7db`; pitfall write-up rewritten after two self-triggers in the same session.

### #71. Form-page-level payload mutations don't reach the engine — `confirmAndSubmit` reads `formStateJson`, not the local `payload`

In every loan form `+page.svelte` the submission handler builds a local `payload` (or `payloadNew` → `payload`) variable for client-side validation, THEN calls `confirmAndSubmit({ formStateJson: formState.toJSON(), ... })`. The local `payload` is discarded. Any mutation that touches `payload.<field>` or `payload.loanTransaction.<field>` after the snapshot is invisible to the rule engine, the case persistence path, and every downstream consumer. The mutation only affects whatever the client-side validation block does with the local object — usually nothing the user can observe.

This was the silent failure mode behind the 2026-05-31 Plot & Equity payload-patch reform (S215): two conditional patches in [`src/routes/(app)/form/plot-loan/+page.svelte`](../src/routes/(app)/form/plot-loan/+page.svelte) tried to set `payload.loanTransaction.purchaseType = 'Direct Sale'` + `differentATSandPV = 'Yes'` for Plot & Equity Loan cases. They lived next to the validation block, looked normal in review, had a regression-lock test (`plotEquityPayloadPatchLock.test.ts`) asserting their existence, and were referenced in spec drafts as if they were working. They had never reached production — `confirmAndSubmit({ formStateJson })` carries the form-state snapshot, not the patched local. The Plot & Equity engine path (LEND-1 Phase 2) was unshipped so the bad assumption never produced a customer-visible defect, which is the only reason this didn't bite as a real eligibility miscalculation.

**WRONG** — patching the local `payload` after the snapshot, expecting the engine to see it:

```ts
// inside handleSubmit() in plot-loan/+page.svelte (or any +page.svelte)
const payloadNew = { /* ... */ };
let payload;
payload = $state.snapshot(payloadNew) as typeof payloadNew;

if ((currentAnswers as any).loanVariant === 'Plot & Equity Loan') {
  // This conditional fires correctly. But `payload` here is a LOCAL
  // variable that confirmAndSubmit() never reads. The engine receives
  // formState.toJSON() instead — these assignments are silently dropped.
  (payload.loanTransaction as any).purchaseType = 'Direct Sale';
  (payload.loanTransaction as any).differentATSandPV = 'Yes';
}

// ...client-side validation reads `payload`...

const result = await confirmAndSubmit({
  formStateJson: formState.toJSON(), // ← the engine sees THIS, not `payload`
  // ...
});
```

**RIGHT** — pick the canonical layer for the override and edit it there:

1. **Form-state layer** (best when the value is derivable from other form answers + you want the override visible to other showWhen gates / validators):

   ```ts
   // In a $effect or the page's setup, write to formState directly so
   // formState.toJSON() carries the value.
   $effect(() => {
     if (currentAnswers.loanVariant === 'Plot & Equity Loan') {
       formState.setAnswer('differentATSandPV', 'Yes');
     }
   });
   ```

2. **Canonical payload builder** ([`src/lib/utils/payloadBuilder/loanTransaction.ts`](../src/lib/utils/payloadBuilder/loanTransaction.ts)):

   ```ts
   // Where loanAnswers.purchaseType is already read into payload.purchaseType,
   // add the Plot & Equity branch:
   if (loanAnswers.loanVariant === 'Plot & Equity Loan') {
     payload.differentATSandPV = 'Yes';
     // purchaseType handled by the enricher's normalisation table, not forced here
   }
   ```

3. **Engine enricher** ([`src/lib/ruleEngine/payloadEnricher.ts`](../src/lib/ruleEngine/payloadEnricher.ts), `normalizeLoanTransaction()` or the existing `purchaseType` switch):

   ```ts
   // Same shape as the existing rawPt → canonical normalisation block.
   // Use this layer when the override is engine-canonical-only, not
   // something the form layer or other gates need to see.
   ```

Pick the layer based on who else needs to read the override. Form-state is the broadest reach; enricher is the narrowest.

**Why this is recurrent risk:** every loan form has the same handleSubmit shape (`const payloadNew = {...}; let payload = $state.snapshot(payloadNew)`). The pattern looks like an in-flight payload all the way to submission — but the actual outbound payload-construction has already moved to `formState.toJSON()` + the canonical builder chain. New form-page mutations that "patch the payload" reproduce the bug; lock tests that assert the patches exist (instead of asserting they are absent) ratify it.

**Detection:**

Grep, scoped to the form `+page.svelte` files only:

```bash
rg "\(payload(\.loanTransaction)? as any\)\.\w+\s*=" src/routes/\(app\)/form/
rg "payload(\.loanTransaction)?\.\w+\s*=" src/routes/\(app\)/form/
```

Any match in a `handleSubmit` (or analogous submission handler) after the `$state.snapshot(...)` line is a candidate for this pitfall. Common false positives: assignments inside the same `payloadNew = {...}` initializer object, mutations on the `payload.allApplicantDetails[i]` array entries done for delete-fields hygiene (these are also dead vs the engine — but they happen to be no-ops there too, so they're cosmetic, not bugs).

See [`PREFLIGHT-GREPS.md`](PREFLIGHT-GREPS.md) for the canonical recipe slot.

**Enforcement:**

1. **Lock test pattern** — when you have a real reason to patch the engine-bound payload, write the lock at the canonical layer (builder/enricher/form-state effect), NOT at the form page. The plot-loan reform of this pitfall ships a sibling test, `plotEquityPayloadPatchLock.test.ts`, as a **canonical-absence** lock that asserts no `(payload.loanTransaction as any).X = Y` mutation exists in the file (S215 design).

2. **Code review** — for any PR touching a form `+page.svelte` handleSubmit, scan for `payload.<x> = ` lines after the snapshot point. Ask: where does the engine actually read this from? If the answer is "from `formStateJson`" or "from the canonical builder", the mutation is dead.

3. **When introducing a new submission-shape adjustment**, route through one of the three RIGHT layers above. Do not add patches at the form-page level even temporarily — temporary patches turn into permanent dead code very quickly when the failure mode is silent.

**Last verified:** 2026-06-02 (S215) — Plot & Equity payload-patch reform removed the two production examples; new canonical-absence lock test guards against re-introduction in plot-loan only. Other 5 loan forms not audited for this pattern at this date — opportunistic.

---

### #72. `Promise.all` in batch API routes — one bad row 500s the whole response

Endpoints that return a list of items and use top-level `Promise.all` to resolve each item (decrypt a snapshot payload, hydrate a related document, run a per-item async transform) will surface the FIRST rejection as a 500 for the entire endpoint. Healthy items in the same list are wasted — the caller can't see any of them. The bigger the batch, the more catastrophic the impact of one stale/corrupt row.

This pattern bit production on 2026-06-02: `GET /api/cases/[case_id]/snapshots` 500'd whenever a case had ONE snapshot with stale ciphertext (Pitfall #68 fallout — written when `CSFLE_ENABLED=true`, can't decrypt after the master-key state shift). The endpoint mapped every snapshot through `resolveSnapshotPayload` inside a single `Promise.all`. The "Load from Previous Case" modal showed 500s for any case with even one bad row — even though every OTHER snapshot for that case was healthy and the plaintext fallback was sitting right there.

**WRONG** — top-level Promise.all with no per-item resilience:

```ts
const resolved = await Promise.all(
  snapshots.map(async (s) => {
    const payload = await resolveSnapshotPayload(s); // throws on stale ciphertext
    return { ...s, payload };
  })
);
// → first failed snapshot rejects the whole Promise → endpoint 500s
//   → "Load from Previous Case" modal can't show ANY cases
return apiOk({ snapshots: resolved });
```

**RIGHT** — per-item try/catch, surface failures alongside successes:

```ts
const resolved = await Promise.all(
  snapshots.map(async (s) => {
    try {
      const payload = await resolveSnapshotPayload(s);
      return { ...s, payload };
    } catch (err) {
      // Graceful degradation. Bad row gets a marker; good rows render.
      // If a plaintext fallback exists in the row itself, surface it.
      return {
        ...s,
        payload: s.payload ?? null,
        decrypt_error: err instanceof Error ? err.message : 'failed',
        used_plaintext_fallback: s.payload != null
      };
    }
  })
);
return apiOk({ snapshots: resolved });
```

**Why this isn't "swallow errors silently":** the rejected items still carry a `decrypt_error` field that the client can render as "this snapshot can't be loaded" UI. We're not hiding the failure — we're scoping it to the affected row instead of the whole batch.

**When fail-loud IS the right call:** at security boundaries (auth, signature verification, payment validation), `Promise.all` rejection is correct — you don't want to half-process a batch with mixed integrity. The decision rule:

- **UX invariant** (user expects to see a list) → per-item try/catch with degradation
- **Security invariant** (any failure means stop) → top-level Promise.all, fail-loud

**Detection (grep):**

```bash
# Promise.all in API route handlers — needs per-item review
rg "Promise\.all" src/routes/api/**/+server.ts -A 4

# Specifically: Promise.all around an .map(async ...) that calls a function
# known to throw on bad data (resolveSnapshotPayload, decryptValue, etc.)
rg "Promise\.all\([^)]*\.map\(async" src/routes/api
```

Then audit each call: does the consumer expect partial success? If yes, refactor to per-item try/catch. If no (security/integrity boundary), document the choice inline.

**Enforcement:**

- Code review: any new `Promise.all(items.map(async ...))` in a route handler must answer "what's the failure mode when one item rejects?" If the answer is "the user can't see the rest" AND there's no documented security reason, refactor.
- Pattern: prefer `Promise.allSettled` for batch-with-degradation cases, then filter results. It makes the per-item failure path explicit without try/catch boilerplate.

**Last verified:** 2026-06-02 — the snapshots-endpoint regression was fixed in commits `eac11c29` + `dc5b614e` with per-row try/catch + plaintext fallback. Other batch endpoints (lender-applications, results, file-builder) NOT yet audited for the same pattern. Audit them opportunistically when next touched.

---

### #73. Shared modal-state leftover bleeds into newly-mounted `DatePickerYearAndMonth` instances

`MonthYearModal` is rendered once at the layout level; every month-year date field on the page (GST registration date, business vintage anchors, planned-registration month, etc.) talks to it through global state in `src/lib/state/dialog.svelte.ts`. `closeDatePicker` intentionally leaves `selectedDate` + `modalContext` intact so the picked value can still flow to the active wrapper's `$effect` in the post-close microtask. That preservation is correct for the same-instance handshake — but the leftover state crosses re-mount boundaries and any DatePicker that mounts AFTERWARDS with a matching `modalContext` auto-applies the stale `selectedDate` on its first effect run, silently overwriting the new field with the previous entry's date. No user click required.

Bit production 2026-06-03 on Home Loan (`HL-2026-0071`) in the single-applicant Income Details flow: with two `business_proprietorship` entries, picking GST registration date Jan-2025 on entry A caused entry B's GST date input to auto-populate Jan-2025 the moment the user toggled "GST registered? Yes" — and edit-mode was worse, silently overwriting saved entry B's GST date with the last picked value the instant the user clicked the pencil. Cross-applicant slice was protected today by the `applicantIndex` check in the wrapper's routing-match (so multi-applicant flows don't bleed across applicants), but the same-applicant cross-entry slice bled freely.

**WRONG** — wrapper effect that auto-applies any matching `selectedDate` on every mount + change:

```svelte
$effect(() => {
    const d = dialogState.selectedDate;
    if (!d) return;
    const ctx = untrack(() => dialogState.modalContext);
    if (ctx.applicantIndex !== applicantIndex || ctx.questionId !== questionId) return;
    applyMonthYear(d);   // ← fires on FRESH mount too, with stale leftover state
});
```

**RIGHT** — snapshot a monotonic `selectionEpoch` on mount, only react when the epoch advances past that snapshot:

```svelte
let lastSeenEpoch = $state<number | null>(null);

$effect(() => {
    const epoch = dialogState.selectionEpoch;
    if (lastSeenEpoch === null) { lastSeenEpoch = epoch; return; }   // mount baseline
    if (epoch === lastSeenEpoch) return;
    lastSeenEpoch = epoch;

    const d = untrack(() => dialogState.selectedDate);
    if (!d) return;
    const ctx = untrack(() => dialogState.modalContext);
    if (ctx.applicantIndex !== applicantIndex || ctx.questionId !== questionId) return;
    applyMonthYear(d);
});
```

Paired writer-side change in `MonthYearModal.svelte`:

```svelte
function selectMonthYear(month: string) {
    dialogState.selectedDate = `${month}-${currentYear}`;
    dialogState.selectionEpoch += 1;     // ← ticks for every confirmed pick
    dialogState.closeDatePicker();
}
```

**Why an epoch and not state-clearing on close**: the `$effect` is microtask-batched, so the apply runs AFTER `closeDatePicker` returns. If close cleared `selectedDate` or `modalContext` synchronously, the legitimate same-instance apply would miss its own pick. The epoch lets the apply still happen for the active instance while making the leftover state inert for any future mount. A "clear `selectedDate` on same value" alternative also fails — a user genuinely re-picking the same Jan-2025 for a sibling field would be silently dropped.

**Why an epoch and not value-string dedupe**: same-value-as-before is a real user choice (Jan-2025 for entry B even after picking Jan-2025 for entry A). Dedupe-by-string drops it; epoch ticks regardless of whether the picked string changed.

**Why the existing `modalContext.applicantIndex` check wasn't enough**: it WAS enough to block the cross-applicant slice (applicant 0's pick doesn't bleed into applicant 1's DatePicker because the indexes differ). But within a single applicant, two consecutive income entries' GST date pickers both mount with `applicantIndex=0` + `questionId='gstRegistrationDate'` — the routing match passes and the stale value applies. The epoch closes the same-applicant cross-entry slice and provides belt-and-braces for any future callsite that forgets to forward `applicantIndex` correctly (page-level mounts on the secured-loan pages don't forward it today — they happen to be safe only because `isSingleApplicant` gates them).

**Class of bug** — the underlying anti-pattern is "global-state handshake where the writer doesn't tombstone after the read completes." Watch for the same shape in any other layout-level modal that uses dialogState for value transit (color pickers, confirm dialogs returning a structured payload, file-picker results). The fix shape is always: monotonic epoch on the writer + mount-snapshot on the reader.

**Detection (grep)**:

```bash
# Components reading dialogState.selectedDate in an effect MUST gate on selectionEpoch.
grep -rn "dialogState.selectedDate" src/lib/components --include="*.svelte"
# Expected: DatePickerYearAndMonth.svelte ONLY (the canonical wrapper).

# Routing-match check WITHOUT epoch gate (pre-fix shape) — should not reappear.
grep -rEn "ctx\.applicantIndex\s*!==\s*applicantIndex" src/lib/components --include="*.svelte"
# Expected: 1 match inside DatePickerYearAndMonth.svelte, paired with a lastSeenEpoch
# guard. A match without the sibling epoch guard = bug re-introduced.
```

**Enforcement**:
- Code review: any new component that reads from `dialogState` for a value-transit pattern (not just open/close flag) must answer "what happens on mount if the global state is still populated from a previous session?" If the answer isn't "ignored via mount-snapshot or equivalent," apply the epoch pattern.
- No CI lock yet — detection is the grep above. Worth a unit test if this pattern recurs.

**Last verified**: 2026-06-03 — reproduced by owner on `HL-2026-0071` (single-applicant, two business proprietorship entries with GST registration). Fix verified by owner same session.

---

### #74. Browser-emulation libraries (jsdom, happy-dom) in the SSR bundle are a cold-start time bomb

Any HTML/DOM library that emulates the browser server-side (`jsdom`, `happy-dom`, `linkedom` when used for full DOM emulation) pulls native-adjacent optional deps (`canvas`, `html-encoding-sniffer` → `@exodus/bytes`, etc.) that Vite/Vercel cannot resolve cleanly. When `ssr.noExternal` forces such a library to be inlined into the production bundle (often required to bridge CJS/ESM interop on Vercel), the bundler resolves every nested `require()` in the library's source — and emits runtime-stub throws for any optional dep it can't find. Those throws fire at **module-init time** on the first cold start of each Vercel function pod, killing every route that imports the affected chunk. Existing warm pods keep serving until they expire, masking the regression for hours during low traffic.

Bit production 2026-06-04 from ~11:54 IST (S223): `src/lib/utils/sanitizeHtml.ts` used `isomorphic-dompurify`, which on the server backs DOMPurify with `jsdom`. `jsdom/lib/jsdom/utils.js:101` does `exports.Canvas = require("canvas")` inside a try/catch — designed to fail-soft. But because `vite.config.ts` `ssr.noExternal` included `['isomorphic-dompurify', 'jsdom', 'html-encoding-sniffer', '@exodus/bytes']` (added incrementally in `b171d318` + `8bb1b289` for valid CJS/ESM interop reasons), Vite processed jsdom's source directly and emitted a runtime-stub throw in place of the require: `throw new Error('Could not resolve "canvas" imported by "jsdom". Is it installed?')`. That throw fires before jsdom's try/catch even runs. Every form route (`/form/home-loan`, `/form/how-can-we-help`, 6 total) 500'd on first cold-start.

Three fix attempts at the `vite.config.ts` layer failed in succession over ~3 hours:
1. `85e35695` — `ssr.external: ['canvas']`. Doesn't propagate into requires made by `noExternal`'d modules.
2. `2f02768e` — expanded `ssr.external` with MongoDB optional peers. Tangential to the actual problem.
3. `5261393b` — `resolve.alias.canvas` → empty stub. **Fixed canvas resolution at the bundle level** (verified by local-build chunk inspection), but a different module-init throw deeper in the jsdom chunk continued to 500 form pages with no email alert.

The actual durable fix (`6e3eff24`, then cleanup `76c7de73`): eliminate jsdom from the SSR bundle entirely by swapping `isomorphic-dompurify` for `sanitize-html` (pure-JS, htmlparser2-based, ~50 KB minified vs jsdom's ~3 MB + transitive deps). See **ADR-0031** for the architectural decision.

**WRONG** — server-side HTML sanitization that drags jsdom into the SSR bundle:

```ts
// src/lib/utils/sanitizeHtml.ts
import DOMPurify from 'isomorphic-dompurify';   // ← pulls jsdom server-side

export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
```

Paired anti-pattern in `vite.config.ts`:

```ts
ssr: {
    noExternal: ['isomorphic-dompurify', 'jsdom', 'html-encoding-sniffer', '@exodus/bytes']
    // ← drags jsdom + canvas-resolve failure into the SSR bundle
}
```

**RIGHT** — pure-JS sanitizer, no DOM emulation needed:

```ts
// src/lib/utils/sanitizeHtml.ts
import sanitize from 'sanitize-html';

const options: sanitize.IOptions = {
    allowedTags: [...],
    allowedAttributes: { '*': [...], a: ['href', 'target', 'rel'], ... },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src']
};

export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return sanitize(html, options);
}
```

`vite.config.ts` stays clean — no `noExternal` entries for sanitization libs, no resolve.alias shims.

**Root cause**: bundling decisions made under one constraint (CJS/ESM interop on Vercel) created a different problem (optional-dep stub throws). Each subsequent shim treated a symptom; the architectural fix was removing the dep that needed bundling in the first place.

**Detection (grep)**: see PREFLIGHT-GREPS.md §74. All four greps should return empty against `main`. Any match = escalate to a code review against ADR-0031 before merging.

**Enforcement**:
- Code review on any PR that adds a server-side HTML/DOM manipulation library: must justify why a pure-JS alternative (`sanitize-html`, `htmlparser2`, `parse5`, `cheerio`) is insufficient.
- The `vite.config.ts` `ssr.noExternal` array should NEVER include jsdom-adjacent packages going forward. If a transitive dep pulls jsdom in and a Vercel SSR failure surfaces, the response is to remove the offending dep, not add another `noExternal` shim.
- XSS-vector contract tests at `src/lib/testing/__tests__/payloadSanitization.test.ts` ("canonical XSS vector contract" describe block, 6 vectors) lock the sanitizer's behavior contract — any sanitizer swap must keep them green.

**Last verified**: 2026-06-04 — production-down incident resolved by `6e3eff24` + `76c7de73`. ADR-0031 codifies the architectural rule. Retires the prior jsdom-on-Vercel patches (`b171d318` + `8bb1b289` + `85e35695` + `5261393b`) by removing the underlying need.

---

### #75. Stale unique-on-null index on a field nothing writes — silently bricks every insert with E11000 and looks like the feature is broken

A MongoDB collection that carries a **unique** index on a field no current code path writes will silently reject every insert via `E11000 duplicate key error ... dup key: { <field>: null }`. The first row's implicit `null` populates the unique slot; every subsequent insert hits the duplicate-on-null. App code that catches insert failures and proceeds (the standard "non-fatal, log and continue" pattern in many writers) masks the problem. Features that depend on rows landing in that collection — conflict detection, audit trails, session tracking, etc. — appear broken with no clear cause: type-check passes, unit tests pass, the writer reports success-ish, but the collection stays empty.

Bit SEC-10 mid-rollout 2026-06-05 (S225): `recordSession()` in `src/lib/server/account/sessions.ts:174-202` writes to `digitaldsa.sessions` and catches inserts via `try { ... } catch (err) { logger.warn(...); }` — design-correct fail-soft so a Sessions write failure doesn't bring down login. The collection had an orphan `id_1` UNIQUE index from an earlier schema (no current code writes `id`). Every `recordSession()` failed E11000 → warn log → login succeeded but no row landed. Two-browser conflict detection found zero existing rows for the user → `detectConflict` returned `'none'` → no modal, no kick. SEC-10 looked completely broken despite every line of conflict-gate code being correct. Discovered when dev terminal showed `recordSession failed — login proceeds without session row` warnings on every login.

**WRONG** — relying on `ensureIndexes` to be additive-only across the lifetime of the collection:

```ts
// src/lib/database/mongo.ts ensureIndexes()
await Sessions.createIndex({ session_id: 1 }, { unique: true });
await Sessions.createIndex({ user_id: 1, last_seen_at: -1 });
// ← Assumes orphan indexes from prior schemas were dropped by hand.
//   Across N environments + N years, that assumption WILL break.
```

Paired anti-pattern in writers — fail-soft catch that masks the bug:

```ts
try {
    await Sessions.insertOne(doc);
} catch (err) {
    logger.warn({ err, ... }, 'recordSession failed — login proceeds');
    // ← This is good defense, but pair it with a defensive index cleanup.
}
```

**RIGHT** — defensive `dropIndex` loop in `ensureIndexes` that swallows `IndexNotFound` (code 27) for idempotency:

```ts
// src/lib/database/mongo.ts ensureIndexes() — runs on every boot
const STALE_SESSION_INDEXES = [
    'id_1',                // UNIQUE on null — the bug that bricks recordSession
    'userId_1',
    'deviceId_1',
    'expiresAt_1',
    'isActive_1',
    'lastAccessedAt_1'
];
for (const indexName of STALE_SESSION_INDEXES) {
    try {
        await Sessions.dropIndex(indexName);
        logger.info({ collection: 'sessions', index: indexName },
            '[ensureIndexes] dropped orphan Sessions index');
    } catch (err) {
        const e = err as { codeName?: string; code?: number };
        if (e.codeName !== 'IndexNotFound' && e.code !== 27) {
            logger.warn({ err, ... }, '[ensureIndexes] orphan-index drop failed');
        }
    }
}
// Then create the canonical indexes.
await Sessions.createIndex({ session_id: 1 }, { unique: true });
```

Also: one-shot operator script for environments where the boot-time cleanup hasn't deployed yet (`scripts/sec10-drop-stale-sessions-id-index.mjs` in this repo).

**Root cause**: collections accumulate index history across years and schema migrations. App code's `ensureIndexes` is additive-only by convention, but Mongo indexes persist independently of code. A unique-on-null index is the worst variant: it silently breaks every multi-row insert without surfacing a clear error, especially when paired with a defensive fail-soft catch in the writer.

**Detection (grep)**: hard to grep for absence — the pitfall lives in the database, not the code. Two signals:
1. Search dev/staging logs for `recordSession failed` / `E11000 duplicate key` / `dup key: { <field>: null }` patterns. Any match for a field nothing in current code writes = orphan unique index.
2. Run `db.<collection>.getIndexes()` (mongosh or via `MongoClient.db().collection(<name>).indexes()`) and compare against the canonical list in `ensureIndexes`. Any extra index name = orphan candidate.

**Enforcement**:
- For collections that have a known orphan-history (Sessions in this codebase): keep a `STALE_<COLL>_INDEXES` array in `ensureIndexes` with the defensive drop loop above.
- Lock test asserting the array stays populated (Step 1b verification): `expect(src).toContain("'id_1'"); expect(src).toMatch(/STALE_SESSION_INDEXES/); expect(src).toMatch(/IndexNotFound/);` — pattern used in `sessionStatusPollerCanonical.test.ts`.
- When adding a NEW unique index, document in a code comment which field is the de-facto primary key (`session_id` for Sessions) so future schema-migration work doesn't accidentally orphan it.

**Last verified**: 2026-06-05 — discovered + fixed during SEC-10 Commit C smoke. Defensive cleanup runs idempotently on every boot. Six orphans confirmed gone from `digitaldsa.sessions`.

---

### #76. SvelteKit `redirect()` / `error()` thrown from inside a middleware `try/catch` is caught and silently swallowed — control flow lost, looks like a "logs error but doesn't redirect" symptom

SvelteKit's `redirect(status, location)` and `error(status, body)` throw special control-flow objects that the framework recognises ONLY if they bubble all the way out of the request handler. If middleware code (hooks, route helpers, anything wrapping the request) catches them with a broad `try/catch`, the framework never sees the redirect/HttpError — the catch logs it as a generic error and request handling continues with no redirect, no error response, but a misleading "X validation error" line in the log. User-visible symptom: "console shows errors, but the redirect doesn't happen."

Bit SEC-10 instant-kick rollout 2026-06-05 (S225): `handleJWTAuthentication` in `src/hooks.server.ts` wraps its entire body in `try {} catch (error) { logger.error({err: error}, 'JWT validation error'); ... }` — defensive design correct for actual JWT-validation errors. SEC-10 added a hook-level Sessions revoke check that throws `redirect(303, '/?reason=kicked')` when the user's session has been revoked. The catch caught the `Redirect` control-flow object, logged it as "JWT validation error," cleared cookies, and silently swallowed the redirect — the kicked tab stayed on the dashboard with a console.error line and no bounce. Same anti-pattern at the outer `handle()` function's OpenTelemetry root span catch (would have also recorded every 303 as `recordException`-level errors on the OTel trace if the inner catch hadn't gotten to it first).

**WRONG** — broad catch that doesn't distinguish framework control-flow from errors:

```ts
// src/hooks.server.ts (handleJWTAuthentication)
async function handleJWTAuthentication(event: RequestEvent) {
    try {
        // ... JWT verify ...
        // ... cookie reads ...
        // ← SEC-10 added: throw redirect(303, '/?reason=kicked') here
    } catch (error) {
        logger.error({ err: error }, 'JWT validation error');  // ← swallows redirect
        event.locals.user = null;
        event.cookies.delete('accessToken', { path: '/' });
    }
}
```

Same anti-pattern at outer span catch:

```ts
// src/hooks.server.ts (handle) — OTel root span wrapper
try {
    const response = await handleRequest(event, resolve);
    return response;
} catch (err) {
    rootSpan.recordException(err as Error);  // ← false-positive for every redirect
    rootSpan.setStatus({ code: SpanStatusCode.ERROR });
    throw err;  // re-thrown, but already polluted the trace
}
```

**RIGHT** — re-throw SvelteKit's special types BEFORE the error log / recordException:

```ts
import { redirect, isRedirect, isHttpError } from '@sveltejs/kit';

async function handleJWTAuthentication(event: RequestEvent) {
    try {
        // ... body, including possible `throw redirect(303, ...)` ...
    } catch (error) {
        // SvelteKit's redirect() / error() throw special Redirect / HttpError
        // objects that the framework recognises ONLY if they propagate out.
        // Re-throw FIRST so the framework can act on them; anything else is
        // a real error and lands in the log below.
        if (isRedirect(error) || isHttpError(error)) {
            throw error;
        }
        logger.error({ err: error }, 'JWT validation error');
        event.locals.user = null;
        event.cookies.delete('accessToken', { path: '/' });
    }
}

// Outer span wrapper:
} catch (err) {
    // Don't record SvelteKit control-flow as exceptions on the OTel span.
    if (!isRedirect(err) && !isHttpError(err)) {
        rootSpan.recordException(err as Error);
        rootSpan.setStatus({ code: SpanStatusCode.ERROR });
    }
    throw err;
}
```

**Root cause**: SvelteKit's redirect/error use throws as the control-flow mechanism to unwind cleanly through any depth of middleware. Any broad `try/catch` in the middleware chain that doesn't explicitly re-throw them becomes an invisible silent wall. The error log makes it look like an error happened (it didn't — the redirect was the intent), and the redirect never reaches the response.

**Detection (grep)**:
- `git grep -nE "} catch \(.*\) \{" src/hooks.server.ts` — locate catch blocks. For each, verify it either (a) re-throws unconditionally, (b) calls `isRedirect`/`isHttpError` before logging, or (c) genuinely cannot have redirect/error thrown inside it (rare — pure synchronous parsing, etc.).
- Search the source for `throw redirect(` and `throw error(` calls and trace each back to confirm no middleware `try/catch` sits between it and the SvelteKit handler boundary.

**Enforcement**:
- Lock test asserting the re-throw guard stays in `handleJWTAuthentication`'s catch: `expect(src).toMatch(/if\s*\(\s*isRedirect\(error\)\s*\|\|\s*isHttpError\(error\)\s*\)/);` — pattern used in `sessionStatusPollerCanonical.test.ts`.
- When adding any new middleware function that has a try/catch AND that might wrap a `throw redirect()` site downstream: add the `isRedirect`/`isHttpError` re-throw at the top of the catch, even if no redirect is thrown TODAY.
- If you see a SvelteKit-decorated logger.error line ("X validation error") in production logs together with a user-reported "I clicked X and nothing happened," suspect this pattern.

**Last verified**: 2026-06-05 — discovered + fixed during SEC-10 instant-kick smoke. Both `handleJWTAuthentication`'s catch + outer `handle()` OTel span catch now re-throw control-flow before logging.

### #77. Conflict-style detector that *classifies* without *acting* on every classification — silent verdicts accumulate ghost rows forever

A common shape: write a pure helper that partitions an input set into action buckets (`modal` / `silent` / `none`), then in the caller act on only the loudest bucket and treat the others as "expected operation, nothing to do." The trap is that "silent" usually means "user-invisible," not "no work needed." If the silent bucket implies a server-side state change (revoke an expired row, evict a cache entry, decrement a counter), and the caller short-circuits because there's no UI to render, the state never updates. The row sits there indefinitely, accumulating across users, and pollutes every downstream query that filters on its "active" predicate.

Bit SEC-10 single-session enforcement 2026-06-05 (S226 regression hunt off the S225 ship): `detectConflict()` in `src/lib/server/auth/sessionConflict.ts` returned a verdict of `'silent'` for the "same browser, different session_id" case (re-login on the same Chrome). The caller in `checkDsaConflictGate.ts` had `if (report.kind !== 'modal') return { kind: 'proceed' };` — perfectly correct for the UI dimension (no modal to show), but it never updated `Sessions.revoked_at` on the predecessor row. The user's JWT cookie was rotated by the new login, so the predecessor's `session_id` became functionally unreachable, but the row stayed at `revoked_at: null` forever. Atlas evidence: an admin user's `sessions` collection accumulated 3+ "active" rows for the same Android Chrome device across two re-logins in 70 seconds (one earlier device-conflict kick correctly stamped `kicked_by_new_login`; subsequent same-browser logins all left ghosts). Functional impact zero (no caller can prove ownership of an unreachable session_id), but every `revoked_at == null` consumer — `account/sessions/+server.ts` "active sessions" UI, `checkDsaConflictGate.ts` conflict lookup, analytics counts, future kick-logic pattern-matching — over-counted.

**WRONG** — classify-only with a "silent = no-op" assumption:

```ts
// sessionConflict.ts — detector
export function detectConflict(rows, incoming): ConflictReport {
    // ... per-row classification: 'modal' | 'silent' | 'none' ...
    if (modalRows.length > 0) return { kind: 'modal', existing_sessions: modalRows };
    if (sawSilent) return { kind: 'silent', existing_sessions: [] };  // ← drops the row IDs
    return { kind: 'none', existing_sessions: [] };
}

// caller — only modals do work
const report = detectConflict(rows, incoming);
if (report.kind !== 'modal') {
    return { kind: 'proceed' };  // ← silent verdict never touches Atlas
}
```

**RIGHT** — surface every actionable bucket as parallel arrays; let the caller act on each independently:

```ts
// sessionConflict.ts — detector returns parallel action sets
export interface ConflictReport {
    modal_sessions: ExistingSessionDigest[];   // need user-visible kick
    silent_session_ids: string[];              // revoke server-side, no UX
}

export function detectConflict(rows, incoming): ConflictReport {
    const modal_sessions = [];
    const silent_session_ids = [];
    for (const row of rows) {
        const v = classifyRow(row, incoming);
        if (v.kind === 'modal') modal_sessions.push(digestFor(row, v));
        else if (v.kind === 'silent') silent_session_ids.push(row.session_id);
    }
    return { modal_sessions, silent_session_ids };  // no `kind` discriminator
}

// caller — each bucket gets its action; neither implies the other is empty
const report = detectConflict(rows, incoming);
if (report.silent_session_ids.length > 0) {
    await Sessions.updateMany(
        { user_id, session_id: { $in: report.silent_session_ids }, revoked_at: null },
        { $set: { revoked_at: new Date(), revoke_reason: 'rotated_same_browser' } }
    );
}
if (report.modal_sessions.length > 0) { /* modal flow */ }
```

**Root cause**: the helper's return shape used a single-value `kind` discriminator (modal / silent / none) to summarize the entire result. The discriminator was lossy — it threw away the silent rows' IDs because, from the modal-flow perspective, "silent" needed no further information. A discriminator's job is to tell the caller *which branch of behavior to run*; if multiple kinds of work can need to happen at once, a discriminator is the wrong shape. Parallel arrays per action are honest about "every bucket might have items."

**Detection (grep)**:
- `git grep -nE "if \(report\.kind !== 'modal'\) return" src/` — the exact pattern that bit us. Any classify-only-act-on-loudest helper has this shape.
- For each in-house "classify into action buckets" helper, grep its callers for the discriminator and verify each non-loudest bucket either (a) is acted on explicitly, or (b) has a code-comment + ADR justifying why it requires no action.
- Search for `revoke_reason: 'rotated_same_browser'` — should appear at EXACTLY one site (the gate's `updateMany`). Any second occurrence is suspicious; absence at the gate is a regression of this fix.

**Enforcement**:
- Behavioral test (`checkDsaConflictGate.test.ts`): assert that a silent verdict triggers `Sessions.updateMany` with the exact filter + `revoke_reason: 'rotated_same_browser'`. Also assert the empty-Sessions-list case does NOT call `updateMany` (guards against an over-eager regression that calls with empty `$in`).
- Unit test (`sessionConflict.test.ts`): assert that `silent_session_ids` is populated on Row 2 of the matrix, and assert that modal + silent CAN COEXIST in a single `ConflictReport`.
- When writing any new classify-into-buckets helper, prefer parallel arrays over a single `kind` discriminator. If you genuinely need a discriminator (mutually exclusive outcomes), say so in the JSDoc.

**Last verified**: 2026-06-05 (S226) — regression discovered when owner spotted 3 Atlas rows for the same Android Chrome session within 70 seconds. Fix shipped: ConflictReport refactored to parallel-arrays shape, gate-level silent revoke, 4 new test cases including the modal-coexists-with-silent regression case.

### #78. `<label for={id}>` outside an array-input wrapper points at `${id}_0` not `${id}` — broken association on every render

A form-input wrapper component (TextField, NumberField, similar) takes an `id` prop, renders `<label for={id}>` for the visible question, and renders the actual `<input>` inside. Single-input mode hands `{id}` to the input verbatim — fine. But when the wrapper supports an *array* mode (multiple inputs in one row — e.g., title-dropdown + first name, or value + unit), each input gets `id={`${id}_${i}`}` for uniqueness. Nothing in the DOM has `id={id}` any more. Chrome DevTools Issues panel flags **"Incorrect use of `<label for=FORM_ELEMENT>`"** on every render where the array mode triggers, because the `for=` target doesn't exist. The wrapper continues to function (oninput / onblur fire normally) so the bug goes unnoticed until the owner opens DevTools.

Bit Home Loan / LAP / Plot Loan property-area + applicant-name fields 2026-06-05 (S229) — owner saw the DevTools Issues panel reporting these warnings on every loan-form page. Investigation traced two wrapper components (`TextField.svelte`, `NumberField.svelte`) and a third unrelated picker (`DirectorCountPicker.svelte`) that hardcoded `id="director-count-custom"` causing duplicate-id warnings when two pickers rendered on the same page. Class-wide fix shipped — surface is small (3 components, ~20 lines of diff) but the violation count was per-instance (~50+ warnings across 6 loan forms).

**WRONG** — array inputs all use the suffixed id; outer label points at nothing:

```svelte
<!-- TextField.svelte (pre-fix) -->
<label for={id} class="text-labelQuestion">{label}</label>
{#each placeholder as ph, i}
    <input
        id={`${id}_${i}`}        <!-- ❌ no element has id={id}, label is orphaned -->
        name={`${id}_${i}`}
        ...
    />
{/each}
```

**RIGHT** — first input takes the canonical id, others stay suffixed:

```svelte
<label for={id} class="text-labelQuestion">{label}</label>
{#each placeholder as ph, i}
    <input
        id={i === 0 ? id : `${id}_${i}`}   <!-- ✅ label associates with first input -->
        name={`${id}_${i}`}                 <!-- name UNCHANGED — autofill / form-data identical -->
        ...
    />
{/each}
```

For multi-button groups (radio cards, chip pickers like `DirectorCountPicker`), use `role="group"` + `aria-labelledby` on the container with the visible heading carrying a matching id:

```svelte
<div role="group" aria-labelledby="{id}_label">
    <p id="{id}_label" class="text-labelText">{label}</p>
    {#each chips as chip}<button type="button">{chip}</button>{/each}
</div>
```

**Root cause**: array-mode suffixing was added defensively to guarantee unique ids when the wrapper had multiple inputs, but the outer `<label for={id}>` was never updated to match. The two patterns drifted independently — single-input mode was always correct, array-mode silently broke, and because the warning fires only in Chrome's *Issues panel* (not the console) it survived past `pnpm check` + `pnpm test:unit` indefinitely.

**Detection (grep)**:
- `grep -nE "id=\{\`\\\$\{id\}_\\\$\{i\}\`\}" src/lib/components/*.svelte` — any wrapper still using the bare-suffix pattern on an `<input>`. Should be zero after the 2026-06-06 fix.
- `grep -nE 'id="[a-z][a-z-]+"' src/lib/components/*.svelte` inside an `<input>` block — hardcoded string ids in shared components. Each is a duplicate-id risk if the component mounts more than once on a page.
- Companion preflight greps live in `docs/PREFLIGHT-GREPS.md` §78.

**Enforcement**:
- Source-pattern lock test: `src/lib/testing/__tests__/formLabelIdAssociation.test.ts` asserts the `id={i === 0 ? id : ...}` ternary survives in TextField + NumberField, asserts DirectorCountPicker accepts an `id` prop and doesn't reintroduce the hardcoded literal, asserts the picker container carries `role="group"` + `aria-labelledby`, asserts QuestionRenderer passes `id` to the picker. Twelve assertions, sub-millisecond — same convention as `sessionStatusPollerCanonical.test.ts` source-greps after the S228 dynamic-import flake fix (commit `876d5759`).
- Runtime verification: Chrome DevTools Issues panel on `/form/home-loan` should show zero "Incorrect use of `<label for=…>`" warnings after the fix lands. Re-check after any future refactor of these three components.

**Last verified**: 2026-06-06 (S230) — owner pinned this as next Highway during S229 close after observing the violations across the form flow. Fix shipped: TextField + NumberField array-mode ternary, DirectorCountPicker module-scope id-counter + `role="group"`/`aria-labelledby`, QuestionRenderer caller wiring, 12-assertion source-pattern lock test.

