/**
 * Rejection Tip Mapper — Maps form rejection reasons to offer page tips
 * ═══════════════════════════════════════════════════════════════════
 * When a DSA marks a case as "previously rejected" and selects reasons,
 * this module generates contextual prevention tips that appear on the
 * results/offer page alongside lender-specific suggestions.
 *
 * Maps form values (low_cibil, insufficient_income, etc.) to the
 * REJECTION_CATEGORIES from rejectionAnalyzer.ts for prevention tips.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ImprovementSuggestion } from '$lib/types/lenderResults';
import { REJECTION_CATEGORIES, type RejectionCategoryConfig } from '$lib/server/rejectionAnalyzer';

// ── Form value → Analyzer category mapping ──────────────────────
// Form values (from caseIntakeQuestions.ts) map to analyzer categories
const FORM_TO_ANALYZER: Record<string, string> = {
	low_cibil: 'cibil_score',
	insufficient_income: 'income_insufficient',
	property_issues: 'property_issues',
	incomplete_docs: 'documentation_issues',
	profile_mismatch: 'profile_mismatch',
	other: 'other'
};

// Build a lookup map from analyzer category value → config
const categoryLookup = new Map<string, RejectionCategoryConfig>();
for (const cat of REJECTION_CATEGORIES) {
	categoryLookup.set(cat.value, cat);
}

/**
 * Map form rejection reasons to improvement suggestions.
 * Returns suggestions compatible with the ImprovementSuggestion interface
 * used by ImprovementTips.svelte.
 *
 * @param rejectionReasons - Array of reason values from the form (e.g. ['low_cibil', 'insufficient_income'])
 * @returns Array of suggestions with contextual prevention tips
 */
export function mapRejectionReasonsToTips(rejectionReasons: string[]): ImprovementSuggestion[] {
	if (!rejectionReasons || rejectionReasons.length === 0) return [];

	const suggestions: ImprovementSuggestion[] = [];
	const seenIds = new Set<string>();

	for (const formReason of rejectionReasons) {
		const analyzerKey = FORM_TO_ANALYZER[formReason];
		if (!analyzerKey) continue;

		const category = categoryLookup.get(analyzerKey);
		if (!category) continue;

		// Take the top 2 prevention tips from this category
		const tips = category.prevention_tips.slice(0, 2);
		for (let tipIdx = 0; tipIdx < tips.length; tipIdx++) {
			const tip = tips[tipIdx];
			const id = `rejection-${formReason}-${tipIdx}`;
			if (seenIds.has(id)) continue;
			seenIds.add(id);

			suggestions.push({
				id,
				title: `Previous rejection: ${category.label}`,
				description: tip,
				effort: mapReasonToEffort(formReason)
			});
		}
	}

	return suggestions;
}

/** Map rejection reason to effort level for the UI badge */
function mapReasonToEffort(reason: string): 'easy' | 'moderate' | 'significant' {
	switch (reason) {
		case 'incomplete_docs':
			return 'easy'; // Documentation is the easiest to fix
		case 'profile_mismatch':
		case 'other':
			return 'moderate'; // May need different product/lender
		case 'low_cibil':
		case 'insufficient_income':
		case 'property_issues':
			return 'significant'; // Takes time or structural changes
		default:
			return 'moderate';
	}
}
