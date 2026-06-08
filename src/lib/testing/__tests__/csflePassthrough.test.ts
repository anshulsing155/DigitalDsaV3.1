/**
 * CSFLE passthrough behavior — when CSFLE_ENABLED is unset (the default
 * during Phase A/B rollout), the helpers must:
 *   - return input values unchanged on encrypt
 *   - return input values unchanged on decrypt (when input is plaintext)
 *   - fall through to plaintext dual-query for findUserByMobile
 *
 * These tests lock the contract so future changes can't silently break
 * the production safety net. They use the actual helpers (no encryption
 * provider configured) — passthrough is the behavior we're verifying.
 *
 * Tests for the ENCRYPTED path require a live Atlas cluster + DEKs in
 * the key vault — those live in a separate nightly test suite, not here.
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md §9 Test plan
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock $env/dynamic/private BEFORE importing the csfle module — without
// this, the user's local .env.local (which may have CSFLE_ENABLED=true
// for the actual app) would force the test through the real encryption
// code path. These passthrough tests verify behavior with CSFLE disabled.
vi.mock('$env/dynamic/private', () => ({
	env: {
		CSFLE_ENABLED: '', // explicitly disabled
		QE_LOCAL_MASTER_KEY: undefined,
		CSFLE_KEY_VAULT_NAMESPACE: undefined
	}
}));

// Stub the native binding from mongodb-client-encryption. The package
// has a `.node` binding that vitest's loader can't resolve in the jsdom
// environment.
vi.mock('mongodb-client-encryption', () => ({
	ClientEncryption: class {},
	MongoCrypt: class {}
}));

import {
	encryptValue,
	decryptValue,
	isEncryptedBinary,
	encryptUserPii,
	decryptUserPii,
	encryptMobileForQuery,
	encryptEmailForQuery,
	_resetClientEncryptionForTests
} from '$lib/server/csfle/index.js';
import type { MongoClient } from 'mongodb';

// We need a MongoClient instance to satisfy the helper signatures, even
// though no actual MongoDB connection is opened during passthrough.
// `getClientEncryption` returns null when CSFLE_ENABLED !== 'true' (the
// default in unit tests), so no driver calls are made.
const fakeClient = {} as unknown as MongoClient;

beforeEach(() => {
	// Force CSFLE_ENABLED to be unset for these tests
	delete process.env.CSFLE_ENABLED;
	_resetClientEncryptionForTests();
});

describe('CSFLE — passthrough behavior when disabled', () => {
	describe('encryptValue', () => {
		it('returns the input string unchanged when CSFLE is disabled', async () => {
			const result = await encryptValue(fakeClient, '9876543210', 'mobile-key');
			expect(result).toBe('9876543210');
		});

		it('returns the input number unchanged when CSFLE is disabled', async () => {
			const result = await encryptValue(fakeClient, 9876543210, 'mobile-key');
			expect(result).toBe(9876543210);
		});

		it('returns null unchanged', async () => {
			const result = await encryptValue(fakeClient, null, 'mobile-key');
			expect(result).toBeNull();
		});

		it('returns undefined unchanged', async () => {
			const result = await encryptValue(fakeClient, undefined, 'mobile-key');
			expect(result).toBeUndefined();
		});
	});

	describe('decryptValue', () => {
		it('passes plaintext string through unchanged', async () => {
			const result = await decryptValue(fakeClient, 'plain-string');
			expect(result).toBe('plain-string');
		});

		it('passes plaintext number through unchanged', async () => {
			const result = await decryptValue(fakeClient, 9876543210);
			expect(result).toBe(9876543210);
		});

		it('passes null through', async () => {
			const result = await decryptValue(fakeClient, null);
			expect(result).toBeNull();
		});
	});

	describe('isEncryptedBinary', () => {
		it('returns false for plain strings', () => {
			expect(isEncryptedBinary('plain')).toBe(false);
		});

		it('returns false for numbers', () => {
			expect(isEncryptedBinary(123)).toBe(false);
		});

		it('returns false for plain objects', () => {
			expect(isEncryptedBinary({ foo: 'bar' })).toBe(false);
		});

		it('returns false for null/undefined', () => {
			expect(isEncryptedBinary(null)).toBe(false);
			expect(isEncryptedBinary(undefined)).toBe(false);
		});
	});

	describe('encryptUserPii', () => {
		it('returns the doc unchanged when CSFLE is disabled', async () => {
			const doc = {
				mobileNumber: '9876543210',
				email: 'foo@example.com',
				name: 'Test User',
				panNumber: 'ABCDE1234F',
				role: 'dsa', // non-PII field
				createdAt: new Date('2026-01-01')
			};
			const result = await encryptUserPii(doc);
			expect(result.mobileNumber).toBe('9876543210');
			expect(result.email).toBe('foo@example.com');
			expect(result.name).toBe('Test User');
			expect(result.panNumber).toBe('ABCDE1234F');
			expect(result.role).toBe('dsa');
		});

		it('preserves non-PII fields completely', async () => {
			const doc = {
				mobileNumber: '9999999999',
				someBoolean: true,
				someArray: [1, 2, 3],
				someNested: { a: 1, b: 2 }
			};
			const result = await encryptUserPii(doc);
			expect(result.someBoolean).toBe(true);
			expect(result.someArray).toEqual([1, 2, 3]);
			expect(result.someNested).toEqual({ a: 1, b: 2 });
		});

		it('skips null and undefined PII values', async () => {
			const doc = {
				mobileNumber: null,
				email: undefined,
				name: 'Jane'
			};
			const result = await encryptUserPii(doc);
			expect(result.mobileNumber).toBeNull();
			expect(result.email).toBeUndefined();
			expect(result.name).toBe('Jane');
		});
	});

	describe('decryptUserPii', () => {
		it('returns the doc unchanged when CSFLE is disabled', async () => {
			const doc = {
				mobileNumber: '9876543210',
				email: 'foo@example.com',
				name: 'Test User',
				role: 'dsa'
			};
			const result = await decryptUserPii(doc);
			expect(result?.mobileNumber).toBe('9876543210');
			expect(result?.email).toBe('foo@example.com');
			expect(result?.name).toBe('Test User');
			expect(result?.role).toBe('dsa');
		});

		it('returns null when passed null', async () => {
			const result = await decryptUserPii(null);
			expect(result).toBeNull();
		});

		it('handles empty doc', async () => {
			const result = await decryptUserPii({});
			expect(result).toEqual({});
		});
	});

	describe('encryptMobileForQuery / encryptEmailForQuery', () => {
		it('encryptMobileForQuery passes through when disabled', async () => {
			const result = await encryptMobileForQuery('9876543210');
			expect(result).toBe('9876543210');
		});

		it('encryptMobileForQuery normalizes number → string at the boundary', async () => {
			const result = await encryptMobileForQuery(9876543210);
			expect(result).toBe('9876543210');
		});

		it('encryptEmailForQuery passes through when disabled', async () => {
			const result = await encryptEmailForQuery('user@example.com');
			expect(result).toBe('user@example.com');
		});
	});
});
