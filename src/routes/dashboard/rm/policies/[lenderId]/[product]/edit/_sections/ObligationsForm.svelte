<script lang="ts">
	import type { ObligationConfig } from '$lib/config/pms/policyTypes.js';

	let { value = $bindable<ObligationConfig>() }: { value: ObligationConfig } = $props();
</script>

<div class="space-y-4">
	<label class="flex items-center gap-2 text-sm text-gray-700">
		<input type="checkbox" bind:checked={value.deductFromFoir} class="rounded" />
		Deduct obligations from FOIR calculation
	</label>

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Credit-card FOIR method</span>
		<select
			bind:value={value.creditCardFoirMethod}
			class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
		>
			<option value="utilization">Actual utilization</option>
			<option value="limit_percentage">% of total limit</option>
			<option value="full_limit">Full limit (worst case)</option>
		</select>
	</label>

	{#if value.creditCardFoirMethod === 'limit_percentage'}
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Credit-card limit percentage</span>
			<div class="relative">
				<input
					type="number"
					bind:value={value.creditCardLimitPercentage}
					min="0"
					max="100"
					placeholder="e.g. 5"
					class="mt-1 w-full max-w-[200px] rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
				/>
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
	{/if}

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
