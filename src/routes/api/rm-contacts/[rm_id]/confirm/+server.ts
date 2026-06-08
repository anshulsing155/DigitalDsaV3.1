/**
 * POST  /api/rm-contacts/[rm_id]/confirm
 * ======================================================================
 * Crowdsource confirmation of an RM contact.
 *
 * Adds the DSA to contributed_by (if not already present),
 * increments confirmation_count, and updates last_confirmed_at.
 * ======================================================================
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { RMContacts } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

// -- POST -- Confirm an RM contact -------------------------------------

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
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

		const now = new Date();

		// Check if DSA is already in contributed_by
		const alreadyContributor = existingContact.contributed_by.some(
			(id) => id.toString() === dsaId.toString()
		);

		// Build the update
		const update: Record<string, any> = {
			$inc: { confirmation_count: 1 },
			$set: {
				last_confirmed_at: now,
				updated_at: now
			}
		};

		// Add DSA to contributed_by only if not already present
		if (!alreadyContributor) {
			update.$addToSet = { contributed_by: dsaId };
		}

		const updatedContact = await RMContacts.findOneAndUpdate({ _id: rmId }, update, {
			returnDocument: 'after'
		});

		if (!updatedContact) {
			return apiError('Failed to confirm RM contact', 500);
		}

		return apiOk(updatedContact);
	} catch (err) {
		return apiServerError(err, 'Failed to confirm RM contact');
	}
};
