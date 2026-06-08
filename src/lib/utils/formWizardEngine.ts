/**
 * Form Wizard Engine -- shared evaluation, navigation, and answer utilities.
 *
 * Extracted from the 6 duplicated form wizard pages (personal, business,
 * professional, home, LAP, plot). Each function accepts parameters from
 * the calling page so behavior can vary per loan type without duplication.
 *
 * This file is pure functions only -- no Svelte runes, no reactive state.
 * Pages call these helpers from their own reactive contexts.
 */

import { formState } from '$lib/state/form.svelte';
import { evaluateWarning } from '$lib/config/warningEngine';
import { shouldShowEncoded, shouldShow } from '$lib/config/showWhenEngine';
import { groupQuestions } from '$lib/utils/questionGrouping';
import {
	countStandaloneIndividuals,
	isStandaloneApplicant
} from '$lib/utils/applicantVisibility';
import { resolveDynamicText } from '$lib/utils/resolveDynamicText';
import type { PageResponse, ClientQuestion, VisiblePageEntry } from '$lib/types/formEngine';
import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import type { QuestionGroup } from '$lib/utils/questionGrouping';

// ── Server Evaluation Payload ──────────────────────────────────

/**
 * Build the evaluation answers payload with applicant metadata.
 *
 * Every form page needs to enrich raw loan answers with computed applicant
 * metadata (__applicantCount, __allIndividualsNRI, etc.) before sending to
 * the server's /api/form/evaluate endpoint. This was duplicated identically
 * in all 6 pages.
 *
 * @param selectedLoan - The currently selected loan value (e.g., "Personal Loan")
 * @param extraPayloadFields - Optional loan-type-specific extra fields builder
 *   (e.g., businessEntityType for Business Loan, facilityType for LAP/Home)
 */
export function buildEvaluationAnswers(
	selectedLoan: string,
	extraPayloadFields?: (rawAnswers: Record<string, unknown>) => Record<string, unknown>
): Record<string, unknown> {
	const loanData = formState.loanData as Record<string, unknown>;
	const rawAnswers = ((loanData as Record<string, unknown>)[selectedLoan] ?? {}) as Record<
		string,
		unknown
	>;

	const answers: Record<string, unknown> = { ...rawAnswers };

	// -- Standard applicant metadata (identical across all 6 pages) --
	// Counts mirror the Who's Applying table: typed rows only, director-linked
	// Individuals fold under their parent Company. Without this, subsection
	// `showWhen` rules (e.g. Relationships) fire when the user sees only one
	// row in the table — see countStandaloneIndividuals docs.

	answers['__applicantCount'] = formState.applicants.filter((a) => a.applicantType).length;

	const standaloneIndividuals = formState.applicants.filter(
		(a) => a.applicantType === 'Individual' && isStandaloneApplicant(a, formState.applicants)
	);

	answers['__individualApplicantCount'] = countStandaloneIndividuals(formState.applicants);

	// All standalone individuals must be NRI for this flag to be true
	answers['__allIndividualsNRI'] =
		standaloneIndividuals.length > 0 &&
		standaloneIndividuals.every((a: Record<string, unknown>) => a.isNRI === 'Yes');

	// Multi-applicant mode affects question visibility (e.g., co-applicant sections)
	answers['__multiApplicantMode'] = (answers['__applicantCount'] as number) > 1;

	// Single company applicant triggers special company-only questions
	answers['__onlyCompanyApplicant'] =
		formState.applicants.length === 1 && formState.applicants[0]?.applicantType === 'Company';

	// -- Primary applicant's income profile metadata --
	const primaryIncomeProfiles = formState.applicants[0]?.selectedIncomeProfiles as
		| string[]
		| undefined;
	if (primaryIncomeProfiles) {
		answers['selectedIncomeProfiles'] = primaryIncomeProfiles;
		// "No current income" is the only profile -- affects eligibility gates
		answers['__hasOnlyNoCurrentIncome'] =
			primaryIncomeProfiles.length === 1 && primaryIncomeProfiles[0] === 'no_current_income';
	}

	// -- Primary applicant's obligation running status --
	const obligationsRunning = formState.applicants[0]?.ObligationsRunning;
	if (obligationsRunning !== undefined) {
		answers['ObligationsRunning'] = obligationsRunning;
	}

	// -- Standard loan type fields (present in all pages) --
	answers['loanType'] = rawAnswers.loanType ?? '';

	// -- Loan-type-specific extra fields --
	// Examples: facilityType (LAP/personal/business/professional), loanVariant (plot),
	//           businessEntityType (business loan)
	if (extraPayloadFields) {
		Object.assign(answers, extraPayloadFields(rawAnswers));
	}

	return answers;
}

