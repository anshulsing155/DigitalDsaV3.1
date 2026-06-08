/**
 * Build the markdown report from a list of audit results.
 *
 * Each `result` entry is: {
 *   pair:       { name, fg, bg, minRatio, namespace },
 *   theme:      { id, label, scheme, dark },
 *   fgValue:    resolved foreground colour, e.g. '#9ca3af' or 'rgba(...)' (or null on resolve failure)
 *   bgValue:    resolved background colour
 *   ratio:      computed contrast ratio (number) or null if either side failed to resolve
 *   passed:     boolean — ratio >= minRatio
 *   error:      optional error string when colors couldn't be resolved
 *   usages:     { fg: { global: [], route: [], component: [], other: [] }, bg: { ... } }
 *               — only populated for failing pairs
 * }
 */

import { formatRatio } from './wcag.mjs';
import { uniqueFiles } from './findUsages.mjs';

/**
 * Build the full report. Returns a markdown string.
 */
export function buildReport({ results, generatedAt, totalPairs, totalThemes }) {
	const failures = results.filter((r) => r.passed === false && !r.error);
	const errors = results.filter((r) => r.error);
	const passes = results.filter((r) => r.passed === true);

	// Summary rollup: per-theme PASS/FAIL counts
	const themeRollup = new Map();
	for (const r of results) {
		const t = r.theme.id;
		if (!themeRollup.has(t)) themeRollup.set(t, { label: r.theme.label, pass: 0, fail: 0, error: 0 });
		const slot = themeRollup.get(t);
		if (r.error) slot.error++;
		else if (r.passed) slot.pass++;
		else slot.fail++;
	}

	const lines = [];
	lines.push(`# Contrast Audit — ${generatedAt}`);
	lines.push('');
	lines.push(`**Pairs audited:** ${totalPairs} pairs × ${totalThemes} themes = ${results.length} checks`);
	lines.push(`**Passing:** ${passes.length} · **Failing:** ${failures.length} · **Resolution errors:** ${errors.length}`);
	lines.push('');

	if (failures.length === 0 && errors.length === 0) {
		lines.push('All declared fg/bg pairs meet WCAG AA across every theme. ✅');
		lines.push('');
	}

	// ─── Per-theme rollup table ──────────────────────────────────────────
	lines.push('## Theme rollup');
	lines.push('');
	lines.push('| Theme | Pass | Fail | Resolve errors |');
	lines.push('|-------|------|------|----------------|');
	for (const [, slot] of themeRollup) {
		const failCol = slot.fail > 0 ? `**${slot.fail}**` : '0';
		const errCol = slot.error > 0 ? `**${slot.error}**` : '0';
		lines.push(`| ${slot.label} | ${slot.pass} | ${failCol} | ${errCol} |`);
	}
	lines.push('');

	// ─── Routes-to-verify summary (deduped across all failures) ──────────
	if (failures.length > 0) {
		const allRouteFiles = new Set();
		const allComponentFiles = new Set();
		for (const f of failures) {
			if (!f.usages) continue;
			for (const side of ['fg', 'bg']) {
				const u = f.usages[side];
				if (!u) continue;
				for (const file of uniqueFiles(u.route)) allRouteFiles.add(file);
				for (const file of uniqueFiles(u.component)) allComponentFiles.add(file);
			}
		}
		if (allRouteFiles.size > 0 || allComponentFiles.size > 0) {
			lines.push('## Routes & components to verify in browser');
			lines.push('');
			lines.push(
				'After fixing token values, navigate to each of these and toggle dark mode + each named scheme. Look at every text element on every card.'
			);
			lines.push('');
			if (allRouteFiles.size > 0) {
				lines.push('### Routes');
				for (const file of [...allRouteFiles].sort()) {
					lines.push(`- [${file}](${file})`);
				}
				lines.push('');
			}
			if (allComponentFiles.size > 0) {
				lines.push('### Components');
				for (const file of [...allComponentFiles].sort()) {
					lines.push(`- [${file}](${file})`);
				}
				lines.push('');
			}
		}
	}

	// ─── Failures (the actionable section) ───────────────────────────────
	if (failures.length > 0) {
		lines.push('## Failing pairs');
		lines.push('');
		lines.push(
			'Each failure shows the resolved hex values, the contrast ratio achieved, the required minimum, and exactly where in the codebase the pair is rendered. **Fix at the token-definition layer first** — if the token is used in 14 places, changing the token value fixes all 14.'
		);
		lines.push('');

		// Group failures by pair name so the same pair across multiple themes
		// stacks into one section
		const byPair = new Map();
		for (const f of failures) {
			if (!byPair.has(f.pair.name)) byPair.set(f.pair.name, []);
			byPair.get(f.pair.name).push(f);
		}

		for (const [pairName, pairFailures] of byPair) {
			const first = pairFailures[0];
			lines.push(`### ${pairName}`);
			lines.push('');
			lines.push(`**Tokens:** \`${first.pair.fg}\` (text) on \`${first.pair.bg}\` (bg)`);
			lines.push(`**Required:** ${first.pair.minRatio}:1 (WCAG AA, ${first.pair.namespace})`);
			lines.push('');
			lines.push('| Theme | fg resolved | bg resolved | ratio | gap |');
			lines.push('|-------|------------|------------|-------|-----|');
			for (const f of pairFailures) {
				const fgDisplay = f.fgValue || '—';
				const bgDisplay = f.bgValue || '—';
				const ratioDisplay = f.ratio !== null ? formatRatio(f.ratio) : 'unresolved';
				const gap =
					f.ratio !== null
						? `−${(f.pair.minRatio - f.ratio).toFixed(2)}`
						: '—';
				lines.push(`| ${f.theme.label} | \`${fgDisplay}\` | \`${bgDisplay}\` | ${ratioDisplay} | ${gap} |`);
			}
			lines.push('');

			// Where used (use the first failure's usage data — same pair, same tokens
			// across themes, so usage is identical)
			if (first.usages) {
				lines.push('**Where this pair is rendered:**');
				lines.push('');
				const fgU = first.usages.fg || {};
				const bgU = first.usages.bg || {};

				const totals = {
					global: (fgU.global?.length || 0) + (bgU.global?.length || 0),
					route: uniqueFiles([...(fgU.route || []), ...(bgU.route || [])]).length,
					component: uniqueFiles([...(fgU.component || []), ...(bgU.component || [])]).length
				};
				const scope = classifyScope(totals);
				lines.push(`Scope: **${scope}**  (${totals.global} global hits, ${totals.route} route files, ${totals.component} component files)`);
				lines.push('');

				appendUsageSection(lines, 'Global CSS / utility classes', [
					...(fgU.global || []),
					...(bgU.global || [])
				]);
				appendUsageSection(lines, 'Routes', [
					...(fgU.route || []),
					...(bgU.route || [])
				], { uniqueByFile: true });
				appendUsageSection(lines, 'Components', [
					...(fgU.component || []),
					...(bgU.component || [])
				], { uniqueByFile: true });
				appendUsageSection(lines, 'Other', [
					...(fgU.other || []),
					...(bgU.other || [])
				]);
			} else {
				lines.push('_Usage scan was skipped (run with `--scan-usages` to populate this section)._');
				lines.push('');
			}
		}
	}

	// ─── Resolution errors (auditing-tool problems, not contrast fails) ──
	if (errors.length > 0) {
		lines.push('## Resolution errors');
		lines.push('');
		lines.push(
			'These pairs could not be evaluated because one or both tokens are undefined in the theme, contain a circular var() reference, or use a value the parser does not understand (e.g. `currentColor`, gradients). Fix the audit configuration or token definition.'
		);
		lines.push('');
		lines.push('| Pair | Theme | Error |');
		lines.push('|------|-------|-------|');
		for (const e of errors) {
			lines.push(`| ${e.pair.name} | ${e.theme.label} | ${e.error} |`);
		}
		lines.push('');
	}

	return lines.join('\n') + '\n';
}

