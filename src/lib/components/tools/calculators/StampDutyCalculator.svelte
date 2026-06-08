<script lang="ts">
	/**
	 * StampDutyCalculator — Calculate stamp duty and registration charges.
	 *
	 * Helps users (DSAs or buyers) understand the government charges
	 * they'll need to pay when purchasing a property in any Indian state.
	 *
	 * Inputs: State, property value, gender, resident status
	 * Outputs: Stamp duty, registration charges, total
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import {
		getAvailableStates,
		calculateStampDuty
	} from '$lib/tools/calculators/stampDutyEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { GENDER_OPTIONS, LOAN_DEFAULTS } from '$lib/tools/constants.js';

	// --- Component Props ---
	interface Props {
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// USER INPUTS
	// =========================================================================

	/** Selected Indian state */
	let selectedState: string = $state('');

	/** Property value (market/agreement value) in INR */
	let propertyValue: number = $state(5_000_000);

	/** Gender of the property buyer */
	let buyerGender: string = $state('Male');

	/** Is the buyer a resident of the same state as the property? */
	let isResident: string = $state('Yes');

	// =========================================================================
	// DERIVED VALUES
	// =========================================================================

	/** List of all states from stamp duty data */
	const availableStates = getAvailableStates();

	/** State options formatted for SelectField */
	const stateOptions = availableStates.map((state) => ({
		label: state,
		value: state
	}));

	/** Resident status options */
	const residentOptions = [
		{ label: 'Yes', value: 'Yes' },
		{ label: 'No', value: 'No' }
	];

	/**
	 * The stamp duty calculation result.
	 * Automatically recalculates when any input changes.
	 */
	let result = $derived.by(() => {
		if (!selectedState || propertyValue <= 0) return null;

		return calculateStampDuty({
			stateName: selectedState,
			cityName: '', // City-level data not yet differentiated in the dataset
			propertyValue,
			buyerGender: buyerGender as 'Male' | 'Female' | 'Joint',
			isResident: isResident === 'Yes'
		});
	});

	/** Result card items for display */
	let resultItems = $derived(
		result
			? [
					{
						label: 'Stamp Duty',
						value: `₹ ${formatNumber(result.stampDutyAmount)}`,
						subText: `${result.stampDutyPercentage}% of property value`
					},
					{
						label: 'Registration Charges',
						value: `₹ ${formatNumber(result.registrationChargeAmount)}`,
						subText: `${result.registrationChargePercentage.toFixed(2)}% of property value`
					},
					{
						label: 'Total Charges',
						value: `₹ ${formatNumber(result.totalCharges)}`,
						highlight: true,
						subText: `${((result.totalCharges / propertyValue) * 100).toFixed(2)}% of property value`
					}
				]
			: []
	);
</script>

<!-- ======================================================================= -->
<!-- STAMP DUTY CALCULATOR UI                                                -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Input Section === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Property Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- State Selector -->
			<SelectField
				id="stamp-duty-state"
				label="State"
				options={stateOptions}
				bind:value={selectedState}
				required={true}
			/>

			<!-- Property Value -->
			<NumberField
				id="stamp-duty-property-value"
				label="Property Value (₹)"
				bind:value={propertyValue}
				min={200_000}
				max={1_000_000_000}
				formatIndian={true}
				placeholder="Enter property value"
				icon="indian-rupee"
			/>

			<!-- Gender of Buyer -->
			<RadioField
				id="stamp-duty-gender"
				label="Buyer Gender"
				options={[...GENDER_OPTIONS]}
				bind:value={buyerGender}
			/>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Resident Status -->
			<RadioField
				id="stamp-duty-resident"
				label="Are you a resident of this state?"
				options={residentOptions}
				bind:value={isResident}
			/>
		</div>
	</div>

	<!-- === Results Section === -->
	{#if result}
		<ResultCard items={resultItems} title="Stamp Duty & Registration Charges" />

		<!-- Informational Note -->
		<div
			class="rounded-lg border border-[var(--ddsa-warning)] bg-[var(--ddsa-accent-50)] p-4 text-sm text-[var(--ddsa-secondary-700)]"
		>
			<p class="font-medium">Note:</p>
			<p class="mt-1">
				Stamp duty rates vary by state and are subject to change. These calculations are indicative
				and based on current publicly available rates. Actual charges may differ based on specific
				property type, location, and applicable municipal surcharges.
			</p>
		</div>
	{/if}
</div>
