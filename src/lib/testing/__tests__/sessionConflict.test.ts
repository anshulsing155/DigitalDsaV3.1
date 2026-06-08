/**
 * Unit test — SEC-10 conflict detection.
 *
 * Behavioral test (not a structural lock test). Exercises every row of the
 * 5-case matrix in spec §4 plus the aggregation rules from
 * src/lib/server/auth/sessionConflict.ts:
 *
 *   ┌─────────────────────────────────────────────────┬────────────────────────┐
 *   │ Match conditions                                 │ Per-row classification │
 *   ├─────────────────────────────────────────────────┼────────────────────────┤
 *   │ Same client_class + device + browser + cookie    │ drop (no-op)           │
 *   │ Same client_class + device + browser + new token │ silent_session_ids ++  │
 *   │ Same client_class + device + different browser   │ modal_sessions ++      │
 *   │ Same client_class + different device             │ modal_sessions ++      │
 *   │ Different client_class (web ↔ android)           │ drop (no-op)           │
 *   └─────────────────────────────────────────────────┴────────────────────────┘
 *
 *   Plus: empty input list, multiple rows distributed across both action
 *   sets, pre-SEC-10 'legacy' rows never producing a conflict, fresh-
 *   incoming missing fingerprints defaulting to no-conflict, and the
 *   "modal coexists with silent" case where one prior session is on a
 *   different device while another is the same browser as the incoming.
 *
 * 2026-06-05: refactored from single-`kind`-discriminator shape to parallel
 * `modal_sessions` + `silent_session_ids` arrays — see ConflictReport
 * JSDoc + Pitfall #77 for the regression that prompted the change.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §4
 */
import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
	detectConflict,
	type IncomingFingerprints
} from '$lib/server/auth/sessionConflict';
import type { SessionDoc } from '$lib/types/session';

// ── Test fixtures ──────────────────────────────────────────────────────

const NOW = new Date('2026-06-04T10:00:00Z');
const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);
const HEX_D = 'd'.repeat(64);

/**
 * Build a SessionDoc with sensible defaults. Pass overrides for the
 * field(s) the test cares about — keeps test bodies focused on the
 * specific conflict-matrix dimension being exercised.
 */
function makeRow(overrides: Partial<SessionDoc> = {}): SessionDoc {
	return {
		session_id: 'existing-token-id',
		user_id: new ObjectId(),
		user_role: 'dsa',
		user_agent: 'Mozilla/5.0',
		device_label: 'Chrome on Windows',
		ip_country: 'IN',
		ip_country_region: 'MH',
		ip_city: 'Mumbai',
		created_at: NOW,
		last_seen_at: NOW,
		device_fingerprint: HEX_A,
		browser_fingerprint: HEX_B,
		client_class: 'web',
		...overrides
	};
}

/**
 * Fresh-login fingerprints — by default match the makeRow() defaults so
 * tests can override only the dimension being exercised.
 */
function makeIncoming(overrides: Partial<IncomingFingerprints> = {}): IncomingFingerprints {
	return {
		device_fingerprint: HEX_A,
		browser_fingerprint: HEX_B,
		client_class: 'web',
		incoming_token_id: 'new-token-id',
		...overrides
	};
}

// ── 5-case matrix ──────────────────────────────────────────────────────

