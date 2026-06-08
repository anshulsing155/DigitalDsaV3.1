import type { PageServerLoad } from './$types';
import { rmApplications, CommunicationThreads, RMBroadcasts } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	if (!user?.id) {
		return { broadcasts: [], dsaCount: 0, rmName: '', lenderName: '' };
	}

	// Resolve RM
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		rmDoc = await rmApplications.findOne({
			mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
		});
	}

	if (!rmDoc?._id) {
		return { broadcasts: [], dsaCount: 0, rmName: '', lenderName: '' };
	}

	// Get connected DSA count
	const threads = await CommunicationThreads.find({ rm_id: rmDoc._id }).toArray();
	const dsaIdSet = new Set(threads.map((t) => t.dsa_id.toString()));

	// Load broadcasts
	const broadcastsRaw = await RMBroadcasts.find({ rm_id: rmDoc._id })
		.sort({ created_at: -1 })
		.limit(50)
		.toArray();

	const broadcasts = broadcastsRaw.map((b) => ({
		_id: b._id?.toString() || '',
		title: b.title,
		body: b.body,
		footer: b.footer,
		target_count: b.target_dsa_ids.length,
		read_count: b.read_by.length,
		created_at:
			b.created_at instanceof Date
				? b.created_at.toISOString()
				: new Date(b.created_at).toISOString()
	}));

	const officialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '';
	const lenderName = rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '';

	return {
		broadcasts,
		dsaCount: dsaIdSet.size,
		rmName: rmDoc.name || '',
		lenderName
	};
};
