/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: validateCompanyField rejects non-India registrationCountry
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User reported 2026-05-28 (Business Loan → OPC screenshot): selecting
 * "Foreign Country" → FEMA warning modal opens → clicking browser back
 * (instead of the modal's Confirm/dismiss) navigates to How-Can-We-Help →
 * returning via Next/Previous shows "Foreign Country" still selected, with
 * the value persisted across the navigation.
 *
 * ROOT CAUSE
 * ──────────
 * `AddApplicantBusiness.svelte`'s `updateCompanyField` mutates `companyForm`
 * to `'Foreign Country'` BEFORE opening the FEMA modal. The auto-save
 * `$effect` watches `companyForm.registrationCountry`, sees the change,
 * runs `getCompanyErrors` — which (pre-fix) returned no error for any
 * non-empty value — and calls `formState.replaceApplicants(...)`. The
 * 'Foreign Country' value is now persisted in global state. When the user
 * dismisses the modal (any path), `resetToIndia` only resets the local
 * `companyForm` buffer; `formState` is never touched again. On return
 * navigation, `companyForm` is re-initialised from `formState` (which still
 * holds 'Foreign Country') and the stale value reappears.
 *
 * FIX (2026-05-28)
 * ────────────────
 * `validateCompanyField('registrationCountry', value)` now returns a
 * validation error string when `value` is set and is not 'India'. The
 * auto-save `$effect` checks `Object.keys(errors).length > 0` and bails
 * (line 302 of AddApplicantBusiness.svelte) — `formState` is never written.
 * The local buffer still updates so the FEMA modal can open, and
 * `resetToIndia` (the modal's onConfirm + onCancel) reverts the buffer on
 * any dismissal path.
 *
 * THIS TEST
 * ─────────
 * 1. Behavioral: `validateCompanyField` returns a non-null string for
 *    common foreign values and null for 'India'.
 * 2. Static-scan: the validator source contains the rejection logic
 *    (prevents silent regression of "remove the check, validation passes").
 *
 * Companion: CLAUDE.md §3 Pitfall (FEMA persistence across navigation,
 * 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCompanyField } from '$lib/utils/applicantFormValidation';

const CONTEXT = {
	companyType: 'Pvt Ltd',
	entityLabel: 'Company',
	isOPC: false
};

describe('Foreign country validation — Pitfall: FEMA persistence', () => {
	describe('behavioral — validateCompanyField rejects non-India values', () => {
		it('accepts India', () => {
			expect(validateCompanyField('registrationCountry', 'India', CONTEXT)).toBeNull();
		});

		it('rejects "Foreign Country" (the screenshot value)', () => {
			const err = validateCompanyField('registrationCountry', 'Foreign Country', CONTEXT);
			expect(err, 'must return an error string').toBeTruthy();
			expect(typeof err).toBe('string');
		});

		it('rejects an arbitrary country name', () => {
			expect(
				validateCompanyField('registrationCountry', 'United States', CONTEXT)
			).toBeTruthy();
		});

		it('rejects "USA"', () => {
			expect(validateCompanyField('registrationCountry', 'USA', CONTEXT)).toBeTruthy();
		});

		it('still rejects empty values as required (legacy behavior preserved)', () => {
			expect(validateCompanyField('registrationCountry', '', CONTEXT)).toBeTruthy();
			expect(validateCompanyField('registrationCountry', null, CONTEXT)).toBeTruthy();
			expect(validateCompanyField('registrationCountry', undefined, CONTEXT)).toBeTruthy();
		});

		it('error message guides DSA toward India or NRI/OCI individual route', () => {
			const err = validateCompanyField(
				'registrationCountry',
				'Foreign Country',
				CONTEXT
			) as string;
			// Soft check on the guidance content — we want the DSA to know
			// what to do next, not just see a generic "invalid" message.
			expect(err.toLowerCase()).toMatch(/india|nri|oci|individual/);
		});
	});

	describe('static-scan: validator contains the non-India rejection', () => {
		it('applicantFormValidation.ts checks String(value) !== "India" for registrationCountry', () => {
			const filePath = resolve(
				process.cwd(),
				'src/lib/utils/applicantFormValidation.ts'
			);
			const source = readFileSync(filePath, 'utf-8');

			// Find the registrationCountry branch
			const branchStart = source.indexOf("key === 'registrationCountry'");
			expect(branchStart, 'registrationCountry validation branch not found').toBeGreaterThan(
				-1
			);
			const branch = source.slice(branchStart, branchStart + 2000);

			// Pattern: `String(value) !== 'India'` (the fix) — accept the equivalent
			// alternate `value !== 'India'` too in case of future refactor.
			const hasIndiaCheck = /['"]India['"]/.test(branch);
			const hasInequality = /!==/.test(branch);

			expect(
				hasIndiaCheck && hasInequality,
				'applicantFormValidation.ts no longer rejects non-India ' +
					'registrationCountry values. The FEMA persistence bug will recur: ' +
					'auto-save writes "Foreign Country" to formState before the ' +
					'confirmation modal can fire its onCancel reset. ' +
					'See CLAUDE.md §3 Pitfall (FEMA persistence across navigation).'
			).toBe(true);
		});
	});
});
