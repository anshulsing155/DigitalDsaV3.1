# Protocol — PERF-3 Pilot: TanStack Query (svelte-query) Adoption

**Item ID**: `PERF-3` (from `docs/ARCHITECTURE-EVOLUTION.md`)
**Effort**: ~1-2 hr for the pilot. Multi-week for full rollout.
**Risk**: Low for the pilot (additive — one new dep, no removals). Medium for the full rollout (changes every client data-fetch pattern).
**Author**: Drafted in S102; deferred from execution because the tail of a 16-commit session is the wrong moment to introduce a foundation library.

---

## Why PERF-3

Today, client-side data fetching is a mix of:
- `onMount(async () => { const r = await secureFetch(...); data = await r.json(); })` — hand-rolled, no cache
- `$state` + ad-hoc invalidation when the user knows to refetch
- Manual debouncing on input-triggered fetches

Pain points:
- **No shared cache** — two components fetching the same resource hit the network twice
- **No stale-while-revalidate** — fresh paint always waits for a round-trip
- **No automatic refetch on window focus / reconnect** — users see stale data after tab switch
- **No request deduplication** — rapid clicks fire duplicate requests
- **Manual loading/error UI** — every fetch site re-implements the same skeletons

TanStack Query (svelte-query) gives all of these for free, scoped per `queryKey`, with a small API surface.

---

## Pilot Scope (this protocol)

Goal: install + configure + introduce ONE example query. Not a refactor; a pattern lay-down.

1. Install `@tanstack/svelte-query` + the devtools.
2. Configure the `QueryClient` provider in `+layout.svelte` (or the lowest shared layout above the pilot route).
3. Build a thin wrapper that pairs `createQuery` with `secureFetch` + `apiOk`/`apiError` so the pattern integrates with the existing CSRF and response-shape contract.
4. Convert ONE small read-only route to use `createQuery`. Suggested: `/dashboard/dsa/profile` or a similar low-traffic page.
5. Verify `pnpm check` clean. Verify the page renders correctly. Verify the devtools show the query cache.
6. Document the pattern in a short note (this file + a `docs/specs/` follow-up).

**Out of scope for the pilot**: mutations, optimistic updates, infinite queries, server-side prefetching. Those land in subsequent sessions as `PERF-3` continues.

---

## Pre-flight Checks

Before running `pnpm add`:

1. **`pnpm check`** is clean on `main`.
2. **`pnpm test:unit -- --run`** is green.
3. **No uncommitted changes** in the working tree.
4. **Branch is `main`**.
5. **Latest svelte-query version is Svelte-5-compatible**:
   - As of 2026-05-15: `@tanstack/svelte-query@^5.x` supports Svelte 5 via stores. Native runes support is experimental — DO NOT use the experimental rune API for the pilot; stick with `createQuery` + `derived` for the runes interop.
   - Verify the version chosen pins ESM correctly: check `node_modules/@tanstack/svelte-query/package.json` for `type: "module"`.
   - If the install adds any CJS package with ESM transitive deps, **add the full chain to `ssr.noExternal` in `vite.config.ts`** per CLAUDE.md Pitfall #7.

---

## Step-by-Step

### Step 1 — Install

```bash
pnpm add @tanstack/svelte-query
pnpm add -D @tanstack/svelte-query-devtools
```

Verify in `package.json`. Run `pnpm check` immediately — type-check should still pass.

### Step 2 — Configure QueryClient

Edit `src/routes/+layout.svelte` (or the lowest layout above the pilot route):

```svelte
<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { browser } from '$app/environment';

  // One QueryClient per app instance. The defaults below are conservative:
  // - staleTime 30s: data is fresh for 30s; no auto-refetch in that window
  // - retry 1: transient failures get one retry, not three
  // - refetchOnWindowFocus: true (default) — refetch when user returns to tab
  let { children } = $props();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        // SSR: queries don't auto-fetch on the server. SvelteKit `load`
        // functions still own server-side data fetching for SEO + first paint.
        enabled: browser
      }
    }
  });
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
```

**Decision points**:
- `staleTime: 30s` is conservative. Tune per query later (e.g., lender lists could be `5 * 60_000`).
- `refetchOnWindowFocus: true` is the default and matches DSA workflow expectations (return to tab, see fresh case status).
- `enabled: browser` prevents server-side query execution — SvelteKit load functions remain the SSR data path. **This is a deliberate divide**: load functions for SSR/SEO, svelte-query for client-side interactivity.

### Step 3 — Thin wrapper for secureFetch integration

Create `src/lib/utils/queryFn.ts`:

```ts
import { secureFetch } from '$lib/utils/csrf';

/**
 * Standard query function for the `{ success, data, error }` API contract.
 * Wraps secureFetch so CSRF + cookies work transparently.
 *
 * Throws on non-ok responses so TanStack Query's `isError` triggers.
 * Returns the `data` field directly so consumers don't unwrap.
 *
 * @example
 *   createQuery({
 *     queryKey: ['cases', caseId],
 *     queryFn: () => apiQuery<CaseDoc>(`/api/cases/${caseId}`)
 *   });
 */
export async function apiQuery<T = unknown>(url: string): Promise<T> {
  const res = await secureFetch(url);
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return body.data as T;
}
```

