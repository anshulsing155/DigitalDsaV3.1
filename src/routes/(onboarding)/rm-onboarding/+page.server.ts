import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { rmApplications } from '$lib/database/mongo';

export const load = async ({ cookies, locals }: ServerLoadEvent) => {
	const mobile = cookies.get('verifiedMobile') || cookies.get('mobileNumber');
	const accessToken = cookies.get('accessToken');

	// Bare /login throw — NO ?redirect= param. Onboarding IS the destination
	// after login; login.svelte routes new/incomplete users back to the right
	// onboarding page with the original deep-link redirect preserved. See the
	// matching comment in (onboarding)/+layout.server.ts for the full rationale.
	if (!accessToken && !mobile) throw redirect(302, '/login');

	// Determine the mobile number to check RM onboarding status
	const checkMobile = locals.user?.mobileNumber || mobile;

	if (checkMobile) {
		const rmProfile = await rmApplications.findOne(
			{ mobileNumber: { $in: [checkMobile, Number(checkMobile)] } } as any,
			{ projection: { onboardingCompleted: 1 } }
		);

		// If RM onboarding is already completed, go to RM dashboard
		if (rmProfile?.onboardingCompleted) {
			throw redirect(302, '/dashboard/rm');
		}
	}

	return {};
};