// ── Server Error Helpers ───────────────────────────────────────

/**
 * Get server-side validation error for a specific question.
 *
 * After evaluateOnServer returns, the server may include field-level
 * validation errors (format, constraint violations). This extracts
 * the error message for a given question ID.
 */
export function getServerError(
	serverPage: PageResponse | null,
	questionId: string
): string | undefined {
	if (!serverPage?.validationErrors?.length) return undefined;
	const matchingError = serverPage.validationErrors.find((e) => e.questionId === questionId);
	return matchingError?.message;
}

/**
 * Clear stale server-side cross-field validation errors after a user edit.
 *
 * Cross-field rules (validation.condition) are computed server-side and only
 * refreshed on Next-click / navigation (Pitfall #21, ADR-0008). The moment the
 * user edits a field, the previously-returned errors go stale — but nothing
 * re-runs the server eval until the next Next-click. Without clearing them, the
 * error message lingers and `isNextEnabled` (which reads validationErrors.length)
 * keeps Next disabled even after the user corrects the offending input. That is
 * the "fix doesn't clear the error, Next stays stuck until Previous-then-back" bug.
 *
 * Clearing optimistically on edit makes the UI reactive again. This does NOT
 * weaken validation: the authoritative re-check still runs on Next-click via
 * evaluateOnServer + tick, so an uncorrected error simply reappears and re-blocks.
 *
 * Returns the same reference when there is nothing to clear, so callers can
 * assign unconditionally without forcing a needless reactive re-render.
 */
export function clearStaleValidationErrors(
	serverPage: PageResponse | null
): PageResponse | null {
	if (!serverPage?.validationErrors?.length) return serverPage;
	return { ...serverPage, validationErrors: [] };
}

// ── Client-Side Warning Evaluation ─────────────────────────────

/**
 * Evaluate client-side warning from a question's warning schema.
 *
 * Warnings are non-blocking hints (e.g., "This loan amount may attract
 * higher interest rates"). They use JSON-Logic conditions evaluated
 * against combinedAnswers for instant reactivity.
 */
export function getClientWarning(
	question: ClientQuestion,
	combinedAnswers: Record<string, unknown>
): string | null {
	if (!question.warning?.condition) return null;
	return evaluateWarning(
		question.warning.condition as Array<{ case: unknown; then: string }>,
		combinedAnswers
	);
}

// ── Error Summary Builder ──────────────────────────────────────

/**
 * Build error summary from server errors or unanswered required questions.
 *
 * Used by the navigation bar to explain WHY Next is disabled.
 * Returns up to 3 human-readable labels. Server validation errors
 * take priority over client-side "unanswered" checks.
 */
