/**
 * D.1 S3 — R11 simulate-charge test driver
 * ══════════════════════════════════════════════════════════════════
 * POST /api/test/billing/simulate-charge
 *
 * Body:
 *   { dsa_id: string,
 *     outcome: 'succeeded' | 'failed_retryable' | 'failed_mandate_invalid' | 'cancel_at_end' }
 *
 * Drives the chargeEngine against a REAL DB subscription row without
 * waiting for an anchor day. Used by the M6 smoke runbook + unit-test
 * helpers.
 *
 * Mechanics:
 *   - Look up the subscription by dsa_id
 *   - For 'cancel_at_end': set cancel_at_cycle_end=true, then call engine
 *     (engine will transition active→cancelled and return skipped_cancel_at_end)
 *   - For charge outcomes: fast-forward next_charge_at to now, instantiate
 *     a MockProvider with the requested outcome programmed for the sub's
 *     mandate_token, then call processOneSubscription
 *   - Return the outcome plus the before/after subscription doc
 *
 * Dev-only gate (per critique P1-7, matches simulate-event endpoint).
 *
 * IMPORTANT: this endpoint MUTATES the DB row. Only run against
 * test/dev data. The dev gate is the enforcement — in production
 * (dev === false) the endpoint returns 404.
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse';
import { ObjectId } from 'mongodb';
import { BillingSubscriptions } from '$lib/database/mongo';
import { processOneSubscription } from '$lib/server/billing/chargeEngine';
import { MockProvider } from '$lib/server/billing/providers/mock';
import type {
	BillingProvider,
	ChargeRequest,
	ChargeResult,
	FailureCode
} from '$lib/server/billing/providers/BillingProvider';
import logger from '$lib/server/logger';

type SimulateOutcome =
	| 'succeeded'
	| 'failed_retryable'
	| 'failed_mandate_invalid'
	| 'cancel_at_end';

interface SimulateChargePayload {
	dsa_id: string;
	outcome: SimulateOutcome;
}

function isValidOutcome(s: unknown): s is SimulateOutcome {
	return (
		s === 'succeeded' ||
		s === 'failed_retryable' ||
		s === 'failed_mandate_invalid' ||
		s === 'cancel_at_end'
	);
}

export const POST: RequestHandler = async (event) => {
	if (!dev) return new Response(null, { status: 404 });

	const parsed = await parseJsonBody<SimulateChargePayload>(event.request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	if (!body?.dsa_id || !ObjectId.isValid(body.dsa_id)) {
		return apiError('Invalid dsa_id', 400);
	}
	if (!isValidOutcome(body?.outcome)) {
		return apiError(
			'Invalid outcome — expected one of: succeeded, failed_retryable, failed_mandate_invalid, cancel_at_end',
			400
		);
	}

	try {
		const dsaOid = new ObjectId(body.dsa_id);
		const before = await BillingSubscriptions.findOne({ dsa_id: dsaOid });
		if (!before) return apiError('Subscription not found for dsa_id', 404);

		// cancel_at_end branch — set the flag, then run the engine (which
		// will see the flag and transition cancelled). Don't bother registering
		// a mock provider; the engine returns before calling chargeMandate.
		if (body.outcome === 'cancel_at_end') {
			await BillingSubscriptions.updateOne(
				{ _id: before._id },
				{ $set: { cancel_at_cycle_end: true, updated_at: new Date() } }
			);
			const reloaded = await BillingSubscriptions.findOne({ _id: before._id });
			const provider = new MockProvider(); // unused but required by the signature
			const outcome = await processOneSubscription(reloaded!, {
				provider,
				sendConfirmationEmail: false
			});
			const after = await BillingSubscriptions.findOne({ _id: before._id });
			return apiOk({ outcome, before: redactSub(before), after: redactSub(after) });
		}

		// Charge outcome branches — fast-forward next_charge_at to now if it's
		// in the future. (If it's already <= now, leave it; that's the natural
		// anchor-day case.)
		const now = new Date();
		if (before.next_charge_at && before.next_charge_at > now) {
			await BillingSubscriptions.updateOne(
				{ _id: before._id },
				{ $set: { next_charge_at: now, updated_at: now } }
			);
		}
		const reloaded = await BillingSubscriptions.findOne({ _id: before._id });
		if (!reloaded?.mandate_token) {
			return apiError(
				'Subscription has no mandate_token — cannot simulate charge. Run S2 mandate registration first.',
				400
			);
		}

		// Build an inline provider stub that returns exactly the requested
		// outcome. Cleaner than reaching into MockProvider's private mandate
		// registry to inject the sub's token, which TS rightly blocks.
		// MockProvider is delegated-to for refund/queryMandateStatus/etc which
		// chargeEngine doesn't call, but kept for completeness.
		const baseMock = new MockProvider();
		const provider: BillingProvider = {
			...baseMock,
			name: 'mock' as const,
			async chargeMandate(req: ChargeRequest): Promise<ChargeResult> {
				if (body.outcome === 'succeeded') {
					return {
						status: 'succeeded',
						provider_payment_id: `simulate_pay_${req.attempt_id.slice(0, 8)}`,
						raw_response: { simulate: true, outcome: 'succeeded' }
					};
				}
				if (body.outcome === 'failed_retryable') {
					return {
						status: 'failed',
						failure_code: 'INSUFFICIENT_FUNDS' as FailureCode,
						failure_message: 'Simulated insufficient funds',
						raw_response: { simulate: true, outcome: 'failed_retryable' }
					};
				}
				// failed_mandate_invalid
				return {
					status: 'failed',
					failure_code: 'MANDATE_INVALID' as FailureCode,
					failure_message: 'Simulated mandate revoked',
					raw_response: { simulate: true, outcome: 'failed_mandate_invalid' }
				};
			},
			// Bind these so they keep `this` semantics on the underlying mock.
			refundCharge: baseMock.refundCharge.bind(baseMock),
			queryMandateStatus: baseMock.queryMandateStatus.bind(baseMock),
			revokeMandate: baseMock.revokeMandate.bind(baseMock),
			fetchSettlements: baseMock.fetchSettlements.bind(baseMock),
			verifyWebhookSignature: baseMock.verifyWebhookSignature.bind(baseMock),
			parseWebhookEvent: baseMock.parseWebhookEvent.bind(baseMock),
			registerMandate: baseMock.registerMandate.bind(baseMock)
		};

		const outcome = await processOneSubscription(reloaded, {
			provider,
			sendConfirmationEmail: false,
			now
		});
		const after = await BillingSubscriptions.findOne({ _id: before._id });

		logger.info(
			{ dsa_id: body.dsa_id, outcome: outcome.kind, requested: body.outcome },
			'simulate-charge: complete'
		);
		return apiOk({ outcome, before: redactSub(before), after: redactSub(after) });
	} catch (err) {
		return apiServerError(err, 'simulate-charge failed');
	}
};

/**
 * Strip PII from the subscription doc for the response. The endpoint is
 * dev-only but defensive scrubbing is cheap.
 */
function redactSub(sub: unknown): unknown {
	if (!sub || typeof sub !== 'object') return sub;
	const s = sub as Record<string, unknown>;
	const copy = { ...s };
	if (typeof copy.mandate_token === 'string') copy.mandate_token = '[redacted]';
	if (typeof copy.customer_email === 'string') copy.customer_email = '[redacted]';
	if (typeof copy.customer_mobile === 'string') copy.customer_mobile = '[redacted]';
	return copy;
}
