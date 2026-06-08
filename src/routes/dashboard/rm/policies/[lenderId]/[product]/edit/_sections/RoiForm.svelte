<script lang="ts">
	import type { RoiConfig } from '$lib/config/pms/policyTypes.js';

	let { value = $bindable<RoiConfig>() }: { value: RoiConfig } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Min ROI</span>
			<div class="relative">
				<input type="number" bind:value={value.minRoi} min="0" max="50" step="0.01" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Max ROI</span>
			<div class="relative">
				<input type="number" bind:value={value.maxRoi} min="0" max="50" step="0.01" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Spread over repo rate</span>
			<div class="relative">
				<input type="number" bind:value={value.spreadOverRepo} step="0.01" placeholder="N/A for fixed" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
			</div>
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">ROI type</span>
			<select bind:value={value.roiType} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
				<option value="fixed">Fixed</option>
				<option value="floating">Floating</option>
				<option value="both">Both (customer chooses)</option>
			</select>
		</label>
	</div>
	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