export function buildErrorSummary(
	serverPage: PageResponse | null,
	visibleQuestions: ClientQuestion[],
	currentAnswers: Record<string, unknown>
): string[] {
	// Server validation errors (format / constraint violations) take priority
	const serverErrors = serverPage?.validationErrors ?? [];
	if (serverErrors.length > 0) {
		const allQuestions = serverPage?.questions ?? [];
		return serverErrors
			.map((error) => {
				// Find the question to get its human-readable label
				const question = allQuestions.find((q) => q.id === error.questionId);
				// Strip HTML tags from question text for plain-text display
				return question?.question?.replace(/<[^>]*>/g, '') || error.questionId;
			})
			.slice(0, 3);
	}

	// Client-side: labels of required-but-unanswered visible questions.
	// This ensures the nav bar always explains WHY Next is disabled,
	// even on pages with fewer than 5 questions (where useValidateOnClick is off).
	const unansweredLabels: string[] = [];
	for (const question of visibleQuestions) {
		if (!question.required) continue;
		// isQuestionAnswered is the SAME predicate the gate (isNextEnabled) uses, so the
		// "Missing" list never disagrees with the disabled state: compound type:'location'
		// questions aren't falsely listed once answered, and numeric fields below minLimit
		// ARE listed (the old plain empty-check missed those, showing "Missing: none").
		if (!isQuestionAnswered(question, currentAnswers)) {
			unansweredLabels.push(question.question.replace(/<[^>]*>/g, ''));
		}
	}
	return unansweredLabels.slice(0, 3);
}

// ── Visible Pages Derivation ───────────────────────────────────

/** Visible page entry for wizard sidebar -- stripped of questions for performance */
export interface DerivedVisiblePage {
	id: string;
	title: string;
	questions: ClientQuestion[];
	complete: boolean;
}

/**
 * Derive visible pages from server response for wizard sidebar display.
 *
 * The server returns a lightweight visiblePageMap with completion status.
 * We transform it into the shape the wizard sidebar expects.
 */
export function deriveVisiblePages(serverPage: PageResponse | null): DerivedVisiblePage[] | null {
	if (!serverPage?.visiblePageMap) return null;
	return serverPage.visiblePageMap.map((page) => ({
		id: page.id,
		title: page.title,
		questions: [] as ClientQuestion[],
		complete: page.complete
	}));
}

// ── Current Page Derivation ────────────────────────────────────

/** Current page metadata for rendering */
export interface DerivedCurrentPage {
	id: string;
	title: string;
	description?: string;
	questions: ClientQuestion[];
}

/**
 * Derive current page metadata from server response.
 * Returns undefined when no server page is loaded yet.
 */
export function deriveCurrentPage(serverPage: PageResponse | null): DerivedCurrentPage | undefined {
	if (!serverPage) return undefined;
	return {
		id: serverPage.pageId,
		title: serverPage.pageTitle,
		description: serverPage.pageDescription,
		questions: serverPage.questions
	};
}

// ── Visible Questions Filtering ────────────────────────────────

/**
 * Filter questions using encoded showWhen evaluation.
 *
 * Questions returned by the server include within-page showWhen rules
 * (XOR-ciphered in production, plain objects in dev). This function
 * evaluates those rules client-side for instant reactivity.
 *
 * @param serverPage - Current server page response
 * @param selectedLoan - Currently selected loan value
 * @param formSessionId - Session ID for XOR decoding in production
 */
export function deriveVisibleQuestions(
	serverPage: PageResponse | null,
	selectedLoan: string,
	formSessionId: string
): ClientQuestion[] {
	const questions = serverPage?.questions ?? [];
	if (questions.length === 0) return questions;

	// Build answers map with shorthand aliases for within-page showWhen evaluation
	const loanData = formState.loanData as Record<string, unknown>;
	const rawAnswers = ((loanData as Record<string, unknown>)[selectedLoan] ?? {}) as Record<
		string,
		unknown
	>;
	const answersWithAliases: Record<string, unknown> = { ...rawAnswers };

	// Create shorthand aliases: "q4_propertyStateName" -> "propertyStateName"
	// (split on _, take last segment). Required because showWhen conditions
	// reference the short bindsTo key, not the full question ID.
	for (const [key, value] of Object.entries(answersWithAliases)) {
		if (key.includes('_')) {
			answersWithAliases[key.split('_').pop()!] = value;
		}
	}

	const filtered = questions.filter((q) =>
		shouldShowEncoded(q.showWhen, answersWithAliases, formSessionId)
	);

	// Re-resolve dynamic text fields against the LATEST answers. The server
	// already resolved these once at request time, but if any field reads an
	// answer the user only entered on this same page (no Next yet), the
	// server-baked value is stale. The *Dynamic fields carry the raw switch
	// so we re-evaluate here on every reactive read. See ClientQuestion
	// JSDoc + commit b8e2ab6c for background.
	return filtered.map((q) => reresolveDynamicTexts(q, answersWithAliases));
}

