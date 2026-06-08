<script lang="ts">
	import type { IncomeConfig } from '$lib/config/pms/policyTypes.js';
	import ArrayInput from './ArrayInput.svelte';

	let { value = $bindable<IncomeConfig>() }: { value: IncomeConfig } = $props();
</script>

<div class="space-y-4">
	<ArrayInput bind:values={value.allowedIncomeSources} label="Allowed income sources" placeholder="e.g. salary, rental, business" />

	<div>
		<p class="mb-2 text-xs font-medium text-gray-600">Haircut percentages (by income type)</p>
		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="text-[11px] text-gray-500">Salaried</span>
				<div class="relative">
					<input type="number" bind:value={value.haircutBySalaried} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
					<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
				</div>
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Self-employed</span>
				<div class="relative">
					<input type="number" bind:value={value.haircutBySelfEmployed} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
					<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
				</div>
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Rental</span>
				<div class="relative">
					<input type="number" bind:value={value.haircutByRental} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
					<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
				</div>
			</label>
			<label class="block">
				<span class="text-[11px] text-gray-500">Other</span>
				<div class="relative">
					<input type="number" bind:value={value.haircutByOther} min="0" max="100" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
					<span class="absolute right-3 top-3 text-xs text-gray-400">%</span>
				</div>
			</label>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Min net income (₹/month)</span>
			<input type="number" bind:value={value.minNetIncome} min="0" placeholder="No minimum" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Min gross income (₹/month)</span>
			<input type="number" bind:value={value.minGrossIncome} min="0" placeholder="No minimum" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
		</label>
	</div>

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
