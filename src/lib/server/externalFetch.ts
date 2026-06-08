/**
 * External Fetch Utility
 * ══════════════════════════════════════════════════════════════════
 * Wrapper for external API calls (MSG91, OpenAI, Anthropic, etc.)
 * Adds timeout protection, structured logging, and optional retry.
 *
 * Use this instead of bare `fetch()` for ALL third-party API calls.
 * Internal SvelteKit fetch calls (e.g., to /api/auth/check-dsa)
 * should continue using the SvelteKit-provided `fetch` directly.
 * ══════════════════════════════════════════════════════════════════
 */

import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import logger from './logger.js';

// Tracer instance — when OTEL_ENABLED isn't set, the OTel API is a no-op
// pass-through (no overhead). The tracer name appears in span metadata for
// grouping in observability dashboards.
const tracer = trace.getTracer('digitaldsa-v3.external-fetch');

// ── Types ─────────────────────────────────────────────────────────

interface ExternalFetchOptions {
	/** Human-readable service name for structured logging (e.g., 'msg91', 'openai') */
	service: string;

	/** Timeout in milliseconds. Default: 10_000 (10 seconds) */
	timeoutMs?: number;

	/** Number of retries on failure. Default: 0 (no retry) */
	retries?: number;
}

// ── Main Function ─────────────────────────────────────────────────

/**
 * Fetch with timeout, retry, and structured error logging.
 *
 * - Wraps each attempt in an AbortController-based timeout
 * - Logs non-OK responses as warnings (caller still gets the Response)
 * - Retries with exponential backoff (500ms, 1s, 2s, ...) on network failures
 * - Throws the final error after all retries are exhausted
 *
 * @param url      - External API URL
 * @param init     - Standard RequestInit (method, headers, body, etc.)
 * @param options  - Service name, timeout, and retry configuration
 * @returns        - The Response object (even if status is non-OK)
 * @throws         - On timeout or network error after all retries exhausted
 */
export async function externalFetch(
	url: string,
	init: RequestInit,
	options: ExternalFetchOptions
): Promise<Response> {
	const { timeoutMs = 10_000, service, retries = 0 } = options;
	const method = (init.method ?? 'GET').toUpperCase();

	// OBS-2: span name `external.<service>.<METHOD>` groups all calls to the
	// same service+verb in observability tools (e.g. external.msg91.POST).
	// The auto-instrumented Undici span will appear as a child with the
	// HTTP-level detail (status, host, etc.). When OTEL_ENABLED is unset,
	// startActiveSpan is a no-op pass-through — zero runtime cost.
	return tracer.startActiveSpan(
		`external.${service}.${method}`,
		{ attributes: { 'app.service': service, 'http.request.method': method } },
		async (span: Span) => {
			try {
				return await runFetchWithRetry(url, init, { timeoutMs, service, retries }, span);
			} finally {
				span.end();
			}
		}
	);
}

async function runFetchWithRetry(
	url: string,
	init: RequestInit,
	options: { timeoutMs: number; service: string; retries: number },
	span: Span
): Promise<Response> {
	const { timeoutMs, service, retries } = options;
	for (let attempt = 0; attempt <= retries; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			// Make the request with abort signal for timeout protection
			const response = await fetch(url, {
				...init,
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			span.setAttribute('http.response.status_code', response.status);

			// Log non-OK responses as warnings (caller still receives the response)
			if (!response.ok) {
				// Strip query params from URL to avoid leaking tokens in logs
				const sanitizedUrl = url.split('?')[0];
				logger.warn(
					{ service, status: response.status, url: sanitizedUrl },
					`${service} API returned non-OK status`
				);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: `non-OK ${response.status}`
				});
			} else {
				span.setStatus({ code: SpanStatusCode.OK });
			}

			return response;
		} catch (error: unknown) {
			clearTimeout(timeoutId);

			// Determine if this was a timeout (AbortError) or a network failure
			const isTimeout = error instanceof DOMException && error.name === 'AbortError';

			// Strip query params from URL to avoid leaking tokens in logs
			const sanitizedUrl = url.split('?')[0];

			logger.error(
				{
					err: error,
					service,
					url: sanitizedUrl,
					attempt: attempt + 1,
					maxAttempts: retries + 1
				},
				isTimeout
					? `${service} API request timed out after ${timeoutMs}ms`
					: `${service} API request failed`
			);

			// If we have retries left, wait with exponential backoff before trying again
			if (attempt < retries) {
				const delayMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s, 4s, ...
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			// All retries exhausted — throw the final error
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: isTimeout ? `timeout after ${timeoutMs}ms` : 'network error'
			});
			throw error;
		}
	}

	// TypeScript exhaustiveness: should never reach here since the loop
	// either returns a response or throws after the last attempt
	throw new Error(`${service} fetch failed after ${retries + 1} attempts`);
}
