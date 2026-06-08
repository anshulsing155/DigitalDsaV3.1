/**
 * Error alerting — sends an email to the project email address when a critical
 * SSR error or client-side fatal error occurs.
 *
 * Built-in safeguards (these matter — without them a single buggy page can
 * flood your inbox):
 *   - Per-fingerprint dedup: same error within DEDUP_WINDOW_MS = one email
 *   - Global rate limit: max GLOBAL_MAX_PER_HOUR emails/hour total
 *   - Best-effort: failures are logged but never throw to caller (no
 *     error-reporting-error feedback loops)
 *
 * Storage is in-memory (per-Lambda instance). Cross-instance dedup would
 * require Redis/Mongo — not worth the complexity for v1.
 */

import { sendEmail } from '$lib/server/email.js';
import { escapeHtml } from '$lib/utils/sanitize.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { env } from '$env/dynamic/private';

// Read from env at runtime so staging vs prod can route to different inboxes.
// Falls back to the historical recipient if unset to preserve current behaviour.
const ALERT_RECIPIENT = env.ALERT_RECIPIENT_EMAIL || 'tech@digitaldsa.com';
const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 min — same fingerprint counts once
// Server-side sub-500 responses (404 / 401 / 403) are dominated by bot
// reconnaissance — well-known framework probes hitting paths we don't serve.
// Collapsing them all to a single fingerprint with a 1-hour window means at
// most one email/hour during a scan campaign, leaving the 30/hour budget for
// genuine 5xx incidents. The collapse intentionally loses per-path detail —
// see SUB500_NOISE_FP below — the trade-off is a known one.
const DEDUP_WINDOW_SUB500_MS = 60 * 60 * 1000;
const GLOBAL_MAX_PER_HOUR = 30;

// Sentinel fingerprint used for collapsing scanner noise. Anything matching
// this key shares one dedup slot for an hour. Kept as a stable string so
// downstream log analysis can filter on it without parsing fingerprints.
export const SUB500_NOISE_FP = 'ssr|sub-500-noise';

const recentFingerprints = new Map<string, number>();

export interface ErrorAlertPayload {
	source: 'ssr' | 'client';
	message: string;
	stack?: string;
	path: string;
	method?: string;
	userAgent?: string;
	timestamp: string;
	// HTTP status of the response that triggered the alert. Only meaningful for
	// `source: 'ssr'` — client errors are JS exceptions with no HTTP status.
	// When omitted, we treat as 500+ (alert path) — safer default than silently
	// suppressing on a missing field.
	status?: number;
	extra?: Record<string, unknown>;
}

/**
 * Build a stable fingerprint that identifies "the same error".
 *
 * Two shapes:
 *   1. SSR responses with status < 500 → SUB500_NOISE_FP (one bucket for all).
 *      These are virtually always bot probes for paths we don't serve, plus
 *      the occasional intentional `throw error(404, …)` from a load function.
 *      None are wake-me-up-worthy individually; one heartbeat per hour is
 *      enough to confirm the alerter is alive.
 *   2. Everything else → source + path + first 200 chars of message + first
 *      stack frame. Different stack frames or different routes → different
 *      fingerprint. This is the original behaviour and what catches a buggy
 *      page that errors on every request.
 *
 * Exported for `errorAlertFingerprint.test.ts` (lock test).
 */
export function fingerprint(p: ErrorAlertPayload): string {
	if (p.source === 'ssr' && typeof p.status === 'number' && p.status < 500) {
		return SUB500_NOISE_FP;
	}
	const firstFrame =
		p.stack
			?.split('\n')
			.find((line) => line.trim().startsWith('at '))
			?.trim() ?? '';
	return `${p.source}|${p.path}|${p.message.slice(0, 200)}|${firstFrame.slice(0, 150)}`;
}

/**
 * Choose the dedup window for a given fingerprint. The collapsed sub-500
 * bucket gets a longer window so a single scan campaign produces at most one
 * email; everything else keeps the 15-minute default.
 *
 * Exported for the lock test.
 */
export function dedupWindowFor(fp: string): number {
	return fp === SUB500_NOISE_FP ? DEDUP_WINDOW_SUB500_MS : DEDUP_WINDOW_MS;
}

