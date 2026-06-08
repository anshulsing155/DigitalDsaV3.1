/**
 * ShowWhen XOR Cipher — Round-Trip Tests
 * ══════════════════════════════════════════════════════════════════
 * Verifies that XOR encode (server) → decode (client) produces
 * identical showWhen conditions for all operator types.
 *
 * Also tests:
 * - Session-specific encoding (same condition + different sessions = different output)
 * - Dev mode passthrough (object input → object output, no decoding)
 * - Malformed input handling (graceful fallback)
 * - shortHash determinism and collision resistance
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { decodeShowWhen } from '$lib/config/showWhenDecoder';

// ────────────────────────────────────────────────────────────────
// Mirror the server-side encodeShowWhen for round-trip testing
// (extracted from engine.ts — kept in sync manually)
// ────────────────────────────────────────────────────────────────
function encodeShowWhen(condition: unknown, sessionId: string): string {
	const json = JSON.stringify(condition);
	const keyBytes = new TextEncoder().encode(sessionId);
	const dataBytes = new TextEncoder().encode(json);
	const result = new Uint8Array(dataBytes.length);
	for (let i = 0; i < dataBytes.length; i++) {
		result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
	}
	return btoa(String.fromCharCode(...result));
}

function shortHash(id: string, seed: string): string {
	let h = 0;
	const combined = seed + id;
	for (let i = 0; i < combined.length; i++) {
		h = ((h << 5) - h + combined.charCodeAt(i)) | 0;
	}
	return 'f' + Math.abs(h).toString(36).slice(0, 8);
}

// ════════════════════════════════════════════════════════════════
// 1. XOR Cipher Round-Trip
// ════════════════════════════════════════════════════════════════

describe('XOR cipher round-trip', () => {
	const sessionId = 'abc12345-def6-7890-abcd-ef1234567890';

	const testCases: [string, unknown][] = [
		['== operator (scalar)', { '==': ['loanType', 'Home Loan'] }],
		['!= operator', { '!=': ['creditHistoryStatus', 'clean'] }],
		['in operator (array)', { in: ['propertyType', ['Freehold', 'Lease Hold']] }],
		['and operator (compound)', { and: [{ '==': ['a', 1] }, { '!=': ['b', 2] }] }],
		['or operator', { or: [{ '==': ['x', 'yes'] }, { '==': ['y', 'no'] }] }],
		[
			'nested and/or',
			{ and: [{ or: [{ '==': ['a', 1] }, { '==': ['b', 2] }] }, { '!=': ['c', 3] }] }
		],
		['numeric comparison', { '>=': ['income', 500000] }],
		['empty string value', { '==': ['field', ''] }],
		['boolean value', { '==': ['flag', true] }],
		['null value', { '==': ['field', null] }],
		[
			'deeply nested',
			{
				and: [
					{ or: [{ '==': ['a', 1] }, { and: [{ '!=': ['b', 2] }, { in: ['c', [3, 4, 5]] }] }] },
					{ '>=': ['d', 100] }
				]
			}
		]
	];

	for (const [label, condition] of testCases) {
		it(`round-trips ${label}`, () => {
			const encoded = encodeShowWhen(condition, sessionId);
			expect(typeof encoded).toBe('string');
			// Encoded should not contain the original field names
			if (typeof condition === 'object' && condition !== null) {
				const json = JSON.stringify(condition);
				expect(encoded).not.toBe(json);
			}
			const decoded = decodeShowWhen(encoded, sessionId);
			expect(decoded).toEqual(condition);
		});
	}
});

// ════════════════════════════════════════════════════════════════
// 2. Session-Specific Encoding
// ════════════════════════════════════════════════════════════════

describe('Session-specific encoding', () => {
	const condition = { '==': ['loanType', 'Home Loan'] };

	it('same condition + different sessionIds = different encoded strings', () => {
		const session1 = 'session-aaa-111';
		const session2 = 'session-bbb-222';
		const session3 = 'session-ccc-333';

		const encoded1 = encodeShowWhen(condition, session1);
		const encoded2 = encodeShowWhen(condition, session2);
		const encoded3 = encodeShowWhen(condition, session3);

		expect(encoded1).not.toBe(encoded2);
		expect(encoded2).not.toBe(encoded3);
		expect(encoded1).not.toBe(encoded3);
	});

	it('same condition + same sessionId = identical encoded string (deterministic)', () => {
		const sessionId = 'fixed-session-id';
		const e1 = encodeShowWhen(condition, sessionId);
		const e2 = encodeShowWhen(condition, sessionId);
		expect(e1).toBe(e2);
	});

	it('each session can decode its own encoding', () => {
		const sessions = ['sess-1', 'sess-2', 'sess-3'];
		for (const sid of sessions) {
			const encoded = encodeShowWhen(condition, sid);
			const decoded = decodeShowWhen(encoded, sid);
			expect(decoded).toEqual(condition);
		}
	});

	it('decoding with wrong sessionId produces garbage (not the original)', () => {
		const encoded = encodeShowWhen(condition, 'correct-session');
		const decoded = decodeShowWhen(encoded, 'wrong-session');
		// Should either fail to parse (return null) or produce a different object
		expect(decoded).not.toEqual(condition);
	});
});

// ════════════════════════════════════════════════════════════════
// 3. Dev Mode Passthrough
// ════════════════════════════════════════════════════════════════

describe('Dev mode passthrough', () => {
	it('returns object inputs unchanged (no decoding needed)', () => {
		const condition = { '==': ['loanType', 'Home Loan'] };
		const result = decodeShowWhen(condition, 'any-session');
		expect(result).toBe(condition); // Same reference
	});

	it('returns null input as-is', () => {
		expect(decodeShowWhen(null, 'session')).toBeNull();
	});

	it('returns undefined input as-is', () => {
		expect(decodeShowWhen(undefined, 'session')).toBeUndefined();
	});

	it('returns number input as-is', () => {
		expect(decodeShowWhen(42, 'session')).toBe(42);
	});

	it('returns array input as-is', () => {
		const arr = [1, 2, 3];
		expect(decodeShowWhen(arr, 'session')).toBe(arr);
	});

	it('returns string input unchanged when no sessionId', () => {
		const encoded = encodeShowWhen({ x: 1 }, 'test');
		expect(decodeShowWhen(encoded, undefined)).toBe(encoded);
	});
});

// ════════════════════════════════════════════════════════════════
// 4. Malformed Input Handling
// ════════════════════════════════════════════════════════════════

describe('Malformed input handling', () => {
	it('returns null for invalid base64', () => {
		const result = decodeShowWhen('not-valid-base64!!!', 'session');
		expect(result).toBeNull();
	});

	it('returns null for valid base64 that decodes to non-JSON', () => {
		// Encode some random bytes that won't be valid JSON after XOR
		const result = decodeShowWhen(btoa('random garbage'), 'session');
		expect(result).toBeNull();
	});
});

// ════════════════════════════════════════════════════════════════
// 5. shortHash — Determinism & Collision Resistance
// ════════════════════════════════════════════════════════════════

describe('shortHash', () => {
	it('starts with "f" prefix', () => {
		expect(shortHash('q1_test', 'seed')).toMatch(/^f/);
	});

	it('different seeds produce different hashes for same ID', () => {
		const h1 = shortHash('q4_propertyStateName', 'session-aaa');
		const h2 = shortHash('q4_propertyStateName', 'session-bbb');
		expect(h1).not.toBe(h2);
	});

	it('different IDs produce different hashes for same seed', () => {
		const seed = 'fixed-seed';
		const ids = [
			'q1_loanName',
			'q2_propertyStateName',
			'q3_propertyCityName',
			'q4_propertyType',
			'q5_residenceStateName',
			'q6_residenceCityName',
			'q7_creditHistoryStatus',
			'q8_employmentType',
			'q9_businessEntityType',
			'q10_loanAmount'
		];
		const hashes = ids.map((id) => shortHash(id, seed));
		const uniqueHashes = new Set(hashes);
		expect(uniqueHashes.size).toBe(ids.length); // No collisions
	});

	it('has reasonable length (not too short, not too long)', () => {
		const h = shortHash('q4_propertyStateName', 'session-xyz');
		// 'f' + up to 8 chars of base36
		expect(h.length).toBeGreaterThanOrEqual(2);
		expect(h.length).toBeLessThanOrEqual(9);
	});
});
