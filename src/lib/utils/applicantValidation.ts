/**
 * Applicant Validation Utilities
 * ═══════════════════════════════════════════════════════════════════
 * Pure validation functions for applicant form fields. Handles
 * JSON Logic conditions, custom name/company validation, field
 * visibility filtering, and completion checking.
 *
 * All functions accept dependencies as parameters (dependency injection)
 * to remain pure and testable.
 *
 * Extracted from AddApplicant.svelte.
 */

import type { LegacyApplicant } from '$lib/stores/loanData';
import type { ShowWhenCondition, AnswersMap } from '$lib/config/showWhenEngine';
import jsonLogic from 'json-logic-js';

/**
 * Function signature for showWhen/disabledWhen evaluators.
 * Accepts a JSON Logic condition (or null/undefined/boolean) and a context object,
 * returns whether the condition is satisfied.
 */
export type ShouldShowFn = (
	condition: ShowWhenCondition | boolean | null | undefined,
	context: AnswersMap
) => boolean;

/**
 * Shape of an applicant config question used by the legacy AddApplicant flow.
 * These carry JSON Logic showWhen/disabledWhen/validation conditions,
 * unlike the newer ApplicantQuestion interface from applicantQuestions.ts.
 */
export interface ApplicantConfigQuestion {
	key: string;
	question?: string;
	required?: boolean;
	showWhen?: ShowWhenCondition | boolean | null;
	disabledWhen?: ShowWhenCondition | boolean | null;
	validation?: {
		condition?: Array<{ case: Record<string, unknown>; then: string }>;
	};
	[key: string]: unknown;
}

/**
 * Validate a single applicant field using JSON Logic conditions and custom rules.
 * Returns an error message string or null if valid.
 */
