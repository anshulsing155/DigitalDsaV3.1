/**
 * POST /api/dsa/btdc-vault/[id]/revoke — DSA-initiated revocation
 * ══════════════════════════════════════════════════════════════════
 * DSA revokes an entry on the customer's behalf (e.g. customer told
 * them by phone). Sets consent_status='revoked', revoked_at=now,
 * revoked_by='dsa', and starts the 90-day grace period.
 *
 * The Mongo doc is NOT deleted here — the grace-period sweep cron
 * (Slice 9) does the hard-delete + ImageKit teardown after 90 days.
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §6 + §9.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { OutreachVault } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import {
	blockDemoWrite,
	requireRoleApi,
	requireTeamPermission
} from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';

const GRACE_PERIOD_DAYS = 90;

const revokeRequestSchema = z.object({
	reason: z.string().max(500).optional()
});

export const POST: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `btdc-vault-revoke:${locals.user!.id}`
	});
	if (limited) return apiError('Too many revocation requests. Please try again later.', 429);

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	const parsed = revokeRequestSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	try {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) return apiError(dsaResult.error, 404);

		let oid: ObjectId;
		try {
			oid = new ObjectId(params.id);
		} catch {
			return apiError('Vault entry not found', 404);
		}

		const now = new Date();
		const graceEnd = new Date(now);
		graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

		// updateOne with BOLA-scoped filter — a wrong dsa_id results in
		// matched_count=0 → 404. Same response as "not found" to avoid
		// existence leakage across DSAs.
		const updateSet: Record<string, unknown> = {
			consent_status: 'revoked',
			revoked_at: now,
			revoked_by: 'dsa',
			grace_period_ends_at: graceEnd,
			updated_at: now
		};
		if (parsed.data.reason) {
			updateSet.revocation_notes = parsed.data.reason;
		}

		// Only revoke entries that are currently active — re-revoking an
		// already-revoked entry would reset the grace period clock, which
		// is a soft footgun. Surface a 409 instead.
		const result = await OutreachVault.updateOne(
			{ _id: oid, dsa_id: dsaResult.dsaId, consent_status: 'active' },
			{ $set: updateSet }
		);

		if (result.matchedCount === 0) {
			// Could be: not found, wrong DSA, OR already revoked. Disambiguate.
			const existsForDsa = await OutreachVault.findOne(
				{ _id: oid, dsa_id: dsaResult.dsaId },
				{ projection: { consent_status: 1 } }
			);
			if (!existsForDsa) {
				return apiError('Vault entry not found', 404);
			}
			return apiError(
				`Vault entry is already in '${existsForDsa.consent_status}' state — cannot revoke`,
				409
			);
		}

		logger.info(
			{
				vault_entry_id: oid.toString(),
				dsa_id: dsaResult.dsaId.toString(),
				revoked_by: 'dsa',
				grace_period_ends_at: graceEnd.toISOString()
			},
			'DATA-2: vault entry revoked by DSA'
		);

		return apiOk({
			entry_id: oid.toString(),
			consent_status: 'revoked',
			revoked_at: now.toISOString(),
			grace_period_ends_at: graceEnd.toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'Failed to revoke vault entry');
	}
};
