<script lang="ts">
	import type { PolicySlab } from '$lib/types/policyCapture.js';
	import { Plus, Trash2 } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n/index.js';

	interface Props {
		slabs: PolicySlab[];
		label: string;
		fromLabel?: string;
		toLabel?: string;
		valueLabel?: string;
		valueUnit?: string; // e.g., "%" or "months"
		fromUnit?: string; // e.g., "₹" for currency ranges
		isReadOnly?: boolean;
		onUpdate: (slabs: PolicySlab[]) => void;
	}

	let {
		// Default [] — guards SSR against a capture missing this slab array.
		slabs = [],
		label,
		fromLabel = 'From',
		toLabel = 'To',
		valueLabel = 'Value',
		valueUnit = '%',
		fromUnit = '',
		isReadOnly = false,
		onUpdate
	}: Props = $props();

	function addSlab() {
		const lastTo = slabs.length > 0 ? slabs[slabs.length - 1].to : 0;
		onUpdate([...slabs, { from: lastTo, to: 0, value: 0 }]);
	}

	function removeSlab(index: number) {
		const updated = slabs.filter((_, i) => i !== index);
		onUpdate(updated);
	}

	function updateSlab(index: number, field: keyof PolicySlab, value: number) {
		const updated = slabs.map((s, i) => (i === index ? { ...s, [field]: value } : s));
		onUpdate(updated);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<p class="text-sm font-medium text-gray-700">{label}</p>
		{#if !isReadOnly}
			<button
				type="button"
				onclick={addSlab}
				class="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
			>
				<Plus class="h-3.5 w-3.5" />
				Add Slab
			</button>
		{/if}
	</div>

	{#if slabs.length === 0}
		<p class="text-xs text-gray-400 italic">
			No slabs defined. Click "Add Slab" to add range-based rules.
		</p>
	{:else}
		<div class="space-y-2">
			<!-- Header -->
			<div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500">
				<span>{fromLabel}</span>
				<span>{toLabel}</span>
				<span>{valueLabel}</span>
				<span class="w-8"></span>
			</div>

			{#each slabs as slab, index}
				<div class="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
					<div class="relative">
						{#if fromUnit}
							<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-gray-400"
								>{fromUnit}</span
							>
						{/if}
						<input
							type="number"
							value={slab.from}
							disabled={isReadOnly}
							oninput={(e) => updateSlab(index, 'from', Number(e.currentTarget.value))}
							class="w-full rounded-lg border border-gray-200 py-2 text-sm {fromUnit
								? 'pl-5'
								: 'px-3'} pr-3 outline-none focus:border-blue-300 disabled:opacity-50"
						/>
					</div>
					<div class="relative">
						{#if fromUnit}
							<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-gray-400"
								>{fromUnit}</span
							>
						{/if}
						<input
							type="number"
							value={slab.to}
							disabled={isReadOnly}
							oninput={(e) => updateSlab(index, 'to', Number(e.currentTarget.value))}
							class="w-full rounded-lg border border-gray-200 py-2 text-sm {fromUnit
								? 'pl-5'
								: 'px-3'} pr-3 outline-none focus:border-blue-300 disabled:opacity-50"
							placeholder="0 = open"
						/>
					</div>
					<div class="relative">
						<input
							type="number"
							value={slab.value}
							disabled={isReadOnly}
							oninput={(e) => updateSlab(index, 'value', Number(e.currentTarget.value))}
							class="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300 disabled:opacity-50"
						/>
						<span class="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-gray-400"
							>{valueUnit}</span
						>
					</div>
					{#if !isReadOnly}
						<button
							type="button"
							onclick={() => removeSlab(index)}
							class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