export function validateApplicantFieldJSON(
	applicant: LegacyApplicant,
	_index: number,
	fieldKey: string,
	configQuestions: ApplicantConfigQuestion[],
	appData: Record<string, unknown>,
	shouldShowFn: ShouldShowFn
): string | null {
	const question = configQuestions.find((q) => q.key === fieldKey);
	if (!question) return null;

	// Check if field is visible based on showWhen conditions
	const combined: Record<string, unknown> = { ...applicant, ...appData };
	const isVisible = shouldShowFn(question.showWhen, combined);
	if (!isVisible) return null;

	// Skip validation for disabled fields — they are visible but locked,
	// so the user cannot correct any validation error. Their value is
	// auto-set by the component that disables them (e.g., OPC → directors = 1).
	if (question.disabledWhen && shouldShowFn(question.disabledWhen, combined)) {
		return null;
	}

	const value = applicant[fieldKey];

	// Custom validation for name field
	if (fieldKey === 'fullName') {
		if (typeof value !== 'string' || value.trim().length === 0) {
			return 'Full name is required';
		}
		if (value.trim().length < 2) {
			return 'Name must be at least 2 characters';
		}
		if (/(.)\1{2,}/.test(value)) {
			return 'Name should not contain repetitive characters';
		}
	} else if (fieldKey === 'companyName') {
		if (typeof value !== 'string' || value.trim().length === 0) {
			return 'Company name is required';
		}

		const name = value.trim();

		if (name.length < 2) {
			return 'Company name must be at least 2 characters';
		}

		if (!/^[A-Za-z0-9 .&'()-]+$/.test(name)) {
			return "Allowed characters: A–Z, 0–9, space, . & ' ( ) -";
		}

		if (/(.)\1{4,}/.test(name)) {
			return 'Company name should not contain more than 4 consecutive same characters';
		}

		if (/^[.&'()-]|[.&'()-]$/.test(name)) {
			return 'Company name cannot start or end with special characters';
		}

		if (/([.&'()-])\1+/.test(name)) {
			return 'Company name should not contain consecutive special characters';
		}
	}

	// Custom validation: numberOfDirectorsOrPartners minimum per company type
	if (fieldKey === 'numberOfDirectorsOrPartners' && value) {
		const companyType = (applicant.companyType as string) || '';
		if (companyType && companyType !== 'One Person Company (OPC)') {
			const MIN_DIRECTORS: Record<string, number> = {
				'Partnership Firm': 2,
				LLP: 2,
				'Private Limited': 2
			};
			const min = MIN_DIRECTORS[companyType] ?? 2;
			if (Number(value) < min) {
				return `${companyType} requires at least ${min} directors/partners`;
			}
		}
	}

	// Required field check — for fields without their own validation conditions
	if (
		question.required &&
		!question.validation?.condition &&
		(value === undefined || value === null || value === '')
	) {
		const label = question.question || fieldKey;
		return `${label} is required`;
	}

	// JSON Logic validation from config
	if (question.validation?.condition) {
		const context = { ...applicant, ...appData };

		// Normalize null/undefined to empty string for json-logic
		// Also ensure the current field key exists (may be missing entirely from applicant)
		if (!(fieldKey in context)) context[fieldKey] = '';
		Object.keys(context).forEach((k) => {
			if (context[k] === undefined || context[k] === null) {
				context[k] = '';
			}
		});

		for (const condition of question.validation.condition) {
			const result = jsonLogic.apply(condition.case, context);
			if (result && typeof condition.then === 'string') {
				return condition.then;
			}
		}
	}

	return null;
}

/**
 * Get all validation errors for an applicant (pure, no state mutation).
 * Returns a Record of fieldKey → error message.
 */
export function getApplicantErrors(
	applicant: LegacyApplicant,
	index: number,
	appData: Record<string, unknown>,
	configQuestions: ApplicantConfigQuestion[],
	shouldShowFn: ShouldShowFn
): Record<string, string> {
	const errors: Record<string, string> = {};

	// Always validate applicantType first
	const applicantTypeError = validateApplicantFieldJSON(
		applicant,
		index,
		'applicantType',
		configQuestions,
		appData,
		shouldShowFn
	);
	if (applicantTypeError) {
		errors.applicantType = applicantTypeError;
	}

	// Then validate other visible questions
	const visibleQuestions = getVisibleQuestions(applicant, appData, configQuestions, shouldShowFn);

	for (const question of visibleQuestions) {
		if (question.key === 'applicantType') continue;

		const error = validateApplicantFieldJSON(
			applicant,
			index,
			question.key,
			configQuestions,
			appData,
			shouldShowFn
		);
		if (error) {
			errors[question.key] = error;
		}
	}

	return errors;
}

/**
 * Check if an applicant has all required fields filled (pure, no mutation).
 * Returns true if complete.
 */
export function checkApplicantComplete(
	applicant: LegacyApplicant,
	index: number,
	appData: Record<string, unknown>,
	configQuestions: ApplicantConfigQuestion[],
	shouldShowFn: ShouldShowFn
): boolean {
	if (!applicant.applicantType) return false;
	const errors = getApplicantErrors(applicant, index, appData, configQuestions, shouldShowFn);
	return Object.keys(errors).length === 0;
}

/**
 * Check if an applicant record has no meaningful data filled in.
 * Ignores metadata fields (id, touchedFields, hasError, shake).
 */
export function isTrulyEmptyApplicant(applicant: LegacyApplicant): boolean {
	const meaningfulKeys = Object.keys(applicant).filter(
		(k) => !['hasError', 'shake', 'id', 'touchedFields'].includes(k)
	);

	return meaningfulKeys.every((k) => {
		const val = applicant[k];
		if (typeof val === 'boolean' || val === null) return false;
		return val === undefined || val === '';
	});
}

/**
 * Filter config questions to only those visible for the given applicant.
 * Excludes applicantType (rendered separately as a standalone selector).
 */
export function getVisibleQuestions(
	applicant: LegacyApplicant,
	appData: Record<string, unknown>,
	configQuestions: ApplicantConfigQuestion[],
	shouldShowFn: ShouldShowFn
): ApplicantConfigQuestion[] {
	const combined: Record<string, unknown> = { ...applicant, ...appData };
	return configQuestions.filter(
		(q) => q.key !== 'applicantType' && shouldShowFn(q.showWhen, combined)
		// Note: disabledWhen is handled in ApplicantFormCard.svelte as a disabled prop,
		// NOT as a visibility filter. Previously this excluded disabled fields entirely.
	);
}

/**
 * Strip fields not relevant to the applicant's type.
 * Individual keeps name/gender/age/etc.; Company keeps companyName/companyType/etc.
 */
export function getRelevantFields(
	applicant: LegacyApplicant,
	hasRoleQuestions: boolean
): LegacyApplicant {
	if (!applicant.applicantType) return applicant;

	const baseFields = hasRoleQuestions
		? ['id', 'applicantType', 'touchedFields', 'onProperty', 'onEMI']
		: ['id', 'applicantType', 'touchedFields'];

	if (applicant.applicantType === 'Individual') {
		const individualFields = [
			...baseFields,
			'applicantSubType',
			'fullName',
			'gender',
			'age',
			'maritalStatus',
			'isNRI',
			'employmentType',
			...(hasRoleQuestions ? ['isGuarantor'] : [])
		];

		const cleaned: LegacyApplicant = {};
		individualFields.forEach((field) => {
			if (applicant[field] !== undefined) {
				cleaned[field] = applicant[field];
			}
		});
		return cleaned;
	}

	if (applicant.applicantType === 'Company') {
		const companyFields = [
			...baseFields,
			'companyName',
			'companyType',
			'businessType',
			'ownershipType',
			'registrationCountry',
			'numberOfDirectorsOrPartners'
		];

		const cleaned: LegacyApplicant = {};
		companyFields.forEach((field) => {
			if (applicant[field] !== undefined) {
				cleaned[field] = applicant[field];
			}
		});
		return cleaned;
	}

	return applicant;
}

/**
 * Validate a single form-level field using its JSON Logic condition.
 * Form-level fields are stored in applicationData, not per-applicant.
 */
export function validateFormLevelField(
	fieldKey: string,
	formLevelQuestions: ApplicantConfigQuestion[],
	appData: Record<string, unknown>,
	shouldShowFn: ShouldShowFn
): string | null {
	const question = formLevelQuestions.find((q) => q.key === fieldKey);
	if (!question) return null;

	// Check visibility
	const isVisible = shouldShowFn(question.showWhen, appData);
	if (!isVisible) return null;

	if (question.validation?.condition) {
		const context: Record<string, unknown> = { ...appData };
		Object.keys(context).forEach((k) => {
			if (context[k] === undefined || context[k] === null) {
				context[k] = '';
			}
		});

		for (const condition of question.validation.condition) {
			const result = jsonLogic.apply(condition.case, context);
			if (result && typeof condition.then === 'string') {
				return condition.then;
			}
		}
	}

	return null;
}
