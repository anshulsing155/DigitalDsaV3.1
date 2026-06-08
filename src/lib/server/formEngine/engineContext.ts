/**
 * Engine Context — Server-Side Data Provider
 *
 * Loads and caches pincode/state/bank data that the form engine needs
 * for dynamic option generation. This data is loaded ONCE on server start
 * and reused across requests (it's static reference data).
 *
 * This module exists so that the client never needs to import:
 * - pincode_IN_Selected.json (~1.5MB)
 * - pincode_IN_all.json (~3MB)
 * - bankName.ts (~50KB)
 */

import type { FormEngineOptions } from './engine';
import type { ClientOption } from '$lib/types/formEngine';
import pincodeSelected from '$lib/config/pincode_IN_Selected.json';
import pincodeAll from '$lib/config/pincode_IN_all.json';
import { bankData } from '$lib/config/bankSelection/bankName';
import { ReraCompanies, ReraProjects, ReraProjectCompanies } from '$lib/database/mongo';
// PERF-036: Hoisted from per-call dynamic `await import('mongodb')` so the
// builder/project lookup hot path doesn't pay a module-resolution cost on
// every form render.
import { ObjectId } from 'mongodb';

// ============================================================================
// City & State Alias Maps (backward compatibility with saved forms)
// ============================================================================

/** Maps old city names to current official names */
const CITY_ALIASES: Record<string, string> = {
	gurgaon: 'Gurugram',
	bangalore: 'Bengaluru',
	mysore: 'Mysuru',
	belgaum: 'Belagavi',
	allahabad: 'Prayagraj',
	'gandhi nagar': 'Gandhinagar',
	'kanpur nagar': 'Kanpur',
	'central delhi': 'Delhi',
	'east delhi': 'Delhi',
	'south delhi': 'Delhi',
	'north delhi': 'Delhi',
	'west delhi': 'Delhi',
	'new delhi': 'Delhi',
	'south west delhi': 'Delhi',
	'south east delhi': 'Delhi',
	'north east delhi': 'Delhi',
	'north west delhi': 'Delhi',
	shahdara: 'Delhi'
};

/** Maps old state names to current official names */
const STATE_ALIASES: Record<string, string> = {
	orissa: 'Odisha',
	'jammu and kashmir': 'Jammu And Kashmir'
};

/** Resolve city name through aliases for backward compat */
function resolveCity(city: string): string {
	if (!city) return city;
	return CITY_ALIASES[city.trim().toLowerCase()] || city.trim();
}

/** Resolve state name through aliases for backward compat */
function resolveState(state: string): string {
	if (!state) return state;
	return STATE_ALIASES[state.trim().toLowerCase()] || state.trim();
}

// ============================================================================
// Cached State Options (computed once)
// ============================================================================

let _cachedOptions: FormEngineOptions | null = null;

function buildOptions(): FormEngineOptions {
	// Property state options (filtered/supported states).
	// Sorted alphabetically by label so the dropdown is predictable for the
	// DSA — pincode-dataset key order is insertion-defined and shows up as
	// e.g. "Amroha, Moradabad, Rampur, Muzaffarnagar" instead of A→Z. Same
	// sort applied to allStateOptions and to the city + area helpers below.
	const stateOptions: ClientOption[] = Object.keys(pincodeSelected)
		.sort((a, b) => a.localeCompare(b))
		.map((state) => ({
			label: state,
			value: state
		}));

	// All state options (for residence state)
	const allStateOptions: ClientOption[] = Object.keys(pincodeAll)
		.sort((a, b) => a.localeCompare(b))
		.map((state) => ({
			label: state,
			value: state
		}));

	return {
		stateOptions,
		allStateOptions,
		bankData: bankData as Array<{
			label: string;
			value: string;
			Classification?: string;
			[key: string]: unknown;
		}>
	};
}

/**
 * Get cached engine options with state/bank data.
 * Safe to call from any server-side code.
 */
export function getEngineOptions(): FormEngineOptions {
	if (!_cachedOptions) {
		_cachedOptions = buildOptions();
	}
	return _cachedOptions;
}

// ============================================================================
// City Lookup (for derivedSelect questions)
// ============================================================================

