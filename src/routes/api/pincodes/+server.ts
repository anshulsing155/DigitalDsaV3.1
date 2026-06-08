/**
 * GET /api/pincodes?state=Maharashtra
 * GET /api/pincodes?state=Maharashtra&source=all  (uses full 36-state dataset)
 *
 * Returns ALL pincodes for every city in that state, grouped by city.
 * Pre-loaded when user selects state — no extra round-trip when city is picked.
 *
 * source=all: Uses pincode_IN_all.json (36 states, for applicant residence)
 * default:    Uses pincode_IN_Selected.json (24 states, for property location)
 *
 * Response: { success: true, data: { pincodes: { "Mumbai": [{ pincode, area }], ... } } }
 *
 * The 4.86 MB of source pincode JSON is loaded via dynamic import on the
 * first request that needs it and cached at module scope so warm
 * invocations skip the re-import. Functions that NEVER hit /api/pincodes
 * pay zero cost on cold start (the imports never execute).
 */
import type { RequestHandler } from './$types';
import { apiOk } from '$lib/server/apiResponse.js';

// Pincode dataset shape: { stateName: { cityName: { areaName: pincode } } }
type PincodeDataset = Record<string, Record<string, Record<string, string>>>;

// Cached per Node.js instance lifetime. The first request to hit a given
// source pays the ~200-400ms parse cost; every subsequent request in the
// same function instance returns instantly.
const datasetCache = new Map<'all' | 'selected', PincodeDataset>();

async function loadDataset(source: 'all' | 'selected'): Promise<PincodeDataset> {
	const cached = datasetCache.get(source);
	if (cached) return cached;

	const mod =
		source === 'all'
			? await import('$lib/config/pincode_IN_all.json')
			: await import('$lib/config/pincode_IN_Selected.json');

	// Vite's JSON import wraps the parsed object under `.default`.
	const dataset = (mod.default ?? mod) as unknown as PincodeDataset;
	datasetCache.set(source, dataset);
	return dataset;
}

export const GET: RequestHandler = async ({ url }) => {
	const state = url.searchParams.get('state')?.trim();
	const source = url.searchParams.get('source')?.trim();

	if (!state) {
		return apiOk({ pincodes: {} });
	}

	const dataset = await loadDataset(source === 'all' ? 'all' : 'selected');
	const cities = dataset[state];
	if (!cities) {
		return apiOk({ pincodes: {} });
	}

	// Build { city: [{ pincode, area }] } map
	const result: Record<string, Array<{ pincode: string; area: string }>> = {};
	for (const [rawCity, areas] of Object.entries(cities)) {
		const city = rawCity.trim();
		result[city] = Object.entries(areas).map(([area, pincode]) => ({
			pincode: pincode.trim(),
			area: area.trim()
		}));
	}

	return apiOk({ pincodes: result });
};