/**
 * Apply client-side re-resolution to a question's dynamic text fields.
 * Touches only `question`, `description`, `descriptionHeader`, `labelDescription`
 * when their `*Dynamic` source switch is present and re-resolves to a value
 * that differs from the server-baked string. Other fields pass through
 * untouched, so this is a no-op for any question that has no dynamic text.
 */
function reresolveDynamicTexts(
	q: ClientQuestion,
	answers: Record<string, unknown>
): ClientQuestion {
	if (
		!q.questionDynamic &&
		!q.descriptionDynamic &&
		!q.descriptionHeaderDynamic &&
		!q.labelDescriptionDynamic
	) {
		return q;
	}

	let next: ClientQuestion | null = null;
	const swap = (
		field: 'question' | 'description' | 'descriptionHeader' | 'labelDescription',
		raw: ClientQuestion['questionDynamic'] | undefined
	) => {
		if (!raw) return;
		const resolved = resolveDynamicText(raw, answers);
		if (resolved && resolved !== q[field]) {
			if (!next) next = { ...q };
			next[field] = resolved;
		}
	};

	swap('question', q.questionDynamic);
	swap('description', q.descriptionDynamic);
	swap('descriptionHeader', q.descriptionHeaderDynamic);
	swap('labelDescription', q.labelDescriptionDynamic);

	return next ?? q;
}

/**
 * Group visible questions into visual card chunks.
 *
 * Thin wrapper that re-exports groupQuestions for convenience --
 * pages can call this instead of importing groupQuestions separately.
 */
export function deriveQuestionGroups(visibleQuestions: ClientQuestion[]): QuestionGroup[] {
	return groupQuestions(visibleQuestions);
}

// ── Tenure Options Generator ───────────────────────────────────

/**
 * Generate tenure options with human-readable labels.
 *
 * Used by tenure-input question types. Handles both year and month units
 * with proper singular/plural formatting.
 *
 * @param min - Minimum tenure value (inclusive)
 * @param max - Maximum tenure value (inclusive)
 * @param unit - "years" or "months"
 */
export function generateTenureOptions(
	min: number,
	max: number,
	unit: string
): Array<{ label: string; value: string }> {
	const options: Array<{ label: string; value: string }> = [];
	for (let i = min; i <= max; i++) {
		const suffix =
			unit === 'months' ? (i === 1 ? ' month' : ' months') : i === 1 ? ' year' : ' years';
		options.push({ label: `${i}${suffix}`, value: String(i) });
	}
	return options;
}

// ── Pincode Context Resolver ───────────────────────────────────

/** Pincode field context -- maps a pincode bindsTo key to its parent state/city keys */
export interface PincodeContext {
	stateKey: string;
	cityKey: string;
	/** 'selected' = only show pincodes for the selected city; 'all' = show all */
	source: 'selected' | 'all';
}

/**
 * Resolve pincode field context from its bindsTo key.
 *
 * Each pincode field (propertyPincode, residencePincode, businessPincode)
 * needs to know its parent state and city keys for dependent filtering.
 * This was duplicated identically across all 6 pages.
 */
