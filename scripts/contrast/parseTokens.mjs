/**
 * Parse CSS custom-property declarations from a CSS file.
 *
 * For each selector block (`:root`, `.dark`, `[data-scheme='ocean'].dark`, etc.)
 * extract every `--name: value;` pair. The output is a map keyed by selector,
 * where each value is a Map of token-name → raw-value (still as written, e.g.
 * `var(--ddsa-primary-700)` or `#cb997e` or `rgba(0,0,0,0.06)`).
 *
 * We deliberately use a hand-rolled regex pass instead of pulling in postcss —
 * the inputs are flat custom-property declarations (no nesting, no @rules of
 * interest beyond the top-level selector blocks). Regex is faster, has zero
 * deps, and stays readable for a one-purpose script.
 */

import fs from 'node:fs';

// Selector blocks we care about. Any block that defines color tokens used
// somewhere in the app counts. We accept the standard CSS-flavoured forms
// the codebase actually uses today; if a new theme-variant selector shape
// is added (e.g. `[data-theme=hc]`), extend this list.
const SELECTOR_PATTERNS = [
	{ key: ':root', regex: /^:root\s*\{/m, kind: 'base-light' },
	{ key: '.dark', regex: /^\.dark\s*\{/m, kind: 'base-dark' },
	// data-scheme variants — both .dark suffix (override-on-dark) and bare (override-on-light)
	{
		key: "[data-scheme='ocean'].dark",
		regex: /^\[data-scheme=['"]ocean['"]\]\.dark\s*\{/m,
		kind: 'scheme-dark',
		scheme: 'ocean'
	},
	{
		key: "[data-scheme='forest'].dark",
		regex: /^\[data-scheme=['"]forest['"]\]\.dark\s*\{/m,
		kind: 'scheme-dark',
		scheme: 'forest'
	},
	{
		key: "[data-scheme='slate'].dark",
		regex: /^\[data-scheme=['"]slate['"]\]\.dark\s*\{/m,
		kind: 'scheme-dark',
		scheme: 'slate'
	},
	{
		key: "[data-scheme='rose'].dark",
		regex: /^\[data-scheme=['"]rose['"]\]\.dark\s*\{/m,
		kind: 'scheme-dark',
		scheme: 'rose'
	},
	{
		key: "[data-scheme='amber'].dark",
		regex: /^\[data-scheme=['"]amber['"]\]\.dark\s*\{/m,
		kind: 'scheme-dark',
		scheme: 'amber'
	},
	// Light-mode scheme overrides (no .dark suffix). Some palettes only override in dark
	// mode and inherit light from :root, so these may not exist. parseAll handles missing.
	{
		key: "[data-scheme='ocean']",
		regex: /^\[data-scheme=['"]ocean['"]\]\s*\{/m,
		kind: 'scheme-light',
		scheme: 'ocean'
	},
	{
		key: "[data-scheme='forest']",
		regex: /^\[data-scheme=['"]forest['"]\]\s*\{/m,
		kind: 'scheme-light',
		scheme: 'forest'
	},
	{
		key: "[data-scheme='slate']",
		regex: /^\[data-scheme=['"]slate['"]\]\s*\{/m,
		kind: 'scheme-light',
		scheme: 'slate'
	},
	{
		key: "[data-scheme='rose']",
		regex: /^\[data-scheme=['"]rose['"]\]\s*\{/m,
		kind: 'scheme-light',
		scheme: 'rose'
	},
	{
		key: "[data-scheme='amber']",
		regex: /^\[data-scheme=['"]amber['"]\]\s*\{/m,
		kind: 'scheme-light',
		scheme: 'amber'
	},
	// @theme is Tailwind 4's mechanism for exposing variables as classes. It also
	// declares custom properties we need to resolve — treat it like another :root.
	{ key: '@theme', regex: /^@theme\s*\{/m, kind: 'theme' }
];

/**
 * Walk forward from `startIndex` (just after the opening `{`) until we find the
 * matching `}` at brace-depth 0. Required because some blocks contain nested
 * `@media`, `@supports`, or nested rules inside `@theme`. We need balanced
 * parsing, not a simple `}` lookahead.
 */
function findClosingBrace(source, startIndex) {
	let depth = 1;
	for (let i = startIndex; i < source.length; i++) {
		const ch = source[i];
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Within a single selector block's body, extract every `--name: value;` pair
 * declared at the top level (not inside a nested rule). Multi-line values
 * (e.g. comma-separated rgba lists) are joined back into one logical line.
 */
function extractDeclarations(blockBody) {
	const decls = new Map();

	// Strip nested rules first — declarations inside `&:hover { ... }` etc. are
	// not what we want to audit at the theme level.
	const stripped = stripNestedBlocks(blockBody);

	// Match `--name: value;` allowing whitespace and newlines inside the value.
	// The `[\s\S]*?` is intentional (lazy, multi-line) since rgba()/var() can wrap.
	const declRegex = /(--[\w-]+)\s*:\s*([\s\S]*?);/g;
	let m;
	while ((m = declRegex.exec(stripped)) !== null) {
		const name = m[1];
		const value = m[2].trim().replace(/\s+/g, ' ');
		// Strip trailing inline comments — `/* foo */` after the value
		const cleaned = value.replace(/\/\*[\s\S]*?\*\//g, '').trim();
		if (cleaned.length > 0) decls.set(name, cleaned);
	}
	return decls;
}

/**
 * Remove any nested rule blocks (anything starting with a non-`--` selector
 * followed by `{ ... }`) from the source, keeping only declarations.
 */
function stripNestedBlocks(source) {
	let out = '';
	let i = 0;
	while (i < source.length) {
		const ch = source[i];
		if (ch === '{') {
			// We're inside a nested block. Skip to its closing brace.
			const close = findClosingBrace(source, i + 1);
			if (close === -1) break;
			i = close + 1;
		} else {
			out += ch;
			i++;
		}
	}
	return out;
}

/**
 * Parse the whole CSS file and return a Map<selectorKey, { kind, scheme?, decls: Map<name, value> }>.
 * Selectors that don't appear in the file are simply omitted from the output.
 */
export function parseTokens(cssPath) {
	const source = fs.readFileSync(cssPath, 'utf-8');
	const result = new Map();

	for (const sel of SELECTOR_PATTERNS) {
		// Find ALL occurrences — :root and .dark are declared more than once in
		// app.css (line 38 + 424 for :root, line 282 + 479 for .dark). Merge them
		// in declaration order so the second wins on conflict, matching browser cascade.
		const allRegex = new RegExp(sel.regex.source, 'gm');
		let match;
		const merged = new Map();
		while ((match = allRegex.exec(source)) !== null) {
			const openBraceIndex = match.index + match[0].length - 1;
			const closeIndex = findClosingBrace(source, openBraceIndex + 1);
			if (closeIndex === -1) continue;
			const body = source.slice(openBraceIndex + 1, closeIndex);
			const decls = extractDeclarations(body);
			for (const [k, v] of decls) merged.set(k, v); // later declarations win
		}
		if (merged.size > 0) {
			result.set(sel.key, { kind: sel.kind, scheme: sel.scheme, decls: merged });
		}
	}

	return result;
}
