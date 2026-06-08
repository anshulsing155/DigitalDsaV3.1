/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: dashboard.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/dashboard.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/dashboard.ts src/lib/stores/dashboard.ts
 * To verify no imports: grep -r "from.*stores/dashboard\.ts" src/
 */

/**
 * Dashboard store — backward-compatible bridge
 * ══════════════════════════════════════════════════════════════════
 * Re-exports from the canonical runes state in dashboard.svelte.ts.
 * ══════════════════════════════════════════════════════════════════
 */

export { dashboardState } from './dashboard.svelte';

// Legacy alias
import { dashboardState } from './dashboard.svelte';
export const dashboardSampleDataVisible = dashboardState;
