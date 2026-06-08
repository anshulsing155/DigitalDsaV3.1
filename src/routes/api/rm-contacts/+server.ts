/**
 * GET / POST  /api/rm-contacts
 * ======================================================================
 * RM Contacts list/search & creation for crowdsourced RM database.
 *
 * GET:  Search/list RM contacts with filtering and pagination.
 * POST: Create a new RM contact (with duplicate detection).
 * ======================================================================
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RMContacts } from '$lib/database/mongo.js';
import { rmContactCreateSchema } from '$lib/schemas/rmContact.schema.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import type { RMContact } from '$lib/types/rmContact.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';
import { escapeRegex } from '$lib/server/utils.js';

// -- GET -- Search/list RM contacts ------------------------------------

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// -- Parse query params ----------------------------------------
		const lenderName = url.searchParams.get('lender_name');
		const city = url.searchParams.get('city');
		const search = url.searchParams.get('search');
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
		const skip = (page - 1) * limit;

		// -- Build filter (only active contacts) -----------------------
		const filter: Record<string, any> = { is_active: true };

		if (lenderName) {
			filter.lender_name = lenderName;
		}

		if (city) {
			filter.city = city;
		}

		if (search) {
			// Escape user input to prevent regex injection
			const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
			filter.$or = [
				{ rm_name: searchRegex },
				{ lender_name: searchRegex },
				{ branch: searchRegex }
			];
		}

		// -- Execute query + counts + filter options in parallel --------
		const [contacts, total, lenderFilterOptions, cityFilterOptions] = await Promise.all([
			RMContacts.find(filter)
				.sort({ confirmation_count: -1, last_confirmed_at: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			RMContacts.countDocuments(filter),
			RMContacts.distinct('lender_name', { is_active: true }),
			RMContacts.distinct('city', { is_active: true })
		]);

		return apiOk({
			contacts,
			pagination: {
				page,
				limit,
				total,
				total_pages: Math.ceil(total / limit)
			},
			lender_filter_options: lenderFilterOptions.sort(),
			city_filter_options: cityFilterOptions.filter(Boolean).sort()
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch RM contacts');
	}
};

// -- POST -- Create a new RM contact -----------------------------------

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate with rmContactCreateSchema
		const parsed = rmContactCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		const data = parsed.data;

		// -- Check for potential duplicate (same rm_name + lender_name) -
		const existingContact = await RMContacts.findOne({
			rm_name: {
				$regex: `^${data.rm_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
				$options: 'i'
			},
			lender_name: data.lender_name
		});

		if (existingContact) {
			// left: extra top-level keys (duplicate_suggestion, message) alongside data —
			// not the clean apiOk shape; nesting them under data would break the client.
			return json({
				success: true,
				data: existingContact,
				duplicate_suggestion: true,
				message:
					'A contact with a similar name at this lender already exists. You may confirm the existing contact instead of creating a new one.'
			});
		}

		const now = new Date();

		// -- Build notes_by_dsa keyed by DSA _id -----------------------
		const notesByDsa: Record<string, string> = {};
		if (data.notes_by_dsa) {
			// Re-key any provided notes under the authenticated DSA's ID
			const dsaKey = dsaId.toString();
			const firstNote = Object.values(data.notes_by_dsa)[0];
			if (firstNote) {
				notesByDsa[dsaKey] = firstNote;
			}
		}

		// -- Build the RM contact document -----------------------------
		const newContact: RMContact = {
			rm_name: data.rm_name,
			lender_name: data.lender_name,
			branch: data.branch,
			city: data.city,
			phone: data.phone,
			email: data.email,
			whatsapp: data.whatsapp,
			designation: data.designation,
			loan_types_handled: data.loan_types_handled,
			contributed_by: [dsaId],
			contributed_at: now,
			last_confirmed_at: now,
			confirmation_count: 1,
			is_active: true,
			notes_by_dsa: notesByDsa,
			created_at: now,
			updated_at: now
		};

		// -- Insert ----------------------------------------------------
		const insertResult = await RMContacts.insertOne(newContact);
		newContact._id = insertResult.insertedId;

		return apiOk(newContact, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create RM contact');
	}
};
