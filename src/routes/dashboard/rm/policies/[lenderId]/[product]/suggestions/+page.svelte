<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf.js';
	import { goto, invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// ── Active tab (pending / accepted / dismissed) ───────────────────────────

	// Mirrors data.statusFilter from the URL. $derived re-evaluates when the
	// page reloads with a different ?status= query (otherwise it would freeze
	// at the initial value).
	let activeStatus = $derived(data.statusFilter);

	function switchTab(status: 'pending' | 'accepted' | 'dismissed') {
		goto(`?status=${status}`, { replaceState: true });
	}

	// ── Review state (per-row) ────────────────────────────────────────────────

	// Maps suggestion id → loading state
	let resolving = $state<Record<string, boolean>>({});
	let resolveErrors = $state<Record<string, string>>({});
	let reviewNotes = $state<Record<string, string>>({});

	async function resolve(id: string, resolution: 'accepted' | 'dismissed') {
		resolving[id] = true;
		resolveErrors[id] = '';

		try {
			const res = await secureFetch(`/api/pms/suggestions/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resolution,
					reviewNote: reviewNotes[id]?.trim() || null
				})
			});
			const json = await res.json();

			if (!res.ok) {
				resolveErrors[id] = json.error ?? 'Failed to resolve. Please try again.';
			} else {
				// Refresh data to reflect the status change
				await invalidateAll();
			}
		} catch {
			resolveErrors[id] = 'Network error.';
		} finally {
			resolving[id] = false;
		}
	}

	// ── Display helpers ───────────────────────────────────────────────────────

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<svelte:head>
	<title>DSA Suggestions — {data.lenderName} {data.loanProduct} — DigitalDSA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="border-b border-gray-200 bg-white px-6 py-4">
		<a
			href="/dashboard/rm/policies/{data.lenderId}/{encodeURIComponent(data.loanProduct)}"
			class="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
		>
			<ArrowLeft size={13} /> Back to policy
		</a>

		<div class="flex items-center gap-3">
			<MessageSquare size={18} class="text-blue-600" />
			<div>
				<h1 class="text-base font-bold text-gray-900">DSA Suggestions</h1>
				<p class="text-xs text-gray-500">{data.lenderName} · {data.loanProduct}</p>
			</div>
			{#if data.counts.pending > 0}
				<span class="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
					{data.counts.pending} pending
				</span>
			{/if}
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-6 py-6">
		<!-- ── Status tabs ──────────────────────────────────────────────────── -->
		<div class="mb-5 flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
			{#each [
				{ key: 'pending', label: 'Pending', count: data.counts.pending, icon: Clock },
				{ key: 'accepted', label: 'Accepted', count: data.counts.accepted, icon: CheckCircle },
				{ key: 'dismissed', label: 'Dismissed', count: data.counts.dismissed, icon: XCircle }
			] as tab (tab.key)}
				<button
					type="button"
					onclick={() => switchTab(tab.key as 'pending' | 'accepted' | 'dismissed')}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
					{activeStatus === tab.key
						? 'bg-blue-50 text-blue-700'
						: 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
				>
					<tab.icon size={13} />
					{tab.label}
					{#if tab.count > 0}
						<span class="rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-semibold text-gray-600">
							{tab.count}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- ── Suggestion list ──────────────────────────────────────────────── -->
		{#if data.suggestions.length === 0}
			<div class="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
				<MessageSquare size={32} class="mx-auto mb-3 text-gray-300" />
				<p class="text-sm font-medium text-gray-500">No {activeStatus} suggestions</p>
				<p class="mt-1 text-xs text-gray-400">
					DSAs submit suggestions from the results page after running a case.
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.suggestions as suggestion (suggestion.id)}
					<div class="rounded-xl border border-gray-200 bg-white p-4">
						<!-- Header row -->
						<div class="mb-3 flex items-start justify-between gap-3">
							<div>
								{#if suggestion.fieldPath}
									<p class="font-mono text-xs font-semibold text-gray-700">{suggestion.fieldPath}</p>
								{/if}
								{#if suggestion.caseReference}
									<p class="mt-0.5 text-[11px] text-gray-400">Case: {suggestion.caseReference}</p>
								{/if}
								{#if suggestion.branchCity}
									<p class="mt-0.5 text-[11px] text-gray-400">City: {suggestion.branchCity}</p>
								{/if}
							</div>
							<span class="shrink-0 text-[11px] text-gray-400">{formatDate(suggestion.submittedAt)}</span>
						</div>

						<!-- Current vs suggested values -->
						{#if suggestion.currentValue !== null || suggestion.suggestedValue !== null}
							<div class="mb-3 grid grid-cols-2 gap-2">
								<div class="rounded-md bg-red-50 px-3 py-2">
									<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">Current</p>
									<p class="font-mono text-xs text-red-800">{formatValue(suggestion.currentValue)}</p>
								</div>
								<div class="rounded-md bg-green-50 px-3 py-2">
									<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600">Suggested</p>
									<p class="font-mono text-xs text-green-800">{formatValue(suggestion.suggestedValue)}</p>
								</div>
							</div>
						{/if}

						<!-- DSA note. The <blockquote> + italic styling already conveys the
						     quotation; literal `"..."` characters would double up when a note
						     happens to start or end with a quote. -->
						<blockquote class="mb-3 rounded-md border-l-2 border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800 italic">
							{suggestion.dsaNote}
						</blockquote>

						<!-- Pending: resolve controls -->
						{#if suggestion.status === 'pending'}
							<div class="space-y-2">
								<textarea
									bind:value={reviewNotes[suggestion.id]}
									placeholder="Optional note (shown to DSA on acceptance)"
									rows={2}
									maxlength={500}
									class="w-full rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
								></textarea>

								{#if resolveErrors[suggestion.id]}
									<p class="text-xs text-red-600">{resolveErrors[suggestion.id]}</p>
								{/if}

								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => resolve(suggestion.id, 'accepted')}
										disabled={resolving[suggestion.id]}
										class="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
									>
										<CheckCircle size={12} />
										{resolving[suggestion.id] ? 'Saving…' : 'Accept'}
									</button>
									<button
										type="button"
										onclick={() => resolve(suggestion.id, 'dismissed')}
										disabled={resolving[suggestion.id]}
										class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
									>
										<XCircle size={12} />
										{resolving[suggestion.id] ? 'Saving…' : 'Dismiss'}
									</button>
								</div>
							</div>

						<!-- Resolved: show review note -->
						{:else if suggestion.reviewNote}
							<div class="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
								<span class="font-semibold">RM note:</span> {suggestion.reviewNote}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
