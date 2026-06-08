/**
 * PATCH /api/rm/profile
 * ═══════════════════════════════════════════════════════════════════
 * Update editable fields on the authenticated RM's profile.
 * Editable: name, workingCity, designation.
 * Read-only (not accepted): mobileNumber, email, bankName.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { rmApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { ObjectId } from 'mongodb';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, encryptUserPii } from '$lib/server/csfle/index.js';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!bodyParsed.ok) return bodyParsed.response;
	const { name, workingCity, designation } = bodyParsed.data;

	// Validate — at least one field must be provided
	const updateFields: Record<string, unknown> = {};

	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim().length < 2) {
			return apiError('Name must be at least 2 characters', 400);
		}
		updateFields.name = name.trim();
	}

	if (workingCity !== undefined) {
		if (typeof workingCity !== 'string' || workingCity.trim().length === 0) {
			return apiError('Working city is required', 400);
		}
		updateFields.workingCity = workingCity.trim();
	}

	if (designation !== undefined) {
		if (typeof designation !== 'string') {
			return apiError('Invalid designation', 400);
		}
		updateFields.designation = designation.trim();
	}

	if (Object.keys(updateFields).length === 0) {
		return apiError('No fields to update', 400);
	}

	updateFields.updatedAt = new Date();

	try {
		// SEC-2: encrypt PII fields in the update payload. `name` is in
		// the encrypted-field registry; the others (workingCity,
		// designation, updatedAt) pass through unchanged.
		const encryptedUpdate = await encryptUserPii(updateFields);

		// Try matching by ObjectId first, fallback to mobile via the
		// dual-query helper, then update by _id.
		let result;
		try {
			result = await rmApplications.updateOne(
				{ _id: new ObjectId(locals.user!.id) },
				{ $set: encryptedUpdate }
			);
		} catch {
			const rm = await findUserByMobile(rmApplications, locals.user!.mobileNumber);
			if (!rm?._id) {
				return apiError('RM not found', 404);
			}
			result = await rmApplications.updateOne(
				{ _id: rm._id },
				{ $set: encryptedUpdate }
			);
		}

		if (result.matchedCount === 0) {
			return apiError('RM not found', 404);
		}

		return apiOk();
	} catch (error) {
		return apiServerError(error, 'Update failed');
	}
};
