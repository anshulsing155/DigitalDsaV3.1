<script lang="ts">
	import type { SpecialConditionsData, PolicyCaptureData } from '$lib/types/policyCapture.js';
	import {
		createDefaultSpecialConditions,
		POLICY_CAPTURE_STEPS,
		getVisibleSteps
	} from '$lib/types/policyCapture.js';
	import type { ProductType } from '$lib/types/policyEngine.js';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';
	import { ArrowRight } from '$lib/utils/iconRegistry';

	interface Props {
		data?: SpecialConditionsData;
		captureData: PolicyCaptureData;
		unknownFields: string[];
		isReadOnly: boolean;
		productType: ProductType;
		onUpdate: (data: SpecialConditionsData) => void;
		onSubmit: () => void;
		submitting: boolean;
		/** Submit button label — overridden for admin-proxy capture (A.2). */
		submitLabel?: string;
	}

	let {
		data,
		captureData,
		unknownFields,
		isReadOnly,
		productType,
		onUpdate,
		onSubmit,
		submitting,
		submitLabel = 'Submit for Review'
	}: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<SpecialConditionsData>(data ?? createDefaultSpecialConditions());

	function update<K extends keyof SpecialConditionsData>(key: K, value: SpecialConditionsData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	// Calculate summary stats
	// svelte-ignore state_referenced_locally — intentional: productType is immutable for this step's lifetime
	const visibleSteps = getVisibleSteps(productType);

	function countFilledFields(obj: Record<string, unknown> | undefined | null): number {
		if (!obj) return 0;
		let count = 0;
		for (const [, value] of Object.entries(obj)) {
			if (value !== null && value !== undefined && value !== '' && !Array.isArray(value)) {
				count++;
			} else if (Array.isArray(value) && value.length > 0) {
				count++;
			}
		}
		return count;
	}

	type StepSummary = {
		label: string;
		filled: number;
		total: number;
		unknowns: number;
		status: 'good' | 'partial' | 'empty';
	};

	let stepSummaries = $derived<StepSummary[]>(
		visibleSteps
			.filter((s) => s.id !== 'special_conditions') // Skip review step itself
			.map((step) => {
				const stepData = captureData[step.dataKey] as Record<string, unknown> | undefined;
				const filled = countFilledFields(stepData);
				const stepUnknowns = unknownFields.filter((f) => f.startsWith(`${step.dataKey}.`)).length;
				const total = filled + stepUnknowns + (filled === 0 ? 3 : 0); // estimate
				const status: 'good' | 'partial' | 'empty' =
					filled > 0 ? (stepUnknowns > 0 ? 'partial' : 'good') : 'empty';
				return { label: step.label, filled, total, unknowns: stepUnknowns, status };
			})
	);

	let totalUnknowns = $derived(unknownFields.length);
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Review & Submit</h3>
		<p class="mt-1 text-sm text-gray-500">
			Review your progress, add any special conditions, and submit when ready.
		</p>
	</div>

	<!-- Summary Grid -->
	<div class="space-y-3">
		<h4 class="text-sm font-semibold text-gray-800">Completion Summary</h4>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each stepSummaries as summary}
				<div
					class="flex items-center justify-between rounded-lg border px-3 py-2
					{summary.status === 'good'
						? 'border-green-100 bg-green-50/50'
						: summary.status === 'partial'
							? 'border-amber-100 bg-amber-50/50'
							: 'border-gray-100 bg-gray-50/50'}"
				>
					<span class="text-sm text-gray-700">{summary.label}</span>
					<div class="flex items-center gap-2">
						{#if summary.unknowns > 0}
							<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
								{summary.unknowns} unknown
							</span>
						{/if}
						<span
							class="text-xs font-medium
							{summary.status === 'good'
								? 'text-green-600'
								: summary.status === 'partial'
									? 'text-amber-600'
									: 'text-gray-400'}"
						>
							{summary.filled > 0 ? `${summary.filled} filled` : 'Empty'}
						</span>
					</div>
				</div>
			{/each}
		</div>

		{#if totalUnknowns > 0}
			<p class="text-xs text-amber-600">
				{totalUnknowns} field{totalUnknowns > 1 ? 's' : ''} marked as "Don't Know" — these will be flagged
				for admin follow-up.
			</p>
		{/if}
	</div>

	<!-- Special Conditions -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Special Conditions</h4>
		<p class="text-xs text-gray-500">
			Anything not covered in the structured sections above? Add it here as free text.
		</p>
		<textarea
			value={form.notes ?? ''}
			disabled={isReadOnly}
			oninput={(e) => update('notes', e.currentTarget.value || null)}
			placeholder="e.g., This bank has a special program for doctors where they waive income proof requirements for CIBIL 750+ applicants..."
			rows={4}
			class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
		></textarea>
	</div>

	<!-- Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Additional Custom Entries"
			placeholder="Anything else the admin should know..."
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>

	<!-- Submit Button -->
	{#if !isReadOnly}
		<div class="rounded-lg border border-blue-100 bg-blue-50/50 p-6 text-center">
			<p class="mb-4 text-sm text-gray-600">
				Once submitted, your policy capture will be reviewed by an admin. You can still save as
				draft and come back later.
			</p>
			<button
				type="button"
				onclick={onSubmit}
				disabled={submitting}
				class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
			>
				<ArrowRight class="h-4 w-4" />
				{submitting ? 'Submitting...' : submitLabel}
			</button>
		</div>
	{/if}
</div>
