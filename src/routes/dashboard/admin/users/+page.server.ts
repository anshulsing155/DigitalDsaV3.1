import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { DsaApplications, rmApplications } from '$lib/database/mongo.js';
import { escapeRegex } from '$lib/server/utils.js';
import {
	E2E_TEST_MOBILE_NUMBERS,
	shouldShowTestEntities
} from '$lib/server/testEntityFilter.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin');

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 25;
	const skip = (page - 1) * limit;
	const search = (url.searchParams.get('q') || '').trim();

	const searchFilter = search
		? {
				$or: [
					{ name: { $regex: escapeRegex(search), $options: 'i' } },
					{ mobileNumber: { $in: [search, Number(search)] } }
				]
			}
		: {};

	// C.7 — in production, hide E2E test users (mobile 99999000XX). The
	// `is_test: true` marker on those documents would also exclude them via
	// PROD_ENTITY_FILTER, but the mobile-list belt-and-suspenders catches
	// older rows seeded before C.7 added the marker. shouldShowTestEntities()
	// reads `dev` — in development the team sees everyone (that's how they
	// test the suspend/impersonate flows).
	const testFilter = shouldShowTestEntities()
		? {}
		: {
				$and: [
					{ mobileNumber: { $nin: [...E2E_TEST_MOBILE_NUMBERS] } },
					{ is_test: { $in: [false, null] } }
				]
			};

	const filter = search ? { $and: [searchFilter, testFilter] } : testFilter;

	const [dsaUsers, dsaCount, rmUsers, rmCount] = await Promise.all([
		DsaApplications.find(filter as any)
			.project({
				name: 1,
				mobileNumber: 1,
				email: 1,
				lastActiveAt: 1,
				onboardingCompleted: 1,
				is_suspended: 1,
				createdAt: 1
			})
			.sort({ lastActiveAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray(),
		DsaApplications.countDocuments(filter as any),
		rmApplications
			.find(filter as any)
			.project({
				name: 1,
				mobileNumber: 1,
				email: 1,
				lastActiveAt: 1,
				onboardingCompleted: 1,
				is_suspended: 1,
				createdAt: 1
			})
			.sort({ lastActiveAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray(),
		rmApplications.countDocuments(filter as any)
	]);

	const serializeDocs = (docs: any[], role: string) =>
		docs.map((d) => ({
			_id: d._id.toString(),
			name: d.name || '',
			mobileNumber: String(d.mobileNumber || ''),
			email: d.email || '',
			lastActiveAt: d.lastActiveAt ? new Date(d.lastActiveAt).toISOString() : null,
			onboardingCompleted: Boolean(d.onboardingCompleted),
			is_suspended: Boolean(d.is_suspended),
			createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
			role
		}));

	return {
		dsaUsers: serializeDocs(dsaUsers, 'dsa'),
		dsaCount,
		rmUsers: serializeDocs(rmUsers, 'rm'),
		rmCount,
		page,
		limit,
		search,
		// Forwarded so the client can render the self-impersonation disable on
		// the admin's own row without a runtime cookie/userinfo round-trip (C.4).
		currentAdminId: locals.user!.id
	};
};
