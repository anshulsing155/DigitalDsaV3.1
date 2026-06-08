const fs = require('fs');
const path = require('path');

const schemas = [
	'src/lib/config/homeLoanSchemaV2.json',
	'src/lib/config/LAP-schema.json',
	'src/lib/config/plot-loan-schema.json',
	'src/lib/config/personal-loan-schema.json',
	'src/lib/config/businessLoanSchema.json',
	'src/lib/config/professional-loan-schema.json'
];

const iconNames = new Set();

function extract(obj) {
	if (obj === null || obj === undefined || typeof obj !== 'object') return;
	if (Array.isArray(obj)) {
		obj.forEach(extract);
		return;
	}
	if (obj.icon && typeof obj.icon === 'string') iconNames.add(obj.icon);
	if (obj.uiMeta && obj.uiMeta.icon && typeof obj.uiMeta.icon === 'string')
		iconNames.add(obj.uiMeta.icon);
	Object.values(obj).forEach(extract);
}

for (const s of schemas) {
	try {
		const data = JSON.parse(fs.readFileSync(s, 'utf-8'));
		extract(data);
	} catch (e) {
		console.error('SKIP ' + s + ': ' + e.message);
	}
}

// Now check which are in the registry
const registryPath = 'src/lib/utils/iconRegistry.ts';
const registryContent = fs.readFileSync(registryPath, 'utf-8');

// Extract PascalCase names from the registry
const registryNames = new Set();
const matches = registryContent.matchAll(/^\t(\w+)[,:]?\s*$/gm);
for (const m of matches) {
	registryNames.add(m[1]);
}

// Convert kebab to PascalCase for comparison
function toPascalCase(str) {
	return str.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

const sorted = [...iconNames].sort();
console.log('Total unique icon names in schemas: ' + sorted.length);
console.log('\n=== MISSING from registry ===');
const missing = [];
for (const name of sorted) {
	const pascal = toPascalCase(name);
	if (!registryNames.has(name) && !registryNames.has(pascal)) {
		missing.push({ schema: name, pascal });
		console.log('  ' + name + (name !== pascal ? ' → ' + pascal : ''));
	}
}
console.log('\nMissing count: ' + missing.length);

console.log('\n=== PRESENT in registry ===');
let present = 0;
for (const name of sorted) {
	const pascal = toPascalCase(name);
	if (registryNames.has(name) || registryNames.has(pascal)) {
		present++;
	}
}
console.log('Present count: ' + present);
