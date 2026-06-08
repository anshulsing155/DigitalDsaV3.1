/**
 * PMS Registry Integrity CI Gate
 * ══════════════════════════════════════════════════════════════════
 * Run on every PR and as part of pnpm check. Enforces three rules:
 *
 *  Rule A — No row deletion from keyRegistry.ts
 *  Rule B — Active keys whose bindsTo is absent from form config → fail
 *  Rule C — keyRegistry.ts change without matching registryChangelog.ts entry → fail
 *
 * Usage:
 *   node scripts/check-registry-integrity.cjs
 *   node scripts/check-registry-integrity.cjs --skip-git   # skip Rule A (no git available)
 *
 * Exit code 0 = all rules pass. Exit code 1 = at least one failure.
 * ══════════════════════════════════════════════════════════════════
 */

/* eslint-disable no-console */
// CI gate script — uses console.log/error directly. The Pino logger is server-
// runtime only; CLI output here is the actual deliverable.

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'src/lib/config/pms/keyRegistry.ts');
const CHANGELOG_PATH = path.join(ROOT, 'src/lib/config/pms/registryChangelog.ts');
const FORM_CONFIG_DIR = path.join(ROOT, 'src/lib/config');

const skipGit = process.argv.includes('--skip-git');

let failures = 0;

function fail(message) {
	console.error(`\n  ❌  ${message}\n`);
	failures++;
}

