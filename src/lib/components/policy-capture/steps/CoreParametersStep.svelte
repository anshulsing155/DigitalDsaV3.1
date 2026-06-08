<script lang="ts">
	import type { CoreParametersData, ROIType, ROIBenchmark } from '$lib/types/policyCapture.js';
	import { createDefaultCoreParameters } from '$lib/types/policyCapture.js';
	import SlabEditor from '../SlabEditor.svelte';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';
	import MultiplierEditor from '../MultiplierEditor.svelte';

	interface Props {
		data?: CoreParametersData;
		isSecured: boolean;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: CoreParametersData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, isSecured, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<CoreParametersData>(data ?? createDefaultCoreParameters());

	function update<K extends keyof CoreParametersData>(key: K, value: CoreParametersData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`core_parameters.${field}`);
	}

	function toggleUnknown(field: string) {
		const key = `core_parameters.${field}`;
		onUnknownToggle(key, !isUnknown(field));
	}

	const ROI_TYPES: { value: ROIType; label: string }[] = [
		{ value: 'fixed', label: 'Fixed' },
		{ value: 'floating', label: 'Floating' },
		{ value: 'hybrid', label: 'Hybrid' }
	];

	const ROI_BENCHMARKS: { value: ROIBenchmark; label: string }[] = [
		{ value: 'MCLR', label: 'MCLR' },
		{ value: 'EBLR', label: 'EBLR' },
		{ value: 'RLLR', label: 'RLLR' },
		{ value: 'T-REPO', label: 'T-Repo' },
		{ value: 'other', label: 'Other' }
	];

	const TENURE_PRESETS = [120, 180, 240, 300, 360];
	const AGE_PRESETS = [60, 65, 70, 75];
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Core Parameters</h3>
		<p class="mt-1 text-sm text-gray-500">
			The essential lending parameters that define this product's terms. Mark "Don't Know" for any
			field you're unsure about.
		</p>
	</div>

	<!-- ROI Section -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<h4 class="text-sm font-semibold text-gray-800">Interest Rate (ROI)</h4>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<div class="flex items-center justify-between">
					<label for="core-roi" class="text-sm text-gray-600">Rate of Interest (%)</label>
					<button
						type="button"
						onclick={() => toggleUnknown('roi')}
						class="text-xs text-gray-400 hover:text-orange-500"
					>
						{isUnknown('roi') ? '? Unknown' : "Don't Know?"}
					</button>
				</div>
				<input
					id="core-roi"
					type="number"
					step="0.01"
					min="0"
					max="30"
					value={form.roi ?? ''}
					disabled={isReadOnly || isUnknown('roi')}
					oninput={(e) =>
						update('roi', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
					placeholder="e.g., 8.5"
					class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100 disabled:opacity-60"
				/>
			</div>
			<div>
				<span class="text-sm text-gray-600">ROI Type</span>
				<div class="mt-1 flex gap-2" role="group" aria-label="ROI Type">
					{#each ROI_TYPES as rt}
						<button
							type="button"
							disabled={isReadOnly}
							onclick={() => update('roi_type', form.roi_type === rt.value ? null : rt.value)}
							class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
								{form.roi_type === rt.value
								? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
								: 'bg-white text-gray-600 hover:bg-gray-100'}"
						>
							{rt.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if form.roi_type === 'floating' || form.roi_type === 'hybrid'}
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<span class="text-sm text-gray-600">Benchmark</span>
					<div class="mt-1 flex flex-wrap gap-2" role="group" aria-label="Benchmark">
						{#each ROI_BENCHMARKS as bm}
							<button
								type="button"
								disabled={isReadOnly}
								onclick={() =>
									update('roi_benchmark', form.roi_benchmark === bm.value ? null : bm.value)}
								class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
									{form.roi_benchmark === bm.value
									? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								{bm.label}
							</button>
						{/each}
					</div>
				</div>
				<div>
					<label for="core-roiSpread" class="text-sm text-gray-600">Spread over Benchmark (%)</label
					>
					<input
						id="core-roiSpread"
						type="number"
						step="0.01"
						value={form.roi_spread ?? ''}
						disabled={isReadOnly}
						oninput={(e) =>
							update('roi_spread', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
						placeholder="e.g., 0.25"
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			</div>
		{/if}

		<!-- ROI Conditional Rules -->
		<ConditionalRuleEditor
			rules={form.roi_conditional}
			label="ROI varies by profile?"
			{isReadOnly}
			onUpdate={(rules) => update('roi_conditional', rules)}
		/>
	</div>

	<!-- FOIR Section -->
	<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<div class="flex items-center justify-between">
			<h4 class="text-sm font-semibold text-gray-800">
				Max FOIR (Fixed Obligation to Income Ratio)
			</h4>
			<button
				type="button"
				onclick={() => toggleUnknown('max_foir')}
				class="text-xs text-gray-400 hover:text-orange-500"
			>
				{isUnknown('max_foir') ? '? Unknown' : "Don't Know?"}
			</button>
		</div>

		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={form.foir_is_slab_based}
					disabled={isReadOnly}
					onchange={() => update('foir_is_slab_based', !form.foir_is_slab_based)}
					class="rounded border-gray-300"
				/>
				<span class="text-sm text-gray-600">Slab-based (varies by income level)</span>
			</label>
		</div>

		{#if form.foir_is_slab_based}
			<SlabEditor
				slabs={form.foir_slabs}
				label="FOIR Slabs (Income Range → FOIR Cap)"
				fromLabel="Income From (₹)"
				toLabel="Income To (₹)"
				valueLabel="FOIR Cap"
				valueUnit="%"
				fromUnit="₹"
				{isReadOnly}
				onUpdate={(slabs) => update('foir_slabs', slabs)}
			/>
		{:else}
			<div>
				<label for="core-maxFoir" class="text-sm text-gray-600">Max FOIR (%)</label>
				<input
					id="core-maxFoir"
					type="number"
					step="1"
					min="0"
					max="100"
					value={form.max_foir ?? ''}
					disabled={isReadOnly || isUnknown('max_foir')}
					oninput={(e) =>
						update('max_foir', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
					placeholder="e.g., 50"
					class="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
				/>
			</div>
		{/if}

		<!-- FOIR Conditional Rules -->
		<ConditionalRuleEditor
			rules={form.foir_conditional}
			label="FOIR varies by employment type, etc.?"
			{isReadOnly}
			onUpdate={(rules) => update('foir_conditional', rules)}
		/>
	</div>

	<!-- Tenure & Age -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div>
			<div class="flex items-center justify-between">
				<label for="core-maxTenure" class="text-sm font-medium text-gray-700">Max Tenure</label>
				<button
					type="button"
					onclick={() => toggleUnknown('max_tenure_months')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('max_tenure_months') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each TENURE_PRESETS as months}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update('max_tenure_months', form.max_tenure_months === months ? null : months)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
							{form.max_tenure_months === months
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
					>
						{months / 12} yrs
					</button>
				{/each}
			</div>
			<input
				id="core-maxTenure"
				type="number"
				value={form.max_tenure_months ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update('max_tenure_months', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="Custom (months)"
				class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>

		<div>
			<div class="flex items-center justify-between">
				<label for="core-maxAgeMaturity" class="text-sm font-medium text-gray-700"
					>Max Age at Maturity</label
				>
				<button
					type="button"
					onclick={() => toggleUnknown('max_age_at_maturity')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('max_age_at_maturity') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each AGE_PRESETS as age}
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update('max_age_at_maturity', form.max_age_at_maturity === age ? null : age)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
							{form.max_age_at_maturity === age
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
					>
						{age} yrs
					</button>
				{/each}
			</div>
			<input
				id="core-maxAgeMaturity"
				type="number"
				value={form.max_age_at_maturity ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'max_age_at_maturity',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="Custom (years)"
				class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Loan Amount Range -->
	<div class="grid gap-6 sm:grid-cols-2">
		<div>
			<label for="core-minLoanAmt" class="text-sm font-medium text-gray-700"
				>Min Loan Amount (₹)</label
			>
			<input
				id="core-minLoanAmt"
				type="number"
				value={form.min_loan_amount ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update('min_loan_amount', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="e.g., 300000"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="core-maxLoanAmt" class="text-sm font-medium text-gray-700"
				>Max Loan Amount (₹)</label
			>
			<input
				id="core-maxLoanAmt"
				type="number"
				value={form.max_loan_amount ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update('max_loan_amount', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="e.g., 100000000"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- LTV (Secured only) -->
	{#if isSecured}
		<div class="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
			<div class="flex items-center justify-between">
				<h4 class="text-sm font-semibold text-gray-800">LTV (Loan-to-Value Ratio)</h4>
				<button
					type="button"
					onclick={() => toggleUnknown('max_ltv')}
					class="text-xs text-gray-400 hover:text-orange-500"
				>
					{isUnknown('max_ltv') ? '? Unknown' : "Don't Know?"}
				</button>
			</div>

			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={form.ltv_is_slab_based}
					disabled={isReadOnly}
					onchange={() => update('ltv_is_slab_based', !form.ltv_is_slab_based)}
					class="rounded border-gray-300"
				/>
				<span class="text-sm text-gray-600">Slab-based (varies by loan amount)</span>
			</label>

			{#if form.ltv_is_slab_based}
				<SlabEditor
					slabs={form.ltv_slabs}
					label="LTV Slabs (Loan Amount Range → LTV Cap)"
					fromLabel="Amount From (₹)"
					toLabel="Amount To (₹)"
					valueLabel="LTV Cap"
					valueUnit="%"
					fromUnit="₹"
					{isReadOnly}
					onUpdate={(slabs) => update('ltv_slabs', slabs)}
				/>
			{:else}
				<div>
					<label for="core-maxLtv" class="text-sm text-gray-600">Max LTV (%)</label>
					<input
						id="core-maxLtv"
						type="number"
						step="1"
						min="0"
						max="100"
						value={form.max_ltv ?? ''}
						disabled={isReadOnly || isUnknown('max_ltv')}
						oninput={(e) =>
							update('max_ltv', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
						placeholder="e.g., 80"
						class="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>
			{/if}

			<!-- LTV Conditional Rules -->
			<ConditionalRuleEditor
				rules={form.ltv_conditional}
				label="LTV varies by property type, zone, etc.?"
				{isReadOnly}
				onUpdate={(rules) => update('ltv_conditional', rules)}
			/>

			<div>
				<label for="core-maxLcr" class="text-sm text-gray-600"
					>Max LCR — Loan-to-Registry Value (%)</label
				>
				<input
					id="core-maxLcr"
					type="number"
					step="1"
					min="0"
					max="100"
					value={form.max_lcr ?? ''}
					disabled={isReadOnly}
					oninput={(e) =>
						update('max_lcr', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
					placeholder="e.g., 90"
					class="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
				/>
			</div>
		</div>
	{/if}

	<!-- Processing Fee -->
	<div class="grid gap-6 sm:grid-cols-3">
		<div>
			<label for="core-procFeePct" class="text-sm font-medium text-gray-700"
				>Processing Fee (%)</label
			>
			<input
				id="core-procFeePct"
				type="number"
				step="0.01"
				value={form.processing_fee_percent ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'processing_fee_percent',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 0.5"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="core-procFeeFlat" class="text-sm font-medium text-gray-700"
				>Processing Fee (Flat ₹)</label
			>
			<input
				id="core-procFeeFlat"
				type="number"
				value={form.processing_fee_flat ?? ''}
				disabled={isReadOnly}
				oninput={(e) =>
					update(
						'processing_fee_flat',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="e.g., 5000"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
		<div>
			<label for="core-feeWaiver" class="text-sm font-medium text-gray-700"
				>Fee Waiver Conditions</label
			>
			<input
				id="core-feeWaiver"
				type="text"
				value={form.processing_fee_waiver ?? ''}
				disabled={isReadOnly}
				oninput={(e) => update('processing_fee_waiver', e.currentTarget.value || null)}
				placeholder="e.g., Waived for women"
				class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
			/>
		</div>
	</div>

	<!-- Multipliers -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<MultiplierEditor
			multipliers={form.multipliers}
			{isReadOnly}
			onUpdate={(m) => update('multipliers', m)}
		/>
	</div>

	<!-- Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Core Parameters?"
			placeholder="Describe any other core parameter rule this bank has..."
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
