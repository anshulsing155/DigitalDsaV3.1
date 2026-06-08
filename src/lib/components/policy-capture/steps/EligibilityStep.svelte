<script lang="ts">
	import type {
		EligibilityData,
		ResidencyPolicy,
		ApplicationStructure
	} from '$lib/types/policyCapture.js';
	import { createDefaultEligibility } from '$lib/types/policyCapture.js';
	import type { IncomeProfileType } from '$lib/types/incomeProfile.js';
	import { INCOME_PROFILE_CARDS } from '$lib/config/incomeProfiles/profileCards.js';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: EligibilityData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: EligibilityData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<EligibilityData>(data ?? createDefaultEligibility());

	function update<K extends keyof EligibilityData>(key: K, value: EligibilityData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`eligibility.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`eligibility.${field}`, !isUnknown(field));
	}

	function toggleEmploymentType(type: IncomeProfileType) {
		const current = form.accepted_employment_types;
		if (current.includes(type)) {
			update(
				'accepted_employment_types',
				current.filter((t) => t !== type)
			);
		} else {
			update('accepted_employment_types', [...current, type]);
		}
	}

	function toggleStructure(structure: ApplicationStructure) {
		const current = form.application_structures;
		if (current.includes(structure)) {
			update(
				'application_structures',
				current.filter((s) => s !== structure)
			);
		} else {
			update('application_structures', [...current, structure]);
		}
	}

	const RESIDENCY_OPTIONS: { value: ResidencyPolicy; label: string; desc: string }[] = [
		{ value: 'indian_only', label: 'Indian Residents Only', desc: 'No NRI applicants' },
		{ value: 'nri_allowed', label: 'NRI Allowed', desc: 'NRI can apply without conditions' },
		{
			value: 'nri_with_conditions',
			label: 'NRI with Conditions',
			desc: 'NRI allowed with restrictions'
		}
	];

	const STRUCTURE_OPTIONS: { value: ApplicationStructure; label: string }[] = [
		{ value: 'individual', label: 'Individual' },
		{ value: 'joint', label: 'Joint' },
		{ value: 'family', label: 'Family' }
	];

	// Group income profile cards by category
	const employmentCards = INCOME_PROFILE_CARDS.filter(
		(c) => c.category === 'employment_business' && !c.exclusive
	);
	const otherCards = INCOME_PROFILE_CARDS.filter(
		(c) => c.category === 'other_income' && !c.exclusive
	);
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Eligibility Gates</h3>
		<p class="mt-1 text-sm text-gray-500">
			Who can apply for this product? Define age, employment, residency, and experience
			requirements.
		</p>
	</div>

	<!-- Age Range -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div>
			<div class="flex items-center justify-between">
				<label for="elig-minAge" class="text-sm font-medium text-gray-700">Min Age (years)</label>
				<button
					type="button"
					onclick={() => toggleUnknown('min_age')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('min_age') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>
			<input
				id="elig-minAge"
				type="number"
				min="18"
				max="80"
				value={form.min_age ?? ''}
				disabled={isReadOnly || isUnknown('min_age')}
				oninput={(e) =>
					update('min_age', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="e.g., 21"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<div class="flex items-center justify-between">
				<label for="elig-maxAge" class="text-sm font-medium text-gray-700">Max Age (years)</label>
				<button
					type="button"
					onclick={() => toggleUnknown('max_age')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('max_age') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>
			<input
				id="elig-maxAge"
				type="number"
				min="18"
				max="80"
				value={form.max_age ?? ''}
				disabled={isReadOnly || isUnknown('max_age')}
				oninput={(e) =>
					update('max_age', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="e.g., 65"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Accepted Employment Types -->
	<div class="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Accepted Employment Types</h4>
		<p class="text-xs text-gray-500">
			Select all employment/income types this bank accepts for this product.
		</p>

		<div class="space-y-3">
			<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">
				Employment & Business
			</p>
			<div class="flex flex-wrap gap-2">
				{#each employmentCards as card}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() => toggleEmploymentType(card.type)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.accepted_employment_types.includes(card.type)
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{card.label}
					</button>
				{/each}
			</div>

			<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">Other Income</p>
			<div class="flex flex-wrap gap-2">
				{#each otherCards as card}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() => toggleEmploymentType(card.type)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.accepted_employment_types.includes(card.type)
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{card.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Application Structure -->
	<div>
		<span class="text-sm font-medium text-gray-700">Application Structure</span>
		<div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Application Structure">
			{#each STRUCTURE_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() => toggleStructure(opt.value)}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
						{form.application_structures.includes(opt.value)
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Residency -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700">Residency Policy</span>
			<button
				type="button"
				onclick={() => toggleUnknown('residency_policy')}
				class="text-xs text-gray-400 hover:text-orange-500"
			>
				{isUnknown('residency_policy') ? '? Unknown' : "Don't Know?"}
			</button>
		</div>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Residency Policy">
			{#each RESIDENCY_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly || isUnknown('residency_policy')}
					onclick={() =>
						update('residency_policy', form.residency_policy === opt.value ? null : opt.value)}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.residency_policy === opt.value
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
					title={opt.desc}
				>
					{opt.label}
				</button>
			{/each}
		</div>

		{#if form.residency_policy === 'nri_with_conditions'}
			<div>
				<label for="elig-nriConditions" class="text-sm text-gray-600">NRI Conditions</label>
				<textarea
					id="elig-nriConditions"
					value={form.nri_conditions ?? ''}
					disabled={isReadOnly}
					oninput={(e) => update('nri_conditions', e.currentTarget.value || null)}
					placeholder="Describe NRI-specific conditions..."
					rows={2}
					class="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
				></textarea>
			</div>
		{/if}
	</div>

	<!-- Experience Requirements -->
	<div class="grid gap-6 sm:grid-cols-3">
		<div>
			<div class="flex items-center justify-between">
				<label for="elig-minYearsAddr" class="text-sm font-medium text-gray-700"
					>Min Years at Address</label
				>
				<button
					type="button"
					onclick={() => toggleUnknown('min_years_at_address')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('min_years_at_address') ? '?' : '?'}
				</button>
			</div>
			<input
				id="elig-minYearsAddr"
				type="number"
				min="0"
				value={form.min_years_at_address ?? ''}
				disabled={isReadOnly || isUnknown('min_years_at_address')}
				oninput={(e) =>
					update(
						'min_years_at_address',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 1"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="elig-minWorkExp" class="text-sm font-medium text-gray-700"
				>Min Work Experience (yrs)</label
			>
			<input
				id="elig-minWorkExp"
				type="number"
				min="0"
				value={form.min_work_experience_years ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'min_work_experience_years',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 2"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="elig-minCurrEmp" class="text-sm font-medium text-gray-700"
				>Min Current Employer (yrs)</label
			>
			<input
				id="elig-minCurrEmp"
				type="number"
				min="0"
				value={form.min_current_employer_tenure_years ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'min_current_employer_tenure_years',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 1"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional Eligibility Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Eligibility?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
