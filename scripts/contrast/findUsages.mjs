/**
 * For a given list of CSS custom-property names, find every place in the
 * codebase that USES them — so the contrast report can point the reviewer at
 * exactly which routes / components / global classes need to be re-checked
 * after a token value changes.
 *
 * Two ways a token is "used" in this codebase:
 *
 *   1. Direct CSS-var reference:  `var(--form-text-muted)`
 *      Appears in: inline `style="..."`, component `<style>` blocks,
 *      `app.css` utility classes, occasional Tailwind arbitrary values
 *      like `bg-[var(--dash-bg-card)]`.
 *
 *   2. Tailwind class derivation:  tokens declared inside `@theme` get
 *      auto-exposed as Tailwind classes. Example: `--color-bg-main`
 *      becomes `bg-main` (and `text-main`, `border-main` etc.).
 *      Tokens NOT in `@theme` (e.g. `--form-text`) only work via `var()`.
 *
 * For each token we run two greps:
 *   - var(--token-name)        across .svelte / .ts / .css files
 *   - The Tailwind-class form   if and only if the token is exposed via @theme
 *
 * Results are grouped into three buckets so the report can suggest a
 * navigation order:
 *
 *   - GLOBAL  — defined in app.css / driver-theme.css (the token system itself
 *               or a shared utility class). Means: fix the token value here.
 *   - ROUTE   — used in src/routes/ ... +page.svelte. Means: visit those routes.
 *   - COMPONENT — used in src/lib/components/. Means: re-render those.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * Run a grep using ripgrep if available (fast on Windows + cross-shell), falling
 * back to grep -r. We pipe everything through the shell with file-existence
 * tolerance so a missing dir doesn't blow up the audit.
 */
function grepCodebase(pattern, fileGlob) {
	// Use ripgrep (rg) if installed — much faster, handles binary files cleanly.
	// Fall back to git grep (always present in a git repo on Windows) if rg fails.
	const tries = [
		`rg --no-heading --line-number --color=never "${escapeForShell(pattern)}" ${fileGlob}`,
		`git grep -n -- "${escapeForShell(pattern)}" ${fileGlob}`
	];
	for (const cmd of tries) {
		try {
			const out = execSync(cmd, {
				cwd: ROOT,
				encoding: 'utf-8',
				timeout: 30_000,
				stdio: ['ignore', 'pipe', 'ignore']
			});
			return out.trim().split('\n').filter(Boolean);
		} catch {
			// Empty result OR command failed — try the next strategy
		}
	}
	return [];
}

function escapeForShell(s) {
	return s.replace(/(["\\$`])/g, '\\$1');
}

/**
 * Look for a token's usages. Returns a deduped list of "file:line" strings,
 * each annotated with its bucket.
 */
export function findUsages(tokenName, { isThemeToken = false }) {
	const buckets = { global: [], route: [], component: [], other: [] };

	// 1. var() form
	const varHits = grepCodebase(`var(${tokenName}`, 'src');
	for (const hit of varHits) categorize(hit, buckets);

	// 2. Tailwind class form (only if the token is exposed via @theme)
	// Tailwind 4 strips the `--color-` prefix, so `--color-bg-main` becomes
	// `bg-main` / `text-main` / `border-main`. For tokens like `--button-*`
	// or `--font-size-*` Tailwind generates classes too, but we only audit
	// color tokens here — limit class-search to color-bearing prefixes.
	if (isThemeToken) {
		const className = themeTokenToClassFragment(tokenName);
		if (className) {
			// Search for any of the common usage forms: `bg-X`, `text-X`, `border-X`,
			// `from-X`, `to-X`, `via-X`, etc. This is pattern-based — false positives
			// are possible (a different `text-main` not from your theme), but the
			// review is meant to be human-verified anyway.
			const tailwindHits = grepCodebase(
				`(bg|text|border|from|to|via|fill|stroke|ring|outline)-${className}\\b`,
				'src'
			);
			for (const hit of tailwindHits) categorize(hit, buckets);
		}
	}

	// Dedupe (the same line may match both var() and a Tailwind pattern)
	for (const k of Object.keys(buckets)) {
		buckets[k] = [...new Set(buckets[k])].sort();
	}

	return buckets;
}

/**
 * @theme token name → tailwind class fragment.
 * `--color-bg-main` → `main`     (used as `bg-main`)
 * `--color-primary` → `primary`  (used as `bg-primary`, `text-primary`)
 *
 * Returns null for tokens that don't follow the `--color-*` convention —
 * those won't have a Tailwind class form.
 */
function themeTokenToClassFragment(tokenName) {
	if (tokenName.startsWith('--color-')) {
		// strip `--color-` prefix; what remains is the class fragment
		return tokenName.slice('--color-'.length);
	}
	return null;
}

function categorize(line, buckets) {
	// `line` looks like `src/lib/components/Foo.svelte:42:    color: var(--form-text);`
	// or git-grep form: `src/lib/components/Foo.svelte:42:...`
	const sep = line.indexOf(':');
	if (sep === -1) return;
	const filePath = line.slice(0, sep).replace(/\\/g, '/');

	if (filePath.startsWith('src/app.css') || filePath.startsWith('src/lib/styles/')) {
		buckets.global.push(line);
	} else if (filePath.startsWith('src/routes/')) {
		buckets.route.push(line);
	} else if (filePath.startsWith('src/lib/components/')) {
		buckets.component.push(line);
	} else {
		buckets.other.push(line);
	}
}

/**
 * Helper: collapse a list of "file:line:..." strings into a deduped list of
 * just file paths (for the route-summary section).
 */
export function uniqueFiles(usageLines) {
	const set = new Set();
	for (const line of usageLines) {
		const sep = line.indexOf(':');
		if (sep === -1) continue;
		set.add(line.slice(0, sep).replace(/\\/g, '/'));
	}
	return [...set].sort();
}
