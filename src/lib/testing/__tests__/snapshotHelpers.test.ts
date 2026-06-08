import { describe, it, expect } from 'vitest';
import { computePayloadHash, computeSnapshotDiff } from '$lib/server/snapshotHelpers';

// ═══════════════════════════════════════════════════════════════
// computePayloadHash
// ═══════════════════════════════════════════════════════════════

describe('computePayloadHash', () => {
	it('returns consistent hash for same payload', () => {
		const payload = { name: 'Ramesh', loan_amount: 5000000 };
		const hash1 = computePayloadHash(payload);
		const hash2 = computePayloadHash(payload);
		expect(hash1).toBe(hash2);
	});

	it('returns different hash for different payloads', () => {
		const payload1 = { name: 'Ramesh', loan_amount: 5000000 };
		const payload2 = { name: 'Suresh', loan_amount: 3000000 };
		expect(computePayloadHash(payload1)).not.toBe(computePayloadHash(payload2));
	});

	it('hash is a valid 64-char hex string (SHA-256)', () => {
		const payload = { key: 'value' };
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('handles empty object', () => {
		const hash = computePayloadHash({});
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('handles nested objects', () => {
		const payload = {
			applicant: {
				name: 'Ramesh',
				address: {
					city: 'Mumbai',
					pincode: '400001'
				}
			}
		};
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('handles arrays in payload', () => {
		const payload = {
			applicants: ['Ramesh', 'Suresh'],
			amounts: [5000000, 3000000]
		};
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('deterministic: different key insertion order produces SAME hash', () => {
		// Keys are sorted recursively before hashing, so insertion order doesn't matter
		const payload1: Record<string, any> = {};
		payload1['a'] = 1;
		payload1['b'] = 2;

		const payload2: Record<string, any> = {};
		payload2['b'] = 2;
		payload2['a'] = 1;

		// Both should produce identical hashes despite different insertion order
		expect(computePayloadHash(payload1)).toBe(computePayloadHash(payload2));
	});

	it('deterministic: nested objects with different key order produce SAME hash', () => {
		const payload1 = { z: 1, a: { y: 2, b: 3 } };
		const payload2 = { a: { b: 3, y: 2 }, z: 1 };
		expect(computePayloadHash(payload1)).toBe(computePayloadHash(payload2));
	});

	it('deterministic: arrays preserve order (different array order = different hash)', () => {
		const payload1 = { items: ['a', 'b', 'c'] };
		const payload2 = { items: ['c', 'b', 'a'] };
		expect(computePayloadHash(payload1)).not.toBe(computePayloadHash(payload2));
	});

	it('single-character change in value produces different hash', () => {
		const payload1 = { name: 'Ramesh' };
		const payload2 = { name: 'Ramesa' };
		expect(computePayloadHash(payload1)).not.toBe(computePayloadHash(payload2));
	});

	it('empty string value vs missing key produce different hashes', () => {
		const payload1 = { name: '' };
		const payload2 = {};
		expect(computePayloadHash(payload1)).not.toBe(computePayloadHash(payload2));
	});
});

// ═══════════════════════════════════════════════════════════════
// computeSnapshotDiff
// ═══════════════════════════════════════════════════════════════

describe('computeSnapshotDiff', () => {
	it('detects added keys', () => {
		const payload1 = { name: 'Ramesh' };
		const payload2 = { name: 'Ramesh', email: 'ramesh@example.com' };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.added).toContain('email');
		expect(diff.removed).toEqual([]);
		expect(diff.changed).toEqual([]);
	});

	it('detects removed keys', () => {
		const payload1 = { name: 'Ramesh', email: 'ramesh@example.com' };
		const payload2 = { name: 'Ramesh' };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.removed).toContain('email');
		expect(diff.added).toEqual([]);
		expect(diff.changed).toEqual([]);
	});

	it('detects changed values', () => {
		const payload1 = { name: 'Ramesh', loan_amount: 5000000 };
		const payload2 = { name: 'Ramesh', loan_amount: 7000000 };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.changed).toContain('loan_amount');
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
	});

	it('handles no changes (empty diff)', () => {
		const payload = { name: 'Ramesh', loan_amount: 5000000 };
		const diff = computeSnapshotDiff(payload, payload);
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
		expect(diff.changed).toEqual([]);
	});

	it('handles completely different payloads', () => {
		const payload1 = { name: 'Ramesh', city: 'Mumbai' };
		const payload2 = { loan_type: 'Home Loan', amount: 5000000 };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.removed).toContain('name');
		expect(diff.removed).toContain('city');
		expect(diff.added).toContain('loan_type');
		expect(diff.added).toContain('amount');
		expect(diff.changed).toEqual([]);
	});

	it('handles nested object changes (detected as "changed" at top level)', () => {
		const payload1 = { applicant: { name: 'Ramesh', age: 35 } };
		const payload2 = { applicant: { name: 'Ramesh', age: 36 } };
		const diff = computeSnapshotDiff(payload1, payload2);
		// The diff is at top-level keys only, so nested changes are detected as "changed"
		expect(diff.changed).toContain('applicant');
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
	});

	it('handles array value changes', () => {
		const payload1 = { documents: ['PAN', 'Aadhaar'] };
		const payload2 = { documents: ['PAN', 'Aadhaar', 'Bank Statement'] };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.changed).toContain('documents');
	});

	it('empty payloads comparison', () => {
		const diff = computeSnapshotDiff({}, {});
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
		expect(diff.changed).toEqual([]);
	});

	it('detects all three categories simultaneously', () => {
		const payload1 = { a: 1, b: 2, c: 3 };
		const payload2 = { a: 1, b: 99, d: 4 };
		const diff = computeSnapshotDiff(payload1, payload2);
		expect(diff.changed).toContain('b');
		expect(diff.removed).toContain('c');
		expect(diff.added).toContain('d');
		// 'a' is unchanged, so it should not appear anywhere
		expect(diff.changed).not.toContain('a');
		expect(diff.removed).not.toContain('a');
		expect(diff.added).not.toContain('a');
	});

	it('treats null and undefined differently from missing keys', () => {
		const payload1 = { a: null };
		const payload2 = { a: undefined };
		const diff = computeSnapshotDiff(payload1, payload2);
		// JSON.stringify(null) !== JSON.stringify(undefined), so "a" is changed
		expect(diff.changed).toContain('a');
	});
});
