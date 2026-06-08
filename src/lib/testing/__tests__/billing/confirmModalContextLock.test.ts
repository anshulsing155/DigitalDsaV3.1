/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Lock test — loadConfirmModalContext canonical DSA-id resolution (S226)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Guards the S226 fix (commit `688f7077`) that resolved a real production bug:
 * the topbar "Cases Consumed N/M" chip and the submit-modal "X of N saves used"
 * badge were both fed `getQuotaState(locals.user.id)`. For team members AND any
 * user whose JWT `userId` didn't match `findUserByMobile(...)._id` (data drift),
 * that id didn't match `Cases.dsa_id` and the counter sat permanently at 0/N.
 *
 * Canonical fix: `loadConfirmModalContext(locals)` now resolves the effective
 * DSA `_id` via `resolveEffectiveDsaId(locals)` — the SAME helper used by every
 * other surface that queries `Cases.dsa_id` (cases list page, all API routes,
 * verifyCaseOwnership). This locks four behavioral invariants so a future
 * "let me just pass userId again, it's shorter" refactor breaks loudly.
 *
 * Pattern: source-grep locks for "no regression to userId path" PLUS behavioral
 * assertions via vi.mock proving the runtime contract (resolve failure → null
 * fallback; one-query-throws → other-survives; resolved dsaId reaches both
 * downstream callers).
 *
 * Sibling pattern: leadVaultEndpoint.test.ts (caseHelpers + Mongo mocks).
 * Source-grep pattern: upgradePromptWiring.test.ts.
 *
 * Why the warn: end-verify Step 1b (S226 /end) flagged the absence of this
 * test. Adding it closes the warn and protects the load-bearing change for
 * team-member callers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Mocks (declared BEFORE the loader import) ────────────────────────────────

const TEST_RESOLVED_DSA_OID = new ObjectId();

const mockResolveEffectiveDsaId = vi.fn();
const mockGetQuotaState = vi.fn();
const mockGetInFlightCase = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock('$lib/server/caseHelpers', () => ({
	resolveEffectiveDsaId: (...args: unknown[]) => mockResolveEffectiveDsaId(...args)
}));

vi.mock('$lib/server/billing/quotaState', () => ({
	getQuotaState: (...args: unknown[]) => mockGetQuotaState(...args)
}));

vi.mock('$lib/server/billing/getInFlightCase', () => ({
	getInFlightCase: (...args: unknown[]) => mockGetInFlightCase(...args)
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), debug: vi.fn() }
}));

// Helper — synth locals shape for tests.
function makeLocals(userId: string | undefined): App.Locals {
	return {
		user: userId === undefined ? null : ({ id: userId, mobileNumber: '9999999999' } as App.Locals['user'])
	} as App.Locals;
}

