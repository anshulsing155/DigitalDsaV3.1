/**
 * Server Load — /dashboard/dsa/cases/[case_id]/timeline
 * ═══════════════════════════════════════════════════════════════════
 * Loads paginated timeline events with event type and date filtering.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { TimelineEvents, Cases } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuth, requireTeamPermission } from '$lib/server/guards.js';
import type { Filter } from 'mongodb';
import type { TimelineEvent } from '$lib/types/timeline.js';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireAuth(locals);

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) throw error(403, 'Permission denied');

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) {
		throw error(404, 'DSA profile not found');
	}

	const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
	if (!ownership.ok) {
		throw error(ownership.error === 'Case not found' ? 404 : 403, ownership.error);
	}

	// Parse query params
	const eventType = url.searchParams.get('event_type') || '';
	const dateFrom = url.searchParams.get('date_from') || '';
	const dateTo = url.searchParams.get('date_to') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	// Build filter
	const filter: Filter<TimelineEvent> = { case_id: params.case_id };

	if (eventType) {
		filter.event_type = eventType as TimelineEvent['event_type'];
	}

	if (dateFrom || dateTo) {
		const dateFilter: Record<string, Date> = {};
		if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
		if (dateTo) {
			const end = new Date(dateTo);
			end.setHours(23, 59, 59, 999);
			dateFilter['$lte'] = end;
		}
		filter.created_at = dateFilter;
	}

	// Run queries in parallel
	const [events, total, eventTypeOptions] = await Promise.all([
		TimelineEvents.find(filter, {
			projection: {
				case_id: 1,
				event_type: 1,
				description: 1,
				metadata: 1,
				created_at: 1
			}
		})
			.sort({ created_at: -1 })
			.skip((page - 1) * PER_PAGE)
			.limit(PER_PAGE)
			.toArray(),
		TimelineEvents.countDocuments(filter),
		TimelineEvents.distinct('event_type', { case_id: params.case_id })
	]);

	return {
		events: events.map((e) => ({
			_id: e._id?.toString(),
			case_id: e.case_id,
			event_type: e.event_type,
			description: e.description,
			metadata: e.metadata,
			created_at: e.created_at.toISOString()
		})),
		pagination: {
			page,
			total,
			totalPages: Math.ceil(total / PER_PAGE),
			perPage: PER_PAGE
		},
		eventTypeOptions: eventTypeOptions.filter(Boolean).sort(),
		activeFilters: { eventType, dateFrom, dateTo, page },
		caseId: params.case_id,
		caseLabel: ownership.caseDoc.label || params.case_id
	};
};
