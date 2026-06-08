/**
 * PATCH /api/admin/policies/proxy-capture/[capture_id]
 * ═══════════════════════════════════════════════════════════════════
 * A.2 — admin autosave for a proxy capture (the wizard's autosave target
 * when apiBase points here). Mirrors the RM autosave, but admin-scoped and
 * guarded to `admin_manual_proxy` captures ONLY — an admin can never edit an
 * RM's self-capture through this route (keeps the SEC-5 ownership model intact).
 *
 * Auth: admin role + `rule_authoring` permission.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission, blockDemoWrite } from '$lib/server/guards.js';
import { PolicyCaptures } from '$lib/database/mongo.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

const VALID_DATA_KEYS = new Set([
	'core_parameters',
	'eligibility',
	'credit_cibil',
	'income_assessment',
	'property_rules',
	'obligations',
	'bt_topup',
	'fees_policies',
	'deviations',
	'special_conditions'
]);

/** Only proxy captures are editable through the admin route. */
const PROXY_FILTER = (captureId: string) => ({
	capture_id: captureId,
	'provenance.source_type': 'admin_manual_proxy'
});

export const PATCH: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Autosave fires repeatedly while the admin types — generous per-minute
	// cap that still bounds a runaway/abusive client.
	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 120,
		windowMs: 60 * 1000,
		identifier: `proxy-capture-save:${locals.user!.id}`
	});
	if (limited) return apiError('Too many save requests. Please slow down.', 429);

	try {
		const capture = await PolicyCaptures.findOne(PROXY_FILTER(params.capture_id));
		if (!capture) return apiError('Proxy capture not found', 404);
		if (capture.status !== 'draft') return apiError('Only draft captures can be edited');

		const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;

		const update: Record<string, unknown> = { updated_at: new Date() };

		if (
			typeof body.current_step === 'number' &&
			Number.isInteger(body.current_step) &&
			body.current_step >= 0 &&
			body.current_step <= 9
		) {
			update.current_step = body.current_step;
		}
		if (
			Array.isArray(body.completed_steps) &&
			body.completed_steps.every(
				(s: unknown) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= 9
			)
		) {
			update.completed_steps = body.completed_steps;
		}
		if (
			typeof body.completion_percent === 'number' &&
			body.completion_percent >= 0 &&
			body.completion_percent <= 100
		) {
			update.completion_percent = body.completion_percent;
		}
		if (
			Array.isArray(body.unknown_fields) &&
			body.unknown_fields.every((f: unknown) => typeof f === 'string')
		) {
			update.unknown_fields = body.unknown_fields;
		}
		if (body.data && typeof body.data === 'object') {
			for (const [key, value] of Object.entries(body.data as Record<string, unknown>)) {
				if (VALID_DATA_KEYS.has(key)) update[`data.${key}`] = value;
			}
		}

		await PolicyCaptures.updateOne(PROXY_FILTER(params.capture_id), { $set: update });
		return apiOk({ saved: true });
	} catch (err) {
		return apiServerError(err, 'Failed to save proxy capture');
	}
};
