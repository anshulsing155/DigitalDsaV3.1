/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: emailVerificationContext.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/emailVerificationContext.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/emailVerificationContext.ts src/lib/stores/emailVerificationContext.ts
 * To verify no imports: grep -r "from.*stores/emailVerificationContext\.ts" src/
 */

/**
 * BRIDGE FILE — Re-exports from emailVerificationContext.svelte.ts
 * This file exists for backward compatibility during the Svelte 5 migration.
 * New code should import from '$lib/stores/emailVerificationContext.svelte' directly.
 */
export { emailVerificationState } from './emailVerificationContext.svelte';
