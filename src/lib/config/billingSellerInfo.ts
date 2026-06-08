/**
 * D.2 — Seller information for GST invoices
 * ══════════════════════════════════════════════════════════════════════
 * Static-but-environment-driven seller identity printed on every GST
 * invoice (legal-entity name, GSTIN, registered state, address).
 *
 * Why env vars: these change rarely but DO change occasionally (address
 * relocations, GSTIN updates after re-registration). Hardcoding them in
 * source means a code deploy for every change — wrong. Env vars let the
 * operator update via Vercel dashboard.
 *
 * Required in production:
 *   INVOICE_SELLER_GSTIN       — e.g. "27AAACD1234E1Z5" (15-char GSTIN)
 *   INVOICE_SELLER_LEGAL_NAME  — e.g. "DigitalDSA Pvt Ltd"
 *   INVOICE_SELLER_STATE_CODE  — 2-letter state code, e.g. "MH"
 *   INVOICE_SELLER_ADDRESS     — single-line postal address for PDF header
 *
 * Falls back to clearly-marked placeholder values in dev so local flows
 * don't break — but invoices generated in dev look obviously fake to
 * deter copy-pasting them into the wild.
 *
 * The placeholders deliberately include "DEV PLACEHOLDER" so an operator
 * who sees one in a screenshot knows immediately that env vars aren't set.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2
 * ══════════════════════════════════════════════════════════════════════
 */

import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import logger from '$lib/server/logger';

export interface BillingSellerInfo {
	legal_name: string;
	gstin: string;
	state_code: string;
	address: string;
}

/**
 * Resolve the seller info from env. THROWS in production if any field
 * is missing — we don't want to ship invoices with placeholder values.
 *
 * Cached per-process via a lazy module-scope variable; first call reads
 * env, subsequent calls return the cached value. Restarting the process
 * picks up env-var changes (standard Vercel deploy flow).
 */
let cached: BillingSellerInfo | null = null;
let warnedAboutDevDefaults = false;

export function getBillingSellerInfo(): BillingSellerInfo {
	if (cached) return cached;

	const gstin = env.INVOICE_SELLER_GSTIN;
	const legal_name = env.INVOICE_SELLER_LEGAL_NAME;
	const state_code = env.INVOICE_SELLER_STATE_CODE;
	const address = env.INVOICE_SELLER_ADDRESS;

	const allSet = gstin && legal_name && state_code && address;

	if (allSet) {
		cached = {
			gstin: gstin!.trim().toUpperCase(),
			legal_name: legal_name!.trim(),
			state_code: state_code!.trim().toUpperCase(),
			address: address!.trim()
		};
		return cached;
	}

	if (dev) {
		// Dev fallback — clearly marked. Never used in production because
		// the `if (!dev)` branch below throws.
		if (!warnedAboutDevDefaults) {
			logger.warn(
				'INVOICE_SELLER_* env vars not set — using DEV PLACEHOLDER values. ' +
					'Set INVOICE_SELLER_GSTIN, INVOICE_SELLER_LEGAL_NAME, ' +
					'INVOICE_SELLER_STATE_CODE, INVOICE_SELLER_ADDRESS in production. ' +
					'This warning fires once per process.'
			);
			warnedAboutDevDefaults = true;
		}
		cached = {
			gstin: '27AAACD0000E1Z5',
			legal_name: 'DigitalDSA Pvt Ltd (DEV PLACEHOLDER)',
			state_code: 'MH',
			address: 'DEV PLACEHOLDER — set INVOICE_SELLER_ADDRESS in production'
		};
		return cached;
	}

	throw new Error(
		'INVOICE_SELLER_* env vars are required in production. Missing: ' +
			[
				!gstin && 'INVOICE_SELLER_GSTIN',
				!legal_name && 'INVOICE_SELLER_LEGAL_NAME',
				!state_code && 'INVOICE_SELLER_STATE_CODE',
				!address && 'INVOICE_SELLER_ADDRESS'
			]
				.filter(Boolean)
				.join(', ')
	);
}

/**
 * GST HSN/SAC code for SaaS / Information Technology Services.
 * 998314 = "IT software, etc." per the official CBIC SAC list.
 *
 * Locked here as a constant; if the product ever spans multiple HSN/SAC
 * codes (e.g., adding consulting which is 998599), this becomes a
 * per-plan field on PLANS.
 */
export const HSN_SAC_SAAS = '998314';

/** Invoice number prefix — first segment of the invoice number string. */
export const INVOICE_NUMBER_PREFIX = 'DDSA';
