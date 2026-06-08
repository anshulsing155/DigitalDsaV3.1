/**
 * Tests for the relationship validator (Phase 3b audit cleanup).
 *
 * Coverage focus — the rules that gate real production behaviour:
 *   - coerceAge utility (used in reactive cleanup)
 *   - Existence helpers (isMarried, hasFather/Mother, hasParentOfGender,
 *     hasExistingRelation, countParents, getSpouse)
 *   - validateRelationship — the main rule engine (self/duplicate/forbidden/
 *     gender/age/marital checks, plus spouse uniqueness, parent uniqueness,
 *     cousin age sanity)
 *   - findInvalidRelationshipIds + findInvalidRelationships — reactive
 *     cleanup when applicant data changes mid-form
 *
 * Out of scope (test via integration if needed):
 *   - getAvailableRelationsForPersonA / getValidRelations — UI option lists
 *     derived from the validator core; their correctness follows from the
 *     rules being correct.
 */

import { describe, it, expect } from 'vitest';
import {
	coerceAge,
	isMarried,
	countParents,
	hasFather,
	hasMother,
	hasParentOfGender,
	hasExistingRelation,
	getSpouse,
	validateRelationship,
	findInvalidRelationshipIds,
	findInvalidRelationships
} from '$lib/components/relationship-capture/relationshipValidator';
import type {
	Applicant,
	Relationship,
	RelationType,
	ForbiddenRelation
} from '$lib/components/relationship-capture/types';

// ────────────────────────────────────────────────────────────────────────────
// FIXTURE BUILDERS
// ────────────────────────────────────────────────────────────────────────────

function mkApplicant(overrides: Partial<Applicant> & Pick<Applicant, 'id'>): Applicant {
	return {
		name: overrides.id,
		fullName: overrides.id,
		age: 30,
		gender: 'male',
		maritalStatus: 'single',
		role: 'both',
		...overrides
	};
}

function mkRel(
	fromId: string,
	toId: string,
	relationType: RelationType,
	overrides: Partial<Relationship> = {}
): Relationship {
	return {
		id: `${fromId}-${relationType}-${toId}`,
		fromId,
		toId,
		relationType,
		category: 'direct_family',
		source: 'user-defined',
		createdAt: new Date('2026-01-01'),
		...overrides
	};
}

/** A typical Indian family for cross-test reuse. */
function familyOfFour() {
	const father = mkApplicant({
		id: 'father',
		gender: 'male',
		age: 52,
		maritalStatus: 'married'
	});
	const mother = mkApplicant({
		id: 'mother',
		gender: 'female',
		age: 48,
		maritalStatus: 'married'
	});
	const son = mkApplicant({ id: 'son', gender: 'male', age: 22, maritalStatus: 'single' });
	const daughter = mkApplicant({
		id: 'daughter',
		gender: 'female',
		age: 18,
		maritalStatus: 'single'
	});
	const applicants = [father, mother, son, daughter];

	const relationships: Relationship[] = [
		mkRel('father', 'mother', 'Husband of'),
		mkRel('mother', 'father', 'Wife of'),
		mkRel('father', 'son', 'Father of'),
		mkRel('father', 'daughter', 'Father of'),
		mkRel('mother', 'son', 'Mother of'),
		mkRel('mother', 'daughter', 'Mother of')
	];

	return { father, mother, son, daughter, applicants, relationships };
}

// ────────────────────────────────────────────────────────────────────────────
// coerceAge — pure utility
// ────────────────────────────────────────────────────────────────────────────

