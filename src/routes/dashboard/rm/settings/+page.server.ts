import type { PageServerLoad } from './$types';
import logger from '$lib/server/logger.js';
import { resolveRmDoc, shapeRmProfile, type RmProfileView } from '$lib/server/rmHelpers.js';

/**
 * Three load outcomes (A.1) — the page renders one of three states:
 *   - `profile` set + `canSetup` false → normal profile view.
 *   - `profile` (incomplete stub or null) + `canSetup` true → setup form.
 *   - `profileError` true → genuine DB failure, show a retry error.
 * The old code collapsed "no doc" and "query threw" into one error; they're
 * now distinguished so a role-granted RM without a doc gets the setup form,
 * not a dead end.
 */
export const load: PageServerLoad = async ({
	parent
}): Promise<{ profile: RmProfileView | null; canSetup: boolean; profileError: boolean }> => {
	const parentData = await parent();
	const user = parentData.user;

	if (!user?.id) {
		return { profile: null, canSetup: false, profileError: false };
	}

	try {
		const rmDoc = await resolveRmDoc(user);

		// No doc yet for an RM-role user → offer the setup form (the doc is
		// created at set-role and/or when they submit the form).
		if (!rmDoc) {
			return { profile: null, canSetup: true, profileError: false };
		}

		const profile = shapeRmProfile(rmDoc);
		// An auto-provisioned stub is still incomplete until the RM fills it in.
		const canSetup = profile.profileStatus === 'profile_incomplete';
		return { profile, canSetup, profileError: false };
	} catch (error) {
		// A thrown query (DB down) is NOT "no profile" — surface a retryable error.
		logger.error({ err: error }, 'RM settings load error');
		return { profile: null, canSetup: false, profileError: true };
	}
};
