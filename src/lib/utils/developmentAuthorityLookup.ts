/**
 * Development Authority Lookup
 * ============================================================================
 * Client-safe lookup for resolving city/state → development authorities.
 * Reads from `$lib/config/developmentAuthorities.json` (no server-only deps).
 *
 * Used by:
 *  - `$lib/server/formEngine/optionResolver.ts` — populates the q1_authorityName dropdown
 *  - `src/routes/(app)/form/home-loan/+page.svelte` — auto-fills the answer when a
 *    city has exactly one authority (smart-form: don't ask if there's only one choice)
 * ============================================================================
 */

import authorityData from '$lib/config/developmentAuthorities.json';

/** lowercase city → array of full authority names ("DDA (Delhi Development Authority)") */
const CITY_AUTHORITY_LOOKUP: Record<string, string[]> = {};
/** lowercase state → deduplicated array of all authority full names in state */
const STATE_AUTHORITY_LOOKUP: Record<string, string[]> = {};

// City name aliases: authority JSON uses official/district names, pincode data uses common names.
// Maps authority JSON key (lowercase) → pincode dropdown value(s) (lowercase).
const CITY_ALIASES: Record<string, string[]> = {
	// Uttar Pradesh
	'gautam buddha nagar': ['noida', 'greater noida'],
	'kanpur nagar': ['kanpur'],
	allahabad: ['prayagraj'],
	// Delhi (all sub-districts → single "Delhi" in pincode)
	'central delhi': ['delhi'],
	'east delhi': ['delhi'],
	'new delhi': ['delhi'],
	'north delhi': ['delhi'],
	'north west delhi': ['delhi'],
	'south delhi': ['delhi'],
	'south west delhi': ['delhi'],
	'west delhi': ['delhi'],
	// Karnataka
	bangalore: ['bengaluru'],
	'bangalore rural': ['bengaluru'],
	mysore: ['mysuru'],
	belgaum: ['belagavi'],
	dharward: ['hubli'],
	// Gujarat
	'gandhi nagar': ['gandhinagar'],
	junagadh: ['junagadh'],
	// Haryana
	gurgaon: ['gurugram'],
	ambala: ['ambala'],
	panipat: ['panipat'],
	sonipat: ['sonipat'],
	// Maharashtra
	'mumbai suburban': ['mumbai'],
	thane: ['thane'],
	raigad: ['navi mumbai'],
	palghar: ['mumbai'],
	// Tamil Nadu
	kancheepuram: ['kanchipuram'],
	tiruvallur: ['chennai'],
	chengalpattu: ['chennai'],
	// Telangana
	rangareddy: ['hyderabad'],
	'medchal malkajgiri': ['secunderabad'],
	// Kerala
	ernakulam: ['kochi'],
	// West Bengal
	'north 24 parganas': ['kolkata'],
	'south 24 parganas': ['kolkata'],
	// Jharkhand
	bokaro: ['bokaro'],
	dhanbad: ['dhanbad'],
	// Others
	haridwar: ['haridwar'],
	bikaner: ['bikaner']
};

// Build lookups from JSON at module load time
for (const [stateName, cities] of Object.entries(authorityData)) {
	if (stateName.startsWith('_')) continue; // skip metadata keys
	const stateAuths = new Set<string>();
	for (const [city, authorities] of Object.entries(cities as Record<string, string[]>)) {
		CITY_AUTHORITY_LOOKUP[city.toLowerCase()] = authorities;
		for (const auth of authorities) stateAuths.add(auth);

		// Register aliases so popular city names also resolve
		const aliases = CITY_ALIASES[city.toLowerCase()];
		if (aliases) {
			for (const alias of aliases) {
				if (!CITY_AUTHORITY_LOOKUP[alias]) {
					CITY_AUTHORITY_LOOKUP[alias] = authorities;
				}
			}
		}
	}
	STATE_AUTHORITY_LOOKUP[stateName.toLowerCase()] = [...stateAuths];
}

/**
 * Extract the short code from a full authority name.
 * E.g., "DDA (Delhi Development Authority)" → "DDA"
 */
export function extractAuthorityCode(fullName: string): string {
	const match = fullName.match(/^([A-Z]+)/);
	return match ? match[1] : fullName;
}

/** All authorities (full names) for a city. Empty array if no mapping. */
export function getAuthoritiesForCity(city: string): string[] {
	if (!city) return [];
	return CITY_AUTHORITY_LOOKUP[city.trim().toLowerCase()] ?? [];
}

/** All unique authorities (full names) for a state. Fallback when city has no mapping. */
export function getAuthoritiesForState(state: string): string[] {
	if (!state) return [];
	return STATE_AUTHORITY_LOOKUP[state.trim().toLowerCase()] ?? [];
}

/** Primary authority code for a city (first-listed). Null if no mapping. */
export function resolveAuthorityForCity(city: string): string | null {
	const authorities = getAuthoritiesForCity(city);
	if (!authorities.length) return null;
	return extractAuthorityCode(authorities[0]);
}

/**
 * Returns the authority code IFF the city has exactly one authority.
 * Used to auto-fill the answer instead of showing a 1-option dropdown.
 * Returns null when the city has 0 or 2+ authorities.
 */
export function resolveSingleAuthorityForCity(city: string): string | null {
	const authorities = getAuthoritiesForCity(city);
	if (authorities.length !== 1) return null;
	return extractAuthorityCode(authorities[0]);
}

/** All authority codes valid in a state (for validation / city-mismatch checks). */
export function getAuthorityCodesForState(state: string): Set<string> {
	const stateData = (authorityData as unknown as Record<string, Record<string, string[]>>)[state];
	if (!stateData) return new Set();
	const codes = new Set<string>();
	for (const authorities of Object.values(stateData)) {
		for (const auth of authorities) {
			codes.add(extractAuthorityCode(auth));
		}
	}
	return codes;
}
