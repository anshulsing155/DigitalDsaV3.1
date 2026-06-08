/**
 * Behavioral test — SEC-10 evaluateLoginConflict gate.
 *
 * Workflow-surfaced gap (S223+1 end-verify): the gate had structural
 * coverage (sessionRegistryDualWrite.test.ts counts call sites) but no
 * behavioral coverage of the env-flag branching that IS the soak-mode
 * design decision (D3). This file fills the gap by mocking Sessions +
 * env + signPendingLoginToken + logger and asserting:
 *
 *   (a) Soak mode (env unset) + modal verdict → kind:'proceed'
 *       (telemetry still fires — that's what feeds the admin dashboard
 *        during the observation week)
 *   (b) Enforce mode (env='true') + modal verdict → kind:'conflict' with
 *       session_conflict response body + pending-login-token signed
 *   (c) 'none' verdict (no existing rows, or fresh same-device login)
 *       → kind:'proceed', NO telemetry emitted (we only log modal-level
 *        conflicts to keep the signal clean)
 *   (d) 'silent' verdict (same browser, different tab) → kind:'proceed',
 *       NO telemetry — silents are the expected "naturally rotated"
 *       case, not interesting to operators
 *   (e) Fail-open: Sessions query throws → kind:'proceed' (DB blip
 *       cannot lock the whole login endpoint)
 *   (f) Fail-open: signPendingLoginToken throws → kind:'proceed'
 *       (better to silently soak through a signing failure than block
 *        every conflicting login on JWT_SECRET regression)
 *
 * detectConflict() is pure and tested at sessionConflict.test.ts —
 * this suite uses real values for it and only mocks the seams.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §4 + §9 Commit B
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mocks (must come BEFORE the import-under-test) ────────────────────
//
// vi.mock factories are HOISTED to the top of the file before any other
// statement executes. That means they cannot reference module-scope
// variables declared below. vi.hoisted() is the documented escape
// hatch — its callback also hoists, so the mock factories can close
// over the returned values safely.

const { mockFind, mockUpdateMany, mockLogger, mockSign } = vi.hoisted(() => ({
	mockFind: vi.fn(),
	mockUpdateMany: vi.fn(),
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	},
	mockSign: vi.fn()
}));

// env.SESSION_ENFORCEMENT_KICK_ENABLED is mutated per-test via the helper.
vi.mock('$env/dynamic/private', () => ({
	env: { SESSION_ENFORCEMENT_KICK_ENABLED: undefined as string | undefined }
}));

vi.mock('$lib/database/mongo', () => ({
	Sessions: { find: mockFind, updateMany: mockUpdateMany }
}));

vi.mock('$lib/server/logger', () => ({
	default: mockLogger
}));

vi.mock('$lib/server/auth/pendingLoginToken', () => ({
	signPendingLoginToken: mockSign
}));

// ── Now safe to import (deferred mocks land first) ────────────────────

import { evaluateLoginConflict } from '$lib/server/auth/checkDsaConflictGate';
import { env } from '$env/dynamic/private';

// ── Fixtures ──────────────────────────────────────────────────────────

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);
const HEX_D = 'd'.repeat(64);

const FIXED_NOW = new Date('2026-06-04T10:00:00Z');

/**
 * Build a Sessions row in the shape the gate's projection returns.
 * Real Sessions docs have more fields; the gate only reads these.
 */
function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		_id: new ObjectId(),
		session_id: 'existing-tokenid',
		device_label: 'Chrome on Windows',
		device_fingerprint: HEX_A,
		browser_fingerprint: HEX_B,
		client_class: 'web',
		last_seen_at: FIXED_NOW,
		...overrides
	};
}

/**
 * Shape Sessions.find() to return the supplied rows. Drops the
 * fake .toArray() the gate will await.
 */
function mockSessionsReturn(rows: Array<Record<string, unknown>>): void {
	mockFind.mockReturnValue({
		toArray: () => Promise.resolve(rows)
	});
}

/**
 * Mutate the mocked env. The gate reads at request time (not at module
 * load) so test ordering is independent.
 */