/**
 * Get city options for a given state from the selected pincode dataset.
 * Applies state alias resolution for backward compat.
 */
export function getCityOptionsForState(state: string | undefined): ClientOption[] {
	if (!state || typeof state !== 'string') return [];
	const resolved = resolveState(state);
	const cities = Object.keys(
		(pincodeSelected as Record<string, Record<string, unknown>>)[resolved] || {}
	);
	// Sort A→Z. Without this, the city dropdown follows pincode-dataset
	// insertion order (e.g. UP shows "Amroha, Moradabad, Rampur, Muzaffarnagar"
	// — geographic, not alphabetic). localeCompare for proper string ordering
	// with Devanagari + diacritic-safe behavior.
	return cities
		.sort((a, b) => a.localeCompare(b))
		.map((city) => ({ label: city, value: city }));
}

/**
 * Get city options for a given state from the full pincode dataset.
 * Applies state alias resolution for backward compat.
 */
export function getCityOptionsForAllState(state: string | undefined): ClientOption[] {
	if (!state || typeof state !== 'string') return [];
	const resolved = resolveState(state);
	const cities = Object.keys(
		(pincodeAll as Record<string, Record<string, unknown>>)[resolved] || {}
	);
	// Same A→Z sort as getCityOptionsForState — see comment there for why.
	return cities
		.sort((a, b) => a.localeCompare(b))
		.map((city) => ({ label: city, value: city }));
}

// ============================================================================
// Area & Pincode Lookup (for location compound questions)
// ============================================================================

type PincodeDataset = Record<string, Record<string, Record<string, string>>>;

/** Entry representing an area/locality with its pincode */
export interface AreaEntry {
	area: string;
	pincode: string;
}

/** Result of a reverse pincode lookup */
export interface PincodeLookupResult {
	state: string;
	city: string;
	area: string;
}

function getDataset(source: 'selected' | 'all'): PincodeDataset {
	return (source === 'selected' ? pincodeSelected : pincodeAll) as PincodeDataset;
}

/**
 * Get all areas (localities) for a given state + city, with their pincodes.
 * Returns sorted by area name for consistent UI.
 */
export function getAreasForCity(
	state: string | undefined,
	city: string | undefined,
	source: 'selected' | 'all' = 'selected'
): AreaEntry[] {
	if (!state || !city) return [];
	const dataset = getDataset(source);
	const areas = dataset[resolveState(state)]?.[resolveCity(city)];
	if (!areas) return [];
	return Object.entries(areas)
		.map(([area, pincode]) => ({ area: area.trim(), pincode: pincode.trim() }))
		.sort((a, b) => a.area.localeCompare(b.area));
}

// Lazy-built reverse indexes (only built on first use, then cached for the
// lifetime of the function instance). Building from pincode_IN_Selected costs
// ~50ms once; in exchange we drop ~1.5 MB of pre-serialized JSON from the
// server function bundle (PERF-5).
let _reverseIndexSelected: Map<string, PincodeLookupResult[]> | null = null;
let _reverseIndexAll: Map<string, PincodeLookupResult[]> | null = null;

function buildReverseIndex(source: 'selected' | 'all'): Map<string, PincodeLookupResult[]> {
	const dataset = getDataset(source);
	const index = new Map<string, PincodeLookupResult[]>();
	for (const [state, cities] of Object.entries(dataset)) {
		for (const [city, areas] of Object.entries(cities)) {
			for (const [area, pincode] of Object.entries(areas as Record<string, string>)) {
				const pin = pincode.trim();
				if (!index.has(pin)) {
					index.set(pin, []);
				}
				index.get(pin)!.push({ state, city: city.trim(), area: area.trim() });
			}
		}
	}
	return index;
}

function getReverseIndex(source: 'selected' | 'all'): Map<string, PincodeLookupResult[]> {
	if (source === 'selected') {
		if (!_reverseIndexSelected) _reverseIndexSelected = buildReverseIndex('selected');
		return _reverseIndexSelected;
	}
	if (!_reverseIndexAll) _reverseIndexAll = buildReverseIndex('all');
	return _reverseIndexAll;
}

/**
 * Reverse lookup: given a 6-digit pincode, return all matching locations.
 * Both 'selected' and 'all' use lazy-built Maps cached per function instance.
 * Returns null if pincode is invalid format or not found.
 */
