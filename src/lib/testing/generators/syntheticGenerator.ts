/**
 * Synthetic Profile Generator — backward-compat re-export
 *
 * All logic has moved to variationGenerator.ts (S77f Option A).
 * This file stays as the public entry point so that all existing
 * consumers (`syntheticProfiles.ts`, tests, etc.) need zero changes.
 *
 * See variationGenerator.ts for the full implementation.
 */

export {
	generateAllProfiles,
	EXPECTED_TOTAL,
	type GeneratedProfile
} from './variationGenerator.js';
