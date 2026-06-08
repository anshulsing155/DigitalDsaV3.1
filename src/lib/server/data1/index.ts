/**
 * DATA-1 — barrel exports.
 *
 * The vault's write path (Slice 3) and routing query (Slice 5) import from
 * here. Direct deep-imports into the individual files work too, but the
 * barrel gives one canonical surface for the module — useful if a future
 * refactor needs to swap an implementation.
 */

export { localityBucket } from './localityBucket.js';
export { priceBucket, loanAmountBucket } from './priceBucket.js';
export { closedQuarterBucket } from './closedQuarterBucket.js';
export { buildVaultEntry, isSecuredLoanV1 } from './bucketVaultEntry.js';
export type { BuildVaultResult } from './bucketVaultEntry.js';
export { findConsentDocId, DATA_USAGE_CONSENT_DOC_NAME } from './consentLookup.js';
export {
	recencyScore,
	quarterFromDate,
	quarterDelta
} from './recencyScore.js';
export {
	priceBand,
	kAnonymityThreshold,
	LUXURY_THRESHOLD,
	K_THRESHOLD_STANDARD,
	K_THRESHOLD_LUXURY
} from './priceBand.js';
export type { PriceBand } from './priceBand.js';
export { rankCandidates } from './routingRanker.js';
export { findLeadCandidates } from './leadRoutingQuery.js';
export type { RoutingInput, RoutingDeps } from './leadRoutingQuery.js';
export type {
	LeadAttributionVaultEntry,
	LeadRoutingCandidate,
	ConsentWithdrawalLogEntry
} from './types.js';
