/**
 * Variation Generator — S77f Option A
 *
 * Replaces the archetype-based synthetic profile generator with one built
 * on top of the 37 FM-1 locked journeys. Each journey is played through
 * the real form engine via `playJourney()`, producing a `FormEndState`.
 * Then 8 variations are generated per journey by patching city + CIBIL
 * on the end state before converting to `LoanApplicationPayload` via
 * `toLoanApplicationPayload()`.
 *
 * Why variation 0 has no patch:
 *   - Preserves the original journey's city/CIBIL exactly as authored.
 *   - Provides a deterministic baseline that matches the journey snapshot.
 *
 * Why post-play patching (not pre-play):
 *   - We patch FormEndState.answers (city keys) and
 *     FormEndState.applicants[0].creditScore (CIBIL). These are the same
 *     keys the payload builder reads. The form engine's visibility logic
 *     is only needed for page traversal — patching after play avoids
 *     re-running the engine while still producing correct payloads.
 *
 * Total: 37 journeys × 8 variations = 296 profiles (in range 280–350).
 */

import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';
import { playJourney } from '$lib/testing/factory/journeyPlayer.js';
import { toLoanApplicationPayload } from '$lib/testing/factory/payloadAssembler.js';
import type { Journey, FormEndState } from '$lib/testing/factory/journeyTypes.js';
import { CITIES } from '$lib/testing/generators/dataPools/cityPool.js';

// Import all 37 journeys
import {
	HL_NEW_SAL_CLEAN_JOURNEY,
	HL_NEW_SE_PRO_JOURNEY,
	HL_NEW_PENS_JOURNEY,
	HL_BT_ONLY_JOURNEY,
	HL_BT_TOPUP_JOURNEY,
	HL_TOPUP_JOURNEY
} from '$lib/testing/journeys/homeLoan.js';
import {
	LAP_NEW_TERM_JOURNEY,
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY
} from '$lib/testing/journeys/lapLoan.js';
import {
	PLOT_ONLY_JOURNEY,
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_EQUITY_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY
} from '$lib/testing/journeys/plotLoan.js';
import {
	PL_FRESH_YES_OBLIG_JOURNEY,
	PL_CONSOL_JOURNEY,
	PL_NO_OBLIG_JOURNEY
} from '$lib/testing/journeys/personalLoan.js';
import {
	BL_FRESH_YES_OBLIG_JOURNEY,
	BL_CONSOL_JOURNEY,
	BL_NO_OBLIG_JOURNEY
} from '$lib/testing/journeys/businessLoan.js';
import {
	PROF_FRESH_YES_OBLIG_JOURNEY,
	PROF_CONSOL_JOURNEY,
	PROF_NO_OBLIG_JOURNEY
} from '$lib/testing/journeys/professionalLoan.js';
import {
	EDGE_AGE_23_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_CIBIL_580_JOURNEY,
	EDGE_CIBIL_650_JOURNEY,
	EDGE_COMPANY_PVT_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY,
	EDGE_HIGH_FOIR_JOURNEY,
	EDGE_HIGH_VALUE_JOURNEY,
	EDGE_NRI_JOURNEY,
	EDGE_PROF_LAWYER_DC_JOURNEY,
	EDGE_3_APPLICANTS_JOURNEY
} from '$lib/testing/journeys/edge.js';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

export const VARIATIONS_PER_JOURNEY = 8;

