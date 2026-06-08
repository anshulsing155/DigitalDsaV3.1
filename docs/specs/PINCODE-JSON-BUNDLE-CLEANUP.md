---
type: spec
epic: PERF
status: active
last_verified: 2026-06-03
related_specs: []
related_adrs: []
test_coverage: [src/lib/testing/__tests__/pincodeDerivedFilesLock.test.ts]
owner: tech@digitaldsa.com
---

# Pincode JSON Bundle Cleanup — Audit + Migration Spec

**Status**: Active (Phase 1 + Phase 2 SHIPPED S221, 2026-06-03; Phase 3
conditional, deferred until metrics justify). Lock test
`pincodeDerivedFilesLock.test.ts` guards both phases.

**Trigger**: Third-AI optimization audit (2026-06-03,
`docs/OPTIMIZATION_AUDIT_REPORT-2026-06-03.md` reviewed in S219) called
out `pincode_IN_all.json` (4.3 MB) + `pincode_IN_Selected.json` (745 KB)
as the largest single bundle weights leaking into Vercel serverless
functions.

---

## 1. Audit findings (S219)

### 1.1 Files in play

| File | Size | Status |
|---|---|---|
| `src/lib/config/pincode_IN_all.json` | **4.12 MB** | Live, 4 server consumers |
| `src/lib/config/pincode_IN_Selected.json` | **745 KB** | Live, 3 server consumers |
| `src/lib/config/_archive/pincode_IN_all-old.json` | 3.9 MB | Archived, NOT imported |
| `src/lib/config/_archive/pincode_reverse_selected.json` | 2.3 MB | Archived, NOT imported |
| **Total live JSON** | **~4.86 MB** | Bundled into 4 server function chunks |

### 1.2 Client bundles are CLEAN

`PincodeTypeahead.svelte` (the only Svelte component referencing
these names) only mentions them in source comments. The component
fetches via `/api/pincodes` at runtime. **No client bundle leakage.**

This is purely a serverless cold-start problem, not a client-bundle problem.

### 1.3 Live consumers and actual usage

| Consumer | Imports | Actually used | Waste |
|---|---|---|---|
| `/api/location/states/+server.ts` | `pincode_IN_all` (4.12 MB) | Just `Object.keys()` — ~36 state names (~500 bytes) | **~4.12 MB bundled, ~0% used** |
| `/api/location/cities/+server.ts` | BOTH (4.86 MB) | Flat dedup of city keys — ~4000 strings (~100 KB pre-computed at module load) | **~4.86 MB bundled, ~2% used** |
| `/api/pincodes/+server.ts` | BOTH (4.86 MB) | Per-request `dataset[state]` lookup. Lazy: returns `{}` if no state | ~50% used per request, but EVERY cold start loads everything |
| `src/lib/server/formEngine/engineContext.ts` | BOTH (4.86 MB) | State names + per-state city lists + per-(state, city) area lookups + lazy reverse-pincode index | Heavily used — but bundled into every route that imports engineContext (the form engine) |

### 1.4 Cold-start cost estimate

Per the third-AI audit report's build-output observations:
- `pincode_IN_all.js` → 3.4 MB server chunk
- `pincode_IN_Selected.js` → 605 KB server chunk

Node.js evaluation of a 4 MB pre-serialized JSON module costs roughly
~200-500ms cold (parse + module evaluation). Function instances that
never actually serve a location query still pay this cost on cold start
because the imports happen at module load, not on first request.

### 1.5 Counts

- 4 server modules import the JSON files
- 2 of those (`states`, `cities`) use almost none of the data
- 1 (`/api/pincodes`) uses ~50% per request
- 1 (`engineContext.ts`) uses the data deeply

---

## 2. Migration options considered

### Option A — MongoDB-backed
Move data to MongoDB collections. Query at runtime.
- ✅ Zero bundle impact, native query support
- ❌ Adds DB round-trip per location lookup, needs per-instance cache anyway, migration script for 100K+ records, updates require script run

