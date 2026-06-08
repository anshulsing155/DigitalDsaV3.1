/**
 * Pincode Validator & Typeahead Utility
 * ═══════════════════════════════════════════════════════════════════
 * Validates pincodes against the official Indian postal code database
 * and provides typeahead suggestions for autocomplete
 */

import pincode_IN_all from '$lib/config/pincode_IN_all.json';

// Build reverse index for fast pincode validation (State, City) -> Pincode
interface PincodeIndex {
	[key: string]: {
		state: string;
		city: string;
		area: string;
	}[];
}

let pincodeIndex: PincodeIndex | null = null;

/**
 * Build a searchable index of all pincodes
 * Format: { "522101": [{ state, city, area }, ...], ... }
 */
function buildPincodeIndex(): PincodeIndex {
	if (pincodeIndex) return pincodeIndex;

	const index: PincodeIndex = {};

	Object.entries(pincode_IN_all).forEach(([state, cities]) => {
		Object.entries(cities as Record<string, Record<string, string>>).forEach(([rawCity, areas]) => {
			const city = rawCity.trim();
			Object.entries(areas).forEach(([rawArea, pincode]) => {
				const cleanPincode = (pincode as string).trim();
				const area = rawArea.trim();
				if (!index[cleanPincode]) {
					index[cleanPincode] = [];
				}
				index[cleanPincode].push({ state, city, area });
			});
		});
	});

	pincodeIndex = index;
	return index;
}

/**
 * Validate if a pincode exists in the database
 * @param pincode - 6-digit pincode string or number
 * @returns { valid: boolean, location?: { state, city, area } }
 */
export function validatePincode(pincode: string | number): {
	valid: boolean;
	locations?: Array<{ state: string; city: string; area: string }>;
} {
	const cleanPincode = String(pincode).trim();

	// Check if 6-digit format
	if (!/^\d{6}$/.test(cleanPincode)) {
		return { valid: false };
	}

	const index = buildPincodeIndex();
	const locations = index[cleanPincode];

	if (!locations || locations.length === 0) {
		return { valid: false };
	}

	return { valid: true, locations };
}

/**
 * Get typeahead suggestions for pincode as user types
 * @param input - partial pincode (1-6 digits)
 * @param limit - max suggestions to return (default: 10)
 * @returns Array of matching pincodes with locations
 */
export function getPincodeSuggestions(
	input: string,
	limit: number = 10
): Array<{
	pincode: string;
	state: string;
	city: string;
	area: string;
}> {
	if (!input || !/^\d{1,6}$/.test(input)) {
		return [];
	}

	const index = buildPincodeIndex();
	const suggestions: Array<{
		pincode: string;
		state: string;
		city: string;
		area: string;
	}> = [];
	const seen = new Set<string>();

	Object.entries(index).forEach(([pincode, locations]) => {
		if (pincode.startsWith(input) && !seen.has(pincode)) {
			locations.forEach((loc) => {
				suggestions.push({
					pincode,
					...loc
				});
			});
			seen.add(pincode);

			if (suggestions.length >= limit) {
				suggestions.length = limit;
			}
		}
	});

	return suggestions;
}

/**
 * Get all pincodes for a specific city
 * @param state - State name
 * @param city - City name
 * @returns Array of pincodes for that city
 */
export function getPincodesForCity(
	state: string,
	city: string
): Array<{ pincode: string; area: string }> {
	const cities = pincode_IN_all[state as keyof typeof pincode_IN_all];
	if (!cities) return [];

	// Try exact match first, then trimmed key match (handles trailing spaces in JSON data)
	let areas = cities[city as keyof typeof cities] as Record<string, string> | undefined;
	if (!areas) {
		// Fallback: find key that matches after trimming
		const match = Object.keys(cities).find((k) => k.trim() === city.trim());
		if (match) areas = cities[match as keyof typeof cities] as Record<string, string>;
	}
	if (!areas) return [];

	return Object.entries(areas).map(([rawArea, pincode]) => ({
		pincode: (pincode as string).trim(),
		area: rawArea.trim()
	}));
}

/**
 * Format pincode with location for display
 * @param pincode - 6-digit pincode
 * @returns formatted string like "522101 - Guntur, Andhra Pradesh"
 */
export function formatPincodeDisplay(pincode: string | number): string {
	const result = validatePincode(pincode);
	if (!result.valid || !result.locations?.[0]) {
		return String(pincode);
	}

	const { area, city, state } = result.locations[0];
	return `${pincode} - ${area}, ${city}, ${state}`;
}
