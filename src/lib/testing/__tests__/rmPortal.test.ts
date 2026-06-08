/**
 * RM Portal — Phase 6 Batch 1 Tests
 *
 * Validates: rmPortal type shapes, disclaimer acceptance logic,
 * disclaimer registry helpers, rating categories, reputation rating scale.
 *
 * @see Phase 6 in DEVELOPMENT-PLAN.md
 */

import { describe, it, expect } from 'vitest';
import type { ObjectId } from 'mongodb';
import type {
	RatingCategory,
	AccuracyRating,
	RMBroadcast,
	PolicyDocument,
	ReputationRating,
	RMReputationScore,
	AutoMatchSuggestion,
	PolicyFeedbackAggregate
} from '$lib/types/rmPortal';
import {
	DISCLAIMER_REGISTRY,
	getDisclaimer,
	getDisclaimersByPlacement,
	getServerEnforcedDisclaimers,
	needsReAcceptance,
	type DisclaimerConfig,
	type DisclaimerAcceptance
} from '$lib/types/disclaimer';
import { computeAutoMatch, type DSAProfile, type RMCandidate } from '$lib/server/autoMatch';
import {
	computePolicyFeedback,
	type RatingInput as PolicyRatingInput
} from '$lib/server/policyFeedback';
import {
	computeReputation,
	type ThreadInput,
	type CaseInput,
	type RatingInput as ReputationRatingInput
} from '$lib/server/rmReputation';
import { injectDisclaimerFooter, getFooterText } from '$lib/server/disclaimerFooter';

// ═══════════════════════════════════════════════════════════════
// Helpers — reusable fixtures
// ═══════════════════════════════════════════════════════════════

const FAKE_OID = '507f1f77bcf86cd799439011' as unknown as ObjectId;
const NOW = new Date('2026-02-14T12:00:00Z');

function makeAccuracyRating(overrides: Partial<AccuracyRating> = {}): AccuracyRating {
	return {
		case_id: 'HL-2026-0001',
		rm_id: FAKE_OID,
		lender_app_id: 'la-001',
		lender_name: 'HDFC Bank',
		rating: 4,
		category: 'income_estimation',
		disclaimer_accepted: true,
		created_at: NOW,
		...overrides
	};
}

function makeBroadcast(overrides: Partial<RMBroadcast> = {}): RMBroadcast {
	return {
		rm_id: FAKE_OID,
		rm_name: 'Vijay Kumar',
		lender_name: 'HDFC Bank',
		title: 'Rate Change Update',
		body: 'Home loan rates revised from 8.5% to 8.35%',
		footer: 'This communication is from an RM and does not represent official lender policy.',
		target_dsa_ids: [FAKE_OID],
		read_by: [],
		created_at: NOW,
		...overrides
	};
}

function makePolicyDocument(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
	return {
		rm_id: FAKE_OID,
		lender_name: 'HDFC Bank',
		title: 'Income Assessment Guidelines 2026',
		file_url: 'https://ik.imagekit.io/test/policy.pdf',
		file_id: 'ik-file-001',
		version: 1,
		notified_dsa_ids: [],
		created_at: NOW,
		...overrides
	};
}

function makeReputationScore(overrides: Partial<RMReputationScore> = {}): RMReputationScore {
	return {
		overall_score: 82,
		response_time_avg_hours: 4.5,
		query_resolution_rate: 0.92,
		accuracy_rating_avg: 4.1,
		dsa_satisfaction_avg: 4.3,
		case_count: 45,
		rating: 'excellent',
		...overrides
	};
}

function makeAutoMatch(overrides: Partial<AutoMatchSuggestion> = {}): AutoMatchSuggestion {
	return {
		rm_id: FAKE_OID,
		rm_name: 'Vijay Kumar',
		lender_name: 'HDFC Bank',
		score: 87,
		reasons: ['Same city', 'Same lender', 'High reputation'],
		...overrides
	};
}

function makePolicyFeedback(
	overrides: Partial<PolicyFeedbackAggregate> = {}
): PolicyFeedbackAggregate {
	return {
		category: 'income_estimation',
		lender_name: 'HDFC Bank',
		avg_rating: 3.8,
		count: 12,
		trend: 'up',
		...overrides
	};
}

