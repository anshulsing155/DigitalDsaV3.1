/**
 * Location Fetcher — Client-side API helper for location compound questions.
 *
 * Calls /api/form/location for state/city/area lookups and pincode reverse lookup.
 * Uses secureFetch for CSRF compliance.
 */

import { secureFetch } from '$lib/utils/csrf';
import type { ClientOption } from '$lib/types/formEngine';

/** Area/locality with its pincode (mirrors server-side AreaEntry) */
export interface AreaEntry {
	area: string;
	pincode: string;
}

/** Result of a reverse pincode lookup (mirrors server-side PincodeLookupResult) */
export interface PincodeLookupResult {
	state: string;
	city: string;
	area: string;
}

type LocationAction = 'states' | 'cities' | 'areas' | 'pincodeLookup' | 'pincodeSuggestions';

interface LocationParams {
	source?: 'selected' | 'all';
	state?: string;
	city?: string;
	pincode?: string;
}

/**
 * Generic location API call with retry logic.
 */
async function callLocationApi<T>(
	action: LocationAction,
	params: LocationParams,
	retries = 1
): Promise<T | null> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await secureFetch('/api/form/location', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...params })
			});

			if (!res.ok) {
				if (attempt < retries) {
					await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
					continue;
				}
				return null;
			}

			const result = await res.json();
			if (result.success && result.data) {
				return result.data as T;
			}
			return null;
		} catch {
			if (attempt < retries) {
				await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
				continue;
			}
			return null;
		}
	}
	return null;
}

/**
 * Fetch list of states for a given dataset.
 */
export async function fetchStates(source: 'selected' | 'all'): Promise<ClientOption[]> {
	const data = await callLocationApi<{ states: ClientOption[] }>('states', { source });
	return data?.states ?? [];
}

/**
 * Fetch cities for a given state.
 */
export async function fetchCities(
	state: string,
	source: 'selected' | 'all'
): Promise<ClientOption[]> {
	const data = await callLocationApi<{ cities: ClientOption[] }>('cities', { source, state });
	return data?.cities ?? [];
}

/**
 * Fetch areas/localities for a given state + city (with pincodes).
 */
export async function fetchAreas(
	state: string,
	city: string,
	source: 'selected' | 'all'
): Promise<AreaEntry[]> {
	const data = await callLocationApi<{ areas: AreaEntry[] }>('areas', { source, state, city });
	return data?.areas ?? [];
}

/**
 * Reverse lookup: pincode → matching locations.
 */
export async function lookupPincode(
	pincode: string,
	source: 'selected' | 'all'
): Promise<{ valid: boolean; locations: PincodeLookupResult[] }> {
	const data = await callLocationApi<{ valid: boolean; locations: PincodeLookupResult[] }>(
		'pincodeLookup',
		{ source, pincode }
	);
	return data ?? { valid: false, locations: [] };
}

/**
 * Get pincode suggestions for typeahead (prefix matching).
 */
export async function fetchPincodeSuggestions(
	input: string,
	source: 'selected' | 'all'
): Promise<Array<{ pincode: string; state: string; city: string; area: string }>> {
	const data = await callLocationApi<{
		suggestions: Array<{ pincode: string; state: string; city: string; area: string }>;
	}>('pincodeSuggestions', { source, pincode: input });
	return data?.suggestions ?? [];
}
