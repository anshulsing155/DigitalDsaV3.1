#!/usr/bin/env node

/**
 * Schema Sync Script
 *
 * Copies form schemas from src/lib/server/formEngine/schemas/ (canonical, server-only)
 * to src/lib/config/ (for testing and development).
 *
 * This ensures:
 * - Single source of truth (server location)
 * - No manual duplication burden
 * - Schemas never exposed to client bundle
 * - Tests can access schemas easily
 *
 * Run: node scripts/syncSchemas.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serverSchemaDir = path.join(__dirname, '../src/lib/server/formEngine/schemas');
const configDir = path.join(__dirname, '../src/lib/config');

// Schema files to sync (all JSON files in schemas directory)
const schemaFiles = fs.readdirSync(serverSchemaDir).filter((f) => f.endsWith('.json'));

console.log('🔄 Syncing form schemas...\n');

let syncCount = 0;
let errorCount = 0;

schemaFiles.forEach((file) => {
	const sourcePath = path.join(serverSchemaDir, file);
	const destPath = path.join(configDir, file);

	try {
		const content = fs.readFileSync(sourcePath, 'utf8');
		fs.writeFileSync(destPath, content, 'utf8');
		console.log(`  ✓ ${file}`);
		syncCount++;
	} catch (err) {
		console.error(`  ✗ ${file}: ${err.message}`);
		errorCount++;
	}
});

console.log(`\n📊 Synced: ${syncCount} file(s)`);
if (errorCount > 0) {
	console.error(`⚠️  Errors: ${errorCount} file(s)\n`);
	process.exit(1);
}
console.log('✅ All schemas synced successfully!\n');