// ═══════════════════════════════════════════════════════════════
// AccuracyRating type shape
// ═══════════════════════════════════════════════════════════════

describe('AccuracyRating — type shape', () => {
	it('constructs a valid AccuracyRating with all required fields', () => {
		const rating = makeAccuracyRating();
		expect(rating.case_id).toBe('HL-2026-0001');
		expect(rating.rm_id).toBe(FAKE_OID);
		expect(rating.lender_app_id).toBe('la-001');
		expect(rating.lender_name).toBe('HDFC Bank');
		expect(rating.rating).toBe(4);
		expect(rating.category).toBe('income_estimation');
		expect(rating.disclaimer_accepted).toBe(true);
		expect(rating.created_at).toBeInstanceOf(Date);
	});

	it('accepts rating values in 1-5 range', () => {
		for (const r of [1, 2, 3, 4, 5]) {
			const rating = makeAccuracyRating({ rating: r });
			expect(rating.rating).toBe(r);
		}
	});

});

// ═══════════════════════════════════════════════════════════════
// RatingCategory — 5 distinct categories
// ═══════════════════════════════════════════════════════════════

describe('RatingCategory — validation', () => {
	const ALL_CATEGORIES: RatingCategory[] = [
		'income_estimation',
		'property_valuation',
		'eligibility_check',
		'documentation',
		'overall'
	];

	it('has exactly 5 distinct categories', () => {
		const unique = new Set(ALL_CATEGORIES);
		expect(unique.size).toBe(5);
	});

	it('property_valuation is a valid category on AccuracyRating', () => {
		const rating = makeAccuracyRating({ category: 'property_valuation' });
		expect(rating.category).toBe('property_valuation');
	});

	it('documentation is a valid category on AccuracyRating', () => {
		const rating = makeAccuracyRating({ category: 'documentation' });
		expect(rating.category).toBe('documentation');
	});

	it('overall is a valid category on AccuracyRating', () => {
		const rating = makeAccuracyRating({ category: 'overall' });
		expect(rating.category).toBe('overall');
	});

});

// ═══════════════════════════════════════════════════════════════
// ReputationRating — 4 distinct tiers
// ═══════════════════════════════════════════════════════════════

describe('ReputationRating — 4 rating tiers', () => {
	const ALL_TIERS: ReputationRating[] = ['excellent', 'good', 'average', 'needs_improvement'];

	it('tiers use snake_case format', () => {
		for (const tier of ALL_TIERS) {
			expect(tier).toMatch(/^[a-z_]+$/);
		}
	});

	it('good is assignable to RMReputationScore.rating', () => {
		const score = makeReputationScore({ rating: 'good' });
		expect(score.rating).toBe('good');
	});

	it('average is assignable to RMReputationScore.rating', () => {
		const score = makeReputationScore({ rating: 'average' });
		expect(score.rating).toBe('average');
	});

	it('needs_improvement is assignable to RMReputationScore.rating', () => {
		const score = makeReputationScore({ rating: 'needs_improvement' });
		expect(score.rating).toBe('needs_improvement');
	});
});

// ═══════════════════════════════════════════════════════════════
// needsReAcceptance() — disclaimer acceptance logic
// ═══════════════════════════════════════════════════════════════

