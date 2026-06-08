import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { rmApplications, RMSubmissions } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		rmDoc = await rmApplications.findOne({
			mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
		});
	}

	if (!rmDoc?._id) {
		return { submissions: [] };
	}

	const submissions = await RMSubmissions.find({ rm_id: rmDoc._id.toString() })
		.sort({ created_at: -1 })
		.limit(50)
		.toArray();

	return {
		submissions: submissions.map((s) => ({
			_id: s._id.toString(),
			submission_id: s.submission_id,
			lender_id: s.lender_id,
			lender_name: s.lender_name,
			product_type: s.product_type || null,
			status: s.status,
			urgency: s.urgency,
			description: s.description,
			document_count: s.document_ids?.length || 0,
			created_at: s.created_at ? new Date(s.created_at).toISOString() : null,
			updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : null
		}))
	};
};
