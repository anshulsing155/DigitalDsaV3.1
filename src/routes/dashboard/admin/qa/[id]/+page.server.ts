import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { QaScenarios } from '$lib/database/mongo.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'qa_view');

	// An unparseable ObjectId is functionally "not found" — the resource cannot
	// possibly exist in the database. Returning 404 (not 400) also produces a
	// friendlier error page when a non-existent slug like /dashboard/admin/qa/coverage
	// falls through to this dynamic [id] route.
	let objectId: ObjectId;
	try {
		objectId = new ObjectId(params.id);
	} catch {
		error(404, 'Scenario not found');
	}

	const scenario = await QaScenarios.findOne({ _id: objectId });
	if (!scenario) error(404, 'Scenario not found');

	return {
		scenario: {
			...scenario,
			_id: scenario._id!.toString(),
			createdAt: scenario.createdAt.toISOString(),
			updatedAt: scenario.updatedAt.toISOString(),
			lastRunAt: scenario.lastRunAt?.toISOString() ?? null,
			lastRunDetails: scenario.lastRunDetails
				? {
						...scenario.lastRunDetails,
						ranAt: scenario.lastRunDetails.ranAt.toISOString()
					}
				: null
		}
	};
};
