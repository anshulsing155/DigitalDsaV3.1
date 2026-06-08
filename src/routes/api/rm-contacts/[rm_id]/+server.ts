/**
 * GET / PATCH  /api/rm-contacts/[rm_id]
 * ======================================================================
 * Single RM contact retrieval and update.
 *
 * GET:   Get a single RM contact by _id.
 * PATCH: Update an RM contact (partial).
 * ======================================================================
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { RMContacts } from '$lib/database/mongo.js';
import { rmContactUpdateSchema } from '$lib/schemas/rmContact.schema.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';

// -- GET -- Single RM contact ------------------------------------------

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// Validate ObjectId format
		if (!ObjectId.isValid(params.rm_id)) {
			return apiError('Invalid RM contact ID', 400);
		}

		const contact = await RMContacts.findOne({ _id: new ObjectId(params.rm_id) });

		if (!contact) {
			return apiError('RM contact not found', 404);
		}

		return apiOk(contact);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch RM contact');
	}
};

// -- PATCH -- Update RM contact ----------------------------------------

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate with rmContactUpdateSchema
		const parsed = rmContactUpdateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		// Validate ObjectId format
		if (!ObjectId.isValid(params.rm_id)) {
			return apiError('Invalid RM contact ID', 400);
		}

		const rmId = new ObjectId(params.rm_id);

		// Fetch existing contact
		const existingContact = await RMContacts.findOne({ _id: rmId });
		if (!existingContact) {
			return apiError('RM contact not found', 404);
		}

		const data = parsed.data;

		// -- Authorization check for is_active changes -----------------
		if (data.is_active !== undefined) {
			const isContributor = existingContact.contributed_by.some(
				(id) => id.toString() === dsaId.toString()
			);
			if (!isContributor) {
				return apiError('Only contributors can change the active status of an RM contact', 403);
			}
		}

		// -- Build $set update -----------------------------------------
		const updateSet: Record<string, any> = {
			updated_at: new Date()
		};

		// Copy simple fields (excluding notes_by_dsa which needs merging)
		const { notes_by_dsa, ...simpleFields } = data;
		for (const [key, value] of Object.entries(simpleFields)) {
			if (value !== undefined) {
				updateSet[key] = value;
			}
		}

		// Merge notes_by_dsa (don't replace the whole object)
		if (notes_by_dsa) {
			for (const [dsaKey, noteValue] of Object.entries(notes_by_dsa)) {
				updateSet[`notes_by_dsa.${dsaKey}`] = noteValue;
			}
		}

		const updatedContact = await RMContacts.findOneAndUpdate(
			{ _id: rmId },
			{ $set: updateSet },
			{ returnDocument: 'after' }
		);

		if (!updatedContact) {
			return apiError('Failed to update RM contact', 500);
		}

		return apiOk(updatedContact);
	} catch (err) {
		return apiServerError(err, 'Failed to update RM contact');
	}
};
