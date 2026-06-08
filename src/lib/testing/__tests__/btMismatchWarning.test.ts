/**
 * Tests for `computeBtRoleMismatchWarning` — BT applicant-structure role-distribution.
 *
 * Reproduces CLAUDE.md Pitfall #34: pre-S104 the BT structure validator only
 * compared total count. A user who declared 1 borrower + 0 co-applicants +
 * 1 guarantor could add 2 Co-Applicants and the count check passed silently —
 * no applicant was actually marked as Guarantor.
 *
 * The pure helper takes a `isGuarantorFn` so the test doesn't depend on the
 * full classification system; the production wiring passes `isGuarantorApplicant`
 * from this same module.
 */

import { describe, it, expect } from 'vitest';
import { computeBtRoleMismatchWarning } from '$lib/utils/applicantRoleValidation';
import type { LegacyApplicant } from '$lib/stores/loanData';

// Minimal test applicants — only the role-classification fields matter.
function makeCoApp(overrides: Partial<LegacyApplicant> = {}): LegacyApplicant {
	return {
		applicantType: 'Individual',
		fullName: 'Co-App',
		isGuarantor: 'No',
		onProperty: true,
		onEMI: true,
		applicantClassification: 'borrower_full_financial',
		...overrides
	} as LegacyApplicant;
}

function makeGuarantor(overrides: Partial<LegacyApplicant> = {}): LegacyApplicant {
	return {
		applicantType: 'Individual',
		fullName: 'Guarantor',
		isGuarantor: 'Yes',
		onProperty: false,
		onEMI: false,
		applicantClassification: 'guarantor_financial',
		...overrides
	} as LegacyApplicant;
}

// Test classifier — uses applicantClassification when present, falls back to legacy.
const isGuarantorFn = (a: LegacyApplicant): boolean => {
	const c = (a as Record<string, unknown>).applicantClassification as string | undefined;
	if (c?.startsWith('guarantor_')) return true;
	return a.isGuarantor === 'Yes' && !a.onProperty && !a.onEMI;
};

describe('computeBtRoleMismatchWarning', () => {
	it('returns "" when typed array is empty', () => {
		expect(computeBtRoleMismatchWarning([], 0, 1, isGuarantorFn)).toBe('');
	});

	it('returns "" when role distribution matches the declaration (1 guarantor declared, 1 marked)', () => {
		const applicants = [makeCoApp(), makeGuarantor()];
		expect(computeBtRoleMismatchWarning(applicants, 0, 1, isGuarantorFn)).toBe('');
	});

	it('returns "" when no guarantor declared and none marked', () => {
		const applicants = [makeCoApp(), makeCoApp({ fullName: 'CoApp2' })];
		expect(computeBtRoleMismatchWarning(applicants, 1, 0, isGuarantorFn)).toBe('');
	});

	// Core regression — exact user-reported scenario from the screenshots
	it('flags the user-reported LAP-BT scenario: 1 guarantor declared, 0 marked', () => {
		// User added shalini + shalu, both as Co-Applicant (Financial) — neither
		// is marked Guarantor, but the structure section says 1 guarantor.
		const applicants = [
			makeCoApp({ fullName: 'shalini' }),
			makeCoApp({ fullName: 'shalu' })
		];
		const warning = computeBtRoleMismatchWarning(applicants, 0, 1, isGuarantorFn);
		expect(warning).not.toBe('');
		expect(warning).toContain('1 guarantor');
		expect(warning).toContain('no applicant is marked as Guarantor');
		expect(warning).toContain('Edit one applicant');
	});

	it('flags the reverse: 0 guarantors declared but applicant marked as Guarantor', () => {
		const applicants = [makeCoApp(), makeGuarantor()];
		const warning = computeBtRoleMismatchWarning(applicants, 1, 0, isGuarantorFn);
		expect(warning).not.toBe('');
		expect(warning).toContain('No guarantor declared');
		expect(warning).toContain('1 applicant is marked as Guarantor');
	});

	it('flags numeric mismatch when both sides have guarantors but counts differ', () => {
		// Declared 2 guarantors, only 1 actually marked
		const applicants = [makeCoApp(), makeGuarantor(), makeCoApp({ fullName: 'CoApp2' })];
		const warning = computeBtRoleMismatchWarning(applicants, 0, 2, isGuarantorFn);
		expect(warning).not.toBe('');
		expect(warning).toContain('2 guarantors');
		expect(warning).toContain('1 guarantor');
	});

	it('handles plural / singular grammar in messages', () => {
		// Single guarantor declared → "guarantor"
		const single = computeBtRoleMismatchWarning(
			[makeCoApp(), makeCoApp({ fullName: 'CoApp2' })],
			0,
			1,
			isGuarantorFn
		);
		expect(single).toMatch(/1 guarantor[^s]/);

		// Multiple → "guarantors"
		const plural = computeBtRoleMismatchWarning(
			[makeCoApp(), makeCoApp({ fullName: 'CoApp2' }), makeCoApp({ fullName: 'CoApp3' })],
			0,
			2,
			isGuarantorFn
		);
		expect(plural).toContain('2 guarantors');
	});

	it('respects legacy guarantor classification (isGuarantor=Yes + onProperty/onEMI=false)', () => {
		// Applicant marked via legacy flags only — no applicantClassification field.
		const legacyGuarantor: LegacyApplicant = {
			applicantType: 'Individual',
			fullName: 'LegacyGuar',
			isGuarantor: 'Yes',
			onProperty: false,
			onEMI: false
		} as LegacyApplicant;
		const applicants = [makeCoApp(), legacyGuarantor];
		expect(computeBtRoleMismatchWarning(applicants, 0, 1, isGuarantorFn)).toBe('');
	});
});
