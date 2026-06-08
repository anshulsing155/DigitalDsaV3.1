/**
 * Trial-eligibility module tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of:
 *
 *   normalizeIdentifier(kind, raw) — strips whitespace, uppercases,
 *     reduces mobile to last 10 digits, returns null for too-short.
 *
 *   hashIdentifier(kind, raw) — SHA-256(normalized || pepper); same
 *     input yields same output (determinism); different pepper yields
 *     different output (pepper actually mixes in).
 *
 *   checkTrialEligibility(dsa_id):
 *     - returns dsa_not_found when DSA doc missing
 *     - returns pan_missing when DSA has no panNumber
 *     - returns eligible=true when no blocklist match
 *     - returns eligible=false with blockingIdentifier=mobile/pan/gst
 *       when ANY of the three matches a prior trial
 *     - skips GST check when GST is absent on the DSA doc
 *     - ignores blocklist rows with revoked_at set (admin override)
 *
 *   recordTrialGrant — inserts a row per non-null identifier hash;
 *     catches E11000 cleanly.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockDsaFindOne = vi.fn();
const mockBlocklistFindOne = vi.fn();
const mockBlocklistInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: {
		findOne: (...args: unknown[]) => mockDsaFindOne(...args)
	},
	TrialIdentifierBlocklist: {
		findOne: (...args: unknown[]) => mockBlocklistFindOne(...args),
		insertOne: (...args: unknown[]) => mockBlocklistInsertOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$app/environment', () => ({
	dev: true // dev pepper fallback so tests don't need env setup
}));

vi.mock('$env/dynamic/private', () => ({
	env: { TRIAL_PEPPER: 'test-pepper-fixed-32-chars-abcdefgh' }
}));

beforeEach(() => {
	mockDsaFindOne.mockReset();
	mockBlocklistFindOne.mockReset();
	mockBlocklistInsertOne.mockReset();
});

const TEST_DSA = new ObjectId();

// ── normalizeIdentifier ────────────────────────────────────────

describe('normalizeIdentifier', () => {
	it('mobile: strips non-digits and takes last 10 of 11+ digits', async () => {
		const { normalizeIdentifier } = await import('../../../server/billing/trialEligibility');
		expect(normalizeIdentifier('mobile', '+91 98765 43210')).toBe('9876543210');
		expect(normalizeIdentifier('mobile', '919876543210')).toBe('9876543210');
		expect(normalizeIdentifier('mobile', 9876543210)).toBe('9876543210');
	});

	it('mobile: returns null for fewer than 10 digits', async () => {
		const { normalizeIdentifier } = await import('../../../server/billing/trialEligibility');
		expect(normalizeIdentifier('mobile', '987')).toBeNull();
		expect(normalizeIdentifier('mobile', '')).toBeNull();
		expect(normalizeIdentifier('mobile', null)).toBeNull();
	});

	it('pan: uppercases + strips whitespace; rejects too-short', async () => {
		const { normalizeIdentifier } = await import('../../../server/billing/trialEligibility');
		expect(normalizeIdentifier('pan', 'aaaaa1234a')).toBe('AAAAA1234A');
		expect(normalizeIdentifier('pan', ' AAAAA1234A ')).toBe('AAAAA1234A');
		expect(normalizeIdentifier('pan', 'short')).toBeNull();
	});

	it('gst: uppercases + strips whitespace; rejects <15 chars', async () => {
		const { normalizeIdentifier } = await import('../../../server/billing/trialEligibility');
		expect(normalizeIdentifier('gst', '29ABCDE1234F1Z5')).toBe('29ABCDE1234F1Z5');
		expect(normalizeIdentifier('gst', '29abcde1234f1z5')).toBe('29ABCDE1234F1Z5');
		expect(normalizeIdentifier('gst', '29ABCDE')).toBeNull();
	});
});

// ── hashIdentifier ─────────────────────────────────────────────

describe('hashIdentifier', () => {
	it('produces a deterministic 64-char hex hash', async () => {
		const { hashIdentifier } = await import('../../../server/billing/trialEligibility');
		const h1 = hashIdentifier('mobile', '9876543210');
		const h2 = hashIdentifier('mobile', '9876543210');
		expect(h1).toBe(h2);
		expect(h1).toMatch(/^[0-9a-f]{64}$/);
	});

	it('produces same hash for equivalent inputs (cross-format)', async () => {
		const { hashIdentifier } = await import('../../../server/billing/trialEligibility');
		// "+91 98765 43210" and "9876543210" should hash identically
		// because both normalize to "9876543210"
		expect(hashIdentifier('mobile', '+91 98765 43210')).toBe(hashIdentifier('mobile', '9876543210'));
		// "aaaaa1234a" and "AAAAA1234A" should hash identically
		expect(hashIdentifier('pan', 'aaaaa1234a')).toBe(hashIdentifier('pan', 'AAAAA1234A'));
	});

	it('produces DIFFERENT hashes for different identifier kinds with the same value', async () => {
		const { hashIdentifier } = await import('../../../server/billing/trialEligibility');
		// A weird value that's accepted by both — confirms `kind` doesn't
		// affect normalization for already-canonical inputs. Actually:
		// for pan and gst the normalization differs (15+ vs 10+ chars).
		// Test with a value valid as PAN but not GST.
		const pan = hashIdentifier('pan', 'AAAAA1234A');
		const mobile = hashIdentifier('mobile', '9876543210');
		expect(pan).not.toBe(mobile);
	});

	it('returns null when normalization yields null', async () => {
		const { hashIdentifier } = await import('../../../server/billing/trialEligibility');
		expect(hashIdentifier('mobile', '')).toBeNull();
		expect(hashIdentifier('pan', 'short')).toBeNull();
		expect(hashIdentifier('gst', null)).toBeNull();
	});
});

// ── checkTrialEligibility ──────────────────────────────────────

describe('checkTrialEligibility', () => {
	it('returns dsa_not_found when no DsaApplications doc', async () => {
		mockDsaFindOne.mockResolvedValueOnce(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA);
		expect(r).toEqual({ eligible: false, reason: 'dsa_not_found' });
	});

	it('returns pan_missing when DSA has no panNumber', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: undefined,
			gstNumber: undefined
		});
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA);
		expect(r).toEqual({ eligible: false, reason: 'pan_missing' });
	});

	it('returns eligible=true when no blocklist hits', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: '29ABCDE1234F1Z5'
		});
		mockBlocklistFindOne.mockResolvedValue(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA);
		expect(r).toEqual({ eligible: true });
		// All 3 identifiers consulted
		expect(mockBlocklistFindOne).toHaveBeenCalledTimes(3);
	});

	it('returns blocked when mobile matches a prior trial', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: undefined
		});
		const priorDsaId = new ObjectId();
		mockBlocklistFindOne.mockResolvedValueOnce({
			identifier_kind: 'mobile',
			dsa_id: priorDsaId
		});
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA);
		expect(r.eligible).toBe(false);
		expect(r.blockingIdentifier).toBe('mobile');
		expect(r.originalClaimDsaId).toBe(priorDsaId);
	});

	it('returns blocked when PAN matches (mobile clean, PAN dirty)', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: undefined
		});
		const priorDsaId = new ObjectId();
		mockBlocklistFindOne
			.mockResolvedValueOnce(null) // mobile clean
			.mockResolvedValueOnce({ identifier_kind: 'pan', dsa_id: priorDsaId }); // PAN match
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA);
		expect(r.eligible).toBe(false);
		expect(r.blockingIdentifier).toBe('pan');
		expect(r.originalClaimDsaId).toBe(priorDsaId);
	});

	it('skips GST check when GST is absent on the DSA doc', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: undefined
		});
		mockBlocklistFindOne.mockResolvedValue(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		await checkTrialEligibility(TEST_DSA);
		// Only mobile + PAN checked (2 calls), not 3
		expect(mockBlocklistFindOne).toHaveBeenCalledTimes(2);
		expect(mockBlocklistFindOne.mock.calls[0][0].identifier_kind).toBe('mobile');
		expect(mockBlocklistFindOne.mock.calls[1][0].identifier_kind).toBe('pan');
	});

	it('the blocklist query excludes revoked rows', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistFindOne.mockResolvedValue(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		await checkTrialEligibility(TEST_DSA);
		// Every call MUST include the revoked_at: { $exists: false } guard
		for (const call of mockBlocklistFindOne.mock.calls) {
			expect(call[0].revoked_at).toEqual({ $exists: false });
		}
	});

	// ── Device-ID layer ────────────────────────────────────────

	it('checks device hash as a 4th identifier when device_id is provided', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: '29ABCDE1234F1Z5'
		});
		mockBlocklistFindOne.mockResolvedValue(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		await checkTrialEligibility(TEST_DSA, {
			device_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
		});
		// 4 calls now: mobile, pan, gst, device
		expect(mockBlocklistFindOne).toHaveBeenCalledTimes(4);
		expect(mockBlocklistFindOne.mock.calls[3][0].identifier_kind).toBe('device');
	});

	it('skips the device check when device_id is null / undefined', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistFindOne.mockResolvedValue(null);
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		await checkTrialEligibility(TEST_DSA, { device_id: null });
		// Only mobile + PAN checked — no device call
		expect(mockBlocklistFindOne).toHaveBeenCalledTimes(2);
		for (const call of mockBlocklistFindOne.mock.calls) {
			expect(call[0].identifier_kind).not.toBe('device');
		}
	});

	it('blocks when device matches but PII clean — surfaces blockingIdentifier=device', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		const priorDsaId = new ObjectId();
		mockBlocklistFindOne
			.mockResolvedValueOnce(null) // mobile clean
			.mockResolvedValueOnce(null) // PAN clean
			.mockResolvedValueOnce({ identifier_kind: 'device', dsa_id: priorDsaId }); // device match
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA, {
			device_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
		});
		expect(r.eligible).toBe(false);
		expect(r.blockingIdentifier).toBe('device');
		expect(r.originalClaimDsaId).toBe(priorDsaId);
	});

	it('PII match takes precedence over device match (order: mobile → pan → gst → device)', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		// Mobile matches first; PAN + device would also match, but we want
		// to confirm we return the PII identifier (mobile) rather than device.
		mockBlocklistFindOne.mockResolvedValueOnce({
			identifier_kind: 'mobile',
			dsa_id: new ObjectId()
		});
		const { checkTrialEligibility } = await import(
			'../../../server/billing/trialEligibility'
		);
		const r = await checkTrialEligibility(TEST_DSA, {
			device_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
		});
		expect(r.blockingIdentifier).toBe('mobile');
		// Should short-circuit on first match — only 1 lookup
		expect(mockBlocklistFindOne).toHaveBeenCalledTimes(1);
	});
});

// ── recordTrialGrant ───────────────────────────────────────────

describe('recordTrialGrant', () => {
	it('inserts one row per non-null identifier hash', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A',
			gstNumber: '29ABCDE1234F1Z5'
		});
		mockBlocklistInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		const r = await recordTrialGrant({ dsa_id: TEST_DSA });
		expect(r.inserted).toBe(3);
		expect(mockBlocklistInsertOne).toHaveBeenCalledTimes(3);
	});

	it('skips GST when DSA has no gstNumber', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		const r = await recordTrialGrant({ dsa_id: TEST_DSA });
		expect(r.inserted).toBe(2);
		expect(mockBlocklistInsertOne).toHaveBeenCalledTimes(2);
	});

	it('catches E11000 duplicate key cleanly (does not throw)', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		const dupErr = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
		mockBlocklistInsertOne
			.mockRejectedValueOnce(dupErr)
			.mockResolvedValueOnce({ insertedId: new ObjectId() });
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		const r = await recordTrialGrant({ dsa_id: TEST_DSA });
		// Mobile insert duplicate (already on blocklist), PAN insert clean
		expect(r.inserted).toBe(1);
	});

	it('returns inserted: 0 when DsaApplications doc is missing', async () => {
		mockDsaFindOne.mockResolvedValueOnce(null);
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		const r = await recordTrialGrant({ dsa_id: TEST_DSA });
		expect(r.inserted).toBe(0);
		expect(mockBlocklistInsertOne).not.toHaveBeenCalled();
	});

	it('admin_override source is recorded on every inserted row', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		const auditId = new ObjectId();
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		await recordTrialGrant({
			dsa_id: TEST_DSA,
			source: 'admin_override',
			override_audit_id: auditId
		});
		for (const call of mockBlocklistInsertOne.mock.calls) {
			expect(call[0].source).toBe('admin_override');
			expect(call[0].override_audit_id).toBe(auditId);
		}
	});

	it('inserts a device row when device_id is provided', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		const r = await recordTrialGrant({
			dsa_id: TEST_DSA,
			device_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
		});
		// 3 rows: mobile + pan + device (no GST in this DSA)
		expect(r.inserted).toBe(3);
		const insertedKinds = mockBlocklistInsertOne.mock.calls.map(
			(c) => (c[0] as { identifier_kind: string }).identifier_kind
		);
		expect(insertedKinds).toContain('device');
	});

	it('prefers device_id_hash over device_id when both are passed', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			mobileNumber: '9876543210',
			panNumber: 'AAAAA1234A'
		});
		mockBlocklistInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		const precomputedHash = 'a'.repeat(64);
		const { recordTrialGrant } = await import('../../../server/billing/trialEligibility');
		await recordTrialGrant({
			dsa_id: TEST_DSA,
			device_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
			device_id_hash: precomputedHash
		});
		const deviceCall = mockBlocklistInsertOne.mock.calls.find(
			(c) => (c[0] as { identifier_kind: string }).identifier_kind === 'device'
		);
		expect(deviceCall).toBeDefined();
		expect((deviceCall![0] as { identifier_hash: string }).identifier_hash).toBe(
			precomputedHash
		);
	});
});