### Option B — Dynamic import + per-instance cache
Keep JSON files in `src/`, convert imports to dynamic. Cache in module scope.
- ✅ Minimal code change, "free" cache via module evaluation
- ❌ Functions that DO use it still pay 4 MB on first request, deployment artifact unchanged

### Option C — Split by state at build time
Pre-split into per-state files. Endpoints load only requested state.
- ✅ Per-request load: ~50-200 KB instead of 4 MB
- ❌ States endpoint still needs full state list; cities endpoint builds across all states (re-loads everything)

### Option D — External object storage (Vercel Blob / S3)
Move data to storage. Endpoints fetch + cache per instance.
- ✅ Zero deployment-artifact impact, updates don't need redeploy
- ❌ First request per instance: 200-500ms network fetch, adds runtime infra dependency

### Option E (RECOMMENDED) — Hybrid: extract small derived files, lazy-import big files
The most pragmatic approach for the actual usage patterns:

1. **Pre-compute small derived files at build time:**
   - `_generated/stateList_all.json` (~500 bytes) — just state names from `pincode_IN_all`
   - `_generated/stateList_selected.json` (~500 bytes) — state names from `pincode_IN_Selected`
   - `_generated/cityList_all.json` (~100 KB) — flat deduped city list from `pincode_IN_all`
   - `_generated/cityList_selected.json` (~50 KB) — flat deduped city list from `pincode_IN_Selected`

2. **Routes that only need state/city names switch to these:**
   - `/api/location/states/+server.ts` imports `stateList_all.json` — drops 4.12 MB from this function bundle
   - `/api/location/cities/+server.ts` imports the city lists — drops ~4.8 MB

3. **`/api/pincodes/+server.ts` converts to dynamic import:**
   - Top-level imports → `await import(...)` inside the request handler
   - Module-scope cache so warm requests skip the re-import
   - Functions that never serve pincodes pay zero cost; first cold-serve pays the load
   - Memoize across instance lifetime

4. **`engineContext.ts` stays as static import** (form engine is the legitimate primary consumer of the full data; lazy here is unnecessary complexity).

5. **Optional follow-up:** audit which routes pull in `engineContext.ts` transitively and consider lazy-importing engineContext from non-form routes. Defer until phases 1+2 prove insufficient.

---

## 3. Why Option E

It targets the biggest leaks (the `states` + `cities` endpoints that bundle
4.8 MB to serve ~100 KB of actually-used data) with minimal code change
and zero new infrastructure. Phase 1 alone should reduce the cold-start
artifact for those two functions by ~95%.

Risk profile is low: derived files are deterministic from source data,
build-time generation means runtime behavior is identical, the form engine
(where pincode data is actually used heavily) is untouched.

---

## 4. Execution plan — for the next session

### Phase 1 — Pre-computed derived files + thin endpoint rewrites (~2 hr)

**New:** build-time pre-processor script
`scripts/generate-pincode-derived.cjs` that emits 4 small JSON files
into `src/lib/config/_generated/`:
- `stateList_all.json` (state names from pincode_IN_all, sorted)
- `stateList_selected.json` (state names from pincode_IN_Selected, sorted)
- `cityList_all.json` (deduped city names from pincode_IN_all, sorted)
- `cityList_selected.json` (deduped city names from pincode_IN_Selected, sorted)

Wire into `package.json` `prepare` or a new `prebuild` step. Files are
generated, committed to git so deployments don't need to run the script
(matches existing convention for compiled bank data).

**Modify:**
- `src/routes/api/location/states/+server.ts` — replace
  `import pincode_IN_all` with `import stateList from '_generated/stateList_all.json'`
