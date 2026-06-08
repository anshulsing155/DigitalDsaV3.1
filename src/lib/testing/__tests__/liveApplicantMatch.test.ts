/**
 * Tests for live applicant match detection (findLiveMatches)
 */

import { describe, it, expect } from 'vitest';
import { findLiveMatches } from '$lib/utils/applicantRecoveryDetector';

// ── Helpers ──────────────────────────────────────────────────────

function makeIndividual(
	id: string,
	name: string,
	opts: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		id,
		applicantType: 'Individual',
		fullName: name,
		gender: 'male',
		age: '40',
		maritalStatus: 'married',
		...opts
	};
}

function makeCompany(id: string, name: string, type = 'Private Limited'): Record<string, unknown> {
	return {
		id,
		applicantType: 'Company',
		companyName: name,
		companyType: type
	};
}

// ══════════════════════════════════════════════════════════════════
// findLiveMatches
// ══════════════════════════════════════════════════════════════════

describe('findLiveMatches', () => {
	it('returns match when same Individual name exists', () => {
		const applicants = [makeIndividual('a1', 'Ravi Kumar')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi kumar' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(1);
		expect(result[0].matchSource).toBe('live');
		expect(result[0].liveIndex).toBe(0);
		expect(result[0].displayName).toBe('Ravi Kumar');
	});

	it('skips editing index (self-match prevention)', () => {
		const applicants = [makeIndividual('a1', 'Ravi')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: 0,
			applicants
		});
		expect(result).toHaveLength(0);
	});

	it('returns empty for names shorter than 2 chars', () => {
		const applicants = [makeIndividual('a1', 'Ra')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'r' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(0);
	});

	it('marks director-linked applicants with badge data', () => {
		const company = makeCompany('c1', 'Acme Pvt Ltd');
		const director = makeIndividual('a1', 'Ravi', {
			linkedCompanyId: 'c1',
			linkedCompanyIds: ['c1']
		});
		const applicants = [company, director];

		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});

		expect(result).toHaveLength(1);
		expect(result[0].isDirectorLinked).toBe(true);
		expect(result[0].linkedCompanyName).toBe('Acme Pvt Ltd');
	});

	it('does not match across applicant types', () => {
		const applicants = [makeCompany('c1', 'Ravi Enterprises')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(0);
	});

	it('matches Company names for Company applicant type', () => {
		const applicants = [makeCompany('c1', 'Acme Corp')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Company', companyName: 'acme corp' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(1);
		expect(result[0].matchSource).toBe('live');
	});

	it('matches partial names (startsWith)', () => {
		const applicants = [makeIndividual('a1', 'Ravi Kumar Singh')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(1);
	});

	it('does not match via includes — strict prefix only', () => {
		// "kumar" does NOT startsWith "ravi kumar" — no match
		const applicants = [makeIndividual('a1', 'Kumar')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi kumar' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(0);
	});

	it('returns multiple matches when several applicants match', () => {
		const applicants = [
			makeIndividual('a1', 'Ravi Kumar', { age: '40' }),
			makeIndividual('a2', 'Ravi Sharma', { age: '35' })
		];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result).toHaveLength(2);
		expect(result[0].liveIndex).toBe(0);
		expect(result[1].liveIndex).toBe(1);
	});

	it('builds summary from existing income entries', () => {
		const applicants = [
			makeIndividual('a1', 'Ravi', {
				incomeEntries: [
					{ entityName: 'TCS', profileType: 'salaried_regular' },
					{ entityName: 'Rental', profileType: 'rental_income' }
				]
			})
		];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result[0].summary?.totalActiveIncomeSources).toBe(2);
		expect(result[0].summary?.incomeSources[0].entityName).toBe('TCS');
	});

	it('uses applicant.id as uuid', () => {
		const applicants = [makeIndividual('uuid-123', 'Ravi')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result[0].uuid).toBe('uuid-123');
	});

	it('non-director-linked applicant has isDirectorLinked false', () => {
		const applicants = [makeIndividual('a1', 'Ravi')];
		const result = findLiveMatches({
			formApplicant: { applicantType: 'Individual', fullName: 'ravi' },
			editingIndex: null,
			applicants
		});
		expect(result[0].isDirectorLinked).toBe(false);
	});
});
