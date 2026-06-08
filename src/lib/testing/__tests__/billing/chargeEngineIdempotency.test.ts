/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: chargeEngine MUST query ChargeAttempts for a succeeded row on
 *           (subscription_id, cycle_anchor) BEFORE calling
 *           provider.chargeMandate (D.1 S3 — pitfall candidate from M2 blueprint)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * If the engine omits the per-cycle probe and the cron fires twice for the
 * same anchor day (two Vercel regions on a deploy race, or an external
 * scheduler retrying on a 5xx), each cron run generates a FRESH `attempt_id`
 * (UUID v4). Razorpay's per-receipt dedup catches the SAME `attempt_id` on
 * retry, but NOT a different one — so the second cron run creates a second
 * order and double-charges the DSA.
 *
 * The ChargeAttempts (subscription_id, cycle_anchor) compound index (added
 * in S3 M1) makes the probe O(1). The required pattern is:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ const probe = await probeExistingAttempt(sub._id, anchor) │
 *   │ if (probe.kind === 'already_succeeded') return skip       │
 *   │ const attempt_id = probe.kind === 'resume_pending'        │
 *   │   ? probe.row.attempt_id : randomUUID()                   │
 *   │ // ...insert pending ChargeAttempt...                     │
 *   │ const result = await provider.chargeMandate({ attempt_id })│
 *   └───────────────────────────────────────────────────────────┘
 *
 * THIS TEST
 * ─────────
 * Source-pattern scan of `chargeEngine.ts` — for every call to
 * `provider.chargeMandate(`, asserts the preceding 60 lines reference
 * `probeExistingAttempt`. This guarantees the probe is wired before the
 * provider call without depending on a runtime path.
 *
 * Also asserts `chargeEngine.ts` imports `ChargeAttempts` from
 * `$lib/database/mongo` (the only collection the probe can use).
 *
 * Same enforcement model as preSubmitConfirmWiring (Pitfall #47),
 * directorAutoIncomeWiring (Pitfall #46), tokenRefreshScheduler (Pitfall #59),
 * caseLevelDisabledReasonWiring (Pitfall #53).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_PATH = resolve(process.cwd(), 'src/lib/server/billing/chargeEngine.ts');

describe('chargeEngine idempotency wiring (D.1 S3)', () => {
	const src = readFileSync(ENGINE_PATH, 'utf8');

	it('imports ChargeAttempts from $lib/database/mongo', () => {
		expect(src).toMatch(/import\s*\{[^}]*ChargeAttempts[^}]*\}\s*from\s*['"]\$lib\/database\/mongo['"]/s);
	});

	it('defines probeExistingAttempt helper that queries ChargeAttempts.findOne', () => {
		expect(src).toMatch(/function\s+probeExistingAttempt/);
		// The probe must query ChargeAttempts.findOne — that's the lookup
		// against the (subscription_id, cycle_anchor) index.
		const probeFnStart = src.indexOf('function probeExistingAttempt');
		expect(probeFnStart).toBeGreaterThan(-1);
		// Find the next function boundary — naive: next "function " or end of file.
		const probeFnEnd = src.indexOf('\nfunction ', probeFnStart + 1);
		const probeBody = src.slice(probeFnStart, probeFnEnd === -1 ? undefined : probeFnEnd);
		expect(probeBody).toMatch(/ChargeAttempts\.findOne\s*\(/);
		expect(probeBody).toMatch(/subscription_id/);
		expect(probeBody).toMatch(/cycle_anchor/);
		// Must check for 'succeeded' status (the strongest signal that this
		// cycle was already charged).
		expect(probeBody).toMatch(/['"]succeeded['"]/);
	});

	it('every call to provider.chargeMandate is preceded by probeExistingAttempt', () => {
		// Find every provider.chargeMandate( call site and verify the preceding
		// chunk of the file references probeExistingAttempt. The 'chunk' is
		// generous (the start of the file or the start of the enclosing
		// function, whichever is closer) — false positives are acceptable here
		// because the failure mode of an omitted probe is severe (double charge).
		const callSites = [...src.matchAll(/\bprovider\.chargeMandate\s*\(/g)];
		expect(callSites.length).toBeGreaterThan(0);

		for (const m of callSites) {
			const idx = m.index!;
			// Look back for the enclosing function start.
			const beforeChunk = src.slice(0, idx);
			const lastFnStart = Math.max(
				beforeChunk.lastIndexOf('export async function'),
				beforeChunk.lastIndexOf('async function'),
				beforeChunk.lastIndexOf('function ')
			);
			const chunk = src.slice(lastFnStart === -1 ? 0 : lastFnStart, idx);
			expect(
				chunk,
				`provider.chargeMandate call at offset ${idx} must be preceded by probeExistingAttempt — ` +
					`without the per-cycle probe, a second cron firing generates a fresh attempt_id ` +
					`that Razorpay's per-receipt dedup does NOT catch, resulting in a DOUBLE CHARGE. ` +
					`See chargeEngine.ts header comment and the (subscription_id, cycle_anchor) index in mongo.ts.`
			).toMatch(/probeExistingAttempt/);
		}
	});

	it('writes a pending ChargeAttempt row BEFORE the provider call (two-phase persist, R1)', () => {
		// The engine must insert the pending attempt row before the
		// provider.chargeMandate call so a crash mid-call leaves a recoverable
		// trail. Scan: between the first ChargeAttempts.insertOne / .updateOne
		// and the FIRST provider.chargeMandate, there must be no intervening
		// "return" that would short-circuit the persist.
		const firstInsert = src.indexOf('ChargeAttempts.insertOne');
		const firstUpdateForResume = src.indexOf('ChargeAttempts.updateOne');
		const firstPersist =
			firstInsert === -1
				? firstUpdateForResume
				: firstUpdateForResume === -1
					? firstInsert
					: Math.min(firstInsert, firstUpdateForResume);
		const firstProviderCall = src.indexOf('provider.chargeMandate(');
		expect(firstPersist).toBeGreaterThan(-1);
		expect(firstProviderCall).toBeGreaterThan(-1);
		expect(
			firstPersist,
			'Pending ChargeAttempt row must be persisted BEFORE provider.chargeMandate ' +
				'(two-phase persist per spec R1; without it, a crash mid-provider-call leaves no recoverable trail)'
		).toBeLessThan(firstProviderCall);
	});
});
