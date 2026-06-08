/**
 * GET /api/location/cities?source=selected
 *
 * Returns a flat, deduped, sorted list of city names across all states in the
 * chosen pincode dataset. Used by onboarding screens that need a single city
 * dropdown not scoped to a state.
 *
 * source=all     → cityList_all.json      (753 cities, from 36 states)
 * default/selected → cityList_selected.json (84 cities, from 24 serviceable states)
 *
 * Response: { success: true, data: { cities: ["Agra", "Ahmedabad", ...] } }
 *
 * Imports pre-computed derived lists (~12 KB cumulative) instead of the full
 * 4.86 MB of source pincode JSON. Derivation logic lives in
 * scripts/generate-pincode-derived.cjs and is byte-equivalent to the
 * previous in-process `buildCityList()` call.
 *
 * No auth: onboarding flows are pre-auth (`AboutYou.svelte`, `DSADetails.svelte`)
 * and need this list before the user has a session. Rate-limited by IP to
 * keep the public surface consistent with project conventions.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import allCities from '$lib/config/_generated/cityList_all.json';
import selectedCities from '$lib/config/_generated/cityList_selected.json';

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// Rate limit: 60 requests/minute per IP. Onboarding fetches once per mount,
	// so a normal user makes ~2 calls (AboutYou + DSADetails). The 60/min ceiling
	// leaves ample room for retries while blocking scraper-style hammering.
	const ip = getClientAddress();
	const limited = await rateLimit(ip, {
		identifier: `location-cities:${ip}`,
		maxRequests: 60,
		windowMs: 60_000
	});
	if (limited) {
		return apiError('Too many requests. Please wait before trying again.', 429);
	}

	const source = url.searchParams.get('source')?.trim();
	const cities = source === 'all' ? allCities : selectedCities;
	return apiOk({ cities });
};
