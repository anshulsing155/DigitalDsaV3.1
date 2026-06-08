/**
 * Session-status poller (SEC-10 Commit C, evolved S229)
 * ══════════════════════════════════════════════════════════════════════
 * Client-side composable that polls /api/auth/session-status and surfaces
 * a "you've been kicked" toast when the endpoint returns 401.
 *
 * Two architectural layers (S229 evolution per ADR-0033):
 *
 *   1. ADAPTIVE POLLING CADENCE (visibility + age-aware):
 *      - First 2 minutes after start  → 3s   (owner direction: kick
 *        the other device IMMEDIATELY during the post-login window
 *        when cross-device conflicts actually happen).
 *      - After 2 minutes, focused tab → 5s   (industry-standard
 *        active-but-idle heartbeat cadence).
 *      - After 2 minutes, hidden tab  → 20s  (user can't see the
 *        kicked-toast anyway until they return; visibilitychange
 *        listener fires an immediate poll on return so the user never
 *        waits the full 20s after refocusing).
 *      - visibilitychange + focus events → immediate poll.
 *
 *   2. BROADCASTCHANNEL LEADER ELECTION (cross-tab dedup):
 *      - Multiple tabs of the same browser elect ONE leader to poll
 *        via lowest-tabId-wins protocol.
 *      - Leader broadcasts revoke events to followers via BroadcastChannel.
 *      - Followers receive instant notification with zero server cost.
 *      - If leader closes / crashes, followers re-elect within
 *        LEADER_HEARTBEAT_TIMEOUT_MS.
 *
 * Combined effect: ~80-95% reduction in polling traffic vs the previous
 * 3s-flat-per-tab design, while PRESERVING owner's "kick immediately"
 * UX for the post-login window AND making the kicked-notification
 * faster for power users with multiple tabs.
 *
 * The HOOK-LEVEL revoke check in hooks.server.ts remains the security
 * boundary — active users are kicked instantly on next request via the
 * Sessions.isSessionRevoked check. This poller is purely UX for the
 * idle-tab case. (Per ADR-0033 — middleware is security; polling is UX.)
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §6.2
 * ADR : docs/adr/0028-single-session-enforcement.md (original SEC-10)
 * ADR : docs/adr/0033-adaptive-poll-leader-election.md (S229 evolution)
 * ══════════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';
import { stopTokenRefreshScheduler } from '$lib/utils/csrf';

/** Initial poll cadence (first INITIAL_POLL_WINDOW_MS after start).
 *  Owner direction from 2026-06-04: "kick the other device IMMEDIATELY"
 *  UX. This is the window where cross-device login conflicts actually
 *  happen — a user who logs in elsewhere typically does so within
 *  seconds-to-minutes of opening the new device. Past 2 minutes,
 *  conflicts are rare and longer intervals are appropriate. */
export const SESSION_POLL_MS = 3000;

/** How long after start to maintain the aggressive 3s cadence before
 *  relaxing to the adaptive (focused/hidden) intervals. 2 minutes covers
 *  the post-login window where cross-device conflicts cluster. */
export const INITIAL_POLL_WINDOW_MS = 120_000;

/** Poll cadence for focused (visible) tabs after the initial window
 *  expires. Aligns with industry-standard "active-but-idle" heartbeat
 *  patterns (5-10s range). 5s keeps the kicked-modal feeling responsive
 *  without burning the 3s rate on a quiet tab. */
export const FOCUSED_POLL_MS = 5000;

/** Poll cadence for hidden (background) tabs. Aggressive throttle since
 *  the user can't see the kicked-toast anyway until they return to the
 *  tab — and the visibilitychange listener fires an immediate poll on
 *  return, so the user never waits the full 20s after refocusing. */
export const HIDDEN_POLL_MS = 20_000;

/** Default delay before redirect after the modal appears. 5 seconds
 *  per owner ask 2026-06-05 — long enough that the user clearly reads
 *  "you have logged in on another device" before being bounced home. */
export const KICKED_REDIRECT_DELAY_MS = 5000;

/** Channel name for cross-tab BroadcastChannel coordination. Single
 *  constant so the leader-election protocol and the kick-event broadcast
 *  share the same channel. Per ADR-0033. */
