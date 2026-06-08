/**
 * Rejection Analyzer — Phase 4.6
 * ══════════════════════════════════════════════════════════════════
 * Pure-function module: analyzes rejection reasons and suggests
 * reroute options and prevention tips.
 * No database calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Case, LenderApplication } from '$lib/types/case.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RejectionAnalysis {
	case_id: string;
	lender_name: string;
	reason_category: string;
	reason_detail?: string;
	suggestions: RerouteSuggestion[];
	prevention_tips: string[];
}

export interface RerouteSuggestion {
	lender_name: string;
	reason: string;
	confidence: 'high' | 'medium' | 'low';
}

export interface RejectionCategoryConfig {
	value: string;
	label: string;
	prevention_tips: string[];
}

// ============================================================================
// REJECTION CATEGORIES
// ============================================================================

export const REJECTION_CATEGORIES: RejectionCategoryConfig[] = [
	{
		value: 'cibil_score',
		label: 'Low CIBIL Score',
		prevention_tips: [
			'Check CIBIL score before applying to avoid unnecessary hard inquiries',
			'Consider NBFC lenders that accept lower CIBIL scores (650+)',
			'Wait 3-6 months and work on improving score before reapplying',
			'Dispute any incorrect entries on the CIBIL report'
		]
	},
	{
		value: 'income_insufficient',
		label: 'Income Insufficient',
		prevention_tips: [
			'Add a co-applicant with additional income to improve eligibility',
			'Consider applying for a lower loan amount',
			'Try balance transfer lenders that may have lower income requirements',
			'Include all income sources (rental, business, freelance) in the application'
		]
	},
	{
		value: 'high_obligations',
		label: 'High Existing Obligations',
		prevention_tips: [
			'Close small existing loans before reapplying',
			'Consider balance transfer to consolidate obligations',
			'Consider a top-up loan on an existing facility instead',
			'Reduce credit card utilization below 30%'
		]
	},
	{
		value: 'property_issues',
		label: 'Property Related Issues',
		prevention_tips: [
			'Get an independent legal opinion on the property before applying',
			'Consider a different property that meets lender requirements',
			'Try LAP (Loan Against Property) specialist lenders',
			'Ensure all property documents are complete and clear'
		]
	},
	{
		value: 'documentation_issues',
		label: 'Incomplete/Incorrect Documents',
		prevention_tips: [
			'Complete all documentation before submitting to the next lender',
			'Re-verify all documents for accuracy and consistency',
			'Get fresh bank statements (not older than 30 days)',
			'Ensure ITR and Form 16 figures match the bank statements'
		]
	},
	{
		value: 'employer_not_approved',
		label: 'Employer Not on Approved List',
		prevention_tips: [
			'Try NBFC lenders that have broader employer approval lists',
			'Provide additional income proof such as ITR, Form 16, bonus letters',
			'Check if employer is on the approved list before applying',
			'Consider applying through a different product category'
		]
	},
	{
		value: 'age_criteria',
		label: 'Age Criteria Not Met',
		prevention_tips: [
			'Add a younger co-applicant to meet age criteria',
			'Reduce the loan tenure to fit within age limits',
			'Try lenders with higher maximum age limits',
			'Consider senior citizen specific products from NBFCs'
		]
	},
	{
		value: 'profile_mismatch',
		label: 'Profile Does Not Match Product',
		prevention_tips: [
			'Try a different loan product that better matches the profile',
			'Consider a different lender segment (NBFC vs bank)',
			'Review eligibility criteria before applying',
			'Consult with the lender RM about suitable products'
		]
	},
	{
		value: 'internal_policy',
		label: 'Internal Policy',
		prevention_tips: [
			'Try again after a 3-6 month cooling period',
			'Try applying through a different branch of the same lender',
			'Apply with a different lender that has different internal policies',
			'Check if the policy is region-specific and try another region'
		]
	},
	{
		value: 'other',
		label: 'Other Reasons',
		prevention_tips: [
			'Request detailed rejection reasons from the lender for future reference',
			'Review the application for any gaps before reapplying elsewhere',
			'Consider consulting a financial advisor',
			'Try with a different lender category (PSU bank, private bank, or NBFC)'
		]
	}
];

// ============================================================================
// LENDER SUGGESTION PROFILES
// ============================================================================

/**
 * Maps rejection categories to lender types (NBFC/GOV/PVT) and specific
 * lenders known to be more accommodating for that rejection reason.
 */
const CATEGORY_LENDER_PREFERENCES: Record<
	string,
	{
		preferred_classifications: string[];
		preferred_lender_keywords: string[];
		reason_template: string;
		confidence: 'high' | 'medium' | 'low';
	}
