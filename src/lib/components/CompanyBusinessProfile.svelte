<script lang="ts">
	/**
	 * CompanyBusinessProfile — Tab 1: Business Identity
	 * ═══════════════════════════════════════════════════════════════════
	 * Captures WHO the business is:
	 *   - Business categories (multi-select + revenue share %)
	 *   - Vintage, turnover, employees, GST status
	 *
	 * Uses bind:applicantData pattern (no direct formState access).
	 * Completion derived centrally in incomeTabState.ts.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import RadioIcon from '$lib/components/RadioIcon.svelte';
	import MultipleSelectField from '$lib/components/MultipleSelectField.svelte';
	import DatePickerYearAndMonth from '$lib/components/DatePickerYearAndMonth.svelte';
	import WhyAskedHint from '$lib/components/WhyAskedHint.svelte';
	import {
		BUSINESS_CATEGORIES,
		toCategorySelectOptions
	} from '$lib/config/companyProfile/categories';
	import { IDENTITY_QUESTIONS } from '$lib/config/companyProfile/questions';
	import type { BusinessCategoryType, BusinessCategoryEntry } from '$lib/types/companyIncome';
	import { createEmptyCompanyIncome, type CompanyIncomeData } from '$lib/types/companyIncome';
	import { formState } from '$lib/state/form.svelte';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		applicantData: Record<string, any>;
		/** Applicant index for scoping MonthYearModal to the correct applicant */
		applicantIndex?: number;
		/** Loan category — used to skip/auto-set business category for professional loans */
		loanCategory?: 'personal' | 'business' | 'professional';
	}

	let { applicantData = $bindable({}), applicantIndex = 0, loanCategory }: Props = $props();

	/** Professional loan companies are always service providers — auto-set and skip the question */
	const isProfessionalLoan = $derived(loanCategory === 'professional');

	// "Solo / Self" employee count only makes sense for Sole Prop / OPC — not multi-partner firms
	const SOLO_ALLOWED_TYPES = ['Sole Proprietorship', 'One Person Company (OPC)'];
	const companyType = $derived((applicantData.companyType as string) ?? '');
	const isSoloAllowed = $derived(SOLO_ALLOWED_TYPES.includes(companyType));

	// ── Derived ──────────────────────────────────────────────────────
	const selectedCategories = $derived(
		(applicantData.businessCategories as BusinessCategoryEntry[] | undefined) ?? []
	);

	// Convert selected categories to string[] for MultipleSelectField
	const selectedCategoryValues = $derived(selectedCategories.map((c) => c.category as string));

	const categoryOptions = toCategorySelectOptions();

	let showErrors = $state(false);

	// Professional loan companies are service providers by definition —
	// auto-set to "Services" with 100% revenue share and skip the question
	$effect(() => {
		if (isProfessionalLoan && selectedCategories.length === 0) {
			applicantData.businessCategories = [
				{ category: 'services' as BusinessCategoryType, revenueShare: 100 }
			];
		}
	});

	// GST registration status — show date picker when registered
	const gstRegistered = $derived(
		applicantData.gstStatus === 'registered_regular' ||
			applicantData.gstStatus === 'registered_composition'
	);

	// GST compliance warning: high turnover + not registered
	// Goods: ₹40L threshold (normal states), Services: ₹20L threshold
	// We use ₹20L as the conservative threshold since we don't know goods vs services split
	const gstComplianceWarning = $derived.by(() => {
		const gst = applicantData.gstStatus as string;
		if (!gst || gst === 'registered_regular' || gst === 'registered_composition') return null;
		const turnover = applicantData.annualTurnover as string;
		if (!turnover) return null;

		// Check if selected categories are primarily services (lower threshold)
		const cats = selectedCategories.map((c) => c.category);
		const isServiceDominant = cats.includes('services') || cats.includes('commission_agency');

		const threshold = isServiceDominant ? '₹20 Lakhs' : '₹40 Lakhs';
		const thresholdValues = isServiceDominant
			? ['25l_50l', '50l_1cr', '1cr_5cr', '5cr_10cr', 'above_10cr'] // > ₹20L
			: ['50l_1cr', '1cr_5cr', '5cr_10cr', 'above_10cr']; // > ₹40L

		if (!thresholdValues.includes(turnover)) return null;

		if (gst === 'exempted') {
			return {
				level: 'info' as const,
				message: `Turnover exceeds ${threshold} but business is GST-exempted. Lenders may ask for proof of exemption category — keep the exemption certificate ready.`
			};
		}

		return {
			level: 'warning' as const,
			message: `Turnover exceeds ${threshold} but business is not GST registered. GST registration is mandatory above this threshold${isServiceDominant ? ' for services' : ' for goods supply'}. Lenders will likely flag this as a compliance gap. Consider: (1) voluntary GST registration improves loan eligibility, (2) if income is cash-based, only bank-deposited cash can be verified by lenders.`
		};
	});

	// ── GST date parsing ─────────────────────────────────────────────
	function parseGSTRegDate(): { year: number; month: number } | null {
		const ci = applicantData.companyIncome as CompanyIncomeData | undefined;
		const regDate = ci?.gst?.registrationDate;
		if (!regDate) return null;
		const parts = regDate.split('-');
		if (parts.length < 2) return null;
		const year = parseInt(parts[1]);
		const month = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
		if (isNaN(year) || isNaN(month)) return null;
		return { year, month };
	}

	// GST launched July 2017 — registrations from this month could mean business is older
	const GST_LAUNCH_YEAR = 2017;
	const GST_LAUNCH_MONTH = 7;

	/** Whether GST was registered in the launch month (Jul 2017) — business may predate GST */
	const isGSTLaunchRegistration = $derived.by(() => {
		if (!gstRegistered) return false;
		const parsed = parseGSTRegDate();
		if (!parsed) return false;
		return parsed.year === GST_LAUNCH_YEAR && parsed.month <= GST_LAUNCH_MONTH;
	});

	/** Years since GST registration */
	const yearsFromGST = $derived.by(() => {
		if (!gstRegistered) return 0;
		const parsed = parseGSTRegDate();
		if (!parsed) return 0;
		const now = new Date();
		return Math.max(0, now.getFullYear() - parsed.year + (now.getMonth() + 1 - parsed.month) / 12);
	});

	/**
	 * Business vintage question visibility:
	 * - Not GST registered → show (all options)
	 * - GST registered July 2017 (launch) → show (only 5-10 / over 10)
	 * - GST registered after July 2017 → HIDE (auto-derive from date)
	 */
	const showVintageQuestion = $derived(
		!gstRegistered || !parseGSTRegDate() || isGSTLaunchRegistration
	);

	/** Map years to vintage value */
	function yearsToVintage(years: number): string {
		if (years < 1) return 'less_1';
		if (years < 2) return '1_2';
		if (years < 3) return '2_3';
		if (years < 5) return '3_5';
		if (years < 10) return '5_10';
		return 'over_10';
	}

	// Auto-derive vintage from GST date when question is hidden
	$effect(() => {
		if (showVintageQuestion) return; // question is visible — user answers manually
		if (yearsFromGST <= 0) return;
		const derived = yearsToVintage(yearsFromGST);
		if (applicantData.businessVintage !== derived) {
			applicantData.businessVintage = derived;
			formState.scheduleSave();
		}
	});

	// Filter vintage options for GST launch case (only 5-10 / over 10)
	function getFilteredVintageOptions(question: (typeof IDENTITY_QUESTIONS)[0]) {
		if (question.id !== 'businessVintage') return question.options;
		if (isGSTLaunchRegistration) {
			// Business predates GST — only long-vintage options make sense
			return question.options.filter((opt) => opt.value === '5_10' || opt.value === 'over_10');
		}
		return question.options;
	}

	// Auto-clear vintage if current selection is no longer in filtered options
	$effect(() => {
		if (!isGSTLaunchRegistration) return;
		const current = applicantData.businessVintage as string;
		if (!current) return;
		if (current !== '5_10' && current !== 'over_10') {
			applicantData.businessVintage = '';
			formState.scheduleSave();
		}
	});

	// ── Field update — direct mutation via bind ──────────────────────
	function updateField(key: string, value: unknown) {
		applicantData[key] = value;
		formState.scheduleSave();
	}

	// ── Category multi-select change handler ─────────────────────────
	function handleCategoryChange(newValues: (string | number)[]) {
		const values = newValues as string[];
		const existing = [...selectedCategories];

		// Build new array preserving existing revenue shares
		const updated: BusinessCategoryEntry[] = values.map((val, idx) => {
			const existingEntry = existing.find((e) => e.category === val);
			if (existingEntry) return { ...existingEntry };
			// New selection — assign default share
			if (values.length === 1) return { category: val as BusinessCategoryType, revenueShare: 100 };
			const defaultShare = Math.floor(100 / values.length);
			return { category: val as BusinessCategoryType, revenueShare: defaultShare };
		});

		// Auto-fill last entry to ensure total = 100 (minimum 1% each)
		if (updated.length >= 2) {
			const lastIdx = updated.length - 1;
			const editableSum = updated.slice(0, lastIdx).reduce((s, c) => s + c.revenueShare, 0);
			updated[lastIdx].revenueShare = Math.max(1, 100 - editableSum);
		}

		const dominant =
			updated.length > 0
				? updated.reduce((a, b) => (a.revenueShare >= b.revenueShare ? a : b)).category
				: undefined;

		applicantData.businessCategories = updated;
		applicantData.dominantCategory = dominant;
		if (dominant) applicantData.businessType = dominant;
		formState.scheduleSave();
	}

	function updateRevenueShare(categoryValue: BusinessCategoryType, share: number) {
		const current = [...selectedCategories];
		const entry = current.find((c) => c.category === categoryValue);
		if (!entry) return;

		// Clamp: minimum 1% (selected = must have some share), max such that others get at least 1% each
		const othersCount = current.length - 1;
		const maxForThis = 100 - othersCount; // leave at least 1% for each other
		entry.revenueShare = Math.max(1, Math.min(maxForThis, share));

		// Auto-fill the last category: 100 - sum(others)
		if (current.length >= 2) {
			const lastIdx = current.length - 1;
			const editableSum = current.slice(0, lastIdx).reduce((sum, c) => sum + c.revenueShare, 0);
			current[lastIdx].revenueShare = Math.max(1, 100 - editableSum);
		}

		const dominant = current.reduce((a, b) => (a.revenueShare >= b.revenueShare ? a : b)).category;
		applicantData.businessCategories = current;
		applicantData.dominantCategory = dominant;
		if (dominant) applicantData.businessType = dominant;
		formState.scheduleSave();
	}

	export function validate(): boolean {
		showErrors = true;
		const categories =
			(applicantData.businessCategories as BusinessCategoryEntry[] | undefined) ?? [];
		if (categories.length === 0) return false;
		return IDENTITY_QUESTIONS.filter((q) => q.required).every((q) => {
			const val = applicantData[q.key];
			return val !== undefined && val !== null && val !== '';
		});
	}
