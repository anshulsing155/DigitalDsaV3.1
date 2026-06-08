/**
 * GET  /api/admin/settings/api-keys — list all keys (masked, NEVER expose full value)
 * POST /api/admin/settings/api-keys — add a new key
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ApiKeys, PolicyAuditLogs } from '$lib/database/mongo.js';
import { encrypt, getLastFour } from '$lib/server/encryption.js';
import { randomUUID } from 'crypto';
import type { ApiKeyProvider } from '$lib/types/policyEngine.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

const VALID_PROVIDERS: ApiKeyProvider[] = [
	'openai',
	'anthropic',
	'google_gemini',
	'imagekit',
	'msg91',
	'razorpay',
	'credit_bureau',
	'other'
];

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	try {
		const keys = await ApiKeys.find({})
			.sort({ created_at: -1 })
			.project({ encrypted_value: 0 }) // NEVER return encrypted value
			.toArray();

		return apiOk(
			keys.map((k) => ({
				_id: k._id.toString(),
				key_id: k.key_id,
				provider: k.provider,
				label: k.label,
				last_four: k.last_four,
				is_active: k.is_active,
				last_used: k.last_used ? new Date(k.last_used).toISOString() : null,
				created_at: k.created_at ? new Date(k.created_at).toISOString() : null,
				updated_at: k.updated_at ? new Date(k.updated_at).toISOString() : null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list API keys');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{ provider: ApiKeyProvider; label: string; value: string }>(
		request
	);
	if (!parsed.ok) return parsed.response;
	const { provider, label, value } = parsed.data;

	try {
		if (!provider || !VALID_PROVIDERS.includes(provider)) {
			return apiError('Invalid provider', 400);
		}
		if (!label || typeof label !== 'string' || label.trim().length === 0) {
			return apiError('Label is required', 400);
		}
		if (!value || typeof value !== 'string' || value.trim().length < 8) {
			return apiError('API key value must be at least 8 characters', 400);
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		const newKey = {
			key_id: randomUUID(),
			provider: provider as ApiKeyProvider,
			label: label.trim(),
			encrypted_value: encrypt(value.trim()),
			last_four: getLastFour(value.trim()),
			is_active: true,
			last_used: null,
			created_by: actorId,
			created_at: now,
			updated_at: now
		};

		await ApiKeys.insertOne(newKey as any);

		// Audit log
		await PolicyAuditLogs.insertOne({
			target_type: 'lender', // reuse closest target_type
			target_id: newKey.key_id,
			action: 'lender_created', // reuse closest action
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { type: 'api_key_created', provider, label: label.trim() },
			created_at: now
		} as any);

		return apiOk({
			key_id: newKey.key_id,
			provider: newKey.provider,
			label: newKey.label,
			last_four: newKey.last_four
		});
	} catch (err) {
		return apiServerError(err, 'Failed to create API key');
	}
};
