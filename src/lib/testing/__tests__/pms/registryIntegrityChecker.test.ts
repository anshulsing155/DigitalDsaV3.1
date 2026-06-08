/**
 * Unit tests — Registry Integrity Checker
 * ══════════════════════════════════════════════════════════════════
 * Tests cover:
 *   1. extractVarPaths() — pure JSON-Logic var extractor
 *        - flat single var
 *        - nested operators (and/or/>/< etc.)
 *        - arrays of conditions
 *        - deeply nested structures
 *        - deduplication of repeated paths
 *        - non-var objects (no false positives)
 *        - primitive inputs (null / string / number)
 *
 *   2. checkKeyPathStatus() — active / deprecated / unknown classification
 *        - known active registry key → 'active' + entry returned
 *        - completely unknown path → 'unknown' + null entry
 *        - deprecated key (mocked) → 'deprecated' + entry returned
 *
 * Note: runRegistryHealthCheck() is NOT tested here because it requires
 * live MongoDB. Those tests belong in an integration test suite.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted() runs BEFORE vi.mock factories are executed ──────────────────
// This makes mockGetKeyEntry available inside the vi.mock factory below,
// which is hoisted to the top of the file by Vitest's transformer.
const mockGetKeyEntry = vi.hoisted(() => vi.fn());

// ── Mock MongoDB so the module-level import in registryIntegrityChecker.ts
//    does not attempt a real Atlas connection during unit tests.
vi.mock('$lib/database/mongo.js', () => ({
	PmsLenderPolicies: { find: vi.fn() },
	PolicyFutureQueue: { find: vi.fn() }
}));

// ── Mock keyRegistry so we can control deprecated-key behaviour ───────────────
// We spread the real module so KEY_REGISTRY, getActiveKeys, etc. are all real,
// but replace getKeyEntry with our hoisted mock so each test can control it.
vi.mock('$lib/config/pms/keyRegistry.js', async (importOriginal) => {
	const original =
		await importOriginal<typeof import('$lib/config/pms/keyRegistry.js')>();

	return {
		...original,
		getKeyEntry: mockGetKeyEntry
	};
});

// Import AFTER the vi.mock declaration so the mock is in place.
import { extractVarPaths, checkKeyPathStatus } from '$lib/server/pms/registryIntegrityChecker.js';
import type { KeyRegistryEntry } from '$lib/config/pms/keyRegistry.js';

// ── Reset mock to the REAL implementation before each test ────────────────────
// We use vi.importActual so we get the genuine getKeyEntry, not the mock itself
// (importing directly from '$lib/config/pms/keyRegistry.js' would return the mock).
beforeEach(async () => {
	const actual = await vi.importActual<typeof import('$lib/config/pms/keyRegistry.js')>(
		'$lib/config/pms/keyRegistry.js'
	);
	mockGetKeyEntry.mockImplementation((path: string) => actual.getKeyEntry(path));
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. extractVarPaths
// ═════════════════════════════════════════════════════════════════════════════

describe('extractVarPaths()', () => {

	// ── Happy paths ────────────────────────────────────────────────────────────

	it('extracts a single top-level var', () => {
		const rule = { var: 'creditScore' };
		const result = extractVarPaths(rule);
		expect([...result]).toEqual(['creditScore']);
	});

	it('extracts var inside a comparison operator', () => {
		// Typical JSON-Logic: { ">=": [{ "var": "creditScore" }, 700] }
		const rule = { '>=': [{ var: 'creditScore' }, 700] };
		const result = extractVarPaths(rule);
		expect([...result]).toEqual(['creditScore']);
	});

	it('extracts multiple vars from an "and" condition', () => {
		const rule = {
			and: [
				{ '>=': [{ var: 'creditScore' }, 700] },
				{ '==': [{ var: 'EmploymentType' }, 'Salaried'] }
			]
		};
		const result = extractVarPaths(rule);
		expect(result).toContain('creditScore');
		expect(result).toContain('EmploymentType');
		expect(result.size).toBe(2);
	});

	it('extracts vars from an "or" with nested "and"', () => {
		const rule = {
			or: [
				{ and: [{ var: 'creditScore' }, { var: 'loanAmount' }] },
				{ var: 'EmploymentType' }
			]
		};
		const result = extractVarPaths(rule);
		expect(result.size).toBe(3);
		expect(result).toContain('creditScore');
		expect(result).toContain('loanAmount');
		expect(result).toContain('EmploymentType');
	});

	it('deduplicates repeated var paths', () => {
		// Same key used twice in different branches — should appear once in result
		const rule = {
			and: [
				{ '>': [{ var: 'loanAmount' }, 5000000] },
				{ '<': [{ var: 'loanAmount' }, 20000000] }
			]
		};
		const result = extractVarPaths(rule);
		expect(result.size).toBe(1);
		expect(result).toContain('loanAmount');
	});

	it('extracts from a deeply nested condition (4 levels)', () => {
		const rule = {
			and: [
				{
					or: [
						{ '==': [{ var: 'creditScore' }, 750] },
						{ and: [{ var: 'loanTenure' }, { var: 'loanAmount' }] }
					]
				}
			]
		};
		const result = extractVarPaths(rule);
		expect(result.size).toBe(3);
	});

	it('handles an array of condition objects at the top level', () => {
		// Some ConditionalOverride conditions may be stored as an array
		const rule = [
			{ var: 'creditScore' },
			{ var: 'EmploymentType' }
		];
		const result = extractVarPaths(rule);
		expect(result.size).toBe(2);
	});

	it('handles the "in" operator with a var and array literal', () => {
		// JSON-Logic: { "in": [{ "var": "EmploymentType" }, ["Salaried", "Self-Employed"]] }
		const rule = { in: [{ var: 'EmploymentType' }, ['Salaried', 'Self-Employed']] };
		const result = extractVarPaths(rule);
		expect([...result]).toEqual(['EmploymentType']);
	});

	// ── No false positives ─────────────────────────────────────────────────────

	it('returns empty set for a plain object with no vars', () => {
		const rule = { some: 'data', other: 42 };
		const result = extractVarPaths(rule);
		expect(result.size).toBe(0);
	});

	it('returns empty set for an empty object', () => {
		expect(extractVarPaths({}).size).toBe(0);
	});

	it('does not pick up numeric var values (only string vars are paths)', () => {
		// JSON-Logic spec: { "var": 0 } accesses array index — we only want strings
		const rule = { var: 0 };
		const result = extractVarPaths(rule);
		// Our implementation checks typeof obj.var === 'string', so this should be skipped
		expect(result.size).toBe(0);
	});

	// ── Primitive / falsy inputs (defensive) ──────────────────────────────────

	it('returns empty set for null input', () => {
		expect(extractVarPaths(null).size).toBe(0);
	});

	it('returns empty set for undefined input', () => {
		expect(extractVarPaths(undefined).size).toBe(0);
	});

	it('returns empty set for a string input', () => {
		expect(extractVarPaths('creditScore').size).toBe(0);
	});

	it('returns empty set for a number input', () => {
		expect(extractVarPaths(700).size).toBe(0);
	});

	it('returns empty set for a boolean input', () => {
		expect(extractVarPaths(true).size).toBe(0);
	});

	// ── Edge cases ─────────────────────────────────────────────────────────────

	it('handles an empty array input', () => {
		expect(extractVarPaths([]).size).toBe(0);
	});

	it('handles an array with mixed primitives and var objects', () => {
		const rule = [null, 42, 'string', { var: 'loanAmount' }, true];
		const result = extractVarPaths(rule);
		expect([...result]).toEqual(['loanAmount']);
	});

	it('does not treat a "var" key with empty string as a path', () => {
		// Empty string var paths are technically valid JSON-Logic (root of data)
		// but should be captured so the checker can flag them
		const rule = { var: '' };
		const result = extractVarPaths(rule);
		// '' is a string, so it IS added — the integrity checker decides whether to flag it
		expect(result).toContain('');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. checkKeyPathStatus()
// ═════════════════════════════════════════════════════════════════════════════

describe('checkKeyPathStatus()', () => {

	// ── Active key (real registry data) ───────────────────────────────────────

	it('returns status "active" for a known registry key', () => {
		// "creditScore" is defined in keyRegistry.ts with deprecatedAt: null
		const result = checkKeyPathStatus('creditScore');
		expect(result.status).toBe('active');
		expect(result.entry).not.toBeNull();
		expect(result.entry?.path).toBe('creditScore');
	});

	it('returns the full entry for an active key', () => {
		const result = checkKeyPathStatus('loanAmount');
		expect(result.status).toBe('active');
		expect(result.entry?.type).toBeDefined();
		expect(result.entry?.deprecatedAt).toBeNull();
	});

	it('returns status "active" for a computed key', () => {
		// "netIncome" is source: 'computed' — should still be active
		const result = checkKeyPathStatus('netIncome');
		expect(result.status).toBe('active');
	});

	// ── Unknown key ───────────────────────────────────────────────────────────

	it('returns status "unknown" for a path not in the registry', () => {
		const result = checkKeyPathStatus('nonExistentKeyPath_xyz');
		expect(result.status).toBe('unknown');
		expect(result.entry).toBeNull();
	});

	it('returns status "unknown" for an empty string path', () => {
		const result = checkKeyPathStatus('');
		expect(result.status).toBe('unknown');
		expect(result.entry).toBeNull();
	});

	it('returns status "unknown" for a path with wrong casing', () => {
		// Registry uses "creditScore" (camelCase) — "creditscore" should not match
		const result = checkKeyPathStatus('creditscore');
		expect(result.status).toBe('unknown');
	});

	// ── Deprecated key (mocked) ───────────────────────────────────────────────

	it('returns status "deprecated" when getKeyEntry returns a deprecated entry', () => {
		// There are currently no deprecated keys in the live registry, so we mock
		// getKeyEntry to simulate what will happen when a key is eventually deprecated.
		const deprecatedEntry: KeyRegistryEntry = {
			path: 'oldCreditScore',
			type: 'number',
			products: 'all',
			source: 'form',
			bindsTo: 'creditScore',
			addedAt: '2026-01-01',
			deprecatedAt: '2026-04-25',
			deprecationReason: 'Renamed to creditScore',
			replacedBy: 'creditScore'
		};
		mockGetKeyEntry.mockReturnValueOnce(deprecatedEntry);

		const result = checkKeyPathStatus('oldCreditScore');

		expect(result.status).toBe('deprecated');
		expect(result.entry).not.toBeNull();
		expect(result.entry?.deprecatedAt).toBe('2026-04-25');
		expect(result.entry?.replacedBy).toBe('creditScore');
	});

	it('includes replacedBy in the returned entry for deprecated keys', () => {
		const deprecatedEntry: KeyRegistryEntry = {
			path: 'propValue',
			type: 'number',
			products: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
			source: 'form',
			bindsTo: 'propCost',
			addedAt: '2026-01-01',
			deprecatedAt: '2026-03-01',
			deprecationReason: 'Renamed to propCost for clarity',
			replacedBy: 'propCost'
		};
		mockGetKeyEntry.mockReturnValueOnce(deprecatedEntry);

		const result = checkKeyPathStatus('propValue');
		expect(result.status).toBe('deprecated');
		expect(result.entry?.replacedBy).toBe('propCost');
	});

	it('returns deprecated even when replacedBy is null (key simply removed)', () => {
		const deprecatedEntry: KeyRegistryEntry = {
			path: 'legacyKey',
			type: 'string',
			products: 'all',
			source: 'computed',
			bindsTo: '',
			addedAt: '2025-06-01',
			deprecatedAt: '2026-02-15',
			deprecationReason: 'No longer used in any policy',
			replacedBy: null
		};
		mockGetKeyEntry.mockReturnValueOnce(deprecatedEntry);

		const result = checkKeyPathStatus('legacyKey');
		expect(result.status).toBe('deprecated');
		expect(result.entry?.replacedBy).toBeNull();
	});
});