export async function sendErrorAlert(payload: ErrorAlertPayload): Promise<void> {
	try {
		// Global cap so a runaway error storm can't flood the inbox
		const blocked = await rateLimit('error-alert-global', {
			maxRequests: GLOBAL_MAX_PER_HOUR,
			windowMs: 60 * 60 * 1000,
			identifier: 'error-alert-global'
		});
		if (blocked) {
			logger.warn(
				{ payload: { source: payload.source, path: payload.path } },
				'Error alert suppressed — global hourly cap reached'
			);
			return;
		}

		// Per-fingerprint dedup so the same error doesn't email twice in a row.
		// The window is per-fingerprint — sub-500 noise collapses to one bucket
		// with a 1-hour window; everything else stays at 15 minutes.
		const fp = fingerprint(payload);
		const window = dedupWindowFor(fp);
		const now = Date.now();
		const last = recentFingerprints.get(fp);
		if (last && now - last < window) {
			logger.debug({ fp }, 'Error alert deduplicated');
			return;
		}
		recentFingerprints.set(fp, now);

		// Bound the in-memory map so it can't grow forever. Use the longer of
		// the two windows as the prune cutoff — entries older than that can't
		// dedupe anything anyway.
		if (recentFingerprints.size > 500) {
			const cutoff = now - Math.max(DEDUP_WINDOW_MS, DEDUP_WINDOW_SUB500_MS);
			for (const [k, t] of recentFingerprints) {
				if (t < cutoff) recentFingerprints.delete(k);
			}
		}

		const result = await sendEmail({
			to: ALERT_RECIPIENT,
			subject: `[DigitalDSA ${payload.source.toUpperCase()}] ${payload.message.slice(0, 80)}`,
			html: buildHtml(payload),
			text: buildText(payload)
		});

		if (!result.success) {
			logger.error(
				{ error: result.error, source: payload.source, path: payload.path },
				'Failed to send error alert email'
			);
		}
	} catch (err) {
		// Alerting must never throw to caller — would create error-reporting-error
		// feedback loop where the failed email triggers another alert.
		logger.error({ err, source: payload.source }, 'sendErrorAlert threw — swallowed');
	}
}

function buildHtml(p: ErrorAlertPayload): string {
	const headerColor = p.source === 'ssr' ? '#dc2626' : '#f59e0b';
	const stackHtml = p.stack
		? `<div style="margin-top:16px"><div style="color:#6b7280;font-size:13px;margin-bottom:6px">Stack trace</div><pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;color:#1f2937;margin:0">${escapeHtml(p.stack)}</pre></div>`
		: '';
	const extraHtml =
		p.extra && Object.keys(p.extra).length
			? `<div style="margin-top:16px"><div style="color:#6b7280;font-size:13px;margin-bottom:6px">Extra context</div><pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;color:#1f2937;margin:0">${escapeHtml(JSON.stringify(p.extra, null, 2))}</pre></div>`
			: '';
	const methodRow = p.method
		? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Method</td><td style="padding:8px 0"><code>${escapeHtml(p.method)}</code></td></tr>`
		: '';
	const uaRow = p.userAgent
		? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">User-Agent</td><td style="padding:8px 0;font-size:12px;color:#374151">${escapeHtml(p.userAgent)}</td></tr>`
		: '';

	return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fb;padding:24px;margin:0">
  <div style="max-width:720px;margin:0 auto;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:hidden">
    <div style="background:${headerColor};color:white;padding:16px 24px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.9">${escapeHtml(p.source.toUpperCase())} ERROR</div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${escapeHtml(p.message)}</div>
    </div>
    <div style="padding:24px">
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;vertical-align:top">Path</td><td style="padding:8px 0"><code>${escapeHtml(p.path)}</code></td></tr>
        ${methodRow}
        <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">When</td><td style="padding:8px 0">${escapeHtml(p.timestamp)}</td></tr>
        ${uaRow}
      </table>
      ${stackHtml}
      ${extraHtml}
    </div>
    <div style="background:#f9fafb;padding:12px 24px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
      DigitalDSA error alerting · per-fingerprint dedup 15min · global cap 30/hour
    </div>
  </div>
</body></html>`;
}

function buildText(p: ErrorAlertPayload): string {
	const lines = [
		`[${p.source.toUpperCase()}] ${p.message}`,
		``,
		`Path:      ${p.path}`,
		p.method ? `Method:    ${p.method}` : '',
		`When:      ${p.timestamp}`,
		p.userAgent ? `UA:        ${p.userAgent}` : ''
	].filter(Boolean);
	if (p.stack) {
		lines.push('', 'Stack:', p.stack);
	}
	if (p.extra && Object.keys(p.extra).length) {
		lines.push('', 'Extra:', JSON.stringify(p.extra, null, 2));
	}
	return lines.join('\n');
}
