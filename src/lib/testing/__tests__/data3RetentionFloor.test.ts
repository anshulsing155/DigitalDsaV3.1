/**
 * DATA-3 — Retention-floor classification + elapsed-time predicate.
 *
 * Pure helpers — no I/O.
 */

import { describe, it, expect } from 'vitest';
import {
	classifyDocument,
	retentionFloorDays,
	hasRetentionFloorElapsed,
	RETENTION_FLOOR_DAYS
} from '$lib/server/data3/retentionFloor';

describe('classifyDocument', () => {
	it('classifies bank statements as financial', () => {
		expect(classifyDocument('bank_statement_3m')).toBe('financial');
		expect(classifyDocument('bank_statement_6m')).toBe('financial');
		expect(classifyDocument('bank_statement_12m')).toBe('financial');
	});

	it('classifies salary slips and ITRs as financial', () => {
		expect(classifyDocument('salary_slip_3m')).toBe('financial');
		expect(classifyDocument('itr_2y')).toBe('financial');
		expect(classifyDocument('form_16')).toBe('financial');
	});

	it('classifies KYC documents correctly', () => {
		expect(classifyDocument('pan_card')).toBe('kyc');
		expect(classifyDocument('aadhaar_card')).toBe('kyc');
		expect(classifyDocument('passport')).toBe('kyc');
	});

	it('classifies property documents correctly', () => {
		expect(classifyDocument('sale_deed')).toBe('property');
		expect(classifyDocument('allotment_letter')).toBe('property');
		expect(classifyDocument('rera_certificate')).toBe('property');
	});

	it('falls back to high_stakes for unknown doc_id (conservative)', () => {
		expect(classifyDocument('mystery_doc_xyz')).toBe('high_stakes');
		expect(classifyDocument('')).toBe('high_stakes');
	});
});

describe('retentionFloorDays', () => {
	it('financial → 30 days', () => {
		expect(retentionFloorDays('bank_statement_3m')).toBe(30);
	});

	it('kyc → 90 days', () => {
		expect(retentionFloorDays('pan_card')).toBe(90);
	});

	it('property → 180 days', () => {
		expect(retentionFloorDays('sale_deed')).toBe(180);
	});

	it('unknown → 365 days (high_stakes fallback)', () => {
		expect(retentionFloorDays('unknown_doc')).toBe(365);
	});

	it('floor constants match the spec', () => {
		expect(RETENTION_FLOOR_DAYS.financial).toBe(30);
		expect(RETENTION_FLOOR_DAYS.kyc).toBe(90);
		expect(RETENTION_FLOOR_DAYS.property).toBe(180);
		expect(RETENTION_FLOOR_DAYS.high_stakes).toBe(365);
	});
});

describe('hasRetentionFloorElapsed', () => {
	const NOW = new Date('2026-05-16T00:00:00.000Z');

	it('returns false when verifiedAt is null', () => {
		expect(hasRetentionFloorElapsed(null, 'bank_statement_3m', NOW)).toBe(false);
	});

	it('returns false one day before the floor elapses', () => {
		// 29 days ago — 30-day floor not yet elapsed
		const verifiedAt = new Date(NOW.getTime() - 29 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'bank_statement_3m', NOW)).toBe(false);
	});

	it('returns true at exactly the floor', () => {
		// 30 days ago — exactly at the floor
		const verifiedAt = new Date(NOW.getTime() - 30 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'bank_statement_3m', NOW)).toBe(true);
	});

	it('returns true well past the floor', () => {
		const verifiedAt = new Date(NOW.getTime() - 365 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'bank_statement_3m', NOW)).toBe(true);
	});

	it('respects per-tier floors — KYC (90d) still holds at 60 days', () => {
		const verifiedAt = new Date(NOW.getTime() - 60 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'pan_card', NOW)).toBe(false);
	});

	it('respects per-tier floors — KYC (90d) elapses at 90 days', () => {
		const verifiedAt = new Date(NOW.getTime() - 90 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'pan_card', NOW)).toBe(true);
	});

	it('respects per-tier floors — property (180d) holds at 179 days', () => {
		const verifiedAt = new Date(NOW.getTime() - 179 * 86400 * 1000);
		expect(hasRetentionFloorElapsed(verifiedAt, 'sale_deed', NOW)).toBe(false);
	});

	it('unknown doc_id uses high_stakes 365-day floor', () => {
		const verifiedAt = new Date(NOW.getTime() - 200 * 86400 * 1000);
		// 200 days ago for unknown doc — high_stakes floor is 365, so NOT elapsed
		expect(hasRetentionFloorElapsed(verifiedAt, 'unknown_doc', NOW)).toBe(false);
	});
});