export function lookupPincode(
	pincode: string | undefined,
	source: 'selected' | 'all' = 'selected'
): PincodeLookupResult[] | null {
	if (!pincode || !/^\d{6}$/.test(pincode)) return null;
	const index = getReverseIndex(source);
	return index.get(pincode) ?? null;
}

/**
 * Get pincode suggestions for typeahead (prefix matching).
 * Returns up to `limit` unique pincodes with their first location.
 */
export function getPincodeSuggestions(
	input: string | undefined,
	source: 'selected' | 'all' = 'selected',
	limit: number = 10
): Array<{ pincode: string; state: string; city: string; area: string }> {
	if (!input || input.length < 1 || !/^\d+$/.test(input)) return [];

	const index = getReverseIndex(source);
	const results: Array<{ pincode: string; state: string; city: string; area: string }> = [];
	for (const [pincode, locations] of index) {
		if (pincode.startsWith(input) && locations.length > 0) {
			results.push({ pincode, ...locations[0] });
			if (results.length >= limit) break;
		}
	}
	return results;
}

// ============================================================================
// Builder & Project Lookup (from brokerData MongoDB — RERA scraped data)
//
// The brokerData database stores:
//   - projects with `district` field (populated for UP/MP; null for Delhi)
//   - companies (builders/promoters) — `district` often null
//   - project_companies junction (company ↔ project with role)
//
// Strategy:
//   1. Map form city → RERA district(s) (handles Noida→Gautam Buddha Nagar etc.)
//   2. Query projects by district → junction → companies
//   3. For Delhi (null districts): query by state directly
//
// PERF (S77a-3F): RERA data is essentially static reference data — it does
// not change during a DSA session. Each lookup function has an in-memory
// TTL cache (5 minutes) so repeated form renders within the same window
// skip the 3-hop query chain entirely. Cache is keyed by the resolved
// inputs (post-alias, post-sanitize) so that "Gurgaon" and "Gurugram"
// share a cache entry.
// ============================================================================

/** Cache entry wrapper with expiry timestamp */
type ReraCacheEntry<T> = { value: T; expiresAt: number };

/** 5-minute TTL — RERA reference data rarely changes, and form dropdowns
 *  re-render many times within a single DSA session. */
const RERA_CACHE_TTL_MS = 5 * 60 * 1000;

const buildersByCityCache = new Map<string, ReraCacheEntry<ClientOption[]>>();
const buildersByStateCache = new Map<string, ReraCacheEntry<ClientOption[]>>();
const projectsForBuilderCache = new Map<string, ReraCacheEntry<ClientOption[]>>();
const hasBuildersForCityCache = new Map<string, ReraCacheEntry<boolean>>();

/** Return a cached value if still within TTL, otherwise null.
 *  Expired entries are evicted on read so the Map doesn't grow unbounded. */
function getCachedRera<T>(cache: Map<string, ReraCacheEntry<T>>, key: string): T | null {
	const hit = cache.get(key);
	if (!hit) return null;
	if (hit.expiresAt <= Date.now()) {
		cache.delete(key);
		return null;
	}
	return hit.value;
}

function setCachedRera<T>(cache: Map<string, ReraCacheEntry<T>>, key: string, value: T): void {
	cache.set(key, { value, expiresAt: Date.now() + RERA_CACHE_TTL_MS });
}

/**
 * Map DigitalDSA form state names → RERA database state codes.
 * RERA uses short codes (UP, MP, Delhi), form uses full names.
 */
const FORM_STATE_TO_RERA: Record<string, string> = {
	'uttar pradesh': 'UP',
	'madhya pradesh': 'MP',
	delhi: 'Delhi',
	punjab: 'Punjab',
	rajasthan: 'Rajasthan'
};

/**
 * Map form city names → RERA district names where they differ.
 * Only entries that DON'T match directly need to be listed here.
 * Cities like Ghaziabad, Lucknow, Agra match their RERA district names.
 *
 * A city can map to multiple RERA districts (e.g., Greater Noida is also
 * in Gautam Buddha Nagar).
 */
