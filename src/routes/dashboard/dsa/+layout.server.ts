import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { DsaApplications } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { getQuotaState, type QuotaState } from '$lib/server/billing/quotaState';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import logger from '$lib/server/logger';

export const load: LayoutServerLoad = async ({ locals, parent, depends }) => {
	requireRole(locals, 'dsa');
	const parentData = await parent();

	// Tag the quota slice so child pages can refresh just the topbar/sidebar
	// counts after a case-create or case-edit completes — without re-running
	// the rest of the dashboard's load. Consumers call invalidate('app:quotaState').
	depends('app:quotaState');

	// Pass impersonation context so the banner can render on the client. When
	// admin → DSA impersonation is active, hooks.server.ts sets locals.user to
	// the DSA but preserves the real admin identity on locals.adminActingAs.
	const adminActingAs = locals.adminActingAs
		? { id: locals.adminActingAs.id, name: locals.adminActingAs.name }
		: null;

	// Load walkthrough state for first-time user guidance
	let walkthroughState: {
		completed: boolean;
		current_step: number;
		dismissed_at?: string;
		steps_seen: string[];
		intro_completed: boolean;
		explanatory_completed: boolean;
		intro_dismissed_at?: string;
		/** Lifetime "auto-trigger has fired" marker — see WalkthroughDbState. */
		intro_auto_triggered_at?: string;
		page_tours_completed: Partial<Record<string, boolean>>;
	} | null = null;

	if (locals.user?.id && locals.user.id !== 'demo-guest') {
		try {
			const dsaDoc = await DsaApplications.findOne(
				{ _id: new ObjectId(locals.user.id) },
				{ projection: { walkthrough_state: 1 } }
			);
			if (dsaDoc) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const ws = (dsaDoc as any).walkthrough_state;
				walkthroughState = ws
					? {
							completed: ws.completed ?? false,
							current_step: ws.current_step ?? 0,
							dismissed_at: ws.dismissed_at?.toISOString?.(),
							steps_seen: ws.steps_seen ?? [],
							intro_completed: ws.intro_completed ?? ws.completed ?? false,
							explanatory_completed: ws.explanatory_completed ?? false,
							intro_dismissed_at: ws.intro_dismissed_at?.toISOString?.(),
							intro_auto_triggered_at: ws.intro_auto_triggered_at?.toISOString?.(),
							page_tours_completed: ws.page_tours_completed ?? {}
						}
					: {
							completed: false,
							current_step: 0,
							steps_seen: [],
							intro_completed: false,
							explanatory_completed: false,
							page_tours_completed: {}
						};
			}
		} catch {
			// Non-fatal
		}
	}

	// QBC — load quota state for the persistent top-bar indicator (Item 1).
	// Wrapped in try/catch (mirrors the pattern in cases/+page.server.ts) so a
	// billing-query failure never deadends an entire DSA dashboard page. The
	// indicator simply hides when quotaState is null.
	//
	// DSA id MUST be resolved via resolveEffectiveDsaId — cases are stored under
	// that id (encrypted-mobile lookup + team-member→owner remapping). Using
	// locals.user.id directly counted 0 cases for team members and any user
	// whose JWT userId didn't match the encrypted-mobile lookup, leaving the
	// topbar chip stuck at "Cases Consumed 0/N".
	let quotaState: QuotaState | null = null;
	if (locals.user?.id && locals.user.id !== 'demo-guest') {
		try {
			const dsaResult = await resolveEffectiveDsaId(locals);
			if (dsaResult.ok) {
				quotaState = await getQuotaState(dsaResult.dsaId);
			}
		} catch (err) {
			logger.warn({ err, userId: locals.user.id }, 'Failed to load quota state for dashboard top-bar');
		}
	}

	return {
		...parentData,
		walkthroughState,
		adminActingAs,
		quotaState
	};
};
