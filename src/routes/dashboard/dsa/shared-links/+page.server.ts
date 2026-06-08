/**
 * Server Load — /dashboard/dsa/shared-links
 * ═══════════════════════════════════════════════════════════════════
 * Loads all share links created by the authenticated DSA.
 * Enriches with case labels by joining with cases collection.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getLinksForDsa } from '$lib/server/shareLinks.js';
import { Cases } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { isFeatureEnabled } from '$lib/server/featureGate.js';
import { requireRole } from '$lib/server/guards';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'dsa');

	const dsaResult = await resolveEffectiveDsaId(locals);
	if (!dsaResult.ok) {
		throw error(404, 'DSA profile not found');
	}

	const dsaId = dsaResult.dsaId;
	const userId = (locals.user as any)._id?.toString() || (locals.user as any).userId || '';

	// Check feature gate
	const featureCheck = await isFeatureEnabled('share_links_enabled', dsaId.toString());

	// Load all links (no filter — client-side tabs handle filtering)
	const links = await getLinksForDsa(userId);

	// Collect unique applicationIds to look up case labels
	const applicationIds = [...new Set(links.map((l) => l.applicationId))];

	// Batch lookup case labels
	const caseLabels: Record<string, string> = {};
	if (applicationIds.length > 0) {
		// form_submission_id may be stored as ObjectId or string — try both
		const objectIds = applicationIds.map((id) => {
			try {
				return new ObjectId(id);
			} catch {
				return id;
			}
		});

		const cases = await Cases.find(
			{ form_submission_id: { $in: objectIds } as any },
			{ projection: { form_submission_id: 1, label: 1, case_id: 1 } }
		).toArray();

		for (const c of cases) {
			const fid = c.form_submission_id?.toString();
			if (fid) {
				caseLabels[fid] = (c as any).label || c.case_id || fid;
			}
		}
	}

	return {
		links,
		caseLabels,
		shareLinksEnabled: featureCheck.enabled
	};
};
