<script lang="ts">
	import type {
		ObligationsData,
		CreditLineMethod,
		EMIPaidByOthersTreatment
	} from '$lib/types/policyCapture.js';
	import { createDefaultObligations } from '$lib/types/policyCapture.js';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: ObligationsData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: ObligationsData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<ObligationsData>(data ?? createDefaultObligations());

	function update<K extends keyof ObligationsData>(key: K, value: ObligationsData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`obligations.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`obligations.${field}`, !isUnknown(field));
	}

	const CREDIT_LINE_OPTIONS: { value: CreditLineMethod; label: string; desc: string }[] = [
		{
			value: 'percentage_of_limit',
			label: '% of Limit',
			desc: 'Take X% of sanctioned limit as EMI'
		},
		{ value: 'actual_emi', label: 'Actual EMI', desc: 'Use actual monthly payment' },
		{ value: 'minimum_payment', label: 'Min Payment', desc: 'Use minimum due payment' }
	];

	const EMI_OTHERS_OPTIONS: { value: EMIPaidByOthersTreatment; label: string }[] = [
		{ value: 'count_full', label: 'Count Full (100%)' },
		{ value: 'count_half', label: 'Count Half (50%)' },
		{ value: 'ignore', label: 'Ignore (0%)' }
	];
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Obligation Treatment</h3>
		<p class="mt-1 text-sm text-gray-500">
			How does this bank treat existing obligations when calculating eligibility?
		</p>
	</div>

	<!-- Term Loan EMI Factor -->
	<div>
		<div class="flex items-center justify-between">
			<label for="oblig-term-loan-emi-factor" class="text-sm font-medium text-gray-700"
				>Term Loan EMI Factor (%)</label
			>
			<button
				type="button"
				onclick={() => toggleUnknown('term_loan_emi_factor')}
				class="text-xs text-gray-400 hover:text-orange-500"
			>
				{isUnknown('term_loan_emi_factor') ? '? Unknown' : "Don't Know?"}
			</button>
		</div>
		<p class="text-xs text-gray-400">
			What percentage of running term loan EMIs are counted? (Default: 100%)
		</p>
		<input
			id="oblig-term-loan-emi-factor"
			type="number"
			min="0"
			max="100"
			value={form.term_loan_emi_factor ?? ''}
			disabled={isReadOnly || isUnknown('term_loan_emi_factor')}
			oninput={(e) =>
				update(
					'term_loan_emi_factor',
					e.currentTarget.value ? Number(e.currentTarget.value) : null
				)}
			placeholder="e.g., 100"
			class="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
		/>
	</div>

	<!-- Credit Line Method -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">Credit Card / Line of Credit Treatment</span>
		<div
			class="flex flex-wrap gap-2"
			role="group"
			aria-label="Credit Card / Line of Credit Treatment"
		>
			{#each CREDIT_LINE_OPTIONS as opt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() =>
						update('credit_line_method', form.credit_line_method === opt.value ? null : opt.value)}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.credit_line_method === opt.value
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
					title={opt.desc}
				>
					{opt.label}
				</button>
			{/each}
		</div>

		{#if form.credit_line_method === 'percentage_of_limit'}
			<div>
				<label for="oblig-credit-line-factor" class="text-sm text-gray-600"
					>% of Credit Limit to Consider</label
				>
				<input
					id="oblig-credit-line-factor"
					type="number"
					min="0"
					max="100"
					value={form.credit_line_factor ?? ''}
					disabled={isReadOnly}
					oninput={(e) =>
						update(
							'credit_line_factor',
							e.currentTarget.value ? Number(e.currentTarget.value) : null
						)}
					placeholder="e.g., 5"
					class="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
				/>
			</div>
		{/if}
	</div>

	<!-- Ignore Conditions -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div class="space-y-3">
			<span class="text-sm font-medium text-gray-700">Ignore Obligations if Closing?</span>
			<div class="flex gap-2" role="group" aria-label="Ignore Obligations if Closing">
				{#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update('ignore_if_closing', form.ignore_if_closing === opt.val ? null : opt.val)}
						class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
							{form.ignore_if_closing === opt.val
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<label for="oblig-ignore-below-amount" class="text-sm font-medium text-gray-700"
				>Ignore Obligations Below (₹)</label
			>
			<input
				id="oblig-ignore-below-amount"
				type="number"
				value={form.ignore_below_amount ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'ignore_below_amount',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 5000"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Guarantor & EMI by Others -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div>
			<label for="oblig-guarantor-factor" class="text-sm font-medium text-gray-700"
				>Guarantor Obligation Factor (%)</label
			>
			<p class="text-xs text-gray-400">How much of guarantor's obligations to count</p>
			<input
				id="oblig-guarantor-factor"
				type="number"
				min="0"
				max="100"
				value={form.guarantor_factor ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update('guarantor_factor', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="e.g., 50"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>

		<div class="space-y-3">
			<span class="text-sm font-medium text-gray-700">EMI Paid by Others</span>
			<div class="flex flex-wrap gap-2" role="group" aria-label="EMI Paid by Others">
				{#each EMI_OTHERS_OPTIONS as opt}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update(
								'emi_paid_by_others',
								form.emi_paid_by_others === opt.value ? null : opt.value
							)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.emi_paid_by_others === opt.value
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional Obligation Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Obligations?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