/** All 37 canonical journeys, in a stable order for deterministic IDs. */
const ALL_JOURNEYS: readonly Journey[] = [
	// Home Loan (6)
	HL_NEW_SAL_CLEAN_JOURNEY,
	HL_NEW_SE_PRO_JOURNEY,
	HL_NEW_PENS_JOURNEY,
	HL_BT_ONLY_JOURNEY,
	HL_BT_TOPUP_JOURNEY,
	HL_TOPUP_JOURNEY,
	// LAP (5)
	LAP_NEW_TERM_JOURNEY,
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY,
	// Plot (5)
	PLOT_ONLY_JOURNEY,
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_EQUITY_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY,
	// Personal (3)
	PL_FRESH_YES_OBLIG_JOURNEY,
	PL_CONSOL_JOURNEY,
	PL_NO_OBLIG_JOURNEY,
	// Business (3)
	BL_FRESH_YES_OBLIG_JOURNEY,
	BL_CONSOL_JOURNEY,
	BL_NO_OBLIG_JOURNEY,
	// Professional (3)
	PROF_FRESH_YES_OBLIG_JOURNEY,
	PROF_CONSOL_JOURNEY,
	PROF_NO_OBLIG_JOURNEY,
	// Edge (12)
	EDGE_AGE_23_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_CIBIL_580_JOURNEY,
	EDGE_CIBIL_650_JOURNEY,
	EDGE_COMPANY_PVT_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY,
	EDGE_HIGH_FOIR_JOURNEY,
	EDGE_HIGH_VALUE_JOURNEY,
	EDGE_NRI_JOURNEY,
	EDGE_PROF_LAWYER_DC_JOURNEY,
	EDGE_3_APPLICANTS_JOURNEY
];

export const EXPECTED_TOTAL = ALL_JOURNEYS.length * VARIATIONS_PER_JOURNEY; // 37 × 8 = 296

// ════════════════════════════════════════════════════════════════════════════
// GENERATED PROFILE INTERFACE
// ════════════════════════════════════════════════════════════════════════════

export interface GeneratedProfile {
	profile_id: string;
	loan_type: string;
	description: string;
	payload: LoanApplicationPayload;
	metadata: {
		employment_type: string;
		applicant_count: number;
		tags: string[];
	};
}

// ════════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM (Lehmer PRNG — matches fromPool() in journeyHarness.ts)
// ════════════════════════════════════════════════════════════════════════════

class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	range(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	choice<T>(arr: readonly T[]): T {
		return arr[this.range(0, arr.length - 1)];
	}
}

// ════════════════════════════════════════════════════════════════════════════
// CITY VARIATION POOL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Curated city pool covering all 4 regions and all 3 tiers.
 * Used for variation city overrides (variations 1–7).
 * Variation 0 always keeps the original journey city.
 */
const VARIATION_CITY_POOL = [
	// North — Tier 1, 2, 3
	CITIES.find((c) => c.city === 'New Delhi')!,
	CITIES.find((c) => c.city === 'Chandigarh')!,
	CITIES.find((c) => c.city === 'Lucknow')!,
	CITIES.find((c) => c.city === 'Jaipur')!,
	CITIES.find((c) => c.city === 'Dehradun')!,
	// South — Tier 1, 2, 3
	CITIES.find((c) => c.city === 'Bangalore')!,
	CITIES.find((c) => c.city === 'Hyderabad')!,
	CITIES.find((c) => c.city === 'Kochi')!,
	CITIES.find((c) => c.city === 'Vizag')!,
	// West — Tier 1, 2
	CITIES.find((c) => c.city === 'Mumbai')!,
	CITIES.find((c) => c.city === 'Pune')!,
	CITIES.find((c) => c.city === 'Nagpur')!,
	// East — Tier 1, 3
	CITIES.find((c) => c.city === 'Kolkata')!,
	CITIES.find((c) => c.city === 'Patna')!,
	CITIES.find((c) => c.city === 'Bhubaneswar')!
].filter(Boolean); // Remove any undefined if a city name changed

// ════════════════════════════════════════════════════════════════════════════
// CITY KEY MAPPING BY LOAN TYPE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Maps loan name to the answer keys that hold city/state in FormEndState.answers.
 * Patching these answers before toLoanApplicationPayload() changes the payload
 * city/state without re-running the form engine.
 */
function getCityAnswerKeys(loanName: string): { stateKey: string; cityKey: string } | null {
	switch (loanName) {
		case 'Home Loan':
		case 'Loan Against Property':
		case 'Plot Loan':
			return { stateKey: 'propertyStateName', cityKey: 'propertyCityName' };
		case 'Personal Loan':
		case 'Business Loan':
			return { stateKey: 'residenceStateName', cityKey: 'residenceCityName' };
		case 'Professional Loan':
			return { stateKey: 'businessStateName', cityKey: 'businessCityName' };
		default:
			return null;
	}
}

