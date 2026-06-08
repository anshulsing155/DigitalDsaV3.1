# PERF-3 Next Candidate — Migration Plan

**Item**: PERF-3 (TanStack Query / svelte-query adoption)
**Drafted**: 2026-05-18
**Status**: Ready to execute
**Depends on**: PERF-3 infra (S103), e2e-run pilot (S105), NotificationBell (S105)

---

## 1. Candidate Comparison

| Metric | test-runner | approvals | file-builder |
|---|---|---|---|
| Lines (svelte + server.ts) | 660 + 117 = **777** | 568 + 146 = **714** | 859 + 33 = **892** |
| Client-side fetch sites | 2 (POST start, GET poll) | 0 (SSR load + `invalidateAll`) | 3 (loadConfig GET, performSave PATCH, generatePDF POST) |
| `setInterval` polling loops | **6** (`pollIntervals[testId]` per card) | **1** (`$effect` + `setInterval(invalidateAll, 10_000)`) | **0** (only a `setTimeout` debounce on save) |
| Natural sub-component boundary | **Strong** — 6 identical card blocks inside `{#each TEST_TYPES}` | Weak — 3 tabs are distinct; shared helpers are 2 functions, not components | Medium — 4 panels exist but all share `selectedLenderId` + `configLoaded` tightly |
| Cache hit scenario | **Yes** — if two admins view same run, or navigating away and back within `staleTime` | No — SSR load already serves fresh data per navigation | Marginal — config is per-lender-per-case, rarely shared |
| Blast radius of current bug surface | **High** — 6 independent `clearInterval` calls needed on unmount; any missed one leaks a timer | Low — 1 interval calling `invalidateAll` is self-contained | Low — `saveTimer` has no leak risk; it clears itself on every call |
| Migration effort | ~3 hr (Phase A extract + Phase B query) | ~2 hr | ~2 hr (but lowest gain) |

**test-runner in depth.** The page holds a `pollIntervals` dict mapping each of 6 test-type IDs to a `ReturnType<typeof setInterval>`. The `startPolling` / `stopPolling` / `pollStatus` trio is a hand-rolled copy of exactly the pattern replaced in the e2e-run pilot. The single template block at line 345 iterates `TEST_TYPES` and renders an identical card for each — the only card-specific divergence is the `form-fill` profile selector (gated by `testType.needsProfile`). This is textbook sub-component extraction: one component, one prop to gate the selector, one `createQuery` per instance.

**approvals in depth.** All four data sets (pending versions, submissions, parsing artifacts, recently activated) arrive via the SSR `load` function. The `$effect` polling fires `invalidateAll()` every 10 seconds only when `data.parsingArtifacts.length > 0`. A TanStack Query migration would need to pull `parsingArtifacts` out of the SSR load into a client-side query — requiring a new `/api/admin/policy-engine/parsing-status` endpoint — to avoid calling `invalidateAll` (which re-runs all 4 DB queries per tick). The mutations (`callVersionAction`, `callSubmissionAction`) fit `useMutation` cleanly but the existing pattern is functionally sound. Net gain does not justify the scope.

**file-builder in depth.** At 892 lines it is the largest candidate, but there is no polling at all. The `loadConfig` GET fires on `selectedLenderId` change (a reactive effect, not an interval). The `performSave` PATCH uses `setTimeout` for debouncing — a correct, lightweight pattern for a write operation. The `generatePDF` POST is a one-shot action. TanStack Query adds error-retry and devtools visibility for `loadConfig`, but the functional gap is small. The 859-line template weight is dense Tailwind markup, not fetch complexity. Migrating this delivers the least measurable user-visible improvement of the three candidates.

---

## 2. Recommendation: test-runner

**Justification.** Six identical `setInterval` loops replaced by six `createQuery` instances is a direct replay of the e2e-run pilot — the developer who can read the e2e-run diff (`40ea218a`) can execute Phase B in under an hour once `TestCard` is extracted. The sub-component extraction (Phase A) is a pure cleanup that delivers independent value: it reduces `+page.svelte` from 660 lines to ~120 lines and makes future modifications to individual card types surgical rather than grep-and-hope.

**Trade-offs accepted.** The `TestCard` component is route-local (admin-only, no reuse candidate). Co-location at `src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte` is preferred over `src/lib/components/admin-testing/` until a second consumer appears — consistent with the `_tabs/` and `_sections/` patterns already used in `admin/policies/pms/[policyId]/` and `rm/policies/[lenderId]/[product]/edit/`.

