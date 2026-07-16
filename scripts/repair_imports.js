import fs from 'fs';
import path from 'path';

const projectDir = 'C:\\Users\\hp\\Desktop\\DigitalDsaV3.1';
const srcDir = path.join(projectDir, 'src');
const libDir = path.join(srcDir, 'lib');

// 1. Scan src/lib/components/ recursively to find the current location of all Svelte components
const componentMap = new Map(); // Maps filename (e.g. 'Button.svelte') to relative path from src/lib (e.g. 'components/ui/Button.svelte')

function scanComponents(dir) {
	if (!fs.existsSync(dir)) return;
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stats = fs.statSync(fullPath);
		if (stats.isDirectory()) {
			scanComponents(fullPath);
		} else {
			if (item.endsWith('.svelte') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.json')) {
				const relToLib = path.relative(libDir, fullPath).replace(/\\/g, '/');
				componentMap.set(item, relToLib);
			}
		}
	}
}

console.log('Mapping current component locations...');
scanComponents(path.join(libDir, 'components'));
console.log(`Mapped ${componentMap.size} components.`);

// 2. Refactor imports in a single file
function repairFile(filePath) {
	let content = fs.readFileSync(filePath, 'utf8');
	let modified = false;

	// Matches imports: from '$lib/...' or from './...' or from '../...'
	const importRegex = /(from|import)\s+['"]([^'"]+)['"]/g;

	content = content.replace(importRegex, (match, prefix, importPath) => {
		// Check if it imports from website/ or ui-component/ or relative files that have moved
		const isLibImport = importPath.startsWith('$lib/');
		const isRelative = importPath.startsWith('.');

		if (!isLibImport && !isRelative) return match;

		// Extract the filename from the import path (e.g. 'Button.svelte')
		const filename = path.basename(importPath);

		if (componentMap.has(filename)) {
			const targetRelLib = componentMap.get(filename);

			if (isLibImport) {
				// Old absolute path check (pointing to components/website or ui-component)
				if (importPath.includes('/components/website/') || importPath.includes('/ui-component/')) {
					const newImport = `$lib/${targetRelLib}`;
					if (importPath !== newImport) {
						modified = true;
						return `${prefix} '${newImport}'`;
					}
				}
			} else {
				// Relative import check. Compute what the relative path should be now.
				const currentFileRelLib = path.relative(libDir, filePath).replace(/\\/g, '/');
				const currentDirRelLib = path.dirname(currentFileRelLib);

				const targetDirRelLib = path.dirname(targetRelLib);

				// Only rewrite if either the importer or the target was moved
				if (currentFileRelLib.includes('/components/') || targetRelLib.includes('/components/')) {
					let relativePath = path.relative(
						path.join(libDir, currentDirRelLib),
						path.join(libDir, targetRelLib)
					).replace(/\\/g, '/');

					if (!relativePath.startsWith('.')) {
						relativePath = './' + relativePath;
					}

					if (importPath !== relativePath) {
						modified = true;
						return `${prefix} '${relativePath}'`;
					}
				}
			}
		}

		return match;
	});

	if (modified) {
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`Repaired imports in: ${filePath}`);
	}
}

// 3. Scan the entire src directory for JS/TS/Svelte files to fix imports
function scanAndRepair(dir) {
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stats = fs.statSync(fullPath);
		if (stats.isDirectory()) {
			if (!['node_modules', '.git', '.svelte-kit', 'build'].includes(item)) {
				scanAndRepair(fullPath);
			}
		} else {
			if (item.endsWith('.svelte') || item.endsWith('.ts') || item.endsWith('.js')) {
				repairFile(fullPath);
			}
		}
	}
}

console.log('Repairing import references...');
scanAndRepair(srcDir);
console.log('=== IMPORTS REPAIR COMPLETED ===');
