<script lang="ts">
	import type { LtvConfig } from '$lib/config/pms/policyTypes.js';
	import { Plus, X } from 'lucide-svelte';

	let { value = $bindable<LtvConfig | null>() }: { value: LtvConfig | null } = $props();

	function enable() {
		value = { maxLtvByPropertyType: {}, maxLtvByLoanAmount: [], notes: null };
	}
	function disable() {
		value = null;
	}

	let newPropertyType = $state('');
	let newLtv = $state<number | ''>('');

	function addPropertyType() {
		if (!value || !newPropertyType.trim() || newLtv === '') return;
		value.maxLtvByPropertyType = { ...value.maxLtvByPropertyType, [newPropertyType.trim()]: Number(newLtv) };
		newPropertyType = '';
		newLtv = '';
	}

	function removePropertyType(key: string) {
		if (!value) return;
		const copy = { ...value.maxLtvByPropertyType };
		delete copy[key];
		value.maxLtvByPropertyType = copy;
	}

	function addSlab() {
		if (!value) return;
		value.maxLtvByLoanAmount = [...value.maxLtvByLoanAmount, { upTo: 0, maxLtv: 0 }];
	}

	function removeSlab(i: number) {
		if (!value) return;
		value.maxLtvByLoanAmount = value.maxLtvByLoanAmount.filter((_, idx) => idx !== i);
	}
</script>

<div class="space-y-4">
	{#if value === null}
		<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
			LTV configuration is disabled for this product (e.g. unsecured loans).
			<button type="button" onclick={enable} class="ml-2 text-amber-600 hover:underline">Enable →</button>
		</div>
	{:else}
		<div class="flex items-center justify-between">
			<p class="text-xs font-medium text-gray-600">LTV enabled</p>
			<button type="button" onclick={disable} class="text-xs text-gray-400 hover:text-red-500">Disable LTV</button>
		</div>

		<div>
			<p class="mb-2 text-xs font-medium text-gray-600">Max LTV by property type</p>
			{#each Object.entries(value.maxLtvByPropertyType) as [key, pct] (key)}
				<div class="mb-1.5 flex items-center gap-2">
					<span class="flex-1 rounded bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">{key}</span>
					<span class="rounded bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">{pct}%</span>
					<button type="button" onclick={() => removePropertyType(key)} class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Remove">
						<X size={12} />
					</button>
				</div>
			{/each}
			<div class="mt-1.5 flex gap-1.5">
				<input type="text" bind:value={newPropertyType} placeholder="Property type (e.g. flat)" class="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<input type="number" bind:value={newLtv} placeholder="%" min="0" max="100" class="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
				<button type="button" onclick={addPropertyType} disabled={!newPropertyType.trim() || newLtv === ''} class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
					<Plus size={12} /> Add
				</button>
			</div>
		</div>

		<div>
			<p class="mb-2 text-xs font-medium text-gray-600">Max LTV by loan-amount slab</p>
			{#each value.maxLtvByLoanAmount as slab, i (i)}
				<div class="mb-1.5 flex items-center gap-2">
					<label class="flex-1 text-xs text-gray-500">
						Up to ₹
						<input type="number" bind:value={slab.upTo} min="0" class="ml-1 w-32 rounded border border-gray-300 px-2 py-1 text-xs" />
					</label>
					<label class="text-xs text-gray-500">
						Max LTV
						<input type="number" bind:value={slab.maxLtv} min="0" max="100" class="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs" />
						%
					</label>
					<button type="button" onclick={() => removeSlab(i)} class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Remove slab">
						<X size={12} />
					</button>
				</div>
			{/each}
			<button type="button" onclick={addSlab} class="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 hover:underline">
				<Plus size={12} /> Add slab
			</button>
		</div>

		<label class="block">
			<span class="text-xs font-medium text-gray-600">Notes</span>
			<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
		</label>
	{/if}
</div>