const CITY_TO_RERA_DISTRICT: Record<string, string[]> = {
	noida: ['Gautam Buddha Nagar'],
	'greater noida': ['Gautam Buddha Nagar'],
	kanpur: ['Kanpur Nagar', 'Kanpur Dehat'],
	prayagraj: ['Prayagraj'], // in case RERA has old name
	allahabad: ['Prayagraj']
	// Delhi has no district in RERA — handled by state fallback
};

function toReraState(formState: string): string | undefined {
	if (!formState) return undefined;
	return FORM_STATE_TO_RERA[formState.trim().toLowerCase()];
}

/**
 * Resolve form city name to RERA district name(s).
 * Returns the mapped district(s) if a mapping exists, otherwise the city itself.
 */
function toReraDistricts(formCity: string): string[] {
	if (!formCity) return [];
	const mapped = CITY_TO_RERA_DISTRICT[formCity.trim().toLowerCase()];
	if (mapped) return mapped;
	// Default: use city name directly (works for Ghaziabad, Lucknow, Agra, etc.)
	return [formCity.trim()];
}

/**
 * Get all builders/promoters for a given city from RERA data.
 *
 * Uses city→district mapping (e.g. Noida → "Gautam Buddha Nagar") to query
 * the correct RERA district. For Delhi (null districts), falls back to state.
 *
 * Path: projects (by district) → project_companies → companies (names).
 */
export async function getBuildersForCity(city: string, state?: string): Promise<ClientOption[]> {
	const safeCity = sanitizeInput(resolveCity(city));
	if (!safeCity) return [];

	// Cache key uses post-alias, post-sanitize values so "Gurgaon"/"Gurugram"
	// and case variants share a slot. State is part of the key because the
	// Delhi-only state fallback can change the result for the same city.
	const safeState = state ? sanitizeInput(resolveState(state)) ?? '' : '';
	const cacheKey = `${safeCity.toLowerCase()}|${safeState.toLowerCase()}`;
	const cached = getCachedRera(buildersByCityCache, cacheKey);
	if (cached !== null) return cached;

	try {
		// Map form city → RERA district(s) (handles Noida → Gautam Buddha Nagar etc.)
		const reraDistricts = toReraDistricts(safeCity);

		// Build district query — supports multiple mapped districts
		const districtQuery =
			reraDistricts.length === 1
				? { $regex: new RegExp(`^${escapeRegex(reraDistricts[0])}$`, 'i') }
				: { $in: reraDistricts.map((d) => new RegExp(`^${escapeRegex(d)}$`, 'i')) };

		// Step 1: Find all projects in this district
		const projects = await ReraProjects.find(
			{ district: districtQuery },
			{ projection: { _id: 1 } }
		).toArray();

		let companyIds: unknown[] = [];

		if (projects.length > 0) {
			const projectIds = projects.map((p) => p._id);

			// Step 2: Get all company IDs linked to those projects
			const links = await ReraProjectCompanies.find(
				{ projectId: { $in: projectIds } },
				{ projection: { companyId: 1 } }
			).toArray();

			companyIds = [...new Set(links.map((l) => l.companyId))];
		}

		// Also check companies that have district populated directly (e.g. MP)
		const directCompanies = await ReraCompanies.find(
			{ district: districtQuery },
			{ projection: { name: 1, _id: 1 } }
		).toArray();

		// Merge: company IDs from junction + direct district matches
		const allCompanyIds = new Set(companyIds.map((id) => String(id)));
		for (const dc of directCompanies) {
			allCompanyIds.add(String(dc._id));
		}

		// ── State-level fallback — ONLY for Delhi (districts are null in RERA) ──
		// Do NOT fall back for other states — that returns thousands of irrelevant builders
		if (allCompanyIds.size === 0 && state) {
			const reraState = toReraState(resolveState(state));
			if (reraState === 'Delhi') {
				const fallback = await getBuildersForState(reraState);
				// Cache under the city key too so subsequent calls skip the empty
				// projects/direct-companies probes that led us here.
				setCachedRera(buildersByCityCache, cacheKey, fallback);
				return fallback;
			}
		}

		if (allCompanyIds.size === 0) {
			setCachedRera(buildersByCityCache, cacheKey, []);
			return [];
		}

		// Step 3: Fetch company names for all collected IDs
		// Filter out invalid ObjectIds instead of fabricating random ones
		const objectIds = [...allCompanyIds]
			.map((id) => toSafeObjectId(id))
			.filter((id): id is ObjectId => id !== null);
		if (objectIds.length === 0) {
			setCachedRera(buildersByCityCache, cacheKey, []);
			return [];
		}

		const companies = await ReraCompanies.find({ _id: { $in: objectIds } } as any, {
			projection: { name: 1 }
		})
			.sort({ name: 1 })
			.limit(300)
			.toArray();

		const result = deduplicateCompanies(companies);
		setCachedRera(buildersByCityCache, cacheKey, result);
		return result;
	} catch {
		return [];
	}
}

