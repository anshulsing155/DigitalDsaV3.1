// =============================================================================
// ARCHIVED — do not import from this file.
// =============================================================================
// Originally at: src/lib/form/homeLoan/validation.ts
// Archived on:   2026-04-21 (session S77b-4B, RESOLUTION-PLAN §4B)
// Restore path:  git show 895470dd:src/lib/form/homeLoan/validation.ts
//                (introduction)  or any of:
//                git show cfd9eb61:src/lib/form/homeLoan/validation.ts (pre-archive)
//
// Why archived:
//   ZERO live importers at archive time. Every export was dead code:
//     • resolveDynamicError          — no callers; server port lives at
//       $lib/server/formEngine/textResolver.ts
//     • getValidationErrorMessage    — no callers; form pages route through
//       the server form engine, which has its own validation pipeline
//     • resolveDynamicWarning        — no callers
//     • getWarningErrorMessage       — no callers
//
//   The file's only inbound edge was a sibling import of `resolveBindsTo` from
//   homeLoan/schema.ts — but that file was dead too, and archived in the same
//   commit. The pair was part of the intended 6-per-loan-type client namespace
//   plan (commit 895470dd) that was superseded by server-driven evaluation
//   (e0534f0e + 3104d918) before the other 5 namespaces were built.
//
// DO NOT restore. If client-side validation becomes required again, the
// server's textResolver.ts is the canonical source to port FROM, not this.
// See docs/RESOLUTION-PLAN.md §4B (CLOSED) for the full rationale.
// =============================================================================

import jsonLogic from 'json-logic-js';
import type { Question, Answers } from '$lib/types/formTypes';
import { resolveBindsTo } from '$lib/form/homeLoan/schema';
import { get as getStore } from 'svelte/store';
import type { Writable } from 'svelte/store';

export function resolveDynamicError(field: any, answers: Answers): string[] {
	if (!field) return [];
	if (typeof field === 'string') return [field];

	if (Array.isArray(field)) {
		const errors: string[] = [];
		for (const condition of field) {
			if (jsonLogic.apply(condition.case, answers)) {
				errors.push(...resolveDynamicError(condition.then, answers));
			}
		}
		return errors;
	}

	if (typeof field === 'object' && field.switch && Array.isArray(field.switch)) {
		const errors: string[] = [];
		for (const condition of field.switch) {
			if (jsonLogic.apply(condition.case, answers)) {
				errors.push(...resolveDynamicError(condition.then, answers));
			}
		}
		return errors;
	}

	return typeof field === 'object' ? [JSON.stringify(field)] : [];
}

