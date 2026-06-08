/**
 * GET  /api/admin/settings/system-configs — list all configs
 * POST /api/admin/settings/system-configs — upsert a config value
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { SystemConfigs, PolicyAuditLogs } from '$lib/database/mongo.js';
import { DEFAULT_SYSTEM_CONFIGS } from '$lib/types/policyEngine.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	try {
		const configs = await SystemConfigs.find({}).sort({ group: 1, config_key: 1 }).toArray();

		// If no configs exist yet, seed defaults
		if (configs.length === 0) {
			const now = new Date();
			const seeded = DEFAULT_SYSTEM_CONFIGS.map((c) => ({
				...c,
				updated_by: 'system',
				updated_at: now
			}));
			await SystemConfigs.insertMany(seeded as any[]);
			const freshConfigs = await SystemConfigs.find({}).sort({ group: 1, config_key: 1 }).toArray();
			return apiOk(
				freshConfigs.map((c) => ({
					_id: c._id.toString(),
					config_key: c.config_key,
					value: c.value,
					label: c.label,
					description: c.description,
					group: c.group,
					value_type: c.value_type,
					updated_by: c.updated_by,
					updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : null
				}))
			);
		}

		return apiOk(
			configs.map((c) => ({
				_id: c._id.toString(),
				config_key: c.config_key,
				value: c.value,
				label: c.label,
				description: c.description,
				group: c.group,
				value_type: c.value_type,
				updated_by: c.updated_by,
				updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list system configs');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'system_settings');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{ config_key: string; value: unknown }>(request);
	if (!parsed.ok) return parsed.response;
	const { config_key, value } = parsed.data;

	try {
		if (!config_key || typeof config_key !== 'string') {
			return apiError('config_key is required', 400);
		}
		if (value === undefined) {
			return apiError('value is required', 400);
		}

		const existing = await SystemConfigs.findOne({ config_key });
		if (!existing) {
			return apiError('Unknown config key', 404);
		}

		// Type validation
		if (existing.value_type === 'boolean' && typeof value !== 'boolean') {
			return apiError('Value must be a boolean', 400);
		}
		if (existing.value_type === 'number' && typeof value !== 'number') {
			return apiError('Value must be a number', 400);
		}
		if (existing.value_type === 'string' && typeof value !== 'string') {
			return apiError('Value must be a string', 400);
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';
		const oldValue = existing.value;

		await SystemConfigs.updateOne(
			{ config_key },
			{ $set: { value, updated_by: actorId, updated_at: now } }
		);

		// Audit log
		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: config_key,
			action: 'lender_updated',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { type: 'system_config_changed', config_key, old_value: oldValue, new_value: value },
			created_at: now
		} as any);

		return apiOk({ config_key, value, updated_by: actorId });
	} catch (err) {
		return apiServerError(err, 'Failed to update system config');
	}
};
