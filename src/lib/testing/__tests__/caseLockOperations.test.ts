/**
 * Case Lock Operations Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests the lockCase() and unlockAndRelockCase() operations, which
 * orchestrate fingerprint computation, quota consumption, and MongoDB
 * writes into complete lock workflows.
 *
 * Mocks: MongoDB Cases collection + daQuota module (already tested
 * separately in daQuota.test.ts). This file tests the orchestration
 * logic, not the primitives.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mock setup ─────────────────────────────────────────────────

const mockCasesFindOne = vi.fn();
const mockCasesUpdateOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	Cases: {
		findOne: (...args: any[]) => mockCasesFindOne(...args),
		updateOne: (...args: any[]) => mockCasesUpdateOne(...args)
	},
	MonthlyAssessmentUsage: {
		findOneAndUpdate: vi.fn(),
		findOne: vi.fn()
	}
}));

// Mock daQuota (quota operations are tested separately)
const mockConsumeQuota = vi.fn();
const mockCurrentYearMonth = vi.fn().mockReturnValue('2026-05');
const mockGetOrCreateMonthlyUsage = vi.fn();

vi.mock('$lib/server/billing/daQuota', () => ({
	consumeQuota: (...args: any[]) => mockConsumeQuota(...args),
	currentYearMonth: () => mockCurrentYearMonth(),
	getOrCreateMonthlyUsage: (...args: any[]) => mockGetOrCreateMonthlyUsage(...args)
}));

vi.mock('$lib/server/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// ── Import after mocks ─────────────────────────────────────────

import { lockCase, unlockAndRelockCase } from '$lib/server/caseLock/operations';
import type { CaseLockState } from '$lib/server/caseLock/types';

// ── Test helpers ───────────────────────────────────────────────

const TEST_DSA_ID = new ObjectId();
const TEST_CASE_ID = 'HL-2026-0042';

function makeLockArgs(overrides: Partial<any> = {}) {
	return {
		caseId: TEST_CASE_ID,
		dsaId: TEST_DSA_ID,
		tier: 'pro_da' as const,
		loanType: 'home_loan',
		loanAmount: 3500000,
		applicants: [
			{ pan: 'ABCPD1234E', role: 'primary' as const, relationship: 'self' }
		],
		...overrides
	};
}

function makeUnlockArgs(overrides: Partial<any> = {}) {
	return {
		caseId: TEST_CASE_ID,
		dsaId: TEST_DSA_ID,
		tier: 'pro_da' as const,
		loanType: 'lap',
		loanAmount: 4500000,
		applicants: [
			{ pan: 'ABCPD1234E', role: 'primary' as const, relationship: 'self' }
		],
		reasons: ['loan_type_changed'],
		...overrides
	};
}

/** Create a mock case doc as returned by Cases.findOne() */
function mockCaseDoc(overrides: Partial<any> = {}) {
	return {
		_id: new ObjectId(),
		case_id: TEST_CASE_ID,
		dsa_id: TEST_DSA_ID,
		assessment_mode: 'doc_upload',
		lock: null,
		loan: { type: 'home_loan', amount_required: 3500000 },
		...overrides
	};
}

