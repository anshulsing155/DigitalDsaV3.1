/**
 * GET /api/sources — List sources
 * POST /api/sources — Create a new source
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Sources, Leads, Cases } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { requireTeamPermission } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { sourceCreateSchema } from '$lib/schemas/source.schema.js';
import type { Source } from '$lib/types/source.js';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const permDenied = requireTeamPermission(locals, 'sources_view');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const activeOnly = url.searchParams.get('active') !== 'false';
	const category = url.searchParams.get('category');

	const filter: any = { dsa_id: result.dsaId };
	if (activeOnly) filter.is_active = true;
	if (category) filter.category = category;

	const sources = await Sources.find(filter).sort({ updated_at: -1 }).toArray();

	const sourceIds = sources.map((s) => s._id!);
	const sourceIdStrings = sourceIds.map((id) => id.toString());

	const [leadCounts, caseCounts] = await Promise.all([
		Leads.aggregate<{ _id: string; count: number }>([
			{ $match: { source_id: { $in: sourceIds } } },
			{ $group: { _id: { $toString: '$source_id' }, count: { $sum: 1 } } }
		]).toArray(),
		Cases.aggregate<{ _id: string; count: number }>([
			{ $match: { 'source.source_contact_id': { $in: sourceIdStrings } } },
			{ $group: { _id: '$source.source_contact_id', count: { $sum: 1 } } }
		]).toArray()
	]);

	const leadCountMap = new Map(leadCounts.map((r) => [r._id, r.count]));
	const caseCountMap = new Map(caseCounts.map((r) => [r._id, r.count]));

	return apiOk({
		sources: sources.map((s) => {
			const idStr = s._id!.toString();
			return {
				...s,
				_id: idStr,
				dsa_id: s.dsa_id.toString(),
				total_leads: leadCountMap.get(idStr) ?? 0,
				total_cases: caseCountMap.get(idStr) ?? 0
			};
		})
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'sources_manage');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = sourceCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		const data = parsed.data;
		const now = new Date();

		const newSource: Omit<Source, '_id'> = {
			dsa_id: result.dsaId,
			name: data.name,
			category: data.category,
			contact_name: data.contact_name,
			contact_phone: data.contact_phone,
			contact_email: data.contact_email,
			city: data.city,
			total_leads: 0,
			total_cases: 0,
			total_sanctioned: 0,
			conversion_rate: 0,
			is_active: true,
			created_at: now,
			updated_at: now
		};

		const insertResult = await Sources.insertOne(newSource);

		logger.info(
			{
				sourceId: insertResult.insertedId.toString(),
				dsaId: result.dsaId.toString(),
				name: data.name
			},
			'Source created'
		);

		return apiOk({ _id: insertResult.insertedId.toString() }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create source');
	}
};