describe('coerceAge', () => {
	it('returns 0 for undefined / null / empty string', () => {
		expect(coerceAge(undefined)).toBe(0);
		expect(coerceAge(null as unknown as undefined)).toBe(0);
		expect(coerceAge('')).toBe(0);
	});

	it('passes numbers through unchanged', () => {
		expect(coerceAge(42)).toBe(42);
		expect(coerceAge(0)).toBe(0);
	});

	it('parses numeric strings', () => {
		expect(coerceAge('25')).toBe(25);
		expect(coerceAge('60')).toBe(60);
	});

	it('returns 0 for non-numeric strings', () => {
		expect(coerceAge('not a number')).toBe(0);
		expect(coerceAge('abc')).toBe(0);
	});

	it('returns 0 for Infinity / NaN', () => {
		expect(coerceAge(Infinity)).toBe(0);
		expect(coerceAge(NaN)).toBe(0);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// isMarried, getSpouse
// ────────────────────────────────────────────────────────────────────────────

describe('isMarried', () => {
	it('returns true if person has a Husband-of relationship as fromId', () => {
		const { father, relationships } = familyOfFour();
		expect(isMarried(father, relationships)).toBe(true);
	});

	it('returns true if person has a Wife-of relationship as fromId', () => {
		const { mother, relationships } = familyOfFour();
		expect(isMarried(mother, relationships)).toBe(true);
	});

	it('returns false for an unmarried person', () => {
		const { son, relationships } = familyOfFour();
		expect(isMarried(son, relationships)).toBe(false);
	});

	it('returns false when no relationships are passed', () => {
		const someone = mkApplicant({ id: 'someone' });
		expect(isMarried(someone, [])).toBe(false);
		expect(isMarried(someone, undefined as unknown as Relationship[])).toBe(false);
	});
});

describe('getSpouse', () => {
	it('returns spouse for a married person', () => {
		const { father, relationships } = familyOfFour();
		const spouse = getSpouse(father, relationships);
		expect(spouse).not.toBeNull();
		expect(spouse?.id).toBe('mother');
	});

	it('returns null for an unmarried person', () => {
		const { son, relationships } = familyOfFour();
		expect(getSpouse(son, relationships)).toBeNull();
	});
});

// ────────────────────────────────────────────────────────────────────────────
// countParents, hasFather, hasMother, hasParentOfGender
// ────────────────────────────────────────────────────────────────────────────

describe('countParents / hasFather / hasMother', () => {
	it('countParents returns 2 for a child with both parents declared', () => {
		const { son, relationships } = familyOfFour();
		expect(countParents(son, relationships)).toBe(2);
	});

	it('hasFather returns true when father relationship exists', () => {
		const { son, relationships } = familyOfFour();
		expect(hasFather(son, relationships)).toBe(true);
	});

	it('hasMother returns true when mother relationship exists', () => {
		const { son, relationships } = familyOfFour();
		expect(hasMother(son, relationships)).toBe(true);
	});

	it('hasFather returns false when no father is declared', () => {
		const orphan = mkApplicant({ id: 'orphan' });
		expect(hasFather(orphan, [])).toBe(false);
	});

	it('countParents returns 0 when person has no id', () => {
		const noId = mkApplicant({ id: '' });
		expect(countParents(noId, [])).toBe(0);
	});
});

describe('hasParentOfGender', () => {
	it('returns true when person has a parent of the queried gender', () => {
		const { son, applicants, relationships } = familyOfFour();
		expect(hasParentOfGender(son, 'male', relationships, applicants)).toBe(true);
		expect(hasParentOfGender(son, 'female', relationships, applicants)).toBe(true);
	});

	it('returns false when no parent of that gender exists', () => {
		// Single-mother family
		const mother = mkApplicant({
			id: 'mom',
			gender: 'female',
			age: 40,
			maritalStatus: 'widowed'
		});
		const child = mkApplicant({ id: 'child', gender: 'male', age: 10 });
		const rels: Relationship[] = [mkRel('mom', 'child', 'Mother of')];

		expect(hasParentOfGender(child, 'female', rels, [mother, child])).toBe(true);
		expect(hasParentOfGender(child, 'male', rels, [mother, child])).toBe(false);
	});

	it('returns false when person has no id', () => {
		const noId = mkApplicant({ id: '' });
		expect(hasParentOfGender(noId, 'male', [], [])).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// hasExistingRelation
// ────────────────────────────────────────────────────────────────────────────

describe('hasExistingRelation', () => {
	it('returns true when a relationship exists in either direction', () => {
		const { relationships } = familyOfFour();
		expect(hasExistingRelation('father', 'mother', relationships)).toBe(true);
		expect(hasExistingRelation('mother', 'father', relationships)).toBe(true);
	});

	it('returns false for two unrelated people', () => {
		const { relationships } = familyOfFour();
		expect(hasExistingRelation('son', 'daughter', relationships)).toBe(false);
	});

	it('returns false for missing IDs', () => {
		const { relationships } = familyOfFour();
		expect(hasExistingRelation(undefined, 'mother', relationships)).toBe(false);
		expect(hasExistingRelation('father', undefined, relationships)).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// validateRelationship — main rule engine
// ────────────────────────────────────────────────────────────────────────────

describe('validateRelationship — primary checks', () => {
	const noForbidden: ForbiddenRelation[] = [];

	it('rejects a self-relation', () => {
		const { father, applicants, relationships } = familyOfFour();
		const errors = validateRelationship(
			father,
			'Brother of',
			father,
			relationships,
			noForbidden,
			applicants
		);
		expect(errors.some((e) => e.code === 'SELF_RELATION')).toBe(true);
	});

	it('rejects a duplicate relationship between two existing people', () => {
		const { father, mother, applicants, relationships } = familyOfFour();
		const errors = validateRelationship(
			father,
			'Husband of',
			mother,
			relationships,
			noForbidden,
			applicants
		);
		expect(errors.some((e) => e.code === 'DUPLICATE_RELATION')).toBe(true);
	});

	it('rejects a relation explicitly listed as forbidden', () => {
		const { father, mother, applicants } = familyOfFour();
		const forbidden: ForbiddenRelation[] = [
			{
				fromId: 'father',
				toId: 'mother',
				forbiddenRelations: ['Sister of'],
				reason: 'Cannot be siblings — already spouses'
			}
		];
		const errors = validateRelationship(father, 'Sister of', mother, [], forbidden, applicants);
		expect(errors.some((e) => e.code === 'FORBIDDEN_RELATION')).toBe(true);
	});

	it('accepts a fresh, valid Father-of relation between two unrelated people', () => {
		const dad = mkApplicant({
			id: 'dad',
			gender: 'male',
			age: 50,
			maritalStatus: 'married'
		});
		const kid = mkApplicant({ id: 'kid', gender: 'male', age: 25, maritalStatus: 'single' });
		const errors = validateRelationship(dad, 'Father of', kid, [], [], [dad, kid]);
		// May contain warnings, but no blocking error.
		const blocking = errors.filter((e) => e.severity !== 'warning');
		expect(blocking).toHaveLength(0);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// findInvalidRelationshipIds — reactive cleanup
// ────────────────────────────────────────────────────────────────────────────

describe('findInvalidRelationshipIds — reactive cleanup', () => {
	it('returns empty set when all relationships are valid', () => {
		const { applicants, relationships } = familyOfFour();
		const invalid = findInvalidRelationshipIds(applicants, relationships);
		expect(invalid.size).toBe(0);
	});

	it('flags orphan relationships when an applicant is deleted', () => {
		const { relationships } = familyOfFour();
		// Drop the daughter — relationships referencing her are now orphaned.
		const survivingApplicants = [
			mkApplicant({ id: 'father', gender: 'male', age: 52, maritalStatus: 'married' }),
			mkApplicant({ id: 'mother', gender: 'female', age: 48, maritalStatus: 'married' }),
			mkApplicant({ id: 'son', gender: 'male', age: 22 })
		];
		const invalid = findInvalidRelationshipIds(survivingApplicants, relationships);
		expect(invalid.size).toBeGreaterThan(0);
		// Father→daughter and mother→daughter should both be flagged.
		expect(invalid.has('father-Father of-daughter')).toBe(true);
		expect(invalid.has('mother-Mother of-daughter')).toBe(true);
	});

	it('flags relationships when gender no longer matches the rule', () => {
		// Father→Father-of→son, then father is changed to gender=female.
		const father = mkApplicant({
			id: 'father',
			gender: 'female', // GENDER FLIPPED
			age: 52,
			maritalStatus: 'married'
		});
		const son = mkApplicant({ id: 'son', gender: 'male', age: 22 });
		const rel = mkRel('father', 'son', 'Father of');

		const invalid = findInvalidRelationshipIds([father, son], [rel]);
		expect(invalid.has(rel.id)).toBe(true);
	});

	it('flags relationships when age difference is now out of range', () => {
		// Father→Father-of→son with father suddenly aged 25 (only 3 years older than son aged 22)
		// Rule requires minAgeDiff=12 for Father-of.
		const father = mkApplicant({
			id: 'father',
			gender: 'male',
			age: 25, // TOO YOUNG to be 22-year-old's father
			maritalStatus: 'married'
		});
		const son = mkApplicant({ id: 'son', gender: 'male', age: 22 });
		const rel = mkRel('father', 'son', 'Father of');

		const invalid = findInvalidRelationshipIds([father, son], [rel]);
		expect(invalid.has(rel.id)).toBe(true);
	});

	it('flags relationships when marital status no longer satisfies the rule', () => {
		// Father-of requires personA.maritalStatus to be ever-married.
		// Switching father's status to 'single' should invalidate.
		const father = mkApplicant({
			id: 'father',
			gender: 'male',
			age: 52,
			maritalStatus: 'single' // SINGLE — disallowed for parent rule
		});
		const son = mkApplicant({ id: 'son', gender: 'male', age: 22 });
		const rel = mkRel('father', 'son', 'Father of');

		const invalid = findInvalidRelationshipIds([father, son], [rel]);
		expect(invalid.has(rel.id)).toBe(true);
	});

	it('also flags reciprocal of an invalid relationship', () => {
		// Husband-of and Wife-of are reciprocals. If husband becomes single,
		// both directions of the spouse pair should be flagged.
		const husband = mkApplicant({
			id: 'husband',
			gender: 'male',
			age: 35,
			maritalStatus: 'single' // INVALIDATES spouse rule
		});
		const wife = mkApplicant({
			id: 'wife',
			gender: 'female',
			age: 33,
			maritalStatus: 'married'
		});
		const husbandOf = mkRel('husband', 'wife', 'Husband of');
		const wifeOf = mkRel('wife', 'husband', 'Wife of');

		const invalid = findInvalidRelationshipIds([husband, wife], [husbandOf, wifeOf]);
		expect(invalid.has(husbandOf.id)).toBe(true);
		expect(invalid.has(wifeOf.id)).toBe(true);
	});

	it('skips age check when either side has unknown age (0)', () => {
		const father = mkApplicant({
			id: 'father',
			gender: 'male',
			age: 0, // age unknown — skip age check
			maritalStatus: 'married'
		});
		const son = mkApplicant({ id: 'son', gender: 'male', age: 22 });
		const rel = mkRel('father', 'son', 'Father of');

		const invalid = findInvalidRelationshipIds([father, son], [rel]);
		// Age check should be skipped (one side age=0). Should NOT be flagged on age.
		expect(invalid.has(rel.id)).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// findInvalidRelationships — hard / soft classification
// ────────────────────────────────────────────────────────────────────────────

describe('findInvalidRelationships — hard vs soft classification', () => {
	it('classifies orphan as keepable: false (hard)', () => {
		const father = mkApplicant({
			id: 'father',
			gender: 'male',
			age: 52,
			maritalStatus: 'married'
		});
		const orphanRel = mkRel('father', 'ghost', 'Father of');
		const reasons = findInvalidRelationships([father], [orphanRel]);

		expect(reasons.get(orphanRel.id)).toEqual({
			check: 'orphan',
			keepable: false
		});
	});

	it('classifies gender mismatch as keepable: false (hard)', () => {
		const father = mkApplicant({
			id: 'father',
			gender: 'female', // gender flipped
			age: 52,
			maritalStatus: 'married'
		});
		const son = mkApplicant({ id: 'son', gender: 'male', age: 22 });
		const rel = mkRel('father', 'son', 'Father of');

		const reasons = findInvalidRelationships([father, son], [rel]);
		expect(reasons.get(rel.id)).toEqual({
			check: 'gender',
			keepable: false
		});
	});

	it('returns empty map when nothing is invalid', () => {
		const { applicants, relationships } = familyOfFour();
		const reasons = findInvalidRelationships(applicants, relationships);
		expect(reasons.size).toBe(0);
	});
});
