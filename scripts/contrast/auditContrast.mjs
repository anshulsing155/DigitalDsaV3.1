#!/usr/bin/env node
/**
 * Contrast Audit — main entry point.
 *
 * Run:
 *   pnpm test:contrast              # full audit, writes report file
 *   pnpm test:contrast --quiet      # write report only, no console summary
 *   pnpm test:contrast --no-scan    # skip codebase usage scan (faster, no "where used")
 *   pnpm test:contrast --strict     # exit 1 if any pair fails (for CI)
 *
 * Output:
 *   - docs/reviews/CONTRAST-AUDIT-YYYY-MM-DD.md  (the report)
 *   - test-results/contrast/results.json         (machine-readable, for daily-review.cjs)
 *
 * Pipeline:
 *   1. Parse src/app.css and src/lib/styles/driver-theme.css → token map per selector
 *   2. For each declared pair × each theme:
 *        - Build the inheritance chain (theme overrides → :root → @theme)
 *        - Resolve fg and bg through any var() chains
 *        - Composite if fg has alpha, then compute WCAG ratio
 *        - Compare against pair.minRatio
 *   3. For each FAILING pair, run a codebase grep to find where it's rendered
 *   4. Emit a markdown report with summary, routes-to-verify, and per-pair details
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseTokens } from './parseTokens.mjs';
import { buildChain, resolveToken } from './resolveVars.mjs';
import { parseColor, contrastRatio, composite } from './wcag.mjs';
import { PAIRS, THEMES, KNOWN_FAILURES } from './pairs.mjs';
import { findUsages } from './findUsages.mjs';
import { buildReport } from './reportBuilder.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const QUIET = process.argv.includes('--quiet');
const STRICT = process.argv.includes('--strict');
const NO_SCAN = process.argv.includes('--no-scan');

// ── Parse all token sources ───────────────────────────────────────────
const cssFiles = [
	path.join(ROOT, 'src', 'app.css'),
	path.join(ROOT, 'src', 'lib', 'styles', 'driver-theme.css')
].filter((p) => fs.existsSync(p));

const themes = new Map();
for (const file of cssFiles) {
	const parsed = parseTokens(file);
	// Merge: tokens from later files override earlier ones at the same selector
	for (const [selector, data] of parsed) {
		if (!themes.has(selector)) {
			themes.set(selector, { ...data, decls: new Map(data.decls) });
		} else {
			const existing = themes.get(selector);
			for (const [k, v] of data.decls) existing.decls.set(k, v);
		}
	}
}

if (!QUIET) {
	console.log(`[contrast] parsed ${themes.size} selector blocks from ${cssFiles.length} CSS file(s)`);
	for (const [key, data] of themes) {
		console.log(`  ${key.padEnd(36)} ${data.decls.size} declarations`);
	}
}

// ── Run the audit ─────────────────────────────────────────────────────
const results = [];
const isThemeToken = (name) => themes.get('@theme')?.decls.has(name) === true;

for (const pair of PAIRS) {
	for (const theme of THEMES) {
		const chain = buildChain(themes, theme);
		const fgRaw = resolveToken(pair.fg, chain);
		const bgRaw = resolveToken(pair.bg, chain);

		// If either token doesn't exist in this theme, mark as resolution error
		if (!fgRaw.ok) {
			results.push({
				pair,
				theme,
				fgValue: null,
				bgValue: null,
				ratio: null,
				passed: null,
				error: `fg ${pair.fg}: ${fgRaw.reason}`
			});
			continue;
		}
		if (!bgRaw.ok) {
			results.push({
				pair,
				theme,
				fgValue: null,
				bgValue: null,
				ratio: null,
				passed: null,
				error: `bg ${pair.bg}: ${bgRaw.reason}`
			});
			continue;
		}

		const fgColor = parseColor(fgRaw.value);
		const bgColor = parseColor(bgRaw.value);

		if (!fgColor) {
			results.push({
				pair,
				theme,
				fgValue: fgRaw.value,
				bgValue: bgRaw.value,
				ratio: null,
				passed: null,
				error: `fg "${fgRaw.value}" is not a parseable color`
			});
			continue;
		}
		if (!bgColor) {
			results.push({
				pair,
				theme,
				fgValue: fgRaw.value,
				bgValue: bgRaw.value,
				ratio: null,
				passed: null,
				error: `bg "${bgRaw.value}" is not a parseable color (translucent backgrounds need an explicit fallback in the pair config)`
			});
			continue;
		}
		// If the background is translucent we need an opaque surface to composite onto.
		// The pair config can declare `behindBg` for exactly this case. In light mode
		// many tokens that are translucent in dark mode become opaque, so the composite
		// is a no-op there — we still apply it harmlessly when behindBg is declared.
		let effectiveBg = bgColor;
		let bgDisplayValue = bgRaw.value;
		if (bgColor.a < 1) {
			if (!pair.behindBg) {
				results.push({
					pair,
					theme,
					fgValue: fgRaw.value,
					bgValue: bgRaw.value,
					ratio: null,
					passed: null,
					error: `bg has alpha < 1; declare a 'behindBg' in the pair config naming the opaque surface this layer sits on`
				});
				continue;
			}
			const behindRaw = resolveToken(pair.behindBg, chain);
			if (!behindRaw.ok) {
				results.push({
					pair,
					theme,
					fgValue: fgRaw.value,
					bgValue: bgRaw.value,
					ratio: null,
					passed: null,
					error: `behindBg ${pair.behindBg}: ${behindRaw.reason}`
				});
				continue;
			}
			const behindColor = parseColor(behindRaw.value);
			if (!behindColor || behindColor.a < 1) {
				results.push({
					pair,
					theme,
					fgValue: fgRaw.value,
					bgValue: bgRaw.value,
					ratio: null,
					passed: null,
					error: `behindBg "${behindRaw.value}" must be an opaque color`
				});
				continue;
			}
			// Composite the translucent bg onto the opaque surface to get the rendered colour
			effectiveBg = composite(bgColor, behindColor);
			bgDisplayValue = `${bgRaw.value} ⇒ #${[effectiveBg.r, effectiveBg.g, effectiveBg.b].map((n) => n.toString(16).padStart(2, '0')).join('')} (over ${behindRaw.value})`;
		}

		const ratio = contrastRatio(fgColor, effectiveBg);
		const passed = ratio >= pair.minRatio;

		// Suppress known/accepted failures (reviewers move pairs into KNOWN_FAILURES
		// when they're intentional and tracked elsewhere)
		const isKnown = KNOWN_FAILURES.some(
			(k) => k.pairName === pair.name && k.themeId === theme.id
		);

		results.push({
			pair,
			theme,
			fgValue: fgRaw.value,
			bgValue: bgDisplayValue,
			ratio,
			passed: passed || isKnown,
			isKnownFailure: !passed && isKnown,
			error: null
		});
	}
}

// ── For failing pairs, scan the codebase for usage sites ──────────────
if (!NO_SCAN) {
	if (!QUIET) console.log('[contrast] scanning codebase for usage sites...');
	// Scan once per unique token name (multiple failing pairs may share tokens)
	const tokensToScan = new Set();
	for (const r of results) {
		if (r.passed === false && !r.error) {
			tokensToScan.add(r.pair.fg);
			tokensToScan.add(r.pair.bg);
		}
	}
	const usageCache = new Map();
	for (const token of tokensToScan) {
		usageCache.set(token, findUsages(token, { isThemeToken: isThemeToken(token) }));
	}
	for (const r of results) {
		if (r.passed === false && !r.error) {
			r.usages = {
				fg: usageCache.get(r.pair.fg),
				bg: usageCache.get(r.pair.bg)
			};
		}
	}
}

// ── Write outputs ─────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const reportDir = path.join(ROOT, 'docs', 'reviews');
const reportPath = path.join(reportDir, `CONTRAST-AUDIT-${today}.md`);
const jsonDir = path.join(ROOT, 'test-results', 'contrast');
const jsonPath = path.join(jsonDir, 'results.json');

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(jsonDir, { recursive: true });

const report = buildReport({
	results,
	generatedAt: today,
	totalPairs: PAIRS.length,
	totalThemes: THEMES.length
});

fs.writeFileSync(reportPath, report, 'utf-8');
fs.writeFileSync(
	jsonPath,
	JSON.stringify(
		{
			generatedAt: today,
			totalChecks: results.length,
			passing: results.filter((r) => r.passed === true).length,
			failing: results.filter((r) => r.passed === false && !r.error).length,
			errors: results.filter((r) => r.error).length,
			knownFailures: results.filter((r) => r.isKnownFailure).length,
			results: results.map((r) => ({
				pair: r.pair.name,
				theme: r.theme.id,
				fgToken: r.pair.fg,
				bgToken: r.pair.bg,
				fg: r.fgValue,
				bg: r.bgValue,
				ratio: r.ratio,
				required: r.pair.minRatio,
				passed: r.passed,
				error: r.error || null
			}))
		},
		null,
		2
	),
	'utf-8'
);

// ── Console summary ───────────────────────────────────────────────────
const failing = results.filter((r) => r.passed === false && !r.error).length;
const errored = results.filter((r) => r.error).length;
const passing = results.filter((r) => r.passed === true).length;

if (!QUIET) {
	console.log('');
	console.log(`[contrast] ${passing}/${results.length} pairs passed`);
	if (failing > 0) console.log(`[contrast] ${failing} FAILING — see ${path.relative(ROOT, reportPath)}`);
	if (errored > 0) console.log(`[contrast] ${errored} resolution errors — see report for details`);
	if (failing === 0 && errored === 0) console.log(`[contrast] all pairs pass WCAG AA across every theme`);
	console.log(`[contrast] report:  ${path.relative(ROOT, reportPath)}`);
	console.log(`[contrast] json:    ${path.relative(ROOT, jsonPath)}`);
}

if (STRICT && (failing > 0 || errored > 0)) {
	process.exit(1);
}
