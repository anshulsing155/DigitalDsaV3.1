/**
 * DATA-2 — buildVaultEntry orchestrator unit tests.
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §6 + §12.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectId } from 'mongodb';
import { buildVaultEntry } from '$lib/server/data2/buildVaultEntry';
import { verifyRevocationToken } from '$lib/server/data2/revocationToken';
import { mobileHashForToken } from '$lib/server/data2/mobileHash';

const TEST_PEPPER = 'b'.repeat(64);
const NOW_MS = new Date('2026-05-19T12:00:00Z').getTime();
const DSA_ID = new ObjectId();

beforeAll(() => {
	process.env.DATA2_TOKEN_PEPPER = TEST_PEPPER;
});
afterAll(() => {
	delete process.env.DATA2_TOKEN_PEPPER;
});

function happyInput() {
	return {
		case_id: 'HL-2026-0042',
		mobile: '9876543210',
		loan_profile: {
			loan_type: 'Home Loan' as const,
			lender_id: 'hdfc-bank',
			lender_name: 'HDFC Bank',
			sanctioned_amount: 5_000_000,
			sanctioned_roi: 9.25,
			tenure_months: 240,
			disbursement_date: new Date('2026-04-01T00:00:00Z')
		},
		consent_doc_ref: {
			imagekit_file_id: 'imagekit-xyz-789',
			imagekit_url: 'https://imagekit.io/xyz-789.pdf',
			template_version: 'v1',
			uploaded_at: new Date('2026-05-18T00:00:00Z')
		},
		consent_signed_at: new Date('2026-05-18T00:00:00Z')
	};
}

describe('buildVaultEntry — happy path', () => {
	it('produces a complete OutreachVaultEntry', () => {
		const result = buildVaultEntry(happyInput(), DSA_ID, NOW_MS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const e = result.entry;
		expect(e._id).toBeInstanceOf(ObjectId);
		expect(e.dsa_id).toBe(DSA_ID);
		expect(e.case_id).toBe('HL-2026-0042');
		expect(e.mobile).toBe('9876543210'); // plaintext at this stage; caller encrypts
		expect(e.consent_status).toBe('active');
		expect(e.revocation_token).toMatch(/^[0-9a-f]{32}$/);
		expect(e.loan_profile.sanctioned_roi).toBe(9.25);
	});

	it('produces a revocation token that round-trips', () => {
		const result = buildVaultEntry(happyInput(), DSA_ID, NOW_MS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const valid = verifyRevocationToken(result.entry.revocation_token, {
			vault_entry_id: result.entry._id!.toString(),
			dsa_id: DSA_ID.toString(),
			mobile_hash: mobileHashForToken(result.entry.mobile)
		});
		expect(valid).toBe(true);
	});

	it('normalizes the mobile (strips country code + leading zero)', () => {
		const input = happyInput();
		input.mobile = '+91 9876543210';
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.entry.mobile).toBe('9876543210');

		const input2 = happyInput();
		input2.mobile = '09876543210';
		const result2 = buildVaultEntry(input2, DSA_ID, NOW_MS);
		expect(result2.ok).toBe(true);
		if (result2.ok) expect(result2.entry.mobile).toBe('9876543210');
	});

	it('two entries for the same DSA + mobile get DIFFERENT _id and revocation_token', () => {
		// Sanity: nothing in this builder is statefully sticky; each call
		// generates a fresh _id and therefore a fresh token.
		const r1 = buildVaultEntry(happyInput(), DSA_ID, NOW_MS);
		const r2 = buildVaultEntry(happyInput(), DSA_ID, NOW_MS);
		expect(r1.ok && r2.ok).toBe(true);
		if (!r1.ok || !r2.ok) return;
		expect(r1.entry._id!.toString()).not.toBe(r2.entry._id!.toString());
		expect(r1.entry.revocation_token).not.toBe(r2.entry.revocation_token);
	});
});

describe('buildVaultEntry — refusal gates', () => {
	it('refuses on consent gate failure (e.g. unknown template version)', () => {
		const input = happyInput();
		input.consent_doc_ref.template_version = 'v999';
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('consent_gates_failed');
		expect(result.gate_result?.failed_gates).toContain('C2');
	});

	it('refuses when mobile is malformed', () => {
		const input = happyInput();
		input.mobile = '1234567890'; // doesn't start 6-9
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('invalid_mobile');
	});

	it('refuses when mobile is empty', () => {
		const input = happyInput();
		input.mobile = '';
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('invalid_mobile');
	});

	it('refuses when sanctioned_amount is zero or negative', () => {
		const input = happyInput();
		input.loan_profile.sanctioned_amount = 0;
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('invalid_loan_profile');
	});

	it('refuses when sanctioned_roi is out of sensible range', () => {
		const input = happyInput();
		input.loan_profile.sanctioned_roi = 60; // 60% — wildly out of policy
		const result = buildVaultEntry(input, DSA_ID, NOW_MS);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('invalid_loan_profile');
	});

	it('refuses when tenure_months is zero or > 600', () => {
		const input1 = happyInput();
		input1.loan_profile.tenure_months = 0;
		expect(buildVaultEntry(input1, DSA_ID, NOW_MS).ok).toBe(false);
		const input2 = happyInput();
		input2.loan_profile.tenure_months = 700;
		expect(buildVaultEntry(input2, DSA_ID, NOW_MS).ok).toBe(false);
	});
});

describe('buildVaultEntry — privacy contract', () => {
	it('does not include any extra fields beyond the schema', () => {
		const result = buildVaultEntry(happyInput(), DSA_ID, NOW_MS);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const allowed = new Set([
			'_id',
			'dsa_id',
			'case_id',
			'mobile',
			'loan_profile',
			'consent_doc_ref',
			'consent_signed_at',
			'consent_expiry',
			'revocation_token',
			'consent_status',
			'revoked_at',
			'revoked_by',
			'revocation_notes',
			'grace_period_ends_at',
			'created_at',
			'updated_at'
		]);
		for (const key of Object.keys(result.entry)) {
			expect(allowed.has(key), `unexpected field "${key}" in vault entry`).toBe(true);
		}
	});
});
