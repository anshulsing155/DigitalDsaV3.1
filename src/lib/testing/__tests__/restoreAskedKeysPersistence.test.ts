/**
 * Tests for `applicantState.restoreAskedKeys` — the session-scoped "already
 * prompted" memory promoted from component-local $state in S104.
 *
 * Reproduces CLAUDE.md Pitfall #30: pre-S104, every form component held its
 * own `let restoreAskedForKey = $state(null)`. When the user clicked browser
 * back → How Can We Help → Next, the form page remounted, the local state
 * reset to null, and the same detection key re-fired the restore modal.
 *
 * Promoting the memory to `applicantState` (sessionStorage-backed) survives
 * remount within the same tab session.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applicantState } from '$lib/state/applicant.svelte';

describe('applicantState.restoreAskedKeys — session-scoped re-prompt suppression', () => {
	beforeEach(() => {
		applicantState.clearAllRestoreAsked();
	});

	it('hasRestoreAsked returns false before mark', () => {
		expect(applicantState.hasRestoreAsked('individual::john::35::male::single')).toBe(false);
	});

	it('mark + hasRestoreAsked round-trips for one key', () => {
		applicantState.markRestoreAsked('individual::john::35::male::single');
		expect(applicantState.hasRestoreAsked('individual::john::35::male::single')).toBe(true);
		// Different key not affected
		expect(applicantState.hasRestoreAsked('individual::jane::30::female::single')).toBe(false);
	});

	it('handles multiple keys simultaneously', () => {
		applicantState.markRestoreAsked('key-a');
		applicantState.markRestoreAsked('key-b');
		applicantState.markRestoreAsked('key-c');
		expect(applicantState.hasRestoreAsked('key-a')).toBe(true);
		expect(applicantState.hasRestoreAsked('key-b')).toBe(true);
		expect(applicantState.hasRestoreAsked('key-c')).toBe(true);
	});

	it('mark is idempotent — repeating does not duplicate', () => {
		applicantState.markRestoreAsked('key-a');
		applicantState.markRestoreAsked('key-a');
		applicantState.markRestoreAsked('key-a');
		expect(applicantState.hasRestoreAsked('key-a')).toBe(true);
		// Internal set should hold one entry
		expect(applicantState.restoreAskedKeys.size).toBe(1);
	});

	it('clearRestoreAsked removes a specific key and leaves others', () => {
		applicantState.markRestoreAsked('key-a');
		applicantState.markRestoreAsked('key-b');
		applicantState.clearRestoreAsked('key-a');
		expect(applicantState.hasRestoreAsked('key-a')).toBe(false);
		expect(applicantState.hasRestoreAsked('key-b')).toBe(true);
	});

	it('clearAllRestoreAsked drops everything', () => {
		applicantState.markRestoreAsked('key-a');
		applicantState.markRestoreAsked('key-b');
		applicantState.clearAllRestoreAsked();
		expect(applicantState.hasRestoreAsked('key-a')).toBe(false);
		expect(applicantState.hasRestoreAsked('key-b')).toBe(false);
		expect(applicantState.restoreAskedKeys.size).toBe(0);
	});

	it('mark with empty string is a no-op (defensive guard)', () => {
		applicantState.markRestoreAsked('');
		expect(applicantState.hasRestoreAsked('')).toBe(false);
		expect(applicantState.restoreAskedKeys.size).toBe(0);
	});

	// ── Core regression reproduction ──
	// Pre-S104 reproduction: component-local $state lost on remount. Now the
	// store survives, so the same detection key won't re-prompt.
	it('survives a simulated component remount (key persists across re-reads)', () => {
		const detectionKey = 'individual::john::35::male::single';

		// First component mount: modal opens, marks key.
		applicantState.markRestoreAsked(detectionKey);
		expect(applicantState.hasRestoreAsked(detectionKey)).toBe(true);

		// Simulate component remount (browser back → forward). Component-local
		// state would have reset to null at this point pre-S104. The store
		// retains the value.
		const askedAfterRemount = applicantState.hasRestoreAsked(detectionKey);
		expect(askedAfterRemount, 'detector must skip re-prompt after remount').toBe(true);
	});
});
