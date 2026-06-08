/**
 * DATA-2 — validateConsentGates unit tests.
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §3 (C1–C4 gates) + §12 test plan.
 *
 * Privacy-load-bearing: a regression that lets an entry pass the gates
 * without a real signed consent doc would create unconsented vault
 * entries → DPDP §6 violation.
 */

import { describe, it, expect } from 'vitest';
import { validateConsentGates } from '$lib/server/data2/consentTemplates';

const NOW_MS = new Date('2026-05-19T12:00:00Z').getTime();

function happyPayload() {
	return {
		consent_doc_ref: {
			imagekit_file_id: 'imagekit-abc-123',
			template_version: 'v1',
			uploaded_at: new Date('2026-05-19T10:00:00Z')
		},
		consent_signed_at: new Date('2026-05-18T00:00:00Z') // 1 day ago — valid
	};
}

describe('validateConsentGates — happy path', () => {
	it('passes when all gates are satisfied', () => {
		const result = validateConsentGates(happyPayload(), NOW_MS);
		expect(result.valid).toBe(true);
		expect(result.failed_gates).toEqual([]);
		expect(result.reasons).toEqual({});
	});
});

describe('validateConsentGates — C1 (document present)', () => {
	it('fails when imagekit_file_id is missing', () => {
		const payload = happyPayload();
		// @ts-expect-error — intentionally simulating the broken case
		delete payload.consent_doc_ref.imagekit_file_id;
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.valid).toBe(false);
		expect(result.failed_gates).toContain('C1');
		expect(result.reasons['C1']).toMatch(/document is missing/i);
	});

	it('fails when imagekit_file_id is empty string', () => {
		const payload = happyPayload();
		payload.consent_doc_ref.imagekit_file_id = '';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C1');
	});

	it('fails when imagekit_file_id is whitespace only', () => {
		const payload = happyPayload();
		payload.consent_doc_ref.imagekit_file_id = '   ';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C1');
	});

	it('fails when consent_doc_ref is entirely missing', () => {
		// Payload type accepts optional fields — no @ts-expect-error needed
		const result = validateConsentGates({ consent_signed_at: new Date() }, NOW_MS);
		expect(result.failed_gates).toContain('C1');
	});
});

describe('validateConsentGates — C2 (template version known)', () => {
	it('fails when template_version is unknown', () => {
		const payload = happyPayload();
		payload.consent_doc_ref.template_version = 'v999';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C2');
		expect(result.reasons['C2']).toMatch(/template version/i);
	});

	it('fails when template_version is missing', () => {
		const payload = happyPayload();
		// @ts-expect-error — simulating broken payload
		delete payload.consent_doc_ref.template_version;
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C2');
	});

	it('accepts v1 (the canonical version)', () => {
		const payload = happyPayload();
		payload.consent_doc_ref.template_version = 'v1';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).not.toContain('C2');
	});
});

describe('validateConsentGates — C3 (signed date)', () => {
	it('fails when consent_signed_at is missing', () => {
		const payload = happyPayload();
		// @ts-expect-error — simulating broken payload
		delete payload.consent_signed_at;
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C3');
	});

	it('fails when consent_signed_at is in the future', () => {
		const payload = happyPayload();
		payload.consent_signed_at = new Date(NOW_MS + 24 * 60 * 60 * 1000);
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C3');
		expect(result.reasons['C3']).toMatch(/future/i);
	});

	it('fails when consent_signed_at is more than 90 days old', () => {
		const payload = happyPayload();
		payload.consent_signed_at = new Date(NOW_MS - 91 * 24 * 60 * 60 * 1000);
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C3');
		expect(result.reasons['C3']).toMatch(/older than/i);
	});

	it('accepts a signed_at exactly at the 90-day boundary (within the window)', () => {
		const payload = happyPayload();
		// 89.5 days old — comfortably within the 90-day cap
		payload.consent_signed_at = new Date(NOW_MS - 89.5 * 24 * 60 * 60 * 1000);
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).not.toContain('C3');
	});

	it('accepts ISO-string input (not just Date objects)', () => {
		const payload = happyPayload();
		// @ts-expect-error — payload type accepts Date but ISO string is a real-world possibility
		payload.consent_signed_at = '2026-05-18T00:00:00Z';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.valid).toBe(true);
	});

	it('fails on malformed date string', () => {
		const payload = happyPayload();
		// @ts-expect-error — simulating malformed input
		payload.consent_signed_at = 'not-a-date';
		const result = validateConsentGates(payload, NOW_MS);
		expect(result.failed_gates).toContain('C3');
	});
});

describe('validateConsentGates — multiple gates failing', () => {
	it('reports all failures together', () => {
		const result = validateConsentGates(
			{
				consent_doc_ref: { template_version: 'v999' }, // C1 (no file_id) + C2 (unknown ver)
				consent_signed_at: new Date(NOW_MS + 10_000) // C3 (future date)
			},
			NOW_MS
		);
		expect(result.valid).toBe(false);
		expect(result.failed_gates).toEqual(expect.arrayContaining(['C1', 'C2', 'C3']));
		expect(Object.keys(result.reasons).sort()).toEqual(['C1', 'C2', 'C3']);
	});
});
