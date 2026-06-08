import { describe, it, expect } from 'vitest';
import {
	findInvalidRelationships,
	findInvalidRelationshipIds
} from '$lib/components/relationship-capture/relationshipValidator';
import type { Relationship } from '$lib/components/relationship-capture/types';

// ─── Helper: create a minimal applicant ─────────────────────────

function makeApplicant(overrides: {
	id: string;
	gender?: string;
	age?: number;
	maritalStatus?: string;
}) {
	return {
		id: overrides.id,
		gender: overrides.gender ?? 'male',
		age: overrides.age ?? 30,
		maritalStatus: overrides.maritalStatus ?? 'married',
		applicantType: 'Individual'
	};
}

function makeRelationship(
	overrides: Partial<Relationship> & { fromId: string; toId: string; relationType: string }
): Relationship {
	const defaults: Relationship = {
		id: `rel_${overrides.fromId}_${overrides.toId}`,
		fromId: overrides.fromId,
		toId: overrides.toId,
		relationType: overrides.relationType as any,
		category: 'direct_family',
		source: 'user-defined',
		createdAt: new Date()
	};
	return { ...defaults, ...overrides };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('findInvalidRelationships — hard/soft classification', () => {
	describe('orphan check (always hard)', () => {
		it('marks relationship as hard when fromId applicant is deleted', () => {
			const applicants = [makeApplicant({ id: 'b', gender: 'female', age: 10 })];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('orphan');
			expect(reason.keepable).toBe(false);
		});

		it('marks relationship as hard when toId applicant is deleted', () => {
			const applicants = [makeApplicant({ id: 'a', age: 40 })];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('orphan');
			expect(reason.keepable).toBe(false);
		});
	});

	describe('gender check (always hard)', () => {
		it('marks "Father of" as hard when person A is female', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'female', age: 40 }),
				makeApplicant({ id: 'b', gender: 'male', age: 15 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('gender');
			expect(reason.keepable).toBe(false);
		});

		it('marks "Husband of" as hard when person A is female', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'female', age: 30, maritalStatus: 'married' }),
				makeApplicant({ id: 'b', gender: 'female', age: 28, maritalStatus: 'married' })
			];
			const rels = [
				makeRelationship({
					fromId: 'a',
					toId: 'b',
					relationType: 'Husband of',
					category: 'direct_family'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('gender');
			expect(reason.keepable).toBe(false);
		});
	});

	describe('age check — direction reversed (hard)', () => {
		it('marks "Father of" as hard when father is younger than child', () => {
			// Father should be older, but here father is 20 and child is 25
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 20 }),
				makeApplicant({ id: 'b', gender: 'male', age: 25 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('age');
			expect(reason.keepable).toBe(false); // direction reversed
		});

		it('marks "Son of" as hard when son is older than parent', () => {
			// Son should be younger, but here son is 50 and parent is 30
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 50 }),
				makeApplicant({ id: 'b', gender: 'male', age: 30 })
			];
			const rels = [
				makeRelationship({
					fromId: 'a',
					toId: 'b',
					relationType: 'Son of',
					category: 'direct_family'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('age');
			expect(reason.keepable).toBe(false); // son is older — impossible
		});
	});

	describe('age check — slightly out of range (soft/keepable)', () => {
		it('marks "Father of" as soft when age gap is 10 (min is 12) but direction is correct', () => {
			// Father is 10 years older — correct direction, just slightly under min of 12
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 30 }),
				makeApplicant({ id: 'b', gender: 'male', age: 20 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('age');
			expect(reason.keepable).toBe(true); // direction correct, just out of range
		});

		it('marks "Father of" as soft when age gap exceeds max (65 years, max is 60)', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 80 }),
				makeApplicant({ id: 'b', gender: 'male', age: 15 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('age');
			expect(reason.keepable).toBe(true); // direction correct, just exceeds max
		});

		it('marks sibling age violation as soft (similar rule — direction irrelevant)', () => {
			// Brothers with 30 year gap (max for siblings is 25)
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 55 }),
				makeApplicant({ id: 'b', gender: 'male', age: 25 })
			];
			const rels = [
				makeRelationship({
					fromId: 'a',
					toId: 'b',
					relationType: 'Brother of',
					category: 'direct_family'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('age');
			expect(reason.keepable).toBe(true); // siblings always soft for age
		});
	});

	describe('marital status check (hard for spouse/parent/in-law, soft otherwise)', () => {
		it('marks "Husband of" as HARD when person becomes single (spouse requires marital)', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 30, maritalStatus: 'single' }),
				makeApplicant({ id: 'b', gender: 'female', age: 28, maritalStatus: 'married' })
			];
			const rels = [
				makeRelationship({
					fromId: 'a',
					toId: 'b',
					relationType: 'Husband of',
					category: 'direct_family'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('marital');
			expect(reason.keepable).toBe(false);
		});

		it('marks "Wife of" as HARD when person B becomes single (spouse requires marital)', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'female', age: 28, maritalStatus: 'married' }),
				makeApplicant({ id: 'b', gender: 'male', age: 30, maritalStatus: 'single' })
			];
			const rels = [
				makeRelationship({
					fromId: 'a',
					toId: 'b',
					relationType: 'Wife of',
					category: 'direct_family'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(1);

			const reason = result.get(rels[0].id)!;
			expect(reason.check).toBe('marital');
			expect(reason.keepable).toBe(false);
		});
	});

	describe('reciprocal check', () => {
		it('both sides of a hard pair are marked not keepable', () => {
			// Father-Son pair where father is younger (hard) — both sides fail independently
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 20 }),
				makeApplicant({ id: 'b', gender: 'male', age: 25 })
			];
			const rels = [
				makeRelationship({
					id: 'rel_fwd',
					fromId: 'a',
					toId: 'b',
					relationType: 'Father of'
				}),
				makeRelationship({
					id: 'rel_rev',
					fromId: 'b',
					toId: 'a',
					relationType: 'Son of'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(2);

			// Both sides: hard (direction reversed)
			expect(result.get('rel_fwd')!.keepable).toBe(false);
			expect(result.get('rel_rev')!.keepable).toBe(false);
		});

		it('both sides of a spouse marital-mismatch pair are marked HARD', () => {
			// Husband-Wife pair where husband changed to single — spouse marital is a
			// definitional requirement, so both sides are hard (not keepable).
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 30, maritalStatus: 'single' }),
				makeApplicant({ id: 'b', gender: 'female', age: 28, maritalStatus: 'married' })
			];
			const rels = [
				makeRelationship({
					id: 'rel_fwd',
					fromId: 'a',
					toId: 'b',
					relationType: 'Husband of'
				}),
				makeRelationship({
					id: 'rel_rev',
					fromId: 'b',
					toId: 'a',
					relationType: 'Wife of'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(2);

			// Both sides: hard (spouse requires both to be married)
			expect(result.get('rel_fwd')!.keepable).toBe(false);
			expect(result.get('rel_rev')!.keepable).toBe(false);
		});

		it('reciprocal inherits keepable from primary when only one side fails directly', () => {
			// Person A (male, 40) is "Father of" person B (male, 15) — valid
			// Person B (male, 15) is "Son of" person A (male, 40) — valid
			// Now change person A gender to female → "Father of" fails gender
			// But "Son of" (personAGender: male, B is male) is still valid on its own
			// → reciprocal check should mark "Son of" invalid too
			const applicants = [
				makeApplicant({ id: 'a', gender: 'female', age: 40 }), // gender wrong for "Father of"
				makeApplicant({ id: 'b', gender: 'male', age: 15 })
			];
			const rels = [
				makeRelationship({
					id: 'rel_fwd',
					fromId: 'a',
					toId: 'b',
					relationType: 'Father of'
				}),
				makeRelationship({
					id: 'rel_rev',
					fromId: 'b',
					toId: 'a',
					relationType: 'Son of'
				})
			];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(2);

			// Forward fails gender check (hard)
			expect(result.get('rel_fwd')!.check).toBe('gender');
			expect(result.get('rel_fwd')!.keepable).toBe(false);
			// Reverse: "Son of" is valid on its own but picked up as reciprocal, inherits hard
			expect(result.get('rel_rev')!.check).toBe('reciprocal');
			expect(result.get('rel_rev')!.keepable).toBe(false);
		});
	});

	describe('valid relationships return empty map', () => {
		it('returns empty map for valid Father-Son relationship', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'male', age: 45 }),
				makeApplicant({ id: 'b', gender: 'male', age: 20 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const result = findInvalidRelationships(applicants, rels);
			expect(result.size).toBe(0);
		});
	});

	describe('backward compatibility with findInvalidRelationshipIds', () => {
		it('findInvalidRelationshipIds returns same IDs as findInvalidRelationships keys', () => {
			const applicants = [
				makeApplicant({ id: 'a', gender: 'female', age: 40 }),
				makeApplicant({ id: 'b', gender: 'male', age: 15 })
			];
			const rels = [makeRelationship({ fromId: 'a', toId: 'b', relationType: 'Father of' })];

			const oldResult = findInvalidRelationshipIds(applicants, rels);
			const newResult = findInvalidRelationships(applicants, rels);

			expect(oldResult.size).toBe(newResult.size);
			for (const id of oldResult) {
				expect(newResult.has(id)).toBe(true);
			}
		});
	});
});
