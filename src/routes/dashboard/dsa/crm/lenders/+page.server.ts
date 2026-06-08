import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { CRMLenders } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'dsa');

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) throw error(404, result.error);

	const lenders = await CRMLenders.find({ dsa_id: result.dsaId })
		.sort({ is_active: -1, lender_name: 1 })
		.toArray();

	return {
		lenders: lenders.map((l) => ({
			...l,
			_id: l._id!.toString(),
			dsa_id: l.dsa_id.toString(),
			rm_contact_ids: l.rm_contact_ids.map((id) => id.toString()),
			created_at: l.created_at.toISOString(),
			updated_at: l.updated_at.toISOString()
		}))
	};
};
