/**
 * Geographic Scorer — Ranks and tags lenders by area presence
 * ══════════════════════════════════════════════════════════════════
 * NEVER filters out lenders. Instead, every lender gets a presence
 * chip (strong_presence / available / limited_presence / verify_availability)
 * and a geo score for ranking.
 *
 * Why no hard filtering:
 *   - Banks expand through DSA channels without opening branches
 *     (e.g., Bank of Maharashtra doing home loans in Greater Noida)
 *   - Our static data is always stale — can't know every expansion
 *   - The DSA on the ground knows better than our database
 *   - Better to show all matches with advisory chips than hide valid options
 *
 * Usage in evaluation pipeline:
 *   const scored = scoreLendersByGeo(allLenders, applicantState, applicantCity);
 *   // scored[0].geoPresence.chip === 'strong_presence'
 *   // scored is sorted: strongholds first, verify_availability last
 * ══════════════════════════════════════════════════════════════════
 */

import type { LenderMasterEntry, LenderGeoCoverage, IndianState, CityTier } from './types';

// ============================================================================
// METRO CITIES — Top 8 Indian metros
// ============================================================================

export const METRO_CITIES: ReadonlySet<string> = new Set([
	'Mumbai',
	'Delhi',
	'Bangalore',
	'Bengaluru',
	'Chennai',
	'Kolkata',
	'Hyderabad',
	'Pune',
	'Ahmedabad'
]);

// ============================================================================
// TIER 1 CITIES — Major cities beyond metros
// ============================================================================

export const TIER1_CITIES: ReadonlySet<string> = new Set([
	'Jaipur',
	'Lucknow',
	'Kanpur',
	'Nagpur',
	'Indore',
	'Bhopal',
	'Patna',
	'Vadodara',
	'Surat',
	'Coimbatore',
	'Kochi',
	'Visakhapatnam',
	'Agra',
	'Varanasi',
	'Nashik',
	'Meerut',
	'Rajkot',
	'Thiruvananthapuram',
	'Guwahati',
	'Chandigarh',
	'Mysore',
	'Mysuru',
	'Bhubaneswar',
	'Ranchi',
	'Raipur',
	'Dehradun',
	'Amritsar',
	'Ludhiana',
	'Jodhpur',
	'Udaipur',
	'Madurai',
	'Tiruchirappalli',
	'Vijayawada',
	'Jalandhar',
	'Gwalior',
	'Aurangabad',
	'Hubli',
	'Mangalore',
	'Mangaluru',
	'Noida',
	'Greater Noida',
	'Gurgaon',
	'Gurugram',
	'Faridabad',
	'Ghaziabad',
	'Thane',
	'Navi Mumbai',
	'Howrah'
]);

// ============================================================================
// PRESENCE CHIPS — Visual indicators on offer cards
// ============================================================================

/**
 * Presence chip displayed on each lender's offer card.
 * Sorted from most confident to least.
 */
export type PresenceChip =
	| 'strong_presence' // Green — stronghold state/city, dominant presence
	| 'available' // Neutral — active state, normal operations
	| 'limited_presence' // Amber — operates in state but not this city tier
	| 'verify_availability'; // Grey — not known to operate here, verify with RM

/** Human-readable labels for chips (used in UI) */
export const PRESENCE_CHIP_LABELS: Record<PresenceChip, string> = {
	strong_presence: 'Strong Presence',
	available: 'Available',
	limited_presence: 'Limited Presence',
	verify_availability: 'Verify Availability'
};

/** Chip colors for UI rendering */
export const PRESENCE_CHIP_COLORS: Record<PresenceChip, string> = {
	strong_presence: 'green',
	available: 'blue',
	limited_presence: 'amber',
	verify_availability: 'grey'
};

// ============================================================================
// GEO PRESENCE RESULT — Per-lender scoring output
// ============================================================================

export interface GeoPresenceResult {
	/** Presence chip to display on offer card */
	chip: PresenceChip;
	/** Human-readable explanation for the chip */
	reason: string;
	/** Whether this is a stronghold area for the lender */
	isStronghold: boolean;
	/**
	 * Geo relevance score (0.0-1.0) — used for ranking, NOT filtering.
	 * Higher = more likely to service this area well.
	 *   0.9-1.0: Stronghold state + city match
	 *   0.7-0.9: Active state, good city tier match
	 *   0.4-0.7: Active state but limited city tier presence
	 *   0.1-0.4: Not in active states — verify availability
	 */
	geoScore: number;
	/** City tier classification (metro/tier1/tier2/tier3_rural) */
	cityTier: CityTier | null;
}

// ============================================================================
// CORE SCORING FUNCTION
// ============================================================================

/**
 * Score a single lender's geographic relevance for a given state/city.
 * NEVER returns "excluded" — always returns a chip + score.
 */