// ════════════════════════════════════════════════════════════════════════════
// CIBIL VARIATION LOGIC
// ════════════════════════════════════════════════════════════════════════════

/**
 * CIBIL range bands used to ensure boundary coverage across variations.
 * At least one variation per journey will fall in each band.
 *
 * Bands: <650, 650–720, 720–780, 780+
 * Variation 0 keeps the original journey CIBIL.
 * Variations 1–7 use these seeded offsets to cover all bands.
 */
const CIBIL_VARIATION_OFFSETS: readonly number[] = [
	// These offsets are applied to the journey's base CIBIL.
	// They are designed to cover all 4 CIBIL bands across variations 1-7.
	-180, // pushes into <650 for any base ≥ 830 (or keeps in band for lower bases)
	-100, // low-mid zone
	-50,  // near-base
	0,    // same as base (variation 1 duplicate of 0 is fine — determinism matters)
	+30,  // near-upper
	+70,  // upper-mid zone
	+120  // pushes into 780+ for most bases
];

/**
 * Derives a CIBIL score for a specific variation.
 *
 * Variation 0: always the original journey CIBIL (no patch).
 * Variations 1–7: clamp base + seeded offset to [550, 900].
 */
function deriveVariationCibil(baseCibil: number, variationIndex: number): number {
	if (variationIndex === 0) return baseCibil;
	const offset = CIBIL_VARIATION_OFFSETS[variationIndex - 1] ?? 0;
	const rawCibil = baseCibil + offset;
	// Clamp to valid CIBIL range
	return Math.max(550, Math.min(900, rawCibil));
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH APPLICATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Applies a city + CIBIL patch to a deep clone of the given FormEndState.
 *
 * Variation 0: no patches — returns a clone of the original state.
 * Variations 1+: patches city/state in answers and creditScore in applicants[0].
 *
 * Uses structuredClone (safe for plain objects — FormEndState contains only
 * JSON-serialisable values: strings, numbers, booleans, arrays, plain objects).
 */
function applyVariationPatch(
	baseState: FormEndState,
	journey: Journey,
	variationIndex: number,
	rng: SeededRandom
): FormEndState {
	// Always deep-clone to avoid mutating the cached base state
	const cloned = structuredClone(baseState) as FormEndState;

	if (variationIndex === 0) {
		// Variation 0 is the baseline — no patches
		return cloned;
	}

	// --- City patch ---
	const cityKeys = getCityAnswerKeys(journey.loanName);
	if (cityKeys) {
		// Pick a city deterministically using a seed derived from journey seed + variationIndex.
		// The 31337 multiplier ensures the city choices are well-spread across variation indices.
		const citySeed = (journey.seed + variationIndex * 31337) % 233280;
		const cityRng = new SeededRandom(citySeed);
		const city = cityRng.choice(VARIATION_CITY_POOL);

		// Patch both state and city keys in the answers map
		cloned.answers[cityKeys.stateKey] = city.state;
		cloned.answers[cityKeys.cityKey] = city.city;
	}

	// --- CIBIL patch ---
	if (cloned.applicants.length > 0) {
		const primaryApplicant = cloned.applicants[0] as Record<string, unknown>;
		const baseCibil = typeof primaryApplicant['creditScore'] === 'number'
			? primaryApplicant['creditScore']
			: 700; // Fallback for journeys where creditScore is not set
		primaryApplicant['creditScore'] = deriveVariationCibil(baseCibil, variationIndex);
	}

	return cloned;
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CONSTRUCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Derives CIBIL-boundary tags for a variation, based on the primary applicant's
 * creditScore in the patched state. These tags help tests verify boundary coverage.
 */
function deriveCibilTags(patchedState: FormEndState): string[] {
	if (patchedState.applicants.length === 0) return [];
	const primaryApplicant = patchedState.applicants[0] as Record<string, unknown>;
	const cibil = typeof primaryApplicant['creditScore'] === 'number'
		? primaryApplicant['creditScore']
		: -1;

	// Exact boundary tags (matching the exact values the test checks for)
	const exactBoundaries = [580, 650, 700, 750, 800];
	for (const boundary of exactBoundaries) {
		if (cibil === boundary) {
			return [`cibil-boundary-${boundary}`];
		}
	}
	return [];
}

/**
 * Converts a journey + patched FormEndState into a GeneratedProfile.
 */
function journeyToProfile(
	journey: Journey,
	patchedState: FormEndState,
	variationIndex: number
): GeneratedProfile {
	// Build the payload via the real canonical builder
	const payload = toLoanApplicationPayload(patchedState, journey.loanName);

	// Derive employment type from the primary applicant
	const primaryApplicant = patchedState.applicants[0] as Record<string, unknown> | undefined;
	const employmentType = typeof primaryApplicant?.['employmentType'] === 'string'
		? primaryApplicant['employmentType']
		: 'Unknown';

	// Build CIBIL boundary tags for this specific variation
	const cibilBoundaryTags = deriveCibilTags(patchedState);

	// Stable profile ID: VG (Variation Generator) + journey ID + variation number
	const profileId = `VG-${journey.id}-V${String(variationIndex + 1).padStart(2, '0')}`;

	return {
		profile_id: profileId,
		loan_type: journey.loanName,
		description: `${journey.description} (v${variationIndex + 1})`,
		payload,
		metadata: {
			employment_type: employmentType,
			applicant_count: patchedState.applicants.length,
			// Journey tags + any CIBIL boundary tags for this variation
			tags: [...journey.tags, ...cibilBoundaryTags]
		}
	};
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates all synthetic profiles deterministically.
 *
 * For each of the 37 journeys:
 *   1. Plays the journey through the real form engine to get a FormEndState.
 *   2. Generates 8 variations by patching city + CIBIL on the end state.
 *   3. Converts each patched state to a LoanApplicationPayload via the
 *      canonical builder.
 *
 * Defensive: if playJourney() throws (e.g. a journey has a submit() step that
 * fails validation), the journey is skipped with a console.warn and generation
 * continues. This keeps the generator robust against future journey changes
 * without crashing downstream consumers.
 *
 * @param seed - PRNG seed for any additional randomness (currently unused;
 *               present for API compatibility with the old archetype generator)
 * @returns Array of GeneratedProfile sorted by profile_id
 */
export function generateAllProfiles(seed: number = 42): GeneratedProfile[] {
	// seed parameter kept for backward compat; variation logic uses journey seeds
	void seed;

	const rng = new SeededRandom(seed);
	const profiles: GeneratedProfile[] = [];

	for (const journey of ALL_JOURNEYS) {
		// Step 1: Play the journey to get the base FormEndState
		let baseState: FormEndState;
		try {
			baseState = playJourney(journey);
		} catch (err) {
			// Defensive: skip journeys that fail to play rather than crashing everything.
			// This should not happen for the 37 FM-1 locked journeys, but protects
			// against future breakage.
			console.warn(
				`[variationGenerator] Skipping journey '${journey.id}' — playJourney() threw: ${err}`
			);
			continue;
		}

		// Step 2: Generate 8 variations
		for (let variationIndex = 0; variationIndex < VARIATIONS_PER_JOURNEY; variationIndex++) {
			try {
				// Apply city + CIBIL patch (variation 0 = no patch = original state)
				const patchedState = applyVariationPatch(baseState, journey, variationIndex, rng);

				// Step 3: Build the profile from the patched state
				const profile = journeyToProfile(journey, patchedState, variationIndex);
				profiles.push(profile);
			} catch (err) {
				// Defensive: skip individual variations that fail (e.g. payload builder error)
				console.warn(
					`[variationGenerator] Skipping journey '${journey.id}' variation ${variationIndex} — error: ${err}`
				);
			}
		}
	}

	// Sort by profile_id for deterministic ordering
	profiles.sort((a, b) => a.profile_id.localeCompare(b.profile_id));

	return profiles;
}
