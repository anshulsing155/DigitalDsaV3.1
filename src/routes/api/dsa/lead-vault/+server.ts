/**
 * POST   /api/dsa/lead-vault — vault write
 * GET    /api/dsa/lead-vault — DSA transparency view (own entries)
 * DELETE /api/dsa/lead-vault — consent withdrawal (DPDP §13 erasure)
 * ══════════════════════════════════════════════════════════════════
 * DATA-1 vault write + read + withdrawal endpoints. POST records a closed
 * case as bucketed non-PII data; GET returns the calling DSA's own vault
 * entries; DELETE removes the entry and writes an audit-trail row to
 * ConsentWithdrawalLogs (analogous to DATA-3's ArtifactDeletionLog).
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6.
 *
 * Preconditions (the handler verifies all of these):
 *   1. Auth — caller must be an authenticated DSA.
 *   2. Ownership — the case_id in the body must belong to the caller.
 *   3. Loan type — v1 supports secured loans only (Home/LAP/Plot).
 *   4. Closure — the case must have transitioned to `stage: 'sanctioned'`.
 *   5. Consent — case must carry an uploaded data_usage_consent_v1
 *      document in its lender_applications[].document_checklist.
 *   6. Property data — propertyPincode + propCost + a derivable
 *      locality bucket must be present in the most-recent form snapshot.
 *
 * Idempotency: the unique index on `source_case_id` makes the write
 * idempotent. A second POST for the same case returns
 * `{ already_saved: true }` without modifying the existing row.
 *
 * Body shape: { case_id: string }
 *
 * Responses:
 *   200 — { vault_entry_id }  (new write)
 *   200 — { already_saved: true }  (duplicate POST)
 *   200 — { skipped: true, reason }  (unsupported loan type / pre-sanction case)
 *   400 — CONSENT_REQUIRED  (no uploaded consent doc on file)
 *   400 — MISSING_PROPERTY_DATA  (missing pincode / price / locality)
 *   400 — NO_FORM_SNAPSHOT  (case has no form payload to read)
 *   403 — case belongs to a different DSA
 *   404 — case_id not found for this DSA
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	FormSnapshots,
	LeadAttributionVault,
	ConsentWithdrawalLogs
} from '$lib/database/mongo.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership
} from '$lib/server/caseHelpers.js';
import {
	blockDemoWrite,
	requireAuthApi,
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
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import {
	buildVaultEntry,
	findConsentDocId,
	isSecuredLoanV1
} from '$lib/server/data1/index.js';
import logger from '$lib/server/logger.js';

const requestSchema = z.object({
	case_id: z.string().min(1)
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// ── Auth ────────────────────────────────────────────────────────
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 60,
		windowMs: 60 * 60 * 1000,
		identifier: `lead-vault-write:${locals.user!.id}`
	});
	if (limited) return apiError('Too many vault writes. Please try again later.', 429);

	// ── Parse + validate ────────────────────────────────────────────
	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	const parsed = requestSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	const { case_id } = parsed.data;

	try {
		// ── Resolve DSA + verify ownership ──────────────────────────
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}

		const ownership = await verifyCaseOwnership(case_id, dsaResult.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;

		// ── Early skip for unsupported loan types ───────────────────
		// Reject before the consent + snapshot work — saves the DB load
		// and gives the caller a clear "not a bug, just not in scope".
		if (!isSecuredLoanV1(caseDoc.loan?.type)) {
			return apiOk({ skipped: true, reason: 'unsupported_loan_type_v1' });
		}

		// ── Consent gate (must be on file before any write) ─────────
		const consentDocId = findConsentDocId(caseDoc);
		if (!consentDocId) {
			return apiError(
				'CONSENT_REQUIRED — case must carry an uploaded data_usage_consent_v1 document',
				400
			);
		}

		// ── Idempotency check ───────────────────────────────────────
		// The unique index on source_case_id also enforces this, but a
		// pre-check returns a cleaner `already_saved: true` response than
		// catching the duplicate-key error.
		const existing = await LeadAttributionVault.findOne(
			{ source_case_id: case_id },
			{ projection: { _id: 1 } }
		);
		if (existing) {
			return apiOk({ already_saved: true, vault_entry_id: existing._id?.toString() });
		}

		// ── Load most-recent form snapshot ──────────────────────────
		const snapshot = await FormSnapshots.findOne(
			{ case_id },
			{ sort: { version: -1 } }
		);
		if (!snapshot) {
			return apiError('NO_FORM_SNAPSHOT — case has no form payload', 400);
		}

		const payload = await resolveSnapshotPayload(snapshot);
		if (!payload) {
			return apiError('NO_FORM_SNAPSHOT — payload could not be resolved', 400);
		}

		// ── Build the bucketed entry ────────────────────────────────
		const built = buildVaultEntry(caseDoc, payload);
		if (!built.ok) {
			// `unsupported_loan_type` is already caught earlier; the
			// remaining reasons fall into either "soft skip" (not_sanctioned —
			// case hasn't closed yet, DSA called too early) or "bad data"
			// (missing pincode / price / locality).
			if (built.reason === 'not_sanctioned') {
				return apiOk({ skipped: true, reason: 'not_sanctioned' });
			}
			return apiError(`MISSING_PROPERTY_DATA — ${built.reason}`, 400);
		}

		// ── Write ───────────────────────────────────────────────────
		const insertResult = await LeadAttributionVault.insertOne({
			...built.entry,
			consent_ref: consentDocId,
			created_at: new Date()
		});

		logger.info(
			{
				case_id,
				dsa_id: dsaResult.dsaId.toString(),
				closed_quarter: built.entry.closed_quarter,
				property_pincode: built.entry.property_pincode
			},
			'DATA-1: vault entry created'
		);

		return apiOk({ vault_entry_id: insertResult.insertedId.toString() });
	} catch (err) {
		return apiServerError(err, 'Failed to write lead-attribution vault entry');
	}
};

// ── GET — DSA transparency view (caller's own entries) ────────────
// Spec §6: paginated list of the calling DSA's entries, newest first.
// Fields omitted from response: source_dsa_id (always the caller, so
// returning it would be redundant), _id (internal).
//
// Query params:
//   page  — 1-indexed page number (default 1)
//   limit — page size, 1–50 (default 20)

const PAGE_MIN = 1;
const PAGE_DEFAULT = 1;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 20;

function parsePagination(url: URL): { page: number; limit: number } {
	const rawPage = parseInt(url.searchParams.get('page') ?? '', 10);
	const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
	const page = Number.isFinite(rawPage) && rawPage >= PAGE_MIN ? rawPage : PAGE_DEFAULT;
	const limit =
		Number.isFinite(rawLimit) && rawLimit >= LIMIT_MIN
			? Math.min(rawLimit, LIMIT_MAX)
			: LIMIT_DEFAULT;
	return { page, limit };
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

	try {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}

		const { page, limit } = parsePagination(url);
		const skip = (page - 1) * limit;

		// Scoped query: source_dsa_id MUST equal the caller's DSA. This is
		// the BOLA gate — a forged page/limit query param can't widen scope.
		const baseFilter = { source_dsa_id: dsaResult.dsaId };

		const [entries, total] = await Promise.all([
			LeadAttributionVault.find(baseFilter, {
				projection: {
					source_dsa_id: 0 // always the caller; redundant in the response
				}
			})
				.sort({ created_at: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			LeadAttributionVault.countDocuments(baseFilter)
		]);

		return apiOk({
			entries: entries.map((e) => ({
				vault_entry_id: e._id?.toString(),
				source_case_id: e.source_case_id,
				closed_quarter: e.closed_quarter,
				created_at: e.created_at?.toISOString(),
				loan_type: e.loan_type,
				lender_selected: e.lender_selected,
				property_locality_bucket: e.property_locality_bucket,
				property_pincode: e.property_pincode,
				property_price_bucket: e.property_price_bucket,
				loan_amount_bucket: e.loan_amount_bucket
				// consent_ref intentionally omitted — implementation detail,
				// surfaces in withdrawal-flow tooling, not the transparency view.
			})),
			pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch lead-vault entries');
	}
};

// ── DELETE — consent withdrawal (DPDP §13 right to erasure) ────────
// Spec §10. The customer has revoked consent — the DSA notifies the
// platform via this endpoint OR a support escalation routes an admin to
// invoke it on the DSA's behalf.
//
// Body: { case_id: string, reason: string }
//
// Auth: DSA role for self-service deletion (DSA must own the case), OR
// admin role for cross-DSA processing of escalated erasure requests.
// The ConsentWithdrawalLog row records `withdrawn_by` so the audit trail
// reflects who pressed the button — DSA or admin.
//
// Idempotency: deleting an already-deleted entry returns 404; the audit
// log row is only written when the delete actually happens.

const deleteSchema = z.object({
	case_id: z.string().min(1),
	reason: z.string().min(1).max(500)
});

export const DELETE: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// Auth: either dsa or admin. We use the lower bar (requireAuthApi) and
	// branch the ownership check on activeRole.
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const activeRole = locals.user?.activeRole;
	if (activeRole !== 'dsa' && activeRole !== 'admin') {
		return apiError('Only DSA or admin can process consent withdrawals', 403);
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `lead-vault-delete:${locals.user?.id ?? getClientAddress()}`
	});
	if (limited) return apiError('Too many withdrawal requests. Please try again later.', 429);

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	const parsed = deleteSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	const { case_id, reason } = parsed.data;

	try {
		// Find the vault entry by case_id. We need the entry's contents to
		// write the audit-log snapshot BEFORE deleting (audit-log-first
		// ordering — mirrors DATA-3's ArtifactDeletionLog pattern in
		// src/lib/server/data3/auditLog.ts).
		const entry = await LeadAttributionVault.findOne({ source_case_id: case_id });
		if (!entry) {
			return apiError('Vault entry not found for this case', 404);
		}

		// DSA scope check: a DSA caller must own the entry. Admins bypass
		// because they're processing escalated erasure requests across DSAs.
		if (activeRole === 'dsa') {
			const dsaResult = await resolveEffectiveDsaId(locals);
			if (!dsaResult.ok) {
				return apiError(dsaResult.error, 404);
			}
			if (!entry.source_dsa_id.equals(dsaResult.dsaId)) {
				return apiError('Vault entry belongs to a different DSA', 403);
			}
		}

		// Capture the snapshot before deletion. The log stores ONLY
		// bucketed values — never PII — for compliance audit purposes.
		const auditSnapshot = {
			loan_type: entry.loan_type,
			property_pincode: entry.property_pincode,
			property_locality_bucket: entry.property_locality_bucket,
			closed_quarter: entry.closed_quarter
		};

		// Audit-log-first: insert the log row BEFORE deleting the vault
		// entry. If the delete fails afterwards, we have an orphan log row
		// (acceptable — overcounts erasures) rather than a deleted entry
		// with no audit trail (privacy/compliance failure).
		const logInsert = await ConsentWithdrawalLogs.insertOne({
			source_case_id: case_id,
			source_dsa_id: entry.source_dsa_id,
			deleted_snapshot: auditSnapshot,
			reason,
			withdrawn_at: new Date(),
			withdrawn_by: `${activeRole}:${locals.user?.id ?? 'unknown'}`
		});

		const deleteResult = await LeadAttributionVault.deleteOne({
			source_case_id: case_id
		});

		logger.info(
			{
				case_id,
				withdrawn_by: activeRole,
				log_id: logInsert.insertedId.toString(),
				deleted_count: deleteResult.deletedCount
			},
			'DATA-1: consent withdrawal processed'
		);

		return apiOk({
			deleted: deleteResult.deletedCount === 1,
			log_id: logInsert.insertedId.toString()
		});
	} catch (err) {
		return apiServerError(err, 'Failed to process consent withdrawal');
	}
};
