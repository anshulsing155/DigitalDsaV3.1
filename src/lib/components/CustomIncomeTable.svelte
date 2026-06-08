<!-- CustomIncomeTable.svelte -->
<script lang="ts">
	import type { Answers } from '$lib/types/formTypes';
	import {
		getMaxITRYears,
		getCompletedFYCount,
		getRecentFinancialYears,
		isITRAvailableForFY,
		shouldShowCurrentFY,
		getCurrentFY,
		getCurrentFYPartialLabel,
		getCurrentFYMonthsCompleted
	} from '$lib/types/companyIncome';

	interface FinancialData {
		itrFiled: boolean[];
		netProfitArray: (string | number)[];
		depreciationArray: (string | number)[];
		turnOverArray: (string | number)[];
		/** Current FY partial GST turnover (only collected when ≥3 months passed) */
		currentFYTurnover?: string | number;
	}

	interface Props {
		answers?: Answers;
		questionId?: string;
		showErrors?: boolean;
		/** Business vintage value — drives how many ITR year rows to show */
		businessVintage?: string;
		/** GST registration date (month-year string) — drives GST turnover column visibility */
		gstRegistrationDate?: string;
		/** Whether business is GST registered */
		gstRegistered?: boolean;
		/** Legacy: limit number of year cards shown directly. Overridden by businessVintage if provided. */
		maxYears?: number;
		onChange?: (data: FinancialData) => void;
		onUpdate?: (data: { questionId: string; value: FinancialData }) => void;
		onValidate?: (data: { questionId: string; valid: boolean }) => void;
	}

	let {
		answers = $bindable({}),
		questionId = 'financialTable',
		showErrors = false,
		businessVintage = '',
		gstRegistrationDate = '',
		gstRegistered = false,
		maxYears = 4,
		onChange = () => {},
		onUpdate = () => {},
		onValidate = () => {}
	}: Props = $props();

	// Track if user has left the table (for showing errors)
	/** Tracks which FY cards the user has interacted with and left — errors shown per-card only */
	let touchedCards = $state(new Set<number>());

	// Show limit exceeded message
	let limitExceededMsg = $state('');

	function showLimitError() {
		limitExceededMsg = 'Maximum 10 digits allowed. Platform does not support larger values.';
		setTimeout(() => {
			limitExceededMsg = '';
		}, 3000);
	}

	// Field definitions for rendering inside each card
	const fields: { label: string; field: keyof FinancialData; hint?: string }[] = [
		{ label: 'Net Profit / Loss', field: 'netProfitArray', hint: 'Negative = loss' },
		{ label: 'Depreciation + Interest', field: 'depreciationArray' },
		{ label: 'Gross Receipts', field: 'turnOverArray' }
	];

	// ── Intelligent row count ────────────────────────────────────────

	const maxITRYears = $derived(businessVintage ? getMaxITRYears(businessVintage) : maxYears);
	const maxGSTYears = $derived(gstRegistered ? getCompletedFYCount(gstRegistrationDate) : 0);
	// Show rows for whichever system covers more years (ITR and GST are independent)
	const visibleYearCount = $derived(Math.max(maxITRYears, maxGSTYears, 0));

	let allYears = $derived(getRecentFinancialYears(4));
	// Chronological order: oldest first → newest last (for growth trend visibility)
	let years = $derived(
		(visibleYearCount >= 4 ? allYears : allYears.slice(0, visibleYearCount)).toReversed()
	);

	// ── Current FY (partial year — GST turnover only) ────────────────
	const showCurrentFY = $derived(gstRegistered && shouldShowCurrentFY());
	const currentFYLabel = $derived(getCurrentFY());
	const currentFYPeriod = $derived(getCurrentFYPartialLabel());
	const currentFYMonths = $derived(getCurrentFYMonthsCompleted());

	// ── Data shape ───────────────────────────────────────────────────

	function ensureDataShape(saved: Partial<FinancialData> = {}): FinancialData {
		const itrRegularly = answers?.businessActivityDetails?.itr_filed_regularly === true;

		const template: FinancialData = {
			// Default: all ITR checkboxes checked (user unchecks if not filed)
			itrFiled: allYears.map(() => true),
			netProfitArray: allYears.map(() => ''),
			depreciationArray: allYears.map(() => ''),
			turnOverArray: allYears.map(() => '')
		};

		let itrFiled = saved.itrFiled ?? template.itrFiled;
		// Ensure array length matches
		while (itrFiled.length < allYears.length) itrFiled.push(true);

		return {
			itrFiled,
			netProfitArray: saved.netProfitArray ?? template.netProfitArray,
			depreciationArray: saved.depreciationArray ?? template.depreciationArray,
			turnOverArray: saved.turnOverArray ?? template.turnOverArray,
			currentFYTurnover: saved.currentFYTurnover ?? ''
		};
	}

	let data = $derived(ensureDataShape(answers[questionId]));

	let lastDataHash = '';

	$effect(() => {
		if (data) {
			const currentHash = JSON.stringify(data);
			if (currentHash !== lastDataHash) {
				lastDataHash = currentHash;
				onChange($state.snapshot(data));
			}
		}
	});

	// Format Indian numbers
	function formatIndianNumber(value: string | number | null | undefined): string {
		if (!value && value !== 0) return '';
		const num = Number(String(value).replace(/,/g, ''));
		return isNaN(num) ? '' : num.toLocaleString('en-IN');
	}

	interface DisplayData {
		netProfitArray: string[];
		depreciationArray: string[];
		turnOverArray: string[];
	}

	// Display data — hides values when field is disabled
	let displayData = $derived.by(() => {
		const display: DisplayData = {
			netProfitArray: [],
			depreciationArray: [],
			turnOverArray: []
		};

		const gstCompleted = getCompletedFYCount(gstRegistrationDate);

		allYears.forEach((_, idx) => {
			const itrChecked = data.itrFiled[idx];
			const gstEnabled = gstRegistered && gstCompleted > idx;

			display.turnOverArray[idx] =
				gstEnabled || itrChecked ? formatIndianNumber(data.turnOverArray[idx]) : '';

			if (itrChecked) {
				display.netProfitArray[idx] = formatIndianNumber(data.netProfitArray[idx]);
				display.depreciationArray[idx] = formatIndianNumber(data.depreciationArray[idx]);
			} else {
				display.netProfitArray[idx] = '';
				display.depreciationArray[idx] = '';
			}
		});

		return display;
	});

	interface VisibleData {
		itrFiled: boolean[];
		netProfitArray: (string | number)[];
		depreciationArray: (string | number)[];
		turnOverArray: (string | number)[];
	}

	// Visible-only data for PAYLOAD — only includes years the DSA can currently see.
	// Hidden years are excluded from the payload so the rule engine doesn't evaluate
	// stale data. But the FULL data is always persisted via onChange (see below).
	let visibleData = $derived.by(() => {
		const gstCompleted = getCompletedFYCount(gstRegistrationDate);

		const visible: VisibleData = {
			// Only mark years as ITR-filed if they're currently visible
			itrFiled: data.itrFiled.map((v, idx) => (idx < visibleYearCount ? v : false)),
			netProfitArray: [],
			depreciationArray: [],
			turnOverArray: []
		};

		allYears.forEach((_, idx) => {
			const isYearVisible = idx < visibleYearCount;
			const itrChecked = isYearVisible && data.itrFiled[idx];
			const gstEnabled = gstRegistered && isYearVisible && gstCompleted > idx;

			// Visible rows: include actual values. Hidden rows: empty (excluded from payload).
			visible.turnOverArray[idx] = gstEnabled || itrChecked ? data.turnOverArray[idx] : '';
			visible.netProfitArray[idx] = itrChecked ? data.netProfitArray[idx] : '';
			visible.depreciationArray[idx] = itrChecked ? data.depreciationArray[idx] : '';
		});

		return visible;
	});

	let lastVisibleDataHash = '';

	$effect(() => {
		if (visibleData) {
			const currentHash = JSON.stringify(visibleData);
			if (currentHash !== lastVisibleDataHash) {
				lastVisibleDataHash = currentHash;
				onUpdate({
					questionId: questionId + 'Visible',
					value: $state.snapshot(visibleData)
				});
			}
		}
	});

	// Track ITR regularly state to handle changes
	let lastItrRegularly: boolean | null = null;

	$effect(() => {
		const itrRegularly = answers?.businessActivityDetails?.itr_filed_regularly === true;

		if (lastItrRegularly !== null && itrRegularly !== lastItrRegularly) {
			const currentData = ensureDataShape(answers[questionId]);

			if (itrRegularly) {
				const newItrFiled = [...currentData.itrFiled];
				newItrFiled[0] = true;
				newItrFiled[1] = true;
				answers[questionId] = { ...currentData, itrFiled: newItrFiled };
			} else {
				answers[questionId] = {
					itrFiled: allYears.map(() => false),
					netProfitArray: allYears.map(() => ''),
					depreciationArray: allYears.map(() => ''),
					turnOverArray: currentData.turnOverArray
				};
				touchedCards = new Set();
			}
		}

		lastItrRegularly = itrRegularly;
	});

	function isCheckboxDisabled(yearIndex: number): boolean {
		const itrRegularly = answers?.businessActivityDetails?.itr_filed_regularly === true;
		return itrRegularly && yearIndex < 2;
	}

	// Auto-set ITR regularly when user fills data for latest 2 years
	let lastAutoSetCheck = '';

	function isFilled(value: string | number | null | undefined): boolean {
		return value !== '' && value !== null && value !== undefined;
	}

	$effect(() => {
		const itrRegularly = answers?.businessActivityDetails?.itr_filed_regularly === true;
		if (itrRegularly) return;

		const year0Complete =
			data.itrFiled[0] && isFilled(data.netProfitArray[0]) && isFilled(data.depreciationArray[0]);
		const year1Complete =
			data.itrFiled[1] && isFilled(data.netProfitArray[1]) && isFilled(data.depreciationArray[1]);

		const shouldAutoSet = year0Complete && year1Complete;
		const checkHash = `${shouldAutoSet}-${itrRegularly}`;

		if (checkHash !== lastAutoSetCheck && shouldAutoSet) {
			lastAutoSetCheck = checkHash;
			answers = {
				...answers,
				businessActivityDetails: {
					...(answers?.businessActivityDetails || {}),
					itr_filed_regularly: true
				}
			};
		} else {
			lastAutoSetCheck = checkHash;
		}
	});

	function updateAnswersData(
		field: keyof FinancialData,
		index: number,
		value: string | number | boolean
	) {
		const currentData = ensureDataShape(answers[questionId]);
		const newArray = [...(currentData[field] as (string | number | boolean)[])];
		newArray[index] = value;
		answers[questionId] = {
			...currentData,
			[field]: newArray
		};
	}

	function handleCheckboxChange(yearIndex: number, checked: boolean) {
		updateAnswersData('itrFiled', yearIndex, checked);
	}

	function handleInput(
		field: keyof FinancialData,
		index: number,
		rawValue: string,
		inputEl?: HTMLInputElement
	) {
		let cleaned =
			field === 'netProfitArray'
				? rawValue
						.replace(/[^0-9,\-]/g, '')
						.replace(/,/g, '')
						.trim()
				: rawValue
						.replace(/[^0-9,]/g, '')
						.replace(/,/g, '')
						.trim();

		const strippedRaw = rawValue.replace(/,/g, '').trim();
		if (cleaned !== strippedRaw && inputEl) {
			inputEl.value = displayData[field as keyof DisplayData]?.[index] ?? '';
		}

		if (cleaned === '') {
			updateAnswersData(field, index, '');
			return;
		}

		if (cleaned === '-') {
			if (field === 'netProfitArray') {
				updateAnswersData(field, index, '');
				return;
			}
			if (inputEl) inputEl.value = displayData[field as keyof DisplayData]?.[index] ?? '';
			return;
		}

		let isNegative = false;
		if (field === 'netProfitArray' && cleaned.startsWith('-')) {
			isNegative = true;
			cleaned = cleaned.substring(1);
		}

		if (!/^\d+$/.test(cleaned)) {
			if (inputEl) inputEl.value = displayData[field as keyof DisplayData]?.[index] ?? '';
			return;
		}

		if (cleaned.length > 10) {
			showLimitError();
			if (inputEl) inputEl.value = displayData[field as keyof DisplayData]?.[index] ?? '';
			return;
		}

		// Don't collapse to 0 during mid-edit — let user fix the first digit.
		// e.g. "50000" → delete "5" → "0000" should stay, not become 0.
		const numValue = Number(cleaned);
		if (numValue === 0 && cleaned.length > 1) {
			// All zeros but user is still editing — keep the display as-is
			return;
		}
		updateAnswersData(field, index, isNegative ? -numValue : numValue);
	}

	// Validation
	let tableValidate = $state(true);
	let fieldErrors = $state<Record<string, string>>({});

	function isBlank(value: string | number | null | undefined): boolean {
		return value === '' || value === null || value === undefined;
	}

	let lastValidationState = '';

	$effect(() => {
		const newFieldErrors: Record<string, string> = {};
		const gstCompleted = getCompletedFYCount(gstRegistrationDate);

		years.forEach((year, idx) => {
			const turnover = Number(data.turnOverArray[idx] || 0);
			const netProfit = Number(data.netProfitArray[idx] || 0);
			const itrChecked = data.itrFiled[idx];
			const gstEnabled = gstRegistered && gstCompleted > idx;

			if (gstEnabled || itrChecked) {
				if (isBlank(data.turnOverArray[idx])) {
					newFieldErrors[`turnOverArray-${idx}`] = 'Required';
				} else if (turnover <= 0) {
					newFieldErrors[`turnOverArray-${idx}`] = 'Must be greater than 0';
				}
			}

			if (itrChecked) {
				if (isBlank(data.netProfitArray[idx])) {
					newFieldErrors[`netProfitArray-${idx}`] = 'Required';
				}
				if (isBlank(data.depreciationArray[idx])) {
					newFieldErrors[`depreciationArray-${idx}`] = 'Required';
				} else {
					const depreciation = Number(data.depreciationArray[idx] || 0);
					if (depreciation < 0) {
						newFieldErrors[`depreciationArray-${idx}`] = 'Cannot be negative';
					}
				}
			}

			if (turnover > 0 && netProfit > turnover) {
				newFieldErrors[`netProfitArray-${idx}`] = 'Cannot exceed Turnover';
			}

			// Depreciation + Interest cannot exceed Turnover
			// (you can't depreciate more assets than your total revenue)
			const depreciation = Number(data.depreciationArray[idx] || 0);
			if (turnover > 0 && depreciation > turnover) {
				newFieldErrors[`depreciationArray-${idx}`] = 'Cannot exceed Turnover';
			}

			// Cash Profit (Net Profit + D&I) should not exceed Turnover
			// 10% tolerance (1.1x) accounts for rounding differences between ITR schedules,
			// timing differences in revenue recognition, and minor other-income additions.
			// Without tolerance, legitimate businesses with small rounding differences get blocked.
			// True data-entry errors (e.g. profit 2x turnover) are still caught.
			if (turnover > 0 && itrChecked && netProfit + depreciation > turnover * 1.1) {
				if (!newFieldErrors[`netProfitArray-${idx}`]) {
					newFieldErrors[`netProfitArray-${idx}`] = 'Net Profit + Depreciation exceeds Turnover';
				}
			}
		});

		fieldErrors = newFieldErrors;
		const isValid = Object.keys(newFieldErrors).length === 0;
		tableValidate = isValid;

		const validationState = `${questionId}-${isValid}`;
		if (validationState !== lastValidationState) {
			lastValidationState = validationState;
			onValidate({ questionId, valid: isValid });
		}
	});

	function hasFieldError(field: string, yearIndex: number): boolean {
		return !!fieldErrors[`${field}-${yearIndex}`];
	}

	function getFieldError(field: string, yearIndex: number): string {
		return fieldErrors[`${field}-${yearIndex}`] ?? '';
	}

	/** Per-card error visibility: show errors only for cards user has touched, or when parent forces showErrors */
	function shouldShowCardErrors(cardIdx: number): boolean {
		return showErrors || touchedCards.has(cardIdx);
	}

	const turnoverLabel = $derived(
		gstRegistered
			? 'GST Turnover / Gross Receipts'
			: answers?.employmentType === 'Self-employed(Other)'
				? 'GST Turnover'
				: 'Gross Receipts'
	);

	// Parse FY start year from label like "FY2023-24" → 2023
	function parseFYStartYear(fyLabel: string): number {
		const match = fyLabel.match(/FY(\d{4})/);
		return match ? parseInt(match[1]) : 0;
	}
