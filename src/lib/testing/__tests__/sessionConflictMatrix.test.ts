/**
 * Lock test — SEC-10 Commit B end-to-end wiring.
 *
 * The spec § 9 Commit B names this test `sessionConflictMatrix.test.ts`,
 * but the 5-case detection matrix is already exhaustively covered behaviorally
 * by sessionConflict.test.ts (the pure-helper unit test from B.1). What this
 * file locks is the STRUCTURAL contract — the seams across modal +
 * login page + login-confirm endpoint that have to stay in lockstep for
 * the feature to work end-to-end.
 *
 * Guards (read-only string assertions, no behavior):
 *   - login page imports buildFingerprints + SessionConflictModal +
 *     ExistingSessionDigest
 *   - login page forwards deviceFingerprint / browserFingerprint /
 *     clientClass into the check-dsa request body
 *   - login page recognises the `status === 'session_conflict'` response
 *     shape and stores pending_login_token + existing_sessions
 *   - login page POSTs /api/auth/login-confirm with the canonical
 *     { pending_login_token, kick_session_ids } shape
 *   - SessionConflictModal exposes the canonical 4-prop contract
 *     (open / existingSessions / onConfirm / onCancel) + busy
 *   - login-confirm endpoint reads the canonical request shape, marks
 *     Sessions rows with revoke_reason='kicked_by_new_login', and uses
 *     recordSession for the new row
 *
 * If a refactor breaks any of these seams (renames a prop, drops the
 * `status` discriminator, etc.), this test trips before users see broken
 * conflict resolution in production.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §5 + §7.1 + §9 Commit B
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOGIN_PAGE_PATH = resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte');
const MODAL_PATH = resolve(process.cwd(), 'src/lib/components/SessionConflictModal.svelte');
const LOGIN_CONFIRM_PATH = resolve(
	process.cwd(),
	'src/routes/api/auth/login-confirm/+server.ts'
);

describe('SEC-10 B.7 — login page wiring to fingerprints + conflict flow', () => {
	const src = readFileSync(LOGIN_PAGE_PATH, 'utf8');

	it('imports buildFingerprints from the client fingerprint helper', () => {
		expect(src).toMatch(/import\s*\{\s*buildFingerprints\s*\}\s*from\s*['"]\$lib\/utils\/sessionFingerprint['"]/);
	});

	it('imports SessionConflictModal and its existing-session type', () => {
		expect(src).toMatch(/import\s+SessionConflictModal\s+from\s+['"]\$lib\/components\/SessionConflictModal\.svelte['"]/);
		expect(src).toMatch(/import\s+type\s*\{\s*ExistingSessionDigest\s*\}\s*from/);
	});

	it('forwards deviceFingerprint, browserFingerprint, clientClass into check-dsa body', () => {
		// Catches a refactor that drops one of the three keys silently —
		// detection on the server falls back to "no incoming fingerprint
		// → never conflicts" so the bug would be invisible without this.
		expect(src).toMatch(/deviceFingerprint:\s*fingerprints\.device/);
		expect(src).toMatch(/browserFingerprint:\s*fingerprints\.browser/);
		expect(src).toMatch(/clientClass:\s*fingerprints\.clientClass/);
	});

	it("recognises the 'session_conflict' discriminator + stores pending_login_token", () => {
		expect(src).toMatch(/status\s*===\s*['"]session_conflict['"]/);
		expect(src).toMatch(/pendingLoginToken\s*=\s*checkData\.pending_login_token/);
		expect(src).toMatch(/conflictExistingSessions\s*=\s*checkData\.existing_sessions/);
	});

	it('POSTs to /api/auth/login-confirm with the canonical body shape', () => {
		// pending_login_token + kick_session_ids — the contract verifyPending
		// LoginToken + login-confirm Zod schema expect.
		expect(src).toMatch(/\/api\/auth\/login-confirm/);
		expect(src).toMatch(/pending_login_token:\s*pendingLoginToken/);
		expect(src).toMatch(/kick_session_ids:\s*kickSessionIds/);
	});

	it('renders <SessionConflictModal> with the 5-prop contract', () => {
		expect(src).toMatch(/<SessionConflictModal\b[\s\S]*?open=\{sessionConflictOpen\}/);
		expect(src).toMatch(/existingSessions=\{conflictExistingSessions\}/);
		expect(src).toMatch(/onConfirm=\{handleSessionConflictConfirm\}/);
		expect(src).toMatch(/onCancel=\{handleSessionConflictCancel\}/);
		expect(src).toMatch(/busy=\{confirmInFlight\}/);
	});

	it('applies a single shared post-success navigation helper (applyLoginSuccess)', () => {
		// Asserts the duplicated-paths cleanup: both the no-conflict check-dsa
		// success path AND login-confirm success path route through one helper.
		// Catches a future "let's inline this back" refactor.
		const occurrences = (src.match(/await\s+applyLoginSuccess\(/g) ?? []).length;
		expect(occurrences).toBeGreaterThanOrEqual(2);
	});
});

describe('SEC-10 B.6 — SessionConflictModal canonical contract', () => {
	const src = readFileSync(MODAL_PATH, 'utf8');

	it('Props interface declares the 5-prop contract', () => {
		expect(src).toMatch(/open:\s*boolean/);
		expect(src).toMatch(/existingSessions:\s*ExistingSessionDigest\[\]/);
		expect(src).toMatch(/onConfirm:\s*\(kickSessionIds:\s*string\[\]\)\s*=>\s*void/);
		expect(src).toMatch(/onCancel:\s*\(\)\s*=>\s*void/);
		expect(src).toMatch(/busy\?:\s*boolean/);
	});

	it('uses <dialog> element with role=alertdialog + aria-modal', () => {
		// A future refactor to a div-based modal would break focus
		// trapping + keyboard a11y. Lock the <dialog> contract.
		expect(src).toMatch(/<dialog\b/);
		expect(src).toMatch(/role="alertdialog"/);
		expect(src).toMatch(/aria-modal="true"/);
	});

	it('renders Laptop icon for device conflict + Globe for browser', () => {
		// Conflict-type icon distinction is the user's primary visual
		// signal — losing it would make device vs browser conflicts
		// indistinguishable in the modal.
		expect(src).toMatch(/session\.conflict_type\s*===\s*['"]device['"]/);
		expect(src).toMatch(/<Laptop\b/);
		expect(src).toMatch(/<Globe\b/);
	});

	it('selection defaults to "all checked" via $effect on existingSessions', () => {
		// User most often wants to kick all others — defaulting unchecked
		// would force an extra click on every conflict resolution.
		expect(src).toMatch(/next\[s\.id\]\s*=\s*true/);
	});
});

describe('SEC-10 B.5 — login-confirm endpoint canonical contract', () => {
	const src = readFileSync(LOGIN_CONFIRM_PATH, 'utf8');

	it('accepts pending_login_token + kick_session_ids in request body schema', () => {
		expect(src).toMatch(/pending_login_token:\s*z\.string\(\)/);
		expect(src).toMatch(/kick_session_ids:\s*z\.array\(z\.string\(\)\)/);
	});

	it("revokes Sessions rows with revoke_reason='kicked_by_new_login'", () => {
		// The discriminator value used by the admin dashboard + audit log.
		// Renaming it would silently break operator visibility.
		expect(src).toMatch(/revoke_reason:\s*['"]kicked_by_new_login['"]/);
	});

	it('uses recordSession() for the new Sessions row + forwards fingerprints from token', () => {
		expect(src).toMatch(/await\s+recordSession\(\{/);
		expect(src).toMatch(/device_fingerprint:\s*token\.incomingFingerprints\.device_fingerprint/);
		expect(src).toMatch(/browser_fingerprint:\s*token\.incomingFingerprints\.browser_fingerprint/);
		expect(src).toMatch(/client_class:\s*token\.incomingFingerprints\.client_class/);
	});

	it('validates kick_session_ids ⊆ kickEligibleSessionIds', () => {
		// Defends against a stolen pending token being used to revoke
		// sessions outside the modal's presented choices.
		expect(src).toMatch(/invalidKickIds/);
		expect(src).toMatch(/eligibleSet/);
	});

	it('rate-limits per IP via the standard rateLimit helper', () => {
		expect(src).toMatch(/rateLimit\(getClientAddress\(\)/);
		expect(src).toMatch(/auth-login-confirm:/);
	});

	it('preserves surviving sessions via $pull + $push (NOT a full activeTokenIds reset)', () => {
		// Audit fix — the earlier implementation `activeTokenIds:[tokenId]`
		// silently kicked sessions the user explicitly chose to keep
		// (unticked in the modal). The two-call pattern $pull-kicked-then-
		// $push-new is the contract that preserves partial-kick intent.
		// If a refactor goes back to the simpler reset, the user's choice
		// is silently overridden.
		expect(src).toMatch(/\$pull:\s*\{\s*activeTokenIds:\s*\{\s*\$in:\s*kick_session_ids\s*\}/);
		expect(src).toMatch(/\$push:\s*\{\s*activeTokenIds:\s*\{\s*\$each:\s*\[token\.tokenId\]/);
		expect(src).toMatch(/\$slice:\s*-10/);
		// The deprecated full-reset pattern must NOT reappear.
		expect(src).not.toMatch(/activeTokenIds:\s*\[\s*token\.tokenId\s*\]/);
	});
});

describe('SEC-10 audit fix — CSRF skip for login-confirm', () => {
	const src = readFileSync(
		resolve(process.cwd(), 'src/hooks.server.ts'),
		'utf8'
	);

	it("publicEndpoints includes '/api/auth/login-confirm'", () => {
		// Without this entry, hooks.server.ts validateCSRF would 403 every
		// modal-confirm POST in production (the user has verified OTP but
		// holds no auth context yet — no CSRF cookie to present). Same
		// rationale as the existing /api/auth/check-dsa skip on line 592.
		expect(src).toMatch(/['"]\/api\/auth\/login-confirm['"]/);
	});
});
