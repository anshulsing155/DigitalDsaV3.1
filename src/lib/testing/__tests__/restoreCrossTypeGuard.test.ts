/**
 * Tests for the cross-type / cross-companyType restore guard (Pitfall #32).
 *
 * Reproduces the user-reported S104 scenario:
 *   1. User in Business Loan picked OPC.
 *   2. Typed in Company Name field; system surfaced an Individual record by name.
 *   3. User clicked Restore; nothing appeared in the form (field-key mismatch:
 *      Company form reads `companyName`, Individual data has `fullName`).
 *   4. User typed manually. On the next page, the restored Individual showed
 *      up as a SEPARATE applicant (ghost) alongside the manually-entered OPC.
 *
 * Root cause: `prefillApplicantRestore` only guarded against type mismatches
 * when `existingSlot.applicantType` was known. For a push-new restore
 * (currentIndex === applicants.length), no existing slot meant no guard
 * fired — the Individual got pushed silently.
 *
 * Fix: caller passes `slotApplicantType` (and `slotCompanyType` for Companies)
 * via restoreIntent, and the guard cross-checks against `match.data.*`.
 */

import { describe, it, expect } from 'vitest';
import { filterCrossLoanMatches } from '$lib/utils/recoveryCompatibility';
import type { RecoverableApplicant } from '$lib/state/applicant.svelte';

function makeRecoverable(
	overrides: Partial<RecoverableApplicant> = {}
): RecoverableApplicant {
	return {
		uuid: 'u1',
		displayName: 'Test',
		matchSignature: 'sig',
		deletedAt: Date.now(),
		applicantType: 'Individual',
		fullName: 'qwerty',
		age: '30',
		gender: 'Male',
		maritalStatus: 'Single',
		employmentType: 'salaried_regular',
		recoveryScope: 'business::individual',
		data: {},
		...overrides
	} as RecoverableApplicant;
}

describe('filterCrossLoanMatches — companyType sub-filter', () => {
	it('returns Individual matches when filling an Individual slot', () => {
		const entries = [
			makeRecoverable({ uuid: 'i1', applicantType: 'Individual', fullName: 'qwerty' }),
			makeRecoverable({
				uuid: 'c1',
				applicantType: 'Company',
				companyName: 'qwerty',
				companyType: 'One Person Company (OPC)'
			})
		];
		const result = filterCrossLoanMatches(
			entries,
			'secured::individual',
			'business',
			'qwerty',
			'Individual'
		);
		expect(result.length).toBe(1);
		expect(result[0].uuid).toBe('i1');
	});

	it('returns ONLY same-companyType matches when filling a Company slot', () => {
		const entries = [
			makeRecoverable({
				uuid: 'opc1',
				applicantType: 'Company',
				companyName: 'qwerty',
				companyType: 'One Person Company (OPC)',
				recoveryScope: 'business::company'
			}),
			makeRecoverable({
				uuid: 'pvt1',
				applicantType: 'Company',
				companyName: 'qwerty industries',
				companyType: 'Private Limited',
				recoveryScope: 'secured::company'
			}),
			makeRecoverable({
				uuid: 'llp1',
				applicantType: 'Company',
				companyName: 'qwerty llp',
				companyType: 'LLP',
				recoveryScope: 'secured::company'
			})
		];
		const result = filterCrossLoanMatches(
			entries,
			'secured::company',
			'business',
			'qwerty',
			'Company',
			'One Person Company (OPC)'
		);
		// Only the OPC entry passes — Pvt Ltd and LLP filtered out by companyType
		expect(result.map((r) => r.uuid).sort()).toEqual(['opc1']);
	});

	it('falls back to permissive when slot companyType is empty (early-flow safety)', () => {
		const entries = [
			makeRecoverable({
				uuid: 'opc1',
				applicantType: 'Company',
				companyName: 'qwerty',
				companyType: 'One Person Company (OPC)',
				recoveryScope: 'secured::company'
			}),
			makeRecoverable({
				uuid: 'pvt1',
				applicantType: 'Company',
				companyName: 'qwerty',
				companyType: 'Private Limited',
				recoveryScope: 'secured::company'
			})
		];
		// No slot companyType passed (empty) → both Company matches surface
		const result = filterCrossLoanMatches(
			entries,
			'business::company',
			'business',
			'qwerty',
			'Company',
			'' // empty companyType
		);
		expect(result.length).toBe(2);
	});

	it('user-reported scenario: typing into OPC Company Name surfaces ONLY OPC matches', () => {
		// Recovery bin has 2 records both named "qw":
		// - One Person Company (OPC) "qw" from a prior Business Loan
		// - Individual "qwerty" from a prior Business Loan
		// User now fills a fresh Business Loan, picks OPC, types "qw".
		const recoveryBin = [
			makeRecoverable({
				uuid: 'opc-qw',
				applicantType: 'Company',
				companyName: 'qw',
				companyType: 'One Person Company (OPC)',
				recoveryScope: 'professional::company' // different scope to surface as cross-loan
			}),
			makeRecoverable({
				uuid: 'ind-qwerty',
				applicantType: 'Individual',
				fullName: 'qwerty',
				recoveryScope: 'professional::individual'
			})
		];
		const result = filterCrossLoanMatches(
			recoveryBin,
			'business::company',
			'business',
			'qw',
			'Company',
			'One Person Company (OPC)'
		);
		// Only the OPC company. The Individual is filtered out by applicantType,
		// and a hypothetical Pvt Ltd "qw" would be filtered by companyType.
		expect(result.length).toBe(1);
		expect(result[0].uuid).toBe('opc-qw');
	});
});
