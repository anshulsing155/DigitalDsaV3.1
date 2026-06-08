/**
 * DATA-2 — Vault entry orchestrator (pure function).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §6 (POST endpoint logic).
 *
 * Given a save payload + the calling DSA's id, builds a ready-to-insert
 * OutreachVaultEntry. Side-effect-free — all CSFLE encryption + the
 * actual MongoDB insert happen in the endpoint shell that wraps this.
 *
 * What it does in order:
 *   1. Validate consent gates (C1, C2, C3) — short-circuit on failure
 *   2. Generate the vault entry _id (so the revocation token can bind to it)
 *   3. Compute the mobile_hash for token input
 *   4. Generate the HMAC revocation token
 *   5. Assemble the full entry document
 *
 * The CSFLE encryption of `mobile` is NOT done here — buildVaultEntry returns
 * the entry with the plaintext mobile, and the caller (the POST endpoint)
 * does the encrypt-then-insert dance using the existing csfle helpers.
 * Keeps this function deterministic + easy to unit-test.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import type {
	OutreachVaultEntry,
	ConsentGateResult,
	VaultLoanType
} from './types.js';
import { validateConsentGates } from './consentTemplates.js';
import { generateRevocationToken } from './revocationToken.js';
import { mobileHashForToken } from './mobileHash.js';

/** Payload accepted by buildVaultEntry — what the API receives from the DSA. */
export interface BuildVaultInput {
	case_id: string;
	mobile: string;
	loan_profile: {
		loan_type: VaultLoanType;
		lender_id: string;
		lender_name: string;
		sanctioned_amount: number;
		sanctioned_roi: number;
		tenure_months: number;
		disbursement_date?: Date | string;
	};
	consent_doc_ref: {
		imagekit_file_id: string;
		imagekit_url: string;
		template_version: string;
		uploaded_at: Date | string;
	};
	consent_signed_at: Date | string;
	consent_expiry?: Date | string;
}

export type BuildVaultResult =
	| {
			ok: true;
			/** Ready to insert via Mongo. Caller encrypts `mobile` via CSFLE before insertOne. */
			entry: OutreachVaultEntry;
	  }
	| {
			ok: false;
			reason: 'consent_gates_failed' | 'invalid_loan_profile' | 'invalid_mobile';
			gate_result?: ConsentGateResult;
			detail?: string;
	  };

const MOBILE_REGEX = /^[6-9]\d{9}$/;

function parseDate(value: Date | string | undefined): Date | undefined {
	if (value === undefined) return undefined;
	const d = value instanceof Date ? value : new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Build a ready-to-insert OutreachVaultEntry. Pure — no DB, no CSFLE, no IO.
 *
 * @param input    The DSA-supplied payload (validated upstream by Zod or similar)
 * @param dsaId    The calling DSA's ObjectId (NEVER trust the payload for this)
 * @param nowMs    Injectable clock for tests; defaults to Date.now()
 */
export function buildVaultEntry(
	input: BuildVaultInput,
	dsaId: ObjectId,
	nowMs: number = Date.now()
): BuildVaultResult {
	// Gate 1: consent gates C1-C3
	const gateResult = validateConsentGates(input, nowMs);
	if (!gateResult.valid) {
		return { ok: false, reason: 'consent_gates_failed', gate_result: gateResult };
	}

	// Gate 2: mobile shape (Indian 10-digit starting 6-9)
	const normalizedMobile = String(input.mobile ?? '')
		.replace(/\s+/g, '')
		.replace(/^\+?91/, '')
		.replace(/^0/, '');
	if (!MOBILE_REGEX.test(normalizedMobile)) {
		return {
			ok: false,
			reason: 'invalid_mobile',
			detail: 'Mobile must be a 10-digit Indian number starting with 6-9.'
		};
	}

	// Gate 3: loan profile sanity (positive amounts, sensible ranges)
	const lp = input.loan_profile;
	if (
		!lp ||
		!Number.isFinite(lp.sanctioned_amount) ||
		lp.sanctioned_amount <= 0 ||
		!Number.isFinite(lp.sanctioned_roi) ||
		lp.sanctioned_roi <= 0 ||
		lp.sanctioned_roi > 50 || // 50% p.a. would be wildly out of policy for any loan we care about
		!Number.isFinite(lp.tenure_months) ||
		lp.tenure_months <= 0 ||
		lp.tenure_months > 600 // 50 years is the outermost sane tenure
	) {
		return {
			ok: false,
			reason: 'invalid_loan_profile',
			detail: 'Loan profile must include positive sanctioned_amount, sanctioned_roi (0-50%), tenure_months (0-600).'
		};
	}

	// All gates passed — assemble the entry.
	const entryId = new ObjectId();
	const mobileHash = mobileHashForToken(normalizedMobile);
	const revocationToken = generateRevocationToken({
		vault_entry_id: entryId.toString(),
		dsa_id: dsaId.toString(),
		mobile_hash: mobileHash
	});

	const now = new Date(nowMs);

	// Coerce all date-shaped fields. We've already validated them via the
	// consent gates above; safe to assume they parse.
	const consentSignedAt = parseDate(input.consent_signed_at)!;
	const consentDocUploadedAt = parseDate(input.consent_doc_ref.uploaded_at)!;
	const consentExpiry = parseDate(input.consent_expiry);
	const disbursementDate = parseDate(input.loan_profile.disbursement_date);

	const entry: OutreachVaultEntry = {
		_id: entryId,
		dsa_id: dsaId,
		case_id: input.case_id,
		mobile: normalizedMobile,
		loan_profile: {
			loan_type: lp.loan_type,
			lender_id: lp.lender_id,
			lender_name: lp.lender_name,
			sanctioned_amount: lp.sanctioned_amount,
			sanctioned_roi: lp.sanctioned_roi,
			tenure_months: lp.tenure_months,
			...(disbursementDate ? { disbursement_date: disbursementDate } : {})
		},
		consent_doc_ref: {
			imagekit_file_id: input.consent_doc_ref.imagekit_file_id,
			imagekit_url: input.consent_doc_ref.imagekit_url,
			template_version: input.consent_doc_ref.template_version,
			uploaded_at: consentDocUploadedAt
		},
		consent_signed_at: consentSignedAt,
		...(consentExpiry ? { consent_expiry: consentExpiry } : {}),
		revocation_token: revocationToken,
		consent_status: 'active',
		created_at: now,
		updated_at: now
	};

	return { ok: true, entry };
}
