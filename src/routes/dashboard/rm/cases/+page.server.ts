import type { PageServerLoad } from './$types';
import { rmApplications, Cases, CommunicationThreads } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import type { CaseStage } from '$lib/types/case';
import { loanTypeLabel } from '$lib/config/loanTypeLabels';
import logger from '$lib/server/logger.js';

const STAGE_LABELS: Record<CaseStage, string> = {
	quota_blocked: 'Awaiting Processing',
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'File Building',
	submitted: 'Submitted',
	processing: 'Processing',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	if (!user?.id) return { cases: [] };

	try {
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		} catch {
			rmDoc = await rmApplications.findOne({
				mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
			});
		}
		if (!rmDoc?._id) return { cases: [] };

		const rmId = rmDoc._id;

		const allThreads = await CommunicationThreads.find(
			{ rm_id: rmId },
			{ projection: { case_id: 1, dsa_name: 1 } }
		).toArray();
		if (allThreads.length === 0) return { cases: [] };

		const caseIds = [...new Set(allThreads.map((t) => t.case_id))];
		const allCases = await Cases.find(
			{ case_id: { $in: caseIds } },
			{
				projection: {
					case_id: 1,
					label: 1,
					'loan.type': 1,
					'loan.amount_required': 1,
					stage: 1,
					'lender_applications.lender_name': 1,
					'lender_applications.queries.status': 1,
					updated_at: 1,
					created_at: 1,
					is_sample: 1
				}
			}
		).toArray();

		const caseIdToDsaName: Record<string, string> = {};
		for (const t of allThreads) {
			caseIdToDsaName[t.case_id] = t.dsa_name;
		}

		const sorted = [...allCases].sort(
			(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		);

		const cases = sorted.map((c) => {
			let hasOpenQuery = false;
			for (const la of c.lender_applications) {
				for (const q of la.queries) {
					if (q.status === 'open') {
						hasOpenQuery = true;
						break;
					}
				}
				if (hasOpenQuery) break;
			}

			return {
				case_id: c.case_id,
				label: c.label,
				loan_type: c.loan.type,
				loan_type_label: loanTypeLabel(c.loan.type),
				amount: c.loan.amount_required,
				stage: c.stage,
				stage_label: STAGE_LABELS[c.stage] || c.stage,
				lenders: c.lender_applications.map((la) => la.lender_name),
				dsa_name: caseIdToDsaName[c.case_id] || '',
				updated_at: c.updated_at.toISOString
					? c.updated_at.toISOString()
					: new Date(c.updated_at).toISOString(),
				created_at: c.created_at.toISOString
					? c.created_at.toISOString()
					: new Date(c.created_at).toISOString(),
				is_sample: c.is_sample,
				has_open_query: hasOpenQuery
			};
		});

		return { cases };
	} catch (error) {
		logger.error({ err: error }, 'RM cases load error');
		return { cases: [] };
	}
};
