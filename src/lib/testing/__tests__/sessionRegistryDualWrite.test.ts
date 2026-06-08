/**
 * Lock test — SEC-10 Commit A: extend Sessions collection with fingerprint
 * fields + wire them through the login endpoint.
 *
 * Background (S223, 2026-06-04):
 * SEC-10 (single-session login enforcement) reuses the existing `Sessions`
 * collection (E.3 — "Active devices" UI, shipped S206) rather than
 * introducing an embedded `user_sessions[]` array. Commit A:
 *   1. Extends `SessionDoc` with three optional fingerprint fields +
 *      adds 'kicked_by_new_login' to the revoke_reason union.
 *   2. Extends `recordSession()` to accept + persist those fields when
 *      the caller supplies them.
 *   3. Wires `/api/auth/check-dsa` (6 call sites) to forward sanitized
 *      values from the request body.
 *   4. Keeps the legacy `activeTokenIds[]` writes intact via
 *      `buildTokenUpdate()` — that's the device-switch-nuke enforcement
 *      `hooks.server.ts` reads today, sunsetting 30 days post-Commit-C.
 *
 * This lock test guards the SHAPE of that wiring across all three files.
 * It is structural, not behavioral — runs in milliseconds, reads files
 * as text. Behavioral verification of the conflict flow lives in the
 * Commit B test `sessionConflictMatrix.test.ts`.
 *
 * If a well-meaning future cleanup drops one of these pieces (e.g.
 * "the client_class field is unused, let's remove it" before Commit B
 * wires it up), this test trips and surfaces the regression.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §3 + §9
 * ADR : docs/adr/0028-single-session-enforcement.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SESSION_TYPE_PATH = resolve(process.cwd(), 'src/lib/types/session.ts');
const RECORD_SESSION_PATH = resolve(process.cwd(), 'src/lib/server/account/sessions.ts');
const CHECK_DSA_PATH = resolve(process.cwd(), 'src/routes/api/auth/check-dsa/+server.ts');

describe('SEC-10 Commit A — Sessions schema extension', () => {
	const src = readFileSync(SESSION_TYPE_PATH, 'utf8');

	it('SessionDoc declares device_fingerprint as optional', () => {
		// Optional (`?:`) so legacy rows without it are still valid.
		expect(src).toMatch(/device_fingerprint\?:\s*string/);
	});

	it('SessionDoc declares browser_fingerprint as optional', () => {
		expect(src).toMatch(/browser_fingerprint\?:\s*string/);
	});

	it("SessionDoc declares client_class as optional 'web' | 'android'", () => {
		expect(src).toMatch(/client_class\?:\s*'web'\s*\|\s*'android'/);
	});

	it("revoke_reason union includes 'kicked_by_new_login'", () => {
		// Distinct from 'revoke_others' (user-initiated) — kicked at
		// new-login time by the confirm-and-kick flow.
		expect(src).toMatch(/'kicked_by_new_login'/);
	});
});

describe('SEC-10 Commit A — recordSession accepts + persists fingerprints', () => {
	const src = readFileSync(RECORD_SESSION_PATH, 'utf8');

	it('RecordSessionInput declares the three new optional fields', () => {
		expect(src).toMatch(/device_fingerprint\?:\s*string/);
		expect(src).toMatch(/browser_fingerprint\?:\s*string/);
		expect(src).toMatch(/client_class\?:\s*'web'\s*\|\s*'android'/);
	});

	it('recordSession destructures the new fields from input', () => {
		// Catches a refactor that adds fields to the interface but
		// forgets to actually destructure / use them in the body.
		expect(src).toMatch(
			/const\s*\{\s*device_fingerprint,\s*browser_fingerprint,\s*client_class\s*\}\s*=\s*input/
		);
	});

	it('recordSession uses conditional spread (no `undefined` written on disk)', () => {
		// The conditional-spread pattern is the contract: an absent
		// fingerprint must be ABSENT on disk, not stored as `null` or
		// `undefined`. Commit B's conflict detection relies on this
		// (it uses `$exists: false`-style checks via the backfill script).
		expect(src).toMatch(/\.\.\.\(device_fingerprint\s*\?\s*\{\s*device_fingerprint\s*\}/);
		expect(src).toMatch(/\.\.\.\(browser_fingerprint\s*\?\s*\{\s*browser_fingerprint\s*\}/);
		expect(src).toMatch(/\.\.\.\(client_class\s*\?\s*\{\s*client_class\s*\}/);
	});
});

describe('SEC-10 Commit A — check-dsa wires fingerprints through to every login path', () => {
	const src = readFileSync(CHECK_DSA_PATH, 'utf8');

	it('Zod schema accepts deviceFingerprint, browserFingerprint, clientClass', () => {
		// Lenient at schema layer; format validation runs after via the
		// sanitize helpers. Catches a refactor that drops the schema
		// entries (which would silently make the helpers receive
		// `undefined` for every request).
		expect(src).toMatch(/deviceFingerprint:\s*z\.string\(\)\.optional\(\)/);
		expect(src).toMatch(/browserFingerprint:\s*z\.string\(\)\.optional\(\)/);
		expect(src).toMatch(/clientClass:\s*z\.string\(\)\.optional\(\)/);
	});

	it('declares sanitizeFingerprint and sanitizeClientClass helpers', () => {
		// These convert malformed/missing inputs to undefined so a buggy
		// client release degrades gracefully (login still works without
		// the fingerprint signal).
		expect(src).toMatch(/function\s+sanitizeFingerprint/);
		expect(src).toMatch(/function\s+sanitizeClientClass/);
	});

	it('builds a sessionExtras object from sanitized values', () => {
		// Built once at handler entry, spread into every recordSession
		// call below. Catches a refactor that moves sanitization inline
		// but skips one branch.
		expect(src).toMatch(/const\s+sessionExtras\s*=\s*\{/);
	});

	it('spreads sessionExtras into every recordSession invocation (≥6 sites)', () => {
		// 6 call sites today: admin-preferred, rm-preferred, dsa-default,
		// rm-default, applicant-default, admin-default. The count check
		// is a >= so adding a 7th login path doesn't trip this test by
		// itself (but the test below catches forgetting to spread into it).
		const matches = src.match(/\.\.\.sessionExtras/g) ?? [];
		expect(matches.length).toBeGreaterThanOrEqual(6);
	});

	it('every recordSession invocation receives sessionExtras (no orphan call sites)', () => {
		// Stronger check: count `recordSession({` invocations and assert
		// the spread count matches. If a future login branch is added
		// without forwarding fingerprints, this trips.
		const recordSessionInvocations = (src.match(/recordSession\(\{/g) ?? []).length;
		const sessionExtrasSpreads = (src.match(/\.\.\.sessionExtras/g) ?? []).length;
		expect(sessionExtrasSpreads).toBe(recordSessionInvocations);
	});

	it('every conflict-gate call carries userCollection (no orphan gate sites)', () => {
		// SEC-10 B.5 added userCollection to the gate input so login-
		// confirm can _id-lookup the right Mongo collection (the userRole
		// 'admin' is ambiguous — it can come from AdminUsers OR Applicant).
		// If a future refactor drops the field at one branch, login-confirm
		// for those users 401s with pending_login_token_malformed.
		const gateInvocations = (src.match(/evaluateLoginConflict\(\{/g) ?? []).length;
		const userCollectionSpreads = (src.match(/userCollection:\s*['"]/g) ?? []).length;
		expect(userCollectionSpreads).toBe(gateInvocations);
		// And each of the four valid collection names appears at least once
		// (admin-preferred + admin-default share AdminUsers; rm-preferred +
		// rm-default share rmApplications; dsa-default uses DsaApplications;
		// applicant-default uses Applicant).
		expect(src).toMatch(/userCollection:\s*['"]DsaApplications['"]/);
		expect(src).toMatch(/userCollection:\s*['"]rmApplications['"]/);
		expect(src).toMatch(/userCollection:\s*['"]AdminUsers['"]/);
		expect(src).toMatch(/userCollection:\s*['"]Applicant['"]/);
	});

	it('preserves the legacy activeTokenIds dual-write via buildTokenUpdate', () => {
		// The activeTokenIds[] array is the device-switch-nuke enforcement
		// hooks.server.ts:122 reads today. It sunsets 30 days post-
		// Commit-C, NOT in Commit A. A removal here before then would
		// break legacy session enforcement during the dual-write window.
		expect(src).toMatch(/buildTokenUpdate/);
		expect(src).toMatch(/activeTokenIds/);
	});
});
