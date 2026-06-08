<script lang="ts">
	import type { SpecialMultiplier } from '$lib/types/policyCapture.js';

	interface Props {
		multipliers: SpecialMultiplier[];
		isReadOnly: boolean;
		onUpdate: (multipliers: SpecialMultiplier[]) => void;
	}

	// Default [] — guards SSR against a capture missing this multipliers array.
	let { multipliers = [], isReadOnly, onUpdate }: Props = $props();

	const PRESET_NAMES = [
		'Double Whammy',
		'Co-applicant Multiplier',
		'Women Borrower Benefit',
		'Income Booster',
		'Salaried Multiplier',
		'Step-up EMI Factor'
	];

	function addMultiplier() {
		onUpdate([
			...multipliers,
			{ name: '', description: '', multiplier_value: null, applies_when: '' }
		]);
	}

	function removeMultiplier(index: number) {
		onUpdate(multipliers.filter((_, i) => i !== index));
	}

	function updateMultiplier(
		index: number,
		field: keyof SpecialMultiplier,
		val: string | number | null
	) {
		const updated = multipliers.map((m, i) => (i === index ? { ...m, [field]: val } : m));
		onUpdate(updated);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
			Special Multipliers / Boosters
		</p>
		{#if !isReadOnly}
			<button
				type="button"
				onclick={addMultiplier}
				class="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
			>
				+ Add Multiplier
			</button>
		{/if}
	</div>

	{#if multipliers.length === 0}
		<p class="text-xs text-gray-400 italic">
			Does this bank use any special multipliers or boosters (Double Whammy, co-applicant boost,
			etc.)?
		</p>
	{/if}

	{#each multipliers as mult, idx}
		<div class="space-y-2 rounded-lg border border-teal-100 bg-teal-50/30 p-3">
			<div class="flex items-start justify-between gap-2">
				<span
					class="shrink-0 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700"
				>
					×{mult.multiplier_value ?? '?'}
				</span>
				{#if !isReadOnly}
					<button
						type="button"
						onclick={() => removeMultiplier(idx)}
						class="text-xs text-red-400 hover:text-red-600"
					>
						Remove
					</button>
				{/if}
			</div>

			<div class="grid gap-2 sm:grid-cols-2">
				<div>
					<label for="multiplier-{idx}-name" class="text-[11px] text-gray-500">Name</label>
					<div class="relative">
						<input
							id="multiplier-{idx}-name"
							type="text"
							value={mult.name}
							disabled={isReadOnly}
							oninput={(e) => updateMultiplier(idx, 'name', e.currentTarget.value)}
							placeholder="e.g., Double Whammy"
							list="multiplier-presets"
							class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-teal-300 disabled:bg-gray-100"
						/>
						<datalist id="multiplier-presets">
							{#each PRESET_NAMES as name}
								<option value={name}></option>
							{/each}
						</datalist>
					</div>
				</div>
				<div>
					<label for="multiplier-{idx}-value" class="text-[11px] text-gray-500"
						>Multiplier Value</label
					>
					<input
						id="multiplier-{idx}-value"
						type="number"
						step="0.01"
						value={mult.multiplier_value ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							updateMultiplier(
								idx,
								'multiplier_value',
								e.currentTarget.value ? Number(e.currentTarget.value) : null
							)}
						placeholder="e.g., 1.1 or 0.9"
						class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-teal-300 disabled:bg-gray-100"
					/>
				</div>
			</div>

			<div>
				<label for="multiplier-{idx}-desc" class="text-[11px] text-gray-500">Description</label>
				<input
					id="multiplier-{idx}-desc"
					type="text"
					value={mult.description}
					disabled={isReadOnly}
					oninput={(e) => updateMultiplier(idx, 'description', e.currentTarget.value)}
					placeholder="What does this multiplier do?"
					class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-teal-300 disabled:bg-gray-100"
				/>
			</div>

			<div>
				<label for="multiplier-{idx}-applies" class="text-[11px] text-gray-500">Applies When</label>
				<input
					id="multiplier-{idx}-applies"
					type="text"
					value={mult.applies_when}
					disabled={isReadOnly}
					oninput={(e) => updateMultiplier(idx, 'applies_when', e.currentTarget.value)}
					placeholder="e.g., Both applicants are salaried with income > ₹50K each"
					class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-teal-300 disabled:bg-gray-100"
				/>
			</div>
		</div>
	{/each}
</div>