export function scoreLenderGeoPresence(
	geo: LenderGeoCoverage,
	applicantState?: string,
	applicantCity?: string
): GeoPresenceResult {
	// No location data → neutral chip, mid score
	if (!applicantState) {
		return {
			chip: 'available',
			reason: 'No location data — showing all lenders',
			isStronghold: false,
			geoScore: 0.5,
			cityTier: null
		};
	}

	const state = applicantState as IndianState;
	const city = applicantCity?.trim() || '';
	const cityTier = classifyCityTier(city);
	const cityMatch =
		city !== '' && geo.strongholdCities?.some((c) => c.toLowerCase() === city.toLowerCase());

	// ── PAN India lenders ────────────────────────────────────

	if (geo.coverage === 'pan_india') {
		// Even pan_india lenders may have excluded states
		if (geo.excludedStates?.includes(state)) {
			return {
				chip: 'verify_availability',
				reason: `${state} not in typical operating area — verify with RM`,
				isStronghold: false,
				geoScore: 0.2,
				cityTier
			};
		}

		const isStronghold = geo.strongholdStates.includes(state) || !!cityMatch;

		if (isStronghold) {
			return {
				chip: 'strong_presence',
				reason: cityMatch ? `Dominant presence in ${city}` : `Strong presence across ${state}`,
				isStronghold: true,
				geoScore: cityMatch ? 1.0 : 0.95,
				cityTier
			};
		}

		return {
			chip: 'available',
			reason: `PAN India operations — available in ${state}`,
			isStronghold: false,
			geoScore: 0.8,
			cityTier
		};
	}

	// ── Non-PAN India lenders (multi_state / regional / state_focused / metro_only) ──

	const isActiveState = geo.activeStates.includes(state);
	const isStrongholdState = geo.strongholdStates.includes(state);

	// ── Case 1: Stronghold state ──────────────────────────────

	if (isStrongholdState) {
		// Stronghold + city match = maximum confidence
		if (cityMatch) {
			return {
				chip: 'strong_presence',
				reason: `Dominant presence in ${city}, ${state}`,
				isStronghold: true,
				geoScore: 1.0,
				cityTier
			};
		}

		// Stronghold state but check city tier compatibility
		if (cityTier && !geo.cityTierPresence.includes(cityTier)) {
			return {
				chip: 'available',
				reason: `Strong in ${state}, but limited ${cityTier} city coverage`,
				isStronghold: false,
				geoScore: 0.7,
				cityTier
			};
		}

		return {
			chip: 'strong_presence',
			reason: `Stronghold — dominant presence in ${state}`,
			isStronghold: true,
			geoScore: 0.95,
			cityTier
		};
	}

	// ── Case 2: Active state (not stronghold) ─────────────────

	if (isActiveState) {
		// Active state + city tier check
		if (cityTier && !geo.cityTierPresence.includes(cityTier)) {
			return {
				chip: 'limited_presence',
				reason: `Operates in ${state}, but limited presence in ${cityTier} cities`,
				isStronghold: false,
				geoScore: 0.45,
				cityTier
			};
		}

		// Metro-only lender: check if city is in their specific list
		if (geo.coverage === 'metro_only' && geo.activeCities && city) {
			const cityInList = geo.activeCities.some((c) => c.toLowerCase() === city.toLowerCase());
			if (!cityInList) {
				return {
					chip: 'limited_presence',
					reason: `${city} not in confirmed city list — verify with RM`,
					isStronghold: false,
					geoScore: 0.35,
					cityTier
				};
			}
		}

		return {
			chip: 'available',
			reason: `Active operations in ${city || state}`,
			isStronghold: false,
			geoScore: 0.75,
			cityTier
		};
	}

	// ── Case 3: State NOT in active list ──────────────────────
	// Don't filter — show with advisory chip.
	// The DSA may know something our data doesn't (like BoM in Noida).

	return {
		chip: 'verify_availability',
		reason: `${state} not in known operating area — verify with lender/RM`,
		isStronghold: false,
		geoScore: 0.15,
		cityTier
	};
}

// ============================================================================
// BATCH SCORING — Score all lenders, sorted by relevance
// ============================================================================

/** Lender entry enriched with geo presence data */
export interface ScoredLender {
	lender: LenderMasterEntry;
	geoPresence: GeoPresenceResult;
}

/**
 * Score ALL lenders by geographic relevance and sort by geo score.
 * NEVER filters — every lender gets a score and chip.
 * Stronghold lenders appear first, verify_availability last.
 */
export function scoreLendersByGeo(
	lenders: LenderMasterEntry[],
	applicantState?: string,
	applicantCity?: string
): ScoredLender[] {
	const scored: ScoredLender[] = lenders.map((lender) => ({
		lender,
		geoPresence: scoreLenderGeoPresence(lender.geoCoverage, applicantState, applicantCity)
	}));

	// Sort by geo score descending (strongholds first, verify last)
	scored.sort((a, b) => b.geoPresence.geoScore - a.geoPresence.geoScore);

	return scored;
}

/**
 * Get a summary count of lenders by presence chip.
 * Useful for UI: "12 Strong Presence, 8 Available, 5 Limited, 3 Verify"
 */
export function getPresenceSummary(scored: ScoredLender[]): Record<PresenceChip, number> {
	const summary: Record<PresenceChip, number> = {
		strong_presence: 0,
		available: 0,
		limited_presence: 0,
		verify_availability: 0
	};

	for (const s of scored) {
		summary[s.geoPresence.chip]++;
	}

	return summary;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Classify a city into a tier based on known city lists.
 * Returns null if city is empty or unknown.
 */
export function classifyCityTier(city: string): CityTier | null {
	if (!city) return null;

	const normalized = city.trim();

	if (METRO_CITIES.has(normalized)) return 'metro';
	if (TIER1_CITIES.has(normalized)) return 'tier1';

	// If we have a city name but it's not in metro/tier1, assume tier2
	// (tier3 would be villages/talukas which are rarely entered as city names)
	return 'tier2';
}

/**
 * Get the relevant state from a loan application payload.
 * Secured loans use property state; unsecured use residence/business state.
 */
export function extractApplicantState(payload: {
	loanTransaction: {
		propertyState?: string;
		residenceState?: string;
	};
}): string | undefined {
	return payload.loanTransaction.propertyState || payload.loanTransaction.residenceState;
}

/**
 * Get the relevant city from a loan application payload.
 */
export function extractApplicantCity(payload: {
	loanTransaction: {
		propertyCity?: string;
		residenceCity?: string;
	};
}): string | undefined {
	return payload.loanTransaction.propertyCity || payload.loanTransaction.residenceCity;
}
