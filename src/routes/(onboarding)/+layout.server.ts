import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url, cookies }) => {
	const roleCookie = cookies.get('role');
	if (!locals.user && !roleCookie) {
		// Bare /login throw — NO ?redirect= param appended deliberately.
		// (onboarding) IS the destination after a successful login from
		// /login; round-tripping `/login?redirect=/dsa-onboarding/...` would
		// either land the user back here unchanged (no progress) or loop if
		// the login handler's onboarding-required branch also points back at
		// onboarding. Login.svelte already auto-routes new/incomplete users
		// to the right onboarding path with the original deep-link redirect
		// preserved (see login.svelte line ~488 / ~515). This bare throw is
		// the right fallback when someone hits /(onboarding)/... cold without
		// a session — they go to /login, complete it, and re-enter the
		// onboarding flow naturally.
		throw redirect(302, '/login');
	}

	const role = locals.user?.role ?? roleCookie;
	const verifiedMobile = cookies.get('verifiedMobile');
	const redirectUrl = url.searchParams.get('redirect') ?? null;

	// 3-step DSA onboarding (RM uses only step 1)
	const isDsa = !role || role.toLowerCase() === 'dsa' || role.toLowerCase() === 'user';
	const steps = isDsa ? ['About You', 'Your Business', 'What Brings You Here'] : ['Your Details'];

	return {
		user: locals.user ?? null,
		role,
		verifiedMobile: verifiedMobile ? Number(verifiedMobile) : null,
		redirectUrl,
		steps
	};
};
