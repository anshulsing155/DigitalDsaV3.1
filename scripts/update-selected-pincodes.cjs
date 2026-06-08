/**
 * Updates pincode_IN_Selected.json with fresh area/pincode data from pincode_IN_all.json
 *
 * Rules:
 * - Keep the same states and cities in Selected (no additions, no removals)
 * - For cities with exact name match in All → replace area data from All
 * - For cities with different names in All → merge from mapped equivalent(s)
 * - For cities with no match → keep existing Selected data unchanged
 * - After update, rebuild pincode_reverse_selected.json
 */

const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'src', 'lib', 'config');
const selected = JSON.parse(
	fs.readFileSync(path.join(configDir, 'pincode_IN_Selected.json'), 'utf-8')
);
const all = JSON.parse(fs.readFileSync(path.join(configDir, 'pincode_IN_all.json'), 'utf-8'));

// Name mappings: Selected city name → All city name(s) to merge from
// When multiple sources, all areas are merged under the Selected city name
const CITY_NAME_MAP = {
	'Andhra Pradesh': {
		Visakhapatnam: ['Visakhapatanam'],
		Vijayawada: ['Krishna'],
		Nellore: ['Spsr Nellore']
	},
	Chhattisgarh: {
		Bhilai: ['Durg']
	},
	Delhi: {
		Delhi: [
			'North East',
			'North',
			'North West',
			'South',
			'New Delhi',
			'West',
			'South West',
			'Shahdara',
			'East',
			'Central',
			'South East'
		]
	},
	Jharkhand: {
		Jamshedpur: ['East Singhbum', 'Saraikela Kharsawan']
	},
	Karnataka: {
		Bengaluru: ['Bengaluru Urban'],
		Mangaluru: ['Dakshina Kannada'],
		Hubli: ['Dharwad']
	},
	Kerala: {
		Kochi: ['Ernakulam']
	},
	Maharashtra: {
		'Navi Mumbai': ['Thane', 'Raigad'],
		'Pimpri-Chinchwad': ['Pune']
	},
	Odisha: {
		Bhubaneswar: ['Khordha']
	},
	Punjab: {
		Mohali: ['S.A.S Nagar']
	},
	Telangana: {
		Secunderabad: ['Hyderabad', 'Ranga Reddy']
	},
	'Uttar Pradesh': {
		Noida: ['Gautam Buddha Nagar'],
		'Greater Noida': ['Gautam Buddha Nagar'],
		Kanpur: ['Kanpur Nagar', 'Kanpur Dehat']
	},
	Puducherry: {
		Puducherry: ['Puducherry', 'Pondicherry']
	},
	'West Bengal': {
		'Salt Lake / New Town': ['24 Paraganas North']
	}
};

const updated = {};
let stats = { exact: 0, mapped: 0, kept: 0, totalAreasBefore: 0, totalAreasAfter: 0 };

for (const state of Object.keys(selected)) {
	updated[state] = {};

	for (const city of Object.keys(selected[state])) {
		const beforeCount = Object.keys(selected[state][city]).length;
		stats.totalAreasBefore += beforeCount;

		// Case 1: Check explicit mapping first (takes priority over exact match)
		const mapping = CITY_NAME_MAP[state] && CITY_NAME_MAP[state][city];
		if (mapping) {
			const merged = {};
			for (const allCityName of mapping) {
				if (all[state] && all[state][allCityName]) {
					Object.assign(merged, all[state][allCityName]);
				}
			}
			if (Object.keys(merged).length > 0) {
				updated[state][city] = merged;
				stats.mapped++;
				stats.totalAreasAfter += Object.keys(merged).length;
				continue;
			}
		}

		// Case 2: Exact match in All
		if (all[state] && all[state][city]) {
			updated[state][city] = { ...all[state][city] };
			stats.exact++;
			stats.totalAreasAfter += Object.keys(updated[state][city]).length;
			continue;
		}

		// Case 3: No match — keep existing data
		updated[state][city] = selected[state][city];
		stats.kept++;
		stats.totalAreasAfter += beforeCount;
		console.log(`  KEPT (no match): ${state} > ${city} (${beforeCount} areas)`);
	}
}

// Write updated Selected
const selectedPath = path.join(configDir, 'pincode_IN_Selected.json');
fs.writeFileSync(selectedPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');

// Rebuild reverse index: pincode → { state, city, area }
const reverse = {};
for (const state of Object.keys(updated)) {
	for (const city of Object.keys(updated[state])) {
		for (const [area, pincode] of Object.entries(updated[state][city])) {
			if (!reverse[pincode]) {
				reverse[pincode] = [];
			}
			reverse[pincode].push({ state, city, area });
		}
	}
}

const reversePath = path.join(configDir, 'pincode_reverse_selected.json');
fs.writeFileSync(reversePath, JSON.stringify(reverse, null, 2) + '\n', 'utf-8');

console.log('\n=== Update Complete ===');
console.log(`Exact matches: ${stats.exact}`);
console.log(`Mapped matches: ${stats.mapped}`);
console.log(`Kept unchanged: ${stats.kept}`);
console.log(`Total areas before: ${stats.totalAreasBefore}`);
console.log(`Total areas after:  ${stats.totalAreasAfter}`);
console.log(`Reverse index entries: ${Object.keys(reverse).length} pincodes`);
