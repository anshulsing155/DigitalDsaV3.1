<script lang="ts">
	import type {
		BTTopupData,
		RepaymentTrack,
		BTLenderRestriction
	} from '$lib/types/policyCapture.js';
	import { createDefaultBTTopup } from '$lib/types/policyCapture.js';
	import type { ProductType } from '$lib/types/policyEngine.js';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: BTTopupData;
		productType: ProductType;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: BTTopupData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let { data, productType, isReadOnly, unknownFields, onUpdate, onUnknownToggle }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<BTTopupData>(data ?? createDefaultBTTopup());

	function update<K extends keyof BTTopupData>(key: K, value: BTTopupData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}

	function isUnknown(field: string): boolean {
		return unknownFields.includes(`bt_topup.${field}`);
	}

	function toggleUnknown(field: string) {
		onUnknownToggle(`bt_topup.${field}`, !isUnknown(field));
	}

	// svelte-ignore state_referenced_locally — intentional: productType is immutable for this step's lifetime
	const hasBT = productType.includes('BT');
	// svelte-ignore state_referenced_locally
	const hasTopup = productType.includes('TOPUP');

	const REPAYMENT_OPTIONS: { value: RepaymentTrack; label: string }[] = [
		{ value: 'clean_only', label: 'Clean Track Only' },
		{ value: 'minor_allowed', label: 'Minor Bounces OK' },
		{ value: 'major_allowed', label: 'Major Bounces OK' }
	];

	const LENDER_RESTRICTIONS: { value: BTLenderRestriction; label: string }[] = [
		{ value: 'any', label: 'Any Lender' },
		{ value: 'external_only', label: 'External BT Only' },
		{ value: 'same_bank_ok', label: 'Same Bank Also OK' }
	];
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">BT & Top-up Rules</h3>
		<p class="mt-1 text-sm text-gray-500">
			Balance transfer and top-up specific parameters for this product.
		</p>
	</div>

	<!-- BT Section -->
	{#if hasBT}
		<div class="space-y-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
			<h4 class="text-sm font-semibold text-gray-800">Balance Transfer Rules</h4>

			<div class="grid gap-6 sm:grid-cols-2">
				<div>
					<div class="flex items-center justify-between">
						<label for="bt-minVintage" class="text-sm font-medium text-gray-700"
							>Min Loan Vintage (months)</label
						>
						<button
							type="button"
							onclick={() => toggleUnknown('bt_min_vintage_months')}
							class="text-xs text-gray-400 hover:text-orange-500"
						>
							{isUnknown('bt_min_vintage_months') ? '? Unknown' : "Don't Know?"}
						</button>
					</div>
					<input
						id="bt-minVintage"
						type="number"
						min="0"
						value={form.bt_min_vintage_months ?? ''}
						disabled={isReadOnly || isUnknown('bt_min_vintage_months')}
						oninput={(e) =>
							update(
								'bt_min_vintage_months',
								e.currentTarget.value ? Number(e.currentTarget.value) : null
							)}
						placeholder="e.g., 12"
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
					/>
				</div>

				<div class="space-y-3">
					<span class="text-sm font-medium text-gray-700">Min Repayment Track</span>
					<div class="flex flex-wrap gap-2" role="group" aria-label="Min Repayment Track">
						{#each REPAYMENT_OPTIONS as opt}
							<button
								type="button"
								disabled={isReadOnly}
								onclick={() =>
									update(
										'bt_min_repayment_track',
										form.bt_min_repayment_track === opt.value ? null : opt.value
									)}
								class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
									{form.bt_min_repayment_track === opt.value
									? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-3">
					<span class="text-sm font-medium text-gray-700">Lender Restriction</span>
					<div class="flex flex-wrap gap-2" role="group" aria-label="Lender Restriction">
						{#each LENDER_RESTRICTIONS as opt}
							<button
								type="button"
								disabled={isReadOnly}
								onclick={() =>
									update(
										'bt_lender_restriction',
										form.bt_lender_restriction === opt.value ? null : opt.value
									)}
								class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
									{form.bt_lender_restriction === opt.value
									? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="bt-maxOutstanding" class="text-sm font-medium text-gray-700">
						Max Outstanding ({form.bt_max_outstanding_is_percent ? '%' : '₹'})
					</label>
					<div class="mt-1 flex items-center gap-2">
						<input
							id="bt-maxOutstanding"
							type="number"
							value={form.bt_max_outstanding ?? ''}
							disabled={isReadOnly}
							oninput={(e) =>
								update(
									'bt_max_outstanding',
									e.currentTarget.value ? Number(e.currentTarget.value) : null
								)}
							placeholder={form.bt_max_outstanding_is_percent ? 'e.g., 80' : 'e.g., 10000000'}
							class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
						<label class="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
							<input
								type="checkbox"
								checked={form.bt_max_outstanding_is_percent}
								disabled={isReadOnly}
								onchange={() =>
									update('bt_max_outstanding_is_percent', !form.bt_max_outstanding_is_percent)}
								class="rounded border-gray-300"
							/>
							% of value
						</label>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Top-up Section -->
	{#if hasTopup}
		<div class="space-y-6 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
			<h4 class="text-sm font-semibold text-gray-800">Top-up Rules</h4>

			<div class="space-y-3">
				<span class="text-sm font-medium text-gray-700">Top-up Eligibility</span>
				<div class="flex gap-2" role="group" aria-label="Top-up Eligibility">
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update('topup_eligibility', form.topup_eligibility === 'all_bt' ? null : 'all_bt')}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.topup_eligibility === 'all_bt'
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						All BT Customers
					</button>
					<button
						type="button"
						disabled={isReadOnly}
						onclick={() =>
							update(
								'topup_eligibility',
								form.topup_eligibility === 'conditions_apply' ? null : 'conditions_apply'
							)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors
							{form.topup_eligibility === 'conditions_apply'
							? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
							: 'bg-white text-gray-600 hover:bg-gray-100'}"
					>
						Conditions Apply
					</button>
				</div>

				{#if form.topup_eligibility === 'conditions_apply'}
					<textarea
						value={form.topup_eligibility_conditions ?? ''}
						disabled={isReadOnly}
						oninput={(e) => update('topup_eligibility_conditions', e.currentTarget.value || null)}
						placeholder="Describe eligibility conditions for top-up..."
						rows={2}
						class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
					></textarea>
				{/if}
			</div>

			<div class="grid gap-6 sm:grid-cols-2">
				<div>
					<label for="bt-topupMaxAmt" class="text-sm font-medium text-gray-700">
						Max Top-up Amount ({form.topup_max_amount_is_percent ? '%' : '₹'})
					</label>
					<div class="mt-1 flex items-center gap-2">
						<input
							id="bt-topupMaxAmt"
							type="number"
							value={form.topup_max_amount ?? ''}
							disabled={isReadOnly}
							oninput={(e) =>
								update(
									'topup_max_amount',
									e.currentTarget.value ? Number(e.currentTarget.value) : null
								)}
							placeholder={form.topup_max_amount_is_percent ? 'e.g., 20' : 'e.g., 2000000'}
							class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 disabled:bg-gray-100"
						/>
						<label class="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
							<input
								type="checkbox"
								checked={form.topup_max_amount_is_percent}
								disabled={isReadOnly}
								onchange={() =>
									update('topup_max_amount_is_percent', !form.topup_max_amount_is_percent)}
								class="rounded border-gray-300"
							/>
							% of value
						</label>
					</div>
				</div>

				<div class="space-y-3">
					<span class="text-sm font-medium text-gray-700">Separate Tenure for Top-up?</span>
					<div class="flex gap-2" role="group" aria-label="Separate Tenure for Top-up">
						{#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
							<button
								type="button"
								disabled={isReadOnly}
								onclick={() =>
									update(
										'topup_separate_tenure',
										form.topup_separate_tenure === opt.val ? null : opt.val
									)}
								class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
									{form.topup_separate_tenure === opt.val
									? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
									: 'bg-white text-gray-600 hover:bg-gray-100'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional BT/Top-up Rules"
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about BT/Top-up?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