describe('loadConfirmModalContext — canonical DSA-id resolution lock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Source-grep locks: "no regression to userId path" ──────────────────

	describe('source-grep — canonical pattern locks', () => {
		const SRC = readFileSync(
			resolve('src/lib/server/billing/confirmModalContext.ts'),
			'utf-8'
		);

		it('imports resolveEffectiveDsaId from caseHelpers (not raw locals.user.id flow)', () => {
			expect(SRC).toMatch(/import\s*\{\s*resolveEffectiveDsaId\s*\}\s*from\s*['"]\$lib\/server\/caseHelpers['"]/);
		});

		it('exports loadConfirmModalContext accepting App.Locals (not a userId string)', () => {
			expect(SRC).toMatch(/export\s+async\s+function\s+loadConfirmModalContext\s*\(\s*locals\s*:\s*App\.Locals\s*\)/);
		});

		it('calls resolveEffectiveDsaId(locals) BEFORE getQuotaState / getInFlightCase', () => {
			const resolveIdx = SRC.indexOf('resolveEffectiveDsaId(locals)');
			const quotaIdx = SRC.indexOf('getQuotaState(');
			const flightIdx = SRC.indexOf('getInFlightCase(');
			expect(resolveIdx).toBeGreaterThan(-1);
			expect(quotaIdx).toBeGreaterThan(-1);
			expect(flightIdx).toBeGreaterThan(-1);
			expect(resolveIdx).toBeLessThan(quotaIdx);
			expect(resolveIdx).toBeLessThan(flightIdx);
		});

		it('does NOT pass `locals.user.id` directly into getQuotaState / getInFlightCase', () => {
			// Regression guard: if someone "simplifies" by reverting to userId,
			// this assertion fires.
			expect(SRC).not.toMatch(/getQuotaState\s*\(\s*locals\.user[?.]*\.id/);
			expect(SRC).not.toMatch(/getInFlightCase\s*\(\s*locals\.user[?.]*\.id/);
		});

		it('uses Promise.allSettled so one query failure does not kill the other', () => {
			expect(SRC).toMatch(/Promise\.allSettled/);
		});
	});

	// ── Behavioral assertions via mocks ─────────────────────────────────────

	describe('runtime contract — fallback paths and canonical reach', () => {
		it('(a) returns {null, null} for an unauthenticated locals (no user.id)', async () => {
			const { loadConfirmModalContext } = await import(
				'$lib/server/billing/confirmModalContext'
			);
			const out = await loadConfirmModalContext(makeLocals(undefined));
			expect(out).toEqual({ quotaState: null, inFlightCase: null });
			expect(mockResolveEffectiveDsaId).not.toHaveBeenCalled();
			expect(mockGetQuotaState).not.toHaveBeenCalled();
			expect(mockGetInFlightCase).not.toHaveBeenCalled();
		});

		it('(a-bis) returns {null, null} for demo-guest WITHOUT touching downstream', async () => {
			const { loadConfirmModalContext } = await import(
				'$lib/server/billing/confirmModalContext'
			);
			const out = await loadConfirmModalContext(makeLocals('demo-guest'));
			expect(out).toEqual({ quotaState: null, inFlightCase: null });
			expect(mockResolveEffectiveDsaId).not.toHaveBeenCalled();
			expect(mockGetQuotaState).not.toHaveBeenCalled();
			expect(mockGetInFlightCase).not.toHaveBeenCalled();
		});

		it('(b) returns {null, null} when resolveEffectiveDsaId fails (no downstream calls)', async () => {
			mockResolveEffectiveDsaId.mockResolvedValueOnce({
				ok: false,
				error: 'DSA profile not found'
			});

			const { loadConfirmModalContext } = await import(
				'$lib/server/billing/confirmModalContext'
			);
			const out = await loadConfirmModalContext(makeLocals('some-jwt-user-id'));
			expect(out).toEqual({ quotaState: null, inFlightCase: null });
			expect(mockGetQuotaState).not.toHaveBeenCalled();
			expect(mockGetInFlightCase).not.toHaveBeenCalled();
			expect(mockLoggerWarn).toHaveBeenCalled();
		});

		it('(c) one downstream query failing does NOT suppress the other survivor', async () => {
			mockResolveEffectiveDsaId.mockResolvedValueOnce({
				ok: true,
				dsaId: TEST_RESOLVED_DSA_OID
			});
			mockGetQuotaState.mockRejectedValueOnce(new Error('quota mongo blip'));
			const surviving = { case_id: 'HL-2026-0001', label: 'x', stage: 'intake', created_at: '2026-06-05T00:00:00Z' };
			mockGetInFlightCase.mockResolvedValueOnce(surviving);

			const { loadConfirmModalContext } = await import(
				'$lib/server/billing/confirmModalContext'
			);
			const out = await loadConfirmModalContext(makeLocals('some-jwt-user-id'));
			expect(out.quotaState).toBeNull();
			expect(out.inFlightCase).toEqual(surviving);
		});

		it('(d) canonical reach — the RESOLVED ObjectId (not locals.user.id) reaches both downstream callers', async () => {
			mockResolveEffectiveDsaId.mockResolvedValueOnce({
				ok: true,
				dsaId: TEST_RESOLVED_DSA_OID
			});
			mockGetQuotaState.mockResolvedValueOnce(null);
			mockGetInFlightCase.mockResolvedValueOnce(null);

			const JWT_USER_ID = 'jwt-user-id-that-MUST-NOT-be-used-directly';
			const { loadConfirmModalContext } = await import(
				'$lib/server/billing/confirmModalContext'
			);
			await loadConfirmModalContext(makeLocals(JWT_USER_ID));

			// Both downstream calls receive the RESOLVED ObjectId, not the JWT userId string.
			// This is the load-bearing assertion that protects team-member callers — if a
			// future refactor reverts to `getQuotaState(locals.user.id)`, this fails loudly.
			expect(mockGetQuotaState).toHaveBeenCalledTimes(1);
			expect(mockGetQuotaState).toHaveBeenCalledWith(TEST_RESOLVED_DSA_OID);
			expect(mockGetQuotaState).not.toHaveBeenCalledWith(JWT_USER_ID);

			expect(mockGetInFlightCase).toHaveBeenCalledTimes(1);
			expect(mockGetInFlightCase).toHaveBeenCalledWith(TEST_RESOLVED_DSA_OID);
			expect(mockGetInFlightCase).not.toHaveBeenCalledWith(JWT_USER_ID);
		});
	});
});
