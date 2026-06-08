#!/usr/bin/env node
/**
 * D.1 S3 — cron-job.org scheduler setup (idempotent)
 * ══════════════════════════════════════════════════════════════════════
 * Creates or updates the two scheduled jobs that drive the S3 renewal
 * charge cron + pre-charge reminder cron. Idempotent on the `title`
 * field — re-running picks up existing jobs and updates them rather
 * than duplicating.
 *
 * Required env vars:
 *   CRON_JOB_ORG_API_KEY  — generated at https://cron-job.org → API
 *   CRON_SECRET           — read from .env (passed as x-cron-secret header)
 *
 * Optional env vars:
 *   TARGET_HOST           — defaults to 'rinn.in' (prod)
 *   DRY_RUN               — if 'true', logs what WOULD happen without
 *                           hitting the cron-job.org API
 *
 * Usage:
 *   export CRON_JOB_ORG_API_KEY='...'
 *   node scripts/setup-cron-jobs.mjs
 *
 * Companion: docs/runbooks/D1-S3-CRON-JOB-ORG-SETUP.md
 * Spec: D-1-RECURRING-BILLING-SPEC.md §4 S3 + §11 R14
 *
 * API reference (cron-job.org):
 *   - Base URL: https://api.cron-job.org
 *   - Auth: `Authorization: Bearer <key>` header
 *   - Job model: { url, enabled, saveResponses, schedule, requestMethod,
 *                  extendedData.headers, title, notification }
 *   - PUT /jobs        — create job (body: { job: {...} })
 *   - GET /jobs        — list all jobs
 *   - PATCH /jobs/<id> — update job
 *   - DELETE /jobs/<id>— delete job
 *   - POST /jobs/<id>/run — trigger a manual run (NOT all API plans support this;
 *                            falls back gracefully if 404/403)
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';

const API_BASE = 'https://api.cron-job.org';
// IMPORTANT: must be the CANONICAL host, not the apex. Vercel redirects
// rinn.in → www.rinn.in with a 308, and cron-job.org does NOT follow
// redirects — so an apex URL silently fails every scheduled run.
const TARGET_HOST = process.env.TARGET_HOST || 'www.rinn.in';
const DRY_RUN = process.env.DRY_RUN === 'true';
const API_KEY = process.env.CRON_JOB_ORG_API_KEY;

// ── env validation ─────────────────────────────────────────────────────

if (!API_KEY) {
	console.error(
		'ERROR: CRON_JOB_ORG_API_KEY not set. Generate one at https://cron-job.org → Profile → API'
	);
	process.exit(1);
}

// Read CRON_SECRET from .env (NOT process.env — the .env value is what
// matches Vercel's env var by owner confirmation).
let CRON_SECRET;
try {
	const envFile = readFileSync('.env', 'utf8');
	const match = envFile.match(/^CRON_SECRET=(.+)$/m);
	if (!match) {
		console.error('ERROR: CRON_SECRET not found in .env');
		process.exit(1);
	}
	// Strip wrapping quotes if any (single or double).
	CRON_SECRET = match[1].trim().replace(/^["']|["']$/g, '');
	if (CRON_SECRET.length < 32) {
		console.error(
			`ERROR: CRON_SECRET in .env is suspiciously short (${CRON_SECRET.length} chars). ` +
				'Check for Pitfall #60 truncation (# or $ in value).'
		);
		process.exit(1);
	}
} catch (err) {
	console.error('ERROR reading .env:', err.message);
	process.exit(1);
}

// ── job definitions ────────────────────────────────────────────────────

// cron-job.org's schedule model:
//   - hours/minutes/mdays/months/wdays are arrays of integers.
//   - -1 in an array means "every" (e.g. mdays: [-1] = every day-of-month).
//   - timezone is a string like 'UTC' or 'Asia/Kolkata'.
const jobs = [
	{
		title: 'd1-billing-charge',
		url: `https://${TARGET_HOST}/api/cron/billing-charge`,
		// 30 20 * * * UTC = 02:00 IST
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [20],
			minutes: [30],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		title: 'd1-billing-charge-reminder',
		url: `https://${TARGET_HOST}/api/cron/billing-charge-reminder`,
		// 0 21 * * * UTC = 02:30 IST
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [21],
			minutes: [0],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		// D.1 S5 — dunning escalation walk. Fires AFTER the charge cron so
		// a charge that succeeds at 02:00 IST (recovers to active) is gone
		// from the dunning_* eligibility set before the advance cron looks.
		// Running them in the reverse order would email DSAs about a state
		// they're no longer in by the time the cron writes.
		title: 'd1-billing-dunning-advance',
		url: `https://${TARGET_HOST}/api/cron/billing-dunning-advance`,
		// 30 21 * * * UTC = 03:00 IST
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [21],
			minutes: [30],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		// D.1 S6 M6 — pause auto-cancel sweep. Day-60 reminder + day-90
		// auto-cancel for subscriptions paused too long. Fires AFTER the
		// dunning-advance cron so the operator dashboards' time window
		// for billing crons stays compact (02:00-04:00 IST band).
		// Independent from dunning logic — no ordering invariant.
		title: 'd1-billing-pause-sweep',
		url: `https://${TARGET_HOST}/api/cron/billing-pause-sweep`,
		// 0 22 * * * UTC = 03:30 IST
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [22],
			minutes: [0],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		// D.1 S7 — daily reconciliation. Compares Razorpay's settlement
		// report for the prior IST calendar day against our recorded
		// BillingTransactions; emails admin on drift > 0.
		//
		// Razorpay's settlement batch closes at ~23:30 IST per spec §4 S7,
		// so 04:00 IST gives a healthy 4.5-hour buffer past the cutoff
		// (avoids reconciling against an open batch). Runs LAST in the
		// 02:00-04:00 IST billing-cron window.
		title: 'd1-billing-reconcile',
		url: `https://${TARGET_HOST}/api/cron/billing-reconcile`,
		// 30 22 * * * UTC = 04:00 IST
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [22],
			minutes: [30],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		// QBC S3 — daily archive sweep. Runs LAST in the billing/cleanup
		// window (04:30 IST), AFTER billing-reconcile at 04:00 IST. Walks
		// quota_blocked cases >30 days old and flips is_archived=true.
		// Idempotent + cronLock-protected; missing a day is harmless.
		// Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §13 OQ-2.
		title: 'qbc-quota-blocked-archive',
		url: `https://${TARGET_HOST}/api/cron/quota-blocked-archive`,
		// 0 23 * * * UTC = 04:30 IST (previous day in UTC, same calendar day in IST)
		schedule: {
			timezone: 'UTC',
			expiresAt: 0,
			hours: [23],
			minutes: [0],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	},
	{
		// S221+1 — keep-warm probe against /api/health.
		// Fires every 4 minutes during business hours IST to keep the
		// Vercel function pool + Mongo connection warm. Mitigates the
		// Hobby-tier cold-start 504 surface on heavy endpoints.
		// Method is GET (not POST like the cron-endpoints) because
		// /api/health is a probe surface, not a state-mutating action.
		// Timeout 8s — keep-warm should never hold the function long.
		// Schedule: 09:00-22:59 IST, Mon-Sun. ~6,300 fires/month vs
		// ~10,800 for 24/7. See docs/runbooks/KEEP-WARM-CRON.md.
		title: 'keepwarm-health',
		url: `https://${TARGET_HOST}/api/cron/keep-warm`,
		requestMethodHttp: 'GET',
		requestTimeoutSec: 8,
		schedule: {
			timezone: 'Asia/Kolkata',
			expiresAt: 0,
			hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
			minutes: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56],
			mdays: [-1],
			months: [-1],
			wdays: [-1]
		}
	}
];

// Build a human-readable schedule line for the summary. Distinguishes
// single-shot daily fires (billing crons) from many-fires-per-day patterns
// (keep-warm) so the line is honest about what was provisioned.
function scheduleSummary(schedule) {
	const tz = schedule.timezone;
	const hh = schedule.hours;
	const mm = schedule.minutes;

	// Many-fires pattern: minutes array longer than 1 means "every N min".
	if (mm.length > 1) {
		const step = mm.length > 1 ? mm[1] - mm[0] : 1;
		const firstHour = hh[0];
		const lastHour = hh[hh.length - 1];
		return (
			`fires every ${step} min` +
			`, ${String(firstHour).padStart(2, '0')}:00–${String(lastHour).padStart(2, '0')}:59 ${tz}`
		);
	}

	// Single-shot daily.
	const hStr = String(hh[0]).padStart(2, '0');
	const mStr = String(mm[0]).padStart(2, '0');
	if (tz === 'UTC') {
		// Convert UTC to IST for operator readability (IST = UTC + 5:30).
		const istMinTotal = hh[0] * 60 + mm[0] + 330;
		const istHour = Math.floor(istMinTotal / 60) % 24;
		const istMin = istMinTotal % 60;
		return (
			`fires daily at ${hStr}:${mStr} UTC ` +
			`(= ${String(istHour).padStart(2, '0')}:${String(istMin).padStart(2, '0')} IST)`
		);
	}
	return `fires daily at ${hStr}:${mStr} ${tz}`;
}

// cron-job.org's requestMethod enum: 0=GET, 1=POST, 2=OPTIONS, 3=HEAD.
// Defaults to POST so the billing crons (which were the only consumers
// before S221+1's keep-warm addition) don't need to opt in.
function httpMethodToEnum(method) {
	return (method ?? 'POST') === 'GET' ? 0 : 1;
}

// Shared payload shape. spec may override:
//   requestMethodHttp  — 'GET' | 'POST' (default POST)
//   requestTimeoutSec  — seconds (default 60)
function jobPayload(spec) {
	return {
		job: {
			url: spec.url,
			enabled: true,
			saveResponses: true,
			schedule: spec.schedule,
			requestMethod: httpMethodToEnum(spec.requestMethodHttp),
			extendedData: {
				headers: {
					'x-cron-secret': CRON_SECRET
				}
			},
			title: spec.title,
			notification: {
				onFailure: true,
				onSuccess: false,
				onDisable: true
			},
			// Default 60s gives the billing crons headroom on Vercel cold
			// starts. The keep-warm probe overrides to 8s — it should never
			// hold the function long, and a fast failure surfaces real
			// outages instead of waiting out the default.
			requestTimeout: spec.requestTimeoutSec ?? 60
		}
	};
}

// ── API helpers ────────────────────────────────────────────────────────

async function api(method, path, body) {
	if (DRY_RUN) {
		console.log(`[DRY_RUN] ${method} ${API_BASE}${path}`);
		if (body) console.log(`[DRY_RUN] body keys: ${Object.keys(body.job ?? body).join(', ')}`);
		return { simulated: true };
	}

	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: body ? JSON.stringify(body) : undefined
	});

	const text = await res.text();
	let parsed;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = { raw: text };
	}

	if (!res.ok) {
		throw new Error(
			`cron-job.org API ${method} ${path} returned ${res.status}: ${JSON.stringify(parsed)}`
		);
	}
	return parsed;
}

async function listJobs() {
	const result = await api('GET', '/jobs');
	return result?.jobs ?? [];
}

async function createJob(spec) {
	const result = await api('PUT', '/jobs', jobPayload(spec));
	return result?.jobId;
}

async function updateJob(jobId, spec) {
	await api('PATCH', `/jobs/${jobId}`, jobPayload(spec));
	return jobId;
}

// ── idempotent upsert ──────────────────────────────────────────────────

async function upsertJob(spec) {
	const existing = await listJobs();
	const found = existing.find((j) => j.title === spec.title);

	if (found) {
		console.log(`  ↻ updating existing job  (id=${found.jobId}, title="${spec.title}")`);
		await updateJob(found.jobId, spec);
		return { jobId: found.jobId, action: 'updated' };
	}

	console.log(`  ✚ creating new job        (title="${spec.title}")`);
	const jobId = await createJob(spec);
	return { jobId, action: 'created' };
}

// ── verification: curl the endpoint to prove it works ──────────────────

async function verifyEndpoint(spec) {
	const method = spec.requestMethodHttp ?? 'POST';
	if (DRY_RUN) {
		console.log(`[DRY_RUN] would curl ${method} ${spec.url}`);
		return { simulated: true };
	}
	// redirect: 'manual' — cron-job.org does NOT follow redirects, so a 308
	// (e.g. apex → www) is a verification FAILURE not a transparent hop.
	// Without this, Node's fetch chases the redirect and returns the
	// downstream 200, masking the bug for the scheduled runs.
	const res = await fetch(spec.url, {
		method,
		headers: { 'x-cron-secret': CRON_SECRET },
		redirect: 'manual'
	});
	const body = await res.json().catch(() => ({}));
	return { status: res.status, body };
}

// ── main ───────────────────────────────────────────────────────────────

async function main() {
	console.log(`Target host: ${TARGET_HOST}`);
	console.log(`Mode: ${DRY_RUN ? 'DRY_RUN (no API calls)' : 'LIVE'}`);
	console.log(`CRON_SECRET: ${CRON_SECRET.slice(0, 8)}...${CRON_SECRET.slice(-4)} (${CRON_SECRET.length} chars)`);
	console.log('');

	// Step 1: upsert both jobs
	console.log('=== Step 1: upsert cron-job.org jobs ===');
	const results = [];
	for (const spec of jobs) {
		const result = await upsertJob(spec);
		results.push({ ...result, title: spec.title, url: spec.url, schedule: spec.schedule });
	}

	console.log('');
	console.log('=== Step 2: verify endpoints respond with HTTP 200 ===');
	for (const job of jobs) {
		const method = job.requestMethodHttp ?? 'POST';
		console.log(`  ${method} ${job.url}`);
		try {
			const verify = await verifyEndpoint(job);
			if (verify.simulated) continue;
			const ok = verify.status === 200;
			console.log(`    ${ok ? '✅' : '❌'} HTTP ${verify.status}`);
			if (verify.body?.data) {
				const summary = Object.entries(verify.body.data)
					.filter(([k, v]) => typeof v !== 'object' && v !== null)
					.map(([k, v]) => `${k}=${v}`)
					.join(', ');
				console.log(`    body: ${summary}`);
			} else if (verify.body?.ok !== undefined) {
				// /api/health response shape — flatter than /api/cron/*.
				const summary = Object.entries(verify.body)
					.map(([k, v]) => `${k}=${v}`)
					.join(', ');
				console.log(`    body: ${summary}`);
			}
		} catch (err) {
			console.log(`    ❌ verification failed: ${err.message}`);
		}
	}

	console.log('');
	console.log('=== Step 3: summary ===');
	for (const r of results) {
		const summary = scheduleSummary(r.schedule);
		console.log(
			`  ${r.action.padEnd(8)} ${r.title.padEnd(28)} jobId=${r.jobId}  ${summary}`
		);
	}
	console.log('');
	console.log('Done. cron-job.org dashboard: https://console.cron-job.org/jobs');
	console.log(
		'Failure notifications go to the email on your cron-job.org account.'
	);
}

main().catch((err) => {
	console.error('\nFATAL:', err.message);
	process.exit(1);
});
