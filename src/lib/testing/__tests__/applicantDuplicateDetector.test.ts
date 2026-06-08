/**
 * Applicant Duplicate Detector Tests
 * ═══════════════════════════════════════════════════════════════════
 * Tests for findDuplicateApplicants() and getDuplicateErrorMessage(),
 * including company-linked Individual skip logic.
 * ═══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
	findDuplicateApplicants,
	getDuplicateErrorMessage
} from '$lib/utils/applicantDuplicateDetector';
import type { LegacyApplicant } from '$lib/stores/loanData';

// ── Test Helpers ──────────────────────────────────────────────────

function makeIndividual(overrides: Record<string, unknown> = {}): LegacyApplicant {
	return {
		id: 'ind-' + Math.random().toString(36).slice(2),
		applicantType: 'Individual',
		fullName: 'Rahul Kumar',
		age: '35',
		gender: 'Male',
		...overrides
	} as LegacyApplicant;
}

function makeCompany(overrides: Record<string, unknown> = {}): LegacyApplicant {
	return {
		id: 'comp-' + Math.random().toString(36).slice(2),
		applicantType: 'Company',
		companyName: 'Acme Corp',
		companyType: 'Private Limited',
		businessType: 'services',
		...overrides
	} as LegacyApplicant;
}

// ═══════════════════════════════════════════════════════════════════
// Basic duplicate detection
// ═══════════════════════════════════════════════════════════════════

describe('findDuplicateApplicants — basic', () => {
	it('detects duplicate individuals by name+age+gender', () => {
		const applicants = [
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male' }),
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male' })
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(2);
		expect(dups.has(0)).toBe(true);
		expect(dups.has(1)).toBe(true);
	});

	it('does not flag different individuals', () => {
		const applicants = [
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male' }),
			makeIndividual({ fullName: 'Priya', age: '28', gender: 'Female' })
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(0);
	});

	it('does not flag individuals vs companies', () => {
		const applicants = [
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male' }),
			makeCompany({})
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(0);
	});

	it('detects duplicate companies', () => {
		const applicants = [
			makeCompany({ companyName: 'Acme', companyType: 'LLP', businessType: 'trading' }),
			makeCompany({ companyName: 'Acme', companyType: 'LLP', businessType: 'trading' })
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(2);
	});
});

// ═══════════════════════════════════════════════════════════════════
// Company-linked Individual skip logic
// ═══════════════════════════════════════════════════════════════════

describe('findDuplicateApplicants — company-linked skip', () => {
	it('does NOT flag two director-linked Individuals as duplicates', () => {
		const applicants = [
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male',
				linkedCompanyId: 'comp-A'
			}),
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male',
				linkedCompanyId: 'comp-B'
			})
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(0);
	});

	it('does NOT flag a director-linked Individual vs standalone Individual', () => {
		const applicants = [
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male',
				linkedCompanyId: 'comp-A'
			}),
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male'
				// no linkedCompanyId
			})
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(0); // one is linked, skip
	});

	it('still flags two standalone Individuals as duplicates', () => {
		const applicants = [
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male'
			}),
			makeIndividual({
				fullName: 'Rahul Kumar',
				age: '35',
				gender: 'Male'
			})
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(2);
	});

	it('company duplicates unaffected by linkedCompanyId skip', () => {
		const applicants = [
			makeCompany({ companyName: 'Acme', companyType: 'LLP', businessType: 'trading' }),
			makeCompany({ companyName: 'Acme', companyType: 'LLP', businessType: 'trading' })
		];
		const dups = findDuplicateApplicants(applicants);
		expect(dups.size).toBe(2); // company dups still flagged
	});

	it('handles mix of linked and unlinked individuals correctly', () => {
		const applicants = [
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male', linkedCompanyId: 'c1' }),
			makeIndividual({ fullName: 'Rahul', age: '30', gender: 'Male' }),
			makeIndividual({ fullName: 'Priya', age: '28', gender: 'Female' }),
			makeIndividual({ fullName: 'Priya', age: '28', gender: 'Female' })
		];
		const dups = findDuplicateApplicants(applicants);
		// Rahul pair: one is linked → skip
		// Priya pair: both standalone → flagged
		expect(dups.size).toBe(2);
		expect(dups.has(2)).toBe(true);
		expect(dups.has(3)).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════
// getDuplicateErrorMessage
// ═══════════════════════════════════════════════════════════════════

describe('getDuplicateErrorMessage', () => {
	it('returns empty for no duplicates', () => {
		expect(getDuplicateErrorMessage(new Set(), [])).toBe('');
	});

	it('returns individual-specific message', () => {
		const applicants = [
			makeIndividual({ fullName: 'Rahul' }),
			makeIndividual({ fullName: 'Rahul' })
		];
		const msg = getDuplicateErrorMessage(new Set([0, 1]), applicants);
		expect(msg).toContain('name, age and gender');
	});

	it('returns company-specific message', () => {
		const applicants = [makeCompany({}), makeCompany({})];
		const msg = getDuplicateErrorMessage(new Set([0, 1]), applicants);
		expect(msg).toContain('company name, type and business type');
	});
});
