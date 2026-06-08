/**
 * Auto-Match Engine (6.12) — DSA <-> RM Matching
 * ══════════════════════════════════════════════════════════════════
 * Pure function module. No DB calls.
 * Receives DSA profile + RM candidates, returns scored suggestions.
 *
 * Scoring:
 * - Same city: +30
 * - Same lender: +40
 * - Preferred DSA: +20
 * - High reputation (score >= 70): +10
 * ══════════════════════════════════════════════════════════════════
 */

import type { AutoMatchSuggestion } from '$lib/types/rmPortal.js';
import type { ObjectId } from 'mongodb';

export interface DSAProfile {
	city?: string;
	lender_names: string[]; // from case lender_applications
}

export interface RMCandidate {
	_id: ObjectId;
	name: string;
	bankName: string; // RM's lender
	workingCity?: string;
	city?: string;
	preferred_dsa_ids?: ObjectId[];
	reputation_score?: number; // 0-100 if computed
}

export function computeAutoMatch(
	dsaProfile: DSAProfile,
	dsaId: string,
	rmCandidates: RMCandidate[]
): AutoMatchSuggestion[] {
	const suggestions: AutoMatchSuggestion[] = [];

	for (const rm of rmCandidates) {
		let score = 0;
		const reasons: string[] = [];

		// Same city (+30)
		const rmCity = (rm.workingCity || rm.city || '').toLowerCase().trim();
		const dsaCity = (dsaProfile.city || '').toLowerCase().trim();
		if (rmCity && dsaCity && rmCity === dsaCity) {
			score += 30;
			reasons.push('Same city');
		}

		// Same lender (+40)
		const rmLender = (rm.bankName || '').toLowerCase().trim();
		const dsaLenders = dsaProfile.lender_names.map((l) => l.toLowerCase().trim());
		if (rmLender && dsaLenders.includes(rmLender)) {
			score += 40;
			reasons.push('Same lender');
		}

		// Preferred DSA (+20)
		if (rm.preferred_dsa_ids?.some((id) => id.toString() === dsaId)) {
			score += 20;
			reasons.push('Preferred by RM');
		}

		// High reputation (+10)
		if (rm.reputation_score && rm.reputation_score >= 70) {
			score += 10;
			reasons.push('High reputation');
		}

		if (score > 0) {
			suggestions.push({
				rm_id: rm._id,
				rm_name: rm.name || '',
				lender_name: rm.bankName || '',
				city: rm.workingCity || rm.city,
				score,
				reasons
			});
		}
	}

	// Sort by score descending, return top 3
	suggestions.sort((a, b) => b.score - a.score);
	return suggestions.slice(0, 3);
}
