<script lang="ts">
	import SelectField from './SelectField.svelte';
	import TextField from './TextField.svelte';
	import InterestRateTextField from './InterestRateTextField.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { selectToClose } from '$lib/utils/ApplicantUtils/closureOptions';
	import { personalLoanType, businessLoanType } from '$lib/config/applicantOptions/loanTypes';
	import { getLoanTypeOptions } from '$lib/utils/ApplicantUtils/getLoanTypeOptions';
	import type { Question, Answers } from '$lib/types/formTypes';
	import { sanitizeKey } from '$lib/utils/sanitizeKey';
	import ActionButton from './ActionButton.svelte';
	import LoanTable from './LoanTable.svelte';
	import obligationJson from '$lib/config/obligation.json';
	import jsonLogic from 'json-logic-js';
	import { resolveDynamicText } from '$lib/utils/resolveDynamicText';
	import { createLoanEntry, clearLoanForm } from '$lib/utils/ApplicantUtils/createLoanEntry';
	import InputField from './InputField.svelte';

	interface Props {
		numberWordsMap?: Record<string, string>;
		idx: number;
		answers?: Record<string, any>;
		applicant?: any;
		loanTypeOptions?: any;
		personalLoanType?: any;
		bankData?: any;
		formErrors?: any;
		updateAnswer?: any;
		handleAddLoanClick?: any;
	}

	let { numberWordsMap = {}, idx, answers = $bindable({}) }: Props = $props();

	const EMI_TYPES = ['OD Limit', 'CC Limit', 'Dropline OD'];

	let loanTypeOptions = $derived(
		getLoanTypeOptions(
			answers.employmentType,
			answers.applicantType,
			businessLoanType,
			personalLoanType
		)
	);

	let isIncomplete: boolean = $state(false);
	let hasValidationErrors: () => boolean | null = $state(() => null);

	$effect(() => {
		hasValidationErrors = () => {
			const questions = obligationJson.questions;

			for (const q of questions) {
				const key = resolveBindsTo(q as Question, answers);

				const val = answers[key];
				if (!isVisible(q, answers)) continue;

				if (q.validation?.condition) {
					if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
						return null;
					}

					const errors = resolveDynamicError(q.validation.condition, answers);
					if (errors.length > 0) {
						return true;
					}
				}
			}

			return false;
		};
	});

	let disableAddButton = $derived(isIncomplete || (hasValidationErrors() ?? false));

	let termLoans = $derived(
		(answers.obligations ?? []).filter((e: any) => e.obligationType === 'term_loan')
	);
	let creditLines = $derived(
		(answers.obligations ?? []).filter((e: any) => e.obligationType === 'credit_line')
	);

	$effect(() => {
		// Always-required fields
		let requiredFields: any[] = [];
		requiredFields = [
			answers.currentLoanType,
			answers.currentBankName,
			answers.currentSelectedToClose,
			answers.currentInterestRate
		];

		// EMI loans (NOT OD / CC / Dropline)
		if (answers.currentLoanType && !EMI_TYPES.includes(answers.currentLoanType)) {
			requiredFields.push(answers.currentEmi);
			requiredFields.push(answers.currentTenure);
		}

		// OD / CC / Dropline → common OD fields
		if (answers.currentLoanType && EMI_TYPES.includes(answers.currentLoanType)) {
			requiredFields.push(answers.currentTotalLimit);
			requiredFields.push(answers.currentSanctionedTenure);
		}

		// Dropline OD special
		if (answers.currentLoanType === 'Dropline OD') {
			requiredFields.push(answers.currentRemainingLimit);
			requiredFields.push(answers.currentUtilizedAmount);
			requiredFields.push(answers.currentTenure);
		}

		// Validation: any empty or blank value?
		isIncomplete = requiredFields.some((v) => !v || String(v).trim() === '');
	});

	function updateAnswer(question: Question, value: any) {
		const key = question.bindsTo_template || question.bindsTo || question.id;

		let finalValue: any;

		if (question.valueType === 'number') {
			finalValue = value === '' || value === null ? null : Number(value);
		} else {
			finalValue = String(value ?? '');
		}

		answers = { ...answers, [key]: finalValue };

		return answers;
	}

	function handleNumberInput(value: number | number[] | null, question: any) {
		updateAnswer(question, value);
	}

	function onTextFieldInput(question: Question, val: string) {
		updateAnswer(question, val);
	}

	function selectFieldOptions(id: string) {
		if (id == 'loanType') {
			return loanTypeOptions || personalLoanType;
		} else if (id == 'bankName') {
			return bankData.filter((b) => b.Classification !== 'NBFC');
		} else if (id == 'selectedToClose') {
			return selectToClose(formState.applicationData.loanType ?? '');
		}
	}

	function isVisible(question: Record<string, unknown>, answers: Record<string, unknown>): boolean {
		if (!question.showWhen) return true;
		return jsonLogic.apply(question.showWhen, answers) as boolean;
	}

	// =========================================================================
	// SCOPED INLINE COPY of resolveBindsTo — 2-arg, no q1_loanName handling.
	// =========================================================================
	// Do NOT replace this with an import from $lib/form/firstPage/schema.ts.
	// This sub-form is used in isolation (existing-loan modals + form) and its
	// templates never reference `q1_loanName`, so the 3rd `selectedLoan` arg
	// that the canonical client resolver takes is not meaningful here. Keeping
	// the 2-arg signature keeps call sites from threading a stale loan context
	// through a flow that is loan-type-agnostic.
	//
	// The canonical client resolver (and the reasons the server / archived
	// copies exist) are documented in the $lib/form/firstPage/schema.ts header.
	// See docs/RESOLUTION-PLAN.md §4B (CLOSED) for the full three-copy survey.
	// =========================================================================
	function resolveBindsTo(question: Question, answers: Answers): string {
		if (!question.bindsTo_template) return question.bindsTo || question.id;
		return question.bindsTo_template.replace(/\{([^}]+)\}/g, (_, key: string) => {
			const val = answers[key];
			return typeof val === 'string' ? sanitizeKey(val) : (val?.toString('en-IN') ?? '');
		});
	}

	function resolveDynamicError(field: any, answers: Answers): string[] {
		if (!field) {
			return [];
		}
		if (typeof field === 'string') {
			return [field];
		}
		if (Array.isArray(field)) {
			const errors: string[] = [];
			for (const condition of field) {
				const result = jsonLogic.apply(condition.case, answers);
				if (result) {
					errors.push(...resolveDynamicError(condition.then, answers));
				}
			}

			return errors;
		}
		if (typeof field === 'object' && field.switch && Array.isArray(field.switch)) {
			const errors: string[] = [];
			for (const condition of field.switch) {
				const result = jsonLogic.apply(condition.case, answers);
				if (result) {
					errors.push(...resolveDynamicError(condition.then, answers));
				}
			}
			return errors;
		}
		return typeof field === 'object' ? [JSON.stringify(field)] : [];
	}

	function getValidationErrorMessage(question: Question, answers: Answers): string | null {
		const key = resolveBindsTo(question, answers);
		const val = answers[key];

		if (question.validation?.condition) {
			if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
				return null;
			}

			const errors = resolveDynamicError(question.validation.condition, answers);
			if (errors.length > 0) {
				return errors[0];
			}
		}

		return null;
	}

	function handleAddLoanClick(): void {
		answers.obligations ??= [];

		const newEntry = createLoanEntry(answers);
		answers.obligations = [...(answers.obligations as any[]), newEntry];

		clearLoanForm(answers);
	}