function pass(message) {
	console.log(`  ✅  ${message}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract all `path:` values from a keyRegistry.ts file content.
 * Uses a simple regex — sufficient because all paths are string literals.
 */
function extractPaths(content) {
	const matches = [...content.matchAll(/path:\s*'([^']+)'/g)];
	return new Set(matches.map((m) => m[1]));
}

/**
 * Extract all `bindsTo:` values that correspond to active (non-deprecated) keys.
 * We pair each path with its deprecatedAt to only check active keys.
 */
function extractActiveBindsTos(content) {
	// Extract blocks between { ... } that contain both path and bindsTo
	// Simple line-by-line parser — good enough for our structured TS file
	const lines = content.split('\n');
	const active = new Set();

	let inBlock = false;
	let blockPath = '';
	let blockBindsTo = '';
	let blockDeprecatedAt = '';
	let blockSource = '';
	let braceDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Detect entry start
		if (trimmed === '{') {
			inBlock = true;
			blockPath = '';
			blockBindsTo = '';
			blockDeprecatedAt = '';
			blockSource = '';
			braceDepth = 1;
			continue;
		}

		if (!inBlock) continue;

		// Track brace nesting
		for (const ch of trimmed) {
			if (ch === '{') braceDepth++;
			if (ch === '}') braceDepth--;
		}

		// Extract fields
		const pathMatch = trimmed.match(/^path:\s*'([^']+)'/);
		if (pathMatch) blockPath = pathMatch[1];

		const bindsToMatch = trimmed.match(/^bindsTo:\s*'([^']*)'/);
		if (bindsToMatch) blockBindsTo = bindsToMatch[1];

		const deprecatedAtMatch = trimmed.match(/^deprecatedAt:\s*(null|'[^']*')/);
		if (deprecatedAtMatch) blockDeprecatedAt = deprecatedAtMatch[1];

		const sourceMatch = trimmed.match(/^source:\s*'(form|computed)'/);
		if (sourceMatch) blockSource = sourceMatch[1];

		// End of block
		if (braceDepth === 0) {
			inBlock = false;
			// Only check active, form-sourced keys with a non-empty bindsTo
			if (
				blockSource === 'form' &&
				blockBindsTo &&
				blockDeprecatedAt === 'null'
			) {
				active.add({ path: blockPath, bindsTo: blockBindsTo });
			}
		}
	}

	return active;
}

/**
 * Scan all form question bank files AND applicant JSON configs for bindsTo /
 * key usage. Returns a Set of all storage-key values found.
 *
 * Sources scanned:
 *  - src/lib/config/<loan>/questionBank/*.ts — declarative TS questions
 *  - src/lib/config/applicant*.json          — applicant-level JSON questions
 *    (these use "key" / "bindsTo_template" rather than questionBank's "bindsTo")
 */
function scanFormBindsTos() {
	const found = new Set();
	const questionBankDirs = [
		path.join(FORM_CONFIG_DIR, 'homeLoan', 'questionBank'),
		path.join(FORM_CONFIG_DIR, 'lapLoan', 'questionBank'),
		path.join(FORM_CONFIG_DIR, 'plotLoan', 'questionBank'),
		path.join(FORM_CONFIG_DIR, 'personalLoan', 'questionBank'),
		path.join(FORM_CONFIG_DIR, 'businessLoan', 'questionBank'),
		path.join(FORM_CONFIG_DIR, 'professionalLoan', 'questionBank')
	];

	for (const dir of questionBankDirs) {
		if (!fs.existsSync(dir)) continue;
		const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
		for (const file of files) {
			const content = fs.readFileSync(path.join(dir, file), 'utf8');
			// Match bindsTo_template: 'someKey' and bindsTo: 'someKey'
			const matches = [
				...content.matchAll(/bindsTo(?:_template)?:\s*['"]([\w.]+)['"]/g)
			];
			for (const m of matches) {
				found.add(m[1]);
			}
		}
	}

	// JSON-based question configs. These declare keys via "key" /
	// "bindsTo_template" (JSON syntax), so the questionBank regex above misses
	// them. Two categories:
	//   1) Applicant-level configs — onProperty / onEMI / yourRelationship etc.
	//   2) Legacy loan-level schemas — dealValue / propertyValueAsPerATS etc.
	//      (Some keys live only in the legacy *Schema*.json — these are still
	//      loaded for visibility helpers and remain referenced from PMS rules.)
	const jsonConfigs = [
		'applicantBasicDetails.json',
		'applicantBasicDetailsSecuredLoans.json',
		'applicantQuestion.json',
		'commonPage.json',
		'companyQuestion.json',
		'businessQuestions.json',
		'businessOtherQuestions.json',
		'directorsQuestion.json',
		'directorTable.json',
		'pensionerPerson.json',
		'GPAforNRI.json',
		'GPAOfNRIApplicant.json',
		'homeLoanSchema.json',
		'homeLoanSchemaV2.json'
	];
	for (const filename of jsonConfigs) {
		const filePath = path.join(FORM_CONFIG_DIR, filename);
		if (!fs.existsSync(filePath)) continue;
		const content = fs.readFileSync(filePath, 'utf8');
		const matches = [
			...content.matchAll(/"(?:bindsTo(?:_template)?|key)":\s*"([\w.]+)"/g)
		];
		for (const m of matches) {
			found.add(m[1]);
		}
	}

	return found;
}

// ── Rule A — No row deletion ──────────────────────────────────────────────────

console.log('\n📋  Rule A — No row deletion from keyRegistry.ts');

if (skipGit) {
	pass('Skipped (--skip-git flag)');
} else {
	try {
		// Get the registry content from the last commit
		const previousContent = execSync(
			'git show HEAD:src/lib/config/pms/keyRegistry.ts 2>/dev/null || echo ""',
			{ cwd: ROOT, encoding: 'utf8' }
		);
		const currentContent = fs.readFileSync(REGISTRY_PATH, 'utf8');

		const previousPaths = extractPaths(previousContent);
		const currentPaths = extractPaths(currentContent);

		const deleted = [...previousPaths].filter((p) => !currentPaths.has(p));

		if (deleted.length > 0) {
			for (const p of deleted) {
				fail(
					`Key '${p}' was present in the last commit but is now missing from keyRegistry.ts.\n` +
					`     Rows may never be deleted — mark as deprecated instead:\n` +
					`     deprecatedAt: '${new Date().toISOString().slice(0, 10)}',\n` +
					`     deprecationReason: 'Reason why this key is no longer active'`
				);
			}
		} else {
			pass(`No rows deleted (${currentPaths.size} total keys)`);
		}
	} catch (err) {
		// Git unavailable or not in a repo — skip gracefully
		pass(`Skipped (git not available: ${err.message.slice(0, 60)})`);
	}
}

// ── Rule B — Form/registry sync ───────────────────────────────────────────────

console.log('\n📋  Rule B — Active form keys must exist in form question banks');

const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
const activeBindsTos = extractActiveBindsTos(registryContent);
const formBindsTos = scanFormBindsTos();

let ruleBPassed = true;
for (const { path: keyPath, bindsTo } of activeBindsTos) {
	if (!formBindsTos.has(bindsTo)) {
		fail(
			`Key '${keyPath}' is marked active in keyRegistry.ts but its bindsTo key '${bindsTo}'\n` +
			`     does not appear in any form question bank.\n` +
			`     Mark it deprecated before removing the form question:\n` +
			`     deprecatedAt: '${new Date().toISOString().slice(0, 10)}',\n` +
			`     deprecationReason: 'Form question removed'`
		);
		ruleBPassed = false;
	}
}
if (ruleBPassed) {
	pass(`All ${activeBindsTos.size} active form keys found in question banks`);
}

// ── Rule C — Changelog required when registry changes ────────────────────────

console.log('\n📋  Rule C — keyRegistry.ts changes must have changelog entries');

if (skipGit) {
	pass('Skipped (--skip-git flag)');
} else {
	try {
		const registryDiff = execSync(
			'git diff HEAD -- src/lib/config/pms/keyRegistry.ts 2>/dev/null || echo ""',
			{ cwd: ROOT, encoding: 'utf8' }
		);
		const changelogDiff = execSync(
			'git diff HEAD -- src/lib/config/pms/registryChangelog.ts 2>/dev/null || echo ""',
			{ cwd: ROOT, encoding: 'utf8' }
		);

		const registryChanged = registryDiff.trim().length > 0;
		const changelogChanged = changelogDiff.trim().length > 0;

		if (registryChanged && !changelogChanged) {
			fail(
				'keyRegistry.ts was modified but registryChangelog.ts has no new entries.\n' +
				'     Add a changelog entry for every registry change (add or deprecate).'
			);
		} else if (registryChanged && changelogChanged) {
			pass('Both keyRegistry.ts and registryChangelog.ts updated together');
		} else {
			pass('keyRegistry.ts not modified in this diff — no changelog entry required');
		}
	} catch (err) {
		pass(`Skipped (git not available: ${err.message.slice(0, 60)})`);
	}
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
if (failures === 0) {
	console.log('  ✅  Registry integrity: ALL RULES PASS\n');
	process.exit(0);
} else {
	console.error(`  ❌  Registry integrity: ${failures} FAILURE(S)\n`);
	process.exit(1);
}
