/**
 * Resolve a CSS color value within a theme context, following `var(--x)`
 * references through whatever inheritance chain applies for the active theme.
 *
 * Inheritance model (matches browser behaviour for the selectors we care about):
 *
 *   - Light, default scheme:        :root → @theme
 *   - Dark,  default scheme:        .dark → :root → @theme
 *   - Light, custom scheme (ocean): [data-scheme='ocean'] → :root → @theme
 *   - Dark,  custom scheme (ocean): [data-scheme='ocean'].dark → .dark → [data-scheme='ocean'] → :root → @theme
 *
 * The order matters: a more-specific block can override a token that
 * less-specific blocks defined. We look up each var() name by walking the
 * chain in priority order and stop at the first hit.
 *
 * Resolution returns either:
 *   - { ok: true, value: '#1a2b3c' | 'rgba(...)' | 'rgb(...)' }   (a renderable color)
 *   - { ok: false, reason: 'unresolved-var' | 'circular' | 'invalid' }
 */

const MAX_DEPTH = 10;

/**
 * Build the lookup chain of decl-Maps for a given theme context.
 * `themes` is the parsed token map from parseTokens().
 */
export function buildChain(themes, { scheme = null, dark = false } = {}) {
	const chain = [];

	if (scheme && dark) {
		const schemeDarkKey = `[data-scheme='${scheme}'].dark`;
		if (themes.has(schemeDarkKey)) chain.push(themes.get(schemeDarkKey).decls);
	}
	if (dark && themes.has('.dark')) chain.push(themes.get('.dark').decls);

	if (scheme && !dark) {
		const schemeLightKey = `[data-scheme='${scheme}']`;
		if (themes.has(schemeLightKey)) chain.push(themes.get(schemeLightKey).decls);
	}

	if (themes.has(':root')) chain.push(themes.get(':root').decls);
	if (themes.has('@theme')) chain.push(themes.get('@theme').decls);

	return chain;
}

/**
 * Look up a token name by walking the chain. Returns the raw value string
 * (still possibly containing `var(...)` itself — caller handles recursion).
 */
function lookup(chain, name) {
	for (const decls of chain) {
		if (decls.has(name)) return decls.get(name);
	}
	return undefined;
}

/**
 * Recursively resolve a value that may contain `var(--x, fallback)` references.
 * Returns the final color string, or null if any var() can't be resolved.
 */
export function resolveValue(rawValue, chain, depth = 0, seen = new Set()) {
	if (depth > MAX_DEPTH) return { ok: false, reason: 'circular', trace: [...seen] };
	if (!rawValue) return { ok: false, reason: 'invalid' };

	let value = rawValue.trim();

	// If the value contains a var() call, resolve each one in turn.
	// We do this by repeatedly finding the first balanced var(...) and replacing it.
	while (value.includes('var(')) {
		const start = value.indexOf('var(');
		// Find balanced closing paren
		let depthCount = 1;
		let i = start + 4;
		while (i < value.length && depthCount > 0) {
			if (value[i] === '(') depthCount++;
			else if (value[i] === ')') depthCount--;
			if (depthCount === 0) break;
			i++;
		}
		if (depthCount !== 0) return { ok: false, reason: 'invalid', trace: [...seen, value] };

		const inside = value.slice(start + 4, i); // inside the parentheses
		// Split var(--x, fallback) by the first comma at depth 0
		let commaIdx = -1,
			d = 0;
		for (let k = 0; k < inside.length; k++) {
			if (inside[k] === '(') d++;
			else if (inside[k] === ')') d--;
			else if (inside[k] === ',' && d === 0) {
				commaIdx = k;
				break;
			}
		}
		const varName = (commaIdx === -1 ? inside : inside.slice(0, commaIdx)).trim();
		const fallback = commaIdx === -1 ? null : inside.slice(commaIdx + 1).trim();

		if (seen.has(varName)) return { ok: false, reason: 'circular', trace: [...seen, varName] };

		const looked = lookup(chain, varName);
		let resolvedInner;
		if (looked !== undefined) {
			const inner = resolveValue(looked, chain, depth + 1, new Set([...seen, varName]));
			if (!inner.ok) return inner;
			resolvedInner = inner.value;
		} else if (fallback !== null) {
			const inner = resolveValue(fallback, chain, depth + 1, seen);
			if (!inner.ok) return inner;
			resolvedInner = inner.value;
		} else {
			return { ok: false, reason: 'unresolved-var', trace: [...seen, varName] };
		}

		// Replace this var() expression with the resolved value
		value = value.slice(0, start) + resolvedInner + value.slice(i + 1);
	}

	return { ok: true, value: value.trim() };
}

/**
 * Public helper: resolve a token name (e.g. `--form-text`) within a theme context.
 * Returns the same shape as resolveValue.
 */
export function resolveToken(name, chain) {
	const raw = lookup(chain, name);
	if (raw === undefined) return { ok: false, reason: 'token-not-defined', token: name };
	return resolveValue(raw, chain);
}
