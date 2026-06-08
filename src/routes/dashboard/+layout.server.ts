import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { DsaApplications, rmApplications, Cases } from '$lib/database/mongo';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { ObjectId } from 'mongodb';
import { getActiveNpsWindow } from '$lib/server/account/surveys';

export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	const accessToken = cookies.get('accessToken');

	// Redirect to login if not authenticated. Capture pathname + search so
	// query-string-bearing deep-links (e.g. /dashboard/dsa/cases?status=stuck)
	// survive the auth bounce. Parity with (app)/+layout.server.ts which
	// already does this. URL hash isn't sent to the server, so we can't
	// preserve it here — that's a browser limitation, not a fixable gap.
	if (!accessToken) {
		const redirectTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(302, `/login?redirect=${redirectTo}`);
	}

	// Get activeRole from locals (resolved in hooks.server.ts)
	const activeRole = locals.user?.activeRole || locals.role || 'dsa';
	const roles = locals.user?.roles || null;

	// Check if this is a demo session
	const isDemo = locals.user?.id === DEMO_USER_ID;

	// Admin users skip onboarding — they can view any dashboard for testing
	const isAdminUser = roles?.admin === true;

	let preferredLanguage: string | undefined;
	let themePreferences: { theme_mode?: string; color_scheme?: string } | null = null;
	let trialDaysLeft: number | null = null;
	let subscriptionStatus: string | null = null;
	let dsaCaseCount = 0;
	let npsWindow: 'day30' | 'day180' | null = null;
	// Holds the by-_id DSA doc (subscription + signup-date fields) so the
	// NPS Phase-2 await can read createdAt without a second findOne. Shape
	// is the projected fields only — typed loose to avoid coupling to the
	// full Mongo doc type.
	type ProjectedDsaDoc = {
		subscription?: { status?: string; expires_at?: Date };
		created_at?: Date;
		createdAt?: Date;
	};
	let dsaDoc: ProjectedDsaDoc | null = null;

	// ── PERF: Phase 1 — parallel fan-out of all DSA-path queries ────────────
	// Previously this layout ran 4 sequential awaits (onboarding findOne →
	// subscription findOne → resolveEffectiveDsaId → case count → NPS signup
	// findOne). Each round-trip stacked latency on top of the parent root
	// layout's dunningBanner query and the cascading dashboard/dsa layout. On
	// Vercel ap-south-1 ↔ Atlas, that was easily 300-800ms of pure wait per
	// request. Three of those queries hit the same DsaApplications doc so the
	// by-_id ones now merge into a single projection-extended findOne, and the
	// remaining three queries fan out concurrently via Promise.all.
	// Trade-off: on the onboarding-incomplete redirect path, the merged
	// findOne + count query do a small amount of wasted work before we throw
	// the redirect. Common path (onboarding completed) wins; redirect path
	// pays one extra cheap round-trip. Acceptable.
	if (locals.user && !isDemo && !isAdminUser && activeRole === 'dsa') {
		const mobile = locals.user.mobileNumber;
		const userIdObj = locals.user.id ? new ObjectId(locals.user.id) : null;

		const onboardingQuery = mobile
			? DsaApplications.findOne(
					{ mobileNumber: { $in: [mobile, Number(mobile)] } } as any,
					{
						projection: { onboardingCompleted: 1, preferred_language: 1, preferences: 1 }
					}
				)
			: Promise.resolve(null);

		// Merged projection — covers BOTH the trial banner (subscription.*) AND
		// the NPS signup-date eligibility check (createdAt / created_at). One
		// round-trip instead of two; identical filter (_id-based).
		const dsaDocQuery = userIdObj
			? DsaApplications.findOne(
					{ _id: userIdObj },
					{
						projection: {
							'subscription.status': 1,
							'subscription.expires_at': 1,
							createdAt: 1,
							created_at: 1
						}
					}
				).catch(() => null)
			: Promise.resolve(null);

		// Case count depends on resolveEffectiveDsaId. Chained inside one
		// promise so the count fires the instant the dsaId resolves, in
		// parallel with the other two queries above.
		const caseCountQuery = resolveEffectiveDsaId(locals)
			.then((r) => (r.ok ? Cases.countDocuments({ dsa_id: r.dsaId }) : 0))
			.catch(() => 0);

		const [profile, dsaDocResult, caseCount] = await Promise.all([
			onboardingQuery,
			dsaDocQuery,
			caseCountQuery
		]);
		dsaDoc = dsaDocResult as ProjectedDsaDoc | null;

		// Onboarding gate — redirect AFTER parallel completes. Cheap waste of
		// the dsaDoc + count queries on this path; common path is uninterrupted.
		if (mobile && (!profile || !profile.onboardingCompleted)) {
			throw redirect(302, '/dsa-onboarding');
		}
		preferredLanguage = profile?.preferred_language;
		themePreferences = profile?.preferences ?? null;

		// Subscription / trial banner data — unpacked from the merged findOne.
		const sub = dsaDoc?.subscription;
		if (sub?.status) {
			subscriptionStatus = sub.status;
			if (sub.status === 'trial' && sub.expires_at) {
				const msLeft = new Date(sub.expires_at).getTime() - Date.now();
				trialDaysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
			}
		}

		dsaCaseCount = caseCount;
	}

	// RM path — single onboarding check, no parallel fan-out needed.
	if (locals.user && !isDemo && !isAdminUser && activeRole === 'rm') {
		const mobile = locals.user.mobileNumber;
		if (mobile) {
			const rmProfile = await rmApplications.findOne(
				{ mobileNumber: { $in: [mobile, Number(mobile)] } } as any,
				{ projection: { onboardingCompleted: 1, preferred_language: 1, preferences: 1 } }
			);
			if (!rmProfile || !rmProfile.onboardingCompleted) {
				throw redirect(302, '/rm-onboarding');
			}
			preferredLanguage = rmProfile.preferred_language;
			themePreferences = rmProfile.preferences ?? null;
		}
	}

	// Redirect from /dashboard to the appropriate dashboard
	const currentPath = url.pathname;
	if (currentPath === '/dashboard') {
		if (activeRole === 'admin') throw redirect(302, '/dashboard/admin');
		if (activeRole === 'rm') throw redirect(302, '/dashboard/rm');
		throw redirect(302, '/dashboard/dsa');
	}

	// Build team context for client layout (nav filtering + banner).
	// Owner-name lookup stays serial here — it's a conditional branch (only
	// fires for non-owner team members) and adding it to the Phase 1 fan-out
	// would require evaluating the conditional twice. Single findOne when
	// reached; common path skips entirely.
	let teamContext:
		| { isOwner: boolean; ownerName?: string; permissions?: Record<string, boolean> }
		| undefined;
	if (locals.user?.teamContext) {
		const ctx = locals.user.teamContext;
		if (ctx.isOwner) {
			teamContext = { isOwner: true };
		} else {
			// Fetch owner's name for the banner
			let ownerName: string | undefined;
			try {
				const ownerDoc = await DsaApplications.findOne(
					{ _id: new ObjectId(ctx.ownerDsaId) },
					{ projection: { name: 1 } }
				);
				ownerName = ownerDoc?.name;
			} catch {
				/* non-fatal */
			}

			teamContext = {
				isOwner: false,
				ownerName,
				permissions: ctx.permissions as unknown as Record<string, boolean>
			};
		}
	}

	// ── F.5 — NPS banner eligibility (Phase 2) ──────────────────────────────
	// Depends on signup date from dsaDoc above. Kept serial because
	// getActiveNpsWindow is a function call that needs the date as input.
	// On the RM path dsaDoc is null (RM has no DsaApplications row), so this
	// just no-ops — covered in v1.1 per the original comment below.
	if (
		(activeRole === 'dsa' || activeRole === 'rm') &&
		locals.user?.id &&
		!isDemo
	) {
		try {
			const signupRaw = dsaDoc?.created_at ?? dsaDoc?.createdAt;
			if (signupRaw) {
				const userIdObj = new ObjectId(locals.user.id);
				npsWindow = await getActiveNpsWindow(userIdObj, new Date(signupRaw));
			}
		} catch {
			// Non-fatal — banner just doesn't show on a DB blip.
		}
	}

	return {
		user: locals.user,
		role: activeRole,
		roles,
		isDemo,
		preferredLanguage,
		themePreferences,
		teamContext,
		dsaCaseCount,
		trialDaysLeft,
		subscriptionStatus,
		npsWindow
	};
};