/** Create a mock existing lock state */
function mockExistingLock(overrides: Partial<CaseLockState> = {}): CaseLockState {
	return {
		is_locked: true,
		locked_at: new Date('2026-05-01T10:00:00Z'),
		fingerprint_sha256: 'abc123oldfingerprint',
		loan_type_at_lock: 'home_loan',
		amount_at_lock: 3500000,
		amount_bucket: 3500000,
		applicants_at_lock: [
			{ applicant_slot: 0, role: 'primary', pan_hash: 'hash1', relationship: 'self' }
		],
		edit_history: [],
		...overrides
	};
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

beforeEach(() => {
	vi.clearAllMocks();
	// Reset return values that clearAllMocks doesn't touch
	mockCurrentYearMonth.mockReturnValue('2026-05');
	mockCasesUpdateOne.mockResolvedValue({ modifiedCount: 1 });
});

// ── lockCase ───────────────────────────────────────────────────

describe('lockCase', () => {
	it('should reject if case not found', async () => {
		mockCasesFindOne.mockResolvedValue(null);

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('case_not_found');
		}
	});

	it('should reject if assessment_mode is not doc_upload', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ assessment_mode: 'manual' }));

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('not_doc_upload_mode');
		}
	});

	it('should reject if assessment_mode is undefined (legacy case)', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ assessment_mode: undefined }));

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('not_doc_upload_mode');
		}
	});

	it('should return idempotent success if already locked with same fingerprint', async () => {
		// First compute what the fingerprint will be for the given args
		const { computeCaseFingerprint } = await import('$lib/server/caseLock/fingerprint');
		const fp = computeCaseFingerprint({
			loan_type: 'home_loan',
			applicants: [{ pan: 'ABCPD1234E' }],
			loan_amount: 3500000
		});

		const existingLock = mockExistingLock({
			fingerprint_sha256: fp.fingerprint_sha256
		});

		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.was_idempotent).toBe(true);
			expect(result.lock.fingerprint_sha256).toBe(fp.fingerprint_sha256);
		}

		// Should NOT have consumed quota
		expect(mockConsumeQuota).not.toHaveBeenCalled();
		// Should NOT have written to the case
		expect(mockCasesUpdateOne).not.toHaveBeenCalled();
	});

	it('should reject if already locked with different fingerprint', async () => {
		const existingLock = mockExistingLock({
			fingerprint_sha256: 'completely_different_fingerprint_hash'
		});

		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('already_locked_different_fingerprint');
		}
	});

	it('should reject if quota is exhausted', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({
			ok: false,
			consumed: 50,
			total: 50,
			can_topup: true,
			is_overage: false
		});

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('quota_exhausted');
			expect(result.consumed).toBe(50);
			expect(result.total).toBe(50);
			expect(result.can_topup).toBe(true);
		}
	});

	it('should successfully lock a case and consume quota', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });

		const result = await lockCase(makeLockArgs());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.was_idempotent).toBe(false);
			expect(result.lock.is_locked).toBe(true);
			expect(result.lock.loan_type_at_lock).toBe('home_loan');
			expect(result.lock.amount_at_lock).toBe(3500000);
			expect(result.lock.amount_bucket).toBe(3500000); // floor(3.5M / 500K) * 500K = 3.5M
			expect(result.lock.fingerprint_sha256).toHaveLength(64); // SHA-256 hex
			expect(result.lock.applicants_at_lock).toHaveLength(1);
			expect(result.lock.applicants_at_lock[0].role).toBe('primary');
			expect(result.lock.applicants_at_lock[0].applicant_slot).toBe(0);
			expect(result.lock.edit_history).toHaveLength(0);
		}

		// Verify quota was consumed
		expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
		expect(mockConsumeQuota).toHaveBeenCalledWith(
			TEST_DSA_ID,
			'2026-05',
			'pro_da',
			expect.objectContaining({
				action: 'initial_lock',
				case_id: TEST_CASE_ID
			})
		);

		// Verify case was updated
		expect(mockCasesUpdateOne).toHaveBeenCalledTimes(1);
		expect(mockCasesUpdateOne).toHaveBeenCalledWith(
			{ case_id: TEST_CASE_ID, dsa_id: TEST_DSA_ID },
			expect.objectContaining({
				$set: expect.objectContaining({
					lock: expect.objectContaining({ is_locked: true })
				})
			})
		);
	});

	it('should handle multiple applicants correctly', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });

		const result = await lockCase(
			makeLockArgs({
				applicants: [
					{ pan: 'ABCPD1234E', role: 'primary', relationship: 'self' },
					{ pan: 'XYZPQ5678R', role: 'co_applicant', relationship: 'spouse' }
				]
			})
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lock.applicants_at_lock).toHaveLength(2);
			expect(result.lock.applicants_at_lock[0].applicant_slot).toBe(0);
			expect(result.lock.applicants_at_lock[0].role).toBe('primary');
			expect(result.lock.applicants_at_lock[1].applicant_slot).toBe(1);
			expect(result.lock.applicants_at_lock[1].role).toBe('co_applicant');
			// PAN hashes should be stored (not raw PANs)
			expect(result.lock.applicants_at_lock[0].pan_hash).toHaveLength(64);
			expect(result.lock.applicants_at_lock[1].pan_hash).toHaveLength(64);
			expect(result.lock.applicants_at_lock[0].pan_hash).not.toBe(
				result.lock.applicants_at_lock[1].pan_hash
			);
		}
	});

	it('should pass the fingerprint in the quota event', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });

		await lockCase(makeLockArgs());

		const eventArg = mockConsumeQuota.mock.calls[0][3];
		expect(eventArg.fingerprint_at_event).toHaveLength(64);
		expect(eventArg.action).toBe('initial_lock');
	});

	it('should use current year-month from IST', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });
		mockCurrentYearMonth.mockReturnValue('2026-03');

		await lockCase(makeLockArgs());

		expect(mockConsumeQuota).toHaveBeenCalledWith(
			TEST_DSA_ID,
			'2026-03',
			'pro_da',
			expect.any(Object)
		);
	});
});

