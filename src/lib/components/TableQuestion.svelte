<script lang="ts">
	import { IndianRupee } from '$lib/utils/iconRegistry';
	import clientLogger from '$lib/utils/clientLogger';
	import { ToWords } from 'to-words';
	import jsonLogic from 'json-logic-js';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	import { handleIndianNumberInput, formatIndianNumber } from '$lib/utils/numberFormat';
	import type { Question, Option, Answers, Applicant } from '$lib/types/formTypes';

	interface TableRow {
		label: string;
		field: string;
		optionsDescription?: string;
		showWhen?: unknown;
	}

	interface TableQuestion extends Question {
		uiMeta: {
			rows: TableRow[];
			icon?: string;
			placeholder?: string;
			showTitleDropdown?: boolean;
		};
	}

	interface Props {
		question: TableQuestion;
		answers: Answers;
		placeholders?: string;
		applicant: Applicant;
		label?: string;
		id?: string;
		description?: string;
		continueButton?: boolean | any;
		descriptionHeader?: string;
		textFieldClass?: string;
	}

	let {
		question,
		answers = $bindable({}),
		placeholders = 'Placeholder',
		applicant,
		label = 'label',
		id = '',
		description = undefined
	}: Props = $props();

	let showErrors = $state(false);

	interface ValidationError {
		rowIndex: number;
		year: string;
		messages: string[];
	}

	let errors: Record<number, ValidationError> = $state({});
	let numberWordsMap: Record<string, string> = $state({});
	const toWords = new ToWords();

	function getCompletedFinancialYears(gstRegistration: string | undefined) {
		if (!gstRegistration) return 0;

		const [monthStr, yearStr] = gstRegistration.split('-');
		const month = new Date(`${monthStr} 1, ${yearStr}`).getMonth() + 1;
		const year = parseInt(yearStr);
		const today = new Date();

		// Determine which FY registration falls into
		const regFYStart = month >= 4 ? year : year - 1;

		// Current FY start
		const currentFYStart =
			today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;

		// Completed FYs = difference between FYs
		const completedFYs = Math.max(0, currentFYStart - regFYStart);

		// GST allowed only for completed FYs (from right side)
		const gstFiledArray = Array(completedFYs)
			.fill(false)
			.map((_, idx) => idx >= completedFYs - completedFYs);

		return { completedFYs, gstFiledArray };
	}

	// Helper to safely access businessActivityDetails properties
	function getBusinessActivityDetails(applicant: Applicant | undefined): {
		gst_registered?: boolean;
		itr_filed_regularly?: boolean;
	} {
		return (applicant?.businessActivityDetails as any) ?? {};
	}

	// ✅ Generate recent financial years (and slice based on GST completion)
	function getRecentFinancialYears(date = new Date(), applicant?: Applicant) {
		const years = [];
		const currentYear = date.getFullYear();
		const currentMonth = date.getMonth() + 1;
		const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;

		// Generate up to last 4 FYs (you can change 4 to any number)
		for (let i = 0; i < 4; i++) {
			const fyStart = startYear - i - 1;
			const fyEnd = startYear - i;
			years.push(`FY${fyStart}-${fyEnd.toString().slice(-2)}`);
		}

		// Slice based on GST completion
		const businessDetails = getBusinessActivityDetails(applicant);
		if (
			businessDetails.gst_registered &&
			businessDetails.itr_filed_regularly == false &&
			applicant?.GSTRegistrationYear
		) {
			const result = getCompletedFinancialYears(applicant.GSTRegistrationYear);
			const completedFYs = typeof result === 'number' ? result : result.completedFYs;
			return years.slice(0, completedFYs);
		}

		return years;
	}

	// ✅ Initialize answer structure
	$effect(() => {
		if (question.contextKey && !answers[question.contextKey]) {
			const contextKey = question.contextKey;
			answers[contextKey] = {};
			question.uiMeta.rows.forEach((row: TableRow, idx: number) => {
				answers[contextKey][row.field] = Array(getRecentFinancialYears().length).fill(null);

				if (row.field === 'itrFiled') {
					answers[contextKey].itrFiled[idx] = idx == 0 ? true : false;
				}
			});
		}
	});

	function resetField(e: Event, row: TableRow, colIndex: number) {
		// Do NOT delete data
		// Just reset words if you want (optional)
		if ((e.target as HTMLInputElement).checked === false) {
			const key1 = `netProfit-${colIndex}`;
			const key2 = `depreciation-${colIndex}`;
			numberWordsMap[key1] = '';
			numberWordsMap[key2] = '';
		}
	}

	function handleNumberInput(value: number, rowField: string, colIndex: number) {
		const key = `${rowField}-${colIndex}`;
		const contextKey = question.contextKey as string;

		if (answers[contextKey].itrFiled[colIndex] !== true) {
			numberWordsMap[key] = '';
			return;
		}

		if (typeof value === 'number' && !isNaN(value)) {
			numberWordsMap[key] = toWords.convert(value);
		} else {
			numberWordsMap[key] = '';
		}
	}

	let hasValidationErrors = $state(false);

	function validate() {
		const contextKey = question.contextKey as string;
		const ctx = answers[contextKey];
		errors = {}; // clear old errors
		const businessDetails = getBusinessActivityDetails(applicant);

		for (let colIndex = 0; colIndex < years.length; colIndex++) {
			const rowErrors: string[] = [];

			// 1️⃣ CHECK IF ALL VISIBLE FIELDS ARE FILLED
			for (const row of visibleRows) {
				// Skip ITR checkbox
				if (row.field === 'itrFiled') continue;

				// Skip Turnover field if disabled
				if (row.field === 'turnOver') {
					const result = getCompletedFinancialYears(applicant?.GSTRegistrationYear);
					const completedFYs = typeof result === 'number' ? result : result.completedFYs;
					const disabled =
						!businessDetails.itr_filed_regularly ||
						!businessDetails.gst_registered ||
						(businessDetails.gst_registered && completedFYs <= colIndex);

					if (disabled) continue;
				}

				// Skip netProfitArray / depreciationArray if ITR unchecked
				if (['netProfitArray', 'depreciationArray'].includes(row.field)) {
					if (!ctx.itrFiled[colIndex]) continue;
				}

				const value = ctx[row.field]?.[colIndex];

				if (value === null || value === '' || value === undefined) {
					rowErrors.push(`${row.label.split('<br />')[0]} is required`);
				}
			}

			// 2️⃣ BUSINESS RULE: netProfit ≤ turnOver
			const turnOverVal = Number(ctx.turnOver?.[colIndex] || 0);
			const netProfitVal = Number(ctx.netProfitArray?.[colIndex] || 0);

			if (
				ctx.turnOver?.[colIndex] != null &&
				ctx.netProfitArray?.[colIndex] != null &&
				netProfitVal > turnOverVal
			) {
				rowErrors.push('Net Profit cannot be greater than Turnover');
			}

			// 3️⃣ SAVE ERROR WITH ROW NUMBER
			if (rowErrors.length > 0) {
				errors[colIndex] = {
					rowIndex: colIndex,
					year: years[colIndex], // also add FY label
					messages: rowErrors
				};
			}
		}

		// Global flag: any errors?
		hasValidationErrors = Object.keys(errors).length > 0;
	}

	// ✅ Filter visible rows (headers)
	const getVisibleRows = (rowHeader: TableRow[]) => {
		return rowHeader
			.filter((opt: TableRow) => {
				if (!opt.showWhen) return true;
				const context = {
					businessType: applicant?.businessType,
					businessActivityDetails: applicant?.businessActivityDetails
				};
				try {
					return jsonLogic.apply(opt.showWhen, context);
				} catch (e) {
					clientLogger.error({ err: e }, 'JsonLogic error:');
					return true;
				}
			})
			.map((opt: TableRow) => ({
				label: opt.label,
				field: opt.field,
				optionsDescription: opt.optionsDescription
			}));
	};

	let visibleRows = $derived(getVisibleRows(question.uiMeta.rows));
	let years = $derived(getRecentFinancialYears(new Date(), applicant));