</script>

<div class="flex flex-col gap-20 pb-4">
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- BUSINESS CATEGORIES — Multi-select                             -->
	<!-- Professional loans auto-set to "Services" — no need to ask    -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if isProfessionalLoan}
		<!-- Auto-set: Professional Loan companies are always service providers -->
		<div
			class="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/30"
		>
			<p class="font-titleMedium text-xs text-[var(--form-text-muted)]">Business Category</p>
			<p class="mt-1 text-sm font-medium text-[var(--form-text)]">
				Services (Professional Practice)
			</p>
		</div>
	{:else}
		<div class="flex flex-col gap-3" data-q="businessCategories">
			<MultipleSelectField
				id="businessCategories"
				label="What type of business does this company do?"
				description=""
				options={categoryOptions}
				selectedValues={selectedCategoryValues}
				onChange={handleCategoryChange}
				error={showErrors && selectedCategories.length === 0
					? 'Select at least one business category'
					: null}
				required={true}
			/>

			<!-- Revenue Share Inputs (shown when 2+ categories selected) -->
			{#if selectedCategories.length >= 2}
				{@const lastIdx = selectedCategories.length - 1}
				{@const total = selectedCategories.reduce((s, c) => s + c.revenueShare, 0)}
				<div
					class="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/30"
				>
					<p class="mb-3 font-titleMedium text-xs text-[var(--form-text-secondary)]">
						Approximate revenue split (%) — must total 100
					</p>
					<div class="flex flex-col gap-2">
						{#each selectedCategories as entry, idx (entry.category)}
							{@const catOption = BUSINESS_CATEGORIES.find((c) => c.value === entry.category)}
							{@const isLast = idx === lastIdx}
							<div class="flex items-center gap-3">
								<span class="w-40 truncate font-titleMedium text-xs text-[var(--form-text)]">
									{catOption?.label ?? entry.category}
								</span>
								{#if isLast}
									<span
										class="w-20 rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-center font-titleMedium text-sm text-[var(--form-text-muted)] dark:border-stone-700 dark:bg-stone-800/50"
									>
										{entry.revenueShare}
									</span>
									<span class="text-xs text-gray-400"
										>% <span class="text-[10px] italic">(auto)</span></span
									>
								{:else}
									<input
										type="number"
										min="1"
										max="99"
										value={entry.revenueShare}
										class="w-20 rounded-md border border-stone-300 bg-white px-2 py-1 text-center font-titleMedium text-sm dark:border-stone-600 dark:bg-stone-800"
										oninput={(e) =>
											updateRevenueShare(entry.category, Number(e.currentTarget.value) || 1)}
									/>
									<span class="text-xs text-gray-400">%</span>
								{/if}
							</div>
						{/each}
					</div>
					{#if total !== 100}
						<p class="mt-2 text-xs text-red-500">Total is {total}% — must be exactly 100%</p>
					{:else if selectedCategories.some((c) => c.revenueShare < 1)}
						<p class="mt-2 text-xs text-red-500">
							Each selected category must have at least 1% share
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- IDENTITY QUESTIONS — RadioIcon single-select                   -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#each IDENTITY_QUESTIONS as question (question.id)}
		<!-- businessVintage: hidden when auto-derived from GST date (post-2017 registration) -->
		{#if question.id !== 'businessVintage' || showVintageQuestion}
			{@const vintageFiltered = getFilteredVintageOptions(question)}
			{@const filteredOptions =
				question.id === 'employeeCount' && !isSoloAllowed
					? vintageFiltered.filter((o: any) => o.value !== 'solo')
					: vintageFiltered}
			<div class="flex flex-col gap-2" data-q={question.key}>
				<RadioIcon
					name={question.id}
					questionLabel={question.label}
					question={{ key: question.key, options: filteredOptions }}
					selected={(applicantData[question.key] as string) ?? ''}
					onChange={(val) => updateField(question.key, val)}
					error={showErrors && !applicantData[question.key]
						? `${question.label.split('?')[0]} is required`
						: ''}
					required={question.required}
					whyAsked={question.whyAsked}
				/>
			</div>
		{/if}

		<!-- GST compliance warning — shown after annualTurnover if turnover > threshold but no GST -->
		{#if question.id === 'annualTurnover' && gstComplianceWarning}
			<div
				class="flex items-start gap-2.5 rounded-lg border px-4 py-3
				{gstComplianceWarning.level === 'warning'
					? 'border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/30'
					: 'border-blue-200 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/30'}"
			>
				<span class="mt-0.5 shrink-0 text-sm">
					{gstComplianceWarning.level === 'warning' ? '⚠️' : 'ℹ️'}
				</span>
				<p
					class="font-paragraph text-xs leading-relaxed
					{gstComplianceWarning.level === 'warning'
						? 'text-amber-800 dark:text-amber-300'
						: 'text-blue-800 dark:text-blue-300'}"
				>
					{gstComplianceWarning.message}
				</p>
			</div>
		{/if}

		<!-- GST Registration Date — inserted right after gstStatus question -->
		{#if question.id === 'gstStatus' && gstRegistered}
			<div class="flex flex-col gap-2" data-q="gstRegistrationDate">
				<label for="gst_reg_date_identity" class="text-labelText block">
					When was the GST registration obtained? <span class="text-red-400">*</span>
				</label>
				<WhyAskedHint
					text="GST vintage determines how many years of turnover data is available. More years = more data points for lenders to assess business consistency."
				/>
				<DatePickerYearAndMonth
					id="gst_reg_date_identity"
					questionId="gstRegistrationDate"
					value={(() => {
						const ci = applicantData.companyIncome as CompanyIncomeData | undefined;
						return ci?.gst?.registrationDate ?? '';
					})()}
					{applicantIndex}
					minYear={2017}
					introduceMonthIndia={6}
					onchange={(e) => {
						const raw =
							(applicantData.companyIncome as CompanyIncomeData) ?? createEmptyCompanyIncome();
						const updated = structuredClone($state.snapshot(raw)) as CompanyIncomeData;
						updated.gst.registrationDate = e.detail;
						applicantData.companyIncome = updated;

						// Explicitly re-derive business vintage when GST date changes.
						// WHY: the auto-derive $effect depends on yearsFromGST which depends
						// on the reactive companyIncome. But after tab switches + structuredClone,
						// the $effect may not re-fire in time for the Income tab to pick it up.
						// This ensures vintage is always consistent with the selected GST date.
						if (!showVintageQuestion) {
							const parts = e.detail.split('-');
							if (parts.length >= 2) {
								const yr = parseInt(parts[1]);
								const mo = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
								if (!isNaN(yr) && !isNaN(mo)) {
									const now = new Date();
									const yrs = Math.max(0, now.getFullYear() - yr + (now.getMonth() + 1 - mo) / 12);
									const derived = yearsToVintage(yrs);
									if (applicantData.businessVintage !== derived) {
										applicantData.businessVintage = derived;
									}
								}
							}
						}

						formState.scheduleSave();
					}}
				/>
				{#if showErrors && !(applicantData.companyIncome as CompanyIncomeData | undefined)?.gst?.registrationDate}
					<p class="text-xs text-red-500">GST registration date is required</p>
				{/if}
			</div>
		{/if}
	{/each}
</div>
