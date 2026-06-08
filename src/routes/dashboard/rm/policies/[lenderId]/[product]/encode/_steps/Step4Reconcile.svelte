<script lang="ts">
	import { CheckCircle, Minus, ChevronRight, Loader2 } from 'lucide-svelte';
	import type { Pass2Clause, Pass6Result } from '$lib/config/pms/policyTypes.js';

	let {
		clauses,
		pass6Result,
		isLoading,
		onSignOff
	}: {
		clauses: Pass2Clause[];
		pass6Result: Pass6Result | null;
		isLoading: boolean;
		onSignOff: () => Promise<void>;
	} = $props();

	// Per-clause reconciliation decision: 'matched' | 'differs' | 'excluded'.
	// Seeded from clauses prop on mount; mutated locally as the user reviews.
	// svelte-ignore state_referenced_locally
	let clauseStatuses = $state<Record<string, 'matched' | 'differs' | 'excluded'>>(
		Object.fromEntries(clauses.map((c) => [c.id, 'matched']))
	);

	let signOffChecked = $state(false);

	const allResolved = $derived(
		clauses.every((c) => clauseStatuses[c.id] === 'matched' || clauseStatuses[c.id] === 'excluded')
	);

	const canSignOff = $derived(allResolved && signOffChecked && !isLoading);

	function getReconstructed(clauseId: string): string {
		if (!pass6Result) return '—';
		return pass6Result.methodA.find((r) => r.clauseId === clauseId)?.reconstructedText ?? '—';
	}

	function statusBadge(status: string) {
		if (status === 'matched')
			return 'bg-green-100 text-green-700';
		if (status === 'excluded')
			return 'bg-gray-100 text-gray-500';
		return 'bg-amber-100 text-amber-700';
	}
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<h1 class="text-xl font-bold text-gray-900">Reconciliation</h1>
		<p class="mt-1 text-sm text-gray-500">
			Compare the original policy text with the AI reconstruction to verify accuracy.
			Mark each clause as Matched or Excluded before signing off.
		</p>
	</div>

	{#if !pass6Result}
		<div class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
			<Loader2 size={16} class="animate-spin" />
			Running reconstruction… this may take a moment.
		</div>
	{/if}

	<!-- Reconciliation table -->
	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
					<th class="px-4 py-3 w-5/12">Original</th>
					<th class="px-4 py-3 w-5/12">Reconstructed (Method A)</th>
					<th class="px-4 py-3 w-1/12">Status</th>
					<th class="px-4 py-3 w-1/12">Action</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-50">
				{#each clauses as clause, i (clause.id)}
					{@const status = clauseStatuses[clause.id] ?? 'matched'}
					{@const reconstructed = getReconstructed(clause.id)}
					<tr class="align-top">
						<td class="px-4 py-3 text-gray-700">{clause.originalText}</td>
						<td class="px-4 py-3">
							{#if !pass6Result}
								<span class="text-gray-300">—</span>
							{:else}
								<span class="text-gray-600 {reconstructed === '—' ? 'text-gray-300' : ''}">
									{reconstructed}
								</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {statusBadge(status)}">
								{status === 'matched' ? 'Matched' : status === 'excluded' ? 'Excluded' : 'Differs'}
							</span>
						</td>
						<td class="px-4 py-3">
							{#if status !== 'excluded'}
								<button
									type="button"
									onclick={() =>
										(clauseStatuses = {
											...clauseStatuses,
											[clause.id]: 'excluded'
										})}
									class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px]
									font-medium text-gray-500 hover:bg-gray-200"
								>
									<Minus size={10} /> Exclude
								</button>
							{:else}
								<button
									type="button"
									onclick={() =>
										(clauseStatuses = {
											...clauseStatuses,
											[clause.id]: 'matched'
										})}
									class="rounded bg-green-50 px-2 py-1 text-[10px] font-medium
									text-green-600 hover:bg-green-100"
								>
									Restore
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Method B prose reconstruction -->
	{#if pass6Result?.methodB}
		<details class="rounded-xl border border-gray-200 bg-white">
			<summary class="cursor-pointer px-5 py-3 text-sm font-medium text-gray-700">
				Method B — AI prose reconstruction (full policy)
			</summary>
			<div class="border-t border-gray-100 px-5 py-4 text-sm text-gray-600 whitespace-pre-wrap">
				{pass6Result.methodB}
			</div>
		</details>
	{/if}

	<!-- Sign-off section -->
	{#if allResolved}
		<div class="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
			<div class="flex items-center gap-2 text-green-700">
				<CheckCircle size={18} />
				<p class="text-sm font-semibold">All non-excluded clauses are Matched.</p>
			</div>

			<label class="flex cursor-pointer items-start gap-3 text-sm">
				<input
					type="checkbox"
					bind:checked={signOffChecked}
					class="mt-0.5"
				/>
				<span class="text-gray-700">
					I have reviewed the original and reconstructed policy text. I confirm the
					encoding is accurate and ready for admin review.
				</span>
			</label>

			<button
				type="button"
				onclick={onSignOff}
				disabled={!canSignOff}
				class="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold
				text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
			>
				{#if isLoading}
					<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
					Saving sign-off…
				{:else}
					Sign off &amp; Continue to Submit <ChevronRight size={15} />
				{/if}
			</button>
		</div>
	{:else}
		<p class="text-sm text-amber-600">
			Mark all clauses as Matched or Excluded to unlock the sign-off checkbox.
		</p>
	{/if}
</div>
