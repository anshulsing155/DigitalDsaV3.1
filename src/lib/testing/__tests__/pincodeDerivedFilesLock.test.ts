/**
 * Lock test — pincode derived files must stay byte-equivalent to the
 * runtime derivation they replaced.
 *
 * Background (S221, 2026-06-03 — PINCODE-JSON-BUNDLE-CLEANUP.md Phase 1):
 * `/api/location/states` and `/api/location/cities` used to bundle the
 * full 4.86 MB of source pincode JSON to compute small lists at module
 * load. Phase 1 pre-computes those lists into
 * `src/lib/config/_generated/*.json` via
 * `scripts/generate-pincode-derived.cjs` and the endpoints import the
 * tiny derived files instead. This drops ~9.7 MB cumulative from the
 * two function bundles.
 *
 * If the generator drifts from the runtime derivation logic, the
 * endpoints would silently start serving wrong data. This test
 * re-derives from source at test time and asserts byte equality with
 * the committed derived files, so a generator regression is caught
 * before it ships.
 *
 * Additionally, the endpoint source files are checked to ensure they
 * still import from `_generated/` and not from the heavy source JSONs —
 * a future refactor that flipped the import back to source would erase
 * the cold-start gain.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pincodeAll from '../../config/pincode_IN_all.json';
import pincodeSelected from '../../config/pincode_IN_Selected.json';
import stateListAll from '../../config/_generated/stateList_all.json';
import stateListSelected from '../../config/_generated/stateList_selected.json';
import cityListAll from '../../config/_generated/cityList_all.json';
import cityListSelected from '../../config/_generated/cityList_selected.json';

type PincodeDataset = Record<string, Record<string, Record<string, string>>>;

// Mirror the derivation logic in scripts/generate-pincode-derived.cjs.
// Kept inline rather than imported because the test is the SECOND opinion
// — if the generator and the test both pulled from the same helper, a
// helper bug would pass both.
function deriveStateList(dataset: PincodeDataset): string[] {
	return Object.keys(dataset).sort();
}

function deriveCityList(dataset: PincodeDataset): string[] {
	const seen = new Set<string>();
	for (const cities of Object.values(dataset)) {
		for (const city of Object.keys(cities)) {
			seen.add(city);
		}
	}
	return [...seen].sort((a, b) => a.localeCompare(b));
}

describe('pincode derived files — Phase 1 byte-equivalence', () => {
	it('stateList_all.json matches Object.keys(pincode_IN_all).sort()', () => {
		const expected = deriveStateList(pincodeAll as PincodeDataset);
		expect(stateListAll).toEqual(expected);
	});

	it('stateList_selected.json matches Object.keys(pincode_IN_Selected).sort()', () => {
		const expected = deriveStateList(pincodeSelected as PincodeDataset);
		expect(stateListSelected).toEqual(expected);
	});

	it('cityList_all.json matches buildCityList(pincode_IN_all)', () => {
		const expected = deriveCityList(pincodeAll as PincodeDataset);
		expect(cityListAll).toEqual(expected);
	});

	it('cityList_selected.json matches buildCityList(pincode_IN_Selected)', () => {
		const expected = deriveCityList(pincodeSelected as PincodeDataset);
		expect(cityListSelected).toEqual(expected);
	});

	it('derived files are non-empty and within expected size bounds', () => {
		expect(stateListAll.length).toBe(36);
		expect(stateListSelected.length).toBe(24);
		// Cities are deduped across states; large drops here would indicate
		// the generator silently broke the union/dedup step.
		expect(cityListAll.length).toBeGreaterThanOrEqual(50);
		expect(cityListSelected.length).toBeGreaterThanOrEqual(20);
	});
});

describe('pincode endpoint imports — locked to _generated/*', () => {
	const STATES_PATH = resolve(process.cwd(), 'src/routes/api/location/states/+server.ts');
	const CITIES_PATH = resolve(process.cwd(), 'src/routes/api/location/cities/+server.ts');
	const PINCODES_PATH = resolve(process.cwd(), 'src/routes/api/pincodes/+server.ts');

	it('/api/location/states imports from _generated, not pincode_IN_all', () => {
		const src = readFileSync(STATES_PATH, 'utf8');
		expect(src).toMatch(/_generated\/stateList_all\.json/);
		// No direct source import — would reintroduce the 4.12 MB bundle.
		expect(src).not.toMatch(/from\s+['"][^'"]*pincode_IN_all\.json['"]/);
		expect(src).not.toMatch(/from\s+['"][^'"]*pincode_IN_Selected\.json['"]/);
	});

	it('/api/location/cities imports from _generated, not heavy source JSONs', () => {
		const src = readFileSync(CITIES_PATH, 'utf8');
		expect(src).toMatch(/_generated\/cityList_all\.json/);
		expect(src).toMatch(/_generated\/cityList_selected\.json/);
		expect(src).not.toMatch(/from\s+['"][^'"]*pincode_IN_all\.json['"]/);
		expect(src).not.toMatch(/from\s+['"][^'"]*pincode_IN_Selected\.json['"]/);
	});

	it('/api/pincodes uses dynamic import (Phase 2 — lazy load)', () => {
		const src = readFileSync(PINCODES_PATH, 'utf8');
		// Phase 2: top-level static imports of the heavy JSONs are forbidden.
		// They must be loaded via `await import(...)` inside the handler.
		expect(src).not.toMatch(/^import\s+\w+\s+from\s+['"][^'"]*pincode_IN_all\.json['"]/m);
		expect(src).not.toMatch(/^import\s+\w+\s+from\s+['"][^'"]*pincode_IN_Selected\.json['"]/m);
		// And the lazy-load pattern must be present.
		expect(src).toMatch(/await\s+import\(\s*['"][^'"]*pincode_IN_all\.json['"]\s*\)/);
		expect(src).toMatch(/await\s+import\(\s*['"][^'"]*pincode_IN_Selected\.json['"]\s*\)/);
		// Module-scope cache must be present (otherwise every request re-parses
		// the 4 MB JSON, which would be slower than the original static import).
		expect(src).toMatch(/datasetCache|new\s+Map/);
	});
});
