/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: theme.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/theme.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/theme.ts src/lib/stores/theme.ts
 * To verify no imports: grep -r "from.*stores/theme\.ts" src/
 */

/**
 * Theme store — backward-compatible bridge
 * ══════════════════════════════════════════════════════════════════
 * Re-exports from the canonical runes state in theme.svelte.ts.
 * ══════════════════════════════════════════════════════════════════
 */

export type { ThemeMode, ResolvedTheme } from './theme.svelte';
export { themeState } from './theme.svelte';

// Legacy alias for backward compatibility
import { themeState } from './theme.svelte';
export const themeStore = themeState;
