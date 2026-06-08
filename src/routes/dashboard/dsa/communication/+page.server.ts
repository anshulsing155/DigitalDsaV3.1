import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DsaApplications, Cases } from '$lib/database/mongo.js';
import { COMMUNICATION_TEMPLATES } from '$lib/server/data/communicationTemplates.js';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoCommunicationData } from '$lib/server/demoDataLoaders';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { requireRole } from '$lib/server/guards';
import logger from '$lib/server/logger.js';

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	requireRole(locals, 'dsa');
	const parentData = await parent();
	const user = parentData.user;

	// Preserve the user's intended deep-link across the /login bounce.
	// Mirrors dashboard/+layout.server.ts and (app)/+layout.server.ts:
	// pathname + search round-trip through login.svelte's safeRedirectPath
	// validation. URL hash isn't server-visible (browser limitation).
	const returnTo = encodeURIComponent(url.pathname + url.search);
	const loginWithRedirect = `/login?redirect=${returnTo}`;

	// ── Demo mode: return in-memory data, skip MongoDB ───────────
	if (user?.id === DEMO_USER_ID) {
		return getDemoCommunicationData();
	}

	// Auth check
	if (!user?.id) {
		throw redirect(302, loginWithRedirect);
	}

	// Default empty response shape
	const emptyResponse = {
		templates: COMMUNICATION_TEMPLATES.map((t) => ({
			template_id: t.template_id,
			name: t.name,
			category: t.category,
			channel: t.channel,
			subject: t.subject,
			body: t.body,
			variables: t.variables,
			trigger_stage: t.trigger_stage || null
		})),
		recentCases: [] as Array<{
			case_id: string;
			label: string;
			loan_type: string;
			stage: string;
		}>,
		dsaProfile: null as {
			name: string;
			firmName?: string;
			phone?: string;
		} | null
	};

	try {
		// ── Step 1: Resolve DSA profile (team-aware) ─────────────────
		// Note: dsaResult.ok=false or missing DSA doc usually means corrupt
		// session state (re-login probably won't fix it on its own). Bouncing
		// to /login is still the least-surprising recourse short of a dedicated
		// error page; preserving the redirect param keeps the DSA on the same
		// page after recovery (e.g. re-login on a different device that
		// resolves the team membership correctly).
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			throw redirect(302, loginWithRedirect);
		}
		const dsaId = dsaResult.dsaId;

		// Load DSA doc for profile display
		const dsa = await DsaApplications.findOne({ _id: dsaId });

		if (!dsa) {
			throw redirect(302, loginWithRedirect);
		}

		const dsaProfile = {
			name: dsa.name || user.name || '',
			firmName: dsa.businessType === 'Individual' ? undefined : dsa.lenderName,
			phone: String(dsa.mobileNumber || '')
		};

		// ── Step 2: Load recent cases for case picker ────────────────
		const recentCaseDocs = await Cases.find(
			{
				dsa_id: dsaId,
				is_archived: { $in: [false, null] } as any
			},
			{
				projection: {
					case_id: 1,
					label: 1,
					'loan.type': 1,
					stage: 1
				}
			}
		)
			.sort({ updated_at: -1 })
			.limit(20)
			.toArray();

		const recentCases = recentCaseDocs.map((c) => ({
			case_id: c.case_id,
			label: c.label,
			loan_type: c.loan.type,
			stage: c.stage
		}));

		return {
			templates: emptyResponse.templates,
			recentCases,
			dsaProfile
		};
	} catch (error) {
		// Re-throw redirects
		if (error && typeof error === 'object' && 'status' in error) {
			throw error;
		}
		logger.error({ err: error }, 'Communication hub load error');
		return emptyResponse;
	}
};