describe('needsReAcceptance() — disclaimer acceptance logic', () => {
	it('returns true when no previous acceptance (undefined version)', () => {
		expect(needsReAcceptance('rm_onboarding_v1', undefined)).toBe(true);
	});

	it('returns true when version is outdated (accepted version < current)', () => {
		// Current version is 1, accepted version is 0 => needs re-acceptance
		expect(needsReAcceptance('rm_onboarding_v1', 0)).toBe(true);
	});

	it('returns false when version matches current', () => {
		// rm_onboarding_v1 has version 1
		expect(needsReAcceptance('rm_onboarding_v1', 1)).toBe(false);
	});

	it('returns false when accepted version exceeds current (future-proof)', () => {
		// If somehow user accepted v2 but current is v1, no re-acceptance needed
		expect(needsReAcceptance('rm_onboarding_v1', 2)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (per_rating_v1)', () => {
		expect(needsReAcceptance('per_rating_v1', undefined)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (broadcast_footer_v1)', () => {
		expect(needsReAcceptance('broadcast_footer_v1', undefined)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (rm_content_tag_v1)', () => {
		expect(needsReAcceptance('rm_content_tag_v1', undefined)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (eligibility_result_v1)', () => {
		expect(needsReAcceptance('eligibility_result_v1', undefined)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (pdf_review_footer_v1)', () => {
		expect(needsReAcceptance('pdf_review_footer_v1', undefined)).toBe(false);
	});

	it('returns false for disclaimers that do not require acceptance (pdf_submission_footer_v1)', () => {
		expect(needsReAcceptance('pdf_submission_footer_v1', undefined)).toBe(false);
	});

	it('returns false for non-existent disclaimer ID', () => {
		expect(needsReAcceptance('nonexistent', undefined)).toBe(false);
	});

	it('returns false for empty string disclaimer ID', () => {
		expect(needsReAcceptance('', undefined)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// getDisclaimer() — registry lookup
// ═══════════════════════════════════════════════════════════════

describe('getDisclaimer() — registry lookup', () => {
	it('returns correct config for rm_onboarding_v1', () => {
		const d = getDisclaimer('rm_onboarding_v1');
		expect(d).toBeDefined();
		expect(d!.id).toBe('rm_onboarding_v1');
		expect(d!.version).toBe(1);
		expect(d!.placement).toBe('onboarding');
		expect(d!.requires_acceptance).toBe(true);
		expect(d!.server_enforced).toBe(false);
	});

	it('returns correct config for broadcast_footer_v1', () => {
		const d = getDisclaimer('broadcast_footer_v1');
		expect(d).toBeDefined();
		expect(d!.placement).toBe('footer');
		expect(d!.server_enforced).toBe(true);
	});

	it('returns undefined for nonexistent ID', () => {
		expect(getDisclaimer('nonexistent')).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(getDisclaimer('')).toBeUndefined();
	});
});

// ═══════════════════════════════════════════════════════════════
// getDisclaimersByPlacement() — placement filtering
// ═══════════════════════════════════════════════════════════════

describe('getDisclaimersByPlacement() — placement filtering', () => {
	it('returns broadcast_footer_v1 for footer placement', () => {
		const footers = getDisclaimersByPlacement('footer');
		expect(footers).toHaveLength(1);
		expect(footers[0].id).toBe('broadcast_footer_v1');
	});

	it('returns 2 items for pdf placement', () => {
		const pdfs = getDisclaimersByPlacement('pdf');
		expect(pdfs).toHaveLength(2);
		const ids = pdfs.map((d) => d.id);
		expect(ids).toContain('pdf_review_footer_v1');
		expect(ids).toContain('pdf_submission_footer_v1');
	});

	it('returns 1 item for onboarding placement', () => {
		const onboarding = getDisclaimersByPlacement('onboarding');
		expect(onboarding).toHaveLength(1);
		expect(onboarding[0].id).toBe('rm_onboarding_v1');
	});

	it('returns 1 item for inline placement', () => {
		const inline = getDisclaimersByPlacement('inline');
		expect(inline).toHaveLength(1);
		expect(inline[0].id).toBe('per_rating_v1');
	});

	it('returns 1 item for tag placement', () => {
		const tags = getDisclaimersByPlacement('tag');
		expect(tags).toHaveLength(1);
		expect(tags[0].id).toBe('rm_content_tag_v1');
	});

	it('returns 1 item for persistent placement', () => {
		const persistent = getDisclaimersByPlacement('persistent');
		expect(persistent).toHaveLength(1);
		expect(persistent[0].id).toBe('eligibility_result_v1');
	});

	it('returns empty array for tos placement (not yet added)', () => {
		const tos = getDisclaimersByPlacement('tos');
		expect(tos).toHaveLength(0);
	});
});

// ═══════════════════════════════════════════════════════════════
// getServerEnforcedDisclaimers() — server enforcement
// ═══════════════════════════════════════════════════════════════

describe('getServerEnforcedDisclaimers() — server enforcement', () => {
	it('returns exactly 3 server-enforced disclaimers', () => {
		const enforced = getServerEnforcedDisclaimers();
		expect(enforced).toHaveLength(3);
	});

	it('includes broadcast_footer_v1', () => {
		const ids = getServerEnforcedDisclaimers().map((d) => d.id);
		expect(ids).toContain('broadcast_footer_v1');
	});

	it('includes pdf_review_footer_v1', () => {
		const ids = getServerEnforcedDisclaimers().map((d) => d.id);
		expect(ids).toContain('pdf_review_footer_v1');
	});

	it('includes pdf_submission_footer_v1', () => {
		const ids = getServerEnforcedDisclaimers().map((d) => d.id);
		expect(ids).toContain('pdf_submission_footer_v1');
	});

	it('does not include rm_onboarding_v1 (not server-enforced)', () => {
		const ids = getServerEnforcedDisclaimers().map((d) => d.id);
		expect(ids).not.toContain('rm_onboarding_v1');
	});

	it('all returned disclaimers have server_enforced === true', () => {
		const enforced = getServerEnforcedDisclaimers();
		for (const d of enforced) {
			expect(d.server_enforced).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// computeAutoMatch() — auto-matching engine
// ═══════════════════════════════════════════════════════════════

describe('computeAutoMatch() — scoring engine', () => {
	const FAKE_RM_OID = '507f1f77bcf86cd799439012' as unknown as ObjectId;
	const FAKE_DSA_ID = '507f1f77bcf86cd799439013';

	function makeRM(overrides: Partial<RMCandidate> = {}): RMCandidate {
		return {
			_id: FAKE_RM_OID,
			name: 'Vijay Kumar',
			bankName: 'HDFC Bank',
			workingCity: 'Mumbai',
			...overrides
		};
	}

	const defaultDSA: DSAProfile = {
		city: 'Mumbai',
		lender_names: ['HDFC Bank', 'ICICI Bank']
	};

	it('returns empty array when no candidates', () => {
		expect(computeAutoMatch(defaultDSA, FAKE_DSA_ID, [])).toEqual([]);
	});

	it('returns empty array when no criteria match', () => {
		const rm = makeRM({ bankName: 'Kotak Bank', workingCity: 'Delhi' });
		expect(computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm])).toEqual([]);
	});

	it('awards +30 for same city match', () => {
		const rm = makeRM({ bankName: 'Axis Bank', workingCity: 'Mumbai' });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result).toHaveLength(1);
		expect(result[0].score).toBe(30);
		expect(result[0].reasons).toContain('Same city');
	});

	it('awards +40 for same lender match', () => {
		const rm = makeRM({ bankName: 'HDFC Bank', workingCity: 'Delhi' });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result).toHaveLength(1);
		expect(result[0].score).toBe(40);
		expect(result[0].reasons).toContain('Same lender');
	});

	it('awards +70 for same city + same lender', () => {
		const rm = makeRM({ bankName: 'HDFC Bank', workingCity: 'Mumbai' });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(70);
		expect(result[0].reasons).toContain('Same city');
		expect(result[0].reasons).toContain('Same lender');
	});

	it('awards +20 for preferred DSA', () => {
		const dsaOid = FAKE_DSA_ID;
		const rm = makeRM({
			bankName: 'Axis Bank',
			workingCity: 'Delhi',
			preferred_dsa_ids: [dsaOid as unknown as ObjectId]
		});
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(20);
		expect(result[0].reasons).toContain('Preferred by RM');
	});

	it('awards +10 for high reputation (score >= 70)', () => {
		const rm = makeRM({ bankName: 'Axis Bank', workingCity: 'Delhi', reputation_score: 85 });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(10);
		expect(result[0].reasons).toContain('High reputation');
	});

	it('does NOT award reputation for score < 70', () => {
		const rm = makeRM({ bankName: 'Axis Bank', workingCity: 'Delhi', reputation_score: 60 });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result).toHaveLength(0);
	});

	it('returns maximum 3 results sorted by score', () => {
		const rms = [
			makeRM({
				_id: '111111111111111111111111' as any,
				bankName: 'HDFC Bank',
				workingCity: 'Mumbai',
				name: 'RM1'
			}), // 70
			makeRM({
				_id: '222222222222222222222222' as any,
				bankName: 'ICICI Bank',
				workingCity: 'Mumbai',
				name: 'RM2'
			}), // 70
			makeRM({
				_id: '333333333333333333333333' as any,
				bankName: 'Axis Bank',
				workingCity: 'Mumbai',
				name: 'RM3'
			}), // 30
			makeRM({
				_id: '444444444444444444444444' as any,
				bankName: 'Kotak Bank',
				workingCity: 'Delhi',
				name: 'RM4'
			}) // 0
		];
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, rms);
		expect(result).toHaveLength(3);
		expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
		expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
	});

	it('city matching is case-insensitive', () => {
		const rm = makeRM({ bankName: 'Axis Bank', workingCity: 'MUMBAI' });
		const dsa: DSAProfile = { city: 'mumbai', lender_names: [] };
		const result = computeAutoMatch(dsa, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(30);
	});

	it('lender matching is case-insensitive', () => {
		const rm = makeRM({ bankName: 'hdfc bank', workingCity: 'Delhi' });
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(40);
	});

	it('handles missing city gracefully', () => {
		const rm = makeRM({ bankName: 'Axis Bank', workingCity: undefined, city: undefined });
		const dsa: DSAProfile = { city: undefined, lender_names: [] };
		const result = computeAutoMatch(dsa, FAKE_DSA_ID, [rm]);
		expect(result).toHaveLength(0);
	});

	it('max possible score is 100 (30+40+20+10)', () => {
		const rm = makeRM({
			bankName: 'HDFC Bank',
			workingCity: 'Mumbai',
			preferred_dsa_ids: [FAKE_DSA_ID as unknown as ObjectId],
			reputation_score: 90
		});
		const result = computeAutoMatch(defaultDSA, FAKE_DSA_ID, [rm]);
		expect(result[0].score).toBe(100);
		expect(result[0].reasons).toHaveLength(4);
	});
});

// ═══════════════════════════════════════════════════════════════
// computePolicyFeedback() — aggregation engine
// ═══════════════════════════════════════════════════════════════

describe('computePolicyFeedback() — aggregation engine', () => {
	// Use the RatingInput type from policyFeedback (aliased to avoid collision)
	function makeRating(overrides: Partial<PolicyRatingInput> = {}): PolicyRatingInput {
		return {
			category: 'income_estimation',
			lender_name: 'HDFC Bank',
			rating: 4,
			created_at: new Date('2026-02-10'),
			...overrides
		};
	}

	it('returns empty array for no ratings', () => {
		expect(computePolicyFeedback([])).toEqual([]);
	});

	it('returns single aggregate for single rating', () => {
		const result = computePolicyFeedback([makeRating()]);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe('income_estimation');
		expect(result[0].lender_name).toBe('HDFC Bank');
		expect(result[0].avg_rating).toBe(4);
		expect(result[0].count).toBe(1);
	});

	it('computes correct average for multiple ratings same category+lender', () => {
		const ratings = [
			makeRating({ rating: 3 }),
			makeRating({ rating: 5 }),
			makeRating({ rating: 4 })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].avg_rating).toBe(4);
		expect(result[0].count).toBe(3);
	});

	it('groups by category AND lender', () => {
		const ratings = [
			makeRating({ category: 'income_estimation', lender_name: 'HDFC Bank' }),
			makeRating({ category: 'income_estimation', lender_name: 'ICICI Bank' }),
			makeRating({ category: 'property_valuation', lender_name: 'HDFC Bank' })
		];
		const result = computePolicyFeedback(ratings);
		expect(result).toHaveLength(3);
	});

	it('trend is stable for < 4 ratings', () => {
		const ratings = [makeRating({ rating: 2 }), makeRating({ rating: 5 })];
		const result = computePolicyFeedback(ratings);
		expect(result[0].trend).toBe('stable');
	});

	it('trend is up when second half > first half by > 0.3', () => {
		const ratings = [
			makeRating({ rating: 2 }),
			makeRating({ rating: 2 }),
			makeRating({ rating: 4 }),
			makeRating({ rating: 5 })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].trend).toBe('up');
	});

	it('trend is down when first half > second half by > 0.3', () => {
		const ratings = [
			makeRating({ rating: 5 }),
			makeRating({ rating: 5 }),
			makeRating({ rating: 2 }),
			makeRating({ rating: 2 })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].trend).toBe('down');
	});

	it('trend is stable when difference <= 0.3', () => {
		const ratings = [
			makeRating({ rating: 4 }),
			makeRating({ rating: 4 }),
			makeRating({ rating: 4 }),
			makeRating({ rating: 4 })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].trend).toBe('stable');
	});

	it('sorts results by count descending', () => {
		const ratings = [
			makeRating({ category: 'income_estimation' }),
			makeRating({ category: 'income_estimation' }),
			makeRating({ category: 'income_estimation' }),
			makeRating({ category: 'property_valuation' })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].category).toBe('income_estimation');
		expect(result[0].count).toBe(3);
		expect(result[1].category).toBe('property_valuation');
		expect(result[1].count).toBe(1);
	});

	it('rounds avg_rating to 1 decimal place', () => {
		const ratings = [
			makeRating({ rating: 3 }),
			makeRating({ rating: 4 }),
			makeRating({ rating: 4 })
		];
		const result = computePolicyFeedback(ratings);
		expect(result[0].avg_rating).toBe(3.7); // 11/3 = 3.666... -> 3.7
	});
});

// ═══════════════════════════════════════════════════════════════
// computeReputation() — reputation scoring engine
// ═══════════════════════════════════════════════════════════════

describe('computeReputation() — reputation scoring engine', () => {
	function makeThread(msgs: Array<{ sender_role: 'dsa' | 'rm'; hoursAgo: number }>): ThreadInput {
		return {
			messages: msgs.map((m) => ({
				sender_role: m.sender_role,
				created_at: new Date(Date.now() - m.hoursAgo * 60 * 60 * 1000)
			})),
			updated_at: new Date()
		};
	}

	function makeCase(queries: Array<{ status: string; hasResponse: boolean }>): CaseInput {
		return {
			lender_applications: [
				{
					queries: queries.map((q) => ({
						status: q.status,
						raised_at: new Date(),
						...(q.hasResponse ? { response: { responded_at: new Date() } } : {})
					}))
				}
			]
		};
	}

	it('returns zero scores for no data', () => {
		const result = computeReputation([], [], []);
		expect(result.overall_score).toBe(0);
		expect(result.response_time_avg_hours).toBe(0);
		expect(result.query_resolution_rate).toBe(0);
		expect(result.accuracy_rating_avg).toBe(0);
		expect(result.dsa_satisfaction_avg).toBe(0);
		expect(result.case_count).toBe(0);
		expect(result.rating).toBe('needs_improvement');
	});

	it('computes response time from DSA->RM message pairs', () => {
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 10 },
			{ sender_role: 'rm', hoursAgo: 6 } // 4 hours response
		]);
		const result = computeReputation([thread], [], []);
		expect(result.response_time_avg_hours).toBe(4);
	});

	it('ignores response times > 7 days', () => {
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 200 }, // > 7 days ago
			{ sender_role: 'rm', hoursAgo: 1 } // response way too late
		]);
		const result = computeReputation([thread], [], []);
		expect(result.response_time_avg_hours).toBe(0); // filtered out
	});

	it('computes query resolution rate correctly', () => {
		const case1 = makeCase([
			{ status: 'resolved', hasResponse: false },
			{ status: 'open', hasResponse: false },
			{ status: 'open', hasResponse: true } // responded = resolved
		]);
		const result = computeReputation([], [case1], []);
		expect(result.query_resolution_rate).toBeCloseTo(0.67, 1);
	});

	it('computes accuracy rating average', () => {
		const ratings = [{ rating: 4 }, { rating: 5 }, { rating: 3 }];
		const result = computeReputation([], [], ratings);
		expect(result.accuracy_rating_avg).toBe(4);
	});

	it('assigns excellent rating for score >= 80', () => {
		// Fast response + high accuracy = high score
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 5 },
			{ sender_role: 'rm', hoursAgo: 4 } // 1h response
		]);
		const ratings = [{ rating: 5 }, { rating: 5 }, { rating: 4 }];
		const result = computeReputation([thread], [], ratings);
		expect(result.rating).toBe('excellent');
	});

	it('assigns needs_improvement for low activity', () => {
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 100 },
			{ sender_role: 'rm', hoursAgo: 52 } // 48h response
		]);
		const ratings = [{ rating: 1 }];
		const result = computeReputation([thread], [], ratings);
		expect(['needs_improvement', 'average']).toContain(result.rating);
	});

	it('dsa_satisfaction scales with message count', () => {
		// 6 messages = satisfaction 4
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 10 },
			{ sender_role: 'rm', hoursAgo: 9 },
			{ sender_role: 'dsa', hoursAgo: 8 },
			{ sender_role: 'rm', hoursAgo: 7 },
			{ sender_role: 'dsa', hoursAgo: 6 },
			{ sender_role: 'rm', hoursAgo: 5 }
		]);
		const result = computeReputation([thread], [], []);
		expect(result.dsa_satisfaction_avg).toBe(4);
	});

	it('case_count reflects input cases', () => {
		const cases = [makeCase([]), makeCase([]), makeCase([])];
		const result = computeReputation([], cases, []);
		expect(result.case_count).toBe(3);
	});

	it('overall_score is 0-100 range', () => {
		const thread = makeThread([
			{ sender_role: 'dsa', hoursAgo: 10 },
			{ sender_role: 'rm', hoursAgo: 6 }
		]);
		const result = computeReputation([thread], [makeCase([])], [{ rating: 4 }]);
		expect(result.overall_score).toBeGreaterThanOrEqual(0);
		expect(result.overall_score).toBeLessThanOrEqual(100);
	});
});

