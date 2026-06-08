<script lang="ts">
	import { CheckCircle, CreditCard, Settings, ChevronRight } from 'lucide-svelte';

	let {
		bankCardCount,
		encodedCount,
		isLoading,
		onContinue
	}: {
		bankCardCount: number;
		encodedCount: number;
		isLoading: boolean;
		onContinue: () => Promise<void>;
	} = $props();

	// Dev queue is derived from encoded items that couldn't be fully mapped
	// In Phase 4 this is advisory only — actual items come from pass4 result
	const devQueueCount = 0;
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-xl font-bold text-gray-900">Missed Items</h1>
		<p class="mt-1 text-sm text-gray-500">
			Review clauses that couldn't be encoded as structured rules. These are documented
			for reference — no action required to continue.
		</p>
	</div>

	<!-- Summary banner -->
	<div
		class="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50
		px-5 py-4 text-sm"
	>
		<div class="flex items-center gap-2 text-green-700">
			<CheckCircle size={16} />
			<span class="font-semibold">{encodedCount}</span>
			<span>encoded</span>
		</div>
		<div class="flex items-center gap-2 text-blue-600">
			<CreditCard size={16} />
			<span class="font-semibold">{bankCardCount}</span>
			<span>bank card note{bankCardCount !== 1 ? 's' : ''}</span>
		</div>
		<div class="flex items-center gap-2 text-amber-600">
			<Settings size={16} />
			<span class="font-semibold">{devQueueCount}</span>
			<span>dev queue</span>
		</div>
		<p class="w-full text-xs text-gray-500">All missed items documented.</p>
	</div>

	<!-- Two-column: Bank Card Notes + Dev Queue -->
	<div class="grid grid-cols-2 gap-5">
		<!-- Bank Card Notes -->
		<div class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="mb-3 flex items-center gap-2">
				<CreditCard size={16} class="text-blue-500" />
				<h2 class="text-sm font-semibold text-gray-800">Bank Card Notes</h2>
			</div>
			{#if bankCardCount === 0}
				<p class="text-xs text-gray-400">No clauses routed to bank card.</p>
			{:else}
				<p class="text-sm text-gray-600">
					{bankCardCount} clause{bankCardCount !== 1 ? 's' : ''} will appear as plain-language
					notes on the DSA bank card for this lender.
				</p>
				<p class="mt-2 text-xs text-gray-400">
					These notes are reviewed by admin and shown to DSAs during loan assessment.
				</p>
			{/if}
		</div>

		<!-- Dev Queue -->
		<div class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="mb-3 flex items-center gap-2">
				<Settings size={16} class="text-amber-500" />
				<h2 class="text-sm font-semibold text-gray-800">Dev Queue</h2>
			</div>
			{#if devQueueCount === 0}
				<p class="text-xs text-gray-400">
					No clauses queued for new form key development.
				</p>
			{:else}
				<p class="text-sm text-gray-600">
					{devQueueCount} clause{devQueueCount !== 1 ? 's' : ''} require new form keys
					before they can be encoded as structured rules.
				</p>
				<p class="mt-2 text-xs text-gray-400">
					These are forwarded to the platform team as future enhancements.
				</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-end">
		<button
			type="button"
			onclick={onContinue}
			disabled={isLoading}
			class="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold
			text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
		>
			{#if isLoading}
				<span
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></span>
				Reconstructing…
			{:else}
				Continue to Reconciliation <ChevronRight size={15} />
			{/if}
		</button>
	</div>
</div>