</script>

<div class={` flex w-full flex-col overflow-x-auto`}>
	<table class={`min-w-full rounded-lg border border-[var(--form-border)] text-sm `}>
		<thead class="bg-[var(--form-bg-alt)]">
			<tr>
				<th class="border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-4 py-2"
					>Financial Year</th
				>
				{#each visibleRows as row}
					{#if answers.employmentType?.includes('Self') && row.label === 'Turnover / Gross Receipts'}
						<th class="border px-4 py-2 text-center">
							{#if answers.employmentType === 'Self-employed(Other)'}
								<p>Turnover <br /></p>
								<p class="alertText font-paragraph text-black">
									(as per <span class=" inputText font-titleMedium">GST</span>)
								</p>
							{:else}
								<span>Gross Receipts</span>
							{/if}
						</th>
					{:else}
						<th class="border px-2 py-2 text-center">{@html sanitizeHtml(row.label)}</th>
					{/if}
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each years as year, colIndex}
				<tr>
					<td class="smallText border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-3 py-2"
						>{year}</td
					>

					{#each visibleRows as row, rowIdx}
						<td class="border px-2 py-1 text-center">
							{#if row.label === 'ITR filed'}
								<input
									type="checkbox"
									disabled={row.field !== 'turnOver' &&
										!getBusinessActivityDetails(applicant).itr_filed_regularly}
									id={`${question.contextKey}-${row.label}-${colIndex}`}
									bind:checked={answers[question.contextKey as string][row.field][colIndex]}
									onclick={(e) => resetField(e, row, colIndex)}
									class={`h-4 w-4 rounded border-[var(--form-border)] focus:ring-2 focus:ring-primary disabled:bg-[var(--form-bg-alt)]`}
								/>
							{:else}
								{@const businessDetails = getBusinessActivityDetails(applicant)}
								{@const gstResult = getCompletedFinancialYears(applicant?.GSTRegistrationYear)}
								{@const completedFYs =
									typeof gstResult === 'number' ? gstResult : gstResult.completedFYs}
								{@const isTurnoverDisabled =
									!businessDetails.itr_filed_regularly ||
									!businessDetails.gst_registered ||
									(businessDetails.gst_registered && completedFYs <= colIndex)}
								{@const contextKey = question.contextKey as string}
								<div class="relative flex h-6 gap-1 overflow-hidden">
									<div
										class="absolute left-0 flex h-full w-[1.5rem] items-center justify-center rounded-l-md bg-primary"
									>
										<IndianRupee class="h-5 w-5 shrink-0 text-white" />
									</div>
									<input
										type="text"
										inputmode="numeric"
										maxlength="12"
										disabled={row.field === 'turnOver'
											? isTurnoverDisabled
											: !answers[contextKey].itrFiled[colIndex]}
										placeholder={row.field === 'turnOver'
											? isTurnoverDisabled
												? 'GST started later'
												: ''
											: answers[contextKey].itrFiled[colIndex]
												? ''
												: 'Checked not selected'}
										value={row.field === 'turnOver'
											? isTurnoverDisabled
												? ''
												: formatIndianNumber(answers[contextKey][row.field][colIndex] || '')
											: answers[contextKey].itrFiled[colIndex]
												? formatIndianNumber(answers[contextKey][row.field][colIndex] || '')
												: ''}
										class="h-full rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] pr-[5px] text-right text-[var(--form-text)] placeholder-[var(--form-text-muted)] outline-none placeholder:text-xs focus:border-primary focus:ring-primary disabled:bg-[var(--form-bg-alt)]"
										oninput={(e) => {
											hasValidationErrors = false;
											const allowMinus = ['netProfitArray'].includes(row.field);

											const { raw } = handleIndianNumberInput(e as any, allowMinus);

											answers[contextKey][row.field][colIndex] = raw || null;

											handleNumberInput(Number(raw), row.field, colIndex);
										}}
									/>
								</div>
							{/if}
						</td>
					{/each}
				</tr>

				{#if errors[colIndex]?.messages?.length}
					<tr>
						<td></td>
						<td colspan={visibleRows.length} class="smallText p-2 text-left text-red-600">
							<ul class="list-disc pl-5">
								{#each errors[colIndex].messages as err}
									<li>{err}</li>
								{/each}
							</ul>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>

	<button class="m-auto mt-10 rounded-md bg-primary px-8 py-2" onclick={validate}> Next </button>

	{#if hasValidationErrors}
		<div class="my-3 rounded-md border border-red-300 bg-red-100 p-3 text-red-800">
			<p class="font-semibold">
				{Object.keys(errors).length} row(s) have validation issues.
			</p>

			<button class="mt-1 text-red-700 underline" onclick={() => (showErrors = !showErrors)}>
				{showErrors ? 'Hide details' : 'View details'}
			</button>

			{#if showErrors}
				<div class="mt-2 space-y-2">
					{#each Object.values(errors) as err}
						<div class="rounded border border-red-300 bg-[var(--form-bg-card)] p-2">
							<p class="font-semibold">
								{err.year} (Row {err.rowIndex + 1})
							</p>
							<ul class="list-disc pl-5 text-sm">
								{#each err.messages as msg}
									<li>{msg}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
