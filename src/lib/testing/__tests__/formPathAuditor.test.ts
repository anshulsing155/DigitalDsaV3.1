/**
 * =============================================================================
 * FORM PATH AUDITOR — Health Check Test
 * =============================================================================
 *
 * Validates that all declared form paths are working and none are dead.
 * This test catches regressions when someone modifies form schemas or
 * showWhen conditions in a way that breaks existing paths.
 *
 * After the Phase 1 bug fixes:
 *   - 21 working paths (was 19 before fixes)
 *   - 0 dead paths (was 2: unsecured no-obligations + Plot BT)
 *   - 6 loan types covered
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
	auditFormPaths,
	ALL_FORM_PATHS,
	getValidFormPathCombinations
} from '$lib/testing/scenarios/formPathAuditor.js';

describe('Form Path Auditor — Health Check', () => {
	const audit = auditFormPaths();

	it('audits all 6 loan types', () => {
		const expected = [
			'Home Loan',
			'Loan Against Property',
			'Plot Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		];
		for (const lt of expected) {
			expect(audit.loanTypesAudited).toContain(lt);
		}
	});

	it('has 24 declared form paths', () => {
		// 4 HL + 4 LAP term + 2 LAP DOD + 5 Plot + 3 PL + 3 BL + 3 Prof = 24
		expect(ALL_FORM_PATHS.length).toBe(24);
	});

	it('all declared paths are working (0 dead paths)', () => {
		if (audit.deadPaths.length > 0) {
			const dead = audit.deadPaths.map((d) => `${d.path.label}: ${d.reason}`).join('\n  ');
			throw new Error(`Dead paths found:\n  ${dead}`);
		}
		expect(audit.deadPaths).toHaveLength(0);
	});

	it('every path has a non-empty label, schemaLoanName, and expectedRoute', () => {
		for (const path of ALL_FORM_PATHS) {
			expect(path.label.length).toBeGreaterThan(0);
			expect(path.schemaLoanName.length).toBeGreaterThan(0);
			expect(path.expectedRoute.startsWith('/form/')).toBe(true);
		}
	});

	it('every path has q1_loanName + a final-axis identifier (q4_loanType, q4_loanVariant, or q2_loanType)', () => {
		for (const path of ALL_FORM_PATHS) {
			expect(path.formPath.q1_loanName).toBeTruthy();
			// Post-rename (ADR-0020): non-Plot paths use q4_loanType; Plot New-Loan
			// paths use q4_loanVariant; Plot BT path uses q2_loanType only. Any of
			// the three counts as a valid final-axis identifier. Updated S210 audit.
			const finalAxis =
				path.formPath.q4_loanType ?? path.formPath.q4_loanVariant ?? path.formPath.q2_loanType;
			expect(finalAxis).toBeTruthy();
		}
	});

	it('Home Loan has 4 paths', () => {
		const hlPaths = ALL_FORM_PATHS.filter((p) => p.formPath.q1_loanName === 'Home Loan');
		expect(hlPaths.length).toBe(4);
	});

	it('LAP has 6 paths (4 term + 2 DOD)', () => {
		const lapPaths = ALL_FORM_PATHS.filter(
			(p) => p.formPath.q1_loanName === 'Loan Against Property'
		);
		expect(lapPaths.length).toBe(6);
	});

	it('Plot Loan has 5 paths (4 new + 1 BT)', () => {
		const plotPaths = ALL_FORM_PATHS.filter((p) => p.formPath.q1_loanName === 'Plot Loan');
		expect(plotPaths.length).toBe(5);
	});

	it('Unsecured loans each have 3 paths', () => {
		const plPaths = ALL_FORM_PATHS.filter((p) => p.formPath.q1_loanName === 'Personal Loan');
		const blPaths = ALL_FORM_PATHS.filter((p) => p.formPath.q1_loanName === 'Business Loan');
		const profPaths = ALL_FORM_PATHS.filter((p) => p.formPath.q1_loanName === 'Professional Loan');
		expect(plPaths.length).toBe(3);
		expect(blPaths.length).toBe(3);
		expect(profPaths.length).toBe(3);
	});
});

describe('Valid Form Path Combinations', () => {
	const validCombinations = getValidFormPathCombinations();

	it('returns correct number of unique loanName|loanType combinations', () => {
		// Some paths share loanName|loanType (e.g., LAP DOD and LAP Term have same loanTypes)
		// So unique combinations < total paths (24)
		expect(validCombinations.size).toBeGreaterThanOrEqual(19);
		expect(validCombinations.size).toBeLessThanOrEqual(24);
	});

	it('includes known valid combinations', () => {
		expect(validCombinations.has('Home Loan|New Loan')).toBe(true);
		expect(validCombinations.has('Home Loan|Balance Transfer Only')).toBe(true);
		expect(validCombinations.has('Loan Against Property|New Loan')).toBe(true);
		// Post-rename (ADR-0020): Plot New-Loan paths key by variant (q4_loanVariant);
		// Plot BT keys by scope (q2_loanType, since BT has no q4 variant question).
		// Pre-rename these were `Plot Loan|Plot Loan Only` (variant misfiled on q4_loanType)
		// and `Plot Loan|Plot Balance Transfer` (a non-canonical hybrid). Updated S210 audit.
		expect(validCombinations.has('Plot Loan|Plot Loan Only')).toBe(true);
		expect(validCombinations.has('Plot Loan|Balance Transfer Only')).toBe(true);
		expect(validCombinations.has('Personal Loan|New Loan')).toBe(true);
		expect(validCombinations.has('Business Loan|Debt Consolidation with Extra Funds')).toBe(true);
		expect(validCombinations.has('Professional Loan|New Loan')).toBe(true);
	});

	it('does NOT include invalid combinations', () => {
		expect(validCombinations.has('Home Loan|Plot Loan Only')).toBe(false);
		expect(validCombinations.has('Personal Loan|Balance Transfer Only')).toBe(false);
		expect(validCombinations.has('Plot and Construction Loan|New Loan')).toBe(false);
	});
});
