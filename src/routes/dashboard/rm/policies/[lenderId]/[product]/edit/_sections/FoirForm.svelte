<script lang="ts">
	import type { FoirConfig } from '$lib/config/pms/policyTypes.js';

	let { value = $bindable<FoirConfig>() }: { value: FoirConfig } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Salaried FOIR cap</span>
			<div class="relative">
				<input type="number" bind:value={value.salaried} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Self-employed FOIR cap</span>
			<div class="relative">
				<input type="number" bind:value={value.selfEmployed} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
	</div>
	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