const BROADCAST_CHANNEL_NAME = 'digitaldsa.session-poller';

/** How long a follower waits without hearing a leader heartbeat before
 *  re-electing. Set to ~1.5× the slowest poll interval (20s hidden +
 *  10s grace) so a hidden leader isn't false-positive-killed. */
const LEADER_HEARTBEAT_TIMEOUT_MS = 30_000;

/** How long the initial leader-election quiet period lasts on start().
 *  If we don't hear from an existing leader within this window, we
 *  claim leadership. 100ms is plenty for same-machine cross-tab
 *  BroadcastChannel latency (sub-ms in practice). */
const LEADER_ELECTION_QUIET_MS = 100;

/** Module-level "this tab has been kicked" flag. Set by tick() when the
 *  server returns 401 from /api/auth/session-status (or by a BroadcastChannel
 *  message from a leader peer in another tab). Read by `secureFetch`
 *  (csrf.ts) to short-circuit any in-flight background fetches with a
 *  synthetic 401 — without that, the 5-second display window between
 *  kick-detected and redirect would surface a flood of "401 Unauthorized"
 *  console errors from stale TanStack queries / setInterval callers / etc.
 *
 *  Lives at module scope (not on $state) so it's reachable from a plain
 *  function context without a Svelte component wrapper. The redirect
 *  resets the page, so no manual cleanup needed.
 */
let _isKicked = false;

/** True once this tab's session has been detected as revoked. Used by
 *  secureFetch to silently no-op outbound requests until redirect. */
export function isSessionKicked(): boolean {
	return _isKicked;
}

export interface SessionStatusPollerState {
	/** When non-null, the kicked-toast should render with these args. */
	kicked: null | {
		reason: 'kicked_by_new_login' | 'account_closed' | 'logout';
		at?: string;
	};
}

/**
 * BroadcastChannel message envelope. Discriminated union — switch on
 * `type` at the receiver. All fields optional past `type` so a malformed
 * message doesn't crash the receiver.
 */
type BroadcastMsg =
	| { type: 'claim'; tabId: string; t: number }
	| { type: 'heartbeat'; tabId: string; t: number }
	| {
			type: 'revoked';
			reason: 'kicked_by_new_login' | 'account_closed' | 'logout';
			at?: string;
	  };

/**
 * Construct a poller. Returns:
 *   - `state` — reactive Svelte 5 $state holding the current kick payload
 *     (null when not kicked; consumer renders the toast when non-null).
 *   - `start()` — begin polling. Idempotent.
 *   - `stop()` — clear timer + close BroadcastChannel. Idempotent.
 *
 * Network errors are silent no-ops: only an explicit 401 with a `revoked`
 * payload triggers the kick UX. This guards against false positives from
 * transient Mongo/Vercel blips that would otherwise log every user out on
 * a flap.
 */
