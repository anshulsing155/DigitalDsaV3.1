import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { Applicant } from '$lib/database/mongo';
import { DEMO_USER_ID } from '$lib/services/jwtService';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// If user is not authenticated, redirect to login with return path
	if (!locals.user) {
		const returnTo = url.pathname + url.search;
		throw redirect(302, `/login?redirect=${encodeURIComponent(returnTo)}`);
	}

	// Demo users cannot access form routes — redirect to dashboard with restriction flag
	if (locals.user.id === DEMO_USER_ID) {
		throw redirect(302, '/dashboard/dsa?demo_restricted=form');
	}

	let applications: unknown[] = [];
	try {
		const doc = await Applicant.findOne({ mobileNumber: Number(locals.user?.mobileNumber) });
		applications = doc?.Applications ?? [];
	} catch {
		// DB query failure is non-fatal — form pages work without prior applications
	}
	locals.Application = applications;
	return {
		user: locals.user,
		Application: applications
	};
};
