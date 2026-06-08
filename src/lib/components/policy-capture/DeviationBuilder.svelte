<script lang="ts">
	import type {
		DeviationEntry,
		DeviationGateType,
		ApprovalAuthority
	} from '$lib/types/policyCapture.js';
	import { APPROVAL_AUTHORITIES } from '$lib/types/policyCapture.js';

	interface Props {
		entries: DeviationEntry[];
		isReadOnly: boolean;
		onUpdate: (entries: DeviationEntry[]) => void;
	}

	// Default [] — guards SSR against a capture missing this entries array.
	let { entries = [], isReadOnly, onUpdate }: Props = $props();

	const GATE_TYPES: { value: DeviationGateType; label: string }[] = [
		{ value: 'cibil', label: 'CIBIL Score' },
		{ value: 'age', label: 'Age' },
		{ value: 'income_haircut', label: 'Income Haircut' },
		{ value: 'property', label: 'Property' },
		{ value: 'employment', label: 'Employment' },
		{ value: 'tenure', label: 'Tenure' },
		{ value: 'ltv', label: 'LTV' },
		{ value: 'foir', label: 'FOIR' },
		{ value: 'other', label: 'Other' }
	];

	function addEntry() {
		if (entries.length >= 15) return;
		onUpdate([
			...entries,
			{
				gate_type: 'other',
				description: '',
				condition_text: '',
				condition_value: null,
				condition_threshold: null,
				approval_authority: null
			}
		]);
	}

	function removeEntry(index: number) {
		onUpdate(entries.filter((_, i) => i !== index));
	}

	function updateEntry(index: number, changes: Partial<DeviationEntry>) {
		onUpdate(entries.map((e, i) => (i === index ? { ...e, ...changes } : e)));
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h4 class="text-sm font-semibold text-gray-800">Deviations</h4>
			<p class="text-xs text-gray-500">
				What deviations does this bank allow? Add rules the bank can relax with approval.
			</p>
		</div>
		{#if !isReadOnly && entries.length < 15}
			<button
				type="button"
				onclick={addEntry}
				class="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
			>
				+ Add Deviation
			</button>
		{/if}
	</div>

	{#if entries.length === 0}
		<div class="rounded-lg border border-dashed border-gray-200 p-6 text-center">
			<p class="text-sm text-gray-400">No deviations added yet.</p>
			<p class="text-xs text-gray-400">
				Add deviations that this bank can approve on case-by-case basis.
			</p>
		</div>
	{/if}

	{#each entries as entry, idx}
		<div class="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
			<div class="flex items-start justify-between">
				<span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
					Deviation #{idx + 1}
				</span>
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

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label for="deviation-{idx}-gate" class="text-[11px] text-gray-500"
						>Gate Being Relaxed</label
					>
					<select
						id="deviation-{idx}-gate"
						value={entry.gate_type}
						disabled={isReadOnly}
						onchange={(e) =>
							updateEntry(idx, { gate_type: e.currentTarget.value as DeviationGateType })}
						class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
					>
						{#each GATE_TYPES as gt}
							<option value={gt.value}>{gt.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="deviation-{idx}-authority" class="text-[11px] text-gray-500"
						>Approval Authority</label
					>
					<select
						id="deviation-{idx}-authority"
						value={entry.approval_authority ?? ''}
						disabled={isReadOnly}
						onchange={(e) =>
							updateEntry(idx, {
								approval_authority: (e.currentTarget.value || null) as ApprovalAuthority | null
							})}
						class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
					>
						<option value="">Select authority...</option>
						{#each APPROVAL_AUTHORITIES as auth}
							<option value={auth.value}>{auth.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Structured condition fields based on gate type -->
			{#if entry.gate_type === 'cibil'}
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label for="deviation-{idx}-cibil-score" class="text-[11px] text-gray-500"
							>Accept CIBIL Score Down To</label
						>
						<input
							id="deviation-{idx}-cibil-score"
							type="number"
							min="300"
							max="900"
							value={entry.condition_value ?? ''}
							disabled={isReadOnly}
							oninput={(e) =>
								updateEntry(idx, {
									condition_value: e.currentTarget.value ? Number(e.currentTarget.value) : null
								})}
							placeholder="e.g., 625"
							class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					</div>
					<div>
						<label for="deviation-{idx}-income-threshold" class="text-[11px] text-gray-500"
							>If Income Above (₹)</label
						>
						<input
							id="deviation-{idx}-income-threshold"
							type="number"
							value={entry.condition_threshold ?? ''}
							disabled={isReadOnly}
							oninput={(e) =>
								updateEntry(idx, {
									condition_threshold: e.currentTarget.value ? Number(e.currentTarget.value) : null
								})}
							placeholder="e.g., 200000"
							class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					</div>
				</div>
			{:else if entry.gate_type === 'age'}
				<div>
					<label for="deviation-{idx}-age" class="text-[11px] text-gray-500"
						>Allow Age Up To (years)</label
					>
					<input
						id="deviation-{idx}-age"
						type="number"
						value={entry.condition_value ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							updateEntry(idx, {
								condition_value: e.currentTarget.value ? Number(e.currentTarget.value) : null
							})}
						placeholder="e.g., 70"
						class="mt-0.5 w-full max-w-xs rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			{:else if entry.gate_type === 'foir' || entry.gate_type === 'ltv'}
				<div>
					<label for="deviation-{idx}-percent" class="text-[11px] text-gray-500"
						>Allow Up To (%)</label
					>
					<input
						id="deviation-{idx}-percent"
						type="number"
						min="0"
						max="100"
						value={entry.condition_value ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							updateEntry(idx, {
								condition_value: e.currentTarget.value ? Number(e.currentTarget.value) : null
							})}
						placeholder="e.g., 65"
						class="mt-0.5 w-full max-w-xs rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			{:else if entry.gate_type === 'income_haircut'}
				<div>
					<label for="deviation-{idx}-haircut" class="text-[11px] text-gray-500"
						>Reduce Haircut To (%)</label
					>
					<input
						id="deviation-{idx}-haircut"
						type="number"
						min="0"
						max="100"
						value={entry.condition_value ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							updateEntry(idx, {
								condition_value: e.currentTarget.value ? Number(e.currentTarget.value) : null
							})}
						placeholder="e.g., 20"
						class="mt-0.5 w-full max-w-xs rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			{/if}

			<div>
				<label for="deviation-{idx}-condition" class="text-[11px] text-gray-500"
					>Condition / When</label
				>
				<input
					id="deviation-{idx}-condition"
					type="text"
					value={entry.condition_text}
					disabled={isReadOnly}
					oninput={(e) => updateEntry(idx, { condition_text: e.currentTarget.value })}
					placeholder="e.g., Accept CIBIL 650 if income > ₹2L and clean track"
					class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
				/>
			</div>

			<div>
				<label for="deviation-{idx}-desc" class="text-[11px] text-gray-500"
					>Description / Notes</label
				>
				<input
					id="deviation-{idx}-desc"
					type="text"
					value={entry.description}
					disabled={isReadOnly}
					oninput={(e) => updateEntry(idx, { description: e.currentTarget.value })}
					placeholder="Additional context..."
					class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
				/>
			</div>
		</div>
	{/each}
</div>
