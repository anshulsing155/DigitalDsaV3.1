import type { RelationshipCatalog } from '$lib/relationship/rules/relationship.validator';

type Applicant = {
	fullName: string;
	relationship?: string;
	relationwith?: string;
	gender: 'Male' | 'Female';
};

type PairError = {
	error: string;
};

const ALLOWED_PAIR_MATRIX: Record<string, string[]> = {
	parent: ['child'],
	child: ['parent'],
	sibling: ['sibling'],
	spouse: ['spouse'],
	grandparent: ['child'], // optional rule
	other: ['parent', 'child', 'sibling', 'spouse', 'grandparent', 'other']
};

export function validateReciprocalRelationship(
	applicants: Applicant[],
	currentIndex: number,
	relationshipCatalog: RelationshipCatalog
): PairError | null {
	const A = applicants[currentIndex];
	if (!A?.relationship || !A?.relationwith) return null;

	// find B
	const targetIndex = applicants.findIndex((a) => a.fullName === A.relationwith);
	if (targetIndex === -1) return null;

	const B = applicants[targetIndex];

	// must be mutual
	if (B.relationwith !== A.fullName) return null;

	// get rule metadata
	const ruleA = relationshipCatalog[A.gender]?.find((r) => r.label === A.relationship);
	const ruleB = relationshipCatalog[B.gender]?.find((r) => r.label === B.relationship);

	if (!ruleA || !ruleB) return null;

	const allowedForA = ALLOWED_PAIR_MATRIX[ruleA.roleGroup] ?? [];

	if (!allowedForA.includes(ruleB.roleGroup)) {
		return {
			error: `"${A.relationship}" does not match "${B.relationship}" selected by ${B.fullName}`
		};
	}

	return null;
}