export function createSessionStatusPoller(opts?: {
	/** Override the initial poll cadence (mainly for tests). */
	pollMs?: number;
	/** Override the post-toast redirect delay (mainly for tests). */
	redirectDelayMs?: number;
	/** Where to send the user after the toast. Defaults to the public
	 *  home page with a query-param tag so the marketing page can
	 *  later render a "you were signed out elsewhere" banner. */
	redirectTo?: string;
}) {
	const initialPollMs = opts?.pollMs ?? SESSION_POLL_MS;
	const redirectDelayMs = opts?.redirectDelayMs ?? KICKED_REDIRECT_DELAY_MS;
	const redirectTo = opts?.redirectTo ?? '/?reason=kicked';

	const state: SessionStatusPollerState = $state({ kicked: null });

	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let visibilityListener: (() => void) | null = null;
	let focusListener: (() => void) | null = null;
	let redirecting = false;
	let startedAt = 0;

	// ── Cross-tab coordination state ────────────────────────────────────
	let channel: BroadcastChannel | null = null;
	// Stable per-tab identifier. Lowest tabId wins leadership.
	// crypto.randomUUID is widely available; fall back if absent
	// (very old browsers — would also have failed BroadcastChannel below).
	const tabId =
		typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let isLeader = false;
	let lastLeaderHeartbeat = 0;
	let knownLeaderTabId: string | null = null;

	/**
	 * True if we're still inside the initial post-start window where
	 * cross-device conflicts cluster and the 3s cadence applies.
	 */
	function isInInitialWindow(): boolean {
		return Date.now() - startedAt < INITIAL_POLL_WINDOW_MS;
	}

	/**
	 * Decide the next interval based on (a) initial-window status and
	 * (b) tab visibility. Called by scheduleNext() so the interval can
	 * shift mid-session as the user backgrounds/refocuses the tab.
	 */
	function nextPollInterval(): number {
		if (isInInitialWindow()) return initialPollMs;
		if (!browser) return initialPollMs;
		if (document.visibilityState === 'visible') return FOCUSED_POLL_MS;
		return HIDDEN_POLL_MS;
	}

	async function tick() {
		if (!browser) return;
		if (redirecting) return;

		// Re-election: if we're not leader and haven't heard from one
		// in LEADER_HEARTBEAT_TIMEOUT_MS, claim leadership.
		if (
			!isLeader &&
			channel !== null &&
			Date.now() - lastLeaderHeartbeat > LEADER_HEARTBEAT_TIMEOUT_MS
		) {
			electLeader();
		}

		// Non-leader tabs don't poll the server — they wait for the
		// leader's broadcast. Schedule the next re-election check.
		if (!isLeader) {
			return scheduleNext();
		}

		// Skip the actual fetch if the tab is hidden during the initial
		// window — user just logged in and isn't watching this tab.
		// The hidden-tab interval (20s) takes over after the initial
		// window expires; this branch only fires during the first 2 min.
		if (
			document.visibilityState !== 'visible' &&
			isInInitialWindow()
		) {
			// Still broadcast heartbeat so followers know we're alive.
			channel?.postMessage({ type: 'heartbeat', tabId, t: Date.now() });
			return scheduleNext();
		}

		try {
			const res = await fetch('/api/auth/session-status', {
				method: 'GET',
				credentials: 'same-origin'
			});

			// Heartbeat regardless of outcome — followers track our liveness.
			channel?.postMessage({ type: 'heartbeat', tabId, t: Date.now() });

			if (res.status !== 401) return scheduleNext();
			const body = (await res.json().catch(() => null)) as {
				revoked?: { reason?: string; at?: string };
			} | null;
			const reason = body?.revoked?.reason;
			if (
				reason !== 'kicked_by_new_login' &&
				reason !== 'account_closed' &&
				reason !== 'logout'
			) {
				return scheduleNext();
			}
			handleKick({ reason, at: body?.revoked?.at });
			// Broadcast the kick so other tabs of the same browser see it
			// instantly without waiting for their next re-election timeout.
			channel?.postMessage({ type: 'revoked', reason, at: body?.revoked?.at });
		} catch {
			// Network blip — no-op. The next tick will retry.
			scheduleNext();
		}
	}

	function scheduleNext() {
		if (timeoutId !== null) clearTimeout(timeoutId);
		if (redirecting) return;
		timeoutId = setTimeout(tick, nextPollInterval());
	}

	function handleKick(payload: {
		reason: 'kicked_by_new_login' | 'account_closed' | 'logout';
		at?: string;
	}) {
		if (redirecting) return; // idempotent
		state.kicked = payload;
		redirecting = true;

		// Hard-stop background work so the 5-second display window
		// stays radio-silent in the browser console:
		//   1. Flip the kicked flag so secureFetch short-circuits any
		//      outbound API request with a synthetic 401 (no network,
		//      no log).
		//   2. Cancel the proactive JWT refresh scheduler — without
		//      this it would fire ~2 min into the kicked state, hit
		//      a now-revoked refresh-token endpoint, and log noise.
		_isKicked = true;
		stopTokenRefreshScheduler();

		setTimeout(() => {
			if (browser) window.location.href = redirectTo;
		}, redirectDelayMs);
	}

	/**
	 * Handle a message from another tab via BroadcastChannel.
	 * Discriminated union on `type`; defensive null-checks throughout
	 * so a malformed payload from a buggy future version doesn't crash.
	 */
	function onBroadcast(msg: BroadcastMsg) {
		if (!msg || typeof msg !== 'object') return;
		switch (msg.type) {
			case 'claim': {
				// Another tab is claiming leader. If their tabId is lower,
				// they win — we step down. If ours is lower, we stay leader
				// and they'll see OUR heartbeat next and back off.
				if (typeof msg.tabId === 'string' && msg.tabId < tabId) {
					isLeader = false;
					knownLeaderTabId = msg.tabId;
					lastLeaderHeartbeat = Date.now();
				}
				break;
			}
			case 'heartbeat': {
				// Leader is alive. Track its tabId + time. If a different
				// leader's tabId is lower than ours, defer to them.
				if (typeof msg.tabId !== 'string') break;
				if (knownLeaderTabId === null || msg.tabId <= knownLeaderTabId) {
					knownLeaderTabId = msg.tabId;
					lastLeaderHeartbeat = typeof msg.t === 'number' ? msg.t : Date.now();
					if (msg.tabId !== tabId) isLeader = false;
				}
				break;
			}
			case 'revoked': {
				// Leader detected a revoke; this tab is part of the same
				// session and should kick too (the cookies are shared
				// across same-browser tabs).
				if (
					msg.reason === 'kicked_by_new_login' ||
					msg.reason === 'account_closed' ||
					msg.reason === 'logout'
				) {
					handleKick({ reason: msg.reason, at: msg.at });
				}
				break;
			}
		}
	}

	/**
	 * Claim leadership. If a lower-tabId tab is alive, it will reject
	 * via its own 'claim' / 'heartbeat' messages and we'll defer back
	 * to follower role via onBroadcast.
	 */
	function electLeader() {
		isLeader = true;
		knownLeaderTabId = tabId;
		lastLeaderHeartbeat = Date.now();
		channel?.postMessage({ type: 'claim', tabId, t: Date.now() });
	}

	function start() {
		if (!browser) return;
		if (timeoutId !== null) return;
		startedAt = Date.now();

		// Open BroadcastChannel + start leader election.
		try {
			channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
			channel.onmessage = (e) => onBroadcast(e.data as BroadcastMsg);
			// Wait briefly for any existing leader's heartbeat before
			// claiming ourselves. If LEADER_ELECTION_QUIET_MS passes with
			// no heartbeat seen, we claim. Cross-tab BroadcastChannel
			// latency is sub-millisecond in practice; 100ms is generous.
			setTimeout(() => {
				if (lastLeaderHeartbeat === 0 || Date.now() - lastLeaderHeartbeat > 1000) {
					electLeader();
				}
				// Either way, schedule the first tick now.
				scheduleNext();
				// Fire one immediate poll on start (if we ended up leader).
				if (isLeader) void tick();
			}, LEADER_ELECTION_QUIET_MS);
		} catch {
			// BroadcastChannel not supported (very old browser) — fall
			// back to per-tab polling. We become leader by default since
			// there's no coordination mechanism.
			isLeader = true;
			channel = null;
			scheduleNext();
			void tick();
		}

		// Visibility-aware: re-poll immediately when tab becomes visible.
		// scheduleNext() reads the current visibility to pick the right
		// interval, so a hidden→visible transition automatically tightens
		// the cadence (e.g. 20s → 5s after the initial window).
		visibilityListener = () => {
			if (redirecting) return;
			if (document.visibilityState === 'visible' && isLeader) {
				void tick();
			} else {
				scheduleNext();
			}
		};
		focusListener = () => {
			if (redirecting) return;
			if (isLeader) void tick();
		};
		document.addEventListener('visibilitychange', visibilityListener);
		window.addEventListener('focus', focusListener);
	}

	function stop() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (visibilityListener) {
			document.removeEventListener('visibilitychange', visibilityListener);
			visibilityListener = null;
		}
		if (focusListener) {
			window.removeEventListener('focus', focusListener);
			focusListener = null;
		}
		if (channel) {
			try {
				channel.close();
			} catch {
				/* defensive — channel.close() may throw on some browsers */
			}
			channel = null;
		}
		isLeader = false;
		knownLeaderTabId = null;
		lastLeaderHeartbeat = 0;
	}

	return { state, start, stop };
}
