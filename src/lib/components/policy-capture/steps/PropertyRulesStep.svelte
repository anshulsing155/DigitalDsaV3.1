<script lang="ts">
	import type {
		PropertyRulesData,
		PropertyType,
		PurchaseType,
		ConstructionStatus,
		ComplianceRequirement,
		RestrictedZone,
		OcCcRequirement
	} from '$lib/types/policyCapture.js';
	import { createDefaultPropertyRules } from '$lib/types/policyCapture.js';
	import type { ProductType } from '$lib/types/policyEngine.js';
	import SlabEditor from '../SlabEditor.svelte';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: PropertyRulesData;
		productType: ProductType;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: PropertyRulesData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, productType, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<PropertyRulesData>(data ?? createDefaultPropertyRules());

	function update<K extends keyof PropertyRulesData>(key: K, value: PropertyRulesData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`property_rules.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`property_rules.${field}`, !isUnknown(field));
	}

	function toggleMulti<T>(arr: T[], val: T): T[] {
		return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
	}

	// svelte-ignore state_referenced_locally — intentional: productType is immutable for this step's lifetime
	const isLAP = productType.startsWith('LAP');

	const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
		{ value: 'flat', label: 'Flat / Apartment' },
		{ value: 'independent_house', label: 'Independent House' },
		{ value: 'villa', label: 'Villa / Bungalow' },
		{ value: 'plot', label: 'Plot / Land' },
		{ value: 'commercial', label: 'Commercial' },
		{ value: 'mixed_use', label: 'Mixed-use' }
	];

	const PURCHASE_TYPES: { value: PurchaseType; label: string }[] = [
		{ value: 'direct_sale', label: 'Direct Sale (Builder)' },
		{ value: 'resale', label: 'Resale' }
	];

	const CONSTRUCTION_STATUSES: { value: ConstructionStatus; label: string }[] = [
		{ value: 'ready_to_move', label: 'Ready to Move' },
		{ value: 'under_construction', label: 'Under Construction' },
		{ value: 'plot_construction', label: 'Plot + Construction' }
	];

	const COMPLIANCE_OPTIONS: { value: ComplianceRequirement; label: string }[] = [
		{ value: 'fully_compliant_only', label: 'Fully Compliant Only' },
		{ value: 'authorized_not_per_plan_ok', label: 'Authorized (Not Per Plan) OK' },
		{ value: 'all', label: 'All Properties' }
	];

	const RESTRICTED_ZONES: { value: RestrictedZone; label: string }[] = [
		{ value: 'crz', label: 'CRZ' },
		{ value: 'industrial', label: 'Industrial' },
		{ value: 'agricultural', label: 'Agricultural' },
		{ value: 'tribal', label: 'Tribal' },
		{ value: 'forest', label: 'Forest' },
		{ value: 'other', label: 'Other' }
	];

	const OC_CC_OPTIONS: { value: OcCcRequirement; label: string }[] = [
		{ value: 'both_required', label: 'OC + CC Both Required' },
		{ value: 'cc_only_ok', label: 'CC Only OK' },
		{ value: 'neither_ok', label: 'Neither Required' }
	];
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Property Rules</h3>
		<p class="mt-1 text-sm text-gray-500">
			What types of properties does this bank accept? Define restrictions on type, age, compliance,
			and zones.
		</p>
	</div>

	<!-- Accepted Property Types -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">Accepted Property Types</span>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Accepted Property Types">
			{#each PROPERTY_TYPES as pt}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() =>
						update('accepted_property_types', toggleMulti(form.accepted_property_types, pt.value))}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.accepted_property_types.includes(pt.value)
						? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
				>
					{pt.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Purchase Type & Construction Status -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div class="space-y-3">
			<span class="text-sm font-medium text-gray-700">Purchase Type</span>
			<div class="flex flex-wrap gap-2" role="group" aria-label="Purchase Type">
				{#each PURCHASE_TYPES as pt}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update(
								'accepted_purchase_types',
								toggleMulti(form.accepted_purchase_types, pt.value)
							)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.accepted_purchase_types.includes(pt.value)
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{pt.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="space-y-3">
			<span class="text-sm font-medium text-gray-700">Construction Status</span>
			<div class="flex flex-wrap gap-2" role="group" aria-label="Construction Status">
				{#each CONSTRUCTION_STATUSES as cs}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update(
								'accepted_construction_status',
								toggleMulti(form.accepted_construction_status, cs.value)
							)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.accepted_construction_status.includes(cs.value)
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{cs.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Property Age & Value -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div>
			<div class="flex items-center justify-between">
				<label for="prop-max-age" class="text-sm font-medium text-gray-700"
					>Max Property Age (years)</label
				>
				<button
					type="button"
					onclick={() => toggleUnknown('max_property_age_years')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('max_property_age_years') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>
			<input
				id="prop-max-age"
				type="number"
				min="0"
				value={form.max_property_age_years ?? ''}
				disabled={isReadOnly || isUnknown('max_property_age_years')}
				oninput={(e) =>
					update(
						'max_property_age_years',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="Leave blank = no limit"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="prop-min-value" class="text-sm font-medium text-gray-700"
				>Min Property Value (₹)</label
			>
			<input
				id="prop-min-value"
				type="number"
				value={form.min_property_value ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'min_property_value',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 1000000"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Compliance & Lease -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div class="space-y-3">
			<span class="text-sm font-medium text-gray-700">Compliance Requirement</span>
			<div class="flex flex-wrap gap-2" role="group" aria-label="Compliance Requirement">
				{#each COMPLIANCE_OPTIONS as opt}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update(
								'compliance_requirement',
								form.compliance_requirement === opt.value ? null : opt.value
							)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.compliance_requirement === opt.value
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<label for="prop-min-lease" class="text-sm font-medium text-gray-700"
				>Min Lease Period (years, for leasehold)</label
			>
			<input
				id="prop-min-lease"
				type="number"
				min="0"
				value={form.lease_minimum_years ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'lease_minimum_years',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 30"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Restricted Zones -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-gray-700">Restricted Zones (not accepted)</span>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Restricted Zones">
			{#each RESTRICTED_ZONES as zone}
				<button
					type="button"
					disabled={isReadOnly}
					onclick={() => update('restricted_zones', toggleMulti(form.restricted_zones, zone.value))}
					class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
						{form.restricted_zones.includes(zone.value)
						? 'bg-red-100 text-[var(--color-error)] ring-1 ring-red-200'
						: 'bg-white text-gray-600 hover:bg-gray-100'}"
				>
					{zone.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- LTV Slabs -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<SlabEditor
			slabs={form.ltv_by_property_cost_slabs}
			label="LTV by Property Cost"
			fromLabel="Cost From (₹)"
			toLabel="Cost To (₹)"
			valueLabel="LTV Cap"
			valueUnit="%"
			fromUnit="₹"
			{isReadOnly}
			onUpdate={(slabs) => update('ltv_by_property_cost_slabs', slabs)}
		/>
	</div>

	<!-- LAP-specific -->
	{#if isLAP}
		<div class="grid gap-6 sm:grid-cols-2">
			<div class="space-y-3">
				<span class="text-sm font-medium text-gray-700">Encumbrance Allowed?</span>
				<div class="flex gap-2" role="group" aria-label="Encumbrance Allowed">
					{#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
						<button
							type="button"
							disabled={isReadOnly}
							onclick={() =>
								update(
									'encumbrance_allowed',
									form.encumbrance_allowed === opt.val ? null : opt.val
								)}
							class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
								{form.encumbrance_allowed === opt.val
								? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
								: 'bg-white text-gray-600 hover:bg-gray-100'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-3">
				<span class="text-sm font-medium text-gray-700">OC/CC Requirement</span>
				<div class="flex flex-wrap gap-2" role="group" aria-label="OC/CC Requirement">
					{#each OC_CC_OPTIONS as opt}
						<button
							type="button"
							disabled={isReadOnly}
							onclick={() =>
								update(
									'oc_cc_requirement',
									form.oc_cc_requirement === opt.value ? null : opt.value
								)}
							class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
								{form.oc_cc_requirement === opt.value
								? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
								: 'bg-white text-gray-600 hover:bg-gray-100'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional Property Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Property Rules?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
