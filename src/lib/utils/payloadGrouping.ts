/**
 * Schema-Driven Payload Grouping
 * ═══════════════════════════════════════════════════════════════════
 * Groups form answers by schema page ID into logical sections.
 * Supports config override for custom group names per loan type.
 *
 * Usage:
 *   groupAnswersBySchema(schema, allAnswers)
 *   → { property: { state, city, ... }, loanRequirements: { amount, tenure, ... } }
 *
 *   buildCleanAnswers(schema, allAnswers)
 *   → flat Record with only visible question answers
 * ═══════════════════════════════════════════════════════════════════
 */

import jsonLogic from 'json-logic-js';
import { isQuestionVisible } from '$lib/form/homeLoan/visibility';
import type { Schema, Question, Answers } from '$lib/types/formTypes';

// ── Default Page ID → Group Name Mapping ────────────────────────────
// Maps schema page IDs to logical payload group names.
// Can be overridden per-loan-type via the overrides parameter.

const DEFAULT_PAGE_GROUPS: Record<string, string> = {
	// Selection / eligibility pages
	selection_homeLoan: 'selection', // V1 compat
	caseIntake_homeLoan: 'selection', // V2
	collateral_free_selectionPage: 'selection',
	propertyIdentification: 'selection',
	creditHistoryPage: 'selection',
	propertyIdentificationPage: 'selection',

	// Property location & technical details
	property_location_homeLoan: 'property', // V1 compat
	propertyLocation_homeLoan: 'property', // V2
	propertyTechnical_homeLoan: 'property', // V1 compat
	propertyCharacter_homeLoan: 'property', // V2
	propertyCondition_homeLoan: 'property', // V2
	propertyTechnical_LAP: 'property', // V1 compat
	propertyLocation_LAP: 'property', // V2
	propertyCharacter_LAP: 'property',
	propertyCondition_LAP: 'property',
	propertyLocation_Plot: 'property', // Plot loan
	propertyCharacter_Plot: 'property',
	constructionDetails_Plot: 'property',
	propertyCondition_Plot: 'property',

	// BT registry & possession (V2)
	btRegistry_homeLoan: 'btRegistry',

	// Seller & transaction details (V2)
	sellerTransaction_homeLoan: 'propertyLegal',

	// Property legal / seller
	propertyLegal_homeLoan: 'propertyLegal', // V1 compat
	legalVerification_homeLoan: 'propertyLegal', // V2
	propertyLegal_LAP: 'propertyLegal',
	propertyLegal_Plot: 'propertyLegal',
	sellerInformation: 'propertyLegal',

	// Property financial / deal financials
	propertyFinancial_homeLoan: 'propertyFinancial', // V1 compat
	dealFinancials_homeLoan: 'propertyFinancial', // V2

	// Balance transfer / existing loan
	existingLoanInfo_homeLoan: 'balanceTransfer', // V1 compat
	btExistingLoan_homeLoan: 'balanceTransfer', // V2
	existingDetailsPage: 'balanceTransfer',
	topUpDetailsPage: 'balanceTransfer',

	// Loan requirements
	loanRequirements_homeLoan: 'loanRequirements',
	loanRequirementPage: 'loanRequirements',
	sanctionProfile_homeLoan: 'loanRequirements',

	// Location (unsecured loans)
	locationPage: 'location',

	// Unsecured loan domain profile pages
	businessProfilePage: 'businessProfile',
	professionalProfilePage: 'professionalProfile',

	// Final verification (V1 compat — merged into dealFinancials in V2)
	finalVerification_homeLoan: 'verification'
};

// Pages handled as per-applicant data (income, credit, obligations)
const APPLICANT_PAGES = new Set([
	'incomeProfilesPage',
	'incomeDetailsPage',
	'creditScorePage',
	'obligationsPage'
]);

// Placeholder pages (0 questions, rendered as custom components)
const PLACEHOLDER_PAGES = new Set([
	'tellUs_homeLoan',
	'tellUsApplyingPage',
	'basicInfoPage',
	'applicantPage'
]);

// ── Page Visibility Check ───────────────────────────────────────────

function isPageVisible(page: { showWhen?: unknown }, answers: Record<string, unknown>): boolean {
	if (!page.showWhen) return true;
	try {
		return Boolean(
			jsonLogic.apply(page.showWhen as Parameters<typeof jsonLogic.apply>[0], answers)
		);
	} catch {
		return true; // Default to visible on error
	}
}

// ── Answer Key Resolution ───────────────────────────────────────────
// Determines the storage key for a question's answer.

function getAnswerKey(question: Question): string {
	return question.bindsTo ?? question.contextKey ?? question.id;
}

// ── Build Clean Answers ─────────────────────────────────────────────
// Filters raw answers to only include keys for VISIBLE questions.
// This is the "Clean Payload" — no stale/hidden answers.

export function buildCleanAnswers(
	schema: Schema,
	allAnswers: Record<string, unknown>
): Record<string, unknown> {
	const clean: Record<string, unknown> = {};

	for (const page of schema.pages) {
		const pageId = page.id ?? '';

		// Skip applicant-specific and placeholder pages
		if (APPLICANT_PAGES.has(pageId) || PLACEHOLDER_PAGES.has(pageId)) continue;

		// Skip pages that are hidden (page-level showWhen)
		if (!isPageVisible(page, allAnswers)) continue;

		if (!Array.isArray(page.questions)) continue;

		for (const question of page.questions) {
			if (!isQuestionVisible(question, allAnswers as Answers)) continue;

			const key = getAnswerKey(question);
			if (key in allAnswers && allAnswers[key] !== undefined) {
				clean[key] = allAnswers[key];
			}
		}
	}

	return clean;
}

// ── Group Answers by Schema ─────────────────────────────────────────
// Groups visible answers into logical sections based on page ID mapping.

export function groupAnswersBySchema(
	schema: Schema,
	allAnswers: Record<string, unknown>,
	overrides?: Record<string, string>
): Record<string, Record<string, unknown>> {
	const groups: Record<string, Record<string, unknown>> = {};
	const groupMapping = overrides ? { ...DEFAULT_PAGE_GROUPS, ...overrides } : DEFAULT_PAGE_GROUPS;

	for (const page of schema.pages) {
		const pageId = page.id ?? '';

		// Skip applicant-specific and placeholder pages
		if (APPLICANT_PAGES.has(pageId) || PLACEHOLDER_PAGES.has(pageId)) continue;

		// Skip pages that are hidden
		if (!isPageVisible(page, allAnswers)) continue;

		// Determine group name for this page
		const groupName = groupMapping[pageId];
		if (!groupName) continue; // Unknown page — skip

		if (!Array.isArray(page.questions)) continue;

		for (const question of page.questions) {
			if (!isQuestionVisible(question, allAnswers as Answers)) continue;

			const key = getAnswerKey(question);
			if (key in allAnswers && allAnswers[key] !== undefined) {
				if (!groups[groupName]) groups[groupName] = {};
				groups[groupName][key] = allAnswers[key];
			}
		}
	}

	return groups;
}
