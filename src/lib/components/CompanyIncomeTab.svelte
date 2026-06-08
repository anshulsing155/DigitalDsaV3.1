<script lang="ts">
	/**
	 * CompanyIncomeTab — 4-Medium Income Capture
	 * ═══════════════════════════════════════════════════════════════════
	 * Captures company income through 4 mediums:
	 *   1. ITR-based (net profit, depreciation, gross receipts — 3 years)
	 *   2. GST Revenue (turnover — 3 years)
	 *   3. Banking (average current account balance, CC/OD)
	 *   4. Cash income (daily cash sales)
	 *
	 * At least ONE medium must have data for completion.
	 * DSA guidance encourages filling all applicable mediums.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import CustomIncomeTable from './CustomIncomeTable.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import {
		hasAllMediumsComplete,
		isMediumComplete,
		createEmptyCompanyIncome,
		getRecentFinancialYears,
		type CompanyIncomeData
	} from '$lib/types/companyIncome';
	import { FileText, Building2, Wallet, Check, CircleAlert } from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import { untrack } from 'svelte';

	// ── Props — bind:applicantData pattern ──────────────────────────
	interface Props {
		applicantData: Record<string, any>;
	}

	let { applicantData = $bindable({}) }: Props = $props();

	// ── Derived data ─────────────────────────────────────────────────
	const companyIncome = $derived(
		(applicantData.companyIncome as CompanyIncomeData) ?? createEmptyCompanyIncome()
	);

	// ── Local answers for CustomIncomeTable (ITR) ────────────────────
	// Initialised SYNCHRONOUSLY from persisted data so CustomIncomeTable never
	// sees an empty answers object on mount.  If we used $effect instead, the
	// table's visibleData $effect fires first (with empty data) and calls
	// onUpdate → handleITRUpdate → updateIncome, which OVERWRITES the stored
	// itr.years with undefined values before the hydration effect even runs.
	// Same pattern as IncomeSourceForm.svelte line 233.
	function buildItrAnswers(): Record<string, unknown> {
		const saved = (applicantData.companyIncome as CompanyIncomeData) ?? createEmptyCompanyIncome();
		const itr = saved.itr;
		if (!itr?.years?.length) return {};
		const netProfitArray = itr.years.map((y) => y.netProfit ?? '');
		const depreciationArray = itr.years.map((y) => y.depreciation ?? '');
		const grossReceiptsArray = itr.years.map((y) => y.grossReceipts ?? '');
		const itrFiledArr = itr.years.map((y) => y.itrFiled ?? false);
		const currentFYTurnover = (saved.gst as any)?.currentFYTurnover ?? '';
		return {
			financialsTable: {
				itrFiled: itrFiledArr,
				netProfitArray,
				depreciationArray,
				turnOverArray: grossReceiptsArray,
				currentFYTurnover
			},
			financialsTableValidate: true
		};
	}

	let itrAnswers = $state<Record<string, unknown>>(buildItrAnswers());

	// ── Field update — mutate applicantData.companyIncome directly ───
	function updateIncome(path: string, value: unknown) {
		const raw = (applicantData.companyIncome as CompanyIncomeData) ?? createEmptyCompanyIncome();
		const updated = structuredClone($state.snapshot(raw)) as CompanyIncomeData;

		const parts = path.split('.');
		let obj: any = updated;
		for (let i = 0; i < parts.length - 1; i++) {
			obj = obj[parts[i]];
		}
		obj[parts[parts.length - 1]] = value;

		applicantData.companyIncome = updated;
		formState.scheduleSave();
	}

	/** Convert a raw value to number, preserving 0.  Returns undefined when blank/invalid. */
	function toNum(v: unknown): number | undefined {
		if (v === '' || v === null || v === undefined) return undefined;
		const n = Number(v);
		return isNaN(n) ? undefined : n;
	}

	function handleITRUpdate(data: { questionId: string; value: any }) {
		const table = data.value;
		if (!table) return;

		// allYears is most-recent-first: allYears[0] = FY2024-25, allYears[1] = FY2023-24, etc.
		const allYears = getRecentFinancialYears(4);

		// IMPORTANT: Merge visible data with existing persisted data.
		// Hidden rows (beyond visibleYearCount) keep their stored values so that
		// data reappears when the user changes GST date / vintage back.
		// Only VISIBLE rows get overwritten with the latest user input.
		const saved = (applicantData.companyIncome as CompanyIncomeData) ?? createEmptyCompanyIncome();
		const existingYears = saved.itr?.years ?? [];

		const count = Math.max(
			table.netProfitArray?.length ?? 0,
			table.depreciationArray?.length ?? 0,
			table.turnOverArray?.length ?? 0,
			existingYears.length,
			3
		);

		const years: any[] = [];
		for (let i = 0; i < count; i++) {
			const existing = existingYears[i] ?? {};
			const hasVisibleValue =
				(table.netProfitArray?.[i] !== undefined && table.netProfitArray?.[i] !== '') ||
				(table.turnOverArray?.[i] !== undefined && table.turnOverArray?.[i] !== '') ||
				table.itrFiled?.[i] === true;

			// If the table sent actual data for this row, use it (visible row with user input).
			// Otherwise, preserve whatever was stored before (hidden row, keep data for reappearance).
			if (hasVisibleValue || table.itrFiled?.[i] === true) {
				years.push({
					year:
						allYears[i] ?? existing.year ?? `FY${2026 - i - 1}-${(2026 - i).toString().slice(-2)}`,
					netProfit: toNum(table.netProfitArray?.[i]) ?? existing.netProfit,
					depreciation: toNum(table.depreciationArray?.[i]) ?? existing.depreciation,
					grossReceipts: toNum(table.turnOverArray?.[i]) ?? existing.grossReceipts,
					itrFiled: table.itrFiled?.[i] ?? existing.itrFiled ?? false
				});
			} else {
				// Hidden row — preserve existing data as-is
				years.push({
					year: allYears[i] ?? existing.year,
					netProfit: existing.netProfit,
					depreciation: existing.depreciation,
					grossReceipts: existing.grossReceipts,
					itrFiled: existing.itrFiled ?? false
				});
			}
		}

		updateIncome('itr.years', years);
	}

	/** Called by CustomIncomeTable onChange — saves currentFYTurnover for partial year GST */
	function handleITRChange(table: any) {
		if (!table) return;
		const val = toNum(table.currentFYTurnover);
		// Only update when value is present (avoids overwriting with undefined on empty render)
		if (val !== undefined || (applicantData.companyIncome as any)?.gst?.currentFYTurnover != null) {
			updateIncome('gst.currentFYTurnover', val ?? null);
		}
	}

	// ── Completion (derived centrally, but keep local for status badges) ──
	const gstStatusVal = $derived(applicantData.gstStatus as string | undefined);
	const businessVintageVal = $derived((applicantData.businessVintage as string) ?? '');
	const isComplete = $derived(
		hasAllMediumsComplete(companyIncome, gstStatusVal, businessVintageVal)
	);
	const itrDone = $derived(isMediumComplete(companyIncome, 'itr', undefined, businessVintageVal));
	const gstDone = $derived(isMediumComplete(companyIncome, 'gst', gstStatusVal));
	const bankingDone = $derived(isMediumComplete(companyIncome, 'banking'));
	const cashDone = $derived(isMediumComplete(companyIncome, 'cash'));

	// GST status from profile tab
	const gstRegistered = $derived(
		applicantData.gstStatus === 'registered_regular' ||
			applicantData.gstStatus === 'registered_composition'
	);

	// Business vintage from Identity tab — drives ITR year count
	const businessVintage = $derived((applicantData.businessVintage as string) ?? '');
	const gstRegDate = $derived(companyIncome.gst?.registrationDate ?? '');

	// ── Re-sync itrAnswers when GST date or business vintage changes ──
	// Skip initial run (buildItrAnswers already called synchronously above).
	// Only rebuild when the user changes GST date or vintage in the Profile tab.
	let _prevGstDate = untrack(() => gstRegDate);
	let _prevVintage = untrack(() => businessVintage);
	$effect.pre(() => {
		const curGst = gstRegDate;
		const curVintage = businessVintage;
		if (curGst !== _prevGstDate || curVintage !== _prevVintage) {
			_prevGstDate = curGst;
			_prevVintage = curVintage;
			itrAnswers = buildItrAnswers();
		}
	});
