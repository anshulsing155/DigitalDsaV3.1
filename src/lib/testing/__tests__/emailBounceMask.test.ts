/**
 * Email-address PII mask
 * ══════════════════════════════════════════════════════════════════
 * Locks two contracts:
 *
 *   1. The maskEmailForLog helper produces the canonical
 *      `j*****x@*****.com` shape (matches fileConfigurator.redactEmail).
 *
 *   2. /api/webhook/ses-bounce never includes raw bounced recipient
 *      addresses in any logger call. Static assertion against the
 *      handler source — regression-proofs a future "let's just log
 *      it for debugging" edit that would land raw PII in Vercel logs.
 *
 * Background: this used to test a `handleEmailBounce(event)` stub in
 * email.ts. That stub was superseded 2026-06-04 by the full SNS
 * webhook at /api/webhook/ses-bounce; the stub was deleted (SEC-8
 * pre-flip audit). The mask helper survives because it's a generally
 * useful PII redactor that any future log site can reach for.
 *
 * Review finding: docs/reviews/CODE-REVIEW-2026-05-30.md → L5.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { _maskEmailForLog } from '$lib/server/email';

describe('maskEmailForLog — canonical shape', () => {
	it('produces first+last-char@*****.<ext> for a typical address', () => {
		expect(_maskEmailForLog('john.doe@example.com')).toBe('j*****e@*****.com');
	});

	it('handles a single-character local part by repeating the same char', () => {
		expect(_maskEmailForLog('a@example.in')).toBe('a*****a@*****.in');
	});

	it('uses .co.in extension correctly (last dot wins)', () => {
		expect(_maskEmailForLog('test@example.co.in')).toBe('t*****t@*****.in');
	});

	it('falls back to the generic placeholder for a non-email string', () => {
		expect(_maskEmailForLog('not-an-email')).toBe('r*****d@*****.com');
	});

	it('handles null / undefined / non-string inputs without throwing', () => {
		expect(_maskEmailForLog(null)).toBe('r*****d@*****.com');
		expect(_maskEmailForLog(undefined)).toBe('r*****d@*****.com');
		expect(_maskEmailForLog(42)).toBe('r*****d@*****.com');
	});
});

describe('ses-bounce webhook — no raw bounced address in any log call', () => {
	const webhookPath = resolve(
		process.cwd(),
		'src/routes/api/webhook/ses-bounce/+server.ts'
	);
	const source = readFileSync(webhookPath, 'utf8');

	it('never references bouncedRecipients/complainedRecipients inside a logger call', () => {
		// Find every logger.{info,warn,error}(...) invocation and confirm none
		// of them contain a raw bouncedRecipients / complainedRecipients access.
		// Multi-line tolerant via a small regex that captures the call args
		// up to the closing paren of the first balanced expression.
		const loggerCalls = source.match(/logger\.(info|warn|error)\([\s\S]*?\)\s*;/g) ?? [];
		expect(loggerCalls.length).toBeGreaterThan(0); // sanity — file must log something

		for (const call of loggerCalls) {
			expect(call).not.toMatch(/bouncedRecipients/);
			expect(call).not.toMatch(/complainedRecipients/);
			// Heuristic backstop: no `r.emailAddress` interpolation inside a log call.
			expect(call).not.toMatch(/\.emailAddress/);
		}
	});

	it('routes suppression through markSuppressed() — never inline-writes from a log block', () => {
		// markSuppressed is the only function in the file that writes to
		// DsaApplications/rmApplications. Confirm it exists + is the single
		// surface for the write.
		expect(source).toMatch(/function markSuppressed\(/);
		expect(source.match(/DsaApplications\.updateMany/g)?.length ?? 0).toBe(1);
		expect(source.match(/rmApplications\.updateMany/g)?.length ?? 0).toBe(1);
	});
});
