/**
 * GET/POST /api/admin/policy-engine/geo-scopes
 * List and create geographic scopes.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { GeoScopes, PolicyAuditLogs } from '$lib/database/mongo.js';
import { GEO_SPECIFICITY } from '$lib/types/policyEngine.js';
import type { GeoLevel, ZoneType } from '$lib/types/policyEngine.js';

const VALID_LEVELS: GeoLevel[] = ['pan_india', 'state', 'city', 'zone'];
const VALID_ZONE_TYPES: ZoneType[] = ['urban', 'rural', 'semi_urban'];

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const level = url.searchParams.get('level') as GeoLevel | null;
		const parent = url.searchParams.get('parent_geo_scope_id');
		const filter: Record<string, unknown> = {};
		if (level) filter.level = level;
		if (parent) filter.parent_geo_scope_id = parent;

		const scopes = await GeoScopes.find(filter).sort({ specificity: 1, label: 1 }).toArray();
		return apiOk(
			scopes.map((s) => ({
				...s,
				_id: s._id.toString()
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list geo scopes');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, any>>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		const { geo_scope_id, level, label } = body;

		if (!geo_scope_id || typeof geo_scope_id !== 'string') {
			return apiError('geo_scope_id is required', 400);
		}
		if (!level || !VALID_LEVELS.includes(level)) {
			return apiError(`level must be one of: ${VALID_LEVELS.join(', ')}`, 400);
		}
		if (!label || typeof label !== 'string') {
			return apiError('label is required', 400);
		}

		// Check uniqueness
		const existing = await GeoScopes.findOne({ geo_scope_id });
		if (existing) {
			return apiError(`GeoScope "${geo_scope_id}" already exists`, 409);
		}

		// Validate parent for non-pan_india scopes
		const parent_geo_scope_id = body.parent_geo_scope_id || null;
		if (level !== 'pan_india' && !parent_geo_scope_id) {
			return apiError('parent_geo_scope_id is required for non-PAN India scopes', 400);
		}
		if (parent_geo_scope_id) {
			const parent = await GeoScopes.findOne({ geo_scope_id: parent_geo_scope_id });
			if (!parent) {
				return apiError('Parent geo scope not found', 404);
			}
		}

		// Validate zone_type for zone-level scopes
		if (level === 'zone') {
			if (!body.zone_type || !VALID_ZONE_TYPES.includes(body.zone_type)) {
				return apiError(
					`zone_type is required for zone-level scopes and must be one of: ${VALID_ZONE_TYPES.join(', ')}`,
					400
				);
			}
		}

		const now = new Date();
		const doc = {
			geo_scope_id,
			level: level as GeoLevel,
			specificity: GEO_SPECIFICITY[level as GeoLevel],
			label: label.trim(),
			parent_geo_scope_id,
			gst_state_code: body.gst_state_code || undefined,
			zone_type: level === 'zone' ? (body.zone_type as ZoneType) : undefined,
			created_at: now
		};

		const result = await GeoScopes.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'geo_scope',
			target_id: geo_scope_id,
			action: 'geo_scope_created',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { level, label, parent_geo_scope_id },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), geo_scope_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create geo scope');
	}
};
