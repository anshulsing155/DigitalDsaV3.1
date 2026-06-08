import type { PageServerLoad } from './$types';
import { FormSnapshots } from '$lib/database/mongo';
import { DEMO_USER_ID } from '$lib/services/jwtService';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const caseData = parentData.caseData;
	const caseId = caseData.case_id;

	// ── Demo mode: return data from parent (no DB calls) ────
	if (parentData.user?.id === DEMO_USER_ID) {
		return {
			caseId,
			lenderApplications: caseData.lender_applications ?? [],
			hasFormSnapshot: true, // demo always has data
			formSnapshotVersion: 1
		};
	}

	// ── Real mode: check if form snapshot exists ────────────
	const latestSnapshot = await FormSnapshots.findOne(
		{ case_id: caseId },
		{ sort: { version: -1 }, projection: { version: 1 } }
	);

	return {
		caseId,
		lenderApplications: caseData.lender_applications ?? [],
		hasFormSnapshot: !!latestSnapshot,
		formSnapshotVersion: latestSnapshot?.version ?? 0
	};
};
