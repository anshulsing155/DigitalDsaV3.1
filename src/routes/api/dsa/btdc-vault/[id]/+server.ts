/**
 * GET  /api/dsa/btdc-vault/[id] — fetch a single vault entry by _id
 * ══════════════════════════════════════════════════════════════════
 * DATA-2 single-entry read. BOLA-gated on dsa_id — a DSA cannot read
 * another DSA's entry. The 404 returned for not-found is intentionally
 * identical to the 404 for "wrong dsa_id" so no existence leakage.
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §6.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId, type Binary } from 'mongodb';
import { OutreachVault, MongoClientInstance } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { decryptValue } from '$lib/server/csfle/index.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

	try {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) return apiError(dsaResult.error, 404);

		// Defensive: only valid ObjectIds make it past this point — anything
		// else gets a 404 (we never tell the caller "your id is malformed",
		// because that's also a small information leak).
		let oid: ObjectId;
		try {
			oid = new ObjectId(params.id);
		} catch {
			return apiError('Vault entry not found', 404);
		}

		// BOLA gate: filter by BOTH _id AND dsa_id. A wrong dsa_id produces
		// the same 404 as a non-existent _id — no existence leakage.
		const entry = await OutreachVault.findOne(
			{ _id: oid, dsa_id: dsaResult.dsaId },
			{ projection: { revocation_token: 0 } }
		);

		if (!entry) {
			return apiError('Vault entry not found', 404);
		}

		const mobile = await decryptValue<string>(
			MongoClientInstance,
			entry.mobile as unknown as Binary
		);

		return apiOk({
			entry_id: entry._id?.toString(),
			case_id: entry.case_id,
			mobile,
			loan_profile: entry.loan_profile,
			consent_doc_ref: entry.consent_doc_ref,
			consent_signed_at: entry.consent_signed_at?.toISOString(),
			consent_expiry: entry.consent_expiry?.toISOString(),
			consent_status: entry.consent_status,
			revoked_at: entry.revoked_at?.toISOString(),
			revoked_by: entry.revoked_by,
			revocation_notes: entry.revocation_notes,
			grace_period_ends_at: entry.grace_period_ends_at?.toISOString(),
			created_at: entry.created_at?.toISOString(),
			updated_at: entry.updated_at?.toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch vault entry');
	}
};
