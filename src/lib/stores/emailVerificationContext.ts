/**
 * BRIDGE FILE — Re-exports emailVerificationContext.svelte.ts
 *
 * Exists only for backward compatibility with archived code.
 * New code should import from '$lib/stores/emailVerificationContext.svelte'
 *
 * This file exists to prevent type errors in src/_archived/ routes that
 * still import from this location.
 *
 * @deprecated Use emailVerificationState from '$lib/stores/emailVerificationContext.svelte' instead.
 */

export { emailVerificationState } from './emailVerificationContext.svelte';