export function getPincodeContext(bindsTo: string): PincodeContext {
	if (bindsTo === 'propertyPincode') {
		return { stateKey: 'propertyStateName', cityKey: 'propertyCityName', source: 'selected' };
	}
	if (bindsTo === 'residencePincode') {
		return { stateKey: 'residenceStateName', cityKey: 'residenceCityName', source: 'all' };
	}
	if (bindsTo === 'businessPincode') {
		return { stateKey: 'businessStateName', cityKey: 'businessCityName', source: 'all' };
	}
	return { stateKey: '', cityKey: '', source: 'all' };
}

// ── Payload Collection ─────────────────────────────────────────

/**
 * Collect visible questions into the payloads record for a given page.
 *
 * Only updates if the questions have actually changed (shallow bindsTo
 * comparison) to avoid unnecessary re-renders.
 *
 * @param payloads - Mutable payloads record (owned by the calling page)
 * @param pageIndex - Current page index
 * @param visibleQuestions - Currently visible questions
 */
export function collectPayload(
	payloads: Record<string, unknown[]>,
	pageIndex: number,
	visibleQuestions: ClientQuestion[]
): void {
	const pageKey = `page_${pageIndex}`;
	const existingArray = payloads[pageKey] ?? [];
	const newArray = visibleQuestions ?? [];

	// Shallow comparison by bindsTo key -- avoids replacing the array reference
	// when the same questions are visible (prevents downstream re-renders)
	const isSameArray = (oldArr: unknown[] = [], newArr: unknown[] = []): boolean => {
		if (oldArr.length !== newArr.length) return false;
		return oldArr.every(
			(item, i) =>
				(item as Record<string, unknown>).bindsTo === (newArr[i] as Record<string, unknown>).bindsTo
		);
	};

	if (!isSameArray(existingArray, newArray)) {
		payloads[pageKey] = newArray;
	}
}

// ── Indian Number Parser ───────────────────────────────────────

/**
 * Parse a value to a number, handling Indian number formatting (commas).
 *
 * Used by handleNumberInput / handleSubmit to normalize user input.
 * Returns null for empty or unparseable values.
 */
export function toIndianNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const cleaned = value.replace(/,/g, '').trim();
		if (cleaned === '') return null;
		const parsed = Number(cleaned);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
}

// ── Array Validation ───────────────────────────────────────────

/**
 * Check if every item in an array has all its meaningful fields filled.
 *
 * Used by secured loan pages (Home, LAP, Plot) to validate array-typed
 * question answers (e.g., existing loan details). Ignores UI-only keys
 * like 'shake' and 'hasError'.
 */
/**
 * Checks if a form field value counts as "answered".
 * Handles empty arrays from multi-select fields that pass simple null/'' checks.
 *
 * NUMERIC FIELD CONTRACT (CLAUDE.md Pitfall #14):
 * Numeric questions (uiType==='number' or type==='number') MUST set explicit
 * `minLimit` on the schema. The fallback default of 1 is a safety net only —
 * any new numeric question relying on it is a bug waiting to happen:
 *   - If 0 is a legitimate answer (e.g. "EMIs paid so far" for a fresh BT
 *     applicant, "number of dependents" for a single person), set minLimit: 0
 *     and the user can proceed.
 *   - If the field is a positive amount (loan, area, salary, tenure), set
 *     minLimit: 1 (or higher floor — age >= 18, tenure >= 5).
 *
 * The unit test `numericFieldsHaveExplicitLimits.test.ts` asserts every
 * required numeric question across all loan schemas declares minLimit
 * explicitly, so this contract is enforced at CI time.
 *
 * Fixes the dynamic-validation gap reported 2026-05-02: user enters plot area
 * 1200 (Next enables), changes to 0, Next stays enabled because the simple
 * `val === '' / null / undefined` checks all pass for the number 0.
 */