// ═══════════════════════════════════════════════════════════════
// disclaimerFooter — server-enforced footer injection
// ═══════════════════════════════════════════════════════════════

describe('injectDisclaimerFooter() — footer injection', () => {
	it('appends footer to broadcast body', () => {
		const body = 'New rates available for home loans.';
		const result = injectDisclaimerFooter(body, 'broadcast_footer_v1');
		expect(result).toContain(body);
		expect(result).toContain('---');
		expect(result).toContain('shared by the RM');
	});

	it('uses double newline + separator', () => {
		const result = injectDisclaimerFooter('Hello', 'broadcast_footer_v1');
		expect(result).toMatch(/Hello\n\n---\n/);
	});

	it('trims trailing whitespace from body before appending', () => {
		const result = injectDisclaimerFooter('Hello   \n\n', 'broadcast_footer_v1');
		expect(result).toMatch(/^Hello\n\n---\n/);
	});

	it('works for pdf_review_footer_v1', () => {
		const result = injectDisclaimerFooter('Review data here', 'pdf_review_footer_v1');
		expect(result).toContain('preliminary assessment');
	});

	it('works for pdf_submission_footer_v1', () => {
		const result = injectDisclaimerFooter('File data', 'pdf_submission_footer_v1');
		expect(result).toContain('provided by the DSA');
	});

	it('throws for non-existent disclaimer ID', () => {
		expect(() => injectDisclaimerFooter('Hello', 'nonexistent')).toThrow('Disclaimer not found');
	});

	it('throws for non-server-enforced disclaimer', () => {
		expect(() => injectDisclaimerFooter('Hello', 'rm_onboarding_v1')).toThrow(
			'not server-enforced'
		);
	});

	it('throws for per_rating_v1 (not server-enforced)', () => {
		expect(() => injectDisclaimerFooter('Hello', 'per_rating_v1')).toThrow('not server-enforced');
	});
});

describe('getFooterText() — raw footer text', () => {
	it('returns text for broadcast_footer_v1', () => {
		const text = getFooterText('broadcast_footer_v1');
		expect(text.length).toBeGreaterThan(0);
		expect(text).toContain('RM');
	});

	it('returns text for pdf_review_footer_v1', () => {
		const text = getFooterText('pdf_review_footer_v1');
		expect(text).toContain('preliminary');
	});

	it('returns empty string for unknown ID', () => {
		expect(getFooterText('nonexistent')).toBe('');
	});
});
