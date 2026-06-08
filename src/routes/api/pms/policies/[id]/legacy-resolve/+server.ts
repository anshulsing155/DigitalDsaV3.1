/**
 * POST /api/pms/policies/[id]/legacy-resolve
 * Admin-only. Resolves discrepancies from a prior legacy comparison run.
 *
 * Body: { decisions: Array<{ field: string, resolution: 'pms_wins' | 'legacy_wins' | 'ask_rm' }> }
 *
 * Resolution semantics:
 *   pms_wins  — PMS value is authoritative. No side effect (PMS already drives the engine).
 *   legacy_wins — Legacy value should override PMS. Creates a PendingChange record so the RM
 *               can review and accept the legacy value into the next PMS revision. Fires an
 *               in-app notification to the RM who owns this policy.
 *   ask_rm    — Admin is unsure. Creates a stub PendingChange with newValue=null so the RM
 *               knows to fill in the correct value during their next edit session.
 *
 * All decisions for the comparison batch must be submitted in one call.
 * After this call, legacyComparison.resolvedAt is set on the PolicyDocument.
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { PmsLenderPolicies, Notifications } from '$lib/database/mongo.js';
import { getPolicyById, PolicyNotFoundError } from '$lib/server/pms/policyService.js';
import type { PendingChange, LegacyDiscrepancy } from '$lib/config/pms/policyTypes.js';
import { z } from 'zod';

// DX-2: Zod replaces the hand-rolled isValidResolution + validateDecisions
// type-guards. Same enum values, same per-element shape — the schema is
// just declarative and self-documenting.
const decisionSchema = z.object({
	field: z.string(),
	resolution: z.enum(['pms_wins', 'legacy_wins', 'ask_rm'])
});

const postRequestSchema = z.object({
	decisions: z.array(decisionSchema).min(1, 'No decisions provided.')
});

type Resolution = 'pms_wins' | 'legacy_wins' | 'ask_rm';

// ── Handler ────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const { id } = params;
	const adminId = locals.user!.id;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = postRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { decisions } = validated.data;

	try {
		const policy = await getPolicyById(id);

		if (!policy.legacyComparison) {
			return apiError('No comparison run found. Run legacy-compare first.', 422);
		}

		if (policy.legacyComparison.resolvedAt !== null) {
			return apiError(
				'Comparison already resolved. Re-run legacy-compare to start a new comparison.',
				409
			);
		}

		const { discrepancies } = policy.legacyComparison;

		// Validate that all submitted fields exist in the current comparison run
		const knownFields = new Set(discrepancies.map((d) => d.field));
		const unknownFields = decisions.filter((d) => !knownFields.has(d.field)).map((d) => d.field);
		if (unknownFields.length > 0) {
			return apiError(
				`Unknown fields in decisions (not in comparison results): ${unknownFields.join(', ')}`,
				400
			);
		}

		const now = new Date();
		const newPendingChanges: PendingChange[] = [];

		// Build updated discrepancy array with resolution stamps
		const resolvedDiscrepancies = discrepancies.map((discrepancy) => {
			const decision = decisions.find((d) => d.field === discrepancy.field);
			if (!decision) {
				// Field not in decisions — leave as pending (admin didn't touch it)
				return discrepancy;
			}

			// Map the wire-level decision to the stored resolution state.
			// 'legacy_wins' is renamed to 'legacy_wins_pending_rm' to make the
			// follow-up obligation explicit. 'ask_rm' and 'pms_wins' map 1:1.
			const resolution: LegacyDiscrepancy['resolution'] =
				decision.resolution === 'legacy_wins' ? 'legacy_wins_pending_rm' : decision.resolution;

			const updated: LegacyDiscrepancy = {
				...discrepancy,
				resolution,
				resolvedBy: adminId,
				resolvedAt: now,
				note: null
			};

			// legacy_wins → create a PendingChange so the RM knows to revise
			if (decision.resolution === 'legacy_wins') {
				newPendingChanges.push({
					field: discrepancy.field,
					oldValue: discrepancy.pmsValue,
					newValue: discrepancy.legacyValue,
					reason: 'compare_with_legacy',
					changedBy: adminId,
					changedAt: now,
					rmAcknowledged: false,
					rmAcknowledgedAt: null
				});
			}

			// ask_rm → stub PendingChange with null newValue for RM to fill in
			if (decision.resolution === 'ask_rm') {
				newPendingChanges.push({
					field: discrepancy.field,
					oldValue: discrepancy.pmsValue,
					newValue: null,
					reason: 'compare_with_legacy',
					changedBy: adminId,
					changedAt: now,
					rmAcknowledged: false,
					rmAcknowledgedAt: null
				});
			}

			return updated;
		});

		// Check whether all discrepancies are now resolved (none left as 'pending')
		const allResolved = resolvedDiscrepancies.every((d) => d.resolution !== 'pending');
		const resolvedAt = allResolved ? now : null;

		// Write resolution to policy: update discrepancies, set resolvedAt, append PendingChanges
		await PmsLenderPolicies.updateOne(
			{ _id: policy._id },
			{
				$set: {
					'legacyComparison.discrepancies': resolvedDiscrepancies,
					'legacyComparison.resolvedAt': resolvedAt,
					'legacyComparison.resolvedBy': allResolved ? adminId : null,
					updatedBy: adminId,
					updatedAt: now
				},
				...(newPendingChanges.length > 0
					? { $push: { pendingChanges: { $each: newPendingChanges } } }
					: {})
			}
		);

		// Notify the RM if any legacy_wins or ask_rm decisions were made
		const actionableCount = decisions.filter(
			(d) => d.resolution === 'legacy_wins' || d.resolution === 'ask_rm'
		).length;

		if (actionableCount > 0 && policy.reconciliationAssignedTo) {
			const rmId = policy.reconciliationAssignedTo;
			const legacyWinsCount = decisions.filter((d) => d.resolution === 'legacy_wins').length;
			const askRmCount = decisions.filter((d) => d.resolution === 'ask_rm').length;

			const messageParts: string[] = [];
			if (legacyWinsCount > 0) {
				messageParts.push(
					`${legacyWinsCount} field${legacyWinsCount === 1 ? '' : 's'} set to legacy value (please review and confirm)`
				);
			}
			if (askRmCount > 0) {
				messageParts.push(
					`${askRmCount} field${askRmCount === 1 ? '' : 's'} need your input`
				);
			}

			await Notifications.insertOne({
				user_id: rmId,
				user_role: 'rm',
				type: 'pms_policy_legacy_discrepancy',
				title: `Policy comparison: ${policy.lenderId} ${policy.loanProduct}`,
				message: `Admin reviewed legacy comparison. ${messageParts.join('; ')}.`,
				action_url: `/dashboard/rm/policies/${policy.lenderId}/${encodeURIComponent(policy.loanProduct)}`,
				read: false,
				created_at: now,
				metadata: {
					policyId: id,
					lenderId: policy.lenderId,
					loanProduct: policy.loanProduct,
					pendingChangeCount: newPendingChanges.length
				}
			} as any);
		}

		logger.info(
			{
				policyId: id,
				resolvedBy: adminId,
				totalDecisions: decisions.length,
				pendingChangesCreated: newPendingChanges.length,
				allResolved
			},
			'PMS legacy comparison resolved'
		);

		return apiOk({
			resolvedAt: resolvedAt?.toISOString() ?? null,
			allResolved,
			pendingChangesCreated: newPendingChanges.length,
			message: allResolved
				? 'All discrepancies resolved.'
				: 'Partial resolution saved. Some discrepancies still pending.'
		});
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err, 'pms legacy-resolve');
	}
};