> = {
	cibil_score: {
		preferred_classifications: ['NBFC'],
		preferred_lender_keywords: [
			'bajaj',
			'poonawala',
			'iifl',
			'hdb',
			'piramal',
			'aadhar',
			'muthoot',
			'hero'
		],
		reason_template: 'NBFC lenders typically accept lower CIBIL scores',
		confidence: 'high'
	},
	income_insufficient: {
		preferred_classifications: ['NBFC', 'GOV'],
		preferred_lender_keywords: ['lic', 'pnb housing', 'aadhar', 'gic', 'indiabulls'],
		reason_template: 'May have lower income requirements or flexible assessment',
		confidence: 'medium'
	},
	high_obligations: {
		preferred_classifications: ['NBFC'],
		preferred_lender_keywords: ['bajaj', 'tata capital', 'l&t', 'aditya birla'],
		reason_template: 'Known for balance transfer and consolidation products',
		confidence: 'medium'
	},
	property_issues: {
		preferred_classifications: ['NBFC'],
		preferred_lender_keywords: ['lic', 'pnb housing', 'godrej', 'icici home', 'iifl'],
		reason_template: 'Specialist property finance lenders with broader acceptance',
		confidence: 'medium'
	},
	documentation_issues: {
		preferred_classifications: ['NBFC', 'PVT'],
		preferred_lender_keywords: ['hdfc', 'icici', 'axis'],
		reason_template: 'Resubmit with complete documentation to a different lender',
		confidence: 'low'
	},
	employer_not_approved: {
		preferred_classifications: ['NBFC'],
		preferred_lender_keywords: ['bajaj', 'poonawala', 'hdb', 'iifl', 'tata capital'],
		reason_template: 'NBFC lenders have broader employer approval lists',
		confidence: 'high'
	},
	age_criteria: {
		preferred_classifications: ['NBFC', 'GOV'],
		preferred_lender_keywords: ['lic', 'pnb housing', 'aadhar', 'muthoot'],
		reason_template: 'May have higher maximum age limits',
		confidence: 'medium'
	},
	profile_mismatch: {
		preferred_classifications: ['NBFC', 'PVT'],
		preferred_lender_keywords: ['bajaj', 'tata capital', 'aditya birla', 'l&t'],
		reason_template: 'Different product categories and profile requirements',
		confidence: 'low'
	},
	internal_policy: {
		preferred_classifications: ['PVT', 'NBFC'],
		preferred_lender_keywords: [],
		reason_template: 'Different internal policies may allow approval',
		confidence: 'low'
	},
	other: {
		preferred_classifications: ['NBFC', 'PVT', 'GOV'],
		preferred_lender_keywords: [],
		reason_template: 'Try with a different lender category',
		confidence: 'low'
	}
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Analyze a rejected lender application and produce reroute suggestions
 * and prevention tips.
 *
 * @param rejectedLenderApp - The rejected lender application object
 * @param caseDoc - The full case document
 * @param allLenderNames - Array of all available lender names (from bankData)
 * @param bankClassifications - Optional map of lender name → classification
 */
export function analyzeRejection(
	rejectedLenderApp: any,
	caseDoc: any,
	allLenderNames: string[],
	bankClassifications?: Record<string, string>
): RejectionAnalysis {
	const la = rejectedLenderApp as LenderApplication;
	const c = caseDoc as Case;

	const reasonCategory = la.rejection?.reason_category || 'other';
	const reasonDetail = la.rejection?.reason_detail;

	// Find the matching category config
	const categoryConfig =
		REJECTION_CATEGORIES.find((cat) => cat.value === reasonCategory) ||
		REJECTION_CATEGORIES.find((cat) => cat.value === 'other')!;

	// Get existing lender names in this case (to exclude from suggestions)
	const existingLenderNames = new Set(
		(c.lender_applications || []).map((app) => app.lender_name.toLowerCase())
	);

	// Build reroute suggestions
	const suggestions = buildRerouteSuggestions(
		reasonCategory,
		allLenderNames,
		existingLenderNames,
		bankClassifications
	);

	return {
		case_id: c.case_id,
		lender_name: la.lender_name,
		reason_category: reasonCategory,
		reason_detail: reasonDetail,
		suggestions,
		prevention_tips: categoryConfig.prevention_tips
	};
}

// ============================================================================
// REROUTE SUGGESTION BUILDER
// ============================================================================

function buildRerouteSuggestions(
	reasonCategory: string,
	allLenderNames: string[],
	existingLenderNames: Set<string>,
	bankClassifications?: Record<string, string>
): RerouteSuggestion[] {
	const prefs =
		CATEGORY_LENDER_PREFERENCES[reasonCategory] || CATEGORY_LENDER_PREFERENCES['other']!;

	// Filter out lenders already in the case
	const available = allLenderNames.filter((name) => !existingLenderNames.has(name.toLowerCase()));

	const scored: Array<{ name: string; score: number }> = [];

	for (const name of available) {
		let score = 0;
		const nameLower = name.toLowerCase();

		// Boost if lender matches preferred keywords
		for (const keyword of prefs.preferred_lender_keywords) {
			if (nameLower.includes(keyword.toLowerCase())) {
				score += 10;
				break;
			}
		}

		// Boost if lender matches preferred classification
		if (bankClassifications) {
			const classification = bankClassifications[name];
			if (classification && prefs.preferred_classifications.includes(classification)) {
				score += 5;
			}
		}

		scored.push({ name, score });
	}

	// Sort by score descending, take top 3
	scored.sort((a, b) => b.score - a.score);
	const top = scored.slice(0, 3);

	return top.map((entry) => {
		let confidence = prefs.confidence;
		// Downgrade confidence if no keyword match
		if (entry.score < 10 && confidence === 'high') {
			confidence = 'medium';
		}
		if (entry.score === 0 && confidence === 'medium') {
			confidence = 'low';
		}

		return {
			lender_name: entry.name,
			reason: prefs.reason_template,
			confidence
		};
	});
}
