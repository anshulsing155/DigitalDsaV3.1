<script lang="ts">
	import { addToast } from '$lib/stores/stores.js';
	import { secureFetch } from '$lib/utils/csrf';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let searchResults = $state<
		Array<{
			_id: string;
			name: string;
			city: string;
			lenderName?: string;
			dsaCode?: string;
		}>
	>([]);
	let isSearching = $state(false);
	let hasSearched = $state(false);

	// ── Preferred DSA state ─────────────────────────────────────
	// Seeded from SSR `data` so the star icons render correctly on first
	// paint. Mutations (toggle below) update the local state optimistically
	// without re-fetching — the API endpoint persists the change.
	// svelte-ignore state_referenced_locally
	let preferredDsaIds = $state<string[]>(data.preferredDsaIds);
	let togglingPreferred = $state<Record<string, boolean>>({});

	async function togglePreferred(dsaId: string) {
		togglingPreferred = { ...togglingPreferred, [dsaId]: true };
		const isCurrentlyPreferred = preferredDsaIds.includes(dsaId);
		try {
			const res = await secureFetch('/api/rm/preferred-dsas', {
				method: isCurrentlyPreferred ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dsa_id: dsaId })
			});
			if (res.ok) {
				if (isCurrentlyPreferred) {
					preferredDsaIds = preferredDsaIds.filter((id) => id !== dsaId);
				} else {
					preferredDsaIds = [...preferredDsaIds, dsaId];
				}
			}
		} catch {
			// Silently fail
		} finally {
			togglingPreferred = { ...togglingPreferred, [dsaId]: false };
		}
	}

	async function searchDSAs() {
		if (!searchQuery.trim()) {
			addToast({
				type: 'warning',
				message: 'Please enter a city or area to search',
				duration: 3000
			});
			return;
		}

		isSearching = true;
		hasSearched = true;
		try {
			const response = await secureFetch('/api/rm/search-dsas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: searchQuery.trim() })
			});

			const result = await response.json();

			if (result.success) {
				searchResults = result.data;
			} else {
				addToast({ type: 'error', message: result.error || 'Search failed', duration: 3000 });
				searchResults = [];
			}
		} catch {
			addToast({ type: 'error', message: 'Search failed. Please try again.', duration: 3000 });
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') searchDSAs();
	}
</script>

<svelte:head>
	<title>DSA Search - RM Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-[var(--dash-text)]">Find DSA Agents</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Search for DSA agents by city or area
		</p>
	</div>

	<!-- Search Bar -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-4">
		<div class="flex gap-3">
			<input
				type="text"
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				placeholder="Search by city (e.g., Mumbai, Delhi, Pune)"
				class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-3 text-sm
					outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20"
			/>
			<button
				onclick={searchDSAs}
				disabled={isSearching}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-6 py-3 text-sm font-medium text-[var(--dash-btn-text)]
					transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSearching ? 'Searching...' : 'Search'}
			</button>
		</div>
	</div>

	<!-- Results -->
	{#if hasSearched}
		{#if searchResults.length > 0}
			<div
				class="divide-y divide-[var(--dash-border)] rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)]"
			>
				{#each searchResults as dsa}
					<div class="flex items-center justify-between p-4">
						<div class="min-w-0 flex-1">
							<p class="font-medium text-[var(--dash-text)]">{dsa.name || 'Unnamed DSA'}</p>
							<p class="text-sm text-[var(--dash-text-secondary)]">
								{dsa.city}
								{#if dsa.lenderName}
									&middot; {dsa.lenderName}
								{/if}
								{#if dsa.dsaCode}
									&middot; {dsa.dsaCode}
								{/if}
							</p>
						</div>
						{#if dsa._id}
							<button
								onclick={() => togglePreferred(dsa._id)}
								disabled={togglingPreferred[dsa._id]}
								class="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors
									{preferredDsaIds.includes(dsa._id)
									? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] hover:bg-[var(--dash-hover)]'
									: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text-muted)]'}
									disabled:opacity-50"
								title={preferredDsaIds.includes(dsa._id)
									? 'Remove from preferred'
									: 'Mark as preferred'}
							>
								{#if preferredDsaIds.includes(dsa._id)}
									<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else}
									<svg
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
										/>
									</svg>
								{/if}
							</button>
						{/if}
					</div>
				{/each}
			</div>
			<p class="text-center text-xs text-[var(--dash-text-muted)]">
				{searchResults.length} result{searchResults.length === 1 ? '' : 's'} found
			</p>
		{:else}
			<div
				class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
			>
				<p class="text-[var(--dash-text-secondary)]">No DSA agents found for "{searchQuery}"</p>
				<p class="mt-1 text-sm text-[var(--dash-text-muted)]">
					Try a different city or broader search term
				</p>
			</div>
		{/if}
	{:else}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-[var(--dash-text)]">Search for DSAs</h3>
			<p class="mx-auto mt-2 max-w-md text-sm text-[var(--dash-text-secondary)]">
				Enter a city to find DSA agents in that area. You can then connect with them to receive case
				files.
			</p>
		</div>
	{/if}
</div>