// ── unlockAndRelockCase ────────────────────────────────────────

describe('unlockAndRelockCase', () => {
	it('should reject if case not found', async () => {
		mockCasesFindOne.mockResolvedValue(null);

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('case_not_found');
		}
	});

	it('should reject if assessment_mode is not doc_upload', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ assessment_mode: 'manual' }));

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('not_doc_upload_mode');
		}
	});

	it('should reject if case is not currently locked', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: null }));

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('case_not_locked');
		}
	});

	it('should reject if case lock.is_locked is false', async () => {
		const inactiveLock = mockExistingLock({ is_locked: false });
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: inactiveLock }));

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('case_not_locked');
		}
	});

	it('should return success without charging if fingerprints match (no actual change)', async () => {
		// Setup: existing lock has same identity as the "new" args
		const { computeCaseFingerprint } = await import('$lib/server/caseLock/fingerprint');
		const fp = computeCaseFingerprint({
			loan_type: 'lap',
			applicants: [{ pan: 'ABCPD1234E' }],
			loan_amount: 4500000
		});

		const existingLock = mockExistingLock({ fingerprint_sha256: fp.fingerprint_sha256 });
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(true);
		// Should NOT consume quota — fingerprints match
		expect(mockConsumeQuota).not.toHaveBeenCalled();
		expect(mockCasesUpdateOne).not.toHaveBeenCalled();
	});

	it('should reject if quota is exhausted', async () => {
		const existingLock = mockExistingLock(); // has a different fingerprint than new args
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));
		mockConsumeQuota.mockResolvedValue({
			ok: false,
			consumed: 50,
			total: 50,
			can_topup: true,
			is_overage: false
		});

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('quota_exhausted');
			expect(result.consumed).toBe(50);
			expect(result.total).toBe(50);
		}
	});

	it('should successfully unlock-and-relock with new fingerprint', async () => {
		const existingLock = mockExistingLock({
			fingerprint_sha256: 'old_different_fingerprint_hash_value_64chars_padded_to_exact_len!'
		});
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 2, total: 50 });

		const result = await unlockAndRelockCase(makeUnlockArgs());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lock.is_locked).toBe(true);
			expect(result.lock.loan_type_at_lock).toBe('lap');
			expect(result.lock.amount_at_lock).toBe(4500000);
			expect(result.lock.fingerprint_sha256).toHaveLength(64);
			// Should NOT match the old fingerprint
			expect(result.lock.fingerprint_sha256).not.toBe(existingLock.fingerprint_sha256);
		}
	});

	it('should append to edit_history', async () => {
		const previousEntry = {
			at: new Date('2026-04-20'),
			by_dsa_id: 'prev-dsa',
			fields_changed: ['amount_major_change'],
			impact: 'major' as const,
			quota_charged: true,
			new_fingerprint: 'prev_fp'
		};
		const existingLock = mockExistingLock({
			fingerprint_sha256: 'old_fp_that_does_not_match_new_identity_at_all_padded_to_64_ch!',
			edit_history: [previousEntry]
		});
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 3, total: 50 });

		const result = await unlockAndRelockCase(
			makeUnlockArgs({ reasons: ['loan_type_changed', 'amount_major_change'] })
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			// Should have both the previous entry and the new one
			expect(result.lock.edit_history).toHaveLength(2);
			expect(result.lock.edit_history[0]).toEqual(previousEntry);
			expect(result.lock.edit_history[1].fields_changed).toEqual([
				'loan_type_changed',
				'amount_major_change'
			]);
			expect(result.lock.edit_history[1].impact).toBe('major');
			expect(result.lock.edit_history[1].quota_charged).toBe(true);
			expect(result.lock.edit_history[1].by_dsa_id).toBe(TEST_DSA_ID.toString());
			expect(result.lock.edit_history[1].new_fingerprint).toHaveLength(64);
		}
	});

	it('should pass major_edit_unlock action to consumeQuota', async () => {
		const existingLock = mockExistingLock({
			fingerprint_sha256: 'different_old_fp_value_padded_to_fill_64_hex_characters_exactly!'
		});
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 2, total: 50 });

		await unlockAndRelockCase(makeUnlockArgs());

		expect(mockConsumeQuota).toHaveBeenCalledWith(
			TEST_DSA_ID,
			'2026-05',
			'pro_da',
			expect.objectContaining({
				action: 'major_edit_unlock',
				case_id: TEST_CASE_ID
			})
		);
	});

	it('should write updated lock to MongoDB', async () => {
		const existingLock = mockExistingLock({
			fingerprint_sha256: 'another_old_fp_hash_that_wont_match_the_new_args_identity_here!'
		});
		mockCasesFindOne.mockResolvedValue(mockCaseDoc({ lock: existingLock }));
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 2, total: 50 });

		await unlockAndRelockCase(makeUnlockArgs());

		expect(mockCasesUpdateOne).toHaveBeenCalledTimes(1);
		expect(mockCasesUpdateOne).toHaveBeenCalledWith(
			{ case_id: TEST_CASE_ID, dsa_id: TEST_DSA_ID },
			expect.objectContaining({
				$set: expect.objectContaining({
					lock: expect.objectContaining({
						is_locked: true,
						loan_type_at_lock: 'lap'
					})
				})
			})
		);
	});
});

