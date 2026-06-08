import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { DsaApplications, rmApplications, Cases } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');

	const userId = params.user_id;
	let userOid: ObjectId;
	try {
		userOid = new ObjectId(userId);
	} catch {
		throw error(400, 'Invalid user ID');
	}

	// Try DSA first, then RM
	let userDoc = await DsaApplications.findOne({ _id: userOid });
	let userRole = 'dsa';

	if (!userDoc) {
		userDoc = (await rmApplications.findOne({ _id: userOid })) as any;
		userRole = 'rm';
	}

	if (!userDoc) {
		throw error(404, 'User not found');
	}

	// Load case count for DSA users
	let caseCount = 0;
	let recentCases: Array<{
		case_id: string;
		stage: string;
		loan_type: string;
		updated_at: string;
	}> = [];
	if (userRole === 'dsa') {
		[caseCount, recentCases] = await Promise.all([
			Cases.countDocuments({ dsa_id: userOid }),
			Cases.find({ dsa_id: userOid })
				.project({ case_id: 1, stage: 1, 'loan.type': 1, updated_at: 1 })
				.sort({ updated_at: -1 })
				.limit(10)
				.toArray()
				.then((docs) =>
					docs.map((d) => ({
						case_id: d.case_id,
						stage: d.stage,
						loan_type: (d as any).loan?.type || '',
						updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : ''
					}))
				)
		]);
	}

	return {
		user: {
			_id: userDoc._id.toString(),
			name: userDoc.name || '',
			mobileNumber: String(userDoc.mobileNumber || ''),
			email: userDoc.email || '',
			role: userRole,
			onboardingCompleted: Boolean(userDoc.onboardingCompleted),
			is_suspended: Boolean((userDoc as any).is_suspended),
			lastActiveAt: (userDoc as any).lastActiveAt
				? new Date((userDoc as any).lastActiveAt).toISOString()
				: null,
			createdAt: (userDoc as any).createdAt
				? new Date((userDoc as any).createdAt).toISOString()
				: null,
			bankName:
				(userDoc as any).bankName ||
				getLenderNameFromDomain(
					(userDoc as any).rmOfficialEmail || (userDoc as any).officialEmail || ''
				) ||
				''
		},
		caseCount,
		recentCases
	};
};
