/**
 * Server Load — /dashboard/dsa/rm-contacts
 * ═══════════════════════════════════════════════════════════════════
 * Loads RM contacts with search, lender/city filtering, and pagination.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { RMContacts } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { requireRole } from '$lib/server/guards';
import type { Filter } from 'mongodb';
import type { RMContact } from '$lib/types/rmContact.js';
import { escapeRegex } from '$lib/server/utils.js';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'dsa');

	const dsaResult = await resolveEffectiveDsaId(locals);
	if (!dsaResult.ok) {
		throw error(404, 'DSA profile not found');
	}

	const dsaId = dsaResult.dsaId.toString();

	// Parse query params
	const search = url.searchParams.get('search') || '';
	const lender = url.searchParams.get('lender') || '';
	const city = url.searchParams.get('city') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	// Build filter
	const filter: Filter<RMContact> = { is_active: true };

	if (search) {
		const regex = { $regex: escapeRegex(search), $options: 'i' };
		filter.$or = [{ rm_name: regex }, { lender_name: regex }, { branch: regex }];
	}

	if (lender) {
		filter.lender_name = lender;
	}

	if (city) {
		filter.city = city;
	}

	// Run queries in parallel
	const [contacts, total, lenderOptions, cityOptions] = await Promise.all([
		RMContacts.find(filter)
			.sort({ confirmation_count: -1, last_confirmed_at: -1 })
			.skip((page - 1) * PER_PAGE)
			.limit(PER_PAGE)
			.toArray(),
		RMContacts.countDocuments(filter),
		RMContacts.distinct('lender_name', { is_active: true }),
		RMContacts.distinct('city', { is_active: true })
	]);

	return {
		contacts: contacts.map((c) => ({
			...c,
			_id: c._id?.toString(),
			contributed_by: c.contributed_by.map((id) => id.toString()),
			created_at: c.created_at.toISOString(),
			updated_at: c.updated_at.toISOString(),
			contributed_at: c.contributed_at.toISOString(),
			last_confirmed_at: c.last_confirmed_at.toISOString()
		})),
		pagination: {
			page,
			total,
			totalPages: Math.ceil(total / PER_PAGE),
			perPage: PER_PAGE
		},
		lenderOptions: lenderOptions.filter(Boolean).sort(),
		cityOptions: cityOptions.filter(Boolean).sort(),
		activeFilters: { search, lender, city, page },
		dsaId
	};
};
