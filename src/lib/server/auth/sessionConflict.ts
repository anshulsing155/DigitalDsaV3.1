/**
 * SEC-10 conflict detection — pure function.
 * ────────────────────────────────────────────────────────────────────────────
 * Given the active Sessions rows for a user and an incoming login attempt's
 * fingerprints, partition the existing rows into two action sets:
 *   - `modal_sessions` — rows that need user-visible kick resolution
 *     (different device or different browser on same device). The caller
 *     surfaces these in the SessionConflictModal.
 *   - `silent_session_ids` — rows that are the SAME browser as the incoming
 *     login (re-login on the same Chrome, for example). These are silently
 *     revoked server-side so Atlas doesn't accumulate ghost rows; no UX
 *     impact, because the user's cookie has already been rotated by the
 *     new login response.
 *
 * No DB access, no I/O — purely data in, verdict out. The caller
 * (evaluateLoginConflict in checkDsaConflictGate.ts) is responsible for
 * fetching the rows via Sessions.find(), revoking the silent ones via
 * Sessions.updateMany({...revoke_reason:'rotated_same_browser'}), and
 * returning the session_conflict response body when modal_sessions is
 * non-empty.
 *
 * Note: modal_sessions and silent_session_ids CAN BOTH be populated by the
 * same call — e.g. a user with a Windows-Chrome session (different device →
 * modal) plus an old Android-Chrome session (same browser as the incoming
 * Android-Chrome re-login → silent). The caller silent-revokes regardless of
 * whether modal handling fires.
 *
 * The 5-case matrix from spec §4:
 *
 *   ┌─────────────────────────────────────────────────────┬─────────┬───────┐
 *   │ Match conditions vs existing active session          │ Kind    │ Modal │
 *   ├─────────────────────────────────────────────────────┼─────────┼───────┤
 *   │ Same client_class + same device_fp + same           │ none    │ ✗     │
 *   │   browser_fp + same JWT cookie tokenId               │         │       │
 *   │ Same client_class + same device_fp + same           │ silent  │ ✗     │
 *   │   browser_fp + different cookie (same browser, tab2) │         │       │
 *   │ Same client_class + same device_fp + DIFFERENT      │ modal   │ ✓     │
 *   │   browser_fp (browser conflict)                      │         │       │
 *   │ DIFFERENT device_fp (same client_class)             │ modal   │ ✓     │
 *   │   (device conflict)                                  │         │       │
 *   │ Different client_class (web ↔ android)              │ none    │ ✗     │
 *   └─────────────────────────────────────────────────────┴─────────┴───────┘
 *
 * Defensive treatment of legacy / missing fingerprints:
 *   - device_fingerprint === 'legacy' (set by the SEC-10 backfill script)
 *     or absent: that row never produces a conflict against a fresh
 *     incoming fingerprint. Pre-SEC-10 sessions can't be reliably compared,
 *     so we default to "don't kick".
 *   - Same rule for browser_fingerprint and client_class.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §4
 * ADR : docs/adr/0028-single-session-enforcement.md
 */

import type { SessionDoc } from '$lib/types/session';

/**
 * Per-row classification used internally during aggregation. NOT exported —
 * callers consume the aggregated {@link ConflictReport} which already
 * partitions rows into modal vs silent action sets.
 */
type RowKind = 'none' | 'silent' | 'modal';
export type ConflictType = 'device' | 'browser';

export interface ExistingSessionDigest {
	/** Sessions.session_id — used by login-confirm to identify rows to revoke. */
	id: string;
	/** Human-readable label for the modal — "Chrome on Windows", "DigitalDSA Android app". */
	ua_summary: string;
	/** Whether this conflict is device-level or browser-level — drives the modal icon + copy. */
	conflict_type: ConflictType;
	/** ISO timestamp for "last active 2h ago" relative-time rendering. */
	last_seen_at: string;
}

/**
 * Aggregated verdict — two parallel action sets, both can be non-empty.
 *
 * Callers compute their own state-flag from array lengths:
 *   - `report.modal_sessions.length > 0` → show modal + emit conflict telemetry
 *   - `report.silent_session_ids.length > 0` → revoke those rows server-side
 *
 * The shape deliberately omits a `kind` discriminator because the two sets
 * are independent: a single login can produce a modal kick on one prior
 * session AND a silent rotation on another. A single-value discriminator
 * would either lose information or mislead callers into thinking one set
 * implies the other is empty.
 */
export interface ConflictReport {
	/**
	 * Sessions that need user-visible kick resolution. Surfaced in the
	 * SessionConflictModal with `conflict_type`-specific icon and copy.
	 * Empty when the incoming login matches no existing session at the
	 * device/browser level.
	 */
	modal_sessions: ExistingSessionDigest[];
	/**
	 * Sessions to silently revoke — same client_class + same device_fingerprint
	 * + same browser_fingerprint as the incoming login, but a different
	 * session_id. This is the re-login-on-same-browser case: the user's JWT
	 * cookie has just been rotated by the new login, so the old session_id
	 * is unreachable. Without an explicit revoke, the row would sit in
	 * Atlas with `revoked_at == null` forever — inflating analytics counts,
	 * polluting the user-facing active-sessions list, and creating ghost
	 * matches in future conflict-detection runs.
	 *
	 * The caller revokes these with `revoke_reason: 'rotated_same_browser'`
	 * via Sessions.updateMany. See the gate function for the exact write.
	 *
	 * Regression history: pre-2026-06-05 the detector returned a single
	 * `kind: 'silent'` verdict and the gate just `return { kind: 'proceed' }`'d
	 * without touching Atlas. The ghosts accumulated indefinitely. See
	 * Pitfall #77 + the screenshot evidence in S226's session handoff.
	 */
	silent_session_ids: string[];
}

