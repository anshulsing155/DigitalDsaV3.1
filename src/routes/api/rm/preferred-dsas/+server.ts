/**
 * POST/DELETE/GET /api/rm/preferred-dsas
 * ═══════════════════════════════════════════════════════════════════
 * Preferred DSA tagging for RMs (6.11).
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { resolveRmDoc, getPreferredDsaIds } from '$lib/server/rmHelpers.js';

// ── POST: Add a DSA to preferred list ────────────────────────────
export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const bodyParsed = await parseJsonBody<{ dsa_id?: string }>(request);
	if (!bodyParsed.ok) return bodyParsed.response;

	try {
		const { dsa_id } = bodyParsed.data;

		if (!dsa_id || typeof dsa_id !== 'string') {
			return apiError('dsa_id is required');
		}

		let dsaObjectId: ObjectId;
		try {
			dsaObjectId = new ObjectId(dsa_id);
		} catch {
			return apiError('Invalid dsa_id format');
		}

		const rmDoc = await resolveRmDoc(locals.user!);
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		await rmApplications.updateOne(
			{ _id: rmDoc._id },
			{ $addToSet: { preferred_dsa_ids: dsaObjectId } }
		);

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to add preferred DSA');
	}
};

// ── DELETE: Remove a DSA from preferred list ─────────────────────
export const DELETE: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const delBodyParsed = await parseJsonBody<{ dsa_id?: string }>(request);
	if (!delBodyParsed.ok) return delBodyParsed.response;

	try {
		const { dsa_id } = delBodyParsed.data;

		if (!dsa_id || typeof dsa_id !== 'string') {
			return apiError('dsa_id is required');
		}

		let dsaObjectId: ObjectId;
		try {
			dsaObjectId = new ObjectId(dsa_id);
		} catch {
			return apiError('Invalid dsa_id format');
		}

		const rmDoc = await resolveRmDoc(locals.user!);
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		await rmApplications.updateOne(
			{ _id: rmDoc._id },
			{ $pull: { preferred_dsa_ids: dsaObjectId } }
		);

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to remove preferred DSA');
	}
};

// ── GET: List preferred DSA IDs ──────────────────────────────────
export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	try {
		const ids = await getPreferredDsaIds(locals.user!);
		return apiOk(ids);
	} catch (err) {
		return apiServerError(err, 'Failed to load preferred DSAs');
	}
};