</script>

<div
	class="mt-8 space-y-6 rounded border border-[var(--form-border)] bg-[var(--form-bg-alt)] p-4 md:mt-12"
>
	<h5 class="text-sectionHeadingText">Add all the running CC / OD / loan details</h5>

	<div class="grid gap-x-6 gap-y-[2rem] md:grid-cols-2 md:gap-y-[3rem]">
		{#each obligationJson.questions as question}
			{#if isVisible(question, answers)}
				{#if question.type == 'select'}
					<SelectField
						id={`${question.id}_${idx}`}
						label={question.label as string}
						options={selectFieldOptions(question.id) as any}
						value={answers[question.bindsTo as string] ?? ''}
						onChange={(val) => updateAnswer({ bindsTo: question.bindsTo } as Question, val)}
						icon={question.icon as string}
					/>
				{:else if question.type == 'number' || question.type == 'text'}
					<!-- <TextField
						id={`${question.id}_${idx}`}
						label={resolveDynamicText(question.label, answers)}
						value={answers[question.bindsTo] ?? ''}
						uiType={question.uiType}
						icon={question.icon}
						placeholder={resolveDynamicText(question.placeholder, answers)}
						error={getValidationErrorMessage(question, answers) || undefined}
						onInput={(val) => {
							onTextFieldInput(
								{
									id: `${question.id}_${idx}`,
									uiType: question.uiType,
									bindsTo: question.bindsTo,
									valueType: question.valueType
								},
								val
							);
						}}
					/> -->
					<InputField
						id={`${question.id}_${idx}`}
						label={resolveDynamicText(question.label, answers)}
						bind:value={answers[question.bindsTo as string]}
						type={question.type as string}
						icon={question.icon as string}
						inputRestriction={question.inputRestriction as any}
						maxlength={question.maxlength as number}
						placeholder={resolveDynamicText(question.placeholder, answers)}
						error={getValidationErrorMessage(question as Question, answers) || undefined}
						validateOnInput={true}
						onInput={() => {
							onTextFieldInput(
								{
									id: `${question.id}_${idx}`,
									uiType: question.uiType,
									bindsTo: question.bindsTo,
									valueType: question.valueType
								} as Question,
								String(answers[question.bindsTo as string] ?? '')
							);
						}}
					/>
				{:else if question.type == 'interestRate'}
					<InterestRateTextField
						id={`${question.id}_${idx}`}
						label={question.label as string}
						bind:value={answers[question.bindsTo as string]}
						placeholder={question.placeholder as string}
						error={getValidationErrorMessage(question as Question, answers) || undefined}
						uiType={question.uiType as string}
						icon={question.icon as string}
						onInput={(val) => {
							onTextFieldInput(
								{
									id: `${question.id}_${idx}`,
									uiType: question.uiType,
									bindsTo: question.bindsTo,
									valueType: question.valueType
								} as Question,
								String(Array.isArray(val) ? val[0] : val)
							);
						}}
					/>
				{/if}
			{/if}
		{/each}
	</div>

	<!-- <ActionButton btnName="+ Add Loan" onClick={() => handleAddLoanClick(idx)} /> -->
	<ActionButton
		btnName="+ Add Loan"
		disabled={disableAddButton}
		onClick={() => handleAddLoanClick()}
	/>

	{#if termLoans.length}
		<LoanTable title="Term Loans" bind:answers entries={termLoans} {idx} isLimit={false} />
	{/if}

	{#if creditLines.length}
		<LoanTable title="Credit Lines" bind:answers entries={creditLines} {idx} isLimit={true} />
	{/if}
</div>
