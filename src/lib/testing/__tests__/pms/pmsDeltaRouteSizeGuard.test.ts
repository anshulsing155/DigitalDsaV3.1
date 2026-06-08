/**
 * POST /api/pms/pipeline/delta — size-guard route tests
 * ══════════════════════════════════════════════════════════════════
 * Drives the REAL handler with mocked guards, rate limiter, policy
 * service, and delta pipeline. Each test exercises the production
 * 60% size guard: addendumText.length / policy.sourceDocument.text.length
 * — when the ratio exceeds 0.60 (strictly greater than), the handler
 * returns warning: 'full_policy_detected' and SKIPS the AI call.
 *
 * Replaces the pre-2026-06-05 "size guard ratio math" describe in
 * src/lib/testing/__tests__/pms/deltaPipeline.test.ts, which had
 * redefined the helper inline and tested its own copy of the math.
 *
 * If the production threshold (0.60) or the math (length / length)
 * drifts, these tests flip — that is the regression coverage the
 * 2026-06-05 audit demanded.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock factory state lives in vi.hoisted so vi.mock(...) factories
// (which run BEFORE module-scope const declarations) can read it.
const { mockRunDelta, mockGetPolicyById, mockRequireRoleApi, mockRateLimit, mockLogger } =
	vi.hoisted(() => ({
		mockRunDelta: vi.fn(),
		mockGetPolicyById: vi.fn(),
		mockRequireRoleApi: vi.fn(),
		mockRateLimit: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
	}));

vi.mock('$lib/server/logger', () => ({ default: mockLogger }));

vi.mock('$lib/server/guards', () => ({
	requireRoleApi: (...args: unknown[]) => mockRequireRoleApi(...args)
}));

vi.mock('$lib/server/rateLimiter', () => ({
	rateLimit: (...args: unknown[]) => mockRateLimit(...args)
}));

vi.mock('$lib/server/pms/policyService', () => ({
	getPolicyById: (...args: unknown[]) => mockGetPolicyById(...args),
	PolicyNotFoundError: class PolicyNotFoundError extends Error {},
	PolicyStatusError: class PolicyStatusError extends Error {}
}));

vi.mock('$lib/server/pms/deltaPipeline', () => ({
	runDelta: (...args: unknown[]) => mockRunDelta(...args)
}));

// Import AFTER mocks so the handler resolves to the mocked deps.
import { POST } from '../../../../routes/api/pms/pipeline/delta/+server';

beforeEach(() => {
	mockRunDelta.mockReset();
	mockGetPolicyById.mockReset();
	mockRequireRoleApi.mockReset().mockReturnValue(null); // null = allow through
	mockRateLimit.mockReset().mockResolvedValue(null); // null = not limited
	for (const fn of Object.values(mockLogger)) (fn as ReturnType<typeof vi.fn>).mockReset();
});

// Helper: build a published policy whose source text has exactly N characters.
function makePolicy(sourceLength: number) {
	return {
		_id: 'pol_test',
		status: 'published',
		loanProduct: 'home_loan',
		sections: {},
		sourceDocument: { text: 'x'.repeat(sourceLength) },
		aiPipelineRun: { totalTokensUsed: 0 }
	};
}

// Helper: build a minimal RequestEvent the handler will accept.
function makeEvent(body: Record<string, unknown>) {
	return {
		locals: { user: { id: 'user_test' } },
		request: {
			json: async () => body,
			headers: new Headers({ 'content-type': 'application/json' })
		},
		getClientAddress: () => '127.0.0.1'
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/pms/pipeline/delta — 60% size guard', () => {
	it('TRIGGERS when addendum is 61% of policy size — returns full_policy_detected, skips AI', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(1000));
		// 610 chars on a 1000-char policy → ratio = 0.61 (just over 0.60).
		const addendumText = 'a'.repeat(610);

		const res = await POST(makeEvent({ policyId: 'pol_test', addendumText }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.warning).toBe('full_policy_detected');
		expect(body.data.addendumLength).toBe(610);
		expect(body.data.policyLength).toBe(1000);
		// Critical: the AI pipeline must NOT be called when the guard trips.
		expect(mockRunDelta).not.toHaveBeenCalled();
	});

	it('DOES NOT trigger at exactly 60% (guard is strictly greater than 0.60)', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(1000));
		mockRunDelta.mockResolvedValue({
			deltas: [],
			tokensUsed: 0,
			overallConfidence: 1
		});
		// 600 chars on 1000-char policy → ratio = 0.60 exactly — must proceed.
		const addendumText = 'a'.repeat(600);

		const res = await POST(makeEvent({ policyId: 'pol_test', addendumText }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.warning).toBeUndefined();
		expect(mockRunDelta).toHaveBeenCalledTimes(1);
	});

	it('DOES NOT trigger at small ratios (10%)', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(10_000));
		mockRunDelta.mockResolvedValue({
			deltas: [{ field: 'minAge', oldValue: 21, newValue: 23 }],
			tokensUsed: 500,
			overallConfidence: 0.95
		});
		// 1,000 chars on 10,000-char policy → ratio = 0.10
		const addendumText = 'a'.repeat(1_000);

		const res = await POST(makeEvent({ policyId: 'pol_test', addendumText }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.warning).toBeUndefined();
		expect(body.data.deltaResult.deltas).toHaveLength(1);
		expect(mockRunDelta).toHaveBeenCalledTimes(1);
	});

	it('BYPASSED when caller passes confirmedFullPolicy: true (RM acknowledged the warning)', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(1000));
		mockRunDelta.mockResolvedValue({
			deltas: [],
			tokensUsed: 0,
			overallConfidence: 1
		});
		// Same 95% ratio that would normally trip the guard.
		const addendumText = 'a'.repeat(950);

		const res = await POST(
			makeEvent({ policyId: 'pol_test', addendumText, confirmedFullPolicy: true })
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.warning).toBeUndefined();
		expect(mockRunDelta).toHaveBeenCalledTimes(1);
	});

	it('still TRIGGERS at very large ratios (95%) when confirmedFullPolicy is omitted', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(1000));
		const addendumText = 'a'.repeat(950);

		const res = await POST(makeEvent({ policyId: 'pol_test', addendumText }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.warning).toBe('full_policy_detected');
		expect(body.data.message).toContain('95%');
		expect(mockRunDelta).not.toHaveBeenCalled();
	});

	it('skips the guard when policy.sourceDocument.text is empty (division-by-zero protection)', async () => {
		mockGetPolicyById.mockResolvedValue(makePolicy(0));
		mockRunDelta.mockResolvedValue({
			deltas: [],
			tokensUsed: 0,
			overallConfidence: 1
		});
		const addendumText = 'a'.repeat(500);

		const res = await POST(makeEvent({ policyId: 'pol_test', addendumText }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.warning).toBeUndefined();
		expect(mockRunDelta).toHaveBeenCalledTimes(1);
	});
});
