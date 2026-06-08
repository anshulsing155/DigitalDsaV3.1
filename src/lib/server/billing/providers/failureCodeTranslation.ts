/**
 * D.1 Recurring Billing — Razorpay → normalized failure-code translation
 * ══════════════════════════════════════════════════════════════════
 * Per §3.3: each provider's error vocabulary is mapped to OUR
 * normalized FailureCode at the adapter boundary. The state machine
 * (S4 retry, S5 dunning, R3 mandate-invalid handling) keys off the
 * normalized code and never sees provider-specific strings.
 *
 * Source of truth for Razorpay's error codes:
 *   https://razorpay.com/docs/api/errors/
 *   https://razorpay.com/docs/payments/payments/refunds/refund-processing/
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.3 + R11.2 #4
 * ══════════════════════════════════════════════════════════════════
 */

import type { FailureCode } from './BillingProvider';

/**
 * Shape of the Razorpay error envelope (from a failed charge response).
 * Razorpay returns top-level `error.code` (a coarse classification like
 * `BAD_REQUEST_ERROR` / `GATEWAY_ERROR`) plus `error.description` (a
 * specific human-readable message). Many "BAD_REQUEST" outcomes are
 * actually NACH/mandate failures we need to distinguish.
 *
 * We also key off `error.reason` (a Razorpay-internal classification)
 * when present — it's more reliable than description string-matching.
 */
export interface RazorpayErrorShape {
	code?: string;
	description?: string;
	reason?: string;
	source?: string;
	step?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Translate a Razorpay error response into our normalized FailureCode.
 *
 * Strategy:
 *   1. Match on `error.reason` when present (Razorpay's structured field).
 *   2. Fall back to description-string matching for known patterns.
 *   3. Default to `UNKNOWN` — surfaces as operator alert per R11 spec.
 *
 * Tests cover every Razorpay reason code that maps to a non-UNKNOWN
 * outcome; unknown reasons map to UNKNOWN deliberately so we get an
 * audit row + alert when Razorpay adds a new code.
 */
export function translateRazorpayFailure(error: RazorpayErrorShape | null | undefined): FailureCode {
	if (!error) return 'UNKNOWN';

	const reason = (error.reason ?? '').toLowerCase();
	const description = (error.description ?? '').toLowerCase();

	// ── INSUFFICIENT_FUNDS ──
	// Razorpay reason codes for insufficient balance at the bank
	if (
		reason === 'insufficient_funds' ||
		reason === 'payment_failed_insufficient_funds' ||
		reason === 'invalid_account_balance' ||
		description.includes('insufficient balance') ||
		description.includes('insufficient funds')
	) {
		return 'INSUFFICIENT_FUNDS';
	}

	// ── MANDATE_INVALID ──
	// Mandate revoked at bank, expired, deregistered, or never authorized
	if (
		reason === 'mandate_revoked' ||
		reason === 'mandate_expired' ||
		reason === 'mandate_failed' ||
		reason === 'mandate_not_authorized' ||
		reason === 'invalid_token' ||
		reason === 'token_expired' ||
		reason === 'token_inactive' ||
		description.includes('mandate has been revoked') ||
		description.includes('mandate is not active') ||
		description.includes('token expired')
	) {
		return 'MANDATE_INVALID';
	}

	// ── BANK_DECLINED ──
	// Generic bank-side rejection — Razorpay's `error.source` is often `bank`
	if (
		reason === 'payment_declined_by_bank' ||
		reason === 'do_not_honor' ||
		reason === 'transaction_declined' ||
		reason === 'bank_declined' ||
		reason === 'issuer_unavailable' ||
		reason === 'card_acquirer_failure' ||
		description.includes('declined by the bank') ||
		description.includes('issuer unavailable')
	) {
		return 'BANK_DECLINED';
	}

	// ── PROVIDER_TIMEOUT ──
	// Razorpay couldn't reach the bank, or the bank didn't respond in time
	if (
		reason === 'gateway_timeout' ||
		reason === 'network_error' ||
		reason === 'timeout' ||
		description.includes('gateway timed out') ||
		description.includes('network error')
	) {
		return 'PROVIDER_TIMEOUT';
	}

	// ── Default: UNKNOWN ──
	// Surfaces in audit + alerts operator (R11). When Razorpay adds a new
	// reason code or changes wording, this is where we catch it.
	return 'UNKNOWN';
}

/**
 * Reverse lookup table — for tests + admin tooling.
 * Lists known Razorpay reason codes per normalized FailureCode.
 *
 * NOT used in production code paths (the translate function is the
 * actual mapping). This is just for documentation + test coverage.
 */
export const RAZORPAY_REASON_BY_FAILURE_CODE: Record<FailureCode, readonly string[]> = {
	INSUFFICIENT_FUNDS: [
		'insufficient_funds',
		'payment_failed_insufficient_funds',
		'invalid_account_balance'
	],
	MANDATE_INVALID: [
		'mandate_revoked',
		'mandate_expired',
		'mandate_failed',
		'mandate_not_authorized',
		'invalid_token',
		'token_expired',
		'token_inactive'
	],
	BANK_DECLINED: [
		'payment_declined_by_bank',
		'do_not_honor',
		'transaction_declined',
		'bank_declined',
		'issuer_unavailable',
		'card_acquirer_failure'
	],
	PROVIDER_TIMEOUT: ['gateway_timeout', 'network_error', 'timeout'],
	UNKNOWN: [] // by definition, no specific reasons map to UNKNOWN
} as const;