function setKickEnabled(value: 'true' | 'false' | undefined): void {
	(env as Record<string, unknown>).SESSION_ENFORCEMENT_KICK_ENABLED = value;
}

beforeEach(() => {
	vi.clearAllMocks();
	setKickEnabled(undefined);
	mockSign.mockReturnValue('signed-pending-token-fixture');
	// Sessions.updateMany returns a non-null result; mimic the driver shape
	// (only modifiedCount is read by the gate today).
	mockUpdateMany.mockResolvedValue({ modifiedCount: 1, acknowledged: true });
});

const STD_INPUT = {
	userId: new ObjectId('507f1f77bcf86cd799439011'),
	userRole: 'dsa' as const,
	userCollection: 'DsaApplications' as const,
	tokenId: 'new-tokenid-fixture',
	sanitizedFingerprints: {
		device_fingerprint: HEX_A,
		browser_fingerprint: HEX_B,
		client_class: 'web' as const
	}
};

// ── (a) Soak mode behavior ────────────────────────────────────────────

describe('evaluateLoginConflict — soak mode (env unset)', () => {
	it('modal verdict (browser conflict) → kind:proceed but telemetry fires', async () => {
		// Existing row has browser_fp=B; incoming has browser_fp=C → modal/browser
		mockSessionsReturn([makeRow({ browser_fingerprint: HEX_B })]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('proceed');
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'session.conflict_detected',
				kick_enabled: false,
				conflict_types: ['browser']
			}),
			expect.any(String)
		);
		// No pending-login-token sign in soak mode — that's enforce-only.
		expect(mockSign).not.toHaveBeenCalled();
	});

	it('modal verdict (device conflict) → kind:proceed, telemetry tags conflict_type correctly', async () => {
		mockSessionsReturn([makeRow({ device_fingerprint: HEX_A })]);

		await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_D,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'session.conflict_detected',
				conflict_types: ['device']
			}),
			expect.any(String)
		);
	});

	it("explicit env='false' behaves identically to undefined", async () => {
		setKickEnabled('false');
		mockSessionsReturn([makeRow({ browser_fingerprint: HEX_B })]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('proceed');
		expect(mockSign).not.toHaveBeenCalled();
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({ kick_enabled: false }),
			expect.any(String)
		);
	});
});

// ── (b) Enforcement mode behavior ─────────────────────────────────────

describe("evaluateLoginConflict — enforcement mode (env='true')", () => {
	beforeEach(() => setKickEnabled('true'));

	it('modal verdict → kind:conflict with full session_conflict body', async () => {
		const existing = makeRow({
			session_id: 'sess-A',
			browser_fingerprint: HEX_B
		});
		mockSessionsReturn([existing]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C, // → browser conflict
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('conflict');
		if (result.kind !== 'conflict') return; // type guard

		expect(result.body.status).toBe('session_conflict');
		expect(result.body.pending_login_token).toBe('signed-pending-token-fixture');
		expect(result.body.existing_sessions).toHaveLength(1);
		expect(result.body.existing_sessions[0].id).toBe('sess-A');
		expect(result.body.existing_sessions[0].conflict_type).toBe('browser');
	});

	it('pending-login-token is signed with the full payload contract', async () => {
		mockSessionsReturn([
			makeRow({ session_id: 'sess-A', browser_fingerprint: HEX_B }),
			makeRow({ session_id: 'sess-B', browser_fingerprint: HEX_D })
		]);

		await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C, // browser conflict against both
				client_class: 'web'
			}
		});

		expect(mockSign).toHaveBeenCalledTimes(1);
		expect(mockSign).toHaveBeenCalledWith({
			userId: '507f1f77bcf86cd799439011',
			userRole: 'dsa',
			userCollection: 'DsaApplications',
			tokenId: 'new-tokenid-fixture',
			kickEligibleSessionIds: ['sess-A', 'sess-B'],
			incomingFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});
	});

	it('telemetry fires with kick_enabled:true in enforce mode', async () => {
		mockSessionsReturn([makeRow({ browser_fingerprint: HEX_B })]);

		await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({ kick_enabled: true }),
			expect.any(String)
		);
	});
});

