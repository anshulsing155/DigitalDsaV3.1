/**
 * Case Lock Interceptor Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests the checkEditAllowed() and quickClassifyEdit() functions.
 * These guard case edits on locked doc-upload cases, returning
 * UI actions instead of auto-charging.
 *
 * Mocks: daQuota module (for getOrCreateMonthlyUsage)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mock setup ─────────────────────────────────────────────────

const mockGetOrCreateMonthlyUsage = vi.fn();
const mockCurrentYearMonth = vi.fn().mockReturnValue('2026-05');

vi.mock('$lib/server/billing/daQuota', () => ({
	getOrCreateMonthlyUsage: (...args: any[]) => mockGetOrCreateMonthlyUsage(...args),
	currentYearMonth: () => mockCurrentYearMonth()
}));

vi.mock('$lib/server/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// ── Import after mocks ─────────────────────────────────────────

import {
	checkEditAllowed,
	quickClassifyEdit,
	type InterceptorCaseDoc
} from '$lib/server/caseLock/interceptor';
import type { CaseEditSnapshot } from '$lib/server/caseLock/editImpact';
import type { CaseLockState } from '$lib/server/caseLock/types';

// ── Test helpers ───────────────────────────────────────────────

const TEST_DSA_ID = new ObjectId();

function mockLockState(overrides: Partial<CaseLockState> = {}): CaseLockState {
	return {
		is_locked: true,
		locked_at: new Date('2026-05-01'),
		fingerprint_sha256: 'abc123',
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

function mockDocUploadCase(lock: CaseLockState | null = null): InterceptorCaseDoc {
	return { assessment_mode: 'doc_upload', lock };
}

function mockManualCase(): InterceptorCaseDoc {
	return { assessment_mode: 'manual', lock: null };
}

/** Create a "before" identity snapshot */
function beforeSnapshot(overrides: Partial<CaseEditSnapshot> = {}): CaseEditSnapshot {
	return {
		loan_type: 'home_loan',
		loan_amount: 3500000,
		applicants: [{ pan: 'ABCPD1234E' }],
		property_state: 'Maharashtra',
		...overrides
	};
}

/** Create an "after" identity snapshot — minor change (same identity fields) */
function afterMinorSnapshot(): CaseEditSnapshot {
	return {
		loan_type: 'home_loan',
		loan_amount: 3500000, // same amount
		applicants: [{ pan: 'ABCPD1234E' }], // same PAN
		property_state: 'Maharashtra' // same state
	};
}

/** Create an "after" identity snapshot — major change (loan type changed) */
function afterMajorSnapshot(): CaseEditSnapshot {
	return {
		loan_type: 'lap', // CHANGED
		loan_amount: 3500000,
		applicants: [{ pan: 'ABCPD1234E' }],
		property_state: 'Maharashtra'
	};
}

function mockUsageDoc(consumed: number, baseQuota: number, topupQuota = 0) {
	return {
		_id: new ObjectId(),
		dsa_id: TEST_DSA_ID,
		year_month: '2026-05',
		tier: 'pro_da',
		base_quota: baseQuota,
		topup_quota: topupQuota,
		consumed,
		events: [],
		overage_charges_pending: 0
	};
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

beforeEach(() => {
	vi.clearAllMocks();
	mockCurrentYearMonth.mockReturnValue('2026-05');
});

// ── checkEditAllowed — bypass paths ────────────────────────────

describe('checkEditAllowed — bypass paths', () => {
	it('should allow any edit on manual-mode cases', async () => {
		const result = await checkEditAllowed(
			mockManualCase(),
			beforeSnapshot(),
			afterMajorSnapshot(), // major change, but irrelevant for manual mode
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
		// Should NOT have checked quota
		expect(mockGetOrCreateMonthlyUsage).not.toHaveBeenCalled();
	});

	it('should allow any edit on unlocked doc-upload cases', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(null), // not locked
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
		expect(mockGetOrCreateMonthlyUsage).not.toHaveBeenCalled();
	});

	it('should allow any edit when lock.is_locked is false', async () => {
		const inactiveLock = mockLockState({ is_locked: false });
		const result = await checkEditAllowed(
			mockDocUploadCase(inactiveLock),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
	});

	it('should allow minor edits on locked doc-upload cases', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMinorSnapshot(), // minor change (no identity fields changed)
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
		// Minor edits skip quota check
		expect(mockGetOrCreateMonthlyUsage).not.toHaveBeenCalled();
	});

	it('should treat undefined assessment_mode as non-doc-upload (legacy case)', async () => {
		const result = await checkEditAllowed(
			{ assessment_mode: undefined, lock: mockLockState() },
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
	});
});

// ── checkEditAllowed — major edit with quota available ──────────

describe('checkEditAllowed — major edit with quota available', () => {
	it('should block with confirmation UI when quota is available', async () => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(5, 50)); // 5/50 used

		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.requires_quota).toBe(true);
			expect(result.ui_action).toBe('show_unlock_confirmation_with_quota_cost');
			expect(result.reasons).toContain('loan_type_changed');
			expect(result.quota_consumed).toBe(5);
			expect(result.quota_total).toBe(50);
			// 2026-05-28: top-ups retired; can_topup is now permanently false.
			expect(result.can_topup).toBe(false);
		}
	});

	it('should include all triggered reasons', async () => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(10, 50));

		// Multiple triggers: loan type + amount major change
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			{
				loan_type: 'lap', // trigger 1: type changed
				loan_amount: 10000000, // trigger 2: >10% AND bucket cross
				applicants: [{ pan: 'ABCPD1234E' }],
				property_state: 'Maharashtra'
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('loan_type_changed');
			expect(result.reasons).toContain('amount_major_change');
		}
	});

	it('should account for topup_quota in total', async () => {
		// Base 50, topup 10, consumed 55 → 5 remaining (not exhausted)
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(55, 50, 10));

		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.ui_action).toBe('show_unlock_confirmation_with_quota_cost');
			expect(result.quota_total).toBe(60); // 50 base + 10 topup
		}
	});
});

