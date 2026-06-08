import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { Sources } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'dsa');

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) throw error(404, result.error);

	const sources = await Sources.find({ dsa_id: result.dsaId })
		.sort({ is_active: -1, updated_at: -1 })
		.toArray();

	return {
		sources: sources.map((s) => ({
			...s,
			_id: s._id!.toString(),
			dsa_id: s.dsa_id.toString(),
			created_at: s.created_at.toISOString(),
			updated_at: s.updated_at.toISOString()
		}))
	};
};
