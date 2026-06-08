/**
 * Standardized API Response Helpers
 * ══════════════════════════════════════════════════════════════════
 * Codifies the existing { success, data, error } response pattern
 * used throughout the codebase (originally established in guards.ts).
 *
 * Usage:
 *   import { apiOk, apiError, apiValidationError, parseJsonBody } from '$lib/server/apiResponse';
 *
 * Shape (always consistent):
 *   { success: boolean, data?: T, error?: string, details?: unknown }
 *
 * These helpers are thin wrappers around SvelteKit's json() — they
 * exist solely to enforce consistency and reduce boilerplate.
 * ══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import logger from '$lib/server/logger.js';

// ── Success Responses ───────────────────────────────────────────

/**
 * Standard success response.
 *
 * @example
 * return apiOk({ cases });                        // 200, { success: true, data: { cases } }
 * return apiOk();                                  // 200, { success: true }
 * return apiOk({ id: result.insertedId }, 201);    // 201, { success: true, data: { id } }
 */
export function apiOk<T = unknown>(data?: T, status = 200): Response {
	if (data !== undefined) {
		return json({ success: true, data }, { status });
	}
	return json({ success: true }, { status });
}

/**
 * Success response with a message (e.g., confirmations, info).
 *
 * @example
 * return apiOkMessage('Case updated successfully');
 */
export function apiOkMessage(message: string, status = 200): Response {
	return json({ success: true, message }, { status });
}

// ── Error Responses ─────────────────────────────────────────────

/**
 * Standard error response.
 *
 * @example
 * return apiError('Case not found', 404);
 * return apiError('Something went wrong');          // defaults to 400
 */
export function apiError(message: string, status = 400): Response {
	return json({ success: false, error: message }, { status });
}

/**
 * Server error response — logs the error, returns generic message.
 * Use this in catch blocks to avoid leaking internal details.
 *
 * Optional `context` is merged into the log record so route-specific
 * IDs (case_id, version_id, etc.) survive the migration from a
 * hand-rolled `logger.error({err, caseId}, msg)`. Keep it small — log
 * pipelines aren't free, and never pass PII (names, emails, mobile
 * numbers, full request bodies) here.
 *
 * @example
 * catch (err) {
 *   return apiServerError(err, 'Failed to create case');
 *   return apiServerError(err, 'Failed to activate capture', { captureId: params.capture_id });
 * }
 */
export function apiServerError(
	err: unknown,
	message = 'Internal server error',
	context?: Record<string, unknown>
): Response {
	logger.error({ ...(context ?? {}), err }, message);
	return json({ success: false, error: message }, { status: 500 });
}

/**
 * Validation error response with structured details.
 *
 * @example
 * return apiValidationError('Validation failed', { name: 'Name is required' });
 * return apiValidationError('Invalid input', ['Field X is required', 'Field Y too short']);
 */
export function apiValidationError(message: string, details: unknown): Response {
	return json({ success: false, error: message, details }, { status: 400 });
}

/**
 * Error response with arbitrary structured payload merged into the body.
 *
 * Use this when the client needs more than a string message to render the
 * error UI (e.g. quota state for a topup modal, retry-after metadata,
 * field-level conflict details). The `success` and `error` keys are spread
 * last so the payload cannot accidentally overwrite them.
 *
 * Prefer `apiError()` for simple message-only errors and `apiValidationError()`
 * for Zod/field validation failures — this helper exists specifically for
 * the rare case where neither shape fits.
 *
 * @example
 * return apiStructuredError('DA quota exhausted', {
 *   consumed: 12,
 *   total: 10,
 *   can_topup: true
 * }, 402);
 */
export function apiStructuredError(
	message: string,
	payload: Record<string, unknown>,
	status = 400
): Response {
	return json({ ...payload, success: false, error: message }, { status });
}

// ── JSON Body Parsing ───────────────────────────────────────────

/**
 * Safe JSON body parser — wraps request.json() with error handling.
 * Returns a discriminated union so callers can pattern-match.
 *
 * @example
 * const parsed = await parseJsonBody<{ name: string }>(request);
 * if (!parsed.ok) return parsed.response;
 * const { name } = parsed.data;
 */
export async function parseJsonBody<T = Record<string, unknown>>(
	request: Request
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
	try {
		const data = (await request.json()) as T;
		return { ok: true, data };
	} catch {
		return {
			ok: false,
			response: json({ success: false, error: 'Invalid or missing JSON body' }, { status: 400 })
		};
	}
}
