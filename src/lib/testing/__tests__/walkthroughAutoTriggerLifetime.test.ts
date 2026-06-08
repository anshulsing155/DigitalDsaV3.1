/**
 * Lock test — Product Guide auto-trigger fires ONCE per lifetime
 * ══════════════════════════════════════════════════════════════════════
 * Owner-stated spec 2026-06-02: "automatically once only in lifetime,
 * thereafter only when user seeks".
 *
 * The auto-trigger gate is shouldAutoTriggerIntro on the walkthroughState
 * singleton. This test locks the contract:
 *
 *   - serverState.intro_auto_triggered_at present       → gate CLOSED
 *   - serverState.intro_completed true                  → gate CLOSED (legacy)
 *   - serverState.intro_dismissed_at present            → gate CLOSED (legacy)
 *   - isDemo === true                                   → gate CLOSED
 *   - localStorage marker present                       → gate CLOSED
 *   - sessionStorage marker present                     → gate CLOSED
 *   - ALL of the above absent                           → gate OPEN
 *
 * markIntroAutoTriggered() flips the gate AND writes both storage backups
 * synchronously, so a hard-reload race during the 800ms auto-trigger
 * setTimeout cannot bypass the gate.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// $app/environment.browser is false by default in vitest. The walkthrough
// state's storage writes are gated on this flag, so we mock to true to
// exercise the persistence paths — that's the whole point of this lock test.
vi.mock('$app/environment', () => ({ browser: true }));

// Silence the fire-and-forget PATCH to /api/walkthrough — clientLogger may
// warn on the fetch failure (jsdom has no real fetch).
vi.mock('$lib/utils/csrf', () => ({
	secureFetch: vi.fn().mockResolvedValue({ ok: true, status: 200 })
}));
vi.mock('$lib/utils/clientLogger', () => ({
	default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

import { walkthroughState } from '$lib/state/walkthrough.svelte';
import type { WalkthroughDbState } from '$lib/config/walkthrough/types';

const LS_INTRO_COMPLETED_KEY = 'ddsa_intro_completed';
const LS_INTRO_AUTO_TRIGGERED_KEY = 'ddsa_intro_auto_triggered';
const SS_INTRO_AUTO_TRIGGERED_KEY = 'ddsa_intro_auto_triggered_this_session';

function makeFreshServerState(): WalkthroughDbState {
	return {
		intro_completed: false,
		explanatory_completed: false,
		page_tours_completed: {}
	};
}

beforeEach(() => {
	walkthroughState.reset();
	try {
		localStorage.removeItem(LS_INTRO_COMPLETED_KEY);
		localStorage.removeItem(LS_INTRO_AUTO_TRIGGERED_KEY);
		sessionStorage.removeItem(SS_INTRO_AUTO_TRIGGERED_KEY);
	} catch {
		/* jsdom may not have storage; tests still run */
	}
});

describe('walkthroughState — shouldAutoTriggerIntro gate', () => {
	it('OPEN for a brand-new user (no server state, empty storage)', () => {
		walkthroughState.init(null, false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(true);
	});

	it('OPEN for a fresh server state (all flags false, empty storage)', () => {
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(true);
	});

	it('CLOSED when serverState.intro_auto_triggered_at is set', () => {
		walkthroughState.init(
			{
				...makeFreshServerState(),
				intro_auto_triggered_at: '2026-05-15T10:00:00Z'
			},
			false,
			'dsa'
		);
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED when serverState.intro_completed is true (legacy gate)', () => {
		walkthroughState.init(
			{ ...makeFreshServerState(), intro_completed: true },
			false,
			'dsa'
		);
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED when serverState.intro_dismissed_at is set (legacy gate)', () => {
		walkthroughState.init(
			{ ...makeFreshServerState(), intro_dismissed_at: '2026-05-15T10:00:00Z' },
			false,
			'dsa'
		);
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED for demo guests regardless of flags', () => {
		walkthroughState.init(makeFreshServerState(), true, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED when localStorage exposure marker is set even if server is fresh', () => {
		localStorage.setItem(LS_INTRO_AUTO_TRIGGERED_KEY, '1');
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED when sessionStorage exposure marker is set even if server is fresh', () => {
		sessionStorage.setItem(SS_INTRO_AUTO_TRIGGERED_KEY, '1');
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('CLOSED when serverState is null but localStorage has legacy completed marker', () => {
		// Simulates: user completed in old browser session, server persist failed,
		// they returned in the same browser. Legacy gate must hold.
		localStorage.setItem(LS_INTRO_COMPLETED_KEY, '1');
		walkthroughState.init(null, false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});
});

describe('walkthroughState — markIntroAutoTriggered side effects', () => {
	it('flips the lifetime gate synchronously', () => {
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(true);

		walkthroughState.markIntroAutoTriggered();

		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('writes BOTH localStorage and sessionStorage markers synchronously', () => {
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		walkthroughState.markIntroAutoTriggered();

		expect(localStorage.getItem(LS_INTRO_AUTO_TRIGGERED_KEY)).toBe('1');
		expect(sessionStorage.getItem(SS_INTRO_AUTO_TRIGGERED_KEY)).toBe('1');
	});

	it('survives a "reload" simulated by re-init from null serverState', () => {
		// Simulates: user dismisses, page reloads, DB write hasn't landed yet,
		// new init() sees serverState=null (no DB row OR persist raced).
		// localStorage backup MUST still close the gate.
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		walkthroughState.markIntroAutoTriggered();

		// Simulate reload — fresh init, no server state.
		walkthroughState.reset();
		walkthroughState.init(null, false, 'dsa');

		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});

	it('survives a "reload" with server state that has NOT yet received the auto-trigger flag', () => {
		// Simulates: user dismisses, page reloads, DB write IS NOT YET in
		// the new serverState (server load ran during the write race window).
		// localStorage backup must close the gate.
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		walkthroughState.markIntroAutoTriggered();

		walkthroughState.reset();
		// Server state STILL says fresh — DB write hasn't been read back yet.
		walkthroughState.init(makeFreshServerState(), false, 'dsa');

		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
	});
});

describe('walkthroughState — fetch mocked persist for completeness', () => {
	beforeEach(() => {
		// Mock secureFetch to no-op so the fire-and-forget PATCH doesn't
		// pollute test output. We're not asserting on the network call here;
		// the storage writes are the load-bearing guarantee.
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
		);
	});

	it('markIntroAutoTriggered is idempotent — calling twice leaves the gate closed', () => {
		walkthroughState.init(makeFreshServerState(), false, 'dsa');
		walkthroughState.markIntroAutoTriggered();
		walkthroughState.markIntroAutoTriggered();
		expect(walkthroughState.shouldAutoTriggerIntro).toBe(false);
		// Markers idempotent at storage layer (both runs write '1').
		expect(localStorage.getItem(LS_INTRO_AUTO_TRIGGERED_KEY)).toBe('1');
	});
});
