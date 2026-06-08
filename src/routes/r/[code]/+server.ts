/**
 * GET /r/[code]
 * ══════════════════════════════════════════════════════════════════════
 * Public referral-link landing. Validates the code, sets the referral
 * cookie (30d), and redirects to /login (which routes to signup for
 * new mobile numbers). The cookie is consumed at DSA onboarding to
 * insert the Referrals row + set referred_by.
 *
 * Invalid / unknown codes redirect to /login without setting the
 * cookie — we don't tell the visitor whether the code is real (small
 * privacy benefit; main reason is simplicity).
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.1
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findReferrerByCode } from '$lib/server/referrals/referralCode';
import {
	REFERRAL_COOKIE_NAME,
	REFERRAL_COOKIE_MAX_AGE_SECONDS
} from '$lib/types/referral';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const code = params.code?.toUpperCase().trim() ?? '';

	const referrer = await findReferrerByCode(code);
	if (referrer) {
		cookies.set(REFERRAL_COOKIE_NAME, code, {
			path: '/',
			httpOnly: true, // server reads it at onboarding; no client JS need
			secure: !dev,
			sameSite: 'lax',
			maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS
		});
	}

	// Redirect either way — invalid codes silently fall through to a
	// normal signup flow without attribution.
	throw redirect(302, '/login');
};
