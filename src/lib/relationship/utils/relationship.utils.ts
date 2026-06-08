import type { RelationshipRule } from '$lib/relationship/rules/relationship.rules';
import type { Applicant } from '$lib/types/form';

/**
 * Convert age to a number safely
 */
function toAge(applicant: Applicant | undefined): number | null {
	if (!applicant?.age) return null;
	const n = typeof applicant.age === 'number' ? applicant.age : Number(applicant.age);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export function getValidRelationships(
	selfIndex: number,
	applicants: Applicant[],
	rules: RelationshipRule[]
): RelationshipRule[] {
	const self = applicants[selfIndex];
	const selfAge = toAge(self);
	if (!self || selfAge === null) return [];

	return rules.filter((rule) => {
		// Min self age
		if (rule.minSelfAge && selfAge < rule.minSelfAge) return false;

		// Not in Blood Relation → always allowed
		if (rule.requiresOtherBloodRelation) return true;

		// Directional relationships
		if (rule.directional && rule.minAgeGap) {
			return applicants.some((other, i) => {
				const otherAge = toAge(other);
				if (i === selfIndex || otherAge === null) return false;
				return Math.abs(selfAge - otherAge) >= rule.minAgeGap!;
			});
		}

		// Sibling type
		if (rule.maxAgeDiff !== undefined) {
			return applicants.some((other, i) => {
				const otherAge = toAge(other);
				if (i === selfIndex || otherAge === null) return false;
				return Math.abs(selfAge - otherAge) <= rule.maxAgeDiff!;
			});
		}

		return true;
	});
}