</script>

{#if limitExceededMsg}
	<div
		class="mb-2 flex items-center gap-2 rounded-lg border border-[#ddbea9]/30 bg-neutral-50 p-2 text-sm text-[#c69270] dark:bg-gray-800 dark:text-[#ddbea9]"
	>
		<span class="text-[#ddbea9]">⚠</span>
		{limitExceededMsg}
	</div>
{/if}

<!-- Guidance banners -->
{#if maxITRYears === 0 && !gstRegistered}
	<div
		class="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30"
	>
		<p class="text-xs text-amber-700 dark:text-amber-300">
			Business is less than 1 year old and not GST registered — no financial year data to capture
			yet.
		</p>
	</div>
{:else if visibleYearCount > 0 && maxITRYears > 0 && maxITRYears < 3}
	<div
		class="mb-2 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30"
	>
		<p class="text-xs text-blue-700 dark:text-blue-300">
			{maxITRYears} year{maxITRYears === 1 ? '' : 's'} of ITR data available based on business vintage.
			Lenders prefer 3+ years for growth & stability assessment — fill whatever is available.
		</p>
	</div>
{/if}

{#if visibleYearCount === 0 && maxITRYears === 0 && gstRegistered}
	<div class="p-6 text-center text-slate-500">
		<p class="font-medium">No completed financial years available</p>
		<p class="mt-1 text-sm">
			Financial year data will be available after March 31 of the current fiscal year.
		</p>
	</div>
{:else if visibleYearCount > 0}
	<div class="flex flex-col gap-4">
		{#each years as year, yearIndex}
			{@const dataIdx = years.length - 1 - yearIndex}
			{@const prevDataIdx = dataIdx + 1}
			{@const gstCompleted = getCompletedFYCount(gstRegistrationDate)}
			{@const gstEnabled = gstRegistered && gstCompleted > dataIdx}
			{@const itrAvailable = dataIdx < maxITRYears}
			{@const itrChecked = data.itrFiled[dataIdx]}
			{@const checkboxDisabled = isCheckboxDisabled(dataIdx)}
			{@const fyStartYear = parseFYStartYear(year)}
			{@const itrFilingReady = isITRAvailableForFY(fyStartYear)}
			{@const cardShowErrors = shouldShowCardErrors(dataIdx)}
			{@const hasAnyError =
				cardShowErrors &&
				(hasFieldError('netProfitArray', dataIdx) ||
					hasFieldError('depreciationArray', dataIdx) ||
					hasFieldError('turnOverArray', dataIdx))}
			{@const currTurnover = Number(data.turnOverArray[dataIdx]) || 0}
			{@const prevTurnover =
				prevDataIdx < data.turnOverArray.length ? Number(data.turnOverArray[prevDataIdx]) || 0 : 0}
			{@const turnoverGrowth =
				prevTurnover > 0 && currTurnover > 0
					? Math.round(((currTurnover - prevTurnover) / prevTurnover) * 100)
					: null}
			{@const currProfit = Number(data.netProfitArray[dataIdx]) || 0}
			{@const prevProfit =
				prevDataIdx < data.netProfitArray.length
					? Number(data.netProfitArray[prevDataIdx]) || 0
					: 0}
			{@const profitGrowth =
				prevProfit !== 0 && currProfit !== 0
					? Math.round(((currProfit - prevProfit) / Math.abs(prevProfit)) * 100)
					: null}
			{@const profitJump = profitGrowth !== null && profitGrowth > 50}
			{@const hasLoss = currProfit < 0}
			{@const currDepreciation = Number(data.depreciationArray[dataIdx]) || 0}
			{@const depreciationExceedsTurnover = currTurnover > 0 && currDepreciation > currTurnover}
			{@const cashProfitExceedsTurnover =
				currTurnover > 0 && itrChecked && currProfit + currDepreciation > currTurnover * 1.1}

			<!-- YoY Growth/Decline chips between cards -->
			{#if yearIndex > 0 && (turnoverGrowth !== null || profitGrowth !== null)}
				<div class="-my-1 flex flex-wrap items-center justify-center gap-2">
					{#if turnoverGrowth !== null}
						<span
							class="rounded-full px-3 py-0.5 text-[10px] font-medium
							{turnoverGrowth >= 0
								? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
								: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}"
						>
							Revenue {turnoverGrowth >= 0 ? '↑' : '↓'}
							{Math.abs(turnoverGrowth)}%
						</span>
					{/if}
					{#if profitGrowth !== null}
						<span
							class="rounded-full px-3 py-0.5 text-[10px] font-medium
							{profitGrowth >= 0
								? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
								: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}"
						>
							Profit {profitGrowth >= 0 ? '↑' : '↓'}
							{Math.abs(profitGrowth)}%
						</span>
					{/if}
				</div>
				{#if profitJump}
					<p class="-mt-2 text-center text-[10px] text-amber-600 dark:text-amber-400">
						⚠ Sudden profit jump — lender will seek justification (investment payoff, market demand,
						etc.)
					</p>
				{/if}
			{/if}
			{#if hasLoss && itrChecked}
				<p class="-mt-2 text-center text-[10px] text-amber-600 dark:text-amber-400">
					⚠ Loss in {year} — prepare justification (expansion cost, market downturn, one-time write-off,
					etc.)
				</p>
			{/if}
			{#if depreciationExceedsTurnover}
				<p class="-mt-2 text-center text-[10px] text-red-600 dark:text-red-400">
					⚠ Depreciation + Interest (₹{currDepreciation.toLocaleString('en-IN')}) exceeds Turnover
					(₹{currTurnover.toLocaleString('en-IN')}) — please verify
				</p>
			{/if}
			{#if cashProfitExceedsTurnover && !depreciationExceedsTurnover}
				<p class="-mt-2 text-center text-[10px] text-amber-600 dark:text-amber-400">
					⚠ Net Profit + Depreciation exceeds Turnover — values may be inconsistent
				</p>
			{/if}

			<div
				class="year-card"
				class:year-card-active={itrChecked || gstEnabled}
				class:year-card-error={hasAnyError}
				onfocusout={(e) => {
					const card = e.currentTarget as HTMLElement;
					const related = e.relatedTarget as HTMLElement | null;
					if (!related || !card.contains(related)) {
						touchedCards.add(dataIdx);
						touchedCards = touchedCards; // trigger reactivity
					}
				}}
			>
				<!-- Card Header: Year + ITR Filed toggle -->
				<div class="year-card-header">
					<span class="year-label">{year}</span>
					<div class="flex items-center gap-3">
						{#if !itrFilingReady && itrAvailable && !itrChecked}
							<span class="text-[10px] text-amber-500">ITR likely not filed yet</span>
						{/if}
						{#if itrAvailable}
							<!--
								Wrapping <label> already gives click-association; id+name added so
								Chrome autofill / a11y tools (and the DevTools "form field needs id
								or name" warning) recognise the checkbox properly. dataIdx is unique
								per year row (0 = oldest, N-1 = newest).
							-->
							<label class="itr-toggle" class:itr-toggle-disabled={checkboxDisabled}>
								<input
									id={`itr_filed_${dataIdx}`}
									name={`itr_filed_${dataIdx}`}
									type="checkbox"
									checked={itrChecked}
									disabled={checkboxDisabled}
									onchange={(e) => handleCheckboxChange(dataIdx, e.currentTarget.checked)}
									class="h-4 w-4 rounded border-[var(--form-border)] accent-primary focus:ring-2 focus:ring-primary
									{checkboxDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}"
								/>
								<span class="itr-toggle-label">ITR Filed</span>
							</label>
						{/if}
					</div>
				</div>

				<!-- Card Fields — always visible, grayed out when ITR unchecked -->
				<div class="year-card-fields">
					<div class="fields-grid">
						{#each fields as { label, field, hint }}
							{@const isITRField = field === 'netProfitArray' || field === 'depreciationArray'}
							{@const isTurnoverField = field === 'turnOverArray'}
							{@const isGrayed = isITRField && !itrChecked}
							{@const isTurnoverHidden = isTurnoverField && !(gstEnabled || itrChecked)}
							{@const hasError = !isGrayed && cardShowErrors && hasFieldError(field, dataIdx)}
							{@const errorMsg = !isGrayed && cardShowErrors ? getFieldError(field, dataIdx) : ''}
							{@const fieldLabel = isTurnoverField ? turnoverLabel : label}
							<!--
								Stable per-cell input id used for both the <label for=> association
								and the input's own id/name. field = column key (turnOverArray /
								netProfitArray / depreciationArray); dataIdx = year row (0 = oldest).
								Same shape as the GST-turnover input above (id="currentFYTurnover").
							-->
							{@const inputId = `itr_${field}_${dataIdx}`}

							{#if !isTurnoverHidden}
								<div class="field-col" class:opacity-40={isGrayed}>
									<div class="field-label-row">
										<label class="field-label" for={inputId}>{fieldLabel}</label>
										{#if hint}
											<span class="field-hint">({hint})</span>
										{/if}
									</div>
									<div class="field-input-wrap">
										<span class="rupee-prefix">₹</span>
										<input
											id={inputId}
											name={inputId}
											type="text"
											inputmode="numeric"
											maxlength="14"
											placeholder={isGrayed ? '—' : 'Enter value'}
											value={isGrayed ? '' : displayData[field as keyof DisplayData][dataIdx]}
											disabled={isGrayed}
											oninput={(e) => {
												const el = e.target as HTMLInputElement;
												handleInput(field, dataIdx, el.value, el);
											}}
											class="field-input"
											class:field-input-error={hasError}
											class:cursor-not-allowed={isGrayed}
										/>
									</div>
									{#if errorMsg}
										<p class="field-error">{errorMsg}</p>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/each}

		<!-- Current FY — partial year, GST turnover only (last card, newest) -->
		{#if showCurrentFY}
			<div class="year-card year-card-active">
				<div class="year-card-header">
					<div class="flex flex-col">
						<span class="year-label">{currentFYLabel}</span>
						<span class="text-[10px] text-[var(--form-text-muted)]">{currentFYPeriod}</span>
					</div>
					<span
						class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
					>
						Current Year
					</span>
				</div>
				<div class="year-card-fields">
					<div class="fields-grid" style="grid-template-columns: 1fr;">
						<div class="field-cell">
							<label class="field-label" for="currentFYTurnover">
								GST Turnover till {currentFYPeriod.split('(')[0].trim()}
							</label>
							<div class="field-input-wrap">
								<span class="rupee-prefix">₹</span>
								<input
									id="currentFYTurnover"
									type="text"
									inputmode="numeric"
									class="field-input"
									placeholder="Enter value"
									value={(() => {
										const raw = String(data.currentFYTurnover ?? '').replace(/\D/g, '');
										if (!raw) return '';
										// Indian number formatting: last 3 digits + pairs of 2
										if (raw.length <= 3) return raw;
										const last3 = raw.slice(-3);
										const other = raw.slice(0, -3);
										return other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
									})()}
									onfocus={(e) => {
										// Strip formatting on focus so user edits raw digits
										e.currentTarget.value = String(data.currentFYTurnover ?? '').replace(/\D/g, '');
									}}
									oninput={(e) => {
										const val = e.currentTarget.value.replace(/[^0-9]/g, '');
										if (val.length > 10) {
											showLimitError();
											return;
										}
										data = { ...data, currentFYTurnover: val };
									}}
									onblur={(e) => {
										// Reformat on blur
										const raw = e.currentTarget.value.replace(/\D/g, '');
										if (!raw) {
											e.currentTarget.value = '';
											return;
										}
										if (raw.length <= 3) {
											e.currentTarget.value = raw;
											return;
										}
										const last3 = raw.slice(-3);
										const other = raw.slice(0, -3);
										e.currentTarget.value =
											other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
									}}
								/>
							</div>
							{#if data.currentFYTurnover && Number(data.currentFYTurnover) > 0 && currentFYMonths > 0}
								{@const projected = Math.round(
									(Number(data.currentFYTurnover) / currentFYMonths) * 12
								)}
								<p class="mt-1 text-[10px] text-[var(--form-text-muted)]">
									Projected annual: ₹{projected.toLocaleString('en-IN')}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.year-card {
		border: 1px solid var(--form-border, #e5e5e5);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--form-bg-card, #fff);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.year-card-active {
		border-color: color-mix(in srgb, var(--ddsa-primary-500, #cb997e) 40%, transparent);
		box-shadow: 0 1px 4px rgba(203, 153, 126, 0.08);
	}

	.year-card-error {
		border-color: #fca5a5;
	}

	.year-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--form-bg-alt, #fafaf9);
		border-bottom: 1px solid var(--form-border, #e5e5e5);
	}

	.year-label {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 0.875rem;
		color: var(--form-text, #1c1917);
	}

	.itr-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.itr-toggle-disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.itr-toggle-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.75rem;
		color: var(--form-text-secondary, #78716c);
	}

	.year-card-fields {
		padding: 1rem;
	}

	/* 3-column grid on desktop, stacked on mobile */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.fields-grid {
			grid-template-columns: 1fr;
		}
	}

	.field-col {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label-row {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
	}

	.field-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.75rem;
		color: var(--form-text, #1c1917);
	}

	.field-hint {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.625rem;
		color: var(--form-text-muted, #a8a29e);
	}

	.field-input-wrap {
		display: flex;
		align-items: center;
		border: 1px solid var(--form-border, #e5e5e5);
		border-radius: 0.5rem;
		overflow: hidden;
		background: var(--form-bg-card, #fff);
		transition: border-color 0.15s;
	}

	.field-input-wrap:focus-within {
		border-color: var(--ddsa-primary-500, #cb997e);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--ddsa-primary-500, #cb997e) 15%, transparent);
	}

	.rupee-prefix {
		padding: 0.5rem 0 0.5rem 0.75rem;
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.8125rem;
		color: var(--form-text-muted, #a8a29e);
		user-select: none;
	}

	.field-input {
		flex: 1;
		border: none;
		outline: none;
		padding: 0.5rem 0.75rem 0.5rem 0.25rem;
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.8125rem;
		color: var(--form-text, #1c1917);
		background: transparent;
		min-width: 0;
	}

	.field-input::placeholder {
		color: var(--form-text-muted, #a8a29e);
		opacity: 0.6;
	}

	.field-input-error {
		color: #dc2626;
	}

	/* Fallback: .has-error is applied via JS on browsers that don't support :has() */
	:global(.field-input-wrap.has-error) {
		border-color: #fca5a5;
		background: #fef2f2;
	}
	@supports selector(:has(*)) {
		.field-input-wrap:has(.field-input-error) {
			border-color: #fca5a5;
			background: #fef2f2;
		}
	}

	.field-error {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.6875rem;
		color: #dc2626;
		margin: 0;
	}

	:global(.dark) .year-card {
		background: var(--form-bg-card, #1c1917);
	}

	:global(.dark) .year-card-header {
		background: var(--form-bg-alt, #292524);
	}

	:global(.dark) .field-input-wrap {
		background: var(--form-bg-card, #1c1917);
	}

	:global(.dark .field-input-wrap.has-error) {
		border-color: #991b1b;
		background: rgba(153, 27, 27, 0.15);
	}
	@supports selector(:has(*)) {
		:global(.dark) .field-input-wrap:has(.field-input-error) {
			border-color: #991b1b;
			background: rgba(153, 27, 27, 0.15);
		}
	}
</style>
