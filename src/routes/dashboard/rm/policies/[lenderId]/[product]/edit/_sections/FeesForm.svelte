<script lang="ts">
	import type { FeeConfig } from '$lib/config/pms/policyTypes.js';

	let { value = $bindable<FeeConfig>() }: { value: FeeConfig } = $props();
</script>

<div class="space-y-4">
	<div>
		<p class="mb-2 text-xs font-medium text-gray-600">Processing fee</p>
		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="text-[11px] text-gray-500">Percent of loan</span>
				<div class="relative">
					<input type="number" bind:value={value.processingFeePercent} min="0" max="10" step="0.01" placeholder="e.g. 0.5" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
					<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
				</div>
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Flat fee (₹)</span>
				<input type="number" bind:value={value.processingFeeFlat} min="0" placeholder="No flat fee" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Min fee (₹)</span>
				<input type="number" bind:value={value.processingFeeMin} min="0" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Max fee (₹)</span>
				<input type="number" bind:value={value.processingFeeMax} min="0" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
			</label>
		</div>
	</div>

	<label class="flex items-center gap-2 text-sm text-gray-700">
		<input type="checkbox" bind:checked={value.prepaymentAllowed} class="rounded" />
		Prepayment allowed
	</label>

	{#if value.prepaymentAllowed}
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Prepayment charge</span>
			<div class="relative">
				<input type="number" bind:value={value.prepaymentChargePercent} min="0" max="10" step="0.01" placeholder="0 for free" class="mt-1 w-full max-w-[200px] rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
	{/if}

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
