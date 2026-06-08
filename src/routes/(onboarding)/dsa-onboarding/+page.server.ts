// import { redirect } from '@sveltejs/kit';

// export const load = async ({ cookies }) => {
// 	const role = cookies.get('role');

// 	if (!role || role.toLowerCase() !== 'dsa') {
// 		throw redirect(302, '/login');
// 	}
// };

import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { DsaApplications } from '$lib/database/mongo';

export const load = async ({ cookies, locals }: ServerLoadEvent) => {
	const mobile = cookies.get('verifiedMobile') || cookies.get('mobileNumber');
	const accessToken = cookies.get('accessToken');

	// Bare /login throw — NO ?redirect= param. Onboarding IS the destination
	// after login; login.svelte routes new/incomplete users back to the right
	// onboarding page with the original deep-link redirect preserved. See the
	// matching comment in (onboarding)/+layout.server.ts for the full rationale.
	if (!accessToken && !mobile) throw redirect(302, '/login');

	// Determine the mobile number to check DSA onboarding status
	const checkMobile = locals.user?.mobileNumber || mobile;

	if (checkMobile) {
		const dsaProfile = await DsaApplications.findOne(
			{ mobileNumber: { $in: [checkMobile, Number(checkMobile)] } } as any,
			{ projection: { onboardingCompleted: 1 } }
		);

		// If DSA onboarding is already completed → go to dashboard
		if (dsaProfile?.onboardingCompleted) {
			throw redirect(302, '/dashboard/dsa');
		}
	}

	// If logged in but DSA onboarding NOT completed → stay here
	// If not logged in but has verifiedMobile → stay here for onboarding
	return {};
};
