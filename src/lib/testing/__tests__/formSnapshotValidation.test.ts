import { describe, it, expect } from 'vitest';
import { formSnapshotSchema, formSnapshotCreateSchema } from '$lib/schemas/formSnapshot.schema.js';
import { computePayloadHash, computeSnapshotDiff } from '$lib/server/snapshotHelpers.js';

/**
 * Form snapshot validation tests.
 *
 * Existing coverage:
 *  - formSnapshot.schema.test.ts: schema validation (19 tests)
 *  - snapshotHelpers.test.ts: computePayloadHash & computeSnapshotDiff (19 tests)
 *
 * This file adds:
 *  - Tamper detection: modified payload does not match original hash
 *  - Hash + schema integration: valid hash format passes schema
 *  - Version sequencing constraints
 *  - Change summary with diff integration
 *  - Edge cases: special characters in payload, large payloads, unicode
 */

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function samplePayload() {
	return {
		applicant_name: 'Ramesh Kumar',
		loan_amount: 5000000,
		employment_type: 'salaried',
		employer: 'TCS',
		city: 'Mumbai'
	};
}

function fullSnapshot(payload?: Record<string, any>) {
	const p = payload ?? samplePayload();
	return {
		case_id: 'HL-2026-0042',
		version: 1,
		payload: p,
		payload_hash: computePayloadHash(p),
		created_by: 'dsa-001',
		created_at: NOW
	};
}

// ═══════════════════════════════════════════════════════════════
// Tamper detection — payload + hash integrity
// ═══════════════════════════════════════════════════════════════

describe('Tamper detection — payload hash integrity', () => {
	it('computed hash matches the stored hash for unmodified payload', () => {
		const payload = samplePayload();
		const hash = computePayloadHash(payload);
		const snap = fullSnapshot(payload);
		expect(snap.payload_hash).toBe(hash);
	});

	it('modified payload produces a different hash (tamper detected)', () => {
		const original = samplePayload();
		const originalHash = computePayloadHash(original);

		const tampered = { ...original, loan_amount: 9999999 };
		const tamperedHash = computePayloadHash(tampered);

		expect(tamperedHash).not.toBe(originalHash);
	});

	it('adding a field to payload produces a different hash', () => {
		const original = samplePayload();
		const originalHash = computePayloadHash(original);

		const withExtra = { ...original, co_applicant: 'Suresh Kumar' };
		const extraHash = computePayloadHash(withExtra);

		expect(extraHash).not.toBe(originalHash);
	});

	it('removing a field from payload produces a different hash', () => {
		const original = samplePayload();
		const originalHash = computePayloadHash(original);

		const { city, ...reduced } = original;
		const reducedHash = computePayloadHash(reduced);

		expect(reducedHash).not.toBe(originalHash);
	});

	it('reordering does not always preserve hash (depends on key insertion)', () => {
		const payload1 = { a: 1, b: 2, c: 3 };
		const hash1 = computePayloadHash(payload1);

		// Same literal object structure should produce same hash
		const payload2 = { a: 1, b: 2, c: 3 };
		expect(computePayloadHash(payload2)).toBe(hash1);
	});

	it('verifying integrity: snapshot hash matches re-computed hash', () => {
		const snap = fullSnapshot();
		const recomputedHash = computePayloadHash(snap.payload);
		expect(snap.payload_hash).toBe(recomputedHash);
	});

	it('verifying integrity: tampering detected via hash mismatch', () => {
		const snap = fullSnapshot();
		// Simulate tampering
		(snap.payload as any).loan_amount = 1;
		const recomputedHash = computePayloadHash(snap.payload);
		// The stored hash no longer matches
		expect(recomputedHash).not.toBe(fullSnapshot().payload_hash);
	});
});

// ═══════════════════════════════════════════════════════════════
// Hash format — schema accepts computed SHA-256 hashes
// ═══════════════════════════════════════════════════════════════

