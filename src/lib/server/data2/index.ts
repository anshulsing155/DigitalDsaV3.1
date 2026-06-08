/**
 * DATA-2 — barrel exports.
 *
 * Foundation slice. Future slices (write endpoint, list endpoint,
 * revoke endpoint, eligibility query, public self-revoke, grace-period
 * sweep) plug additional exports in here as they land.
 */

export {
	CONSENT_TEMPLATE_VERSIONS,
	CONSENT_MAX_AGE_DAYS,
	findConsentTemplate,
	validateConsentGates
} from './consentTemplates.js';
export type { ConsentTemplateInfo } from './consentTemplates.js';

export { generateRevocationToken, verifyRevocationToken } from './revocationToken.js';
export type { RevocationTokenInputs } from './revocationToken.js';

export { mobileHashForToken } from './mobileHash.js';

export { buildVaultEntry } from './buildVaultEntry.js';
export type { BuildVaultInput, BuildVaultResult } from './buildVaultEntry.js';

export {
	findEligibleCandidates,
	BT_FLOOR_BPS,
	MAX_CANDIDATES
} from './eligibilityQuery.js';
export type { EligibilityInput } from './eligibilityQuery.js';

export { runGracePeriodSweep } from './gracePeriodSweep.js';
export type { SweepDeps, SweepResult } from './gracePeriodSweep.js';

export type {
	OutreachVaultEntry,
	ConsentRevocationLogEntry,
	ConsentDocRef,
	ConsentStatus,
	ConsentGateResult,
	RevocationActor,
	VaultLoanType
} from './types.js';
