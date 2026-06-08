/**
 * PATCH  /api/admin/settings/api-keys/[key_id] — toggle active/revoke
 * PUT    /api/admin/settings/api-keys/[key_id] — rotate (replace value)
 * DELETE /api/admin/settings/api-keys/[key_id] — permanently delete
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ApiKeys, PolicyAuditLogs } from '$lib/database/mongo.js';
import { encrypt, getLastFour } from '$lib/server/encryption.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// PUT rotates the underlying secret. Real API keys (OpenAI, Anthropic,
// MSG91, ImageKit, etc.) all exceed 30 chars — a 32-char min defends against
// truncated/test/garbage values. Hand-typed 8-char floor previously slipped
// 12-char garbage past validation.
const putRequestSchema = z.object({
	value: z.string().min(32).max(500)
});

export const PATCH: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	try {
		const { key_id } = params;
		if (!key_id) return apiError('key_id is required', 400);

		const existing = await ApiKeys.findOne({ key_id });
		if (!existing) return apiError('API key not found', 404);

		const newActive = !existing.is_active;
		const now = new Date();

		await ApiKeys.updateOne({ key_id }, { $set: { is_active: newActive, updated_at: now } });

		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: key_id,
			action: 'lender_updated',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { type: 'api_key_toggled', is_active: newActive, provider: existing.provider },
			created_at: now
		} as any);

		return apiOk({ key_id, is_active: newActive });
	} catch (err) {
		return apiServerError(err, 'Failed to toggle API key');
	}
};

export const PUT: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = putRequestSchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid body', validation.error.flatten());
	}
	const { value } = validation.data;
	const trimmed = value.trim();
	if (trimmed.length < 32) {
		return apiError('API key value must be at least 32 characters after trimming', 400);
	}

	try {
		const { key_id } = params;
		if (!key_id) return apiError('key_id is required', 400);

		const existing = await ApiKeys.findOne({ key_id });
		if (!existing) return apiError('API key not found', 404);

		const now = new Date();
		await ApiKeys.updateOne(
			{ key_id },
			{
				$set: {
					encrypted_value: encrypt(trimmed),
					last_four: getLastFour(trimmed),
					updated_at: now
				}
			}
		);

		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: key_id,
			action: 'lender_updated',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { type: 'api_key_rotated', provider: existing.provider },
			created_at: now
		} as any);

		return apiOk({ key_id, last_four: getLastFour(trimmed) });
	} catch (err) {
		return apiServerError(err, 'Failed to rotate API key');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	try {
		const { key_id } = params;
		if (!key_id) return apiError('key_id is required', 400);

		const existing = await ApiKeys.findOne({ key_id });
		if (!existing) return apiError('API key not found', 404);

		await ApiKeys.deleteOne({ key_id });

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: key_id,
			action: 'lender_updated',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { type: 'api_key_deleted', provider: existing.provider, label: existing.label },
			created_at: now
		} as any);

		return apiOk({ key_id, deleted: true });
	} catch (err) {
		return apiServerError(err, 'Failed to delete API key');
	}
};
