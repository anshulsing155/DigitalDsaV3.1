import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const ROLE_DASHBOARD: Record<string, string> = {
	dsa: '/dashboard/dsa',
	rm: '/dashboard/rm',
	admin: '/dashboard/admin',
	property_consultant: '/dashboard/dsa'
};

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already authenticated, redirect to their dashboard
	if (locals.user?.id) {
		const role = locals.user.activeRole || 'dsa';
		const dashboardUrl = ROLE_DASHBOARD[role] || '/dashboard/dsa';
		redirect(302, dashboardUrl);
	}
};
