/**
 * Loan Amount Validation Tests
 * ══════════════════════════════════════════════════════════════════
 * Verifies that evaluatePayload() handles loanAmount edge cases
 * correctly — zero, negative, and missing amounts should return
 * empty results instead of crashing or showing all-RED traffic lights.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB before importing evaluationEngine
vi.mock('$lib/database/mongo.js', () => ({
	LenderRuleArtifacts: {
		find: () => ({ toArray: async () => [] }),
		countDocuments: async () => 0
	}
}));

// Mock logger
vi.mock('$lib/server/logger.js', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock the dynamic imports used by evaluatePayload
vi.mock('$lib/ruleEngine/realBankRuleDocs.js', () => ({
	ALL_REAL_BANK_RULE_DOCS: [],
	seedRealBankRuleDocuments: async () => ({ inserted: 0, skipped: 0 })
}));

vi.mock('$lib/ruleEngine/sampleRuleDocs.js', () => ({
	SAMPLE_PVT_BANK: { lender_id: 'sample', lender_name: 'Sample', loan_types: [] },
	SAMPLE_GOV_BANK: { lender_id: 'sample-gov', lender_name: 'Sample Gov', loan_types: [] },
	SAMPLE_NBFC: { lender_id: 'sample-nbfc', lender_name: 'Sample NBFC', loan_types: [] }
}));

import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';
import logger from '$lib/server/logger.js';

// ── Helper: minimal valid payload ──────────────────────────────

function createMinimalPayload(
	loanAmount: number,
	overrides: Partial<LoanApplicationPayload['loanTransaction']> = {}
): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'Home Loan - Fresh',
			loanAmount,
			tenureYears: 20,
			numberOfApplicants: 1,
			...overrides
		},
		allApplicantDetails: [
			{
				applicantType: 'Individual' as const,
				fullName: 'Test User',
				age: 35,
				gender: 'Male',
				maritalStatus: 'Married',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: false
			}
		]
	} as LoanApplicationPayload;
}

// ── Tests ──────────────────────────────────────────────────────

describe('evaluatePayload — loanAmount validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty results when loanAmount is 0', async () => {
		const result = await evaluatePayload(createMinimalPayload(0));

		expect(result.summary.total_lenders).toBe(0);
		expect(result.results).toEqual([]);
		expect(result.summary.green_count).toBe(0);
		expect(result.summary.amber_count).toBe(0);
		expect(result.summary.red_count).toBe(0);
		expect(result.computed_at).toBeTruthy();
	});

	it('returns empty results when loanAmount is negative', async () => {
		const result = await evaluatePayload(createMinimalPayload(-500000));

		expect(result.summary.total_lenders).toBe(0);
		expect(result.results).toEqual([]);
	});

	it('logs a warning when loanAmount is 0', async () => {
		await evaluatePayload(createMinimalPayload(0));

		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ loanName: 'Home Loan', loanAmount: 0 }),
			expect.stringContaining('loanAmount <= 0')
		);
	});

	it('logs a warning when loanAmount is negative', async () => {
		await evaluatePayload(createMinimalPayload(-100));

		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ loanAmount: -100 }),
			expect.stringContaining('loanAmount <= 0')
		);
	});

	it('includes loan_type in summary when loanAmount is 0', async () => {
		const result = await evaluatePayload(createMinimalPayload(0));

		expect(result.summary.loan_type).toBe('Home Loan');
		expect(result.summary.requested_amount).toBe(0);
	});

	it('includes cross_sell empty array when loanAmount is 0', async () => {
		const result = await evaluatePayload(createMinimalPayload(0));

		expect(result.cross_sell).toEqual([]);
	});

	it('does NOT short-circuit when secured property is not identified (loanAmount 0)', async () => {
		// RE-7 affordability flow: a secured loan where the DSA has not yet
		// found a property legitimately arrives with loanAmount 0 (no property
		// cost to derive from). The engine must NOT early-return here, otherwise
		// the affordability back-calculator never runs and the results page
		// shows a blank AffordabilityOverview.
		const result = await evaluatePayload(
			createMinimalPayload(0, { propertyIdentified: false })
		);

		// The loanAmount<=0 defensive warning must NOT fire — the guard was exempted.
		expect(logger.warn).not.toHaveBeenCalledWith(
			expect.objectContaining({ loanAmount: 0 }),
			expect.stringContaining('loanAmount <= 0')
		);
		// Proceeds through the normal pipeline (0 lenders only because rule docs are mocked empty).
		expect(result.computed_at).toBeTruthy();
	});

	it('still short-circuits when secured property IS identified but loanAmount 0', async () => {
		// Property identified + 0 amount is a genuine data error, not the
		// affordability flow — the defensive guard must still fire.
		await evaluatePayload(createMinimalPayload(0, { propertyIdentified: true }));

		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ loanAmount: 0 }),
			expect.stringContaining('loanAmount <= 0')
		);
	});

	it('does NOT return early when loanAmount is valid', async () => {
		// With valid loanAmount but no rule docs, should still proceed
		// (will return 0 lenders because mocked DB returns empty, but
		// the code path is different from the loanAmount=0 early return)
		const result = await evaluatePayload(createMinimalPayload(5000000));

		// Should NOT have the loanAmount warning
		expect(logger.warn).not.toHaveBeenCalledWith(
			expect.objectContaining({ loanAmount: 5000000 }),
			expect.stringContaining('loanAmount <= 0')
		);
	});
});
