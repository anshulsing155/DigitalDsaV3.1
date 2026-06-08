/**
 * POST /api/rm/cases/[case_id]/query — RM raises a quick query on a case
 * ═══════════════════════════════════════════════════════════════════
 * Phase 6.9: Quick Query from case detail
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, Cases, CommunicationThreads } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

const QUERY_CATEGORIES = [
	'income_documents',
	'property_documents',
	'identity_documents',
	'bank_statements',
	'valuation',
	'legal_opinion',
	'eligibility_clarification',
	'general'
] as const;

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlock = blockDemoWrite(locals);
	if (demoBlock) return demoBlock;

	const user = locals.user!;
	const caseId = params.case_id;

	// Resolve RM
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		// SEC-2: encrypted-first lookup; decrypt for downstream reads.
		const rmDocRaw = await findUserByMobile(rmApplications, user.mobileNumber);
		rmDoc = await decryptUserPii(rmDocRaw);
	}

	if (!rmDoc?._id) {
		return apiError('RM profile not found', 404);
	}

	// Verify thread exists (auth check)
	const thread = await CommunicationThreads.findOne({
		rm_id: rmDoc._id,
		case_id: caseId
	});

	if (!thread) {
		return apiError('Access denied', 403);
	}

	const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!bodyParsed.ok) return bodyParsed.response;
	const body = bodyParsed.data;

	const { category, query_text, lender_application_id } = body;

	// Validate
	if (!category || !QUERY_CATEGORIES.includes(category as (typeof QUERY_CATEGORIES)[number])) {
		return apiError('Invalid query category', 400);
	}

	if (
		!query_text ||
		typeof query_text !== 'string' ||
		!query_text.trim() ||
		query_text.length > 1000
	) {
		return apiError('Query text required (max 1000 chars)', 400);
	}

	if (
		!lender_application_id ||
		typeof lender_application_id !== 'string' ||
		!lender_application_id.trim()
	) {
		return apiError('Lender application ID required', 400);
	}

	try {
		// Load the case (use dsa_id from thread for compound index)
		const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: thread.dsa_id });
		if (!caseDoc) {
			return apiError('Case not found', 404);
		}

		const laIndex = caseDoc.lender_applications.findIndex(
			(la) => la.lender_application_id === lender_application_id
		);

		if (laIndex === -1) {
			return apiError('Lender application not found', 404);
		}

		// Insert query into lender_applications[].queries[]
		const query = {
			query_id: randomUUID(),
			query_text: (query_text as string).trim(),
			category: category as string,
			status: 'open' as const,
			raised_at: new Date(),
			raised_by: 'rm' as const,
			days_open: 0
		};

		await Cases.updateOne(
			{ case_id: caseId, dsa_id: thread.dsa_id },
			{
				$push: { [`lender_applications.${laIndex}.queries`]: query } as any,
				$set: { updated_at: new Date() }
			}
		);

		// Also add a message to the CommunicationThread
		const message = {
			sender_role: 'rm' as const,
			sender_id: rmDoc._id,
			message: `Query (${(category as string).replace(/_/g, ' ')}): ${(query_text as string).trim()}`,
			message_type: 'query' as const,
			created_at: new Date()
		};

		await CommunicationThreads.updateOne(
			{ _id: thread._id },
			{
				$push: { messages: message } as any,
				$set: { updated_at: new Date() }
			}
		);

		return apiOk({ query_id: query.query_id });
	} catch (error) {
		return apiServerError(error, 'Failed to create query');
	}
};
