import type { RequestHandler } from './$types';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rmApplications, CommunicationThreads } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { apiOk, apiError } from '$lib/server/apiResponse.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

/**
 * POST /api/rm/threads/[thread_id]/mark-seen
 *
 * Audit fix (RM dashboard audit 2026-05-30): records the RM's most-recent
 * view of a thread so the unread badge on the Communication page can clear.
 * Server-load computes unread by counting DSA-authored messages newer than
 * this timestamp; bumping it on thread-open zeroes the badge atomically.
 *
 * BOLA-safe: write is scoped to (_id, rm_id). The findOne is the access
 * gate; the updateOne re-asserts ownership in its filter so the write
 * stays safe if the gate is ever removed in a refactor.
 */
export const POST: RequestHandler = async ({ locals, params, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlock = blockDemoWrite(locals);
	if (demoBlock) return demoBlock;

	const user = locals.user!;
	const threadId = params.thread_id;

	// Convention parity (CLAUDE.md §15): generous limit so a broken client-side
	// $effect can't spam the endpoint. The write is idempotent + write-light,
	// so the cap is purely a sanity backstop — 20 hits in 10s would only
	// happen on a runaway loop.
	const ip = getClientAddress();
	const limited = await rateLimit(ip, {
		maxRequests: 20,
		windowMs: 10_000,
		identifier: `rm_mark_seen:${user.id}`
	});
	if (limited) return apiError('Too many requests. Please slow down.', 429);

	// Resolve RM (id-first; mobile-fallback covers the encrypted-PII path).
	// We only need rmDoc._id to verify thread ownership, so the mobile-fallback
	// path skips decryptUserPii — no PII fields are read past this point.
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		rmDoc = await findUserByMobile(rmApplications, user.mobileNumber);
	}

	if (!rmDoc?._id) {
		return apiError('RM profile not found', 404);
	}

	// Validate thread id format.
	let threadOid: ObjectId;
	try {
		threadOid = new ObjectId(threadId);
	} catch {
		return apiError('Invalid thread ID', 400);
	}

	// Verify the thread belongs to this RM before touching it.
	const thread = await CommunicationThreads.findOne(
		{ _id: threadOid, rm_id: rmDoc._id },
		{ projection: { _id: 1 } }
	);
	if (!thread) {
		return apiError('Thread not found or access denied', 404);
	}

	await CommunicationThreads.updateOne(
		{ _id: threadOid, rm_id: rmDoc._id },
		{ $set: { rm_last_seen_at: new Date() } }
	);

	return apiOk();
};