/**
 * State-level fallback: get ALL builders for a RERA state.
 * Used when district-level data doesn't exist (e.g. Delhi).
 */
async function getBuildersForState(reraState: string): Promise<ClientOption[]> {
	const cached = getCachedRera(buildersByStateCache, reraState);
	if (cached !== null) return cached;

	try {
		// Get all projects for this state
		const projects = await ReraProjects.find(
			{ state: reraState },
			{ projection: { _id: 1 } }
		).toArray();

		if (projects.length === 0) {
			// No projects — try companies directly by state
			const companies = await ReraCompanies.find({ state: reraState }, { projection: { name: 1 } })
				.sort({ name: 1 })
				.limit(300)
				.toArray();
			const result = deduplicateCompanies(companies);
			setCachedRera(buildersByStateCache, reraState, result);
			return result;
		}

		const projectIds = projects.map((p) => p._id);
		const links = await ReraProjectCompanies.find(
			{ projectId: { $in: projectIds } },
			{ projection: { companyId: 1 } }
		).toArray();

		const uniqueCompanyIds = [...new Set(links.map((l) => l.companyId))];
		if (uniqueCompanyIds.length === 0) {
			setCachedRera(buildersByStateCache, reraState, []);
			return [];
		}

		// Filter out invalid ObjectIds instead of fabricating random ones
		const objectIds = uniqueCompanyIds
			.map((id) => toSafeObjectId(String(id)))
			.filter((id): id is ObjectId => id !== null);
		if (objectIds.length === 0) {
			setCachedRera(buildersByStateCache, reraState, []);
			return [];
		}

		const companies = await ReraCompanies.find({ _id: { $in: objectIds } } as any, {
			projection: { name: 1 }
		})
			.sort({ name: 1 })
			.limit(300)
			.toArray();

		const result = deduplicateCompanies(companies);
		setCachedRera(buildersByStateCache, reraState, result);
		return result;
	} catch {
		return [];
	}
}

/**
 * Get all projects for a given city + builder from RERA data.
 *
 * Path: Find company by name → junction → projects (prefer same district,
 * fallback to same state, then all).
 */