export interface IncomingFingerprints {
	device_fingerprint?: string;
	browser_fingerprint?: string;
	client_class?: 'web' | 'android';
	/**
	 * The tokenId that will be issued for this new session. Used to
	 * disambiguate the same-tab case (which today shouldn't happen at
	 * check-dsa — we always mint a fresh tokenId — but the helper accepts
	 * it for completeness and matrix-test coverage).
	 */
	incoming_token_id?: string;
}

/**
 * Match an existing row against incoming fingerprints. Returns the per-row
 * classification used by the aggregation loop in {@link detectConflict}.
 *
 * - `'none'`   → row produces no signal (legacy / cross-class / same tab)
 * - `'silent'` → row is the same-browser predecessor that must be revoked
 *                server-side without user-visible UX
 * - `'modal'`  → row needs a user-confirmed kick via the session-conflict
 *                modal; `conflict_type` carries the modal's icon/copy hint
 */
function classifyRow(
	row: SessionDoc,
	incoming: IncomingFingerprints
): { kind: RowKind; conflict_type?: ConflictType } {
	// Default client_class for legacy rows — pre-MOB-1 only web existed.
	const rowClientClass = row.client_class ?? 'web';
	const incomingClientClass = incoming.client_class ?? 'web';

	// Different client_class → independent surfaces (spec §4 row 5).
	// Web and Capacitor android never conflict with each other.
	if (rowClientClass !== incomingClientClass) {
		return { kind: 'none' };
	}

	// Legacy treatment: if the row is missing fingerprint data or carries
	// the 'legacy' placeholder, we can't compare. Default to no conflict
	// so pre-SEC-10 sessions don't get kicked by fresh logins.
	const rowDevice = row.device_fingerprint;
	const rowBrowser = row.browser_fingerprint;
	if (!rowDevice || rowDevice === 'legacy' || !rowBrowser || rowBrowser === 'legacy') {
		return { kind: 'none' };
	}

	// Incoming fingerprints missing → caller didn't provide them. Same
	// defensive rule — we can't decide, so we don't kick. This is the
	// "client release hasn't shipped fingerprint computation yet" path
	// that runs during the early days of Commit B's soak.
	const incomingDevice = incoming.device_fingerprint;
	const incomingBrowser = incoming.browser_fingerprint;
	if (!incomingDevice || !incomingBrowser) {
		return { kind: 'none' };
	}

	// Different device → device conflict (spec §4 row 4).
	if (rowDevice !== incomingDevice) {
		return { kind: 'modal', conflict_type: 'device' };
	}

	// Same device, different browser → browser conflict (spec §4 row 3).
	if (rowBrowser !== incomingBrowser) {
		return { kind: 'modal', conflict_type: 'browser' };
	}

	// Same device + same browser + same tokenId → it's literally the same
	// tab. This shouldn't reach detectConflict at check-dsa (we mint a
	// fresh tokenId per call) but the helper handles it for completeness.
	if (incoming.incoming_token_id && row.session_id === incoming.incoming_token_id) {
		return { kind: 'none' };
	}

	// Same device + same browser + different tokenId → same browser
	// re-login (spec §4 row 2). The user's cookie has been rotated, so
	// the old session_id is unreachable. The caller silently revokes it
	// (revoke_reason: 'rotated_same_browser') so Atlas doesn't keep the
	// ghost row forever — surfacing the id here is what makes that
	// possible. NO user-visible UX impact.
	return { kind: 'silent' };
}

/**
 * Aggregate row-by-row classifications into a single {@link ConflictReport}.
 *
 * Aggregation is partitioning, not precedence:
 *   - Every 'modal'-producing row contributes to `modal_sessions` (so the
 *     modal can list multiple choices to kick).
 *   - Every 'silent'-producing row contributes to `silent_session_ids`
 *     (the caller revokes them server-side).
 *   - 'none' rows are dropped.
 *
 * Both sets can be non-empty at the same time — a user logging in on
 * Android Chrome with a prior Windows-Chrome session (modal/device) AND
 * an older Android-Chrome session (silent/same-browser) gets BOTH a
 * modal entry and a silent revoke target in a single call.
 */
export function detectConflict(
	existingSessions: SessionDoc[],
	incoming: IncomingFingerprints
): ConflictReport {
	const modal_sessions: ExistingSessionDigest[] = [];
	const silent_session_ids: string[] = [];

	for (const row of existingSessions) {
		const verdict = classifyRow(row, incoming);

		if (verdict.kind === 'modal' && verdict.conflict_type) {
			modal_sessions.push({
				id: row.session_id,
				ua_summary: row.device_label,
				conflict_type: verdict.conflict_type,
				last_seen_at: row.last_seen_at.toISOString()
			});
		} else if (verdict.kind === 'silent') {
			silent_session_ids.push(row.session_id);
		}
	}

	return { modal_sessions, silent_session_ids };
}