// ── Integration: lockCase + unlockAndRelockCase flow ───────────

describe('Full lock → major-edit → relock flow', () => {
	it('should produce distinct fingerprints for different loan types', async () => {
		// Lock with home_loan
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });

		const lockResult = await lockCase(makeLockArgs());
		expect(lockResult.ok).toBe(true);

		// Now simulate unlock-and-relock with LAP
		if (lockResult.ok) {
			const lockedDoc = mockCaseDoc({ lock: lockResult.lock });
			mockCasesFindOne.mockResolvedValue(lockedDoc);
			mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 2, total: 50 });

			const relockResult = await unlockAndRelockCase(makeUnlockArgs());
			expect(relockResult.ok).toBe(true);

			if (relockResult.ok) {
				// Fingerprints must differ (different loan types)
				expect(relockResult.lock.fingerprint_sha256).not.toBe(lockResult.lock.fingerprint_sha256);
				expect(relockResult.lock.loan_type_at_lock).toBe('lap');
			}
		}
	});

	it('should not store raw PANs in the lock state', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 1, total: 50 });

		const result = await lockCase(
			makeLockArgs({
				applicants: [
					{ pan: 'ABCPD1234E', role: 'primary', relationship: 'self' },
					{ pan: 'XYZPQ5678R', role: 'co_applicant', relationship: 'spouse' }
				]
			})
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			const lockJson = JSON.stringify(result.lock);
			// Raw PANs should NEVER appear in the lock state
			expect(lockJson).not.toContain('ABCPD1234E');
			expect(lockJson).not.toContain('XYZPQ5678R');
			// But pan_hash fields should be populated
			expect(result.lock.applicants_at_lock[0].pan_hash).toBeTruthy();
			expect(result.lock.applicants_at_lock[1].pan_hash).toBeTruthy();
		}
	});

	it('should handle enterprise_da tier (overage allowed)', async () => {
		mockCasesFindOne.mockResolvedValue(mockCaseDoc());
		// Enterprise overage: consumeQuota returns ok:true even beyond base+topup
		mockConsumeQuota.mockResolvedValue({ ok: true, consumed: 101, total: 100 });

		const result = await lockCase(makeLockArgs({ tier: 'enterprise_da' }));

		expect(result.ok).toBe(true);
		expect(mockConsumeQuota).toHaveBeenCalledWith(
			TEST_DSA_ID,
			'2026-05',
			'enterprise_da',
			expect.any(Object)
		);
	});
});
