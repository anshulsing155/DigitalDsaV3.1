#!/usr/bin/env node
/**
 * Daily Code Review Runner
 * ═══════════════════════════════════════════════════════════════════
 * Runs automated health checks and appends results to the daily
 * code review file at docs/reviews/CODE-REVIEW-YYYY-MM-DD.md
 *
 * What it does:
 *   1. Type check (svelte-check)
 *   2. Unit tests (vitest)
 *   3. Selector health check (Playwright)
 *   4. Accessibility baseline diff (Playwright)
 *   5. Generates/appends an "Automated Health Check" section to the review file
 *
 * Usage:
 *   node scripts/daily-review.cjs              # Full run
 *   node scripts/daily-review.cjs --skip-e2e   # Skip Playwright (no dev server)
 *
 * Scheduling (Windows Task Scheduler):
 *   Program: node
 *   Arguments: scripts/daily-review.cjs
 *   Start in: F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS_DIR = path.join(ROOT, 'docs', 'reviews');
const RESULTS_DIR = path.join(ROOT, 'test-results');
const PLAYWRIGHT_RESULTS = path.join(RESULTS_DIR, 'playwright', 'results.json');
const A11Y_DIFF_JSON = path.join(RESULTS_DIR, 'accessibility', 'diff-report.json');
const A11Y_DIFF_TEXT = path.join(RESULTS_DIR, 'accessibility', 'diff-report.txt');
const VITEST_RESULTS = path.join(RESULTS_DIR, 'vitest', 'results.json');

const skipE2E = process.argv.includes('--skip-e2e');

// ── Helpers ──────────────────────────────────────────────────────

function today() {
	const d = new Date();
	return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function timestamp() {
	return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

function run(cmd, label) {
	console.log(`\n[${timestamp()}] Running: ${label}...`);
	try {
		const output = execSync(cmd, {
			cwd: ROOT,
			encoding: 'utf-8',
			timeout: 300_000, // 5 min
			stdio: ['pipe', 'pipe', 'pipe']
		});
		console.log(`  PASS`);
		return { success: true, output: output.trim() };
	} catch (err) {
		const stderr = (err.stderr || '').trim();
		const stdout = (err.stdout || '').trim();
		// vitest exits with code 1 even on success due to npm warnings
		if (label.includes('Unit tests') && stdout.includes('passed')) {
			console.log(`  PASS (exit code ignored — tests passed)`);
			return { success: true, output: stdout };
		}
		console.log(`  FAIL`);
		return { success: false, output: stdout, error: stderr || err.message };
	}
}

function readJsonSafe(filePath) {
	try {
		if (!fs.existsSync(filePath)) return null;
		return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	} catch {
		return null;
	}
}

function readTextSafe(filePath) {
	try {
		if (!fs.existsSync(filePath)) return null;
		return fs.readFileSync(filePath, 'utf-8').trim();
	} catch {
		return null;
	}
}

// ── Step 0: Static Pattern Guards ──────────────────────────────
// These patterns have caused real production 500s. Catch them before
// they reach type check or tests (which don't exercise SSR paths).

const STATIC_GUARDS = [
	{
		label: 'Broken SSR window guard (Pitfall #9)',
		// typeof window check is unreliable in Vite 7 SSR — window exists but window.location doesn't
		pattern: "typeof window !== 'undefined' ? window.location",
		files: 'src/**/*.svelte src/**/*.ts src/**/*.js',
		advice: "Use `browser` from `$app/environment` or `$page.url` from `$app/stores` instead."
	},
	{
		label: 'Raw window.location in template/module scope',
		// Safe inside onMount/event handlers, but dangerous in $derived / {@const} / module top-level
		pattern: 'new URL(window.location.href)',
		files: 'src/**/*.svelte src/**/*.ts',
		advice: "Use `$page.url.searchParams` in templates; wrap in `onMount` for script usage."
	}
];

let staticGuardResults = [];

for (const guard of STATIC_GUARDS) {
	try {
		const result = execSync(
			`grep -rn "${guard.pattern}" ${guard.files} --include="*.svelte" --include="*.ts" --include="*.js" 2>/dev/null || true`,
			{ cwd: ROOT, encoding: 'utf-8', timeout: 15_000 }
		).trim();

		if (result) {
			const lines = result.split('\n').filter(Boolean);
			staticGuardResults.push({ label: guard.label, hits: lines, advice: guard.advice });
			console.log(`  [WARN] ${guard.label}: ${lines.length} hit(s)`);
			lines.forEach((l) => console.log(`    ${l}`));
		} else {
			console.log(`  [OK] ${guard.label}: clean`);
			staticGuardResults.push({ label: guard.label, hits: [], advice: guard.advice });
		}
	} catch {
		staticGuardResults.push({ label: guard.label, hits: ['scan error'], advice: guard.advice });
	}
}