export function getValidationErrorMessage(
	question: Question,
	answers: Answers,
	selectedLoan: string,
	applicantsStore: any,
	gstStateError: Writable<string>
): string | null {
	const key = resolveBindsTo(question, answers, selectedLoan);

	let val;
	if (key === 'allApplicantDetails' || question.bindsTo_template === 'allApplicantDetails') {
		const applicants = answers['allApplicantDetails'] || applicantsStore;
		if (question.bindsTo && applicants && Array.isArray(applicants) && applicants.length > 0) {
			for (const applicant of applicants) {
				const applicantValue = applicant[question.bindsTo];
				if (applicantValue !== undefined && applicantValue !== null && applicantValue !== '') {
					val = applicantValue;
					break;
				}
			}
		} else {
			val = applicants;
		}
	} else {
		val = answers[key];
	}

	if (question.validation?.condition) {
		if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
			return null;
		}

		const errors = resolveDynamicError(question.validation.condition, answers);
		if (errors.length > 0) {
			return errors.join(' and' + '\n');
		}
	}

	if ((question.bindsTo === 'fullName' || question.bindsTo === 'directorName') && val) {
		const titleKey = `${question.id}_title`;
		const selectedTitle = answers[titleKey];

		if (!selectedTitle || selectedTitle.trim() === '') {
			return 'Please select a title before entering the name';
		}
	}

	if (
		(question.id === 'q_grossReceiptsArray' || question.bindsTo === 'grossReceiptsArray') &&
		val
	) {
		const numberArray = answers[resolveBindsTo(question, answers, selectedLoan)];
		if (Array.isArray(numberArray)) {
			const hasTooLow = numberArray.some((num) => Number(num) < 300000);
			const hasTooHigh = numberArray.some((num) => Number(num) > 999999999999);

			if (hasTooLow) return 'Gross receipt must be more than or equal to 3,00,000';
			if (hasTooHigh) return 'Gross receipt must be less than or equal to 9,99,99,99,99,999';
		}
	}

	if ((question.id === 'q_netProfit' || question.bindsTo === 'netProfit') && val) {
		const netProfitArray = answers[resolveBindsTo(question, answers, selectedLoan)];
		const grossReceiptArray = answers['grossReceiptsArray'];

		if (Array.isArray(netProfitArray)) {
			const hasTooLow = netProfitArray.some((num) => Number(num) < 1);
			const hasTooHigh = netProfitArray.some((num) => Number(num) > 999999999999);

			if (hasTooLow) return 'Net Profit must be more than 0';
			if (hasTooHigh) return 'Net Profit must be less than or equal to 9,99,99,99,99,999';

			if (Array.isArray(grossReceiptArray)) {
				const exceedsGrossReceipt = netProfitArray.some(
					(dep, idx) => Number(dep) > Number(grossReceiptArray[idx] || 0)
				);
				if (exceedsGrossReceipt) return 'Net Profit cannot be greater than Gross Receipt';
			}
		}
	}

	if ((question.id === 'q_depreciationArray' || question.bindsTo === 'depreciationArray') && val) {
		const depreciationArray = answers[resolveBindsTo(question, answers, selectedLoan)];
		const netProfitArray = answers['netProfit'];

		if (Array.isArray(depreciationArray)) {
			const hasTooLow = depreciationArray.some((num) => Number(num) < 1);
			const hasTooHigh = depreciationArray.some((num) => Number(num) > 999999999999);

			if (hasTooLow) return 'Depreciation must be more than 0';
			if (hasTooHigh) return 'Depreciation must be less than or equal to 9,99,99,99,99,999';

			if (Array.isArray(netProfitArray)) {
				const exceedsNetProfit = depreciationArray.some(
					(dep, idx) => Number(dep) > Number(netProfitArray[idx] || 0)
				);
				if (exceedsNetProfit) return 'Depreciation cannot be greater than Net Profit';
			}
		}
	}

	if (question.bindsTo === 'propertyStateName' || question.id === 'q1_propertyStateName') {
		const gstErr = getStore(gstStateError);
		if (gstErr) {
			return question.errorMessage?.stateNotServed ?? gstErr;
		}
	}

	return null;
}

// warnings
export function resolveDynamicWarning(field: any, answers: Answers): string[] {
	if (!field) return [];
	if (typeof field === 'string') return [field];

	if (Array.isArray(field)) {
		const warnings: string[] = [];
		for (const condition of field) {
			if (jsonLogic.apply(condition.case, answers)) {
				warnings.push(...resolveDynamicWarning(condition.then, answers));
			}
		}
		return warnings;
	}

	if (typeof field === 'object' && field.switch && Array.isArray(field.switch)) {
		const warnings: string[] = [];
		for (const condition of field.switch) {
			if (jsonLogic.apply(condition.case, answers)) {
				warnings.push(...resolveDynamicWarning(condition.then, answers));
			}
		}
		return warnings;
	}
	return typeof field === 'object' ? [JSON.stringify(field)] : [];
}

export function getWarningErrorMessage(question: Question, answers: Answers): string | null {
	const key = resolveBindsTo(question, answers, '');
	const val = answers[key];

	if (question.warning?.condition) {
		if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
			return null;
		}

		const warnings = resolveDynamicWarning(question.warning.condition, answers);
		if (warnings.length > 0) {
			return warnings.join(' and' + '\n');
		}
	}
	return null;
}
