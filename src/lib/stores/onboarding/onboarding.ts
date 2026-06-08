/**
 * BRIDGE FILE — Re-exports from onboarding.svelte.ts
 * This file exists for backward compatibility during the Svelte 5 migration.
 * New code should import from '$lib/stores/onboarding/onboarding.svelte' directly.
 *
 * Types are re-exported so .ts files that only import types continue to work.
 */
export { onboardingState } from './onboarding.svelte';
export type {
	CommonFields,
	DsaStep2Fields,
	RmStep2Fields,
	PcStep2Fields,
	OnboardingData,
	OnboardingErrors,
	OnboardingStep
} from './onboarding.svelte';
