<script lang="ts">
	import type {
		CreditCibilData,
		CIBILAppliesTo,
		LowCIBILHandling,
		RepaymentTrack
	} from '$lib/types/policyCapture.js';
	import { createDefaultCreditCibil } from '$lib/types/policyCapture.js';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: CreditCibilData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: CreditCibilData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<CreditCibilData>(data ?? createDefaultCreditCibil());

	function update<K extends keyof CreditCibilData>(key: K, value: CreditCibilData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`credit_cibil.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`credit_cibil.${field}`, !isUnknown(field));
	}

	function toggleRepaymentTrack(track: RepaymentTrack) {
		const current = form.repayment_track_requirement;
		if (current.includes(track)) {
			update(
				'repayment_track_requirement',
				current.filter((t) => t !== track)
			);
		} else {
			update('repayment_track_requirement', [...current, track]);
		}
	}

	const CIBIL_PRESETS = [600, 625, 650, 675, 700, 725, 750];

	const APPLIES_TO_OPTIONS: { value: CIBILAppliesTo; label: string }[] = [
		{ value: 'primary_only', label: 'Primary Applicant Only' },
		{ value: 'all_applicants', label: 'All Applicants' },
		{ value: 'highest_score', label: 'Highest Score Considered' }
	];

	const LOW_CIBIL_OPTIONS: { value: LowCIBILHandling; label: string }[] = [
		{ value: 'reject', label: 'Reject' },
		{ value: 'accept_with_conditions', label: 'Accept with Conditions' }
	];

	const REPAYMENT_OPTIONS: { value: RepaymentTrack; label: string }[] = [
		{ value: 'clean_only', label: 'Clean Track Only' },
		{ value: 'minor_allowed', label: 'Minor Bounces OK' },
		{ value: 'major_allowed', label: 'Major Bounces OK' }
	];
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Credit & CIBIL Rules</h3>
		<p class="mt-1 text-sm text-gray-500">
			Credit score requirements and how the bank evaluates repayment history.
		</p>
	</div>

	<!-- Min CIBIL Score -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<label for="credit-minCibil" class="text-sm font-medium text-gray-700"
				>Minimum CIBIL Score</label
			>
			<button
				type="button"
				onclick={() => toggleUnknown('min_cibil_score')}
				class="text-xs text-gray-400 hover:text-orange-500"
			>
				{isUnknown('min_cibil_score') ? '? Unknown' : "Don't Know?"}
			</button>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each CIBIL_PRESETS as score}
				<button
					type="button"
					disabled={isReadOnly || isUnknown('min_cibil_score')}
					onclick={() => update('min_cibil_score', form.min_cibil_score === score ? null : score)}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
						{form.min_cibil_score === score
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
				>
					{score}
				</button>
			{/each}
		</div>
		<input
			id="credit-minCibil"
			type="number"
			min="300"
			max="900"
			value={form.min_cibil_score ?? ''}
			disabled={isReadOnly || isUnknown('min_cibil_score')}
			oninput={(e) =>
				update('min_cibil_score', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
			placeholder="Custom score"
			class="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
		/>
	</div>

	<!-- CIBIL Applies To -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">CIBIL Score Applies To</span>
		<div class="flex flex-wrap gap-2" role="group" aria-label="CIBIL Score Applies To">
			{#each APPLIES_TO_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() =>
						update('cibil_applies_to', form.cibil_applies_to === opt.value ? null : opt.value)}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.cibil_applies_to === opt.value
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Low CIBIL Handling -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">Low CIBIL Handling</span>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Low CIBIL Handling">
			{#each LOW_CIBIL_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() =>
						update('low_cibil_handling', form.low_cibil_handling === opt.value ? null : opt.value)}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.low_cibil_handling === opt.value
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>

		{#if form.low_cibil_handling === 'accept_with_conditions'}
			<div>
				<label for="credit-lowCibilConditions" class="text-sm text-gray-600"
					>Conditions for Low CIBIL Acceptance</label
				>
				<textarea
					id="credit-lowCibilConditions"
					value={form.low_cibil_conditions ?? ''}
					disabled={isReadOnly}
					oninput={(e) => update('low_cibil_conditions', e.currentTarget.value || null)}
					placeholder="e.g., Accept 625+ if income > ₹1L and clean repayment track"
					rows={2}
					class="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
				></textarea>
			</div>
		{/if}
	</div>

	<!-- Repayment Track (for BT) -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">Repayment Track Requirement (for BT)</span>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Repayment Track Requirement">
			{#each REPAYMENT_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() => toggleRepaymentTrack(opt.value)}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.repayment_track_requirement.includes(opt.value)
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional CIBIL Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Credit/CIBIL?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
