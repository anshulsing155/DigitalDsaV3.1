import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { Leads, Sources } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'dsa');

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) throw error(404, result.error);

	const status = url.searchParams.get('status');
	const filter: any = { dsa_id: result.dsaId, is_archived: false };
	if (status) filter.status = status;

	const [leads, sources, statusCounts] = await Promise.all([
		Leads.find(filter).sort({ updated_at: -1 }).limit(100).toArray(),
		Sources.find({ dsa_id: result.dsaId, is_active: true }).project({ _id: 1, name: 1 }).toArray(),
		Leads.aggregate([
			{ $match: { dsa_id: result.dsaId, is_archived: false } },
			{ $group: { _id: '$status', count: { $sum: 1 } } }
		]).toArray()
	]);

	const counts: Record<string, number> = {};
	for (const s of statusCounts) {
		counts[s._id] = s.count;
	}

	return {
		leads: leads.map((l) => ({
			...l,
			_id: l._id!.toString(),
			dsa_id: l.dsa_id.toString(),
			source_id: l.source_id?.toString() || null,
			created_by_member_id: l.created_by_member_id?.toString() || null,
			created_at: l.created_at.toISOString(),
			updated_at: l.updated_at.toISOString(),
			follow_up_date: l.follow_up_date?.toISOString() || null
		})),
		sources: sources.map((s) => ({ _id: s._id!.toString(), name: s.name })),
		statusCounts: counts,
		activeFilter: status || 'all'
	};
};
