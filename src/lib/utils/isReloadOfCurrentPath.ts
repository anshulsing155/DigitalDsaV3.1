import { browser } from '$app/environment';

/**
 * True if the CURRENT document was loaded via a browser reload (F5 / Ctrl+R /
 * pull-to-refresh) AND the reload happened on the CURRENT path.
 *
 * Pitfall #42: `performance.getEntriesByType('navigation')[0]` is the document
 * navigation entry — created when the tab first loaded a document and frozen
 * thereafter. SvelteKit's client-side router does NOT push new navigation
 * entries; it mutates `window.location` and re-runs the matched route's
 * components. So `navEntry.type === 'reload'` answers the question
 * *"was the original document load a reload?"*, not *"is this mount the
 * result of a reload?"*.
 *
 * Comparing the entry's `name` (the URL frozen at load time) with the live
 * `window.location.pathname` distinguishes "F5'd on this page" from "F5'd
 * elsewhere in this tab, then client-navigated here".
 *
 * Returns false in SSR (no `window`/`performance`) so callers don't need to
 * guard separately.
 */
export function isReloadOfCurrentPath(): boolean {
	if (!browser) return false;
	const navEntries = performance.getEntriesByType(
		'navigation'
	) as PerformanceNavigationTiming[];
	const navEntry = navEntries[0];
	if (!navEntry || navEntry.type !== 'reload') return false;
	try {
		const entryPath = new URL(navEntry.name).pathname;
		return entryPath === window.location.pathname;
	} catch {
		return false;
	}
}
