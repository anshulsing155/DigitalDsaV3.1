/**
 * VERIFICATION: single (never-married) person should NOT see Father/Mother in dropdown,
 * AND post-creation marital/age edits should invalidate previously-added relationships.
 */
import { describe, it, expect } from 'vitest';
import {
	getAvailableRelationsForPersonA,
	getGroupedRelationsForPersonA,
	checkPersonBValidity,
	validateRelationship,
	findInvalidRelationships
} from '$lib/components/relationship-capture/relationshipValidator';
import type { Applicant, Relationship } from '$lib/components/relationship-capture/types';

const single30M: Applicant = {
	id: 'a',
	name: 'A',
	fullName: 'Single Male 30',
	age: 30,
	gender: 'male',
	maritalStatus: 'single',
	role: 'both'
};
const young10: Applicant = {
	id: 'b',
	name: 'B',
	fullName: 'Child 10',
	age: 10,
	gender: 'male',
	maritalStatus: 'single',
	role: 'both'
};

describe('Single person should NOT be able to be Father', () => {
	it('getAvailableRelationsForPersonA does not include Father of for single male', () => {
		const result = getAvailableRelationsForPersonA(single30M, [single30M, young10], []);
		const relations = result.map((r) => r.relation);
		expect(relations).not.toContain('Father of');
		expect(relations).not.toContain('Grandfather of');
	});

	it('getGroupedRelationsForPersonA does not show Parent group for single', () => {
		const grouped = getGroupedRelationsForPersonA(single30M, [single30M, young10], []);
		const parentGroup = grouped.get('Parent');
		const relations = parentGroup?.map((r) => r.relation) ?? [];
		expect(relations).not.toContain('Father of');
	});

	it('checkPersonBValidity returns invalid for Father of when A is single', () => {
		const validity = checkPersonBValidity(single30M, 'Father of', young10, [single30M, young10], []);
		expect(validity).toBe('invalid');
	});

	it('validateRelationship blocks Father of with hard error when A is single', () => {
		// Closes the gap: dropdown filtering is correct, but validateRelationship
		// itself must enforce marital status so saved/restored relationships and
		// any non-dropdown code path can't slip through.
		const errors = validateRelationship(
			single30M,
			'Father of',
			young10,
			[],
			[],
			[single30M, young10]
		);
		const hardErrors = errors.filter((e) => e.severity !== 'warning');
		expect(hardErrors.length).toBeGreaterThan(0);
		expect(hardErrors.some((e) => e.code === 'MARITAL_FORBIDS_PARENT')).toBe(true);
	});

	it('validateRelationship allows Father of when A is divorced (ever-married)', () => {
		const divorced30M: Applicant = { ...single30M, maritalStatus: 'divorced' };
		const errors = validateRelationship(
			divorced30M,
			'Father of',
			young10,
			[],
			[],
			[divorced30M, young10]
		);
		const hardErrors = errors.filter((e) => e.severity !== 'warning');
		expect(hardErrors.some((e) => e.code === 'MARITAL_FORBIDS_PARENT')).toBe(false);
	});

	it('validateRelationship blocks Husband of when A is single', () => {
		const singleFemale: Applicant = {
			id: 'c',
			name: 'C',
			fullName: 'F',
			age: 28,
			gender: 'female',
			maritalStatus: 'married',
			role: 'both'
		};
		const errors = validateRelationship(
			single30M,
			'Husband of',
			singleFemale,
			[],
			[],
			[single30M, singleFemale]
		);
		const hardErrors = errors.filter((e) => e.severity !== 'warning');
		expect(hardErrors.some((e) => e.code === 'MARITAL_FORBIDS_SPOUSE')).toBe(true);
	});
});

describe('Post-creation edits — marital and age changes invalidate stale relationships', () => {
	const father35: Applicant = {
		id: 'f',
		name: 'F',
		fullName: 'Father',
		age: 35,
		gender: 'male',
		maritalStatus: 'married',
		role: 'both'
	};
	const child10: Applicant = {
		id: 'c',
		name: 'C',
		fullName: 'Child',
		age: 10,
		gender: 'male',
		maritalStatus: 'single',
		role: 'both'
	};
	const fatherSonRels: Relationship[] = [
		{
			id: 'r1',
			fromId: 'f',
			toId: 'c',
			relationType: 'Father of',
			category: 'direct_family',
			source: 'user-defined',
			createdAt: new Date()
		},
		{
			id: 'r2',
			fromId: 'c',
			toId: 'f',
			relationType: 'Son of',
			category: 'direct_family',
			source: 'user-defined',
			createdAt: new Date()
		}
	];

	it('changing father from married → single marks Father of as HARD-invalid', () => {
		const fatherNowSingle = { ...father35, maritalStatus: 'single' as const };
		const result = findInvalidRelationships(
			[fatherNowSingle, child10],
			fatherSonRels
		);
		const r1 = result.get('r1');
		expect(r1).toBeDefined();
		expect(r1!.check).toBe('marital');
		expect(r1!.keepable).toBe(false); // hard — silently removed
	});

	it('changing father age to slightly out of range (correct direction) marks SOFT', () => {
		// Age diff 11 — below min 12 but father still older. Soft, kept by default.
		const fatherNow21 = { ...father35, age: 21 }; // child is 10, diff = 11
		const result = findInvalidRelationships(
			[fatherNow21, child10],
			fatherSonRels
		);
		const r1 = result.get('r1');
		expect(r1).toBeDefined();
		expect(r1!.check).toBe('age');
		expect(r1!.keepable).toBe(true); // soft — surfaced as warning, not auto-removed
	});

	it('changing father gender male → female marks HARD-invalid', () => {
		const fatherNowFemale = { ...father35, gender: 'female' as const };
		const result = findInvalidRelationships(
			[fatherNowFemale, child10],
			fatherSonRels
		);
		const r1 = result.get('r1');
		expect(r1).toBeDefined();
		expect(r1!.check).toBe('gender');
		expect(r1!.keepable).toBe(false);
	});

	it('combined edit: father becomes single AND younger → both checks fire, still HARD', () => {
		const fatherSingleAndYoung = {
			...father35,
			maritalStatus: 'single' as const,
			age: 5
		};
		const result = findInvalidRelationships(
			[fatherSingleAndYoung, child10],
			fatherSonRels
		);
		const r1 = result.get('r1');
		expect(r1).toBeDefined();
		expect(r1!.keepable).toBe(false); // either check is enough to be hard
	});

});
