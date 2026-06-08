<script lang="ts">
	import type { TenureConfig } from '$lib/config/pms/policyTypes.js';

	let { value = $bindable<TenureConfig>() }: { value: TenureConfig } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Min tenure (months)</span>
			<input type="number" bind:value={value.minTenureMonths} min="1" max="480" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Max tenure (months)</span>
			<input type="number" bind:value={value.maxTenureMonths} min="1" max="480" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
		</label>
	</div>
	<label class="block">
		<span class="text-xs font-medium text-gray-600">Max age at maturity</span>
		<input type="number" bind:value={value.maxAgeAtMaturity} min="18" max="99" class="mt-1 w-full max-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
	</label>
	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