- `src/routes/api/location/cities/+server.ts` — replace both imports with the
  city-list imports; the `buildCityList` function becomes unused
  (delete, or archive per CLAUDE.md §16 #4)

**Verify:**
- Both endpoints return identical responses to the current implementation
- Snapshot tests on the response shape would catch regressions
- Build output should show those two function chunks dropped to <150 KB

**Expected gain:** ~9.7 MB cumulative removed from serverless bundles
(both functions × 4.86 MB), translating to roughly 400-1000ms saved on
cold start for any user flow that hits those endpoints.

### Phase 2 — Lazy `/api/pincodes` (~1.5 hr)

**Modify:** `src/routes/api/pincodes/+server.ts`
- Convert top-level static imports to lazy dynamic-import inside the GET
  handler
- Add module-scope `Map<string, ...>` cache keyed by `source` so warm
  invocations skip the re-import
- Add a per-state cache so repeated queries for the same state return
  the pre-computed result

**Verify:**
- Cold first hit: 200-400ms (lazy load + first-request build)
- Warm subsequent: <10ms (cache hit)
- Functions that NEVER hit `/api/pincodes`: zero pincode cost

**Expected gain:** removes 4.86 MB from the function bundle's cold-init
path. First actual request still pays the load; everything after is free.

### Phase 3 — Optional engineContext audit (deferred, NOT in next session)

Once Phase 1+2 are deployed, measure remaining cold-start cost on form
pages. If `engineContext.ts` still contributes a problematic share of
cold-start time, consider:
- Dynamic-importing engineContext from non-form routes
- Lazy-building the reverse-pincode index only when the form's reverse-
  lookup feature is actually used (already partially lazy per the
  existing `_reverseIndexSelected` / `_reverseIndexAll` pattern)

This phase should only happen if metrics justify it. Don't preemptively
optimize the form engine — pincode data is its legitimate core dependency.

---

## 5. Risk & rollback

| Risk | Likelihood | Mitigation |
|---|---|---|
| Generated files drift from source | Low | Build-time generation + commit-to-git matches existing bank-data pattern; CI check that re-generates and diffs |
| State/city dedup logic changes | Very low | Replicate the existing `buildCityList()` + `Object.keys().sort()` logic verbatim in the generator script |
| `/api/pincodes` lazy load causes first-request UX issue | Low | First request is 200-400ms — same as today's cold start; subsequent are faster |
| Endpoint contract changes | None | Responses are byte-identical (we're not changing what gets returned, just where the data lives at module init) |
| Build script breaks | Low | Generator runs once at dev-prep time. If it fails, fall back to the old static imports (no production impact) |

**Rollback path:** revert the endpoint changes; re-add the static imports.
The generated files can stay in git harmlessly — they're additive.

---

## 6. What this does NOT address

- The form-engine's deep use of pincode data inside `engineContext.ts`
  (intentionally out of scope — see Phase 3)
- The `_archive/pincode_IN_all-old.json` (3.9 MB) and
  `_archive/pincode_reverse_selected.json` (2.3 MB) in
  `src/lib/config/_archive/` — these are NOT imported (we verified) so
  they don't contribute to bundles, but they DO bloat the `src/` tree.
  Cleanup is the broader archive-relocation item from the audit report
  (separate spec, lower priority)
- Pincode data refresh/update workflow — out of scope; current update
  process (replace JSON file + redeploy) continues to work

---

## 7. Estimated effort

- **Phase 1:** ~2 hours (mostly snapshot test verification)
- **Phase 2:** ~1.5 hours (lazy-import + cache)
- **Phase 3:** deferred (measure first)

Total for next-session execution: **~3.5 hours**.

---

## 8. Related

- Third-AI optimization audit (2026-06-03) — original finding source
- `docs/SESSION-HANDOFF.md` — S219 next-session priority list
- `src/lib/config/bankSelection/bankName.ts` — established precedent for
  config data living in `src/lib/config/` (precompiled, committed)
- CLAUDE.md §16 #14 — file-count discipline; the new `_generated/` dir
  + script are justified as separate concerns (build-time tooling + derived
  data are genuinely new architectural pieces)