This keeps the `apiOk(data)` response contract intact end-to-end and surfaces errors via Query's error-handling.

### Step 4 — Pilot route conversion

Suggested pilot: a small read-only client-side fetch that's currently `onMount(async () => ...)`. Candidates (pick one, smallest first):

1. Profile page that loads user details after mount.
2. An admin list view that polls every N seconds for new entries.
3. A dashboard panel that re-fetches when the user re-opens it.

**Don't** pick:
- Anything with mutations (out of scope for the pilot)
- Anything in the form flow (too high-stakes for first introduction)
- Anything inside an SSR-loaded route where data already comes via `data` prop (TanStack Query adds nothing there)

Before/After example:

```svelte
<!-- Before -->
<script lang="ts">
  let data = $state<Foo | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const res = await secureFetch('/api/foo');
      const body = await res.json();
      if (body.success) data = body.data;
      else error = body.error;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });
</script>

<!-- After -->
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { apiQuery } from '$lib/utils/queryFn';

  const query = createQuery<Foo>({
    queryKey: ['foo'],
    queryFn: () => apiQuery('/api/foo')
  });
</script>

{#if $query.isLoading}
  ...loading...
{:else if $query.isError}
  Error: {$query.error.message}
{:else if $query.data}
  ...render $query.data...
{/if}
```

The `$query.` prefix is Svelte's store auto-subscription — TanStack Query for Svelte returns a `Readable<QueryObserverResult>`.

### Step 5 — Verify

1. `pnpm check` — must be 0/0
2. `pnpm test:unit -- --run` — must be green
3. Manual: open the pilot route in `pnpm dev`, confirm the page renders correctly
4. Optional: install devtools widget and confirm the query appears in the panel

### Step 6 — Commit

One commit per major step is wrong here — the install + setup + first query are atomic. Bundle them:

```
feat(perf): PERF-3 pilot — install + configure svelte-query, convert <route>

Lays down the TanStack Query pattern for client-side data fetching.
This is the first installation; future PERF-3 work converts existing
onMount(async fetch) sites to createQuery one route at a time.

Install:
  @tanstack/svelte-query@^5.x
  @tanstack/svelte-query-devtools@^5.x (dev)

Setup:
  - QueryClientProvider in src/routes/+layout.svelte
  - staleTime 30s, retry 1, refetchOnWindowFocus default-on,
    enabled: browser (SSR data path remains SvelteKit load functions)
  - $lib/utils/queryFn.ts — apiQuery() wrapper integrating with
    secureFetch + the { success, data, error } contract

Pilot route: <path>
  Before: onMount + secureFetch + manual loading/error $state
  After: createQuery({ queryKey, queryFn: () => apiQuery(...) })

Verification: pnpm check 0/0, pnpm test:unit green, manual smoke test.

Future work: PERF-3 continues by converting one route per session.
Mutations + optimistic updates land in a later pilot.
```

---

## Common Pitfalls

| Pitfall | Mitigation |
|---|---|
| Using svelte-query for SSR-loaded routes | Don't — SvelteKit's `load` function already handles SSR + first paint. svelte-query is for client-side interactivity. |
| Stale `queryKey` causing duplicate caches | Always include all the dynamic inputs in the key array. `['cases', caseId]`, not `['cases']`. |
| Querying for data that mutates outside the cache | Wire mutations via `useMutation` later. Until then, the consumer must call `queryClient.invalidateQueries(['key'])` after a server-state change. |
| Devtools overlay in production | The devtools package is dev-only; gate any import with `import.meta.env.DEV` if it bleeds into a production bundle. |
| CSRF token missing on the query fetch | The `apiQuery` wrapper uses `secureFetch`, which handles CSRF automatically. Don't bypass with raw `fetch`. |
| SSR crash from server-side query | The `enabled: browser` default prevents this. Don't override per-query without weighing SSR impact. |
| Hydration mismatch — server has no data, client fetches after mount | This is expected for client-side-only queries. If SEO matters, use the load function path instead. |

---

## When to Continue PERF-3

After the pilot lands cleanly, the next sessions can incrementally convert:

1. Routes with polling / refresh patterns (highest cache-hit value)
2. Routes shared across components (deduplication value)
3. Routes whose data changes outside the consumer (invalidation value)

Don't convert:
- Routes whose data comes from SvelteKit `load` (no upside)
- One-shot writes (use `useMutation` later, not `createQuery`)
- Form-system internals (form has its own state model — out of scope)

Each conversion is a small commit. Pattern is now codified in this protocol.

---

## References

- TanStack Query docs: https://tanstack.com/query/latest/docs/framework/svelte/overview
- Svelte 5 + TanStack Query interop: https://tanstack.com/query/latest/docs/framework/svelte/svelte-5
- `CLAUDE.md` §7 — Tech Stack (note: `secureFetch` is the canonical client-side fetch)
- `CLAUDE.md` Pitfall #7 — CJS→ESM crossing if new deps add transitive issues
- `.claude/protocols/zod-migration.md` — sibling protocol for the per-endpoint hardening pass
