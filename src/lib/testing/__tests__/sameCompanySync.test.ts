/**
 * Tests for sameCompanySync.ts — Cross-applicant same-company detection and sync
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	normalizeEntityName,
	buildLinkedEntityKey,
	findSameCompanyMatch,
	extractCompanySpecifics,
	applyCompanySpecifics,
	syncLinkedEntriesAcrossApplicants,
	stampLinkedKeyOnEntry,
	getLinkedShareholdings,
	validateLinkedCompanyStake,
	validateLinkedOpcDirectorCount,
	validateLinkedEntries,
	validateCompanyOwnershipTotals,
	COMPANY_LEVEL_KEYS,
	LINKABLE_PROFILE_TYPES
} from '$lib/utils/sameCompanySync';
import type { IncomeSourceEntry } from '$lib/types/incomeProfile';

// ── Helpers ──────────────────────────────────────────────────────

function makeEntry(overrides: Partial<IncomeSourceEntry> = {}): IncomeSourceEntry {
	return {
		id: 'e1',
		profileType: 'director_company',
		entityName: 'Test Company',
		specifics: {},
		income: {},
		evidence: { itrFiled: false, hasDocumentaryEvidence: false },
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		filledBy: 'dsa',
		...overrides
	};
}

function makeApplicant(
	name: string,
	entries: IncomeSourceEntry[] = [],
	type = 'Individual'
): Record<string, unknown> {
	return {
		id: `id_${name.toLowerCase()}`,
		applicantType: type,
		fullName: name,
		incomeEntries: entries
	};
}

// ══════════════════════════════════════════════════════════════════
// normalizeEntityName
// ══════════════════════════════════════════════════════════════════

describe('normalizeEntityName', () => {
	it('lowercases and trims', () => {
		expect(normalizeEntityName('  Acme Pvt Ltd  ')).toBe('acme pvt ltd');
	});

	it('collapses multiple spaces', () => {
		expect(normalizeEntityName('XYZ   Tech    Ltd')).toBe('xyz tech ltd');
	});

	it('handles null/undefined safely', () => {
		expect(normalizeEntityName(null as any)).toBe('');
		expect(normalizeEntityName(undefined as any)).toBe('');
	});

	it('handles empty string', () => {
		expect(normalizeEntityName('')).toBe('');
	});
});

// ══════════════════════════════════════════════════════════════════
// buildLinkedEntityKey
// ══════════════════════════════════════════════════════════════════

describe('buildLinkedEntityKey', () => {
	it('builds key from name and profile type', () => {
		expect(buildLinkedEntityKey('Acme Pvt Ltd', 'director_company')).toBe(
			'acme pvt ltd|director_company'
		);
	});

	it('normalizes the entity name', () => {
		expect(buildLinkedEntityKey('  ACME  PVT  LTD  ', 'director_company')).toBe(
			'acme pvt ltd|director_company'
		);
	});
});

// ══════════════════════════════════════════════════════════════════
// findSameCompanyMatch
// ══════════════════════════════════════════════════════════════════

describe('findSameCompanyMatch', () => {
	it('finds match in another applicant', () => {
		const applicants = [
			makeApplicant('Ashish', [makeEntry({ id: 'e1', entityName: 'DigitalDSA' })]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('DigitalDSA', 'director_company', 1, applicants);
		expect(match).not.toBeNull();
		expect(match!.applicantName).toBe('Ashish');
		expect(match!.applicantIndex).toBe(0);
		expect(match!.entry.id).toBe('e1');
	});

	it('matching is case-insensitive', () => {
		const applicants = [
			makeApplicant('Ashish', [makeEntry({ entityName: 'DigitalDSA' })]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('digitaldsa', 'director_company', 1, applicants);
		expect(match).not.toBeNull();
	});

	it('returns null when no match exists', () => {
		const applicants = [
			makeApplicant('Ashish', [makeEntry({ entityName: 'CompanyA' })]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('CompanyB', 'director_company', 1, applicants);
		expect(match).toBeNull();
	});

	it('skips current applicant (no self-match)', () => {
		const applicants = [makeApplicant('Ashish', [makeEntry({ entityName: 'SameCo' })])];

		const match = findSameCompanyMatch('SameCo', 'director_company', 0, applicants);
		expect(match).toBeNull();
	});

	it('does NOT match across different profile types', () => {
		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({ entityName: 'XYZ', profileType: 'business_partnership' })
			]),
			makeApplicant('Kashish', [])
		];

		// Looking for director_company but other applicant has business_partnership
		const match = findSameCompanyMatch('XYZ', 'director_company', 1, applicants);
		expect(match).toBeNull();
	});

	it('skips Company applicants (only Individual has personal income)', () => {
		const applicants = [
			makeApplicant('Acme Corp', [makeEntry({ entityName: 'SameCo' })], 'Company'),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('SameCo', 'director_company', 1, applicants);
		expect(match).toBeNull();
	});

	it('returns null for non-linkable profile types', () => {
		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({ entityName: 'Govt', profileType: 'salaried_regular' as any })
			]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('Govt', 'salaried_regular', 1, applicants);
		expect(match).toBeNull();
	});

	it('returns null for short names (< 2 chars)', () => {
		const applicants = [
			makeApplicant('Ashish', [makeEntry({ entityName: 'A' })]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('A', 'director_company', 1, applicants);
		expect(match).toBeNull();
	});

	it('skips directors of the same Company co-applicant (linkedCompanyId match)', () => {
		// Two directors both linked to the same Company — no sync dialog needed
		const companyId = 'company-abc-123';
		const applicants = [
			{
				...makeApplicant('Ashish', [makeEntry({ entityName: 'ABC Corp' })]),
				linkedCompanyId: companyId
			},
			{ ...makeApplicant('Kashish', []), linkedCompanyId: companyId }
		];

		const match = findSameCompanyMatch('ABC Corp', 'director_company', 1, applicants);
		expect(match).toBeNull();
	});

	it('still matches when directors are linked to DIFFERENT companies', () => {
		// Two directors from different companies happen to type the same name
		const applicants = [
			{
				...makeApplicant('Ashish', [makeEntry({ entityName: 'ABC Corp' })]),
				linkedCompanyId: 'company-1'
			},
			{ ...makeApplicant('Kashish', []), linkedCompanyId: 'company-2' }
		];

		const match = findSameCompanyMatch('ABC Corp', 'director_company', 1, applicants);
		expect(match).not.toBeNull();
		expect(match!.applicantName).toBe('Ashish');
	});

	it('still matches standalone Individuals (no linkedCompanyId)', () => {
		// Two standalone Individuals both typing same company name — dialog should appear
		const applicants = [
			makeApplicant('Ashish', [makeEntry({ entityName: 'ABC Corp' })]),
			makeApplicant('Kashish', [])
		];

		const match = findSameCompanyMatch('ABC Corp', 'director_company', 1, applicants);
		expect(match).not.toBeNull();
	});

	it('matches when only one has linkedCompanyId (mixed scenario)', () => {
		// One director linked to a company, one standalone Individual
		const applicants = [
			{
				...makeApplicant('Ashish', [makeEntry({ entityName: 'ABC Corp' })]),
				linkedCompanyId: 'company-1'
			},
			makeApplicant('Kashish', []) // no linkedCompanyId
		];

		const match = findSameCompanyMatch('ABC Corp', 'director_company', 1, applicants);
		expect(match).not.toBeNull();
	});
});

// ══════════════════════════════════════════════════════════════════
// extractCompanySpecifics / applyCompanySpecifics
// ══════════════════════════════════════════════════════════════════

describe('extractCompanySpecifics', () => {
	it('extracts only company-level keys', () => {
		const specifics = {
			registeredInIndia: true,
			companyType: 'pvt_ltd',
			companyProfitable: true,
			companySharesFinancials: true,
			// Person-level — should NOT be extracted
			hasEquity: true,
			designation: 'md',
			shareholding: 50
		};

		const result = extractCompanySpecifics(specifics);
		expect(result.registeredInIndia).toBe(true);
		expect(result.companyType).toBe('pvt_ltd');
		expect(result.companyProfitable).toBe(true);
		expect(result.companySharesFinancials).toBe(true);
		// Person-level should be absent
		expect(result).not.toHaveProperty('hasEquity');
		expect(result).not.toHaveProperty('designation');
		expect(result).not.toHaveProperty('shareholding');
	});

	it('handles empty specifics', () => {
		expect(extractCompanySpecifics({})).toEqual({});
	});
});

describe('applyCompanySpecifics', () => {
	it('merges company fields while preserving person fields', () => {
		const target = {
			designation: 'md',
			shareholding: 30,
			companyProfitable: false // will be overwritten
		};
		const source = {
			companyProfitable: true,
			companySharesFinancials: true,
			shareholding: 50 // person-level in source — should NOT overwrite
		};

		const result = applyCompanySpecifics(target, source);
		expect(result.designation).toBe('md'); // preserved
		expect(result.shareholding).toBe(30); // preserved (person-level)
		expect(result.companyProfitable).toBe(true); // synced from source
		expect(result.companySharesFinancials).toBe(true); // added from source
	});
});

// ══════════════════════════════════════════════════════════════════
// syncLinkedEntriesAcrossApplicants
// ══════════════════════════════════════════════════════════════════

describe('syncLinkedEntriesAcrossApplicants', () => {
	it('returns same reference when no linked entries exist', () => {
		const applicants = [
			makeApplicant('A', [makeEntry({ id: 'e1' })]),
			makeApplicant('B', [makeEntry({ id: 'e2' })])
		];

		const result = syncLinkedEntriesAcrossApplicants(applicants);
		expect(result).toBe(applicants); // same reference = no changes
	});

	it('syncs company specifics from most recently updated entry', () => {
		const key = 'digitaldsa|director_company';
		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({
					id: 'e1',
					entityName: 'DigitalDSA',
					linkedEntityKey: key,
					specifics: { companyProfitable: false },
					updatedAt: '2026-01-01T00:00:00Z'
				})
			]),
			makeApplicant('Kashish', [
				makeEntry({
					id: 'e2',
					entityName: 'DigitalDSA',
					linkedEntityKey: key,
					specifics: { companyProfitable: true },
					updatedAt: '2026-01-02T00:00:00Z' // more recent
				})
			])
		];

		const result = syncLinkedEntriesAcrossApplicants(applicants);
		expect(result).not.toBe(applicants); // new reference = changes made

		// Ashish's entry should now have companyProfitable: true (synced from Kashish)
		const ashishEntries = result[0].incomeEntries as IncomeSourceEntry[];
		expect(ashishEntries[0].specifics.companyProfitable).toBe(true);
	});

	it('does not modify person-level fields during sync', () => {
		const key = 'digitaldsa|director_company';
		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: key,
					specifics: { companyProfitable: false, designation: 'md', shareholding: 40 },
					updatedAt: '2026-01-01T00:00:00Z'
				})
			]),
			makeApplicant('Kashish', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: key,
					specifics: { companyProfitable: true, designation: 'director', shareholding: 60 },
					updatedAt: '2026-01-02T00:00:00Z'
				})
			])
		];

		const result = syncLinkedEntriesAcrossApplicants(applicants);
		const ashishSpecifics = (result[0].incomeEntries as IncomeSourceEntry[])[0].specifics;
		// Company-level synced
		expect(ashishSpecifics.companyProfitable).toBe(true);
		// Person-level preserved
		expect(ashishSpecifics.designation).toBe('md');
		expect(ashishSpecifics.shareholding).toBe(40);
	});

	it('tie-breaking: identical updatedAt timestamps yield deterministic result (first entry wins)', () => {
		// When two entries share the exact same updatedAt timestamp, the reduce()
		// source-of-truth election uses strict `>` comparison — equal strings are
		// NOT greater, so the first entry in the group array retains the "latest" slot.
		// This test documents that invariant: the outcome must be the same on every run.
		const SAME_TIMESTAMP = '2026-03-15T10:00:00.000Z';
		const key = 'digitaldsa|director_company';

		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: key,
					// Ashish's entry appears first in the group — wins tie, becomes source
					specifics: { companyProfitable: true, companyType: 'pvt_ltd' },
					updatedAt: SAME_TIMESTAMP
				})
			]),
			makeApplicant('Kashish', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: key,
					// Kashish's entry has same timestamp but different company value
					specifics: { companyProfitable: false, companyType: 'pvt_ltd' },
					updatedAt: SAME_TIMESTAMP
				})
			])
		];

		// Run twice — the result must be identical both times (determinism check)
		const result1 = syncLinkedEntriesAcrossApplicants(applicants);
		const result2 = syncLinkedEntriesAcrossApplicants(applicants);

		const ashishEntry1 = (result1[0].incomeEntries as IncomeSourceEntry[])[0];
		const ashishEntry2 = (result2[0].incomeEntries as IncomeSourceEntry[])[0];
		const kashishEntry1 = (result1[1].incomeEntries as IncomeSourceEntry[])[0];
		const kashishEntry2 = (result2[1].incomeEntries as IncomeSourceEntry[])[0];

		// Both runs produce the same winner — determinism confirmed
		expect(ashishEntry1.specifics.companyProfitable).toBe(ashishEntry2.specifics.companyProfitable);
		expect(kashishEntry1.specifics.companyProfitable).toBe(kashishEntry2.specifics.companyProfitable);

		// First entry (Ashish, index 0) wins the tie — Kashish is synced to match Ashish
		expect(ashishEntry1.specifics.companyProfitable).toBe(true); // source: unchanged
		expect(kashishEntry1.specifics.companyProfitable).toBe(true); // synced FROM Ashish
	});

	it('handles groups with more than 2 entries', () => {
		const key = 'digitaldsa|director_company';
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: key,
					specifics: { companyProfitable: false },
					updatedAt: '2026-01-01T00:00:00Z'
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: key,
					specifics: { companyProfitable: false },
					updatedAt: '2026-01-02T00:00:00Z'
				})
			]),
			makeApplicant('C', [
				makeEntry({
					id: 'e3',
					linkedEntityKey: key,
					specifics: { companyProfitable: true },
					updatedAt: '2026-01-03T00:00:00Z' // most recent
				})
			])
		];

		const result = syncLinkedEntriesAcrossApplicants(applicants);
		// A and B should sync from C
		expect((result[0].incomeEntries as IncomeSourceEntry[])[0].specifics.companyProfitable).toBe(
			true
		);
		expect((result[1].incomeEntries as IncomeSourceEntry[])[0].specifics.companyProfitable).toBe(
			true
		);
	});
});

// ══════════════════════════════════════════════════════════════════
// stampLinkedKeyOnEntry
// ══════════════════════════════════════════════════════════════════

describe('stampLinkedKeyOnEntry', () => {
	it('stamps linkedEntityKey on the correct entry', () => {
		const applicants = [
			makeApplicant('Ashish', [
				makeEntry({ id: 'e1', entityName: 'CompanyA' }),
				makeEntry({ id: 'e2', entityName: 'CompanyB' })
			])
		];

		const result = stampLinkedKeyOnEntry(applicants, 0, 'e2', 'companyb|director_company');
		const entries = result[0].incomeEntries as IncomeSourceEntry[];
		expect(entries[0].linkedEntityKey).toBeUndefined(); // e1 unchanged
		expect(entries[1].linkedEntityKey).toBe('companyb|director_company'); // e2 stamped
	});

	it('does not mutate original array', () => {
		const applicants = [makeApplicant('A', [makeEntry({ id: 'e1' })])];
		const result = stampLinkedKeyOnEntry(applicants, 0, 'e1', 'test|key');
		expect(result).not.toBe(applicants);
	});
});

// ══════════════════════════════════════════════════════════════════
// Constants sanity checks
// ══════════════════════════════════════════════════════════════════

describe('constants', () => {
	it('LINKABLE_PROFILE_TYPES contains only director and partner types', () => {
		expect(LINKABLE_PROFILE_TYPES.has('director_company')).toBe(true);
		expect(LINKABLE_PROFILE_TYPES.has('business_partnership')).toBe(true);
		expect(LINKABLE_PROFILE_TYPES.has('salaried_regular' as any)).toBe(false);
	});

	it('COMPANY_LEVEL_KEYS does not include person-level fields', () => {
		expect(COMPANY_LEVEL_KEYS.has('hasEquity')).toBe(false);
		expect(COMPANY_LEVEL_KEYS.has('designation')).toBe(false);
		expect(COMPANY_LEVEL_KEYS.has('shareholding')).toBe(false);
		expect(COMPANY_LEVEL_KEYS.has('capitalContribution')).toBe(false);
		expect(COMPANY_LEVEL_KEYS.has('activeInOperations')).toBe(false);
		expect(COMPANY_LEVEL_KEYS.has('partnerType')).toBe(false);
	});

	it('COMPANY_LEVEL_KEYS includes all company-level fields', () => {
		expect(COMPANY_LEVEL_KEYS.has('registeredInIndia')).toBe(true);
		expect(COMPANY_LEVEL_KEYS.has('companyType')).toBe(true);
		expect(COMPANY_LEVEL_KEYS.has('companyProfitable')).toBe(true);
		expect(COMPANY_LEVEL_KEYS.has('firmType')).toBe(true);
		expect(COMPANY_LEVEL_KEYS.has('firmGstRegistered')).toBe(true);
	});
});

// ══════════════════════════════════════════════════════════════════
// getLinkedShareholdings
// ══════════════════════════════════════════════════════════════════

describe('getLinkedShareholdings', () => {
	const KEY = 'redtape|director_company';

	it('collects shareholding from linked entries across applicants', () => {
		const applicants = [
			makeApplicant('Tulika', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 60 } })
			]),
			makeApplicant('Yashvi', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 40 } })
			])
		];
		const result = getLinkedShareholdings(KEY, applicants);
		expect(result).toHaveLength(2);
		expect(result[0].applicantName).toBe('Tulika');
		expect(result[0].shareholding).toBe(60);
		expect(result[1].applicantName).toBe('Yashvi');
		expect(result[1].shareholding).toBe(40);
	});

	it('returns empty array for empty linkedEntityKey', () => {
		expect(getLinkedShareholdings('', [])).toEqual([]);
	});

	it('handles missing/NaN shareholding as 0', () => {
		const applicants = [
			makeApplicant('A', [makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: {} })]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 'abc' } })
			])
		];
		const result = getLinkedShareholdings(KEY, applicants);
		expect(result[0].shareholding).toBe(0);
		expect(result[1].shareholding).toBe(0);
	});

	it('ignores entries with different linkedEntityKey', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 50 } })
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: 'other|director_company',
					specifics: { shareholding: 30 }
				})
			])
		];
		const result = getLinkedShareholdings(KEY, applicants);
		expect(result).toHaveLength(1);
	});
});

// ══════════════════════════════════════════════════════════════════
// validateLinkedCompanyStake
// ══════════════════════════════════════════════════════════════════

describe('validateLinkedCompanyStake', () => {
	const KEY = 'acme|director_company';

	it('flags PvtLtd with total > 100% as invalid', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: KEY,
					specifics: { shareholding: 60, companyType: 'pvt_ltd' }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: KEY,
					specifics: { shareholding: 70, companyType: 'pvt_ltd' }
				})
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result).not.toBeNull();
		expect(result!.total).toBe(130);
		expect(result!.isInvalid).toBe(true);
		expect(result!.warning).toContain('130%');
		expect(result!.warning).toContain('max 100%');
	});

	it('accepts PvtLtd with total ≤ 100%', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 40 } })
			]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 50 } })
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result).not.toBeNull();
		expect(result!.total).toBe(90);
		expect(result!.isInvalid).toBe(false);
		expect(result!.warning).toBe('');
	});

	it('accepts total of exactly 100%', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 50 } })
			]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 50 } })
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result!.isInvalid).toBe(false);
	});

	it('flags partnership with total > 100%', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 60 } })
			]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 60 } })
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result!.total).toBe(120);
		expect(result!.isInvalid).toBe(true);
	});

	it('returns null when fewer than 2 linked entries', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 50 } })
			])
		];
		expect(validateLinkedCompanyStake(KEY, applicants)).toBeNull();
	});

	it('handles 3 applicants at same company', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 40 } })
			]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 30 } })
			]),
			makeApplicant('C', [
				makeEntry({ id: 'e3', linkedEntityKey: KEY, specifics: { shareholding: 35 } })
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result!.total).toBe(105);
		expect(result!.isInvalid).toBe(true);
		expect(result!.breakdown).toHaveLength(3);
	});

	it('includes all names in warning breakdown', () => {
		const applicants = [
			makeApplicant('Tulika', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { shareholding: 100 } })
			]),
			makeApplicant('Yashvi', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { shareholding: 100 } })
			])
		];
		const result = validateLinkedCompanyStake(KEY, applicants);
		expect(result!.warning).toContain('Tulika');
		expect(result!.warning).toContain('Yashvi');
		expect(result!.warning).toContain('200%');
	});
});

// ══════════════════════════════════════════════════════════════════
// validateLinkedOpcDirectorCount
// ══════════════════════════════════════════════════════════════════

describe('validateLinkedOpcDirectorCount', () => {
	const KEY = 'myopc|director_company';

	it('flags OPC with 2 directors as invalid', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			])
		];
		const result = validateLinkedOpcDirectorCount(KEY, applicants);
		expect(result).not.toBeNull();
		expect(result!.isInvalid).toBe(true);
		expect(result!.warning).toContain('OPC');
		expect(result!.directorNames).toEqual(['A', 'B']);
	});

	it('returns null for single OPC entry (no conflict)', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { companyType: 'opc' } })
			])
		];
		expect(validateLinkedOpcDirectorCount(KEY, applicants)).toBeNull();
	});

	it('returns null for PvtLtd with 2 directors (OPC rule does not apply)', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({ id: 'e1', linkedEntityKey: KEY, specifics: { companyType: 'pvt_ltd' } })
			]),
			makeApplicant('B', [
				makeEntry({ id: 'e2', linkedEntityKey: KEY, specifics: { companyType: 'pvt_ltd' } })
			])
		];
		expect(validateLinkedOpcDirectorCount(KEY, applicants)).toBeNull();
	});

	it('returns null for empty key', () => {
		expect(validateLinkedOpcDirectorCount('', [])).toBeNull();
	});

	it('flags OPC even when second applicant entry is unlinked (same name match)', () => {
		// Applicant A has a linked OPC entry. Applicant B entered the same company name
		// but hasn't confirmed the sync dialog yet (no linkedEntityKey set).
		// The validation should still catch this via entity name matching.
		// KEY format is "normalizedname|profiletype" — use matching entity name
		const OPC_KEY = 'myopc|director_company';
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					entityName: 'MyOPC',
					linkedEntityKey: OPC_KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					entityName: 'MyOPC',
					// No linkedEntityKey — not yet linked
					linkedEntityKey: undefined as unknown as string,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			])
		];
		const result = validateLinkedOpcDirectorCount(OPC_KEY, applicants);
		expect(result).not.toBeNull();
		expect(result!.isInvalid).toBe(true);
		expect(result!.directorNames).toContain('A');
		expect(result!.directorNames).toContain('B');
	});

	it('does not double-count an entry that is both linked and name-matched', () => {
		// Both entries share the same linkedEntityKey — should not appear twice
		const OPC_KEY = 'myopc|director_company';
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					entityName: 'MyOPC',
					linkedEntityKey: OPC_KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					entityName: 'MyOPC',
					linkedEntityKey: OPC_KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			])
		];
		const result = validateLinkedOpcDirectorCount(OPC_KEY, applicants);
		expect(result).not.toBeNull();
		// Should be exactly 2, not 3 or 4
		expect(result!.directorNames).toHaveLength(2);
	});
});

// ══════════════════════════════════════════════════════════════════
// validateLinkedEntries (aggregate)
// ══════════════════════════════════════════════════════════════════

describe('validateLinkedEntries', () => {
	const KEY = 'corp|director_company';

	it('returns both warnings when OPC + stake exceeded', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: KEY,
					specifics: { companyType: 'opc', shareholding: 100 }
				})
			])
		];
		const result = validateLinkedEntries(KEY, applicants);
		expect(result.hasAnyWarning).toBe(true);
		expect(result.stakeWarning).toContain('200%');
		expect(result.opcWarning).toContain('OPC');
	});

	it('returns no warnings when valid', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: KEY,
					specifics: { companyType: 'pvt_ltd', shareholding: 40 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: KEY,
					specifics: { companyType: 'pvt_ltd', shareholding: 30 }
				})
			])
		];
		const result = validateLinkedEntries(KEY, applicants);
		expect(result.hasAnyWarning).toBe(false);
		expect(result.stakeWarning).toBe('');
		expect(result.opcWarning).toBe('');
	});

	it('returns only stake warning for PvtLtd over 100%', () => {
		const applicants = [
			makeApplicant('A', [
				makeEntry({
					id: 'e1',
					linkedEntityKey: KEY,
					specifics: { companyType: 'pvt_ltd', shareholding: 60 }
				})
			]),
			makeApplicant('B', [
				makeEntry({
					id: 'e2',
					linkedEntityKey: KEY,
					specifics: { companyType: 'pvt_ltd', shareholding: 60 }
				})
			])
		];
		const result = validateLinkedEntries(KEY, applicants);
		expect(result.hasAnyWarning).toBe(true);
		expect(result.stakeWarning).toContain('120%');
		expect(result.opcWarning).toBe('');
	});
});

// ─────────────────────────────────────────────────────────────────
// validateCompanyOwnershipTotals (Company applicant + linked Individuals)
// ─────────────────────────────────────────────────────────────────

describe('validateCompanyOwnershipTotals', () => {
	function makeCompany(id: string, name: string): Record<string, unknown> {
		return {
			id,
			applicantType: 'Company',
			companyName: name,
			companyType: 'pvt_ltd'
		};
	}

	function makeIndividual(
		name: string,
		ownershipPercent: number | string,
		linkedCompanyIds: string[] = [],
		primaryLink?: string
	): Record<string, unknown> {
		return {
			id: `ind-${name}`,
			applicantType: 'Individual',
			fullName: name,
			ownershipPercent,
			linkedCompanyIds,
			...(primaryLink ? { linkedCompanyId: primaryLink } : {})
		};
	}

	it('returns empty list when no Companies exist', () => {
		const result = validateCompanyOwnershipTotals([
			makeIndividual('A', 50, []),
			makeIndividual('B', 50, [])
		]);
		expect(result).toEqual([]);
	});

	it('returns empty list when total ownership is at or below 100%', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('A', 60, ['co1']),
			makeIndividual('B', 40, ['co1'])
		]);
		expect(result).toEqual([]);
	});

	it('flags the user-reported 200% case (four 50% individuals linked to the same company)', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('radhika', 50, ['co1']),
			makeIndividual('kashish', 50, ['co1']),
			makeIndividual('prince', 50, ['co1']),
			makeIndividual('shruti', 50, ['co1'])
		]);
		expect(result).toHaveLength(1);
		expect(result[0].companyName).toBe('traders');
		expect(result[0].total).toBe(200);
		expect(result[0].breakdown).toHaveLength(4);
		expect(result[0].message).toContain('200%');
		expect(result[0].message).toContain('radhika 50%');
		expect(result[0].message).toContain('shruti 50%');
	});

	it('treats primary linkedCompanyId as a link (legacy path)', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('A', 70, [], 'co1'),
			makeIndividual('B', 40, [], 'co1')
		]);
		expect(result).toHaveLength(1);
		expect(result[0].total).toBe(110);
	});

	it('ignores Individuals not linked to the company', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('A', 60, ['co1']),
			// Linked to a different company id — must not count
			makeIndividual('B', 80, ['co-other'])
		]);
		expect(result).toEqual([]);
	});

	it('flags each Company independently when several exist', () => {
		const result = validateCompanyOwnershipTotals([
			makeCompany('co1', 'Alpha'),
			makeCompany('co2', 'Beta'),
			makeIndividual('A', 80, ['co1']),
			makeIndividual('B', 60, ['co1']),
			makeIndividual('C', 50, ['co2']),
			makeIndividual('D', 40, ['co2'])
		]);
		expect(result).toHaveLength(1);
		expect(result[0].companyName).toBe('Alpha');
		expect(result[0].total).toBe(140);
	});

	it('handles ownership stored as string', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('A', '70', ['co1']),
			makeIndividual('B', '50', ['co1'])
		]);
		expect(result).toHaveLength(1);
		expect(result[0].total).toBe(120);
	});

	it('skips Individuals with zero or missing ownership', () => {
		const company = makeCompany('co1', 'traders');
		const result = validateCompanyOwnershipTotals([
			company,
			makeIndividual('A', 60, ['co1']),
			makeIndividual('B', 50, ['co1']),
			makeIndividual('C', 0, ['co1']),
			{
				id: 'ind-D',
				applicantType: 'Individual',
				fullName: 'D',
				linkedCompanyIds: ['co1']
				// ownershipPercent omitted
			} as Record<string, unknown>
		]);
		// 60 + 50 = 110 (>100), zero and missing skipped
		expect(result).toHaveLength(1);
		expect(result[0].total).toBe(110);
		expect(result[0].breakdown).toHaveLength(2);
	});
});
