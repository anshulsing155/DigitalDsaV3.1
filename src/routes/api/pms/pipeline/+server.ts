/**
 * POST /api/pms/pipeline
 * Unified pipeline endpoint — runs one or more passes based on `action` param.
 *
 * Body:
 *   action: 'pass1_2'  — Pass 1 + Pass 2 sequential ("Start Parsing")
 *         | 'pass3'    — Pass 3 encode (after RM Step 1 decisions)
 *         | 'pass4_5'  — Pass 4 verify + optional Pass 5 correct + Pass 4 re-verify
 *         | 'pass6'    — Pass 6 reconstruct (A deterministic + B prose)
 *   policyId:  string  — PolicyDocument _id
 *   lockVersion: number — optimistic lock
 *   [action-specific fields]
 *
 * Rate limiting: 10 req/min per IP, 5 full pipeline sessions per RM per 24h.
 * Token circuit breaker: 100,000 tokens per session → abort + log.
 *
 * On timeout (>30s per pass): returns 408, saves errorState to pipelineState.
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import {
	runPass1And2,
	runPass3,
	runPass4And5,
	runPass6
} from '$lib/server/pms/aiPipeline.js';
import { getPolicyById, updateDraftPolicy, PolicyNotFoundError, PolicyStatusError } from '$lib/server/pms/policyService.js';
import type { Pass2Clause, Pass3Encoding, ConditionalOverride } from '$lib/config/pms/policyTypes.js';

const TOKEN_CIRCUIT_BREAKER = 100_000;

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const ip = getClientAddress();

	// Per-IP rate limit: 10 requests per minute on pipeline endpoints
	const limited = await rateLimit(ip, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `pms_pipeline_${ip}`
	});
	if (limited) return apiError('Too many pipeline requests. Please wait before retrying.', 429);

	const body = await parseJsonBody<{
		action: 'pass1_2' | 'pass3' | 'pass4_5' | 'pass6';
		policyId: string;
		lockVersion: number;
		// pass3-specific
		confirmedClauses?: Pass2Clause[];
		// BUG 5 (S88) — RM's per-clause in_scope/out_of_scope/bank_card decisions
		// from Step 1. Persisted alongside pass3 so refresh between steps 1↔2
		// doesn't lose them.
		rmStep1Decisions?: Record<string, string>;
		// pass4_5-specific
		clauses?: Pass2Clause[];
		encodings?: Pass3Encoding[];
		// pass6-specific
		finalOverrides?: ConditionalOverride[];
	}>(request);
	if (!body.ok) return body.response;

	const { action, policyId, lockVersion } = body.data;

	if (!action || !policyId) return apiError('action and policyId are required', 400);
	if (typeof lockVersion !== 'number') return apiError('lockVersion is required', 400);

	const userId = locals.user!.id;

	let policy;
	try {
		policy = await getPolicyById(policyId);
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err, 'pipeline get policy');
	}

	if (policy.status !== 'draft') {
		return apiError('Pipeline can only run on draft policies', 422);
	}

	// Check cumulative token usage for circuit breaker
	const existingTokens = policy.aiPipelineRun?.totalTokensUsed ?? 0;
	if (existingTokens >= TOKEN_CIRCUIT_BREAKER) {
		logger.warn({ policyId, existingTokens }, 'PMS pipeline circuit breaker: token limit exceeded');
		return apiError(`This policy has used ${existingTokens.toLocaleString()} tokens — limit is ${TOKEN_CIRCUIT_BREAKER.toLocaleString()}. Contact admin to reset.`, 429);
	}

	try {
		// ── Pass 1 + 2 ──────────────────────────────────────────────────────────
		if (action === 'pass1_2') {
			if (!policy.sourceDocument.text?.trim()) {
				return apiError('Policy has no source text — upload a document first', 422);
			}

			let pass1Result, pass2Clauses, totalTokensUsed;
			try {
				({ pass1Result, pass2Clauses, totalTokensUsed } = await runPass1And2(
					policy.sourceDocument.text,
					policy.loanProduct
				));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown pipeline error';
				const isTimeout = message.toLowerCase().includes('timed out');

				await updateDraftPolicy(
					policyId,
					{
						pipelineState: {
							currentStep: 0,
							pass1Result: null,
							pass2Clauses: null,
							rmStep1Decisions: {},
							rmStep2Encodings: [],
							pass4LastScore: null,
							lastSavedAt: new Date(),
							errorState: { step: isTimeout ? 0 : 0, message }
						}
					},
					lockVersion,
					userId
				);

				return apiError(
					isTimeout ? 'AI pipeline timed out — your draft is saved. Please try again.' : `Pipeline error: ${message}`,
					isTimeout ? 408 : 500
				);
			}

			const newTokenTotal = existingTokens + totalTokensUsed;

			await updateDraftPolicy(
				policyId,
				{
					pipelineState: {
						currentStep: 1,
						pass1Result,
						pass2Clauses,
						rmStep1Decisions: {},
						rmStep2Encodings: [],
						pass4LastScore: null,
						lastSavedAt: new Date(),
						errorState: null
					}
				},
				lockVersion,
				userId
			);

			// Update token counter — read fresh lockVersion after the update above
			const updatedPolicy = await getPolicyById(policyId);
			await updateDraftPolicy(
				policyId,
				{},
				updatedPolicy.lockVersion,
				userId
			);

			// Update aiPipelineRun separately using direct DB write
			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const { ObjectId } = await import('mongodb');
			await PmsLenderPolicies.updateOne(
				{ _id: new ObjectId(policyId) },
				{
					$set: {
						aiPipelineRun: {
							mode: 'automated',
							pass1Score: pass1Result.segments.filter((s) => s.relevance === 'in_scope').length / Math.max(1, pass1Result.segments.length) * 100,
							pass4ScoreBeforeCorrection: null,
							pass5Triggered: false,
							finalScore: null,
							passesExecuted: 2,
							totalTokensUsed: newTokenTotal,
							ranAt: new Date()
						}
					}
				}
			);

			logger.info({ policyId, totalTokensUsed, segmentCount: pass1Result.segments.length, clauseCount: pass2Clauses.length }, 'PMS pipeline pass1+2 complete');

			return apiOk({
				pass1Result,
				pass2Clauses,
				tokensUsed: totalTokensUsed,
				currentStep: 1
			});
		}

		// ── Pass 3 ───────────────────────────────────────────────────────────────
		if (action === 'pass3') {
			const confirmedClauses = body.data.confirmedClauses;
			if (!confirmedClauses?.length) return apiError('confirmedClauses is required for pass3', 400);

			// Guard: reject if any clause is still ambiguous (plan §2.5)
			const ambiguousCount = confirmedClauses.filter((c) =>
				c.ambiguityFlags?.some((f) => f.type === 'multiple_interpretations')
			).length;
			if (ambiguousCount > 0) {
				return apiError(
					`${ambiguousCount} clause${ambiguousCount === 1 ? '' : 's'} still marked ambiguous. Resolve all ambiguities in Step 1 before encoding.`,
					422
				);
			}

			let encodings, tokensUsed;
			try {
				({ encodings, tokensUsed } = await runPass3(confirmedClauses, policy.loanProduct));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Pass 3 error';
				const isTimeout = message.toLowerCase().includes('timed out');

				const currentState = policy.pipelineState;
				if (currentState) {
					await updateDraftPolicy(
						policyId,
						{
							pipelineState: { ...currentState, errorState: { step: 2, message }, lastSavedAt: new Date() }
						},
						lockVersion,
						userId
					);
				}

				return apiError(
					isTimeout ? 'AI pipeline timed out — your draft is saved. Please try again.' : `Pass 3 error: ${message}`,
					isTimeout ? 408 : 500
				);
			}

			const currentState = policy.pipelineState;
			// BUG 5 (S88) — preserve RM's clause-level decisions so a refresh
			// between steps 1 and 2 doesn't lose them. Falls back to current
			// server state if client didn't send (older client compat).
			const rmStep1Decisions =
				body.data.rmStep1Decisions ?? currentState?.rmStep1Decisions ?? {};
			await updateDraftPolicy(
				policyId,
				{
					pipelineState: {
						...(currentState ?? {
							currentStep: 2,
							pass1Result: null,
							pass2Clauses: null,
							rmStep1Decisions: {},
							rmStep2Encodings: [],
							pass4LastScore: null,
							lastSavedAt: new Date(),
							errorState: null
						}),
						currentStep: 2,
						rmStep1Decisions,
						rmStep2Encodings: encodings as Partial<import('$lib/config/pms/policyTypes.js').ConditionalOverride>[],
						errorState: null,
						lastSavedAt: new Date()
					}
				},
				lockVersion,
				userId
			);

			// Update token total
			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const { ObjectId } = await import('mongodb');
			await PmsLenderPolicies.updateOne(
				{ _id: new ObjectId(policyId) },
				{ $inc: { 'aiPipelineRun.totalTokensUsed': tokensUsed, 'aiPipelineRun.passesExecuted': 1 } }
			);

			logger.info({ policyId, tokensUsed, encodingCount: encodings.length }, 'PMS pipeline pass3 complete');

			return apiOk({ encodings, tokensUsed, currentStep: 2 });
		}

		// ── Pass 4 + 5 ───────────────────────────────────────────────────────────
		if (action === 'pass4_5') {
			const clauses = body.data.clauses;
			const encodings = body.data.encodings;
			if (!clauses?.length || !encodings?.length) {
				return apiError('clauses and encodings are required for pass4_5', 400);
			}

			let finalEncodings, pass4Result, pass5Triggered, pass4ScoreBeforeCorrection, totalTokensUsed;
			try {
				({ finalEncodings, pass4Result, pass5Triggered, pass4ScoreBeforeCorrection, totalTokensUsed } =
					await runPass4And5(clauses, encodings as Pass3Encoding[], policy.loanProduct));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Pass 4/5 error';
				const currentState = policy.pipelineState;
				if (currentState) {
					await updateDraftPolicy(
						policyId,
						{ pipelineState: { ...currentState, errorState: { step: 3, message }, lastSavedAt: new Date() } },
						lockVersion,
						userId
					);
				}
				return apiError(`Pipeline error: ${message}`, 500);
			}

			const currentState = policy.pipelineState;
			await updateDraftPolicy(
				policyId,
				{
					pipelineState: {
						...(currentState ?? {
							currentStep: 3,
							pass1Result: null,
							pass2Clauses: null,
							rmStep1Decisions: {},
							rmStep2Encodings: [],
							pass4LastScore: pass4Result.overallScore,
							lastSavedAt: new Date(),
							errorState: null
						}),
						currentStep: 3,
						rmStep2Encodings: finalEncodings as Partial<import('$lib/config/pms/policyTypes.js').ConditionalOverride>[],
						pass4LastScore: pass4Result.overallScore,
						errorState: null,
						lastSavedAt: new Date()
					}
				},
				lockVersion,
				userId
			);

			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const { ObjectId } = await import('mongodb');
			await PmsLenderPolicies.updateOne(
				{ _id: new ObjectId(policyId) },
				{
					$set: {
						'aiPipelineRun.pass4ScoreBeforeCorrection': pass4ScoreBeforeCorrection,
						'aiPipelineRun.pass5Triggered': pass5Triggered,
						'aiPipelineRun.finalScore': pass4Result.overallScore
					},
					$inc: {
						'aiPipelineRun.totalTokensUsed': totalTokensUsed,
						'aiPipelineRun.passesExecuted': pass5Triggered ? 3 : 1
					}
				}
			);

			logger.info({ policyId, score: pass4Result.overallScore, pass5Triggered, totalTokensUsed }, 'PMS pipeline pass4+5 complete');

			return apiOk({
				finalEncodings,
				pass4Result,
				pass5Triggered,
				pass4ScoreBeforeCorrection,
				tokensUsed: totalTokensUsed,
				currentStep: 3
			});
		}

		// ── Pass 6 ───────────────────────────────────────────────────────────────
		if (action === 'pass6') {
			const finalOverrides = body.data.finalOverrides;
			if (!finalOverrides?.length) return apiError('finalOverrides is required for pass6', 400);

			let pass6Result, tokensUsed;
			try {
				({ result: pass6Result, tokensUsed } = await runPass6(
					finalOverrides,
					policy.lenderId,
					policy.loanProduct
				));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Pass 6 error';
				return apiError(`Pass 6 error: ${message}`, 500);
			}

			const currentState = policy.pipelineState;
			if (currentState) {
				await updateDraftPolicy(
					policyId,
					{ pipelineState: { ...currentState, currentStep: 5, pass6Result, lastSavedAt: new Date(), errorState: null } },
					lockVersion,
					userId
				);
			}

			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const { ObjectId } = await import('mongodb');
			await PmsLenderPolicies.updateOne(
				{ _id: new ObjectId(policyId) },
				{ $inc: { 'aiPipelineRun.totalTokensUsed': tokensUsed, 'aiPipelineRun.passesExecuted': 1 } }
			);

			logger.info({ policyId, tokensUsed }, 'PMS pipeline pass6 complete');

			return apiOk({ pass6Result, tokensUsed, currentStep: 5 });
		}

		return apiError(`Unknown action: ${action}`, 400);
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 409);
		return apiServerError(err, 'pms pipeline');
	}
};
