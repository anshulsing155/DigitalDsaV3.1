/**
 * SEC-10 Commit C — session-status endpoint + poller wiring lock
 * ══════════════════════════════════════════════════════════════════
 * Three things in one file (the lock for Commit C):
 *
 *   1. Behavioral: /api/auth/session-status returns 200 active when
 *      no row exists / not revoked, and 401 with the revoke shape when
 *      revoked_at is set. Reason mapping: 'kicked_by_new_login' and
 *      'account_closed' pass through; everything else folds to 'logout'.
 *
 *   2. Structural: both authenticated-layout files
 *      (`(app)/+layout.svelte` and `dashboard/+layout.svelte`) wire the
 *      canonical poller — import KickedToast + createSessionStatusPoller,
 *      call .start() / .stop() in the mount cycle, render the toast when
 *      state.kicked is non-null. Without these, a kick on another device
 *      wouldn't surface here.
 *
 *   3. Structural: the endpoint NEVER writes — it's the polling hot path
 *      (~1 req per 8s per active user). A Mongo write per poll would
 *      dominate Sessions IOPS at scale (spec §6.3).
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §6
 * ADR:  docs/adr/0028-single-session-enforcement.md
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { mockFindOne, mockVerifyRefresh } = vi.hoisted(() => ({
	mockFindOne: vi.fn(),
	mockVerifyRefresh: vi.fn()
}));

vi.mock('$lib/database/mongo', () => ({
	Sessions: { findOne: (...a: unknown[]) => mockFindOne(...a) }
}));

vi.mock('$lib/services/jwtService', () => ({
	verifyRefreshToken: (...a: unknown[]) => mockVerifyRefresh(...a)
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { GET } from '../../../routes/api/auth/session-status/+server';

function makeEvent(refreshCookie: string | undefined) {
	return {
		cookies: {
			get: (name: string) => (name === 'refreshToken' ? refreshCookie : undefined)
		}
	} as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
	mockFindOne.mockReset();
	mockVerifyRefresh.mockReset();
});

describe('GET /api/auth/session-status — behavioral', () => {
	it('returns 200 active:false when refresh cookie is missing (no toast on logged-out tab)', async () => {
		const res = await GET(makeEvent(undefined));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.active).toBe(false);
		expect(body.reason).toBe('no_session');
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns 200 active:false when refresh token does not verify', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: false });
		const res = await GET(makeEvent('garbage'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.active).toBe(false);
		expect(body.reason).toBe('invalid_token');
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns 200 active:true when no Sessions row exists (legacy pre-SEC-10 user)', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't1' } });
		mockFindOne.mockResolvedValue(null);
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.active).toBe(true);
	});

	it('returns 200 active:true when row exists but revoked_at is unset', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't2' } });
		mockFindOne.mockResolvedValue({ revoked_at: undefined, revoke_reason: undefined });
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.active).toBe(true);
	});

	it('returns 401 with reason kicked_by_new_login when row is revoked by a SEC-10 kick', async () => {
		const revokedAt = new Date('2026-06-04T12:00:00Z');
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't3' } });
		mockFindOne.mockResolvedValue({
			revoked_at: revokedAt,
			revoke_reason: 'kicked_by_new_login'
		});
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.revoked.reason).toBe('kicked_by_new_login');
		expect(body.revoked.at).toBe(revokedAt.toISOString());
	});

	it('returns 401 with reason account_closed when row is revoked by close-account', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't4' } });
		mockFindOne.mockResolvedValue({
			revoked_at: new Date(),
			revoke_reason: 'account_closed'
		});
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.revoked.reason).toBe('account_closed');
	});

	it('folds unknown revoke reasons to "logout"', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't5' } });
		mockFindOne.mockResolvedValue({
			revoked_at: new Date(),
			revoke_reason: 'user_action'
		});
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.revoked.reason).toBe('logout');
	});

	it('fails OPEN on a Sessions lookup error (active:true) — prevents Mongo blip from kicking everyone', async () => {
		mockVerifyRefresh.mockReturnValue({ valid: true, payload: { tokenId: 't6' } });
		mockFindOne.mockRejectedValue(new Error('Mongo timed out'));
		const res = await GET(makeEvent('valid-refresh'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.active).toBe(true);
	});
});

describe('Poller defaults (SEC-10 instant-kick tuning, evolved 2026-06-05 per ADR-0033)', () => {
	// All assertions in this describe block target constants + exports
	// declared in sessionStatusPoller.svelte.ts. Read the source ONCE per
	// describe-run via source-grep — NOT via `await import()`. The dynamic
	// import compiles the .svelte.ts rune file through Vite at test time,
	// which routinely exceeds vitest's 5s default timeout under heavy
	// parallel-suite CPU load and flakes the entire pre-push gate.
	// Source-grep is sub-millisecond and matches the convention used by
	// the sibling describe blocks below (hooks.server.ts, csrf.ts, etc.).
	const pollerPath = resolve(process.cwd(), 'src/lib/utils/sessionStatusPoller.svelte.ts');
	const src = readFileSync(pollerPath, 'utf8');

	it('polls every 3 seconds during the initial 2-minute post-login window (owner direction preserved)', () => {
		// SESSION_POLL_MS is the cadence applied during the initial window
		// where cross-device login conflicts cluster. Past the window,
		// adaptive intervals (FOCUSED_POLL_MS / HIDDEN_POLL_MS) take over.
		// Bumping this forces a deliberate test edit — guard against silent
		// regression of the owner's "kick immediately" direction.
		expect(src).toMatch(/export\s+const\s+SESSION_POLL_MS\s*=\s*3000\b/);
	});

	it('initial-window duration is 2 minutes (where cross-device conflicts cluster)', () => {
		// ADR-0033: 2 minutes covers the post-login window where most
		// cross-device login conflicts actually happen. Past this window,
		// the adaptive cadence (5s focused / 20s hidden) kicks in.
		expect(src).toMatch(/export\s+const\s+INITIAL_POLL_WINDOW_MS\s*=\s*120_?000\b/);
	});

	it('focused-tab cadence is 5 seconds after the initial window expires', () => {
		// ADR-0033: industry-standard "active-but-idle" heartbeat (5-10s).
		// Active users are already covered instantly by the hooks.server.ts
		// revoke check, so the poller's job after the initial window is
		// purely to surface kicks on tabs the user is staring at without
		// otherwise interacting.
		expect(src).toMatch(/export\s+const\s+FOCUSED_POLL_MS\s*=\s*5000\b/);
	});

	it('hidden-tab cadence is 20 seconds (visibilitychange listener fires immediate poll on return)', () => {
		// ADR-0033: aggressive throttle since the user can't see the
		// kicked-toast anyway until they return; the visibilitychange
		// listener fires an immediate poll on return so the user never
		// actually waits 20s after refocusing.
		expect(src).toMatch(/export\s+const\s+HIDDEN_POLL_MS\s*=\s*20_?000\b/);
	});

	it('displays the modal for 5 seconds before redirect (owner ask 2026-06-05)', () => {
		// Tightened to 1.5s on 2026-06-04, then re-stretched to 5s on
		// 2026-06-05 when the kick-notice UX moved from corner toast →
		// centered modal: the modal dominates the screen and needs a
		// readable display window.
		expect(src).toMatch(/export\s+const\s+KICKED_REDIRECT_DELAY_MS\s*=\s*5000\b/);
	});

	it('exposes isSessionKicked() so secureFetch can short-circuit background traffic', () => {
		// Without this, the 5-second display window between kick-detected
		// and redirect leaks stale fetches that all 401 — surfacing as
		// console errors from whatever component invoked them. The flag
		// keeps the kicked tab radio-silent until redirect.
		expect(src).toMatch(/export\s+function\s+isSessionKicked\(\)\s*:\s*boolean/);
		expect(src).toMatch(/_isKicked\s*=\s*true/);
	});

	it('stops the proactive token-refresh scheduler when kick is detected', () => {
		// Without this, the scheduler fires its next refresh ~2 min later,
		// hits a now-revoked refresh-token endpoint, and emits the
		// canonical session-rotation telemetry — a guaranteed noisy log
		// the user already explicitly said they don't want.
		expect(src).toMatch(/stopTokenRefreshScheduler\(\)/);
	});

	it('default redirect target is the public home page tagged with reason=kicked', () => {
		expect(src).toMatch(/redirectTo\s*=\s*opts\?\.redirectTo\s*\?\?\s*'\/\?reason=kicked'/);
	});
});

describe('Adaptive polling state machine (S229 ADR-0033)', () => {
	const pollerPath = resolve(process.cwd(), 'src/lib/utils/sessionStatusPoller.svelte.ts');
	const src = readFileSync(pollerPath, 'utf8');

	it('uses recursive setTimeout (not setInterval) so the interval can shift mid-session', () => {
		// setTimeout-then-reschedule is the canonical pattern for adaptive
		// cadences — setInterval would be locked at the value it was
		// constructed with. Lock the structural choice.
		expect(src).toMatch(/setTimeout\(tick,\s*nextPollInterval\(\)\)/);
		expect(src).not.toMatch(/setInterval\(tick/);
	});

	it('reads document.visibilityState in the next-interval decision', () => {
		// Hidden tabs poll at HIDDEN_POLL_MS, visible at FOCUSED_POLL_MS.
		// The check has to happen at scheduleNext-time (not just on
		// visibilitychange) so a tab that was visible at start but is
		// now hidden gets the slower cadence on its next tick.
		expect(src).toMatch(/document\.visibilityState\s*===\s*'visible'/);
	});

	it('registers a visibilitychange listener that polls immediately on return-to-visible', () => {
		// The whole point of "20s hidden cadence" is that the user gets
		// an instant check the moment they look at the tab again, so
		// they never actually feel the 20s.
		expect(src).toMatch(/addEventListener\(\s*['"]visibilitychange['"]/);
	});

	it('registers a focus listener that polls immediately on window-focus', () => {
		// visibilitychange covers tab-switching but not window-focus
		// (a visible tab whose window lost OS focus). focus event covers
		// that case for completeness.
		expect(src).toMatch(/addEventListener\(\s*['"]focus['"]/);
	});

	it('initial-window check uses isInInitialWindow() against startedAt', () => {
		// The state-machine pivot — first 2 min uses 3s; after that, the
		// visibility-aware cadences kick in. Lock the predicate.
		expect(src).toMatch(/function\s+isInInitialWindow/);
		expect(src).toMatch(/Date\.now\(\)\s*-\s*startedAt\s*<\s*INITIAL_POLL_WINDOW_MS/);
	});
});

describe('BroadcastChannel leader election (S229 ADR-0033)', () => {
	const pollerPath = resolve(process.cwd(), 'src/lib/utils/sessionStatusPoller.svelte.ts');
	const src = readFileSync(pollerPath, 'utf8');

	it('opens a BroadcastChannel on start() with the canonical channel name', () => {
		// Single channel name shared across leader-election + revoke
		// broadcasts. If this drifts between modules, tabs from different
		// versions could fail to coordinate; lock the name.
		expect(src).toMatch(/new\s+BroadcastChannel\(\s*BROADCAST_CHANNEL_NAME\s*\)/);
		expect(src).toMatch(
			/const\s+BROADCAST_CHANNEL_NAME\s*=\s*['"]digitaldsa\.session-poller['"]/
		);
	});

	it('generates a stable per-tab id via crypto.randomUUID (with fallback)', () => {
		// Lowest tabId wins the leader election — needs to be stable for
		// the lifetime of the tab. crypto.randomUUID is the canonical
		// choice; the Math.random fallback handles very old browsers
		// that would also lack BroadcastChannel.
		expect(src).toMatch(/crypto\.randomUUID\(\)/);
		expect(src).toMatch(/Math\.random\(\)/);
	});

	it('elects leader on a quiet-period timeout if no existing leader heartbeats', () => {
		// 100ms quiet period: tabs that just opened wait briefly for an
		// existing leader's heartbeat. If none arrives, claim leadership.
		expect(src).toMatch(/LEADER_ELECTION_QUIET_MS/);
		expect(src).toMatch(/function\s+electLeader/);
	});

	it('re-elects leadership when a follower hasn\'t heard a heartbeat for LEADER_HEARTBEAT_TIMEOUT_MS', () => {
		// Defends against a leader that crashes / closes without sending
		// a final goodbye. Followers detect via heartbeat staleness and
		// re-elect.
		expect(src).toMatch(/LEADER_HEARTBEAT_TIMEOUT_MS/);
		expect(src).toMatch(/lastLeaderHeartbeat\s*>\s*LEADER_HEARTBEAT_TIMEOUT_MS/);
	});

	it('handles three broadcast message types: claim, heartbeat, revoked', () => {
		// Discriminated union by `type`. Lock the three message kinds.
		expect(src).toMatch(/case\s+['"]claim['"]/);
		expect(src).toMatch(/case\s+['"]heartbeat['"]/);
		expect(src).toMatch(/case\s+['"]revoked['"]/);
	});

	it('broadcasts revoke events to other tabs so followers receive the kick instantly', () => {
		// The whole point of leader election — when the leader detects a
		// kick, followers learn IMMEDIATELY via the broadcast (no server
		// round-trip) instead of waiting for their own re-election + poll.
		expect(src).toMatch(
			/channel\?\.postMessage\(\{\s*type:\s*['"]revoked['"]/
		);
	});

	it('stop() closes the BroadcastChannel and resets leader state', () => {
		// Critical for HMR / route navigation — a leaked channel keeps
		// the tab "alive" in the leader-election protocol even after
		// the poller is supposed to be stopped.
		expect(src).toMatch(/channel\.close\(\)/);
		expect(src).toMatch(/isLeader\s*=\s*false/);
	});

	it('falls back to per-tab polling when BroadcastChannel is unavailable', () => {
		// Very old browsers without BroadcastChannel still work — the
		// try/catch around the constructor + the isLeader=true fallback
		// keeps the single-tab user covered.
		expect(src).toMatch(/catch\s*\{[\s\S]{0,300}isLeader\s*=\s*true/);
	});
});

describe('secureFetch silences the kicked tab (SEC-10 no-console-noise contract)', () => {
	const csrfPath = resolve(process.cwd(), 'src/lib/utils/csrf.ts');
	const src = readFileSync(csrfPath, 'utf8');

	it('imports isSessionKicked from the poller module', () => {
		expect(src).toContain("import { isSessionKicked } from '$lib/utils/sessionStatusPoller.svelte'");
	});

	it('short-circuits with a synthetic 401 Response when isSessionKicked() is true', () => {
		// The synthetic response must be a 401 (so callers' standard
		// auth-error path handles it) AND it must skip the network call
		// entirely (so no real 401 lands in DevTools Network either).
		// Body MUST be null/empty — anything else looks like a real
		// server response and could trip a JSON parse on the caller.
		expect(src).toMatch(/isSessionKicked\(\)/);
		expect(src).toMatch(/new Response\(\s*null\s*,\s*\{\s*status:\s*401[^}]*\}\s*\)/);
	});
});

describe('KickedToast component is rendered as a centered modal (owner ask 2026-06-05)', () => {
	const modalPath = resolve(process.cwd(), 'src/lib/components/auth/KickedToast.svelte');
	const src = readFileSync(modalPath, 'utf8');

	it('uses an alertdialog role with assertive aria-live', () => {
		// alertdialog (not status) so screen readers announce the message
		// immediately + the assertive politeness ensures it interrupts
		// any other UI patter the user might already be hearing.
		expect(src).toMatch(/role="alertdialog"/);
		expect(src).toMatch(/aria-live="assertive"/);
	});

	it('positions itself centered on a full-screen overlay (not a corner toast)', () => {
		// fixed inset-0 → covers the viewport; flex items-center justify-center
		// → places the card in the visual center.
		expect(src).toMatch(/fixed\s+inset-0/);
		expect(src).toMatch(/items-center\s+justify-center/);
	});

	it('shows the owner-spec copy on the kicked_by_new_login branch', () => {
		// "You have logged in on another device. Logging out from here." —
		// the literal copy from the 2026-06-05 owner direction.
		expect(src).toContain('You have logged in on another device');
		expect(src).toMatch(/Logging out from here/);
	});

	it('z-index sits above other dialogs so this notice dominates', () => {
		// dashboard ConfirmModal sits at z-50; this needs to be above.
		expect(src).toMatch(/z-\[9999\]/);
	});
});

describe('hooks.server.ts catches revoked sessions at the request layer (SEC-10 instant-kick)', () => {
	const hooksPath = resolve(process.cwd(), 'src/hooks.server.ts');
	const src = readFileSync(hooksPath, 'utf8');

	it('imports isSessionRevoked from the canonical sessions helper', () => {
		expect(src).toContain("import { isSessionRevoked } from '$lib/server/account/sessions'");
	});

	it('imports redirect from @sveltejs/kit (used to bounce navigation requests)', () => {
		expect(src).toMatch(/import\s*\{[\s\S]*?\bredirect\b[\s\S]*?\}\s*from\s*'@sveltejs\/kit'/);
	});

	it('skips the revoke check on /api/auth/session-status (poller must read the revoke payload)', () => {
		// If the hook bounced the poller endpoint, the kicked-toast could never
		// fetch the revoke metadata before redirect — silent UX with no
		// explanation. Lock the exemption.
		expect(src).toMatch(/requestPath\s*===\s*'\/api\/auth\/session-status'/);
	});

	it('skips the revoke check on /api/auth/logout (graceful logout owns its return)', () => {
		expect(src).toMatch(/requestPath\s*===\s*'\/api\/auth\/logout'/);
	});

	it('redirects navigation requests (GET on non-/api/ path) to /?reason=kicked', () => {
		expect(src).toMatch(/throw\s+redirect\(\s*303\s*,\s*'\/\?reason=kicked'\s*\)/);
	});

	it('emits structured session.hook_revoked telemetry so the kick is observable', () => {
		// Without this, instant kicks would be invisible to ops — only the
		// poll-based path emits session.poll_revoked. The hook path needs
		// its own event tag for the admin dashboard to see both surfaces.
		expect(src).toMatch(/event:\s*'session\.hook_revoked'/);
	});

	it("re-throws SvelteKit's redirect/HttpError from the JWT-auth catch (regression guard)", () => {
		// 2026-06-04 bug: handleJWTAuthentication wraps its whole body in
		// try/catch and logs every thrown value as 'JWT validation error'.
		// Our `throw redirect(303, '/?reason=kicked')` was caught and
		// silently swallowed there — the kick redirect never reached the
		// SvelteKit response handler. Fix: re-throw the redirect/HttpError
		// objects BEFORE logging. This lock asserts the re-throw stays.
		expect(src).toMatch(/if\s*\(\s*isRedirect\(error\)\s*\|\|\s*isHttpError\(error\)\s*\)/);
		expect(src).toContain("import {");
		expect(src).toMatch(/\bisRedirect\b/);
		expect(src).toMatch(/\bisHttpError\b/);
	});

	it("skips recordException on the OTel root span for redirect/HttpError (no false-positive exception spans)", () => {
		// Without this, every 303 redirect from the hook fires recordException
		// in OpenTelemetry and shows up as an ERROR-status span — drowning
		// real exceptions in noise.
		expect(src).toMatch(/!isRedirect\(err\)\s*&&\s*!isHttpError\(err\)/);
	});
});

describe('mongo.ts ensureIndexes cleans up orphan Sessions indexes (defensive)', () => {
	const mongoPath = resolve(process.cwd(), 'src/lib/database/mongo.ts');
	const src = readFileSync(mongoPath, 'utf8');

	it('drops the id_1 orphan that bricks recordSession with E11000', () => {
		// The fix that made SEC-10 actually work end-to-end on 2026-06-04.
		// If a future "consolidate indexes" refactor removes this block,
		// the next environment with the orphan index will silently brick
		// Sessions inserts again. Lock the list.
		expect(src).toContain("'id_1'");
		expect(src).toMatch(/STALE_SESSION_INDEXES/);
	});

	it('also drops the five other orphans (userId_1 / deviceId_1 / expiresAt_1 / isActive_1 / lastAccessedAt_1)', () => {
		// Non-unique so they don't crash inserts, but they burn write IO
		// and clutter the index list — drop them too.
		const block = src.slice(src.indexOf('STALE_SESSION_INDEXES'));
		expect(block).toContain("'userId_1'");
		expect(block).toContain("'deviceId_1'");
		expect(block).toContain("'expiresAt_1'");
		expect(block).toContain("'isActive_1'");
		expect(block).toContain("'lastAccessedAt_1'");
	});

	it('swallows IndexNotFound errors so the cleanup is idempotent across boots', () => {
		// Steady-state after the first successful cleanup, dropIndex throws
		// IndexNotFound (code 27). The boot loop must continue past this.
		const block = src.slice(src.indexOf('STALE_SESSION_INDEXES'));
		expect(block).toMatch(/IndexNotFound/);
		expect(block).toMatch(/code\s*!==\s*27/);
	});
});

describe('Endpoint is read-only — no Mongo writes in the poll hot path', () => {
	const endpointPath = resolve(
		process.cwd(),
		'src/routes/api/auth/session-status/+server.ts'
	);
	const src = readFileSync(endpointPath, 'utf8');

	it('does not call any *.updateOne / updateMany / insertOne / deleteOne / replaceOne', () => {
		// Adding a write here would dominate Sessions IOPS at scale (~125 ops/s
		// at 1k concurrent DSAs). If observability work later wants to bump
		// last_seen_at on poll, that's the moment to also add a write throttle
		// (e.g. only every 5 min) AND update this lock — never silently.
		expect(src).not.toMatch(/\.updateOne\(/);
		expect(src).not.toMatch(/\.updateMany\(/);
		expect(src).not.toMatch(/\.insertOne\(/);
		expect(src).not.toMatch(/\.deleteOne\(/);
		expect(src).not.toMatch(/\.replaceOne\(/);
	});
});

describe('SessionConflictModal carries the "one active session" policy callout', () => {
	const modalPath = resolve(process.cwd(), 'src/lib/components/SessionConflictModal.svelte');
	const src = readFileSync(modalPath, 'utf8');

	it('renders the short policy line so the user understands why this is happening', () => {
		// Copy may be refined; the phrase "One active session per account" is the
		// policy headline AWS-style users will recognise as the contract. Lock it
		// so a future copy refactor can't silently drop it.
		expect(src).toMatch(/One active session per account/);
	});

	it('explains tabs are exempt (Risk R2: incognito counts; tabs do not)', () => {
		// Without this line, users wonder why opening a new tab didn't kick them.
		// Avoiding that confusion is half the reason the callout exists.
		// Whitespace-tolerant — Svelte source wraps prose across lines.
		expect(src).toMatch(/[Tt]abs\s+in\s+the\s+same\s+browser\s+don't\s+count/);
	});
});

describe('Both authenticated-layout files wire the canonical SEC-10 poller', () => {
	const layouts = [
		{
			name: '(app)/+layout.svelte',
			path: resolve(process.cwd(), 'src/routes/(app)/+layout.svelte')
		},
		{
			name: 'dashboard/+layout.svelte',
			path: resolve(process.cwd(), 'src/routes/dashboard/+layout.svelte')
		}
	];

	for (const layout of layouts) {
		const src = readFileSync(layout.path, 'utf8');

		describe(layout.name, () => {
			it('imports KickedToast from the canonical path', () => {
				expect(src).toContain("from '$lib/components/auth/KickedToast.svelte'");
			});

			it('imports createSessionStatusPoller from the canonical path', () => {
				expect(src).toContain("from '$lib/utils/sessionStatusPoller.svelte'");
			});

			it('starts the poller on mount and stops on unmount', () => {
				expect(src).toMatch(/createSessionStatusPoller\(/);
				expect(src).toMatch(/sessionPoller\.start\(\)/);
				expect(src).toMatch(/sessionPoller\.stop\(\)/);
			});

			it('renders KickedToast when sessionPoller.state.kicked is non-null', () => {
				expect(src).toMatch(/\{#if\s+sessionPoller\.state\.kicked\}/);
				expect(src).toMatch(/<KickedToast[\s\S]*?reason=\{sessionPoller\.state\.kicked\.reason\}/);
			});
		});
	}
});
