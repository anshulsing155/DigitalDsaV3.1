/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: numberToWords.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/numberToWords.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/numberToWords.ts src/lib/stores/numberToWords.ts
 * To verify no imports: grep -r "from.*stores/numberToWords\.ts" src/
 */

/**
 * BRIDGE FILE — Re-exports from numberToWords.svelte.ts
 * This file exists for backward compatibility during the Svelte 5 migration.
 * New code should import from '$lib/stores/numberToWords.svelte' directly.
 */
export { numberToWordsState } from './numberToWords.svelte';
