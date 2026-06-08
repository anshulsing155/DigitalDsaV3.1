/**
 * Director Cross-Company Tests
 * ═══════════════════════════════════════════════════════════════════
 * Tests for multi-company director handling:
 * - isLinkedToCompany / isLinkedToAnyCompany helpers
 * - findCrossCompanyDirectorMatch
 * - commitDirectorsToApplicants multi-company merge
 * - findNameMatchInApplicants with companyId filter
 * ═══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
	type DirectorForm,
	isLinkedToCompany,
	isLinkedToAnyCompany,
	findCrossCompanyDirectorMatch,
	findNameMatchInApplicants,
	commitDirectorsToApplicants,
	normalizeName
} from '$lib/utils/directorFormUtils';

// ── Test Helpers ──────────────────────────────────────────────────

function makeDirectorForm(overrides: Partial<DirectorForm> = {}): DirectorForm {
	return {
		id: 'dir-' + Math.random().toString(36).slice(2),
		fullName: 'Test Director',
		gender: 'male',
		age: '35',
		maritalStatus: 'married',
		ownershipPercent: '50',
		location: 'same_city',
		isNRI: 'No',
		onProperty: 'true',
		onEMI: 'true',
		designation: '',
		loanRole: '',
		restoredFrom: '',
		lockedFields: [],
		pendingMatch: null,
		...overrides
	};
}

function makeApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'app-' + Math.random().toString(36).slice(2),
		applicantType: 'Individual',
		fullName: 'Test Person',
		gender: 'male',
		age: '35',
		maritalStatus: 'married',
		...overrides
	};
}

// ═══════════════════════════════════════════════════════════════════
// isLinkedToCompany
// ═══════════════════════════════════════════════════════════════════

describe('isLinkedToCompany', () => {
	it('matches singular linkedCompanyId', () => {
		const a = makeApplicant({ linkedCompanyId: 'comp-1' });
		expect(isLinkedToCompany(a, 'comp-1')).toBe(true);
	});

	it('does not match different singular linkedCompanyId', () => {
		const a = makeApplicant({ linkedCompanyId: 'comp-1' });
		expect(isLinkedToCompany(a, 'comp-2')).toBe(false);
	});

	it('matches entry in linkedCompanyIds array', () => {
		const a = makeApplicant({ linkedCompanyIds: ['comp-1', 'comp-2'] });
		expect(isLinkedToCompany(a, 'comp-2')).toBe(true);
	});

	it('returns false when linkedCompanyIds is empty', () => {
		const a = makeApplicant({ linkedCompanyIds: [] });
		expect(isLinkedToCompany(a, 'comp-1')).toBe(false);
	});

	it('returns false when neither field is set', () => {
		const a = makeApplicant({});
		expect(isLinkedToCompany(a, 'comp-1')).toBe(false);
	});

	it('matches via singular even if plural is missing', () => {
		const a = makeApplicant({ linkedCompanyId: 'comp-1' });
		expect(isLinkedToCompany(a, 'comp-1')).toBe(true);
	});

	it('matches via plural even if singular is different', () => {
		const a = makeApplicant({ linkedCompanyId: 'comp-1', linkedCompanyIds: ['comp-1', 'comp-2'] });
		expect(isLinkedToCompany(a, 'comp-2')).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════
// isLinkedToAnyCompany
// ═══════════════════════════════════════════════════════════════════

describe('isLinkedToAnyCompany', () => {
	it('returns true when linkedCompanyId is set', () => {
		const a = makeApplicant({ linkedCompanyId: 'comp-1' });
		expect(isLinkedToAnyCompany(a)).toBe(true);
	});

	it('returns true when linkedCompanyIds has entries', () => {
		const a = makeApplicant({ linkedCompanyIds: ['comp-1'] });
		expect(isLinkedToAnyCompany(a)).toBe(true);
	});

	it('returns false when neither is set', () => {
		const a = makeApplicant({});
		expect(isLinkedToAnyCompany(a)).toBe(false);
	});

	it('returns false when linkedCompanyIds is empty array', () => {
		const a = makeApplicant({ linkedCompanyIds: [] });
		expect(isLinkedToAnyCompany(a)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════
// findCrossCompanyDirectorMatch
// ═══════════════════════════════════════════════════════════════════

describe('findCrossCompanyDirectorMatch', () => {
	it('finds a match in another company', () => {
		const map = new Map<string, DirectorForm[]>();
		map.set('comp-A', [makeDirectorForm({ fullName: 'Rahul Kumar' })]);
		map.set('comp-B', [makeDirectorForm({ fullName: 'Other Person' })]);

		const result = findCrossCompanyDirectorMatch('Rahul Kumar', map, 'comp-B');
		expect(result).not.toBeNull();
		expect(result!.companyId).toBe('comp-A');
		expect(result!.formIndex).toBe(0);
	});

	it('does not match within the same company', () => {
		const map = new Map<string, DirectorForm[]>();
		map.set('comp-A', [makeDirectorForm({ fullName: 'Rahul Kumar' })]);

		const result = findCrossCompanyDirectorMatch('Rahul Kumar', map, 'comp-A');
		expect(result).toBeNull();
	});

	it('case-insensitive name matching', () => {
		const map = new Map<string, DirectorForm[]>();
		map.set('comp-A', [makeDirectorForm({ fullName: 'RAHUL KUMAR' })]);

		const result = findCrossCompanyDirectorMatch('rahul kumar', map, 'comp-B');
		expect(result).not.toBeNull();
	});

	it('returns null for short names', () => {
		const map = new Map<string, DirectorForm[]>();
		map.set('comp-A', [makeDirectorForm({ fullName: 'A' })]);

		const result = findCrossCompanyDirectorMatch('A', map, 'comp-B');
		expect(result).toBeNull();
	});

	it('returns null for empty map', () => {
		const map = new Map<string, DirectorForm[]>();
		const result = findCrossCompanyDirectorMatch('Rahul Kumar', map, 'comp-A');
		expect(result).toBeNull();
	});

	it('returns first cross-company match when multiple exist', () => {
		const map = new Map<string, DirectorForm[]>();
		map.set('comp-A', [makeDirectorForm({ fullName: 'Rahul Kumar', gender: 'male' })]);
		map.set('comp-B', [makeDirectorForm({ fullName: 'Rahul Kumar', gender: 'female' })]);
		map.set('comp-C', [makeDirectorForm({ fullName: 'Other Person' })]);

		const result = findCrossCompanyDirectorMatch('Rahul Kumar', map, 'comp-C');
		expect(result).not.toBeNull();
		expect(result!.companyId).toBe('comp-A'); // first match
	});
});

// ═══════════════════════════════════════════════════════════════════
// findNameMatchInApplicants — companyId parameter
// ═══════════════════════════════════════════════════════════════════

describe('findNameMatchInApplicants with companyId', () => {
	it('skips applicants linked to the given companyId', () => {
		const applicants = [
			makeApplicant({
				fullName: 'Rahul Kumar',
				linkedCompanyId: 'comp-A',
				gender: 'male',
				age: '30'
			})
		];
		const result = findNameMatchInApplicants('Rahul Kumar', applicants, 'comp-A');
		expect(result).toBeNull();
	});

	it('matches applicants linked to OTHER companies', () => {
		const applicants = [
			makeApplicant({
				fullName: 'Rahul Kumar',
				linkedCompanyId: 'comp-B',
				gender: 'male',
				age: '30'
			})
		];
		const result = findNameMatchInApplicants('Rahul Kumar', applicants, 'comp-A');
		expect(result).not.toBeNull();
	});

	it('matches standalone individuals when companyId is given', () => {
		const applicants = [makeApplicant({ fullName: 'Priya Shah', gender: 'female', age: '28' })];
		const result = findNameMatchInApplicants('Priya Shah', applicants, 'comp-A');
		expect(result).not.toBeNull();
	});

	it('skips applicants linked via linkedCompanyIds (plural)', () => {
		const applicants = [
			makeApplicant({
				fullName: 'Rahul Kumar',
				linkedCompanyId: 'comp-B',
				linkedCompanyIds: ['comp-B', 'comp-A'],
				gender: 'male',
				age: '30'
			})
		];
		const result = findNameMatchInApplicants('Rahul Kumar', applicants, 'comp-A');
		expect(result).toBeNull();
	});

	it('legacy behavior: no companyId skips all linked entries', () => {
		const applicants = [
			makeApplicant({
				fullName: 'Rahul Kumar',
				linkedCompanyId: 'comp-B',
				gender: 'male',
				age: '30'
			})
		];
		const result = findNameMatchInApplicants('Rahul Kumar', applicants);
		expect(result).toBeNull(); // legacy: skip all linked
	});
});

// ═══════════════════════════════════════════════════════════════════
// commitDirectorsToApplicants — multi-company merge
// ═══════════════════════════════════════════════════════════════════

describe('commitDirectorsToApplicants — multi-company', () => {
	it('sets linkedCompanyIds on new director entries', () => {
		const companyId = 'comp-A';
		const forms = [makeDirectorForm({ id: 'dir-1', fullName: 'Rahul Kumar' })];
		const applicants = [
			makeApplicant({ id: companyId, applicantType: 'Company', companyName: 'Acme Corp' })
		];

		const result = commitDirectorsToApplicants(companyId, forms, applicants, 'director');
		const rahul = result.find((a) => a.fullName === 'Rahul Kumar');
		expect(rahul).toBeDefined();
		expect(rahul!.linkedCompanyId).toBe(companyId);
		expect(rahul!.linkedCompanyIds).toEqual([companyId]);
	});

	it('merges into existing Individual from another company and builds linkedCompanyIds', () => {
		const forms = [makeDirectorForm({ id: 'dir-1', fullName: 'Rahul Kumar' })];
		const existing = makeApplicant({
			id: 'existing-rahul',
			fullName: 'Rahul Kumar',
			linkedCompanyId: 'comp-A',
			linkedCompanyIds: ['comp-A']
		});
		const applicants = [
			makeApplicant({ id: 'comp-A', applicantType: 'Company', companyName: 'Alpha Corp' }),
			makeApplicant({ id: 'comp-B', applicantType: 'Company', companyName: 'Beta Corp' }),
			existing
		];

		const result = commitDirectorsToApplicants('comp-B', forms, applicants, 'director');
		const rahul = result.find((a) => a.fullName === 'Rahul Kumar');
		expect(rahul).toBeDefined();
		expect(rahul!.linkedCompanyId).toBe('comp-A'); // primary stays
		expect(rahul!.linkedCompanyIds).toEqual(expect.arrayContaining(['comp-A', 'comp-B']));
		expect((rahul!.linkedCompanyIds as string[]).length).toBe(2);
	});

	it('drops stale company link when original company no longer in applicant list', () => {
		const forms = [makeDirectorForm({ id: 'dir-1', fullName: 'Rahul Kumar' })];
		const existing = makeApplicant({
			id: 'existing-rahul',
			fullName: 'Rahul Kumar',
			linkedCompanyId: 'comp-A',
			linkedCompanyIds: ['comp-A']
		});
		// comp-A is NOT in applicants — it was deleted
		const applicants = [
			makeApplicant({ id: 'comp-B', applicantType: 'Company', companyName: 'Beta Corp' }),
			existing
		];

		const result = commitDirectorsToApplicants('comp-B', forms, applicants, 'director');
		const rahul = result.find((a) => a.fullName === 'Rahul Kumar');
		expect(rahul).toBeDefined();
		expect(rahul!.linkedCompanyId).toBe('comp-B'); // stale comp-A replaced
		expect(rahul!.linkedCompanyIds).toEqual(['comp-B']);
	});

	it('removes stale entries using isLinkedToCompany', () => {
		const forms = [makeDirectorForm({ id: 'dir-1', fullName: 'New Director' })];
		const stale = makeApplicant({
			id: 'stale-entry',
			fullName: 'Old Director',
			linkedCompanyId: 'comp-A',
			linkedCompanyIds: ['comp-A']
		});
		const applicants = [
			makeApplicant({ id: 'comp-A', applicantType: 'Company', companyName: 'Alpha Corp' }),
			stale
		];

		const result = commitDirectorsToApplicants('comp-A', forms, applicants, 'director');
		const oldDir = result.find((a) => a.fullName === 'Old Director');
		expect(oldDir).toBeUndefined(); // stale entry removed
	});

	it('director form onProperty/onEMI overrides existing values (not OR-merged)', () => {
		const forms = [
			makeDirectorForm({
				id: 'dir-1',
				fullName: 'Rahul Kumar',
				onProperty: 'false',
				onEMI: 'false'
			})
		];
		const existing = makeApplicant({
			id: 'existing-rahul',
			fullName: 'Rahul Kumar',
			linkedCompanyId: 'comp-A',
			onProperty: true,
			onEMI: true
		});
		const applicants = [makeApplicant({ id: 'comp-B', applicantType: 'Company' }), existing];

		const result = commitDirectorsToApplicants('comp-B', forms, applicants, 'director');
		const rahul = result.find((a) => a.fullName === 'Rahul Kumar');
		expect(rahul).toBeDefined();
		// Director form's explicit false overrides stale true — prevents role derivation corruption
		expect(rahul!.onProperty).toBe(false);
		expect(rahul!.onEMI).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════
// normalizeName edge cases
// ═══════════════════════════════════════════════════════════════════

describe('normalizeName', () => {
	it('trims and lowercases', () => {
		expect(normalizeName('  Rahul  Kumar  ')).toBe('rahul kumar');
	});

	it('handles null/undefined', () => {
		expect(normalizeName(null as any)).toBe('');
		expect(normalizeName(undefined as any)).toBe('');
	});

	it('collapses multiple spaces', () => {
		expect(normalizeName('Rahul   Kumar')).toBe('rahul kumar');
	});
});
