/**
 * D.1 S2 — Provider registry tests
 * ══════════════════════════════════════════════════════════════════
 * Covers env-driven provider selection. Safe default is `mock` in dev,
 * required `razorpay` in production — misconfiguration FAILS LOUDLY
 * rather than silently picking the wrong provider.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
	_resetBillingProviderForTests,
	createBillingProvider,
	getBillingProvider
} from '$lib/server/billing/providerRegistry';
import { MockProvider } from '$lib/server/billing/providers/mock';
import { RazorpayProvider } from '$lib/server/billing/providers/razorpay';

// ── Env helpers ────────────────────────────────────────────────

const ENV_KEYS = [
	'BILLING_PROVIDER',
	'RAZORPAY_KEY_ID',
	'RAZORPAY_KEY_SECRET',
	'RAZORPAY_WEBHOOK_SECRET'
] as const;

const savedEnv: Record<string, string | undefined> = {};

function snapshotEnv() {
	for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}

function restoreEnv() {
	for (const k of ENV_KEYS) {
		if (savedEnv[k] === undefined) delete process.env[k];
		else process.env[k] = savedEnv[k];
	}
}

beforeEach(() => {
	snapshotEnv();
	_resetBillingProviderForTests();
});

afterEach(() => {
	restoreEnv();
	_resetBillingProviderForTests();
});

// ── Mock selection ─────────────────────────────────────────────

describe('providerRegistry — mock selection', () => {
	it('explicit BILLING_PROVIDER=mock returns MockProvider', () => {
		process.env.BILLING_PROVIDER = 'mock';
		const p = createBillingProvider();
		expect(p).toBeInstanceOf(MockProvider);
		expect(p.name).toBe('mock');
	});

	it('mock is the default in dev (when env is unset)', () => {
		// Vitest runs with `dev === true` via $app/environment, so unset → mock.
		delete process.env.BILLING_PROVIDER;
		const p = createBillingProvider();
		expect(p).toBeInstanceOf(MockProvider);
	});

	it('mock uses a default webhook secret if RAZORPAY_WEBHOOK_SECRET is unset', () => {
		process.env.BILLING_PROVIDER = 'mock';
		delete process.env.RAZORPAY_WEBHOOK_SECRET;
		const p = createBillingProvider();
		expect(p).toBeInstanceOf(MockProvider);
		// Should not throw — mock is permissive about webhook secret.
	});
});

// ── Razorpay selection ─────────────────────────────────────────

describe('providerRegistry — razorpay selection', () => {
	it('BILLING_PROVIDER=razorpay constructs RazorpayProvider', () => {
		process.env.BILLING_PROVIDER = 'razorpay';
		process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
		process.env.RAZORPAY_KEY_SECRET = 'secret_y';
		process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_z';
		const p = createBillingProvider();
		expect(p).toBeInstanceOf(RazorpayProvider);
		expect(p.name).toBe('razorpay');
	});

	it('BILLING_PROVIDER=razorpay with missing key throws clear error', () => {
		process.env.BILLING_PROVIDER = 'razorpay';
		delete process.env.RAZORPAY_KEY_ID;
		process.env.RAZORPAY_KEY_SECRET = 's';
		process.env.RAZORPAY_WEBHOOK_SECRET = 'w';
		expect(() => createBillingProvider()).toThrow(/RAZORPAY_KEY_ID/);
	});

	it('BILLING_PROVIDER=razorpay with missing webhook secret throws', () => {
		process.env.BILLING_PROVIDER = 'razorpay';
		process.env.RAZORPAY_KEY_ID = 'k';
		process.env.RAZORPAY_KEY_SECRET = 's';
		delete process.env.RAZORPAY_WEBHOOK_SECRET;
		expect(() => createBillingProvider()).toThrow(/RAZORPAY_WEBHOOK_SECRET/);
	});
});

// ── Misconfiguration handling ─────────────────────────────────

describe('providerRegistry — error paths', () => {
	it('unknown BILLING_PROVIDER value throws (no silent fallback)', () => {
		process.env.BILLING_PROVIDER = 'stripe'; // not supported
		expect(() => createBillingProvider()).toThrow(/unknown value/);
	});

	it('empty string BILLING_PROVIDER is treated as unset', () => {
		process.env.BILLING_PROVIDER = '';
		// In dev: defaults to mock. Should not throw.
		const p = createBillingProvider();
		expect(p).toBeInstanceOf(MockProvider);
	});
});

// ── Singleton behavior ─────────────────────────────────────────

describe('providerRegistry — singleton', () => {
	it('getBillingProvider returns the same instance across calls', () => {
		process.env.BILLING_PROVIDER = 'mock';
		const a = getBillingProvider();
		const b = getBillingProvider();
		expect(a).toBe(b);
	});

	it('_resetBillingProviderForTests clears the singleton', () => {
		process.env.BILLING_PROVIDER = 'mock';
		const a = getBillingProvider();
		_resetBillingProviderForTests();
		const b = getBillingProvider();
		expect(a).not.toBe(b);
	});
});
