/**
 * Validates structural consistency of pincode JSON files.
 * Expected shape: { State: { City: { Area: "6-digit-pincode-string" } } }
 */
const selected = require('../src/lib/config/pincode_IN_Selected.json');
const all = require('../src/lib/config/pincode_IN_all.json');

function validate(data, label) {
	let stateCount = 0,
		cityCount = 0,
		areaCount = 0;
	const emptyStates = [];
	const emptyCities = [];
	const structuralIssues = [];
	const nestedObjects = [];
	const nullValues = [];
	const nonStringPincodes = [];
	const badPincodes = [];
	const duplicateAreas = [];
	const whitespaceKeys = [];

	for (const [state, cities] of Object.entries(data)) {
		stateCount++;

		// Check state key
		if (state.trim() !== state) whitespaceKeys.push(`State: "${state}"`);
		if (state === '') structuralIssues.push('Empty state key');

		// State value must be a plain object
		if (typeof cities !== 'object' || cities === null || Array.isArray(cities)) {
			structuralIssues.push(
				`State "${state}" value is ${Array.isArray(cities) ? 'array' : typeof cities}`
			);
			continue;
		}

		const cityKeys = Object.keys(cities);
		if (cityKeys.length === 0) {
			emptyStates.push(state);
			continue;
		}

		for (const [city, areas] of Object.entries(cities)) {
			cityCount++;

			// Check city key
			if (city.trim() !== city) whitespaceKeys.push(`City: "${state}" > "${city}"`);
			if (city === '') structuralIssues.push(`Empty city key in state "${state}"`);

			// City value must be a plain object
			if (typeof areas !== 'object' || areas === null || Array.isArray(areas)) {
				structuralIssues.push(
					`"${state}" > "${city}" value is ${Array.isArray(areas) ? 'array' : typeof areas}`
				);
				continue;
			}

			const areaKeys = Object.keys(areas);
			if (areaKeys.length === 0) {
				emptyCities.push(`${state} > ${city}`);
				continue;
			}

			// Check for duplicate area names (case-insensitive)
			const seenAreas = new Map();
			for (const [area, pincode] of Object.entries(areas)) {
				areaCount++;
				const areaLower = area.toLowerCase().trim();
				if (seenAreas.has(areaLower)) {
					duplicateAreas.push(`${state} > ${city}: "${area}" vs "${seenAreas.get(areaLower)}"`);
				}
				seenAreas.set(areaLower, area);

				// Check area key
				if (area.trim() !== area) whitespaceKeys.push(`Area: "${state}" > "${city}" > "${area}"`);
				if (area === '') structuralIssues.push(`Empty area key in "${state}" > "${city}"`);

				// Pincode must be a 6-digit string
				if (pincode === null || pincode === undefined) {
					nullValues.push(`${state} > ${city} > ${area}`);
				} else if (typeof pincode === 'object') {
					nestedObjects.push(
						`${state} > ${city} > ${area} (${Array.isArray(pincode) ? 'array' : 'object'})`
					);
				} else if (typeof pincode !== 'string') {
					nonStringPincodes.push(`${state} > ${city} > ${area} = ${pincode} (${typeof pincode})`);
				} else if (pincode.trim() === '') {
					badPincodes.push(`${state} > ${city} > ${area} = EMPTY`);
				} else if (!/^\d{6}$/.test(pincode.trim())) {
					badPincodes.push(`${state} > ${city} > ${area} = "${pincode}"`);
				}
			}
		}
	}

	console.log(`\n=== ${label} ===`);
	console.log(`States: ${stateCount} | Cities: ${cityCount} | Areas: ${areaCount}`);

	const sections = [
		['Empty States (no cities)', emptyStates],
		['Empty Cities (no areas)', emptyCities],
		['Structural Issues', structuralIssues],
		['Nested Objects (should be string)', nestedObjects],
		['Null/Undefined Values', nullValues],
		['Non-String Pincodes', nonStringPincodes],
		['Bad Pincodes (not 6-digit)', badPincodes],
		['Duplicate Areas (case-insensitive)', duplicateAreas],
		['Keys with Leading/Trailing Whitespace', whitespaceKeys]
	];

	let hasIssues = false;
	for (const [name, arr] of sections) {
		if (arr.length > 0) {
			hasIssues = true;
			console.log(`\n  ${name} (${arr.length}):`);
			arr.slice(0, 15).forEach((item) => console.log(`    - ${item}`));
			if (arr.length > 15) console.log(`    ... and ${arr.length - 15} more`);
		}
	}

	if (!hasIssues) {
		console.log('\n  ALL CLEAN — consistent { State > City > Area > "6-digit pincode" } structure');
	}

	return hasIssues;
}

const selIssues = validate(selected, 'pincode_IN_Selected.json');
const allIssues = validate(all, 'pincode_IN_all.json');

// Cross-check: verify Selected states exist in All
console.log('\n=== Cross-Check: Selected states in All ===');
const allStates = new Set(Object.keys(all));
const selStates = Object.keys(selected);
const missingStates = selStates.filter((s) => !allStates.has(s));
if (missingStates.length > 0) {
	console.log(`  States in Selected but NOT in All: ${missingStates.join(', ')}`);
} else {
	console.log(`  All ${selStates.length} Selected states exist in All`);
}

process.exit(selIssues || allIssues ? 1 : 0);