</script>

<div class="flex flex-col gap-20 pb-4">
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GUIDANCE BANNER                                                 -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<div
		class="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30"
	>
		<CircleAlert size={16} class="mt-0.5 shrink-0 text-blue-500" />
		<p class="font-paragraph text-xs leading-relaxed text-blue-800 dark:text-blue-300">
			Fill <strong>all applicable mediums</strong> — lenders pick whichever gives the highest eligible
			loan amount. More data = better offer chances. Cash income is optional (skip if the business doesn't
			deal in cash).
		</p>
	</div>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MEDIUM 1 + 2: ITR & GST FINANCIALS (UNIFIED)                    -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<section class="medium-section">
		<div class="medium-header">
			<div class="medium-icon" style="--icon-color: #6366f1">
				<FileText class="h-4 w-4" />
			</div>
			<div class="flex-1">
				<h3 class="medium-title">Financial Details</h3>
				<p class="medium-desc">
					Profit, depreciation & turnover — driven by business vintage & GST
				</p>
			</div>
			{#if itrDone && gstDone}
				<span class="medium-badge medium-badge-done"><Check size={12} /> Done</span>
			{:else if itrDone || gstDone}
				<span class="medium-badge medium-badge-partial">Partial</span>
			{/if}
		</div>

		<CustomIncomeTable
			bind:answers={itrAnswers}
			questionId="financialsTable"
			{businessVintage}
			gstRegistrationDate={gstRegDate}
			{gstRegistered}
			onChange={handleITRChange}
			onUpdate={handleITRUpdate}
		/>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MEDIUM 3: BANKING                                               -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<section class="medium-section">
		<div class="medium-header">
			<div class="medium-icon" style="--icon-color: #f59e0b">
				<Building2 class="h-4 w-4" />
			</div>
			<div class="flex-1">
				<h3 class="medium-title">Banking</h3>
				<p class="medium-desc">Average current account balance & credit facilities</p>
			</div>
			{#if bankingDone}
				<span class="medium-badge medium-badge-done"><Check size={12} /> Done</span>
			{/if}
		</div>
		<div class="medium-fields">
			<div class="field-row">
				<p class="field-label">
					Average current account balance (12 months) <span class="text-red-400">*</span>
				</p>
				<NumberFieldIndianFormat
					value={companyIncome.banking?.avgBalance ?? null}
					icon="IndianRupee"
					showNumberInWords
					onInput={(val) => updateIncome('banking.avgBalance', val)}
				/>
			</div>
			<!-- CC/OD facility removed — captured in Obligations section instead -->
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MEDIUM 4: CASH INCOME                                           -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<section class="medium-section">
		<div class="medium-header">
			<div class="medium-icon" style="--icon-color: #ef4444">
				<Wallet class="h-4 w-4" />
			</div>
			<div class="flex-1">
				<h3 class="medium-title">Cash Income</h3>
				<p class="medium-desc">Average daily cash sales</p>
			</div>
			{#if cashDone}
				<span class="medium-badge medium-badge-done"><Check size={12} /> Done</span>
			{/if}
		</div>
		<div class="medium-fields">
			<div class="field-row">
				<p class="field-label">Average daily cash sales <span class="text-red-400">*</span></p>
				<NumberFieldIndianFormat
					value={companyIncome.cash?.dailySales ?? null}
					icon="IndianRupee"
					showNumberInWords
					onInput={(val) => updateIncome('cash.dailySales', val)}
				/>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- COMPLETION STATUS                                               -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if !isComplete}
		<div
			class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
		>
			<CircleAlert size={16} class="mt-0.5 shrink-0 text-amber-500" />
			<p class="text-xs text-amber-700 dark:text-amber-300">
				Fill all sections. Enter 0 for sections that don't apply (e.g. no cash sales, no bank
				balance).
			</p>
		</div>
	{/if}
</div>

<style>
	.medium-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border: 1px solid var(--form-border, #e5e5e5);
		border-radius: 0.75rem;
		padding: 1.25rem;
		background: var(--form-bg-card, #fff);
	}

	.medium-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.medium-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--icon-color);
		/* Fallback for browsers that don't support color-mix() */
		background: rgba(100, 100, 100, 0.12);
		border: 1px solid rgba(100, 100, 100, 0.25);
	}
	@supports (color: color-mix(in srgb, red 10%, blue)) {
		.medium-icon {
			background: color-mix(in srgb, var(--icon-color) 12%, transparent);
			border: 1px solid color-mix(in srgb, var(--icon-color) 25%, transparent);
		}
	}

	.medium-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 0.875rem;
		color: var(--form-text, #1c1917);
		margin: 0;
		line-height: 1.3;
	}

	.medium-desc {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.6875rem;
		color: var(--form-text-secondary, #78716c);
		margin: 0.125rem 0 0;
		line-height: 1.4;
	}

	.medium-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.6875rem;
		flex-shrink: 0;
	}

	.medium-badge-done {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	:global(.dark) .medium-badge-done {
		background: rgba(22, 101, 52, 0.2);
		color: #86efac;
		border-color: rgba(134, 239, 172, 0.3);
	}

	.medium-badge-partial {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
	}

	:global(.dark) .medium-badge-partial {
		background: rgba(146, 64, 14, 0.2);
		color: #fcd34d;
		border-color: rgba(252, 211, 77, 0.3);
	}

	.medium-fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-top: 0.25rem;
	}

	.field-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.8125rem;
		color: var(--form-text, #1c1917);
		margin: 0;
	}
</style>