function classifyScope({ global, route, component }) {
	if (global > 0 && (route + component) === 0) return '🌐 System-only (token defs / utility classes)';
	if (global > 0) return '🌐 System-wide (in tokens AND used in components)';
	if (route > 0 && component > 0) return '🧩+📄 Mixed components and routes';
	if (route > 0) return '📄 Page-only (no shared component)';
	if (component > 0) return '🧩 Component-only';
	return '❓ Not detected (token may only appear in CSS, not used yet)';
}

function appendUsageSection(lines, heading, hits, { uniqueByFile = false } = {}) {
	if (!hits || hits.length === 0) return;
	const list = uniqueByFile ? uniqueFiles(hits) : [...new Set(hits)];
	if (list.length === 0) return;
	lines.push(`**${heading}** (${list.length}):`);
	for (const item of list.slice(0, 25)) {
		// item is either "file:line:..." or just "file" (when uniqueByFile)
		if (item.includes(':') && !uniqueByFile) {
			const [file, lineNum] = item.split(':');
			lines.push(`- [${file}:${lineNum}](${file}:${lineNum})`);
		} else {
			lines.push(`- [${item}](${item})`);
		}
	}
	if (list.length > 25) lines.push(`- _…and ${list.length - 25} more_`);
	lines.push('');
}