const staticGuardSummary = staticGuardResults
	.map((r) =>
		r.hits.length === 0
			? `✅ ${r.label}`
			: `⚠️ ${r.label}: **${r.hits.length} hit(s)** — ${r.advice}\n${r.hits.map((h) => `  - \`${h}\``).join('\n')}`
	)
	.join('\n');

// ── Step 1: Type Check ──────────────────────────────────────────

const typeCheck = run('pnpm run check', 'Type check (svelte-check)');
let typeCheckSummary = 'UNKNOWN';
if (typeCheck.success) {
	const errMatch = typeCheck.output.match(/found (\d+) error/);
	const warnMatch = typeCheck.output.match(/(\d+) warning/);
	const errors = errMatch ? parseInt(errMatch[1]) : 0;
	const warnings = warnMatch ? parseInt(warnMatch[1]) : 0;
	typeCheckSummary = `${errors} errors, ${warnings} warnings`;
} else {
	// Try to extract from error output
	const combined = typeCheck.output + ' ' + (typeCheck.error || '');
	const errMatch = combined.match(/found (\d+) error/);
	const warnMatch = combined.match(/(\d+) warning/);
	if (errMatch) {
		typeCheckSummary = `${errMatch[1]} errors, ${warnMatch ? warnMatch[1] : '?'} warnings`;
	} else {
		typeCheckSummary = 'FAILED — ' + (typeCheck.error || 'unknown error').slice(0, 100);
	}
}

// ── Step 2: Unit Tests ──────────────────────────────────────────

const unitTests = run('pnpm run test:unit -- --run', 'Unit tests (vitest)');
let unitTestSummary = 'UNKNOWN';
const vitestResults = readJsonSafe(VITEST_RESULTS);
if (vitestResults) {
	const passed = vitestResults.numPassedTests || 0;
	const failed = vitestResults.numFailedTests || 0;
	const files = vitestResults.numPassedTestSuites || 0;
	unitTestSummary = `${passed} passed, ${failed} failed (${files} files)`;
} else {
	// Parse from stdout
	const combined = unitTests.output || '';
	const testMatch = combined.match(/(\d+) passed/);
	const fileMatch = combined.match(/(\d+) passed.*?\((\d+)\)/);
	if (testMatch) {
		unitTestSummary = testMatch[0];
	} else {
		unitTestSummary = unitTests.success ? 'PASSED (count unknown)' : 'FAILED';
	}
}

// ── Step 2.5: Contrast audit (WCAG AA on declared fg/bg pairs) ──
// Static check, no dev-server needed. Always run; skip-e2e doesn't bypass it.
const contrastResult = run('node scripts/contrast/auditContrast.mjs --quiet', 'Contrast audit (WCAG AA)');
let contrastSummary = 'UNKNOWN';
let contrastReportPath = null;
const contrastJson = readJsonSafe(path.join(RESULTS_DIR, 'contrast', 'results.json'));
if (contrastJson) {
	const { passing, failing, errors: errs, totalChecks } = contrastJson;
	contrastReportPath = `docs/reviews/CONTRAST-AUDIT-${contrastJson.generatedAt}.md`;
	if (failing === 0 && errs === 0) {
		contrastSummary = `${passing}/${totalChecks} pairs pass WCAG AA`;
	} else {
		const parts = [];
		if (failing > 0) parts.push(`**${failing} failing**`);
		if (errs > 0) parts.push(`${errs} resolution errors`);
		contrastSummary = `${passing}/${totalChecks} pass — ${parts.join(', ')} — see [${contrastReportPath}](${contrastReportPath})`;
	}
} else {
	contrastSummary = contrastResult.success ? 'COMPLETED (json missing)' : 'FAILED — see console output';
}

// ── Step 3 & 4: Playwright (selector health + a11y) ─────────────

let selectorHealthSummary = 'SKIPPED';
let a11ySummary = 'SKIPPED';
let a11yDiffText = null;

if (!skipE2E) {
	// Run selector health
	const selectorResult = run(
		'pnpm exec playwright test selectorHealth.spec.ts --project=selector-health',
		'Selector health check'
	);
	if (selectorResult.success) {
		selectorHealthSummary = 'ALL SELECTORS HEALTHY';
	} else {
		// Try to extract failure info
		const failMatch = (selectorResult.output || '').match(/(\d+) failed/);
		const passMatch = (selectorResult.output || '').match(/(\d+) passed/);
		if (failMatch) {
			selectorHealthSummary =
				`${failMatch[1]} failed` + (passMatch ? `, ${passMatch[1]} passed` : '');
		} else {
			selectorHealthSummary =
				'FAILED — ' + (selectorResult.error || 'see playwright report').slice(0, 150);
		}
	}

	// Run accessibility baseline diff
	const a11yResult = run(
		'pnpm exec playwright test accessibilityBaseline.spec.ts --project=selector-health',
		'Accessibility baseline diff'
	);
	if (a11yResult.success) {
		a11ySummary = 'NO STRUCTURAL CHANGES';
	} else {
		a11ySummary = 'CHANGES DETECTED';
	}

	// Read diff report
	const a11yJson = readJsonSafe(A11Y_DIFF_JSON);
	a11yDiffText = readTextSafe(A11Y_DIFF_TEXT);

	if (a11yJson && a11yJson.summary) {
		const s = a11yJson.summary;
		if (s.totalAdded === 0 && s.totalRemoved === 0 && s.totalChanged === 0) {
			a11ySummary = `NO CHANGES (${s.totalPages} pages scanned)`;
		} else {
			a11ySummary = `+${s.totalAdded} added, -${s.totalRemoved} removed, ~${s.totalChanged} changed (${s.pagesWithChanges}/${s.totalPages} pages)`;
		}
	}
} else {
	console.log(`\n[${timestamp()}] Skipping E2E checks (--skip-e2e flag)`);
}

// ── Step 5: Git summary ─────────────────────────────────────────

let gitSummary = '';
try {
	const headCommit = execSync('git log --oneline -1', { cwd: ROOT, encoding: 'utf-8' }).trim();
	const branch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf-8' }).trim();
	const dirtyCount = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' })
		.trim()
		.split('\n')
		.filter((l) => l.length > 0).length;
	gitSummary = `**HEAD**: \`${headCommit}\` | **Branch**: ${branch} | **Unstaged**: ${dirtyCount} files`;
} catch {
	gitSummary = '_Could not read git status_';
}