export function isFieldAnswered(
	val: unknown,
	q?: { uiType?: string; type?: string; minLimit?: number; maxLimit?: number }
): boolean {
	if (val === undefined || val === null || val === '') return false;
	if (Array.isArray(val) && val.length === 0) return false;

	// Numeric semantic check: value below minLimit / above maxLimit / NaN
	// counts as unanswered. Default minLimit of 1 is a safety net — schemas
	// SHOULD set minLimit explicitly. See contract docs above.
	if (q && (q.uiType === 'number' || q.type === 'number' || q.type === 'currency')) {
		const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
		if (!Number.isFinite(num)) return false;
		const min = q.minLimit ?? 1;
		if (num < min) return false;
		if (q.maxLimit !== undefined && num > q.maxLimit) return false;
	}

	return true;
}

/**
 * Question-aware "answered" check that handles compound location questions.
 *
 * Plain questions store their value under `q.bindsTo`, but `type: 'location'`
 * questions write to four separate keys (state/city/area/pincode) listed in
 * `q.locationBindsTo`. Calling `isFieldAnswered(currentAnswers[q.bindsTo], q)`
 * for a location question returns `false` AT ALL TIMES because the bindsTo key
 * is never written to — which used to be fine because every other gate masked
 * it, but the moment a downstream guard fires (e.g. the user clears city by
 * switching state) the page silently reports "complete" because no location
 * sub-field is being checked. This wrapper closes that gap.
 *
 * Server-side equivalent: engine.ts validatePage's location branch.
 */
export function isQuestionAnswered(
	q: {
		type?: string;
		bindsTo?: string;
		uiType?: string;
		minLimit?: number;
		maxLimit?: number;
		locationBindsTo?: { state: string; city: string; area: string; pincode: string };
	},
	currentAnswers: Record<string, unknown>
): boolean {
	if (q.type === 'location' && q.locationBindsTo) {
		// State + city are always required on location questions (matches
		// the server-side check in engine.ts validatePage).
		const stateVal = currentAnswers[q.locationBindsTo.state];
		const cityVal = currentAnswers[q.locationBindsTo.city];
		return !!stateVal && !!cityVal;
	}
	const val = q.bindsTo ? currentAnswers[q.bindsTo] : undefined;
	return isFieldAnswered(val, q);
}

export function isArrayFullyValid(data: unknown[]): boolean {
	if (!Array.isArray(data) || data.length === 0) return false;

	const uiOnlyKeys = ['shake', 'hasError'];

	return data.every((item) => {
		if (typeof item !== 'object' || item === null) return false;

		const meaningfulKeys = Object.keys(item).filter((key) => !uiOnlyKeys.includes(key));
		if (meaningfulKeys.length === 0) return false;

		return meaningfulKeys.every((key) => {
			const fieldValue = (item as Record<string, unknown>)[key];

			if (fieldValue === null || fieldValue === undefined) return false;
			if (typeof fieldValue === 'string' && fieldValue.trim() === '') return false;
			if (typeof fieldValue === 'number' && Number.isNaN(fieldValue)) return false;

			return true;
		});
	});
}

// ── Update Title Helper ────────────────────────────────────────

/**
 * Build the storage key for a question's title field.
 *
 * Some questions (e.g., location selects) store a separate "_title"
 * key with the display label alongside the value.
 */
export function buildTitleKey(questionId: string): string {
	return `${questionId}_title`;
}

// ── Field Validation ───────────────────────────────────────────

/**
 * Validate a text/number field value for basic format constraints.
 * Returns an error message string, or null if valid.
 *
 * Used by input error state tracking to show inline validation hints.
 */
export function getFieldValidationError(
	value: string | number | null | undefined,
	uiType: 'number' | 'text'
): string | null {
	if (!value) return null;
	const stringValue = String(value);

	if (uiType === 'number') {
		if (!/^\d*$/.test(stringValue)) return 'Value must be digits only';
		if (stringValue.length < 6) return 'Number must be at least 6 digits long';
		if (stringValue.length > 15) return 'Number must not exceed 15 digits';
	}

	if (uiType === 'text') {
		if (!/^[A-Za-z ]+$/.test(stringValue)) return 'Name can only contain letters and spaces';
		if (stringValue.length < 3) return 'Name must be at least 3 characters long';
		if (stringValue.length > 100) return 'Name must not exceed 100 characters';
	}

	return null;
}

