/**
 * Client-side hooks — runs in the browser only, never on the server.
 *
 * STALE-CHUNK AUTO-RELOAD
 * ───────────────────────
 * Every Vercel deployment produces new content-hashed JS chunks under
 * /_app/immutable/nodes/. If a user's browser has the previous deployment's
 * HTML cached, SvelteKit's client-side router tries to import old chunk
 * filenames that no longer exist on the CDN → dynamic import throws
 * "Failed to fetch dynamically imported module" → navigation crashes with a
 * blank 500 error page.
 *
 * The fix: detect that specific error in handleError and do a full hard reload.
 * On the reloaded request, the server returns fresh HTML with the new chunk
 * filenames, and everything works normally.
 *
 * A reload-loop guard (sessionStorage flag) prevents infinite reloads if the
 * chunk truly doesn't exist even after a fresh deploy.
 *
 * ERROR REPORTING (OBS-1)
 * ───────────────────────
 * SvelteKit's HandleClientError fires for errors the framework catches —
 * throws in `load` functions, component render errors, navigation failures.
 * These often don't bubble to window.error, so ErrorBoundary.svelte's
 * listeners never see them. We forward them to /api/errors/report so the
 * server-side sendErrorAlert pipeline (dedup, rate-limit, email) reports
 * them the same way SSR errors are reported.
 */

import type { HandleClientError } from '@sveltejs/kit';
import { dev } from '$app/environment';

const RELOAD_FLAG_KEY = 'ddsa-chunk-reload-attempted';
const RELOAD_WINDOW_MS = 30_000; // don't attempt more than once per 30 seconds

/**
 * Same noise filter as ErrorBoundary.svelte — keep the two in sync. Returns
 * false for known non-critical errors that aren't worth emailing about.
 */
function isReportable(message: string, stack: string): boolean {
	const allText = message + ' ' + stack;
	if (/chrome-extension:\/\/|moz-extension:\/\/|safari-web-extension:\/\//.test(allText)) {
		return false;
	}
	if (/razorpay\.com|googletagmanager\.com|google-analytics\.com|doubleclick\.net/.test(allText)) {
		return false;
	}
	if (
		/Failed to register a ServiceWorker/i.test(allText) ||
		/ResizeObserver loop (limit exceeded|completed)/i.test(allText) ||
		/^Script error\.?$/.test(message)
	) {
		return false;
	}
	return true;
}

/**
 * Fire-and-forget POST to the server reporting endpoint. Wrapped in try/catch
 * so a failed report can't itself trigger another error event (would create
 * an infinite reporting loop). Plain fetch is fine here — this endpoint
 * doesn't require CSRF since it's authenticated only by IP rate limiting.
 */
function reportToServer(payload: { message: string; stack?: string; path: string }): void {
	try {
		// Use sendBeacon when available — survives page unload, fire-and-forget.
		const body = JSON.stringify(payload);
		if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
			const blob = new Blob([body], { type: 'application/json' });
			navigator.sendBeacon('/api/errors/report', blob);
			return;
		}
		void fetch('/api/errors/report', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {
			// best-effort — never throw out of this function
		});
	} catch {
		// best-effort — never throw out of this function
	}
}

export const handleError: HandleClientError = ({ error, event }) => {
	const err = error as Error | undefined;
	const message = err?.message ?? '';

	// Detect a failed dynamic chunk import — the error message differs by browser
	const isChunkLoadError =
		message.includes('Failed to fetch dynamically imported module') ||
		message.includes('error loading dynamically imported module') ||
		message.includes('Importing a module script failed') ||
		message.includes('Loading chunk') ||
		message.includes('ChunkLoadError');

	if (isChunkLoadError) {
		// Check if we've already tried a reload recently (loop guard)
		const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? '0');
		const now = Date.now();

		if (now - lastReload > RELOAD_WINDOW_MS) {
			// Mark the attempt and force a hard reload to fetch fresh HTML + chunks
			sessionStorage.setItem(RELOAD_FLAG_KEY, String(now));
			window.location.reload();
			// Return early — the reload is in flight, no error to report
			return { message: 'Refreshing to load the latest version…' };
		}
	}

	// In production, forward reportable errors to the server alert pipeline.
	// Dev gets DevTools — no email noise during local development.
	if (!dev && err && isReportable(message, err.stack ?? '')) {
		reportToServer({
			message: message || '(no message)',
			stack: err.stack,
			path: event?.url ? event.url.pathname + event.url.search : 'unknown'
		});
	}

	// For all other errors, return a generic message for the error page
	return {
		message: 'An unexpected error occurred. Please try refreshing the page.'
	};
};