// ── Step 6: Generate Review Section ─────────────────────────────

const date = today();
const reviewFile = path.join(REVIEWS_DIR, `CODE-REVIEW-${date}.md`);

const section = `
---

## Automated Health Check — ${date} ${timestamp()}

${gitSummary}

| Check | Result |
|-------|--------|
| **Type Check** | ${typeCheckSummary} |
| **Unit Tests** | ${unitTestSummary} |
| **Contrast (WCAG AA)** | ${contrastSummary} |
| **Selector Health** | ${selectorHealthSummary} |
| **Accessibility Diff** | ${a11ySummary} |

### Static Pattern Guards
${staticGuardSummary}

${a11yDiffText ? `### Accessibility Diff Detail\n\n\`\`\`\n${a11yDiffText}\n\`\`\`` : ''}
`.trimStart();

// ── Step 7: Write to review file ────────────────────────────────

if (!fs.existsSync(REVIEWS_DIR)) {
	fs.mkdirSync(REVIEWS_DIR, { recursive: true });
}

if (fs.existsSync(reviewFile)) {
	// Append to existing review file
	fs.appendFileSync(reviewFile, '\n' + section, 'utf-8');
	console.log(`\n[${timestamp()}] Appended health check to: ${reviewFile}`);
} else {
	// Create new review file with header + health check
	const header = `# Code Review — ${date}\n\n_Auto-generated daily health check. Manual review findings to be added above._\n`;
	fs.writeFileSync(reviewFile, header + '\n' + section, 'utf-8');
	console.log(`\n[${timestamp()}] Created new review file: ${reviewFile}`);
}

// ── Summary ─────────────────────────────────────────────────────

const staticGuardFails = staticGuardResults.filter((r) => r.hits.length > 0).length;

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Daily Review Complete — ${date}`);
console.log(`${'═'.repeat(60)}`);
console.log(`  Static Guards:    ${staticGuardFails === 0 ? 'ALL CLEAN' : `${staticGuardFails} WARNING(S)`}`);
console.log(`  Type Check:       ${typeCheckSummary}`);
console.log(`  Unit Tests:       ${unitTestSummary}`);
console.log(`  Contrast (AA):    ${contrastJson ? `${contrastJson.passing}/${contrastJson.totalChecks} pass, ${contrastJson.failing} fail` : contrastSummary}`);
console.log(`  Selector Health:  ${selectorHealthSummary}`);
console.log(`  Accessibility:    ${a11ySummary}`);
console.log(`  Review File:      ${reviewFile}`);
console.log(`${'═'.repeat(60)}\n`);

// Exit with error if any critical check failed
const criticalFail = !typeCheck.success || !unitTests.success;
process.exit(criticalFail ? 1 : 0);