export async function getProjectsForBuilder(
	city: string,
	state: string,
	builder: string
): Promise<ClientOption[]> {
	const safeCity = sanitizeInput(resolveCity(city));
	const safeBuilder = sanitizeInput(builder);
	if (!safeCity || !safeBuilder) return [];

	// Cache key includes all three inputs because district-fallback-to-state-
	// fallback-to-any means the same builder can yield different project lists
	// depending on the city/state context.
	const safeState = state ? sanitizeInput(resolveState(state)) ?? '' : '';
	const cacheKey = `${safeCity.toLowerCase()}|${safeState.toLowerCase()}|${safeBuilder.toLowerCase()}`;
	const cached = getCachedRera(projectsForBuilderCache, cacheKey);
	if (cached !== null) return cached;

	try {
		const builderRegex = { $regex: new RegExp(`^${escapeRegex(safeBuilder)}$`, 'i') };

		// Map form city → RERA district(s)
		const reraDistricts = toReraDistricts(safeCity);
		const districtQuery =
			reraDistricts.length === 1
				? { $regex: new RegExp(`^${escapeRegex(reraDistricts[0])}$`, 'i') }
				: { $in: reraDistricts.map((d) => new RegExp(`^${escapeRegex(d)}$`, 'i')) };

		// Find the company by name (district may be null)
		const company = await ReraCompanies.findOne({ name: builderRegex });
		if (!company) {
			setCachedRera(projectsForBuilderCache, cacheKey, []);
			return [];
		}

		// Get all project IDs linked to this company
		const links = await ReraProjectCompanies.find(
			{ companyId: company._id },
			{ projection: { projectId: 1 } }
		).toArray();

		if (links.length === 0) {
			setCachedRera(projectsForBuilderCache, cacheKey, []);
			return [];
		}

		const projectIds = links.map((l) => l.projectId);

		// Try 1: projects in the selected district (mapped from form city)
		let projects = await ReraProjects.find(
			{ _id: { $in: projectIds }, district: districtQuery },
			{ projection: { name: 1 } }
		)
			.sort({ name: 1 })
			.toArray();

		// Try 2: projects in the same RERA state (for Delhi etc.)
		if (projects.length === 0 && state) {
			const reraState = toReraState(state);
			if (reraState) {
				projects = await ReraProjects.find(
					{ _id: { $in: projectIds }, state: reraState },
					{ projection: { name: 1 } }
				)
					.sort({ name: 1 })
					.toArray();
			}
		}

		// Try 3: all projects for this builder (any location)
		if (projects.length === 0) {
			projects = await ReraProjects.find({ _id: { $in: projectIds } }, { projection: { name: 1 } })
				.sort({ name: 1 })
				.limit(50)
				.toArray();
		}

		const result = deduplicateProjects(projects);
		setCachedRera(projectsForBuilderCache, cacheKey, result);
		return result;
	} catch {
		return [];
	}
}

/** Deduplicate company names */
function deduplicateCompanies(companies: Record<string, any>[]): ClientOption[] {
	const seen = new Set<string>();
	const options: ClientOption[] = [];
	for (const c of companies) {
		const name = ((c.name as string) || '').trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			options.push({ label: name, value: name });
		}
	}
	options.sort((a, b) => a.label.localeCompare(b.label));
	return options;
}

/** Deduplicate project names */
function deduplicateProjects(projects: Record<string, any>[]): ClientOption[] {
	const seen = new Set<string>();
	const options: ClientOption[] = [];
	for (const p of projects) {
		const name = ((p.name as string) || '').trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			options.push({ label: name, value: name });
		}
	}
	return options;
}

/**
 * Check if builder/project data exists for a city (district) or its state.
 */
export async function hasBuildersForCity(city: string): Promise<boolean> {
	const safeCity = sanitizeInput(city);
	if (!safeCity) return false;

	const cacheKey = safeCity.toLowerCase();
	const cached = getCachedRera(hasBuildersForCityCache, cacheKey);
	if (cached !== null) return cached;

	try {
		const districtRegex = { $regex: new RegExp(`^${escapeRegex(safeCity)}$`, 'i') };
		const projectCount = await ReraProjects.countDocuments(
			{ district: districtRegex },
			{ limit: 1 }
		);
		if (projectCount > 0) {
			setCachedRera(hasBuildersForCityCache, cacheKey, true);
			return true;
		}

		const companyCount = await ReraCompanies.countDocuments(
			{ district: districtRegex },
			{ limit: 1 }
		);
		const result = companyCount > 0;
		setCachedRera(hasBuildersForCityCache, cacheKey, result);
		return result;
	} catch {
		return false;
	}
}

/** Max allowed length for user-supplied city/state/builder strings (prevents regex DoS) */
const MAX_INPUT_LENGTH = 100;

/** Validate and clamp user input for DB queries. Returns null if invalid. */
function sanitizeInput(str: string | undefined): string | null {
	if (!str || typeof str !== 'string') return null;
	const trimmed = str.trim();
	if (!trimmed || trimmed.length > MAX_INPUT_LENGTH) return null;
	return trimmed;
}

/**
 * Safely convert a string to ObjectId. Returns null if invalid
 * (instead of fabricating a random ObjectId which could mask bugs).
 *
 * Uses the hoisted `ObjectId` import (PERF-036) — no per-call dynamic import.
 */
function toSafeObjectId(id: string): ObjectId | null {
	try {
		return new ObjectId(id);
	} catch {
		return null;
	}
}

/** Escape special regex characters in user input */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