---

## 3. Sub-Component Extraction Plan

### Extracted: `TestCard.svelte`

**File**: `src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte`

Encapsulates everything inside the `{#each TEST_TYPES as testType}` block: card header, form-fill profile selector (conditional on `testType.needsProfile`), run button + footer row, progress bar, error/output panel, screenshots panel.

**Prop shape**:

```typescript
type Props = {
  testType: {
    id: 'selector-health' | 'accessibility' | 'form-fill' | 'applicant-stage' | 'full-path' | 'unit-tests';
    label: string;
    description: string;
    estimate: string;
    needsProfile: boolean;
    icon: string;             // SVG path string
  };
  lastRun: LastRunRecord | null;  // SSR-seeded initial state for the card
  headed: boolean;                // global "show browser" setting from parent
  fixtures: FixtureProfile[];     // needed only when testType.needsProfile === true
  synthetics: SyntheticProfile[]; // same
};
```

**Locally-owned state inside `TestCard`**:
- `runId` — the active run's ID (set on successful POST)
- `localPending` — true between the POST submit and the first poll response (covers the gap where `runId` is not yet set)
- `profileType`, `selectedProfileId` — form-fill profile selector
- `expandedCard` — error/output expand toggle

**What stays in the parent page**:
- `TEST_TYPES` constant and the `{#each}` loop
- `headed` toggle control
- `historyFilter` + `filteredRuns` + run history table
- All `data.*` (fixtures, synthetics, lastRunByType, recentRuns) — SSR load, unchanged

**Helper functions that move into `TestCard`**: `startTest`, `startPolling`, `stopPolling`, `pollStatus` (Phase A, unchanged); replaced entirely in Phase B. `statusColor`, `statusLabel`, `formatDuration`, `getProfileIdKey` move into the component as local utilities.

---

## 4. Query Design

### Query key

```
['admin-test-run', runId]
```

Namespaced to match the e2e-run pilot's `['admin-e2e-run', activeRunId]` — consistent prefix `admin-test-run` differentiates the multi-card runner from the single-run detail view.

### Per-card run status query

```typescript
// Inside TestCard.svelte — Phase B replacement for pollIntervals[testId]
const runQuery = createQuery(() => ({
  queryKey: ['admin-test-run', runId],
  queryFn: async () => {
    const res = await secureFetch(`/api/admin/testing/e2e-runs/${runId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Failed to load run');
    return json.data as RunRecord;
  },
  enabled: !!runId,
  staleTime: 0,           // run records mutate on every server tick — never serve stale
  refetchInterval: (q) => {
    const status = (q.state.data as RunRecord | undefined)?.status;
    return status === 'completed' || status === 'failed' ? false : 2_000;
  }
}));

