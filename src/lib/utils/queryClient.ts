/**
 * TanStack Query — shared QueryClient factory
 * ═══════════════════════════════════════════════════════════════════════════
 * PERF-3 — wraps `@tanstack/svelte-query` with sensible defaults for this app.
 *
 * Per-page or per-component query usage:
 *
 *   import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
 *   import { secureFetch } from '$lib/utils/csrf';
 *
 *   const artifactQuery = createQuery(() => ({
 *     queryKey: ['admin-policy-artifact', artifactId],
 *     queryFn: async () => {
 *       const res = await secureFetch(`/api/admin/policies/${artifactId}`);
 *       const json = await res.json();
 *       if (!json.success) throw new Error(json.error ?? 'Failed to load artifact');
 *       return json.data;
 *     },
 *     initialData: data.artifact, // seeded from SvelteKit SSR load()
 *     refetchInterval: (query) =>
 *       (query.state.data as { status?: string } | undefined)?.status === 'parsing'
 *         ? 5_000
 *         : false
 *   }));
 *
 *   let artifact = $derived(artifactQuery.data ?? data.artifact);
 *
 * After a mutation that should refresh the query:
 *
 *   const queryClient = useQueryClient();
 *   await someMutationCall();
 *   await queryClient.invalidateQueries({ queryKey: ['admin-policy-artifact', artifactId] });
 *
 * Defaults explained:
 *  - `staleTime: 30s` — server data is treated as fresh for 30 seconds.
 *     Re-mounting the same component within that window returns cached
 *     data instantly without re-fetching. Most dashboard data is fine
 *     with a 30s stale window. Per-query overrides as needed.
 *  - `gcTime: 5min` — keep cache entries for 5 minutes after they go
 *     inactive (no subscribers). Navigation back-and-forth within this
 *     window is instant.
 *  - `refetchOnWindowFocus: false` — auto-refetch on tab focus is
 *     surprising UX in this app (DSAs often switch between cases and
 *     don't want forms invalidated under them). Opt-in per query.
 *  - `retry: 1` — one quick retry on network failure, then surface the
 *     error. Long retry loops trap users behind spinners.
 *
 * NOTE: This factory creates a NEW client per call. The root layout
 * memo-izes one client in a Svelte store so all components share the
 * same cache. Do not call this directly from components — get the
 * client from context via `useQueryClient()` instead.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { QueryClient } from '@tanstack/svelte-query';

export function createAppQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30 * 1000,
				gcTime: 5 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: 1
			},
			mutations: {
				retry: 0
			}
		}
	});
}
