/**
 * POST /api/admin/billing/grant-trial
 * ══════════════════════════════════════════════════════════════════════
 * Admin override for the trial-abuse defense. Marks an existing trial-
 * blocklist row as revoked so the target DSA becomes eligible for a
 * second (or more) trial.
 *
 * Why this exists: false positives are inevitable with identifier-based
 * matching (family members sharing a phone, partnerships dissolving and
 * reforming with overlap, etc.). Support needs a way to grant trials
 * case-by-case without disabling the gate entirely.
 *
 * Body: { dsa_id: string; reason: string }
 *
 * Effect:
 *   - Looks up the target DSA's mobile / PAN / GST identifiers
 *   - For each existing blocklist row matching those hashes, stamps
 *     `revoked_at` and `override_audit_id`
 *   - Writes a BillingAuditLogs row (event_class: 'admin_action',
 *     event_name: 'trial.granted_by_admin') with the reason + admin id
 *   - Does NOT create the trial itself — the DSA must still click
 *     Subscribe (and pass the now-clean eligibility check) to consume it
 *
 * Auth: admin-only. Rate-limit 10/hr/admin.
 *
 * Spec: D-1-RECURRING-BILLING-SPEC.md §4 S8 (skipped) addendum (trial).
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import { DsaApplications, TrialIdentifierBlocklist } from '$lib/database/mongo';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';
import { hashIdentifier } from '$lib/server/billing/trialEligibility';
import logger from '$lib/server/logger';

interface GrantTrialBody {
	/** ObjectId string of the DSA to grant a fresh trial to. */
	dsa_id: string;
	/** Support reason (free text, audit-logged). Min 10 chars. */
	reason: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const adminId = locals.user!.id;

	// Rate limit — generous because admin/support reasonably triggers
	// this a handful of times per day at most.
	const limited = await rateLimit(adminId, {
		identifier: `admin-grant-trial:${adminId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) return apiError('Too many requests', 429);

	const parsed = await parseJsonBody<GrantTrialBody>(request);
	if (!parsed.ok) return parsed.response;
	const { dsa_id, reason } = parsed.data;

	if (!dsa_id || typeof dsa_id !== 'string') return apiError('dsa_id is required', 400);
	if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
		return apiError('reason is required (min 10 chars)', 400);
	}

	let dsaObjectId: ObjectId;
	try {
		dsaObjectId = new ObjectId(dsa_id);
	} catch {
		return apiError('Invalid dsa_id format', 400);
	}

	try {
		const dsa = await DsaApplications.findOne(
			{ _id: dsaObjectId },
			{ projection: { mobileNumber: 1, panNumber: 1, gstNumber: 1, name: 1 } }
		);
		if (!dsa) return apiError('DSA not found', 404);

		// Compute the hashes that need revocation. The blocklist might hold
		// rows for ANY of the DSA's three identifiers (auto-grant inserts all
		// three on the original trial). We revoke whatever rows match — could
		// be 0 (if no prior trial existed; admin can grant a "preemptive"
		// pass that simply audit-logs the action), 1, 2, or 3 rows.
		const hashesToCheck: Array<{ kind: 'mobile' | 'pan' | 'gst'; hash: string }> = [];
		const mobileHash = hashIdentifier('mobile', dsa.mobileNumber);
		if (mobileHash) hashesToCheck.push({ kind: 'mobile', hash: mobileHash });
		const panHash = hashIdentifier('pan', dsa.panNumber);
		if (panHash) hashesToCheck.push({ kind: 'pan', hash: panHash });
		const gstHash = hashIdentifier('gst', dsa.gstNumber);
		if (gstHash) hashesToCheck.push({ kind: 'gst', hash: gstHash });

		// Audit log first — preserves the trail even if the bulk updateMany
		// below fails. writeBillingAuditLog returns void; admins can grep
		// the audit collection by (dsa_id, event_name, created_at) to find
		// the row and cross-reference with the blocklist rows revoked below.
		await writeBillingAuditLog({
			event_class: 'admin_action',
			event_name: 'trial.granted_by_admin',
			dsa_id: dsaObjectId,
			actor: 'admin',
			actor_id: new ObjectId(adminId),
			payload: {
				target_dsa_id: dsaObjectId.toString(),
				target_dsa_name: dsa.name ?? null,
				reason,
				identifiers_to_revoke: hashesToCheck.map((h) => h.kind)
			}
		});

		let revokedCount = 0;
		const now = new Date();
		for (const { kind, hash } of hashesToCheck) {
			const result = await TrialIdentifierBlocklist.updateMany(
				{
					identifier_kind: kind,
					identifier_hash: hash,
					revoked_at: { $exists: false }
				},
				{ $set: { revoked_at: now } }
			);
			revokedCount += result.modifiedCount;
		}

		logger.info(
			{
				admin_id: adminId,
				target_dsa_id: dsa_id,
				identifiers_revoked: revokedCount,
				reason
			},
			'admin-grant-trial: revoked blocklist rows'
		);

		return apiOk({
			target_dsa_id: dsa_id,
			target_dsa_name: dsa.name ?? null,
			identifiers_revoked: revokedCount,
			message:
				revokedCount > 0
					? `Cleared ${revokedCount} blocklist row(s). DSA can now claim a fresh trial.`
					: 'No matching blocklist rows found — DSA had no prior trial on file. Audit-logged for the record.'
		});
	} catch (err) {
		return apiServerError(err, 'Failed to grant trial');
	}
};
