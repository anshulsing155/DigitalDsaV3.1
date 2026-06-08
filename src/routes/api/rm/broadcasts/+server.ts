/**
 * POST /api/rm/broadcasts — Create a new broadcast to connected DSAs
 * GET  /api/rm/broadcasts — List RM's sent broadcasts
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, CommunicationThreads, RMBroadcasts } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { injectDisclaimerFooter } from '$lib/server/disclaimerFooter.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── Resolve RM document (ObjectId first, mobile fallback) ────
// SEC-2: mobile fallback is encrypted-aware; result decrypted for use.
async function resolveRm(userId: string, mobileNumber?: string) {
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(userId) });
	} catch {
		// ObjectId parse failed — try mobile fallback
	}

	if (!rmDoc && mobileNumber) {
		rmDoc = await findUserByMobile(rmApplications, mobileNumber);
	}

	return decryptUserPii(rmDoc);
}

// ============================================================================
// POST — Create new broadcast
// ============================================================================

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlock = blockDemoWrite(locals);
	if (demoBlock) return demoBlock;

	const user = locals.user!;

	// Resolve RM
	const rmDoc = await resolveRm(user.id, user.mobileNumber);

	if (!rmDoc?._id) {
		return apiError('RM profile not found', 404);
	}

	// Parse body
	const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!bodyParsed.ok) return bodyParsed.response;
	const body = bodyParsed.data;

	const { title, body: messageBody } = body;

	if (!title || typeof title !== 'string' || !title.trim()) {
		return apiError('Title and body are required', 400);
	}

	if (!messageBody || typeof messageBody !== 'string' || !(messageBody as string).trim()) {
		return apiError('Title and body are required', 400);
	}

	if ((title as string).length > 200) {
		return apiError('Title too long (max 200 chars)', 400);
	}

	if ((messageBody as string).length > 2000) {
		return apiError('Body too long (max 2000 chars)', 400);
	}

	try {
		// Get connected DSA IDs from CommunicationThreads
		const threads = await CommunicationThreads.find({ rm_id: rmDoc._id }).toArray();
		const dsaIdSet = new Set(threads.map((t) => t.dsa_id.toString()));
		const targetDsaIds = [...dsaIdSet].map((id) => new ObjectId(id));

		if (targetDsaIds.length === 0) {
			return apiError('No connected DSAs to broadcast to', 400);
		}

		// Server-enforced footer injection
		const footerBody = injectDisclaimerFooter(
			(messageBody as string).trim(),
			'broadcast_footer_v1'
		);

		const broadcast = {
			rm_id: rmDoc._id,
			rm_name: rmDoc.name || '',
			lender_name:
				rmDoc.bankName ||
				getLenderNameFromDomain(rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '') ||
				'',
			title: (title as string).trim(),
			body: footerBody,
			footer:
				'\u26a0\ufe0f This information is shared by the RM based on their understanding. The platform does not guarantee it. Please confirm through official channels.',
			target_dsa_ids: targetDsaIds,
			read_by: [] as ObjectId[],
			created_at: new Date(),
			expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
		};

		await RMBroadcasts.insertOne(broadcast);

		return apiOk({ dsaCount: targetDsaIds.length });
	} catch (error) {
		return apiServerError(error, 'Failed to create broadcast');
	}
};

// ============================================================================
// GET — List RM's broadcasts
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const user = locals.user!;

	// Resolve RM
	const rmDoc = await resolveRm(user.id, user.mobileNumber);

	if (!rmDoc?._id) {
		return apiError('RM profile not found', 404);
	}

	try {
		const broadcasts = await RMBroadcasts.find({ rm_id: rmDoc._id })
			.sort({ created_at: -1 })
			.limit(50)
			.toArray();

		const serialized = broadcasts.map((b) => ({
			_id: b._id?.toString(),
			title: b.title,
			body: b.body,
			footer: b.footer,
			target_count: b.target_dsa_ids.length,
			read_count: b.read_by.length,
			created_at:
				b.created_at instanceof Date
					? b.created_at.toISOString()
					: new Date(b.created_at).toISOString(),
			expires_at: b.expires_at
				? b.expires_at instanceof Date
					? b.expires_at.toISOString()
					: new Date(b.expires_at).toISOString()
				: null
		}));

		return apiOk(serialized);
	} catch (error) {
		return apiServerError(error, 'Failed to load broadcasts');
	}
};