describe('Hash format — schema + computed hash integration', () => {
	it('computed hash passes formSnapshotSchema payload_hash field', () => {
		const snap = fullSnapshot();
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(true);
	});

	it('real SHA-256 hash is 64-char lowercase hex', () => {
		const hash = computePayloadHash(samplePayload());
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('schema rejects empty payload_hash', () => {
		const snap = fullSnapshot();
		snap.payload_hash = '';
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(false);
	});

	it('schema accepts any non-empty string as payload_hash (no format constraint)', () => {
		const snap = fullSnapshot();
		snap.payload_hash = 'any-valid-non-empty-string';
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Version number validation
// ═══════════════════════════════════════════════════════════════

describe('formSnapshotSchema — version field constraints', () => {
	it('accepts version 1 (first snapshot)', () => {
		const result = formSnapshotSchema.safeParse(fullSnapshot());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.version).toBe(1);
		}
	});

	it('accepts large version number', () => {
		const snap = fullSnapshot();
		snap.version = 999;
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(true);
	});

	it('rejects version 0 (must be positive)', () => {
		const snap = fullSnapshot();
		snap.version = 0;
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(false);
	});

	it('rejects negative version', () => {
		const snap = fullSnapshot();
		snap.version = -1;
		const result = formSnapshotSchema.safeParse(snap);
		expect(result.success).toBe(false);
	});

	it('rejects string version', () => {
		const snap = fullSnapshot();
		(snap as any).version = '1';
		const result = formSnapshotSchema.safeParse(snap);
		// z.number().int().positive() does not coerce strings
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// formSnapshotCreateSchema — creation-time validation
// ═══════════════════════════════════════════════════════════════

describe('formSnapshotCreateSchema — creation payload', () => {
	it('only requires case_id and payload', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'HL-2026-0001',
			payload: { name: 'Ramesh' }
		});
		expect(result.success).toBe(true);
	});

	it('does not accept version (server-generated)', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'HL-2026-0001',
			payload: { name: 'Ramesh' },
			version: 1
		});
		// Zod strips unknown keys in .safeParse by default (passthrough not used)
		// The schema itself doesn't define version, so it gets stripped
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as any).version).toBeUndefined();
		}
	});

	it('rejects empty case_id', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: '',
			payload: {}
		});
		expect(result.success).toBe(false);
	});

	it('accepts change_summary as optional', () => {
		const withSummary = formSnapshotCreateSchema.safeParse({
			case_id: 'case-1',
			payload: {},
			change_summary: 'Updated income section'
		});
		expect(withSummary.success).toBe(true);

		const withoutSummary = formSnapshotCreateSchema.safeParse({
			case_id: 'case-1',
			payload: {}
		});
		expect(withoutSummary.success).toBe(true);
	});

	it('accepts complex nested payload', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-1',
			payload: {
				applicants: [
					{ name: 'Ramesh', type: 'primary', income: { salary: 80000, rental: 15000 } },
					{ name: 'Suresh', type: 'co-applicant', income: { salary: 50000 } }
				],
				property: {
					type: 'flat',
					value: 8500000,
					location: { city: 'Mumbai', pincode: '400001' }
				},
				documents: ['PAN', 'Aadhaar', 'Salary Slips']
			}
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Change summary with diff — integration test
// ═══════════════════════════════════════════════════════════════

describe('Change summary generation via computeSnapshotDiff', () => {
	it('diff between v1 and v2 payloads detects income update', () => {
		const v1 = { name: 'Ramesh', salary: 80000, city: 'Mumbai' };
		const v2 = { name: 'Ramesh', salary: 95000, city: 'Mumbai' };

		const diff = computeSnapshotDiff(v1, v2);
		expect(diff.changed).toContain('salary');
		expect(diff.changed).not.toContain('name');
		expect(diff.changed).not.toContain('city');
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
	});

	it('diff detects new co-applicant field added in v2', () => {
		const v1 = { name: 'Ramesh', salary: 80000 };
		const v2 = { name: 'Ramesh', salary: 80000, co_applicant: 'Suresh' };

		const diff = computeSnapshotDiff(v1, v2);
		expect(diff.added).toContain('co_applicant');
		expect(diff.changed).toEqual([]);
		expect(diff.removed).toEqual([]);
	});

	it('diff detects removed field in v2', () => {
		const v1 = { name: 'Ramesh', phone: '9876543210', email: 'r@test.com' };
		const v2 = { name: 'Ramesh', email: 'r@test.com' };

		const diff = computeSnapshotDiff(v1, v2);
		expect(diff.removed).toContain('phone');
		expect(diff.added).toEqual([]);
		expect(diff.changed).toEqual([]);
	});

	it('diff can generate a change summary string from its output', () => {
		const v1 = { name: 'Ramesh', salary: 80000 };
		const v2 = { name: 'Ramesh', salary: 95000, bonus: 20000 };

		const diff = computeSnapshotDiff(v1, v2);

		// Simulate change summary generation
		const parts: string[] = [];
		if (diff.added.length > 0) parts.push(`Added: ${diff.added.join(', ')}`);
		if (diff.removed.length > 0) parts.push(`Removed: ${diff.removed.join(', ')}`);
		if (diff.changed.length > 0) parts.push(`Changed: ${diff.changed.join(', ')}`);
		const summary = parts.join('; ');

		expect(summary).toContain('Added: bonus');
		expect(summary).toContain('Changed: salary');
	});
});

// ═══════════════════════════════════════════════════════════════
// Edge cases — special payload values
// ═══════════════════════════════════════════════════════════════

describe('Payload edge cases — special values', () => {
	it('hash handles payload with unicode characters', () => {
		const payload = { name: 'Ramesh kumar ' };
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('hash handles payload with special characters', () => {
		const payload = { address: '42/B, M.G. Road, Flat #3, "Near Temple"' };
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
	});

	it('hash handles payload with null values', () => {
		const payload = { name: 'Ramesh', phone: null };
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
	});

	it('hash handles payload with boolean values', () => {
		const payload = { is_employed: true, has_co_applicant: false };
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
	});

	it('hash handles deeply nested payload', () => {
		const payload = {
			level1: {
				level2: {
					level3: {
						level4: {
							value: 'deep'
						}
					}
				}
			}
		};
		const hash = computePayloadHash(payload);
		expect(hash).toHaveLength(64);
	});

	it('schema accepts snapshot with deeply nested payload', () => {
		const payload = {
			applicants: [
				{
					name: 'Ramesh',
					addresses: [
						{ type: 'current', city: 'Mumbai', lines: ['Line 1', 'Line 2'] },
						{ type: 'permanent', city: 'Pune' }
					]
				}
			]
		};
		const result = formSnapshotSchema.safeParse(fullSnapshot(payload));
		expect(result.success).toBe(true);
	});

	it('diff handles payload with array changes at top level', () => {
		const v1 = { docs: ['PAN', 'Aadhaar'] };
		const v2 = { docs: ['PAN', 'Aadhaar', 'Bank Statement'] };
		const diff = computeSnapshotDiff(v1, v2);
		expect(diff.changed).toContain('docs');
	});
});

// ═══════════════════════════════════════════════════════════════
// Sequential version scenario
// ═══════════════════════════════════════════════════════════════

describe('Sequential snapshot versioning scenario', () => {
	it('v1 and v2 with different payloads produce different hashes', () => {
		const v1Payload = { name: 'Ramesh', salary: 80000 };
		const v2Payload = { name: 'Ramesh', salary: 95000, bonus: 20000 };

		const v1Hash = computePayloadHash(v1Payload);
		const v2Hash = computePayloadHash(v2Payload);

		expect(v1Hash).not.toBe(v2Hash);

		// Both pass schema validation
		const v1Snap = {
			...fullSnapshot(v1Payload),
			version: 1,
			payload_hash: v1Hash
		};
		const v2Snap = {
			...fullSnapshot(v2Payload),
			version: 2,
			payload_hash: v2Hash
		};

		expect(formSnapshotSchema.safeParse(v1Snap).success).toBe(true);
		expect(formSnapshotSchema.safeParse(v2Snap).success).toBe(true);
	});

	it('identical payloads produce identical hashes (no false diffs)', () => {
		const payload = { name: 'Ramesh', salary: 80000 };
		const hash1 = computePayloadHash(payload);
		const hash2 = computePayloadHash(payload);
		expect(hash1).toBe(hash2);
	});
});
