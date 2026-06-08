<script lang="ts">
	import type { FeesPoliciesData } from '$lib/types/policyCapture.js';
	import { createDefaultFeesPolicies } from '$lib/types/policyCapture.js';
	import type { PolicyFieldKey } from '$lib/types/policyEngine.js';
	import { POLICY_FIELD_LABELS } from '$lib/types/policyEngine.js';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: FeesPoliciesData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: FeesPoliciesData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<FeesPoliciesData>(data ?? createDefaultFeesPolicies());

	function updateField(key: PolicyFieldKey, value: string | number | boolean | null) {
		const newFields = { ...form.fields, [key]: value };
		form = { ...form, fields: newFields };
		onUpdate(form);
	}

	function update<K extends keyof FeesPoliciesData>(key: K, value: FeesPoliciesData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`fees_policies.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`fees_policies.${field}`, !isUnknown(field));
	}

	// Group policy fields into sections for better UX
	// Skip fields already covered in Core Parameters step
	const FEES_FIELDS: {
		key: PolicyFieldKey;
		type: 'text' | 'number' | 'boolean';
		placeholder?: string;
	}[] = [
		{ key: 'prepayment_charge_floating', type: 'text', placeholder: 'e.g., Nil for floating rate' },
		{ key: 'prepayment_charge_fixed', type: 'text', placeholder: 'e.g., 2% of outstanding' },
		{ key: 'lock_in_period_months', type: 'number', placeholder: 'e.g., 12' },
		{ key: 'legal_technical_fee', type: 'text', placeholder: 'e.g., ₹5000 + GST' },
		{ key: 'cersai_charge', type: 'text', placeholder: 'e.g., ₹100' },
		{ key: 'stamp_duty_info', type: 'text', placeholder: 'e.g., As per state norms' }
	];

	const INSURANCE_FIELDS: {
		key: PolicyFieldKey;
		type: 'text' | 'boolean';
		placeholder?: string;
	}[] = [
		{ key: 'insurance_mandatory', type: 'boolean' },
		{ key: 'insurance_type', type: 'text', placeholder: 'e.g., Property, Life, both' }
	];

	const TAT_FIELDS: { key: PolicyFieldKey; type: 'number'; placeholder?: string }[] = [
		{ key: 'login_to_sanction_days', type: 'number', placeholder: 'e.g., 7' },
		{ key: 'login_to_disbursal_days', type: 'number', placeholder: 'e.g., 15' }
	];

	const SPECIAL_FIELDS: { key: PolicyFieldKey; type: 'text' | 'boolean'; placeholder?: string }[] =
		[
			{ key: 'teaser_rate', type: 'text', placeholder: 'e.g., 6.5% for first 2 years' },
			{ key: 'women_borrower_discount', type: 'text', placeholder: 'e.g., 0.05% rate discount' },
			{ key: 'festive_offer', type: 'text', placeholder: 'e.g., Processing fee waived till March' },
			{ key: 'moratorium_available', type: 'boolean' },
			{ key: 'part_disbursement_allowed', type: 'boolean' },
			{ key: 'tranche_disbursement_info', type: 'text', placeholder: 'e.g., Up to 4 tranches' }
		];

	function getFieldValue(key: PolicyFieldKey): string | number | boolean | null {
		return form.fields[key] ?? null;
	}
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Fees, Turnaround & Policies</h3>
		<p class="mt-1 text-sm text-gray-500">
			Charges, insurance, turnaround time, and special schemes. Fill what you know.
		</p>
	</div>

	<!-- Fees & Charges -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Fees & Charges</h4>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each FEES_FIELDS as field}
				<div>
					<div class="flex items-center justify-between">
						<label for="fees-{field.key}" class="text-sm text-gray-600"
							>{POLICY_FIELD_LABELS[field.key]}</label
						>
						<button
							type="button"
							onclick={() => toggleUnknown(field.key)}
							class="text-xs text-gray-400 hover:text-orange-500"
						>
							{isUnknown(field.key) ? '?' : '?'}
						</button>
					</div>
					{#if field.type === 'number'}
						<input
							id="fees-{field.key}"
							type="number"
							value={getFieldValue(field.key) ?? ''}
							disabled={isReadOnly || isUnknown(field.key)}
							oninput={(e) =>
								updateField(
									field.key,
									e.currentTarget.value ? Number(e.currentTarget.value) : null
								)}
							placeholder={field.placeholder}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					{:else}
						<input
							id="fees-{field.key}"
							type="text"
							value={getFieldValue(field.key) ?? ''}
							disabled={isReadOnly || isUnknown(field.key)}
							oninput={(e) => updateField(field.key, e.currentTarget.value || null)}
							placeholder={field.placeholder}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Insurance -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Insurance</h4>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each INSURANCE_FIELDS as field}
				<div>
					{#if field.type === 'boolean'}
						<span class="text-sm text-gray-600">{POLICY_FIELD_LABELS[field.key]}</span>
						<div class="mt-1 flex gap-2" role="group" aria-label={POLICY_FIELD_LABELS[field.key]}>
							{#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() =>
										updateField(field.key, getFieldValue(field.key) === opt.val ? null : opt.val)}
									class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
										{getFieldValue(field.key) === opt.val
										? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
										: 'bg-white text-gray-600 hover:bg-gray-100'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
					{:else}
						<label for="ins-{field.key}" class="text-sm text-gray-600"
							>{POLICY_FIELD_LABELS[field.key]}</label
						>
						<input
							id="ins-{field.key}"
							type="text"
							value={getFieldValue(field.key) ?? ''}
							disabled={isReadOnly}
							oninput={(e) => updateField(field.key, e.currentTarget.value || null)}
							placeholder={field.placeholder}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Turnaround Time -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Turnaround Time</h4>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each TAT_FIELDS as field}
				<div>
					<label for="tat-{field.key}" class="text-sm text-gray-600"
						>{POLICY_FIELD_LABELS[field.key]}</label
					>
					<input
						id="tat-{field.key}"
						type="number"
						min="0"
						value={getFieldValue(field.key) ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							updateField(field.key, e.currentTarget.value ? Number(e.currentTarget.value) : null)}
						placeholder={field.placeholder}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			{/each}
		</div>
	</div>

	<!-- Special Schemes & Offers -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Special Schemes & Offers</h4>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each SPECIAL_FIELDS as field}
				<div>
					{#if field.type === 'boolean'}
						<span class="text-sm text-gray-600">{POLICY_FIELD_LABELS[field.key]}</span>
						<div class="mt-1 flex gap-2" role="group" aria-label={POLICY_FIELD_LABELS[field.key]}>
							{#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() =>
										updateField(field.key, getFieldValue(field.key) === opt.val ? null : opt.val)}
									class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
										{getFieldValue(field.key) === opt.val
										? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
										: 'bg-white text-gray-600 hover:bg-gray-100'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
					{:else}
						<label for="special-{field.key}" class="text-sm text-gray-600"
							>{POLICY_FIELD_LABELS[field.key]}</label
						>
						<input
							id="special-{field.key}"
							type="text"
							value={getFieldValue(field.key) ?? ''}
							disabled={isReadOnly}
							oninput={(e) => updateField(field.key, e.currentTarget.value || null)}
							placeholder={field.placeholder}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional Fee/Policy Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Fees & Policies?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
