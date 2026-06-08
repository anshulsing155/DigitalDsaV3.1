/**
 * DATA-2 — Consent template registry + gate validation.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §3.
 *
 * Adding a new consent template version requires a code change here —
 * intentional, so DSAs cannot upload arbitrary unsigned templates and
 * call them "consent." Every entry in this registry is a known, legally-
 * vetted form whose content has been audited to include:
 *   - The three permitted purposes (BT / DC / top-up) named explicitly
 *   - A revocation channel (URL or contact)
 *   - The grievance officer's contact details
 *   - A signature line
 *
 * The gate-validation function below applies the C1–C3 checks; gate C4
 * (template-level content correctness) is the act of being in this
 * registry — only registered versions are accepted, and registration
 * means the content has been reviewed.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { ConsentGateResult } from './types.js';

/**
 * Known consent template versions. Adding a new version here is a
 * deliberate act — content must be legally reviewed AND must include
 * the items listed in spec §3.
 *
 * To deprecate a version: keep its entry here so existing entries
 * stay valid (their consent_doc_ref.template_version is immutable
 * once signed), but the DSA UX can prevent NEW uploads against the
 * deprecated version via a separate `deprecated_at` field if needed.
 */
export interface ConsentTemplateInfo {
	version: string;
	effective_from: Date;
	deprecated_at?: Date;
	/** Short label for UI display. */
	label: string;
	/** Required content sections — the legal review checklist for this version. */
	required_sections: readonly string[];
}

export const CONSENT_TEMPLATE_VERSIONS: ReadonlyArray<ConsentTemplateInfo> = [
	{
		version: 'v1',
		effective_from: new Date('2026-05-01T00:00:00Z'),
		label: 'DigitalDSA Consent v1 — BT/DC/Top-Up outreach',
		required_sections: [
			'customer_name',
			'customer_mobile',
			'loan_reference',
			'dsa_name',
			'purpose_bt',
			'purpose_dc',
			'purpose_topup',
			'revocation_url',
			'grievance_contact',
			'signature_line'
		]
	}
];

/** Look up a template by version string. Returns undefined for unknown versions. */
export function findConsentTemplate(version: string): ConsentTemplateInfo | undefined {
	return CONSENT_TEMPLATE_VERSIONS.find((t) => t.version === version);
}

/** Maximum number of days between consent_signed_at and "today" at save time. */
export const CONSENT_MAX_AGE_DAYS = 90;

/**
 * Apply the C1–C3 gates from spec §3 to a save payload. C4 (template-
 * level content correctness) is implicit in `template_version` being in
 * the registry — see file header.
 *
 * Each gate produces a structured failure reason so the API can return
 * a 400 with `failed_gates: ['C2']` style payload, and the DSA-facing
 * UI can show exactly which field is the problem.
 *
 * `nowMs` is injectable for deterministic tests; defaults to Date.now().
 */
export function validateConsentGates(
	payload: {
		consent_doc_ref?: {
			imagekit_file_id?: string;
			template_version?: string;
			uploaded_at?: Date | string;
		};
		consent_signed_at?: Date | string;
	},
	nowMs: number = Date.now()
): ConsentGateResult {
	const failed: string[] = [];
	const reasons: Record<string, string> = {};

	// ── C1: document present ────────────────────────────────────────
	const fileId = payload.consent_doc_ref?.imagekit_file_id;
	if (!fileId || typeof fileId !== 'string' || fileId.trim() === '') {
		failed.push('C1');
		reasons['C1'] = 'Consent document is missing — upload the signed document before saving.';
	}

	// ── C2: template version known ─────────────────────────────────
	const templateVersion = payload.consent_doc_ref?.template_version;
	if (!templateVersion || !findConsentTemplate(templateVersion)) {
		failed.push('C2');
		reasons['C2'] =
			'Consent template version is unknown. Use a current platform-issued template.';
	}

	// ── C3: signed date valid (in past, ≤ 90 days old) ─────────────
	const signedAtRaw = payload.consent_signed_at;
	if (!signedAtRaw) {
		failed.push('C3');
		reasons['C3'] = 'Consent signed date is required.';
	} else {
		const signedAt = signedAtRaw instanceof Date ? signedAtRaw : new Date(signedAtRaw);
		const signedAtMs = signedAt.getTime();

		if (Number.isNaN(signedAtMs)) {
			failed.push('C3');
			reasons['C3'] = 'Consent signed date is not a valid date.';
		} else if (signedAtMs > nowMs) {
			failed.push('C3');
			reasons['C3'] = 'Consent signed date cannot be in the future.';
		} else {
			const ageDays = (nowMs - signedAtMs) / (1000 * 60 * 60 * 24);
			if (ageDays > CONSENT_MAX_AGE_DAYS) {
				failed.push('C3');
				reasons['C3'] = `Consent signed date is older than ${CONSENT_MAX_AGE_DAYS} days. Get a fresh signed consent.`;
			}
		}
	}

	return {
		valid: failed.length === 0,
		failed_gates: failed,
		reasons
	};
}
