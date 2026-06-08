/**
 * DATA-3 — Verify-gate contract.
 *
 * G1 — field completeness
 * G2 — confidence floor (>= 0.85)
 * G3 — DSA confirmed OR auto-verify floor elapsed (14 days)
 * G4 — case locked AND billed
 *
 * Each gate has isolation tests; the suite ends with the conjunction.
 */

import { describe, it, expect } from 'vitest';
import {
	checkVerifyGate,
	CONFIDENCE_FLOOR,
	AUTO_VERIFY_FLOOR_DAYS,
	DEFAULT_REQUIRED_KEYS_BY_TIER
} from '$lib/server/data3/verifyGate';
import type { VerifyGateInput } from '$lib/server/data3/verifyGate';

const REFERENCE_NOW = new Date('2026-05-16T00:00:00.000Z');

function baseInput(overrides: Partial<VerifyGateInput> = {}): VerifyGateInput {
	return {
		extraction: {
			fields: { account_holder: 'A. K. Sharma', closing_balance: 125000 },
			confidence: 0.92
		},
		requiredFieldKeys: ['account_holder', 'closing_balance'],
		dsa: {
			confirmedAt: new Date('2026-05-10T10:00:00.000Z'),
			extractedAt: new Date('2026-05-09T10:00:00.000Z')
		},
		caseState: { isLocked: true, isBilled: true },
		now: REFERENCE_NOW,
		...overrides
	};
}

describe('G1 — field completeness', () => {
	it('passes when all required keys are present and non-null', () => {
		const r = checkVerifyGate(baseInput());
		expect(r.g1_fieldCompleteness).toBe(true);
		expect(r.verified).toBe(true);
	});

	it('fails when extraction envelope is null', () => {
		const r = checkVerifyGate(baseInput({ extraction: null }));
		expect(r.g1_fieldCompleteness).toBe(false);
		expect(r.verified).toBe(false);
		expect(r.reason).toContain('G1');
	});

	it('fails when a required key is missing entirely', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: { fields: { account_holder: 'A. K.' }, confidence: 0.95 }
			})
		);
		expect(r.g1_fieldCompleteness).toBe(false);
		expect(r.verified).toBe(false);
	});

	it('fails when a required key is null', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: {
					fields: { account_holder: null, closing_balance: 100 },
					confidence: 0.95
				}
			})
		);
		expect(r.g1_fieldCompleteness).toBe(false);
	});

	it('fails when a required key is empty string', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: { fields: { account_holder: '', closing_balance: 100 }, confidence: 0.95 }
			})
		);
		expect(r.g1_fieldCompleteness).toBe(false);
	});

	it('passes with no required keys (pathological — nothing to check)', () => {
		const r = checkVerifyGate(
			baseInput({
				requiredFieldKeys: [],
				extraction: { fields: {}, confidence: 0.95 }
			})
		);
		expect(r.g1_fieldCompleteness).toBe(true);
	});
});

describe('G2 — confidence floor', () => {
	it('passes at exactly the floor (0.85)', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: { fields: { account_holder: 'A', closing_balance: 1 }, confidence: 0.85 }
			})
		);
		expect(r.g2_confidenceFloor).toBe(true);
	});

	it('fails one tick below the floor', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: { fields: { account_holder: 'A', closing_balance: 1 }, confidence: 0.849 }
			})
		);
		expect(r.g2_confidenceFloor).toBe(false);
		expect(r.verified).toBe(false);
		expect(r.reason).toContain('G2');
	});

	it('exposes the failing confidence in the reason string', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: { fields: { account_holder: 'A', closing_balance: 1 }, confidence: 0.5 }
			})
		);
		expect(r.reason).toMatch(/0\.50/);
	});

	it('CONFIDENCE_FLOOR constant is 0.85 (locks the spec contract)', () => {
		expect(CONFIDENCE_FLOOR).toBe(0.85);
	});
});

