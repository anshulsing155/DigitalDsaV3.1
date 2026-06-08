#!/usr/bin/env node
/**
 * Pre-computes small derived files from the large pincode source JSONs so
 * server routes that only need state-name or city-name lists don't have to
 * bundle the full 4.86 MB of source data into their function chunks.
 *
 * Source files (committed):
 *   src/lib/config/pincode_IN_all.json       — 4.12 MB, 36 states
 *   src/lib/config/pincode_IN_Selected.json  — 745 KB,  24 states
 *
 * Generated files (committed — see PINCODE-JSON-BUNDLE-CLEANUP.md §4 Phase 1):
 *   src/lib/config/_generated/stateList_all.json       — sorted state names from pincode_IN_all
 *   src/lib/config/_generated/stateList_selected.json  — sorted state names from pincode_IN_Selected
 *   src/lib/config/_generated/cityList_all.json        — deduped sorted city names from pincode_IN_all
 *   src/lib/config/_generated/cityList_selected.json   — deduped sorted city names from pincode_IN_Selected
 *
 * The derivation logic is deterministic and matches the existing runtime
 * derivations in /api/location/states + /api/location/cities so the
 * generated files are byte-identical to what those endpoints used to
 * compute at module load.
 *
 * Run: node scripts/generate-pincode-derived.cjs
 * Output: prints what was written, exits 0 on success.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(REPO_ROOT, 'src', 'lib', 'config');
const GENERATED_DIR = path.join(CONFIG_DIR, '_generated');

const SOURCES = {
	all: path.join(CONFIG_DIR, 'pincode_IN_all.json'),
	selected: path.join(CONFIG_DIR, 'pincode_IN_Selected.json')
};

/**
 * Extract sorted state names. Mirrors `Object.keys(dataset).sort()` in
 * `/api/location/states/+server.ts`.
 */
function deriveStateList(dataset) {
	return Object.keys(dataset).sort();
}

/**
 * Extract deduped sorted city names across all states. Mirrors
 * `buildCityList()` in `/api/location/cities/+server.ts`:
 *   - Iterate every state's city map
 *   - Collect city keys into a Set (dedup across states)
 *   - Sort via localeCompare (matches existing endpoint behavior)
 */
function deriveCityList(dataset) {
	const seen = new Set();
	for (const cities of Object.values(dataset)) {
		for (const city of Object.keys(cities)) {
			seen.add(city);
		}
	}
	return [...seen].sort((a, b) => a.localeCompare(b));
}

function writeJson(filePath, data) {
	const json = JSON.stringify(data, null, 2) + '\n';
	fs.writeFileSync(filePath, json, 'utf8');
	const size = Buffer.byteLength(json, 'utf8');
	return size;
}

function main() {
	// Ensure output dir exists
	if (!fs.existsSync(GENERATED_DIR)) {
		fs.mkdirSync(GENERATED_DIR, { recursive: true });
	}

	const results = [];

	for (const [variant, sourcePath] of Object.entries(SOURCES)) {
		if (!fs.existsSync(sourcePath)) {
			console.error(`Source missing: ${sourcePath}`);
			process.exit(1);
		}
		const dataset = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

		const stateList = deriveStateList(dataset);
		const cityList = deriveCityList(dataset);

		const stateOut = path.join(GENERATED_DIR, `stateList_${variant}.json`);
		const cityOut = path.join(GENERATED_DIR, `cityList_${variant}.json`);

		const stateBytes = writeJson(stateOut, stateList);
		const cityBytes = writeJson(cityOut, cityList);

		results.push({
			variant,
			states: stateList.length,
			stateBytes,
			cities: cityList.length,
			cityBytes
		});
	}

	console.log('Wrote pincode derived files:');
	for (const r of results) {
		console.log(
			`  ${r.variant}: ${r.states} states (${r.stateBytes} B) · ${r.cities} cities (${r.cityBytes} B)`
		);
	}
}

main();
