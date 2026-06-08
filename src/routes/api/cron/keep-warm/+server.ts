/**
 * GET /api/cron/keep-warm — lightweight keep-warm + liveness probe
 * ════════════════════════════════════════════════════════════════════════
 * Purpose: give an external cron (cron-job.org or similar) something safe
 * to ping every few minutes so the Vercel function instance + MongoDB
 * connection pool stay warm. This mitigates Hobby-tier cold-start 504s
 * on /api/evaluate-and-persist and similar heavy endpoints.
 *
 * Why this endpoint:
 *   - Unauthenticated by URL (cron-job.org has no SvelteKit session)
 *   - Public-safe (no PII, no state mutation, no secrets in response)
 *   - Costs ONE Mongo `ping` command (~1ms server-side) to warm the pool
 *   - Distinct path so it's easy to identify in analytics + exclude from
 *     "real traffic" dashboards
 *
 * Secret gate (unified with the existing cron pattern, S221+1):
 *   The DB ping (warm-the-pool work) only runs if the request carries
 *   `x-cron-secret: <env.CRON_SECRET>` — the SAME secret + header name
 *   that protects every /api/cron/* endpoint. One secret to rotate, one
 *   pattern to remember. Function still wakes up either way (a cold start
 *   invoked this handler), but random internet traffic can't burn DB
 *   calls. The response shape is identical with or without the secret —
 *   no oracle for the attacker.
 *
 * Response shape (deliberately minimal — small wire payload, easy parse):
 *   { ok: true, ts: "<ISO>", db: "ok" | "skipped" | "error" }
 *
 * Cron-job.org setup: auto-provisioned by scripts/setup-cron-jobs.mjs
 * (entry `keepwarm-health`). See docs/runbooks/KEEP-WARM-CRON.md.
 *
 * What this endpoint DOES NOT do:
 *   - Not a comprehensive health check. Doesn't verify CSFLE, Razorpay,
 *     SES, ImageKit, or any other downstream. Adding those would defeat
 *     the "lightweight" purpose. Use a dedicated /api/admin/diagnostics
 *     route for full health if needed (separate, authenticated).
 *   - Not a load test target. Hitting this in a tight loop burns DB
 *     quota without exercising any user-facing path.
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { MongoClientInstance } from '$lib/database/mongo';
import logger from '$lib/server/logger';

export const GET: RequestHandler = async ({ request }) => {
	const ts = new Date().toISOString();

	// Decide whether to actually exercise the DB connection pool.
	// Without the secret, we still respond OK (function warmed), but skip
	// the DB ping so random crawlers can't pile on Mongo load. Aligns with
	// the /api/cron/* endpoints' x-cron-secret pattern — one secret, one
	// header name across the whole cron surface.
	const expected = env.CRON_SECRET;
	const provided = request.headers.get('x-cron-secret');
	const shouldPingDb = !expected || provided === expected;

	if (!shouldPingDb) {
		return Response.json({ ok: true, ts, db: 'skipped' });
	}

	// Cheap warm-up: Mongo `ping` admin command. ~1ms server-side; the
	// expensive part (TCP + TLS handshake) happens on first connect, which
	// is exactly what we're trying to keep warm.
	try {
		await MongoClientInstance.db().admin().ping();
		return Response.json({ ok: true, ts, db: 'ok' });
	} catch (err) {
		// Don't expose the error to the caller (could be a fingerprinting
		// vector). Log it server-side so we can spot DB-availability
		// issues from the function logs.
		logger.warn({ err }, '[health] DB ping failed');
		return Response.json({ ok: true, ts, db: 'error' }, { status: 200 });
	}
};
