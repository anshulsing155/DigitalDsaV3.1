/**
 * POST  /api/evaluate-and-persist  —  Phase 1 of the 2-phase submit flow
 * ======================================================================
 * Validates the submission, checks subscription + quota gates, builds the
 * clean payload, creates the case + first FormSnapshot, and returns the
 * caseId. **Does NOT run the rule engine** — that lives in phase 2 at
 * `POST /api/cases/[case_id]/evaluate-offers` so neither phase individually
 * exceeds Vercel's 10s Hobby function ceiling.
 *
 * Architecture (2026-06-03 split per Option 1):
 *
 *   Client                Phase 1                       Phase 2
 *   ──────                ───────                       ───────
 *   POST formState  →     validate + persist     →      return caseId
 *                                                       ↓
 *                                                       Client gets caseId,
 *                                                       fires POST
 *                                                       /api/cases/X/
 *                                                       evaluate-offers
 *                                                                  ↓
 *                                                                  rule
 *                                                                  engine
 *                                                                  +
 *                                                                  persist
 *                                                                  results
 *                                                                  ↓
 *                                                       return { offerCount }
 *
 * Phase 1 budget (cold): ~1-3s — well under Hobby's 10s cap.
 * Phase 2 budget (cold): ~4-6s — also well under (phase 1 warmed the pool).
 *
 * QBC quota gate stays in phase 1 by design — the 402 quota_buffer_available
 * + quota_fully_exhausted responses must fire BEFORE we persist anything.
 *
 * Auth: DSA + Admin
 * Rate limit: 10 evals/min per user (skipped in dev)
 * ======================================================================
 */

import type { RequestHandler } from './$types';
import type { Config } from '@sveltejs/adapter-vercel';
import { dev } from '$app/environment';

/**
 * Vercel function configuration. `maxDuration: 60` lifts the function
 * timeout ceiling to Pro's 60s cap (Hobby silently rounds down to 10s).
 * After the 2-phase split this is belt-and-suspenders — phase 1's
 * cold-path is ~1-3s, comfortably under any plan's ceiling.
 */
export const config: Config = {
	maxDuration: 60
};

import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { buildCaseLabel, classifyApplicantProfile, resolveActiveAnswers } from '$lib/utils/caseLabel.js';
import { loanTypeLabel } from '$lib/config/loanTypeLabels.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';
import { Cases } from '$lib/database/mongo.js';
import { PLANS, recommendPlan, type PlanId } from '$lib/config/billing.js';
import { resolveActivePlanId } from '$lib/server/billing/planResolver.js';
import {
	resolveEffectiveDsaId,
	generateCaseId,
	createTimelineEvent,
	verifyCaseOwnership
} from '$lib/server/caseHelpers.js';
import {
	resolveDsaEmailRecipient,
	sendBufferSaveEmail
} from '$lib/server/billing/quotaBlockedEmails.js';
import type { Case } from '$lib/types/case.js';
import { ObjectId } from 'mongodb';
import {
	_buildPayloadFromFormState,
	createFormSnapshot,
	FORM_STATE_RELATIONSHIPS_KEY
} from '$lib/server/evaluateAndPersistShared.js';

// Re-export for back-compat with existing imports (recomputeOffersForUnblockedCase,
// evaluateAndPersistFilter.test.ts). The canonical home is now the shared file.
export { _buildPayloadFromFormState };

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

interface EvaluateRequest {
	loanType: string;
	loanDisplayName: string;
	formState: {
		loanData: Record<string, unknown>;
		applicationData: Record<string, unknown>;
		applicants: Record<string, unknown>[];
		[key: string]: unknown;
	};
	relationships?: Array<{
		fromId: string;
		toId: string;
		relationType: string;
		category?: string;
	}>;
	editCaseId?: string;
	/**
	 * Quota-blocked-cases (S1): when the DSA hit their plan's caseLimit and
	 * has buffer space, the first call returns 402 `quota_buffer_available`
	 * with a prompt. The client renders Save/No. If the DSA picks Save, the
	 * client re-POSTs with `save_to_buffer: true` to opt into the buffer
	 * save path. The handler then persists FormSnapshot + Case at
	 * stage='quota_blocked', skipping the rule engine (no LenderResultsSnapshot,
	 * no compute burn). See docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §5.1.
	 */
	save_to_buffer?: boolean;
	/**
	 * Client-generated UUID per submission attempt. Both calls of the
	 * silent auto-retry in /evaluating's handleFreshSubmission share the
	 * same value — we look up an existing case with the same
	 * (dsa_id, idempotency_key) within a 10-minute window and return it
	 * instead of creating a duplicate. Only applies to new submissions
	 * (no editCaseId).
	 */
	idempotency_key?: string;
}