describe('detectConflict — 5-case matrix from spec §4', () => {
	it('Row 1: same client_class + device + browser + same cookie → drop (no-op)', () => {
		// Edge case for completeness — at check-dsa we always mint a fresh
		// tokenId so this shouldn't fire in practice, but the helper handles
		// it (incoming_token_id === existing session_id).
		const row = makeRow({ session_id: 'shared-token-id' });
		const incoming = makeIncoming({ incoming_token_id: 'shared-token-id' });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('Row 2: same client_class + device + browser + DIFFERENT cookie → silent_session_ids', () => {
		// Same browser re-login. Old session_id is recorded for silent
		// revoke — the user never sees this, but the row gets cleaned up.
		const row = makeRow({ session_id: 'tab-1-token' });
		const incoming = makeIncoming({ incoming_token_id: 'tab-2-token' });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual(['tab-1-token']);
	});

	it('Row 3: same client_class + same device + DIFFERENT browser → modal (browser conflict)', () => {
		// User started in Chrome (HEX_B), now logging in via Firefox (HEX_C).
		const row = makeRow({ browser_fingerprint: HEX_B });
		const incoming = makeIncoming({ browser_fingerprint: HEX_C });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toHaveLength(1);
		expect(result.modal_sessions[0].conflict_type).toBe('browser');
		expect(result.modal_sessions[0].id).toBe('existing-token-id');
		expect(result.silent_session_ids).toEqual([]);
	});

	it('Row 4: same client_class + DIFFERENT device → modal (device conflict)', () => {
		// Different device entirely — different platform/timezone/screen.
		const row = makeRow({ device_fingerprint: HEX_A });
		const incoming = makeIncoming({ device_fingerprint: HEX_D });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toHaveLength(1);
		expect(result.modal_sessions[0].conflict_type).toBe('device');
		expect(result.silent_session_ids).toEqual([]);
	});

	it('Row 5: DIFFERENT client_class (web ↔ android) → drop (no-op)', () => {
		// Capacitor app and web are independent surfaces by design.
		// User can have a web session AND an android session concurrently.
		const row = makeRow({ client_class: 'web' });
		const incoming = makeIncoming({ client_class: 'android' });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('Row 5 (reverse): android existing + web incoming → drop (no-op)', () => {
		const row = makeRow({ client_class: 'android' });
		const incoming = makeIncoming({ client_class: 'web' });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});
});

// ── Legacy / missing fingerprint treatment ─────────────────────────────

describe('detectConflict — pre-SEC-10 rows never produce conflicts', () => {
	it("row with device_fingerprint === 'legacy' is skipped (no conflict)", () => {
		// The SEC-10 backfill script writes 'legacy' on pre-SEC-10 rows
		// to distinguish them from "client failed to send" — but behavior
		// is identical: legacy rows never kick a fresh login and never
		// land in silent_session_ids (we can't compare fingerprints, so
		// we can't prove "same browser").
		const row = makeRow({ device_fingerprint: 'legacy', browser_fingerprint: 'legacy' });
		const incoming = makeIncoming({ device_fingerprint: HEX_C, browser_fingerprint: HEX_D });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('row missing device_fingerprint entirely is skipped', () => {
		// Edge case: a row written before the backfill ran. Behavior
		// matches 'legacy' — defensive, no kick, no silent revoke.
		const row = makeRow();
		delete row.device_fingerprint;
		delete row.browser_fingerprint;
		const incoming = makeIncoming();
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('incoming login with NO fingerprints → no conflict regardless of row state', () => {
		// "Client release hasn't shipped fingerprint computation yet" path.
		// Runs during early Commit B soak before client-side helper ships.
		const row = makeRow();
		const incoming: IncomingFingerprints = {
			client_class: 'web',
			incoming_token_id: 'new-token'
		};
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('legacy row with client_class missing defaults to web (still no conflict)', () => {
		// client_class on legacy rows defaults to 'web' (matching the only
		// surface that existed pre-MOB-1). With legacy fingerprints
		// triggering the "can't decide" short-circuit, both arrays are empty.
		const row = makeRow({ device_fingerprint: 'legacy' });
		delete row.client_class;
		const incoming = makeIncoming();
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});
});

// ── Aggregation across multiple rows ───────────────────────────────────

describe('detectConflict — aggregation across multiple rows', () => {
	it('empty list → both action sets empty', () => {
		const result = detectConflict([], makeIncoming());
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('multiple modal-producing rows → all returned in modal_sessions', () => {
		// User has 2 prior sessions, both on different devices. The modal
		// should list both so the user can choose which (or both) to kick.
		const row1 = makeRow({ session_id: 'sess-1', device_fingerprint: HEX_A });
		const row2 = makeRow({ session_id: 'sess-2', device_fingerprint: HEX_B });
		const incoming = makeIncoming({ device_fingerprint: HEX_D });
		const result = detectConflict([row1, row2], incoming);
		expect(result.modal_sessions).toHaveLength(2);
		expect(result.modal_sessions.map((s) => s.id).sort()).toEqual(['sess-1', 'sess-2']);
		expect(result.silent_session_ids).toEqual([]);
	});

	it('mix of legacy + modal rows → only modal rows surface', () => {
		// Legacy rows are silently ignored. The modal lists the fresh
		// conflict — keeps the UX clean (no "Unknown device" entries).
		const legacy = makeRow({ session_id: 'legacy-sess', device_fingerprint: 'legacy' });
		const fresh = makeRow({ session_id: 'fresh-sess', device_fingerprint: HEX_A });
		const incoming = makeIncoming({ device_fingerprint: HEX_D });
		const result = detectConflict([legacy, fresh], incoming);
		expect(result.modal_sessions).toHaveLength(1);
		expect(result.modal_sessions[0].id).toBe('fresh-sess');
		expect(result.silent_session_ids).toEqual([]);
	});

	it('modal AND silent coexist — both action sets populated in a single call', () => {
		// User has TWO prior sessions:
		//   - Windows-Chrome (different device from incoming Android)  → modal
		//   - older Android-Chrome (same browser as incoming)          → silent
		// Pre-2026-06-05 the silent row was dropped entirely; now it's
		// surfaced so the gate can revoke it server-side. This is the
		// regression test for Pitfall #77.
		const silentRow = makeRow({
			session_id: 'silent-sess',
			device_fingerprint: HEX_A,
			browser_fingerprint: HEX_B
		});
		const modalRow = makeRow({
			session_id: 'modal-sess',
			device_fingerprint: HEX_C // different device from incoming
		});
		const incoming = makeIncoming({ device_fingerprint: HEX_A, browser_fingerprint: HEX_B });
		// silentRow matches incoming on device + browser exactly → silent.
		// modalRow differs on device from incoming → modal.
		const result = detectConflict([silentRow, modalRow], incoming);
		expect(result.modal_sessions).toHaveLength(1);
		expect(result.modal_sessions[0].id).toBe('modal-sess');
		expect(result.silent_session_ids).toEqual(['silent-sess']);
	});

	it('multiple silent rows accumulate in silent_session_ids', () => {
		// Pathological-but-possible: user has logged in 3× on the same
		// browser without a server-side revoke between attempts (the
		// pre-fix state of the world). The new login should revoke ALL
		// of the predecessors in one updateMany.
		const ghost1 = makeRow({ session_id: 'ghost-1' });
		const ghost2 = makeRow({ session_id: 'ghost-2' });
		const ghost3 = makeRow({ session_id: 'ghost-3' });
		const incoming = makeIncoming({ incoming_token_id: 'fresh-id' });
		const result = detectConflict([ghost1, ghost2, ghost3], incoming);
		expect(result.modal_sessions).toEqual([]);
		expect(result.silent_session_ids.sort()).toEqual(['ghost-1', 'ghost-2', 'ghost-3']);
	});

	it('one device-conflict + one browser-conflict → both surface with correct types', () => {
		// The modal shows distinct icons per conflict_type, so we want
		// both signal types in the modal_sessions list.
		const deviceConflict = makeRow({
			session_id: 'device-sess',
			device_fingerprint: HEX_A
		});
		const browserConflict = makeRow({
			session_id: 'browser-sess',
			device_fingerprint: HEX_D, // matches incoming device
			browser_fingerprint: HEX_C // differs from incoming browser
		});
		const incoming = makeIncoming({
			device_fingerprint: HEX_D, // differs from deviceConflict's HEX_A
			browser_fingerprint: HEX_B
		});
		const result = detectConflict([deviceConflict, browserConflict], incoming);
		expect(result.modal_sessions).toHaveLength(2);
		const byId = Object.fromEntries(result.modal_sessions.map((s) => [s.id, s.conflict_type]));
		expect(byId['device-sess']).toBe('device');
		expect(byId['browser-sess']).toBe('browser');
		expect(result.silent_session_ids).toEqual([]);
	});
});

// ── Digest field plumbing ──────────────────────────────────────────────

describe('detectConflict — digest field plumbing', () => {
	it('modal_sessions entries carry ua_summary from row.device_label', () => {
		// The modal shows "Chrome on Windows" / "DigitalDSA Android app",
		// pulled from device_label (which parseDeviceLabel produces from UA).
		const row = makeRow({ device_label: 'Firefox on Mac', device_fingerprint: HEX_A });
		const incoming = makeIncoming({ device_fingerprint: HEX_C });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions[0].ua_summary).toBe('Firefox on Mac');
	});

	it('modal_sessions entries carry last_seen_at as ISO string', () => {
		// The modal renders "Last active 2h ago" via relative-time from this.
		const seenAt = new Date('2026-06-04T08:00:00Z');
		const row = makeRow({ last_seen_at: seenAt, device_fingerprint: HEX_A });
		const incoming = makeIncoming({ device_fingerprint: HEX_C });
		const result = detectConflict([row], incoming);
		expect(result.modal_sessions[0].last_seen_at).toBe('2026-06-04T08:00:00.000Z');
	});
});
