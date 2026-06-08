import type { LayoutServerLoad } from './$types';
import { loadDunningBannerState } from '$lib/server/billing/dunningBannerState';

export const load: LayoutServerLoad = async ({ locals }) => {
	// D.1 S5: dunning banner state is loaded on every nav. The helper
	// short-circuits for non-DSA / unauthenticated / non-dunning callers
	// before any Mongo work, so this is cheap on the hot path.
	const dunningBanner = await loadDunningBannerState(locals);

	if (!locals.user) {
		return {
			user: null,
			dunningBanner
		};
	}
	return {
		user: locals.user,
		role: locals.user?.role,
		dunningBanner
	};
};