// Lookback window for idempotency dedupe. A submission with the same key
// from the same DSA within this window is treated as a retry of an earlier
// successful insert. After this window the key is considered stale and a
// fresh case is created (rare in practice — the silent auto-retry fires
// within ~2 seconds, well inside any reasonable window).
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

function validateRequest(
	body: unknown
): { valid: true; data: EvaluateRequest } | { valid: false; error: string } {
	if (!body || typeof body !== 'object') {
		return { valid: false, error: 'Request body must be a JSON object' };
	}

	const obj = body as Record<string, unknown>;

	if (typeof obj.loanType !== 'string' || !obj.loanType.trim()) {
		return { valid: false, error: 'loanType must be a non-empty string' };
	}

	if (!obj.formState || typeof obj.formState !== 'object') {
		return { valid: false, error: 'formState is required and must be an object' };
	}

	const fs = obj.formState as Record<string, unknown>;

	if (!fs.applicants || !Array.isArray(fs.applicants) || fs.applicants.length === 0) {
		return { valid: false, error: 'formState.applicants must be a non-empty array' };
	}

	return { valid: true, data: body as EvaluateRequest };
}

// ============================================================================
// ENDPOINT
// ============================================================================

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const tStart = Date.now();
	const timings: Record<string, number> = {};
	let lastMark = tStart;
	const mark = (label: string) => {
		const now = Date.now();
		timings[label] = now - lastMark;
		lastMark = now;
	};

	// 1. Auth guard
	const denied = requireRoleApi(locals, ['dsa', 'admin']);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	mark('auth');

	// 1b. Subscription gate — block evaluations when no active recurring sub.
	// Reused at the quota gate via preResolvedActivePlan (avoids a duplicate
	// BillingSubscriptions round-trip in the common authenticated path).
	let preResolvedActivePlan: Awaited<ReturnType<typeof resolveActivePlanId>> = null;
	if (!dev && locals.user?.role === 'dsa') {
		try {
			preResolvedActivePlan = await resolveActivePlanId(new ObjectId(locals.user!.id));
			mark('subscriptionGate');
			if (!preResolvedActivePlan) {
				return apiError(
					'Subscription required. Please subscribe to a plan to run evaluations.',
					402
				);
			}
		} catch (subscriptionCheckError) {
			logger.error(
				{ err: subscriptionCheckError, userId: locals.user!.id },
				'Subscription check failed — denying evaluation for safety'
			);
			return apiServerError(
				subscriptionCheckError,
				'Unable to verify subscription. Please try again.'
			);
		}
	}

	// 2. Rate limit (skip in dev mode)
	if (!dev) {
		const userId = locals.user!.id;
		const ip = getClientAddress();
		const limited = await rateLimit(ip, {
			maxRequests: 10,
			windowMs: 60_000,
			identifier: `eval-persist-${userId}`
		});
		if (limited) {
			return apiError('Rate limit exceeded. Please try again later.', 429);
		}
	}

	// 3. Parse body
	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// 4. Validate
		const validation = validateRequest(jsonParsed.data);
		if (!validation.valid) {
			return apiError(validation.error, 400);
		}
		const req = validation.data;

		// 5. Resolve DSA
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}
		const dsaId = dsaResult.dsaId;

		// 5a. Idempotency check — only on new submissions (not edits) when
		// the client supplied an idempotency_key. If we find an existing
		// case for this (dsa_id, idempotency_key) inside the 10-min window,
		// return THAT case's data instead of creating a duplicate.
		//
		// This closes the silent-auto-retry duplicate-case window: if the
		// first attempt's function actually completed (case inserted) but
		// the gateway returned 504 to the client, the retry hits this
		// dedupe and returns the original case. No second case is created.
		if (!req.editCaseId && req.idempotency_key && req.idempotency_key.length > 0) {
			try {
				const sinceCutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
				const existing = await Cases.findOne({
					dsa_id: dsaId,
					idempotency_key: req.idempotency_key,
					created_at: { $gte: sinceCutoff }
				});
				if (existing) {
					logger.info(
						{
							event: 'evaluate_and_persist.idempotent_replay',
							case_id: existing.case_id,
							idempotency_key: req.idempotency_key,
							original_created_at: existing.created_at
						},
						'[EvaluateAndPersist] idempotent replay — returning existing case'
					);
					return apiOk({
						caseId: existing.case_id,
						amountRequested: existing.loan?.amount_required,
						tenureYears: existing.loan?.tenure_years,
						needs_evaluation: existing.stage !== 'quota_blocked',
						...(existing.stage === 'quota_blocked' && { quota_blocked: true as const }),
						idempotent_replay: true as const
					});
				}
			} catch (idempErr) {
				// Non-fatal: a DB blip here would block the legitimate
				// first-time submission. Better to risk a duplicate (rare)
				// than to deny the user's submit.
				logger.warn(
					{ err: idempErr, dsa_id: dsaId.toString() },
					'[EvaluateAndPersist] idempotency lookup failed — proceeding without dedupe'
				);
			}
		}

		// 5b. Case limit gate — quota-blocked-cases model (QBC spec §5.1).
		// MUST stay in phase 1 — the 402 quota_buffer_available + quota_fully_
		// exhausted responses block persistence; they can't move to phase 2.
		let caseLimitWarning: {
			plan_limit: number;
			post_create_count: number;
			usage_percent: number;
			warn_level: 'approaching';
			plan_name: string;
			recommended_plan: PlanId;
		} | null = null;
		let isBlockedCase = false;
		let bufferEmailContext: { planId: PlanId; nextCycleAtIso: string } | null = null;

		if (!dev && !req.editCaseId && locals.user?.role === 'dsa') {
			try {
				const activePlan =
					preResolvedActivePlan && dsaId.equals(new ObjectId(locals.user!.id))
						? preResolvedActivePlan
						: await resolveActivePlanId(dsaId);
				const planId = activePlan?.plan_id ?? 'basic';
				const planLimit = PLANS[planId].caseLimit;
				const saveBuffer = PLANS[planId].saveBuffer;
				const nextCycleAtIso = activePlan?.next_charge_at?.toISOString() ?? null;

				const [activeCaseCount, blockedCount] = await Promise.all([
					Cases.countDocuments({
						dsa_id: dsaId,
						is_archived: { $ne: true },
						stage: { $ne: 'quota_blocked' }
					}),
					Cases.countDocuments({
						dsa_id: dsaId,
						stage: 'quota_blocked'
					})
				]);
				mark('quotaCheck');

				const isExhausted = planLimit !== Infinity && activeCaseCount >= planLimit;

				if (isExhausted) {
					const bufferRemaining = saveBuffer - blockedCount;
					const recommended = recommendPlan(activeCaseCount + 1);
					const recommendedLimit =
						PLANS[recommended].caseLimit === Infinity ? null : PLANS[recommended].caseLimit;

					if (bufferRemaining <= 0) {
						return apiStructuredError(
							`You're at your monthly limit AND your save buffer is full (${blockedCount} of ${saveBuffer} cases waiting). Upgrade to ${PLANS[recommended].name} or wait for your next billing cycle.`,
							{
								code: 'quota_fully_exhausted',
								upgrade: {
									plan_id: planId,
									plan_name: PLANS[planId].name,
									plan_limit: planLimit,
									current_count: activeCaseCount,
									recommended_plan: recommended,
									recommended_plan_name: PLANS[recommended].name,
									recommended_plan_limit: recommendedLimit
								},
								buffer: {
									used: blockedCount,
									capacity: saveBuffer,
									remaining: 0
								},
								next_cycle_at: nextCycleAtIso
							},
							402
						);
					}

					if (!req.save_to_buffer) {
						return apiStructuredError(
							`You're at your monthly limit. You can save this case — it'll process automatically on your next billing cycle, or sooner if you upgrade. ${bufferRemaining} of ${saveBuffer} save slots remaining.`,
							{
								code: 'quota_buffer_available',
								upgrade: {
									plan_id: planId,
									plan_name: PLANS[planId].name,
									plan_limit: planLimit,
									current_count: activeCaseCount,
									recommended_plan: recommended,
									recommended_plan_name: PLANS[recommended].name,
									recommended_plan_limit: recommendedLimit
								},
								buffer: {
									used: blockedCount,
									capacity: saveBuffer,
									remaining: bufferRemaining
								},
								next_cycle_at: nextCycleAtIso
							},
							402
						);
					}

					isBlockedCase = true;
					if (nextCycleAtIso) {
						bufferEmailContext = { planId, nextCycleAtIso };
					}
					logger.info(
						{
							event: 'quota_blocked.buffer_save',
							plan_id: planId,
							buffer_used_after: blockedCount + 1,
							buffer_capacity: saveBuffer
						},
						'[EvaluateAndPersist] Saving case to quota-blocked buffer'
					);
				} else if (planLimit !== Infinity) {
					const postCreateCount = activeCaseCount + 1;
					const usagePercent = Math.round((postCreateCount / planLimit) * 100);

					if (postCreateCount >= Math.ceil(planLimit * 0.8)) {
						caseLimitWarning = {
							plan_limit: planLimit,
							post_create_count: postCreateCount,
							usage_percent: usagePercent,
							warn_level: 'approaching',
							plan_name: PLANS[planId].name,
							recommended_plan: recommendPlan(postCreateCount)
						};
					}
				}
			} catch (limitErr) {
				logger.warn({ err: limitErr, dsaId }, 'Case limit check failed — allowing (non-fatal)');
			}
		}

		// 6. Build clean payload from form state (server-side). Still done in
		// phase 1 so we can return amountRequested + tenureYears in the
		// response (the animation header echoes them) and validate
		// loanAmount before persisting.
		logger.info(
			{ loanType: req.loanType, applicantCount: req.formState.applicants?.length },
			'[EvaluateAndPersist] Building payload (phase 1)'
		);
		let cleanPayload: LoanApplicationPayload;
		try {
			cleanPayload = _buildPayloadFromFormState(
				req.formState,
				req.loanType,
				req.relationships
			);
		} catch (buildErr) {
			return apiServerError(buildErr, 'Evaluation failed');
		}

		// Validate that loanAmount is positive.
		// EXEMPTION: secured loans where the property isn't identified yet
		// legitimately have no loan amount (the affordability back-calculator
		// derives one in phase 2).
		const propertyNotIdentified = cleanPayload.loanTransaction.propertyIdentified === false;
		const missingLoanAmount =
			!cleanPayload.loanTransaction.loanAmount || cleanPayload.loanTransaction.loanAmount <= 0;
		if (missingLoanAmount && !propertyNotIdentified) {
			logger.warn(
				{ loanTransaction: cleanPayload.loanTransaction },
				'[EvaluateAndPersist] loanAmount is 0'
			);
			return apiError(
				'Could not determine loan amount from form data. Please ensure property cost or loan amount is filled.',
				400
			);
		}

		// Stash relationships into formState BEFORE snapshot insertion so phase 2
		// can rebuild the LoanApplicationPayload without ever accepting client
		// input. SECURITY INVARIANT: phase 2 reads relationships from
		// FormSnapshot.payload, never from a request body.
		const persistedFormState: Record<string, unknown> = {
			...req.formState,
			[FORM_STATE_RELATIONSHIPS_KEY]: req.relationships ?? []
		};

		// 7. Create case + snapshot. The rule engine is NOT called here.
		let caseId: string;
		const trigger = req.editCaseId ? ('form_edit' as const) : ('initial_submit' as const);
		const changeSummary = req.editCaseId
			? 'Re-evaluated after form edit'
			: 'Initial form submission';

		if (req.editCaseId) {
			// EDIT MODE: verify ownership, then add a new FormSnapshot version.
			// Phase 2 will pick up the new snapshot version and re-evaluate.
			const ownership = await verifyCaseOwnership(req.editCaseId, dsaId);
			if (!ownership.ok) {
				const status = ownership.error === 'Case not found' ? 404 : 403;
				return apiError(ownership.error, status);
			}
			caseId = req.editCaseId;

			await createFormSnapshot(caseId, dsaId, persistedFormState, 'Form edited by DSA');
		} else {
			// NEW SUBMISSION
			const rawApplicants = req.formState.applicants ?? [];
			const primary = (rawApplicants[0] ?? {}) as Record<string, unknown>;
			const answers = resolveActiveAnswers(req.formState.loanData as Record<string, unknown>);
			const routeCity =
				answers.propertyCityName ?? answers.residenceCityName ?? answers.businessCityName;
			const project = answers.projectNameManual ?? answers.projectNameSelected;
			const caseLabel = buildCaseLabel({
				loanTypeLabel: loanTypeLabel(req.loanType),
				project: project != null ? String(project) : null,
				city: routeCity != null ? String(routeCity) : null,
				profile: classifyApplicantProfile({
					applicantType: typeof primary.applicantType === 'string' ? primary.applicantType : null,
					employmentType:
						typeof primary.employmentType === 'string' ? primary.employmentType : null,
					incomeType:
						typeof primary.primaryIncomeType === 'string' ? primary.primaryIncomeType : null
				})
			});

			caseId = await generateCaseId(req.loanType, dsaId);
			logger.debug(
				{ caseId, dsaId: dsaId.toString() },
				'[EvaluateAndPersist] Generated atomic case ID'
			);
			const now = new Date();

			const entryStage: 'intake' | 'quota_blocked' = isBlockedCase ? 'quota_blocked' : 'intake';
			const newCase: Case = {
				case_id: caseId,
				dsa_id: dsaId,
				label: caseLabel,
				label_is_custom: false,
				loan: {
					type: req.loanType,
					amount_required: cleanPayload.loanTransaction.loanAmount || undefined,
					tenure_years: cleanPayload.loanTransaction.tenureYears || undefined
				},
				stage: entryStage,
				stage_history: [
					{
						from: entryStage,
						to: entryStage,
						timestamp: now,
						notes: isBlockedCase
							? 'Case saved to quota buffer — awaiting auto-process on upgrade or cycle reset'
							: 'Case created'
					}
				],
				lender_applications: [],
				created_at: now,
				updated_at: now,
				is_archived: false,
				is_sample: false,
				...(req.idempotency_key && { idempotency_key: req.idempotency_key })
			};

			try {
				await Cases.insertOne(newCase);
			} catch (insertErr) {
				if ((insertErr as any).code === 11000) {
					logger.warn(
						{ caseId, dsaId: dsaId.toString() },
						'[EvaluateAndPersist] E11000: Case with this ID already exists for this DSA'
					);
					return apiError(
						'This case already exists. Use the edit button to update it instead of submitting again.',
						409
					);
				}
				logger.error(
					{ err: insertErr, caseId, dsaId: dsaId.toString(), errorCode: (insertErr as any).code },
					'[EvaluateAndPersist] Failed to insert case'
				);
				throw insertErr;
			}

			await createTimelineEvent(
				caseId,
				'case_created',
				isBlockedCase
					? `Case saved to quota buffer: ${newCase.label}`
					: `Case created: ${newCase.label}`,
				{
					loan_type: req.loanType,
					amount: cleanPayload.loanTransaction.loanAmount,
					...(isBlockedCase && { stage: 'quota_blocked' as const })
				}
			);

			await createFormSnapshot(
				caseId,
				dsaId,
				persistedFormState,
				isBlockedCase ? 'Case saved to quota buffer' : changeSummary
			);

			// QBC buffer-save notification (best-effort; failure here doesn't
			// roll back the case insert above).
			if (isBlockedCase && bufferEmailContext) {
				try {
					const recipient = await resolveDsaEmailRecipient(dsaId);
					if (recipient) {
						const emailResult = await sendBufferSaveEmail({
							recipient,
							planName: PLANS[bufferEmailContext.planId].name,
							caseLabel: newCase.label,
							nextCycleAtIso: bufferEmailContext.nextCycleAtIso
						});
						if (!emailResult.success) {
							logger.warn(
								{ caseId, dsa_id: String(dsaId), error: emailResult.error },
								'[QBC] Buffer-save email dispatch returned failure'
							);
						}
					}
				} catch (mailErr) {
					logger.warn(
						{ caseId, dsa_id: String(dsaId), err: (mailErr as Error).message },
						'[QBC] Buffer-save email threw — case insert already committed'
					);
				}
			}
		}

		mark('persist');

		logger.info(
			{
				event: 'evaluate_and_persist.phase1.timing',
				total_ms: Date.now() - tStart,
				...timings
			},
			'[EvaluateAndPersist] phase 1 timings'
		);

		// 8. Return minimal metadata. The CLIENT now calls phase 2
		// (POST /api/cases/[case_id]/evaluate-offers) UNLESS this is a
		// quota-blocked case (no offers to compute for those).
		return apiOk({
			caseId,
			amountRequested: cleanPayload.loanTransaction.loanAmount,
			tenureYears: cleanPayload.loanTransaction.tenureYears,
			// Signal whether phase 2 should run. Blocked cases skip phase 2 —
			// they enter the buffer with FormSnapshot only; offers compute
			// later via the auto-unblock cron.
			needs_evaluation: !isBlockedCase,
			...(isBlockedCase && { quota_blocked: true as const }),
			...(caseLimitWarning && { case_limit_warning: caseLimitWarning })
		});
	} catch (err) {
		return apiServerError(err, 'Evaluation failed');
	}
};