// ── (c)+(d) Non-modal verdicts never produce conflicts or telemetry ───

describe('evaluateLoginConflict — non-modal verdicts always proceed', () => {
	it("'none' verdict (empty Sessions list) → proceed, NO telemetry, NO silent revoke, regardless of flag", async () => {
		setKickEnabled('true');
		mockSessionsReturn([]);

		const result = await evaluateLoginConflict(STD_INPUT);

		expect(result.kind).toBe('proceed');
		expect(mockSign).not.toHaveBeenCalled();
		// Critical: no telemetry for non-conflict cases — keeps the
		// `session.conflict_detected` signal clean for the dashboard.
		expect(mockLogger.info).not.toHaveBeenCalledWith(
			expect.objectContaining({ event: 'session.conflict_detected' }),
			expect.any(String)
		);
		// Regression guard: an over-eager silent path that called
		// updateMany on every login (e.g. with an empty $in array) would
		// burn write IO. Lock that it's only called when there's actual
		// work to do.
		expect(mockUpdateMany).not.toHaveBeenCalled();
	});

	it("'none' verdict (incoming has no fingerprints) → proceed", async () => {
		setKickEnabled('true');
		mockSessionsReturn([makeRow()]);

		// Empty fingerprints — detectConflict's "can't decide" short-circuit
		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {}
		});

		expect(result.kind).toBe('proceed');
		expect(mockSign).not.toHaveBeenCalled();
		expect(mockLogger.info).not.toHaveBeenCalled();
	});

	it("'silent' verdict (same browser re-login) → proceed + revokes the ghost row, NO conflict telemetry", async () => {
		setKickEnabled('true');
		// Same device_fp + same browser_fp → silent verdict in detectConflict.
		// Different session_id (= the predecessor row that needs revoking).
		mockSessionsReturn([
			makeRow({ session_id: 'ghost-sess', device_fingerprint: HEX_A, browser_fingerprint: HEX_B })
		]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_B,
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('proceed');
		expect(mockSign).not.toHaveBeenCalled();
		// Pitfall #77 regression guard — the ghost row MUST be revoked
		// (it was passing through silently pre-2026-06-05, accumulating
		// in Atlas as `revoked_at == null` rows that no client could
		// reach but every analytics query counted as "active").
		expect(mockUpdateMany).toHaveBeenCalledTimes(1);
		const [filter, update] = mockUpdateMany.mock.calls[0];
		expect(filter).toEqual({
			user_id: STD_INPUT.userId,
			session_id: { $in: ['ghost-sess'] },
			revoked_at: null
		});
		expect(update).toEqual({
			$set: {
				revoked_at: expect.any(Date),
				revoke_reason: 'rotated_same_browser'
			}
		});
		// Silent-rotation telemetry fires at info level so ops can confirm
		// the cleanup is running; it MUST NOT fire 'session.conflict_detected'
		// (which feeds the modal-kick-rate dashboard).
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'session.silent_rotated',
				silent_count: 1
			}),
			expect.any(String)
		);
		expect(mockLogger.info).not.toHaveBeenCalledWith(
			expect.objectContaining({ event: 'session.conflict_detected' }),
			expect.any(String)
		);
	});

	it("'silent' verdict — updateMany failure is hygiene-only, login still proceeds", async () => {
		// Atlas hiccup mid-revoke must NOT block the legitimate login.
		// The ghost row stays in place until the next same-browser re-login
		// catches it on the next pass.
		setKickEnabled('true');
		mockUpdateMany.mockRejectedValueOnce(new Error('atlas write timeout'));
		mockSessionsReturn([
			makeRow({ session_id: 'ghost-sess', device_fingerprint: HEX_A, browser_fingerprint: HEX_B })
		]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_B,
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('proceed');
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				err: expect.any(Error),
				silent_session_ids: ['ghost-sess']
			}),
			expect.stringContaining('silent rotation revoke failed')
		);
	});

	it("'silent' + 'modal' coexist — silent revokes inline, modal goes to confirm flow", async () => {
		// Same user has TWO prior sessions:
		//  - Windows-Chrome (different device — modal)
		//  - older Android-Chrome (same browser as incoming — silent)
		// Single login should produce ONE updateMany for the silent row
		// AND ONE pending-login-token signing for the modal flow.
		setKickEnabled('true');
		mockSessionsReturn([
			makeRow({
				session_id: 'win-chrome-sess',
				device_fingerprint: HEX_C, // different device
				browser_fingerprint: HEX_D,
				device_label: 'Chrome on Windows'
			}),
			makeRow({
				session_id: 'android-old-sess',
				device_fingerprint: HEX_A, // same device as incoming
				browser_fingerprint: HEX_B, // same browser as incoming
				device_label: 'Chrome on Android'
			})
		]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_B,
				client_class: 'web'
			}
		});

		// Silent row was revoked.
		expect(mockUpdateMany).toHaveBeenCalledTimes(1);
		expect(mockUpdateMany.mock.calls[0][0]).toEqual({
			user_id: STD_INPUT.userId,
			session_id: { $in: ['android-old-sess'] },
			revoked_at: null
		});
		// Modal flow fired for the other row.
		expect(result.kind).toBe('conflict');
		if (result.kind !== 'conflict') return; // type guard
		expect(result.body.existing_sessions).toHaveLength(1);
		expect(result.body.existing_sessions[0].id).toBe('win-chrome-sess');
	});

	it("'none' verdict (cross-client_class web↔android) → proceed regardless of flag", async () => {
		setKickEnabled('true');
		// Existing android row + incoming web → independent surfaces, never conflict
		mockSessionsReturn([makeRow({ client_class: 'android' })]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_D,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		expect(result.kind).toBe('proceed');
		expect(mockSign).not.toHaveBeenCalled();
	});
});

