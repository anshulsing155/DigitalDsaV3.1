/**
 * DATA-4 — analytics warehouse barrel exports.
 *
 * Slice 1 (foundation): the `person_id` one-way bridge. Future slices
 * (collection registration, de-identification helpers, the
 * `buildAnalyticsCase` orchestrator, the ETL job) plug additional exports
 * in here as they land.
 */

export { personIdFromPanHash, PERSON_ID_LENGTH_HEX } from './personIdHmac.js';

export { computeAge, ageBracket } from './ageBracket.js';
export { incomeBracket } from './incomeBracket.js';
export { industryLookup } from './industryLookup.js';
export { regionTier } from './regionTier.js';

export { buildAnalyticsCase } from './buildAnalyticsCase.js';
export type { BuildAnalyticsCaseInput } from './buildAnalyticsCase.js';

export { runAnalyticsEtl } from './etlJob.js';
export type { AnalyticsEtlDeps, AnalyticsEtlResult, EtlSnapshot } from './etlJob.js';

export type {
	AnalyticsCaseDoc,
	AnalyticsFinalStage,
	AnalyticsRecommendedBank,
	AnalyticsEtlRunDoc
} from './types.js';
