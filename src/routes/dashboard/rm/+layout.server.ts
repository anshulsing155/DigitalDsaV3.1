import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { rmApplications } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import logger from '$lib/server/logger';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	requireRole(locals, 'rm');
	const parentData = await parent();

	// Pass impersonation context so the banner can render on the client
	const adminActingAs = locals.adminActingAs
		? { id: locals.adminActingAs.id, name: locals.adminActingAs.name }
		: null;

	// CF-4: Update RM's last active timestamp (fire-and-forget, don't block page load)
	if (locals.user?.id && locals.user.id !== 'demo-guest') {
		rmApplications
			.updateOne({ _id: new ObjectId(locals.user.id) }, { $set: { lastActiveAt: new Date() } })
			.catch((err) => logger.warn({ err }, 'Failed to update RM lastActiveAt'));
	}

	// Load walkthrough state for tour guidance
	let walkthroughState: {
		completed: boolean;
		current_step: number;
		dismissed_at?: string;
		steps_seen: string[];
		intro_completed: boolean;
		explanatory_completed: boolean;
		intro_dismissed_at?: string;
		page_tours_completed: Partial<Record<string, boolean>>;
	} | null = null;

	if (locals.user?.id && locals.user.id !== 'demo-guest') {
		try {
			const rmDoc = await rmApplications.findOne(
				{ _id: new ObjectId(locals.user.id) },
				{ projection: { walkthrough_state: 1 } }
			);
			if (rmDoc) {
				const ws = (rmDoc as any).walkthrough_state;
				walkthroughState = ws
					? {
							completed: ws.completed ?? false,
							current_step: ws.current_step ?? 0,
							dismissed_at: ws.dismissed_at?.toISOString?.(),
							steps_seen: ws.steps_seen ?? [],
							intro_completed: ws.intro_completed ?? ws.completed ?? false,
							explanatory_completed: ws.explanatory_completed ?? false,
							intro_dismissed_at: ws.intro_dismissed_at?.toISOString?.(),
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

	return {
		...parentData,
		walkthroughState,
		adminActingAs
	};
};