// ── (e)+(f) Fail-open behavior ────────────────────────────────────────

describe('evaluateLoginConflict — fail-open on infrastructure errors', () => {
	it('Sessions query failure → proceed, warn logged, no crash', async () => {
		mockFind.mockReturnValue({
			toArray: () => Promise.reject(new Error('atlas read timeout'))
		});

		const result = await evaluateLoginConflict(STD_INPUT);

		expect(result.kind).toBe('proceed');
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ err: expect.any(Error) }),
			expect.stringContaining('Sessions query failed')
		);
		expect(mockSign).not.toHaveBeenCalled();
	});

	it("signPendingLoginToken failure (enforce mode + modal verdict) → proceed, error logged", async () => {
		setKickEnabled('true');
		mockSign.mockImplementation(() => {
			throw new Error('JWT_SECRET unset');
		});
		mockSessionsReturn([makeRow({ browser_fingerprint: HEX_B })]);

		const result = await evaluateLoginConflict({
			...STD_INPUT,
			sanitizedFingerprints: {
				device_fingerprint: HEX_A,
				browser_fingerprint: HEX_C,
				client_class: 'web'
			}
		});

		// Critical: a JWT-signing regression must NOT block every conflicting
		// login. SEC-10 is additive enforcement; the legacy activeTokenIds
		// device-switch-nuke is still in place during the dual-write window.
		expect(result.kind).toBe('proceed');
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({ err: expect.any(Error) }),
			expect.stringContaining('sign failed')
		);
	});
});

// ── Sessions query shape ──────────────────────────────────────────────

describe('evaluateLoginConflict — Sessions query', () => {
	it('queries Sessions.find with { user_id, revoked_at: null } + projection', async () => {
		mockSessionsReturn([]);

		await evaluateLoginConflict(STD_INPUT);

		expect(mockFind).toHaveBeenCalledTimes(1);
		const [filter, options] = mockFind.mock.calls[0];
		expect(filter).toEqual({
			user_id: STD_INPUT.userId,
			revoked_at: null
		});
		// Projection includes only the fields detectConflict actually reads —
		// keeps bandwidth bounded for users with many active sessions.
		expect(options).toEqual({
			projection: {
				session_id: 1,
				device_label: 1,
				device_fingerprint: 1,
				browser_fingerprint: 1,
				client_class: 1,
				last_seen_at: 1
			}
		});
	});
});