// ── Answer Update Helpers ──────────────────────────────────────

/**
 * Update a single answer key in formState.loanData for the given loan.
 *
 * This is the fundamental write operation -- all answer changes flow
 * through this. It immutably replaces the loan data slice.
 */
export function updateAnswerByKey<T extends string | number | boolean | (string | number)[]>(
	selectedLoan: string,
	key: string,
	value: T
): void {
	const loanData = formState.loanData;
	const currentLoanData = ((loanData as Record<string, unknown>)[selectedLoan] ?? {}) as Record<
		string,
		unknown
	>;
	formState.replaceLoanData({
		...loanData,
		[selectedLoan]: {
			...currentLoanData,
			[key]: value
		},
		loanName: selectedLoan
	});
}

// ── Dependent City Option Loading ──────────────────────────────

/**
 * Fetch dependent city options when a state field changes.
 *
 * Uses the config's cityQuestionMap to determine which city question
 * to reload options for. Mutates the serverPage's question options
 * in-place (the server page is $state, so Svelte picks up the change).
 *
 * @param stateFieldKey - The bindsTo key that changed (e.g., "propertyStateName")
 * @param selectedLoan - Current loan type string
 * @param currentAnswers - Current form answers (passed to option resolver)
 * @param cityQuestionMap - Map of state keys to city question IDs
 * @param serverPage - Current server page (mutated in-place for options)
 * @returns Promise that resolves when options are loaded
 */
export async function fetchDependentCityOptions(
	stateFieldKey: string,
	selectedLoan: string,
	currentAnswers: Record<string, unknown>,
	cityQuestionMap: Record<string, string>,
	serverPage: PageResponse | null
): Promise<void> {
	const { fetchQuestionOptions } = await import('$lib/utils/formOptionFetcher');

	const cityQuestionId = cityQuestionMap[stateFieldKey];
	if (!cityQuestionId || !selectedLoan) return;

	const result = await fetchQuestionOptions(selectedLoan, [cityQuestionId], {
		...currentAnswers
	});
	if (result && serverPage) {
		const cityQuestion = serverPage.questions.find((q) => q.id === cityQuestionId);
		if (cityQuestion && result[cityQuestionId]) {
			cityQuestion.options = result[cityQuestionId];
		}
	}
}

// ── Input Error Scoping ────────────────────────────────────────

/**
 * Check whether any visible question has an input validation error.
 *
 * Scoped to the current page's visible questions only -- prevents
 * errors from hidden questions blocking navigation.
 *
 * @param visibleQuestions - Currently visible questions on this page
 * @param inputErrorsState - Map of question ID/bindsTo -> error message
 */
export function hasInputErrors(
	visibleQuestions: ClientQuestion[],
	inputErrorsState: { get: (key: string) => string | undefined }
): boolean {
	return visibleQuestions.some((q) => {
		const errorById = inputErrorsState.get(q.id);
		const errorByBindsTo = inputErrorsState.get(q.bindsTo);
		const error = errorById || errorByBindsTo;
		return typeof error === 'string' && error.trim() !== '';
	});
}

// ── Option-Level showWhen Filtering ───────────────────────────

/**
 * Filter a question's options by their individual showWhen conditions.
 *
 * Options may have their own showWhen rules (separate from the question-level
 * showWhen). This filters out options that don't match, so the UI only renders
 * visible choices. Identical logic was duplicated in all 6 form pages.
 */
export function getFilteredOptions(
	options: ClientQuestion['options'],
	answers: Record<string, unknown>
): NonNullable<ClientQuestion['options']> {
	if (!options || options.length === 0) return options ?? [];
	const hasOptionShowWhen = options.some((opt: any) => opt.showWhen);
	if (!hasOptionShowWhen) return options;
	return options.filter((opt: any) => shouldShow(opt.showWhen, answers));
}

