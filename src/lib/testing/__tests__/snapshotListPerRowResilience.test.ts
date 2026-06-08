/**
 * Lock test — GET /api/cases/[case_id]/snapshots must keep per-row
 * decrypt resilience.
 *
 * Background (commits eac11c29 + dc5b614e, 2026-06-02): a single stale-
 * ciphertext snapshot (Pitfall #68 fallout — snapshot written when
 * CSFLE_ENABLED was true, now reading with it unset) used to 500 the
 * entire listing because Promise.all surfaces the first rejection. The
 * fix wraps each `resolveSnapshotPayload` call in a per-row try/catch
 * and degrades to plaintext on decrypt failure, returning the rest of
 * the snapshots + an enum decrypt_error marker on the bad row.
 *
 * The code-review 2026-06-02 PM (M-PM1) additionally requires the catch
 * block to:
 *   - sanitize the response to a fixed enum string (no raw error.message)
 *   - log the original error server-side at warn level
 *
 * This test asserts the CANONICAL shape — if someone collapses the
 * try/catch into a bare Promise.all, drops the logger.warn, or leaks the
 * raw error message back, this test trips and the regression is caught
 * before it ships.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENDPOINT_PATH = resolve(
	process.cwd(),
	'src/routes/api/cases/[case_id]/snapshots/+server.ts'
);
const source = readFileSync(ENDPOINT_PATH, 'utf8');

// Strip comments before grepping so a JSDoc example can't false-match.
const stripped = source
	.replace(/\/\*[\s\S]*?\*\//g, '')
	.replace(/\/\/.*$/gm, '');

describe('snapshots listing endpoint — per-row decrypt resilience lock', () => {
	it('wraps resolveSnapshotPayload in a per-row try/catch', () => {
		// The resilience marker: a try block that calls resolveSnapshotPayload
		// followed somewhere by a catch. Without this, one stale-ciphertext row
		// 500s the whole listing — exactly the regression we just fixed.
		expect(stripped).toMatch(/try\s*\{[\s\S]*?resolveSnapshotPayload\s*\(/);
		expect(stripped).toMatch(/\}\s*catch\s*\(\s*decryptErr\b/);
	});

	it('falls back to the plaintext payload field on decrypt failure', () => {
		// The fallback path reads s.payload directly. This is the dual-write
		// safety net for snapshots from the CSFLE-on window (2026-05-18 →
		// 2026-06-01) — their payload_encrypted is now undecryptable but the
		// plaintext payload is still on the row.
		expect(stripped).toMatch(/plaintextFallback/);
		expect(stripped).toMatch(/used_plaintext_fallback/);
	});

	it('returns a fixed enum decrypt_error string — never raw err.message (M-PM1)', () => {
		// M-PM1 from code-review 2026-06-02 PM: the raw error message can leak
		// crypto library internals (key IDs, algorithm names, CSFLE metadata).
		// Sanitized fixed enum strings only.
		expect(stripped).toMatch(/'snapshot_decrypt_failed_used_plaintext'/);
		expect(stripped).toMatch(/'snapshot_decrypt_failed_no_fallback'/);

		// And: the raw `decryptErr.message` must NOT appear in the response
		// object construction. If the catch block ever returns
		// `decrypt_error: decryptErr.message` again, this trips.
		expect(stripped).not.toMatch(/decrypt_error\s*:\s*[\s\S]*?decryptErr\.message/);
		expect(stripped).not.toMatch(
			/decrypt_error\s*:\s*[\s\S]*?decryptErr\s+instanceof\s+Error/
		);
	});

	it('logs the original decrypt error server-side via logger.warn (M-PM1)', () => {
		// Sanitizing the wire response is only half the fix — the original
		// error must still reach the server logs so ops can diagnose. This
		// asserts logger.warn is called inside the catch block.
		expect(stripped).toMatch(/import\s+logger\s+from\s+['"]\$lib\/server\/logger(?:\.js)?['"]/);
		// The catch block must call logger.warn — assert that warn is invoked
		// somewhere AFTER the catch clause opens. Conservative regex: any
		// logger.warn appearance is enough (only one logger usage in this file
		// today; if a second appears later that's fine — both must stay).
		expect(stripped).toMatch(/logger\.warn\s*\(/);
		// The log must carry the original err — otherwise we're sanitizing
		// the wire response AND losing the ops signal at the same time.
		expect(stripped).toMatch(/err\s*:\s*decryptErr\b/);
	});

	it('strips payload_encrypted from the wire response on both success and failure paths', () => {
		// Returning the encrypted Binary field would JSON-serialize as bulky
		// EJSON and leak ciphertext to the client. The destructure
		// `const { payload_encrypted: _ignored, ...rest } = s` runs BEFORE
		// the try block so both success and catch returns use `...rest`.
		expect(stripped).toMatch(/payload_encrypted\s*:\s*_ignored/);
	});
});
