import type { PageServerLoad } from './$types';
import { rmApplications, CommunicationThreads, Cases } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	if (!user?.id) {
		return { threads: [], rmId: '' };
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
		return { threads: [], rmId: '' };
	}

	const rmId = rmDoc._id;

	// L-N1 (CODE-REVIEW-2026-05-31): server still reads messages from Mongo
	// (cheap — indexed lookup, ~tens of KB per thread) so we can compute
	// the unread count + last-message preview here. But we DO NOT ship
	// messages over the wire — the client lazy-loads the selected thread's
	// messages via GET /api/rm/threads/[id]/messages. Previously each page
	// load shipped all messages for all threads (60-message page weight at
	// 20 threads × 3KB each ≈ 180KB), most of which never rendered. New
	// wire payload is bounded to last_message preview + unread_count per
	// thread — constant regardless of message history depth.
	const threadsRaw = await CommunicationThreads.find({ rm_id: rmId })
		.sort({ updated_at: -1 })
		.toArray();

	// Get case labels
	const caseIds = [...new Set(threadsRaw.map((t) => t.case_id))];
	const caseDocs =
		caseIds.length > 0
			? await Cases.find(
					{ case_id: { $in: caseIds } },
					{ projection: { case_id: 1, label: 1, loan: 1, stage: 1 } }
				).toArray()
			: [];

	const caseMap: Record<string, { label: string; loan_type: string; stage: string }> = {};
	for (const c of caseDocs) {
		caseMap[c.case_id] = {
			label: c.label,
			loan_type: c.loan?.type || '',
			stage: c.stage
		};
	}

	// Serialize threads
	const threads = threadsRaw.map((t) => {
		const lastMessage = t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
		const caseInfo = caseMap[t.case_id];

		// Audit fix (RM dashboard audit 2026-05-30): unread count = number
		// of DSA-authored messages newer than rm_last_seen_at. When
		// rm_last_seen_at is missing (legacy threads pre-migration), every
		// DSA message counts as unread until the RM first opens the thread.
		const lastSeenMs = t.rm_last_seen_at ? new Date(t.rm_last_seen_at).getTime() : 0;
		const unreadCount = t.messages.reduce((count, m) => {
			if (m.sender_role !== 'dsa') return count;
			const msgMs = m.created_at instanceof Date
				? m.created_at.getTime()
				: new Date(m.created_at).getTime();
			return msgMs > lastSeenMs ? count + 1 : count;
		}, 0);

		return {
			_id: t._id?.toString() || '',
			case_id: t.case_id,
			dsa_name: t.dsa_name,
			lender_name: t.lender_name,
			case_label: caseInfo?.label || t.case_id,
			case_loan_type: caseInfo?.loan_type || '',
			case_stage: caseInfo?.stage || '',
			status: t.status,
			message_count: t.messages.length,
			unread_count: unreadCount,
			last_message: lastMessage
				? {
						sender_role: lastMessage.sender_role,
						message:
							lastMessage.message.length > 100
								? lastMessage.message.slice(0, 100) + '...'
								: lastMessage.message,
						message_type: lastMessage.message_type,
						created_at:
							lastMessage.created_at instanceof Date
								? lastMessage.created_at.toISOString()
								: new Date(lastMessage.created_at).toISOString()
					}
				: null,
			// L-N1: messages are no longer shipped inline; client fetches
			// the selected thread's messages via GET .../messages.
			updated_at:
				t.updated_at instanceof Date
					? t.updated_at.toISOString()
					: new Date(t.updated_at).toISOString()
		};
	});

	return {
		threads,
		rmId: rmId.toString()
	};
};