// ── Stale Option Value Clearing ───────────────────────────────

/**
 * Clear stale radio/select/multi-select values when option-level showWhen
 * hides the currently selected option.
 *
 * This is the loop body extracted from the $effect block that was duplicated
 * in all 6 form pages. The caller keeps a thin $effect wrapper that calls
 * this function and updates lastClearedKeys.
 *
 * @param visibleQuestions - Currently visible questions on this page
 * @param combinedAnswers - Combined answers with shorthand aliases
 * @param currentAnswers - Raw current answers for this loan type
 * @param lastClearedKeys - Set of keys cleared in the previous run (prevents re-clearing)
 * @param updateAnswer - Callback to update a single answer key
 * @returns New set of cleared keys (caller should store this as lastClearedKeys)
 */
export function clearStaleOptionValues(
	visibleQuestions: ClientQuestion[],
	combinedAnswers: Record<string, unknown>,
	currentAnswers: Record<string, unknown>,
	lastClearedKeys: Set<string>,
	updateAnswer: (key: string, value: string | string[]) => void
): Set<string> {
	const cleared = new Set<string>();
	for (const question of visibleQuestions) {
		const opts = question.options;
		if (!opts || opts.length === 0) continue;
		const hasOptionShowWhen = opts.some((opt: any) => opt.showWhen);
		if (!hasOptionShowWhen) continue;

		const key = question.bindsTo || question.id;
		const currentVal = currentAnswers[key];
		if (!currentVal || currentVal === '') continue;

		const visibleOpts = opts.filter((opt: any) => shouldShow(opt.showWhen, combinedAnswers));

		// Multi-select: filter stale items from the array
		if (question.type === 'multiple-select' || question.type === 'multiple-select-toggle') {
			if (Array.isArray(currentVal)) {
				const validValues = new Set(visibleOpts.map((o) => o.value));
				// Options without showWhen are always valid
				opts.filter((o: any) => !o.showWhen).forEach((o) => validValues.add(o.value));
				const cleaned = currentVal.filter((v) => validValues.has(v));
				if (cleaned.length !== currentVal.length) {
					updateAnswer(key, cleaned);
				}
			}
			continue;
		}

		// Radio/select: clear if selected value is no longer visible
		const isStale = !visibleOpts.some((opt) => opt.value === currentVal);
		if (isStale) {
			cleared.add(key);
			if (!lastClearedKeys.has(key)) {
				updateAnswer(key, '');
			}
		}
	}
	return cleared;
}

// ── Down Payment Percentage Calculator ────────────────────────

/**
 * Calculate deposit/loan percentage split from property cost and deposit.
 *
 * Used by home-loan and plot-loan pages to show the deposit % badge
 * next to the deposit field. Home-loan checks dealValue for Resale.
 *
 * @returns { depositPercent, loanPercent } or null if data insufficient
 */
export function downpaymentPercentage(
	currentAnswers: Record<string, unknown>
): { depositPercent: number; loanPercent: number } | null {
	const propCost = parseFloat(String(currentAnswers?.propCost || 0));
	const dealValue = parseFloat(String(currentAnswers?.dealValue || 0));
	const deposit = parseFloat(String(currentAnswers?.deposit || 0));

	// Use propCost if available, otherwise dealValue (Resale path)
	let baseAmount = 0;
	if (propCost > 0) {
		baseAmount = propCost;
	} else if (dealValue > 0) {
		baseAmount = dealValue;
	}

	if (!baseAmount || !deposit) return null;

	const depositPercent = Number(((deposit / baseAmount) * 100).toFixed(0));
	const loanPercent = 100 - depositPercent;

	if (depositPercent < 0 || depositPercent > 90) return null;

	return { depositPercent, loanPercent };
}
