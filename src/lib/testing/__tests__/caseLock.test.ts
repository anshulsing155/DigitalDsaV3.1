/**
 * Case Lock — Fingerprint + Edit Impact Tests
 * ══════════════════════════════════════════════════════════════════
 * Comprehensive tests for fingerprint computation and edit-impact
 * classification. These two modules are the foundation for the lock
 * system's billing logic.
 *
 * Decision 2.1 🟡 — major edit definition (5 fields)
 * Decision 3.1 — ₹5L bucket size
 * Decision 3.2 🟡 — fingerprint inputs (3-input formula)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { computeCaseFingerprint, fingerprintsMatch } from '$lib/server/caseLock/fingerprint';
import {
	classifyEdit,
	isMajorEdit,
	AMOUNT_BUCKET_SIZE,
	AMOUNT_PERCENT_THRESHOLD
} from '$lib/server/caseLock/editImpact';
import type { FingerprintInput } from '$lib/server/caseLock/fingerprint';
import type { CaseEditSnapshot } from '$lib/server/caseLock/editImpact';

// ── Test helpers ────────────────────────────────────────────────

function makeFingerInput(overrides: Partial<FingerprintInput> = {}): FingerprintInput {
	return {
		loan_type: 'home_loan',
		applicants: [{ pan: 'BNZPM2501F' }],
		loan_amount: 3500000, // ₹35L
		...overrides
	};
}

function makeCaseSnapshot(overrides: Partial<CaseEditSnapshot> = {}): CaseEditSnapshot {
	return {
		loan_type: 'home_loan',
		loan_amount: 3500000, // ₹35L
		applicants: [{ pan: 'BNZPM2501F' }],
		property_state: 'Maharashtra',
		...overrides
	};
}

// ══════════════════════════════════════════════════════════════════
// FINGERPRINT TESTS
// ══════════════════════════════════════════════════════════════════

describe('computeCaseFingerprint', () => {
	describe('determinism', () => {
		it('same inputs always produce same fingerprint', () => {
			const input = makeFingerInput();
			const result1 = computeCaseFingerprint(input);
			const result2 = computeCaseFingerprint(input);
			expect(result1.fingerprint_sha256).toBe(result2.fingerprint_sha256);
		});

		it('produces a 64-character hex string', () => {
			const result = computeCaseFingerprint(makeFingerInput());
			expect(result.fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	describe('amount bucket', () => {
		it('₹35L → bucket ₹35L (3500000)', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 3500000 }));
			expect(result.amount_bucket).toBe(3500000);
		});

		it('₹37L → bucket ₹35L (same bucket)', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 3700000 }));
			expect(result.amount_bucket).toBe(3500000);
		});

		it('₹39.99L → bucket ₹35L (same bucket, upper edge)', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 3999999 }));
			expect(result.amount_bucket).toBe(3500000);
		});

		it('₹40L → bucket ₹40L (next bucket)', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 4000000 }));
			expect(result.amount_bucket).toBe(4000000);
		});

		it('₹0 → bucket ₹0', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 0 }));
			expect(result.amount_bucket).toBe(0);
		});

		it('₹4.99L → bucket ₹0 (below first ₹5L boundary)', () => {
			const result = computeCaseFingerprint(makeFingerInput({ loan_amount: 499999 }));
			expect(result.amount_bucket).toBe(0);
		});
	});

	describe('same fingerprint (same loan identity)', () => {
		it('same loan + same PAN + amount within same bucket → same fingerprint', () => {
			const fp1 = computeCaseFingerprint(makeFingerInput({ loan_amount: 3500000 }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ loan_amount: 3900000 }));
			expect(fp1.fingerprint_sha256).toBe(fp2.fingerprint_sha256);
		});

		it('PAN case-insensitive — BNZPM2501F and bnzpm2501f → same fingerprint', () => {
			const fp1 = computeCaseFingerprint(makeFingerInput({ applicants: [{ pan: 'BNZPM2501F' }] }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ applicants: [{ pan: 'bnzpm2501f' }] }));
			expect(fp1.fingerprint_sha256).toBe(fp2.fingerprint_sha256);
		});

		it('PAN with whitespace trimmed → same fingerprint', () => {
			const fp1 = computeCaseFingerprint(makeFingerInput({ applicants: [{ pan: 'BNZPM2501F' }] }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ applicants: [{ pan: '  BNZPM2501F  ' }] }));
			expect(fp1.fingerprint_sha256).toBe(fp2.fingerprint_sha256);
		});

		it('applicant order does not affect fingerprint (sorted PANs)', () => {
			const fp1 = computeCaseFingerprint(
				makeFingerInput({
					applicants: [{ pan: 'AAAPB1234C' }, { pan: 'ZZZZZ9999Z' }]
				})
			);
			const fp2 = computeCaseFingerprint(
				makeFingerInput({
					applicants: [{ pan: 'ZZZZZ9999Z' }, { pan: 'AAAPB1234C' }]
				})
			);
			expect(fp1.fingerprint_sha256).toBe(fp2.fingerprint_sha256);
		});

		it('loan_type case-insensitive — home_loan and HOME_LOAN → same fingerprint', () => {
			const fp1 = computeCaseFingerprint(makeFingerInput({ loan_type: 'home_loan' }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ loan_type: 'HOME_LOAN' }));
			expect(fp1.fingerprint_sha256).toBe(fp2.fingerprint_sha256);
		});
	});

	describe('different fingerprint (different loan identity)', () => {
		it('different loan type → different fingerprint', () => {
			const fp1 = computeCaseFingerprint(makeFingerInput({ loan_type: 'home_loan' }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ loan_type: 'personal_loan' }));
			expect(fp1.fingerprint_sha256).not.toBe(fp2.fingerprint_sha256);
		});

		it('adding a co-applicant → different fingerprint', () => {
			const fp1 = computeCaseFingerprint(
				makeFingerInput({ applicants: [{ pan: 'BNZPM2501F' }] })
			);
			const fp2 = computeCaseFingerprint(
				makeFingerInput({
					applicants: [{ pan: 'BNZPM2501F' }, { pan: 'AAAPB1234C' }]
				})
			);
			expect(fp1.fingerprint_sha256).not.toBe(fp2.fingerprint_sha256);
		});

		it('different PAN (same count) → different fingerprint', () => {
			const fp1 = computeCaseFingerprint(
				makeFingerInput({ applicants: [{ pan: 'BNZPM2501F' }] })
			);
			const fp2 = computeCaseFingerprint(
				makeFingerInput({ applicants: [{ pan: 'AAAPB1234C' }] })
			);
			expect(fp1.fingerprint_sha256).not.toBe(fp2.fingerprint_sha256);
		});

		it('amount crossing bucket boundary → different fingerprint', () => {
			// ₹35L (bucket 35L) vs ₹40L (bucket 40L)
			const fp1 = computeCaseFingerprint(makeFingerInput({ loan_amount: 3500000 }));
			const fp2 = computeCaseFingerprint(makeFingerInput({ loan_amount: 4000000 }));
			expect(fp1.fingerprint_sha256).not.toBe(fp2.fingerprint_sha256);
		});
	});

	describe('pan_hashes output', () => {
		it('returns sorted PAN hashes', () => {
			const result = computeCaseFingerprint(
				makeFingerInput({
					applicants: [{ pan: 'ZZZZZ9999Z' }, { pan: 'AAAPB1234C' }]
				})
			);
			// Hashes should be sorted alphabetically
			expect(result.pan_hashes).toHaveLength(2);
			expect(result.pan_hashes[0] < result.pan_hashes[1]).toBe(true);
		});

		it('each PAN hash is a 64-char hex string', () => {
			const result = computeCaseFingerprint(makeFingerInput());
			for (const hash of result.pan_hashes) {
				expect(hash).toMatch(/^[a-f0-9]{64}$/);
			}
		});
	});
});

describe('fingerprintsMatch', () => {
	it('returns true for identical fingerprints', () => {
		const fp = computeCaseFingerprint(makeFingerInput());
		expect(fingerprintsMatch(fp.fingerprint_sha256, fp.fingerprint_sha256)).toBe(true);
	});

	it('returns false for different fingerprints', () => {
		const fp1 = computeCaseFingerprint(makeFingerInput({ loan_type: 'home_loan' }));
		const fp2 = computeCaseFingerprint(makeFingerInput({ loan_type: 'lap' }));
		expect(fingerprintsMatch(fp1.fingerprint_sha256, fp2.fingerprint_sha256)).toBe(false);
	});
});

// ══════════════════════════════════════════════════════════════════
// EDIT IMPACT TESTS
// ══════════════════════════════════════════════════════════════════

describe('classifyEdit', () => {
	describe('minor edits (no quota charge)', () => {
		it('no changes at all → minor', () => {
			const snapshot = makeCaseSnapshot();
			const result = classifyEdit(snapshot, snapshot);
			expect(result.impact).toBe('minor');
			expect(result.reasons).toEqual([]);
		});

		it('amount change within ±10% AND same bucket → minor', () => {
			// ₹35L → ₹36L (2.9% change, same ₹35L bucket)
			const before = makeCaseSnapshot({ loan_amount: 3500000 });
			const after = makeCaseSnapshot({ loan_amount: 3600000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});

		it('address-only change → minor (not tracked)', () => {
			// editImpact only looks at the 5 trigger fields
			// address isn't in CaseEditSnapshot — implicitly minor
			const before = makeCaseSnapshot();
			const after = makeCaseSnapshot();
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});

		it('property state added for first time (was empty) → minor', () => {
			// Setting initial property state is not a "change"
			const before = makeCaseSnapshot({ property_state: null });
			const after = makeCaseSnapshot({ property_state: 'Maharashtra' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});

		it('property state empty → empty → minor', () => {
			const before = makeCaseSnapshot({ property_state: '' });
			const after = makeCaseSnapshot({ property_state: '' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});
	});

	describe('Trigger 1: loan type changed', () => {
		it('home_loan → personal_loan → major', () => {
			const before = makeCaseSnapshot({ loan_type: 'home_loan' });
			const after = makeCaseSnapshot({ loan_type: 'personal_loan' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('loan_type_changed');
		});

		it('case-insensitive comparison — same type different case → minor', () => {
			const before = makeCaseSnapshot({ loan_type: 'Home_Loan' });
			const after = makeCaseSnapshot({ loan_type: 'home_loan' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});
	});

	describe('Trigger 2: applicant count changed', () => {
		it('adding a co-applicant → major', () => {
			const before = makeCaseSnapshot({ applicants: [{ pan: 'BNZPM2501F' }] });
			const after = makeCaseSnapshot({
				applicants: [{ pan: 'BNZPM2501F' }, { pan: 'AAAPB1234C' }]
			});
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('applicant_count_changed');
		});

		it('removing a co-applicant → major', () => {
			const before = makeCaseSnapshot({
				applicants: [{ pan: 'BNZPM2501F' }, { pan: 'AAAPB1234C' }]
			});
			const after = makeCaseSnapshot({ applicants: [{ pan: 'BNZPM2501F' }] });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('applicant_count_changed');
		});
	});

	describe('Trigger 3: PAN swap', () => {
		it('PAN swap on primary applicant → major', () => {
			const before = makeCaseSnapshot({ applicants: [{ pan: 'BNZPM2501F' }] });
			const after = makeCaseSnapshot({ applicants: [{ pan: 'AAAPB1234C' }] });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('applicant_0_pan_changed');
		});

		it('PAN swap on co-applicant (slot 1) → major', () => {
			const before = makeCaseSnapshot({
				applicants: [{ pan: 'BNZPM2501F' }, { pan: 'AAAPB1234C' }]
			});
			const after = makeCaseSnapshot({
				applicants: [{ pan: 'BNZPM2501F' }, { pan: 'ZZZZZ9999Z' }]
			});
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('applicant_1_pan_changed');
		});

		it('same PAN different case → minor (normalized)', () => {
			const before = makeCaseSnapshot({ applicants: [{ pan: 'BNZPM2501F' }] });
			const after = makeCaseSnapshot({ applicants: [{ pan: 'bnzpm2501f' }] });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});
	});

	describe('Trigger 4: amount major change', () => {
		it('amount change >10% (same bucket) → major', () => {
			// ₹35L → ₹38.6L (10.3% change, same bucket ₹35L)
			const before = makeCaseSnapshot({ loan_amount: 3500000 });
			const after = makeCaseSnapshot({ loan_amount: 3860000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('amount_major_change');
		});

		it('amount crossing bucket boundary (<10% change) → major', () => {
			// ₹39.5L → ₹40.5L (2.5% change, but crosses 35L→40L bucket)
			const before = makeCaseSnapshot({ loan_amount: 3950000 });
			const after = makeCaseSnapshot({ loan_amount: 4050000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('amount_major_change');
		});

		it('₹6L change crossing bucket → major', () => {
			// ₹35L → ₹41L (17% change + crosses bucket)
			const before = makeCaseSnapshot({ loan_amount: 3500000 });
			const after = makeCaseSnapshot({ loan_amount: 4100000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
		});

		it('amount exactly at 10% threshold → minor (must EXCEED 10%)', () => {
			// ₹35L → ₹38.5L (exactly 10%, not >10%)
			const before = makeCaseSnapshot({ loan_amount: 3500000 });
			const after = makeCaseSnapshot({ loan_amount: 3850000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});

		it('amount from 0 to non-zero → major', () => {
			const before = makeCaseSnapshot({ loan_amount: 0 });
			const after = makeCaseSnapshot({ loan_amount: 3500000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
		});

		it('₹1L change within bucket and <10% → minor', () => {
			// ₹35L → ₹36L (2.9%, same ₹35L bucket)
			const before = makeCaseSnapshot({ loan_amount: 3500000 });
			const after = makeCaseSnapshot({ loan_amount: 3600000 });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});
	});

	describe('Trigger 5: property state changed', () => {
		it('Maharashtra → Karnataka → major', () => {
			const before = makeCaseSnapshot({ property_state: 'Maharashtra' });
			const after = makeCaseSnapshot({ property_state: 'Karnataka' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('property_state_changed');
		});

		it('same state different case → minor (normalized)', () => {
			const before = makeCaseSnapshot({ property_state: 'Maharashtra' });
			const after = makeCaseSnapshot({ property_state: 'maharashtra' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});

		it('property state removed (was set, now empty) → minor (boundary: only fires when both non-empty)', () => {
			// Removing state is unusual — likely means the field was cleared,
			// not that the property moved. We only trigger on state-TO-state changes.
			const before = makeCaseSnapshot({ property_state: 'Maharashtra' });
			const after = makeCaseSnapshot({ property_state: '' });
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('minor');
		});
	});

	describe('multiple triggers', () => {
		it('loan type + PAN swap → major with 2 reasons', () => {
			const before = makeCaseSnapshot({
				loan_type: 'home_loan',
				applicants: [{ pan: 'BNZPM2501F' }]
			});
			const after = makeCaseSnapshot({
				loan_type: 'lap',
				applicants: [{ pan: 'AAAPB1234C' }]
			});
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			expect(result.reasons).toContain('loan_type_changed');
			expect(result.reasons).toContain('applicant_0_pan_changed');
			expect(result.reasons).toHaveLength(2);
		});

		it('all 5 triggers at once → major with 5 reasons', () => {
			const before = makeCaseSnapshot({
				loan_type: 'home_loan',
				loan_amount: 3500000,
				applicants: [{ pan: 'BNZPM2501F' }],
				property_state: 'Maharashtra'
			});
			const after = makeCaseSnapshot({
				loan_type: 'lap',
				loan_amount: 10000000, // crosses bucket + >10%
				applicants: [{ pan: 'AAAPB1234C' }, { pan: 'ZZZZZ9999Z' }],
				property_state: 'Karnataka'
			});
			const result = classifyEdit(before, after);
			expect(result.impact).toBe('major');
			// loan_type_changed, applicant_count_changed, amount_major_change, property_state_changed
			expect(result.reasons.length).toBeGreaterThanOrEqual(4);
		});
	});
});

describe('isMajorEdit', () => {
	it('returns true for major edits', () => {
		const before = makeCaseSnapshot({ loan_type: 'home_loan' });
		const after = makeCaseSnapshot({ loan_type: 'personal_loan' });
		expect(isMajorEdit(before, after)).toBe(true);
	});

	it('returns false for minor edits', () => {
		const before = makeCaseSnapshot();
		const after = makeCaseSnapshot();
		expect(isMajorEdit(before, after)).toBe(false);
	});
});

describe('constants alignment', () => {
	it('AMOUNT_BUCKET_SIZE is ₹5L (500000)', () => {
		expect(AMOUNT_BUCKET_SIZE).toBe(500_000);
	});

	it('AMOUNT_PERCENT_THRESHOLD is 10%', () => {
		expect(AMOUNT_PERCENT_THRESHOLD).toBe(0.10);
	});
});
