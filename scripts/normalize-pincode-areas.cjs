/**
 * Normalizes area names in pincode JSON files:
 * 1. Convert all area names to Title Case
 * 2. When case-insensitive duplicates have DIFFERENT pincodes → append " (pincode)" suffix
 * 3. When case-insensitive duplicates have SAME pincode → deduplicate (keep one)
 * 4. Rebuild pincode_reverse_selected.json after updating Selected
 */

const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'src', 'lib', 'config');

function toTitleCase(str) {
	// Handle special cases: NDC, GPO, SO, HO, BO, etc. (post office abbreviations)
	const UPPER_WORDS = new Set([
		'ndc',
		'gpo',
		'so',
		'ho',
		'bo',
		'bpo',
		'hpo',
		'mdg',
		'rs',
		'rly',
		'ito',
		'iit',
		'aiims',
		'bhel',
		'ntpc',
		'hal',
		'isro',
		'ongc',
		'ioc',
		'lic'
	]);

	return str
		.split(/(\s+)/)
		.map((word) => {
			if (/^\s+$/.test(word)) return word; // preserve whitespace
			const lower = word.toLowerCase();
			if (UPPER_WORDS.has(lower)) return word.toUpperCase();
			// Capitalize first letter, lowercase rest
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join('');
}

function normalizeAreas(data, label) {
	const result = {};
	let disambiguated = 0,
		deduped = 0,
		renamed = 0;

	for (const [state, cities] of Object.entries(data)) {
		result[state] = {};
		for (const [city, areas] of Object.entries(cities)) {
			const normalized = {};

			// Group by lowercase key
			const groups = new Map();
			for (const [area, pincode] of Object.entries(areas)) {
				const key = area.toLowerCase().trim();
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key).push({ area, pincode });
			}

			for (const [, entries] of groups) {
				// Deduplicate same-pincode entries
				const uniqueByPincode = new Map();
				for (const e of entries) {
					if (!uniqueByPincode.has(e.pincode)) {
						uniqueByPincode.set(e.pincode, e);
					} else {
						deduped++;
					}
				}

				const unique = Array.from(uniqueByPincode.values());

				if (unique.length === 1) {
					// Single entry — just Title Case it
					const titleName = toTitleCase(unique[0].area);
					if (titleName !== unique[0].area) renamed++;
					normalized[titleName] = unique[0].pincode;
				} else {
					// Multiple entries with different pincodes — disambiguate with pincode suffix
					for (const e of unique) {
						const titleName = toTitleCase(e.area) + ' (' + e.pincode + ')';
						normalized[titleName] = e.pincode;
						disambiguated++;
					}
				}
			}

			result[state][city] = normalized;
		}
	}

	console.log(`${label}: renamed=${renamed}, disambiguated=${disambiguated}, deduped=${deduped}`);
	return result;
}

// Normalize both files
const selected = JSON.parse(
	fs.readFileSync(path.join(configDir, 'pincode_IN_Selected.json'), 'utf-8')
);
const all = JSON.parse(fs.readFileSync(path.join(configDir, 'pincode_IN_all.json'), 'utf-8'));

const normalizedSelected = normalizeAreas(selected, 'Selected');
const normalizedAll = normalizeAreas(all, 'All');

// Write updated files
fs.writeFileSync(
	path.join(configDir, 'pincode_IN_Selected.json'),
	JSON.stringify(normalizedSelected, null, 2) + '\n',
	'utf-8'
);
fs.writeFileSync(
	path.join(configDir, 'pincode_IN_all.json'),
	JSON.stringify(normalizedAll, null, 2) + '\n',
	'utf-8'
);

// Rebuild reverse index for Selected
const reverse = {};
for (const [state, cities] of Object.entries(normalizedSelected)) {
	for (const [city, areas] of Object.entries(cities)) {
		for (const [area, pincode] of Object.entries(areas)) {
			if (!reverse[pincode]) reverse[pincode] = [];
			reverse[pincode].push({ state, city, area });
		}
	}
}
fs.writeFileSync(
	path.join(configDir, 'pincode_reverse_selected.json'),
	JSON.stringify(reverse, null, 2) + '\n',
	'utf-8'
);

// Final counts
let selAreas = 0,
	allAreas = 0;
for (const s of Object.values(normalizedSelected))
	for (const c of Object.values(s)) selAreas += Object.keys(c).length;
for (const s of Object.values(normalizedAll))
	for (const c of Object.values(s)) allAreas += Object.keys(c).length;

console.log(`\nFinal Selected: ${selAreas} areas`);
console.log(`Final All: ${allAreas} areas`);
console.log(`Reverse index: ${Object.keys(reverse).length} pincodes`);