// ── checkEditAllowed — major edit with quota exhausted ──────────

describe('checkEditAllowed — major edit with quota exhausted', () => {
	it('should show topup_required for non-enterprise when quota exhausted', async () => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(50, 50)); // exactly at limit

		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'pro_da' // non-enterprise
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.ui_action).toBe('show_topup_required');
			// 2026-05-28: top-ups retired; can_topup is now permanently false.
			expect(result.can_topup).toBe(false);
			expect(result.quota_consumed).toBe(50);
			expect(result.quota_total).toBe(50);
		}
	});

	it('should show confirmation for enterprise_da even when quota exhausted (overage)', async () => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(100, 100)); // exhausted

		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'enterprise_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			// Enterprise gets confirmation (overage applies), not topup-required
			expect(result.ui_action).toBe('show_unlock_confirmation_with_quota_cost');
			expect(result.can_topup).toBe(false); // no topup needed
		}
	});

	it('should show topup_required for basic_da when exhausted', async () => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(10, 10));

		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot(),
			TEST_DSA_ID,
			'basic_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.ui_action).toBe('show_topup_required');
		}
	});
});

// ── checkEditAllowed — specific edit triggers ───────────────────

describe('checkEditAllowed — specific edit triggers', () => {
	beforeEach(() => {
		mockGetOrCreateMonthlyUsage.mockResolvedValue(mockUsageDoc(5, 50));
	});

	it('should detect applicant PAN swap as major', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			{
				loan_type: 'home_loan',
				loan_amount: 3500000,
				applicants: [{ pan: 'XYZPQ5678R' }], // different PAN
				property_state: 'Maharashtra'
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('applicant_0_pan_changed');
		}
	});

	it('should detect applicant count change as major', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			{
				loan_type: 'home_loan',
				loan_amount: 3500000,
				applicants: [{ pan: 'ABCPD1234E' }, { pan: 'XYZPQ5678R' }], // added co-app
				property_state: 'Maharashtra'
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('applicant_count_changed');
		}
	});

	it('should detect property state change as major', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot({ property_state: 'Maharashtra' }),
			{
				loan_type: 'home_loan',
				loan_amount: 3500000,
				applicants: [{ pan: 'ABCPD1234E' }],
				property_state: 'Karnataka' // different state
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('property_state_changed');
		}
	});

	it('should detect amount >10% as major', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot({ loan_amount: 3500000 }),
			{
				loan_type: 'home_loan',
				loan_amount: 4000000, // ~14% increase + bucket cross
				applicants: [{ pan: 'ABCPD1234E' }],
				property_state: 'Maharashtra'
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('amount_major_change');
		}
	});

	it('should allow small amount change within same bucket as minor', async () => {
		const result = await checkEditAllowed(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot({ loan_amount: 3500000 }),
			{
				loan_type: 'home_loan',
				loan_amount: 3600000, // ~2.8% increase, same bucket (3.5M)
				applicants: [{ pan: 'ABCPD1234E' }],
				property_state: 'Maharashtra'
			},
			TEST_DSA_ID,
			'pro_da'
		);

		expect(result.allowed).toBe(true);
	});
});

// ── quickClassifyEdit (synchronous, no DB) ──────────────────────

describe('quickClassifyEdit', () => {
	it('should return allowed for manual-mode cases', () => {
		const result = quickClassifyEdit(mockManualCase(), beforeSnapshot(), afterMajorSnapshot());
		expect(result.allowed).toBe(true);
	});

	it('should return allowed for unlocked cases', () => {
		const result = quickClassifyEdit(mockDocUploadCase(null), beforeSnapshot(), afterMajorSnapshot());
		expect(result.allowed).toBe(true);
	});

	it('should return allowed for minor edits on locked cases', () => {
		const result = quickClassifyEdit(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMinorSnapshot()
		);
		expect(result.allowed).toBe(true);
	});

	it('should return blocked with reasons for major edits on locked cases', () => {
		const result = quickClassifyEdit(
			mockDocUploadCase(mockLockState()),
			beforeSnapshot(),
			afterMajorSnapshot()
		);

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons).toContain('loan_type_changed');
		}
	});

	it('should detect multiple simultaneous triggers', () => {
		const result = quickClassifyEdit(mockDocUploadCase(mockLockState()), beforeSnapshot(), {
			loan_type: 'personal_loan',
			loan_amount: 10000000,
			applicants: [{ pan: 'DIFFERENT1' }, { pan: 'NEWCOAPP22' }],
			property_state: 'Karnataka'
		});

		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reasons.length).toBeGreaterThanOrEqual(3);
			expect(result.reasons).toContain('loan_type_changed');
			expect(result.reasons).toContain('applicant_count_changed');
			expect(result.reasons).toContain('amount_major_change');
		}
	});
});
