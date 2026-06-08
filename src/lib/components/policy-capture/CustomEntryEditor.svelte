<script lang="ts">
	import type { CustomEntry } from '$lib/types/policyCapture.js';

	interface Props {
		entries: CustomEntry[];
		label?: string;
		placeholder?: string;
		categories?: string[];
		isReadOnly: boolean;
		onUpdate: (entries: CustomEntry[]) => void;
	}

	let {
		// Default [] — guards SSR against a capture missing this entries array.
		entries = [],
		label = 'Additional Info (Custom)',
		placeholder = 'Describe the rule, condition, or parameter...',
		categories = ['condition', 'multiplier', 'special_scheme', 'restriction', 'other'],
		isReadOnly,
		onUpdate
	}: Props = $props();

	function addEntry() {
		onUpdate([...entries, { label: '', value: '', category: 'other' }]);
	}

	function removeEntry(index: number) {
		onUpdate(entries.filter((_, i) => i !== index));
	}

	function updateEntry(index: number, field: keyof CustomEntry, val: string) {
		const updated = entries.map((e, i) => (i === index ? { ...e, [field]: val } : e));
		onUpdate(updated);
	}

	const CATEGORY_LABELS: Record<string, string> = {
		condition: 'Condition',
		multiplier: 'Multiplier',
		special_scheme: 'Special Scheme',
		restriction: 'Restriction',
		other: 'Other'
	};
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</p>
		{#if !isReadOnly}
			<button
				type="button"
				onclick={addEntry}
				class="rounded-lg bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
			>
				+ Add New
			</button>
		{/if}
	</div>

	{#if entries.length === 0}
		<p class="text-xs text-gray-400 italic">
			Nothing extra to add? Skip this. Use "Add New" for anything our form doesn't cover.
		</p>
	{/if}

	{#each entries as entry, idx}
		<div class="space-y-2 rounded-lg border border-purple-100 bg-purple-50/30 p-3">
			<div class="flex items-start justify-between gap-2">
				<select
					value={entry.category || 'other'}
					disabled={isReadOnly}
					onchange={(e) => updateEntry(idx, 'category', e.currentTarget.value)}
					class="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 outline-none focus:border-purple-300 disabled:bg-gray-100"
				>
					{#each categories as cat}
						<option value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
					{/each}
				</select>
				{#if !isReadOnly}
					<button
						type="button"
						onclick={() => removeEntry(idx)}
						class="text-xs text-red-400 hover:text-red-600"
					>
						Remove
					</button>
				{/if}
			</div>

			<div>
				<label for="custom-{idx}-label" class="text-[11px] text-gray-500">What is this about?</label
				>
				<input
					id="custom-{idx}-label"
					type="text"
					value={entry.label}
					disabled={isReadOnly}
					oninput={(e) => updateEntry(idx, 'label', e.currentTarget.value)}
					placeholder="e.g., Women borrower discount"
					class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-purple-300 disabled:bg-gray-100"
				/>
			</div>

			<div>
				<label for="custom-{idx}-value" class="text-[11px] text-gray-500">Details / Value</label>
				<textarea
					id="custom-{idx}-value"
					value={entry.value}
					disabled={isReadOnly}
					oninput={(e) => updateEntry(idx, 'value', e.currentTarget.value)}
					{placeholder}
					rows={2}
					class="mt-0.5 w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-purple-300 disabled:bg-gray-100"
				></textarea>
			</div>
		</div>
	{/each}
</div>
