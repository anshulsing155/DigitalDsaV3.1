import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { AdminUsers } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const load: LayoutServerLoad = async ({ locals, parent, url }) => {
	requireRole(locals, 'admin');

	// Production hostname check — admin dashboard only accessible via admin.digitaldsa.com
	if (!dev && url.hostname !== 'localhost' && url.hostname !== 'admin.digitaldsa.com') {
		throw error(403, 'Admin dashboard is only accessible via admin.digitaldsa.com');
	}

	const parentData = await parent();

	// Load admin-specific data from dedicated collection
	// Use permissions from locals (populated by hooks.server.ts during auth)
	const adminPermissions = locals.adminPermissions ?? null;
	const isSuperAdmin = locals.isSuperAdmin === true;
	let adminName = locals.user?.name || '';

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

	if (locals.user?.id) {
		try {
			const adminDoc = await AdminUsers.findOne(
				{ _id: new ObjectId(locals.user.id) },
				{ projection: { name: 1, walkthrough_state: 1 } }
			);
			if (adminDoc) {
				adminName = adminDoc.name;
				const ws = (adminDoc as any).walkthrough_state;
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
			// Fallback: admin may be from Applicant collection (legacy)
		}
	}

	return {
		...parentData,
		adminPermissions,
		isSuperAdmin,
		adminName,
		walkthroughState
	};
};