describe('G3 — DSA confirmed OR auto-verify floor', () => {
	it('passes when DSA explicitly confirmed', () => {
		const r = checkVerifyGate(baseInput());
		expect(r.g3_dsaConfirmedOrAutoVerified).toBe(true);
	});

	it('passes when 14 days have elapsed since extraction even without DSA confirm', () => {
		const extracted = new Date('2026-05-01T00:00:00.000Z'); // 15 days before now
		const r = checkVerifyGate(
			baseInput({ dsa: { confirmedAt: null, extractedAt: extracted } })
		);
		expect(r.g3_dsaConfirmedOrAutoVerified).toBe(true);
	});

	it('passes at exactly the floor (14 days)', () => {
		const extracted = new Date(REFERENCE_NOW.getTime() - AUTO_VERIFY_FLOOR_DAYS * 86400 * 1000);
		const r = checkVerifyGate(
			baseInput({ dsa: { confirmedAt: null, extractedAt: extracted } })
		);
		expect(r.g3_dsaConfirmedOrAutoVerified).toBe(true);
	});

	it('fails when no DSA confirm and only 13 days have elapsed', () => {
		const extracted = new Date(REFERENCE_NOW.getTime() - 13 * 86400 * 1000);
		const r = checkVerifyGate(
			baseInput({ dsa: { confirmedAt: null, extractedAt: extracted } })
		);
		expect(r.g3_dsaConfirmedOrAutoVerified).toBe(false);
		expect(r.reason).toContain('G3');
	});

	it('fails when extractedAt is null (extraction never ran)', () => {
		const r = checkVerifyGate(
			baseInput({ dsa: { confirmedAt: null, extractedAt: null } })
		);
		expect(r.g3_dsaConfirmedOrAutoVerified).toBe(false);
	});

	it('AUTO_VERIFY_FLOOR_DAYS constant is 14 (locks the spec contract)', () => {
		expect(AUTO_VERIFY_FLOOR_DAYS).toBe(14);
	});
});

describe('G4 — case locked AND billed', () => {
	it('fails when not locked', () => {
		const r = checkVerifyGate(baseInput({ caseState: { isLocked: false, isBilled: true } }));
		expect(r.g4_caseLockedAndBilled).toBe(false);
		expect(r.reason).toContain('not locked');
	});

	it('fails when locked but not billed', () => {
		const r = checkVerifyGate(baseInput({ caseState: { isLocked: true, isBilled: false } }));
		expect(r.g4_caseLockedAndBilled).toBe(false);
		expect(r.reason).toContain('not been billed');
	});

	it('fails when both false', () => {
		const r = checkVerifyGate(baseInput({ caseState: { isLocked: false, isBilled: false } }));
		expect(r.g4_caseLockedAndBilled).toBe(false);
	});

	it('passes when both true', () => {
		const r = checkVerifyGate(baseInput({ caseState: { isLocked: true, isBilled: true } }));
		expect(r.g4_caseLockedAndBilled).toBe(true);
	});
});

describe('verifyGate conjunction', () => {
	it('verified === true ONLY when all four gates pass', () => {
		expect(checkVerifyGate(baseInput()).verified).toBe(true);
	});

	it('any single failing gate → verified === false', () => {
		// G1 fails
		expect(checkVerifyGate(baseInput({ extraction: null })).verified).toBe(false);
		// G2 fails
		expect(
			checkVerifyGate(
				baseInput({
					extraction: { fields: { account_holder: 'A', closing_balance: 1 }, confidence: 0.5 }
				})
			).verified
		).toBe(false);
		// G3 fails
		expect(
			checkVerifyGate(
				baseInput({ dsa: { confirmedAt: null, extractedAt: REFERENCE_NOW } })
			).verified
		).toBe(false);
		// G4 fails
		expect(
			checkVerifyGate(baseInput({ caseState: { isLocked: true, isBilled: false } })).verified
		).toBe(false);
	});

	it('reason is null when verified', () => {
		expect(checkVerifyGate(baseInput()).reason).toBeNull();
	});

	it('reason identifies the first-failing gate when multiple fail', () => {
		const r = checkVerifyGate(
			baseInput({
				extraction: null, // G1 fail
				dsa: { confirmedAt: null, extractedAt: null }, // G3 would also fail
				caseState: { isLocked: false, isBilled: false } // G4 would also fail
			})
		);
		expect(r.reason).toContain('G1');
	});
});

describe('DEFAULT_REQUIRED_KEYS_BY_TIER — sane fallbacks', () => {
	it('every tier has at least one required key', () => {
		expect(DEFAULT_REQUIRED_KEYS_BY_TIER.financial.length).toBeGreaterThan(0);
		expect(DEFAULT_REQUIRED_KEYS_BY_TIER.kyc.length).toBeGreaterThan(0);
		expect(DEFAULT_REQUIRED_KEYS_BY_TIER.property.length).toBeGreaterThan(0);
		expect(DEFAULT_REQUIRED_KEYS_BY_TIER.high_stakes.length).toBeGreaterThan(0);
	});

	it('high_stakes is the strictest (largest required-key set)', () => {
		expect(DEFAULT_REQUIRED_KEYS_BY_TIER.high_stakes.length).toBeGreaterThanOrEqual(
			DEFAULT_REQUIRED_KEYS_BY_TIER.financial.length
		);
	});
});
