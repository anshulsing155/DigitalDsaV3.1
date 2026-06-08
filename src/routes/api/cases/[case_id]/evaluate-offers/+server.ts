/**
 * POST  /api/cases/[case_id]/evaluate-offers  —  Phase 2 of the 2-phase submit flow
 * ════════════════════════════════════════════════════════════════════════════
 * Runs the rule engine against a previously-persisted FormSnapshot and
 * writes a LenderResultsSnapshot. Phase 1 (/api/evaluate-and-persist) has
 * already validated + persisted the case; this endpoint exists so the
 * heavy rule-engine work runs in its own 10s function budget.
 *
 * SECURITY INVARIANTS (these are mandatory mitigations per the security
 * review of the 2-phase split):
 *
 *   1. The caseId is taken FROM THE URL ONLY. No request body. The DSA
 *      cannot supply a payload to fuzz the rule engine — they can only
 *      ask "evaluate the snapshot I already submitted under case X."
 *
 *   2. verifyCaseOwnership is called before any work — only the DSA who
 *      owns the case (or admin) can trigger evaluation.
 *
 *   3. Idempotent: if a LenderResultsSnapshot already exists whose
 *      `source_form_snapshot_version` matches the case's current
 *      `form_snapshot_version`, the cached results are returned. The
 *      engine runs ONCE per snapshot version, not per request. This
 *      defeats the timing-oracle / fuzzing attack on repeat calls.
 *
 *   4. Phase 2 refuses to run for `quota_blocked` cases. Those enter the
 *      buffer with FormSnapshot only; offers compute later via the
 *      auto-unblock cron (see /api/cron/process-unblocked-cases —
 *      archived per Pitfall #63 — the inline path now lives in
 *      recomputeOffersForUnblockedCase).
 *
 * Auth: DSA + Admin
 * Rate limit: 10 evals/min per user (skipped in dev)
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import type { Config } from '@sveltejs/adapter-vercel';
import { dev } from '$app/environment';

export const config: Config = {
	maxDuration: 60
};

import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine.js';
import { FormSnapshots, LenderResultsSnapshots } from '$lib/database/mongo.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership
} from '$lib/server/caseHelpers.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/snapshotCrypto.js';
import {
	_buildPayloadFromFormState,
	persistResults,
	FORM_STATE_RELATIONSHIPS_KEY
} from '$lib/server/evaluateAndPersistShared.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';

export const POST: RequestHandler = async ({ params, locals, getClientAddress }) => {
	const tStart = Date.now();
	const caseId = params.case_id;

	if (!caseId) {
		return apiError('case_id is required', 400);
	}

	// 1. Auth
	const denied = requireRoleApi(locals, ['dsa', 'admin']);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// 2. Rate limit (skip in dev)
	if (!dev) {
		const userId = locals.user!.id;
		const ip = getClientAddress();
		const limited = await rateLimit(ip, {
			maxRequests: 10,
			windowMs: 60_000,
			identifier: `evaluate-offers-${userId}`
		});
		if (limited) {
			return apiError('Rate limit exceeded. Please try again later.', 429);
		}
	}

	try {
		// 3. Resolve DSA + verify case ownership
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}
		const dsaId = dsaResult.dsaId;

		const ownership = await verifyCaseOwnership(caseId, dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}
		const caseDoc = ownership.caseDoc;

		// 4. Refuse to run for quota-blocked cases. Offers for those compute
		// later via the auto-unblock path (recomputeOffersForUnblockedCase).
		if (caseDoc.stage === 'quota_blocked') {
			return apiError(
				'This case is in the quota-blocked buffer. Offers compute automatically when your quota refreshes or you upgrade.',
				400
			);
		}

		// 5+6. IDEMPOTENCY cache-check + FormSnapshot load (parallelized).
		//
		// F3 (2026-06-05): these two reads are independent — the cache check
		// is keyed by (case_id, source_form_snapshot_version) on
		// LenderResultsSnapshots, and the snapshot load is keyed by (case_id,
		// sort by version) on FormSnapshots. Issued in parallel via
		// Promise.all so the common path (cache miss → engine run) saves one
		// round-trip's worth of wall-clock. On cache hit (rare — only repeat
		// polls / retries) we discard the speculative snapshot load; the
		// extra read is harmless and cheap (indexed, projection-less here
		// because the cache-hit path doesn't need snapshot data).
		//
		// The idempotency contract is unchanged: the engine still runs
		// EXACTLY ONCE per source_form_snapshot_version. The fuzzing-oracle
		// mitigation rests on the cache-hit branch returning the cached
		// payload before any work below — we still do that.
		const currentFormVersion = (caseDoc as any).form_snapshot_version as number | undefined;
		const [existing, snapshot] = await Promise.all([
			currentFormVersion
				? LenderResultsSnapshots.findOne(
						{
							case_id: caseId,
							source_form_snapshot_version: currentFormVersion
						},
						{ sort: { version: -1 } }
					)
				: Promise.resolve(null),
			FormSnapshots.findOne({ case_id: caseId }, { sort: { version: -1 } })
		]);

		if (existing) {
			const cached = existing.payload as LenderResultsData;
			logger.info(
				{
					event: 'evaluate_offers.idempotent_cache_hit',
					case_id: caseId,
					form_snapshot_version: currentFormVersion,
					results_snapshot_version: existing.version,
					total_ms: Date.now() - tStart
				},
				'[EvaluateOffers] returning cached results'
			);
			return apiOk({
				caseId,
				offerCount: cached.results?.length ?? 0,
				cached: true
			});
		}

		if (!snapshot) {
			return apiError(
				'No form snapshot found for this case. Submit or re-edit the form to evaluate offers.',
				404
			);
		}
		const tAfterSnapshotLoad = Date.now();

		// 7. Resolve the persisted formState (CSFLE-aware: returns
		// plaintext when CSFLE disabled, decrypts otherwise). Returns null
		// only if both plaintext and decryption fail — defensive guard.
		const formState = await resolveSnapshotPayload(snapshot as any);
		if (!formState) {
			logger.error(
				{ case_id: caseId, snapshot_version: snapshot.version },
				'[EvaluateOffers] FormSnapshot payload unresolvable'
			);
			return apiServerError(new Error('Snapshot payload unresolvable'), 'Evaluation failed');
		}

		// 8. Recover relationships from the persisted formState. Phase 1
		// stashed them under FORM_STATE_RELATIONSHIPS_KEY before snapshot
		// insert; older snapshots may not have them (relationships were
		// optional on the request) → fall through to empty array.
		const relationships = (formState[FORM_STATE_RELATIONSHIPS_KEY] as
			| Array<{ fromId: string; toId: string; relationType: string; category?: string }>
			| undefined) ?? [];

		// 9. Rebuild LoanApplicationPayload + run rule engine.
		const loanType = caseDoc.loan?.type ?? '';
		const cleanPayload = _buildPayloadFromFormState(
			formState as {
				loanData: Record<string, unknown>;
				applicationData: Record<string, unknown>;
				applicants: Record<string, unknown>[];
				[key: string]: unknown;
			},
			loanType,
			relationships
		);

		logger.info(
			{
				loanName: cleanPayload.loanTransaction.loanName,
				loanAmount: cleanPayload.loanTransaction.loanAmount,
				case_id: caseId,
				form_snapshot_version: snapshot.version
			},
			'[EvaluateOffers] Running rule engine (phase 2)'
		);

		const tBeforeEngine = Date.now();
		let results: LenderResultsData;
		try {
			results = await evaluatePayload(cleanPayload);
		} catch (evalErr) {
			return apiServerError(evalErr, 'Evaluation failed');
		}
		const tAfterEngine = Date.now();

		// 10. Persist LenderResultsSnapshot
		const trigger =
			snapshot.version === 1 ? ('initial_submit' as const) : ('form_edit' as const);

		// F2: extract the FormSnapshot's assessment fields (already in
		// memory because we just decrypted it for the engine) so results-data
		// can render the page without a second FormSnapshot load + decrypt.
		// Same shape + filtering logic as results-data's old read site —
		// arrays defensively coerced to string[]. Empty string / empty
		// arrays when fields are absent (legacy form versions, NRI flows,
		// fresh submissions before assessment is filled).
		const rawLenders = (formState as Record<string, unknown>).assessmentLenders;
		const rawReasons = (formState as Record<string, unknown>).rejectionReasons;
		const assessmentCache = {
			assessmentStatus:
				typeof (formState as Record<string, unknown>).assessmentStatus === 'string'
					? ((formState as Record<string, unknown>).assessmentStatus as string)
					: '',
			previouslyRejectedLenders: Array.isArray(rawLenders)
				? rawLenders.filter((l: unknown): l is string => typeof l === 'string')
				: [],
			rejectionReasons: Array.isArray(rawReasons)
				? rawReasons.filter((r: unknown): r is string => typeof r === 'string')
				: []
		};

		await persistResults(
			caseId,
			dsaId,
			results,
			snapshot.version,
			(snapshot as any).payload_hash,
			trigger,
			undefined, // changeSummary — phase 2 doesn't author it
			assessmentCache
		);
		const tDone = Date.now();

		logger.info(
			{
				event: 'evaluate_offers.timing',
				case_id: caseId,
				form_snapshot_version: snapshot.version,
				total_ms: tDone - tStart,
				snapshotLoad_ms: tAfterSnapshotLoad - tStart,
				preEngine_ms: tBeforeEngine - tAfterSnapshotLoad,
				engine_ms: tAfterEngine - tBeforeEngine,
				persist_ms: tDone - tAfterEngine
			},
			'[EvaluateOffers] phase 2 timings'
		);

		return apiOk({
			caseId,
			offerCount: results.results?.length ?? 0,
			cached: false
		});
	} catch (err) {
		return apiServerError(err, 'Evaluation failed');
	}
};
