/**
 * GET  /api/communication/templates
 * ══════════════════════════════════════════════════════════════════
 * Returns all communication templates, optionally filtered by
 * category and/or trigger stage.
 *
 * Query params:
 *   ?category=customer|rm|source
 *   ?stage=intake|profiling|file_building|...
 *
 * Requires authentication.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { COMMUNICATION_TEMPLATES } from '$lib/server/data/communicationTemplates.js';
import { getTemplatesForStage } from '$lib/server/templateRenderer.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const category = url.searchParams.get('category');
		const stage = url.searchParams.get('stage');

		let templates = [...COMMUNICATION_TEMPLATES];

		// Filter by category if provided
		if (category) {
			const validCategories = ['customer', 'rm', 'source'];
			if (!validCategories.includes(category)) {
				return apiError(
					`Invalid category "${category}". Must be one of: ${validCategories.join(', ')}`
				);
			}
			templates = templates.filter((t) => t.category === category);
		}

		// Filter by trigger stage if provided
		if (stage) {
			const stageTemplates = getTemplatesForStage(stage);
			const stageIds = new Set(stageTemplates.map((t) => t.template_id));
			templates = templates.filter((t) => stageIds.has(t.template_id));
		}

		return apiOk({ templates, total: templates.length });
	} catch (err) {
		return apiServerError(err, 'Failed to fetch templates');
	}
};
