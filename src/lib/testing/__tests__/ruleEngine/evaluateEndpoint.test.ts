/**
 * =============================================================================
 * RE-3: Evaluate Endpoint — Request Validation Tests
 * =============================================================================
 *
 * Tests the validateEvaluateRequest() pure function extracted from the
 * POST /api/rule-engine/evaluate endpoint. The endpoint is a thin wrapper
 * around evaluatePayload() (421 tests in evaluationEngine.test.ts), so
 * these tests focus only on the input validation layer.
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import { _validateEvaluateRequest as validateEvaluateRequest } from '../../../../routes/api/rule-engine/evaluate/+server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid payload that passes all validation checks */
function validBody() {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'Fresh',
			loanAmount: 5_000_000,
			tenureYears: 20,
			propertyCost: 7_000_000
		},
		allApplicantDetails: [{ applicantType: 'Individual', age: 35, creditScore: 750 }]
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RE-3: validateEvaluateRequest', () => {
	// ── Happy path ──────────────────────────────────────────────────────

	it('accepts a valid payload', () => {
		const result = validateEvaluateRequest(validBody());
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.payload.loanTransaction.loanName).toBe('Home Loan');
		}
	});

	// ── Body-level rejections ───────────────────────────────────────────

	it('rejects null body', () => {
		const result = validateEvaluateRequest(null);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('JSON object');
		}
	});

	it('rejects non-object body', () => {
		const result = validateEvaluateRequest('not-an-object');
		expect(result.valid).toBe(false);
	});

	// ── loanTransaction rejections ──────────────────────────────────────

	it('rejects missing loanTransaction', () => {
		const body = { allApplicantDetails: [{ age: 30 }] };
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('loanTransaction');
		}
	});

	it('rejects empty loanName', () => {
		const body = validBody();
		body.loanTransaction.loanName = '';
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('loanName');
		}
	});

	it('rejects whitespace-only loanName', () => {
		const body = validBody();
		body.loanTransaction.loanName = '   ';
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
	});

	it('rejects zero loanAmount', () => {
		const body = validBody();
		body.loanTransaction.loanAmount = 0;
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('loanAmount');
		}
	});

	it('rejects negative loanAmount', () => {
		const body = validBody();
		body.loanTransaction.loanAmount = -100_000;
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
	});

	// ── allApplicantDetails rejections ──────────────────────────────────

	it('rejects missing allApplicantDetails', () => {
		const body = { loanTransaction: validBody().loanTransaction };
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('allApplicantDetails');
		}
	});

	it('rejects empty allApplicantDetails array', () => {
		const body = validBody();
		body.allApplicantDetails = [];
		const result = validateEvaluateRequest(body);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('allApplicantDetails');
		}
	});
});