// Pitfall #28: reactive object — no $-prefix
const runStatus = $derived(runQuery.data ?? null);
const isRunning = $derived.by(() => {
  if (localPending) return true;
  if (!runId) return false;
  const s = (runStatus as RunRecord | null)?.status;
  return s !== 'completed' && s !== 'failed';
});
```

### Start-run action (POST — not `useMutation`)

Keep as a plain async function (consistent with e2e-run pilot). Setting `runId` on success activates the query automatically.

```typescript
async function startRun() {
  localPending = true;
  errorMessage = '';
  try {
    const res = await secureFetch('/api/admin/testing/e2e-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody())
    });
    const json = await res.json();
    if (json.success) {
      runId = json.data.run_id;   // enables the query
    } else {
      errorMessage = json.error ?? 'Failed to start';
    }
  } catch {
    errorMessage = 'Network error';
  } finally {
    localPending = false;
  }
}
```

### Cache invalidation

No cross-card invalidation needed. Each card's query is keyed by its own `runId`. The parent run history table reads `data.recentRuns` from SSR load; it stays static until the user navigates away and back. A Phase D addition (optional) would add a `['admin-test-runs-history']` query and call `useQueryClient().invalidateQueries(...)` from `TestCard` on run completion — deferring for now.

---

## 5. Migration Phases

### Phase A — Extract `TestCard` (no behavior change)

- [ ] Create `src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte`
- [ ] Move the `{#each TEST_TYPES as testType}` block body (lines ~345–577 of `+page.svelte`) into `TestCard`; keep `pollIntervals`, `startPolling`, `stopPolling`, `pollStatus` as-is inside the component
- [ ] Define props per §3; thread `testType`, `lastRun`, `headed`, `fixtures`, `synthetics` from parent
- [ ] Seed initial card state from `lastRun` prop (mirrors the current `cardStates` initialization from `data.lastRunByType`)
- [ ] Parent page: replace the 230-line `{#each}` block with `<TestCard ... />`
- [ ] `pnpm check` — 0 errors/warnings
- [ ] `pnpm test:unit -- --run` — all passing
- [ ] Manual: start one test, verify polling, output, screenshots

### Phase B — Replace polling with `createQuery`

- [ ] Inside `TestCard`, delete `pollIntervals`, `startPolling`, `stopPolling`, `pollStatus`
- [ ] Add `createQuery` block per §4; add `localPending` state bridge
- [ ] Replace `isRunning()` function with `isRunning` derived rune
- [ ] Run pre-flight greps from §7
- [ ] Manual smoke test: all 6 cards, verify independent polling and terminal stop
- [ ] Verify no `setInterval` left in component or parent

### Phase C — Cleanup + commit

- [ ] Delete `CardState` type from `+page.svelte` if no longer used there
- [ ] Add JSDoc to `TestCard` noting that `lastRun` prop is SSR-frozen (won't update mid-session) and that the card switches to live query data once `runId` is set
- [ ] `pnpm check` + full test suite green
- [ ] Commit message body: reference PERF-3, explain what was replaced and why, note the e2e-run pattern it replicates

### Phase D — Live history table (optional, future session)

- [ ] Extract `recentRuns` into a `createQuery(['admin-test-runs-history'], ..., { staleTime: 30_000 })`
- [ ] `TestCard` calls `queryClient.invalidateQueries({ queryKey: ['admin-test-runs-history'] })` on run completion

---

## 6. Test Plan

### New tests

**`src/lib/testing/__tests__/testCardQuery.test.ts`**

| Test | Assertion |
|---|---|
| query disabled when `runId` is empty | `enabled: false` path — `queryFn` never called |
| query activates when `runId` is set | `queryFn` called within first tick |
| `refetchInterval` returns `2000` for status `running` | polling continues |
| `refetchInterval` returns `false` for status `completed` | polling stops |
| `refetchInterval` returns `false` for status `failed` | polling stops |
| `isRunning` is `true` when `localPending` is `true`, regardless of query state | start-to-first-poll gap covered |

### Existing tests to verify unchanged

```bash
pnpm test:unit -- --run   # baseline: all 10,862 passing
```

No existing unit tests for test-runner (confirm: `grep -r "test-runner\|TestCard" src/lib/testing/__tests__/` should return 0 matches).

---

## 7. Pitfalls to Verify Post-Migration

```bash
# Pitfall #28 — no $-prefix on reactive query object
grep -rnE '\$runQuery\.' \
  src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte
# 0 expected

# No setInterval leftovers in extracted component
grep -n "setInterval" \
  src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte
# 0 expected (Phase B+)

# No setInterval leftovers in parent page
grep -n "setInterval" \
  src/routes/dashboard/admin/testing/test-runner/+page.svelte
# 0 expected (Phase B+)

# No module-scope fetch (Pitfall #4)
grep -nE "^(let|const|export).*= (await )?fetch\(" \
  src/routes/dashboard/admin/testing/test-runner/_components/TestCard.svelte
# 0 expected
```

---

## 8. Risks and Open Questions

**Risk 1 — 6 concurrent queries, same endpoint family.** If 6 runs were active simultaneously, 6 independent poll loops would fire every 2 seconds. The server serializes Playwright execution, so at most 1–2 runs are active in practice. Noted in code comments; not a production concern.

**Risk 2 — `TestCard` remount on key change.** The component is keyed by `testType.id` inside `{#each}`. Since `TEST_TYPES` is a frozen constant imported from the script block, keys never change across renders. No leak risk.

**Risk 3 — `lastRun` prop is SSR-frozen.** The card's initial status badge (idle/passed/failed from the last historical run) comes from `lastRun`. Once the user starts a run, the query drives the badge. But after the run completes and the user does NOT navigate away, `data.lastRunByType` in the parent is stale — the history table won't show the new run until navigation. This is cosmetic. Document in `TestCard` JSDoc. Phase D resolves it.

**Open question — route-local vs shared component directory.** `_components/TestCard.svelte` (route-local, consistent with `_tabs/` and `_sections/` patterns) vs `src/lib/components/admin-testing/TestCard.svelte` (shared, no current reuse need). Recommendation: route-local until a second consumer appears. Reverse migration is a rename + import update.

---

*Spec authored 2026-05-18. Related commits: `40ea218a` (e2e-run PERF-3), `4ab00bdd` (NotificationBell PERF-3). Full PERF-3 item catalog: `docs/ARCHITECTURE-EVOLUTION.md` §PERF-3.*

---

## Round 2 — After test-runner (drafted 2026-05-19, no code)

**Status of original recommendation:** test-runner Phase A + B ✅ shipped 2026-05-19 (`_components/TestCard.svelte` extraction; 659 → 200 lines; `createQuery` polling replaces 6 per-card `setInterval`s).

### Re-scout of remaining candidates

Re-ran the §1 grep matrix (Bash `grep -rn` for `setInterval`, `onMount(async`, `mounted` guards) across `src/routes/dashboard/admin/` + shared admin components. Already-migrated routes excluded:

- ✅ `admin/policies/[artifact_id]/` (S103 pilot)
- ✅ `admin/testing/e2e-run/` (S105)
- ✅ `NotificationBell.svelte` (S105)
- ✅ `admin/testing/test-runner/` + `_components/TestCard.svelte` (2026-05-19)

| Candidate | Pattern | Polling LOC | Queries | Risk | ROI |
|---|---|---|---|---|---|
| `admin/policies/approvals/+page.svelte` | `$effect` + `setInterval(invalidateAll, 10_000)` | 7 | 1 (coarse) | Med | **H** |
| `admin/file-builder/` | does not exist as a route | — | — | — | n/a |
| `admin/qa/` | no polling — `invalidateAll()` on manual re-run only | 0 | n/a | n/a | n/a |
| `admin/registry-health/` | no polling — one-off re-run button | 0 | n/a | n/a | n/a |
| `admin/policies/pms/[policyId]/` | no polling — `invalidateAll()` on mutation only | 0 | n/a | n/a | n/a |

The §1 plan listed `file-builder` as a candidate but it doesn't exist as a route under `src/routes/dashboard/admin/`. Only the form-side file-builder library exists, and that's out of PERF-3 scope (no polling pattern).

### Recommendation: `admin/policies/approvals/`

**Pattern today:** the page's SSR `load()` returns four data sets (pending versions, RM submissions, parsing artifacts, recently activated). A 7-line `$effect` fires `setInterval(invalidateAll, 10_000)` when `data.parsingArtifacts.length > 0`. `invalidateAll()` re-runs the entire `load()` chain every tick — coarse-grained.

**Migration target:** split the polled state into a scoped client-side query keyed `['admin-policies-parsing-status']` that returns just the parsing-artifacts list. `refetchInterval` driven by the in-flight count (poll while > 0, stop when 0). The other three data sets stay on SSR (no benefit to migrating them — read-once on navigation).

**Lines removed:** ~7 (the `$effect` + interval + cleanup). Added: ~15 (query + initialData wiring). Net: code grows slightly, but the ergonomic win is real — polling stops automatically, no page-wide re-validation, no manual `mounted` flag.

**Effort estimate:** ~2 hr if a `/api/admin/policy-engine/parsing-status` endpoint already exists (returning just the artifact list shape); ~3 hr if a new endpoint is needed.

### Blocker to verify before starting

**Does `data.parsingArtifacts` come from a dedicated endpoint, or is it computed inline inside `+page.server.ts`?** If inline, the migration requires either (a) extracting that fetch into a `/api/...` endpoint, or (b) keeping the SSR seeding and migrating only the *refresh* path (less clean — initial state from SSR, subsequent ticks from the new endpoint). Option (a) is preferred but adds a route file.

**Recommended next move:** read `src/routes/dashboard/admin/policies/approvals/+page.server.ts` first; if `parsingArtifacts` is a 5–10 line MongoDB query, extract to its own route handler before the migration. If it's tangled with the other 3 data sets, defer this candidate and re-scout in a future session.

### Why nothing else is a candidate

The grep sweep returned no other `setInterval`/`onMount`-fetch patterns in admin code. The PERF-3 item is approaching its natural end: after `admin/policies/approvals/`, the remaining items are tactical (e.g., dashboard widgets) or already-migrated. Consider closing PERF-3 to ✅ once approvals lands, with a note that future polling additions follow the `createQuery` pattern by default.
