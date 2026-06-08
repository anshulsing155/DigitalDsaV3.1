/**
 * POST /api/dsa/btdc-vault — write a new vault entry
 * GET  /api/dsa/btdc-vault — list the calling DSA's entries
 * ══════════════════════════════════════════════════════════════════
 * DATA-2 outreach vault endpoints. POST creates a consented entry that
 * the BT/DC eligibility query (Slice 7) can later surface. GET is the
 * DSA's transparency view of their own vault.
 *
 * Privacy contract:
 *   - Every read is BOLA-scoped to dsa_id (the calling user's effective DSA)
 *   - `mobile` is CSFLE-deterministic encrypted at rest; the duplicate-check
 *     and equality lookups work via encryptValue(...) on the query side too
 *   - The list endpoint decrypts `mobile` for display BUT never includes
 *     `revocation_token` in the response (that's an internal credential
 *     used only by the customer's case PDF link)
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §6.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ObjectId, type Binary } from 'mongodb';
import { OutreachVault, MongoClientInstance } from '$lib/database/mongo.js';
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
	apiStructuredError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { encryptValue, decryptValue } from '$lib/server/csfle/index.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { buildVaultEntry } from '$lib/server/data2/index.js';
import logger from '$lib/server/logger.js';

// ── Zod request schema (POST) ────────────────────────────────────────────────
const postRequestSchema = z.object({
	case_id: z.string().min(1),
	mobile: z.string().min(10),
	loan_profile: z.object({
		loan_type: z.enum([
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		]),
		lender_id: z.string().min(1),
		lender_name: z.string().min(1),
		sanctioned_amount: z.number().positive(),
		sanctioned_roi: z.number().positive().max(50),
		tenure_months: z.number().int().positive().max(600),
		disbursement_date: z.coerce.date().optional()
	}),
	consent_doc_ref: z.object({
		imagekit_file_id: z.string().min(1),
		imagekit_url: z.string().min(1),
		template_version: z.string().min(1),
		uploaded_at: z.coerce.date()
	}),
	consent_signed_at: z.coerce.date(),
	consent_expiry: z.coerce.date().optional()
});

// ── POST — write a new vault entry ───────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 60,
		windowMs: 60 * 60 * 1000,
		identifier: `btdc-vault-write:${locals.user!.id}`
	});
	if (limited) return apiError('Too many vault writes. Please try again later.', 429);

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	const parsed = postRequestSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	try {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) return apiError(dsaResult.error, 404);

		// Run the orchestrator first — catches consent-gate / shape failures
		// before we touch CSFLE or MongoDB.
		const built = buildVaultEntry(parsed.data, dsaResult.dsaId);
		if (!built.ok) {
			if (built.reason === 'consent_gates_failed') {
				return apiStructuredError(
					'CONSENT_GATES_FAILED — fix the items below and resubmit',
					{
						failed_gates: built.gate_result?.failed_gates ?? [],
						reasons: built.gate_result?.reasons ?? {}
					},
					400
				);
			}
			return apiError(built.detail || `Invalid payload: ${built.reason}`, 400);
		}

		// CSFLE encrypt the mobile BEFORE the duplicate check + insert. The
		// duplicate query uses the same encrypted value (CSFLE-deterministic
		// guarantees same plaintext → same ciphertext).
		const encryptedMobile = await encryptValue(
			MongoClientInstance,
			built.entry.mobile,
			'mobile-key'
		);

		// Duplicate guard — only ACTIVE entries collide. Revoked / expired
		// entries for the same mobile are fine to coexist with a new active one.
		const existing = await OutreachVault.findOne(
			{
				dsa_id: dsaResult.dsaId,
				mobile: encryptedMobile as never,
				consent_status: 'active'
			},
			{ projection: { _id: 1 } }
		);
		if (existing) {
			return apiStructuredError(
				'duplicate_mobile — an active vault entry already exists for this customer',
				{ existing_entry_id: existing._id?.toString() },
				409
			);
		}

		// Swap plaintext mobile → encrypted binary, then insert.
		const insertedDoc = {
			...built.entry,
			mobile: encryptedMobile as unknown as string // Binary at rest; type widens on insert
		};
		await OutreachVault.insertOne(insertedDoc);

		logger.info(
			{
				vault_entry_id: built.entry._id?.toString(),
				dsa_id: dsaResult.dsaId.toString(),
				loan_type: built.entry.loan_profile.loan_type,
				lender_id: built.entry.loan_profile.lender_id
			},
			'DATA-2: vault entry created'
		);

		return apiOk({
			entry_id: built.entry._id?.toString(),
			revocation_token: built.entry.revocation_token,
			consent_status: 'active'
		});
	} catch (err) {
		return apiServerError(err, 'Failed to write vault entry');
	}
};

// ── GET — DSA transparency view (paginated, own entries only) ────────────────

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 50;

function parsePagination(url: URL): { page: number; limit: number } {
	const rawPage = parseInt(url.searchParams.get('page') ?? '', 10);
	const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
	const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : PAGE_DEFAULT;
	const limit =
		Number.isFinite(rawLimit) && rawLimit >= 1
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
		if (!dsaResult.ok) return apiError(dsaResult.error, 404);

		const { page, limit } = parsePagination(url);
		const skip = (page - 1) * limit;
		const includeRevoked = url.searchParams.get('include_revoked') === 'true';

		const baseFilter: Record<string, unknown> = { dsa_id: dsaResult.dsaId };
		if (!includeRevoked) baseFilter.consent_status = 'active';

		const [entries, total] = await Promise.all([
			OutreachVault.find(baseFilter, {
				projection: { revocation_token: 0 } // never expose the customer-PDF token
			})
				.sort({ created_at: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			OutreachVault.countDocuments(baseFilter)
		]);

		// Decrypt mobile for each row before serializing to the client.
		const decryptedEntries = await Promise.all(
			entries.map(async (e) => {
				const mobile = await decryptValue<string>(
					MongoClientInstance,
					e.mobile as unknown as Binary
				);
				return {
					entry_id: e._id?.toString(),
					case_id: e.case_id,
					mobile, // plaintext for DSA's own view; never appears in bulk exports
					loan_profile: e.loan_profile,
					consent_doc_ref: e.consent_doc_ref,
					consent_signed_at: e.consent_signed_at?.toISOString(),
					consent_expiry: e.consent_expiry?.toISOString(),
					consent_status: e.consent_status,
					revoked_at: e.revoked_at?.toISOString(),
					revoked_by: e.revoked_by,
					created_at: e.created_at?.toISOString()
				};
			})
		);

		return apiOk({
			entries: decryptedEntries,
			pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch vault entries');
	}
};
