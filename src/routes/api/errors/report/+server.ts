/**
 * Client error reporting endpoint.
 *
 * Called by ErrorBoundary.svelte (and any other client-side surface) when a
 * critical error occurs. Forwards to sendErrorAlert which handles dedup,
 * rate-limit, and email delivery.
 *
 * Per-IP rate limit prevents a single client from spamming reports.
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { sendErrorAlert } from '$lib/server/errorAlert.js';

interface ClientErrorReport {
	message: string;
	stack?: string;
	filename?: string;
	path: string;
	extra?: Record<string, unknown>;
}

const MAX_MESSAGE = 500;
const MAX_STACK = 5000;
const MAX_PATH = 500;
const MAX_FILENAME = 500;
const MAX_UA = 500;

function truncate(s: string | undefined, max: number): string | undefined {
	return s ? s.slice(0, max) : undefined;
}

export const POST: RequestHandler = async (event) => {
	// Per-IP cap so a single broken client can't flood reports
	const ip = event.getClientAddress();
	const blocked = await rateLimit(ip, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: 'error-report'
	});
	if (blocked) {
		return apiError('Too many error reports', 429);
	}

	const parsed = await parseJsonBody<ClientErrorReport>(event.request);
	if (!parsed.ok) {
		return parsed.response;
	}
	const payload = parsed.data;

	if (!payload?.message || typeof payload.message !== 'string') {
		return apiError('Missing message', 400);
	}

	// Fire-and-forget — sendErrorAlert handles its own errors and never throws
	sendErrorAlert({
		source: 'client',
		message: truncate(payload.message, MAX_MESSAGE)!,
		stack: truncate(payload.stack, MAX_STACK),
		path: truncate(payload.path, MAX_PATH) ?? 'unknown',
		userAgent: truncate(event.request.headers.get('user-agent') ?? undefined, MAX_UA),
		timestamp: new Date().toISOString(),
		extra: {
			...(payload.filename ? { filename: truncate(payload.filename, MAX_FILENAME) } : {}),
			...(payload.extra ?? {})
		}
	});

	return apiOk({ reported: true });
};
