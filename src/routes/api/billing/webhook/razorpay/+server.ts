/**
 * POST /api/billing/webhook/razorpay
 * ══════════════════════════════════════════════════════════════════
 * Inbound webhook from Razorpay. Dispatches state transitions per
 * §3.2.1 transition table based on the event_type.
 *
 * Security:
 *   - HMAC-SHA256 signature verification (X-Razorpay-Signature header)
 *     against RAZORPAY_WEBHOOK_SECRET — invalid signature → 401
 *   - Idempotent via processedWebhookEvents — duplicate event_id → 200 no-op
 *   - NO auth header (Razorpay doesn't send one; signature is the auth)
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2 + §6
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';
import {
	applyTransition,
	checkAndMarkWebhookProcessed,
	findByMandateToken,
	findByPendingRegistrationId,
	findByPendingReplacementRegistrationId,
	swapMandateAfterReplacement
} from '$lib/server/billing/subscriptionStore';
import { firstChargeAtForSubscribe, assignAnchor } from '$lib/server/billing/anchorAssignment';
import { recordTrialGrant } from '$lib/server/billing/trialEligibility';
import { TRIAL_DAYS } from '$lib/config/billing';
import {
	BillingSubscriptions,
	ChargeAttempts,
	BillingTransactions
} from '$lib/database/mongo';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';
import type {
	NormalizedEvent,
	FailureCode
} from '$lib/server/billing/providers/BillingProvider';
import type { RecurringBillingTransactionDoc } from '$lib/types/billingSubscription';

export const POST: RequestHandler = async ({ request }) => {
	// Read raw body for HMAC verification (must verify BEFORE parsing).
	const rawBody = await request.text();
	const signature = request.headers.get('x-razorpay-signature') ?? '';

	const provider = getBillingProvider();
	if (!provider.verifyWebhookSignature(rawBody, signature)) {
		logger.warn({ sig_present: !!signature }, 'razorpay webhook: signature verification failed');
		return apiError('Invalid webhook signature', 401);
	}

	// Parse + normalize.
	let parsedBody: unknown;
	try {
		parsedBody = JSON.parse(rawBody);
	} catch {
		return apiError('Invalid JSON body', 400);
	}

	const normalized = provider.parseWebhookEvent(parsedBody);
	if (!normalized) {
		// Event we don't subscribe to → 200 no-op (Razorpay retries non-200s).
		logger.debug({ body: parsedBody }, 'razorpay webhook: unhandled event type');
		return apiOk({ ignored: true });
	}

	// Idempotency check.
	const { firstTime } = await checkAndMarkWebhookProcessed(normalized.provider_event_id);
	if (!firstTime) {
		logger.info(
			{ provider_event_id: normalized.provider_event_id, event_type: normalized.event_type },
			'razorpay webhook: duplicate event, no-op'
		);
		return apiOk({ duplicate: true });
	}

	logger.info(
		{
			provider_event_id: normalized.provider_event_id,
			event_type: normalized.event_type,
			mandate_token: normalized.mandate_token ? '[redacted]' : undefined,
			provider_payment_id: normalized.provider_payment_id
		},
		'razorpay webhook: received'
	);

	try {
		switch (normalized.event_type) {
			case 'mandate.authorized':
				await handleMandateAuthorized(normalized);
				break;
			case 'mandate.revoked':
				await handleMandateRevoked(normalized);
				break;
			case 'charge.succeeded':
				await handleChargeSucceeded(normalized);
				break;
			case 'charge.failed':
				await handleChargeFailed(normalized);
				break;
			case 'settlement.completed':
				logger.info(
					{ provider_event_id: normalized.provider_event_id },
					'razorpay webhook: settlement.completed — S7 reconcile cron consumes'
				);
				break;
			default:
				logger.warn(
					{ event_type: normalized.event_type },
					'razorpay webhook: known but unhandled event'
				);
		}

		return apiOk({ processed: true, event_type: normalized.event_type });
	} catch (err) {
		// IMPORTANT: don't return 500 if handler fails — Razorpay will retry
		// up to 5 times with exponential backoff. If our handler has a bug,
		// 500s create a thundering herd. Log + 200 with error flag so the
		// retry doesn't fire; we recover via reconcile cron / replay.
		logger.error({ err, provider_event_id: normalized.provider_event_id }, 'razorpay webhook: handler failed');
		return apiServerError(err, 'Webhook handler error (logged for replay)');
	}
};

// ── Handlers ──

/**
 * mandate.authorized — DSA completed bank-side authorization.
 *
 * Two distinct flows land here (S6 M3 added the second):
 *   (A) INITIAL subscribe — subscription is in pending_mandate; this is
 *       the first mandate. Look up by pending_registration_id and
 *       transition pending_mandate → active (§3.2.1 #2). Sets
 *       mandate_token, anchor_day, next_charge_at.
 *   (B) REPLACEMENT (S6 M3 update-payment-method) — subscription is in
 *       active or dunning_X or paused with `pending_replacement_registration_id`
 *       set. This is a 1:1 mandate swap. Swap mandate_token atomically,
 *       clear replacement bookkeeping, best-effort revoke the old
 *       mandate at the provider. State is NOT changed (active stays
 *       active, etc).
 *
 * We probe for (B) FIRST when we have a pending_registration_id, because
 * a doc in (B) by construction is not in pending_mandate state — the
 * (A) lookup wouldn't match anyway, but probing the replacement field
 * first short-circuits the fallback heuristic that would otherwise grab
 * an unrelated pending row.
 */
async function handleMandateAuthorized(normalized: {
	mandate_token?: string;
	raw: unknown;
}): Promise<void> {
	const newToken = normalized.mandate_token;
	if (!newToken) {
		logger.warn('mandate.authorized event missing mandate_token — cannot process');
		return;
	}

	// Razorpay's webhook for token.confirmed sometimes includes the
	// registration_link reference in payload.token.entity.entity_id; we
	// can fall back to looking up any pending_mandate row whose mandate_token
	// is unset (less precise but works for the common case of one-pending-per-DSA).
	// Best-effort: try to extract from raw payload if possible.
	const raw = normalized.raw as
		| { payload?: { token?: { entity?: { customer_id?: string; entity_id?: string } } } }
		| undefined;
	const pendingRegFromPayload = raw?.payload?.token?.entity?.entity_id;

	// ── Flow (B): REPLACEMENT mandate (S6 M3) ──
	// Probed first because a replacement-in-flight doc is not in pending_mandate
	// state — the (A) lookup will miss it and the (A) fallback heuristic
	// (`state=pending_mandate AND no token`) could wrongly grab a different
	// DSA's stale pending row.
	//
	// Defensive: confirm the returned doc actually carries the matching
	// `pending_replacement_registration_id`. The findOne filter should make
	// this a tautology in real Mongo, but we don't want a future query
	// helper change (or a permissive test mock) to silently route a normal
	// pending_mandate → active flow through the replacement-swap path.
	if (pendingRegFromPayload) {
		const replacementMatch =
			await findByPendingReplacementRegistrationId(pendingRegFromPayload);
		if (
			replacementMatch &&
			replacementMatch.pending_replacement_registration_id === pendingRegFromPayload
		) {
			const swap = await swapMandateAfterReplacement(pendingRegFromPayload, newToken);
			if (!swap) {
				// Lost the precondition race — another webhook (duplicate or
				// related event) already swapped. processedWebhookEvents
				// caught it at the top of the handler; this is a defensive
				// log only.
				logger.info(
					{ pending_reg: pendingRegFromPayload, token_prefix: newToken.slice(0, 8) },
					'mandate.authorized (replacement): swap no-op — already applied'
				);
				return;
			}

			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'mandate_replaced',
				subscription_id: swap.subscription._id,
				dsa_id: swap.subscription.dsa_id,
				actor: 'webhook',
				payload: {
					source: 'webhook mandate.authorized (replacement)',
					pending_registration_id: pendingRegFromPayload,
					previous_token_prefix: swap.previous_mandate_token?.slice(0, 8),
					new_token_prefix: newToken.slice(0, 8),
					subscription_state: swap.subscription.state
				}
			});

			logger.info(
				{
					dsa_id: String(swap.subscription.dsa_id),
					state: swap.subscription.state,
					pending_reg: pendingRegFromPayload
				},
				'mandate.authorized (replacement): mandate swapped'
			);

			// Best-effort revoke of the old mandate at the provider. Failure
			// is non-fatal — our-side swap already removed our use of the
			// old token, so even if provider revocation fails the DSA can't
			// be re-charged through our cron on it.
			if (swap.previous_mandate_token) {
				try {
					const provider = getBillingProvider();
					const revokeResult = await provider.revokeMandate(swap.previous_mandate_token);
					await writeBillingAuditLog({
						event_class: 'admin_action',
						event_name: 'mandate_revoke_attempt',
						subscription_id: swap.subscription._id,
						dsa_id: swap.subscription.dsa_id,
						actor: 'webhook',
						payload: {
							revoke_status: revokeResult.status,
							previous_token_prefix: swap.previous_mandate_token.slice(0, 8)
						}
					});
					if (revokeResult.status !== 'succeeded') {
						logger.warn(
							{
								dsa_id: String(swap.subscription.dsa_id),
								revoke_status: revokeResult.status
							},
							'mandate.authorized (replacement): provider revoke did not succeed — operator follow-up needed'
						);
					}
				} catch (err) {
					logger.error(
						{ err, dsa_id: String(swap.subscription.dsa_id) },
						'mandate.authorized (replacement): provider revoke threw — operator follow-up needed'
					);
				}
			}
			return;
		}
	}

	// ── Flow (A): INITIAL subscribe — pending_mandate → active ──
	let doc = null;
	if (pendingRegFromPayload) {
		doc = await findByPendingRegistrationId(pendingRegFromPayload);
	}
	if (!doc) {
		// Fallback: find any pending_mandate row that doesn't yet have a token
		// (one-pending-per-DSA is the v1 invariant).
		doc = await BillingSubscriptions.findOne({
			state: 'pending_mandate',
			mandate_token: { $exists: false }
		});
	}

	if (!doc) {
		logger.warn(
			{ pending_reg: pendingRegFromPayload, token_prefix: newToken.slice(0, 8) },
			'mandate.authorized: no matching pending subscription found'
		);
		return;
	}

	const now = new Date();
	// TRIAL_DAYS imported from $lib/config/billing — single source of truth
	// across API handlers + landing-page copy. Previously shadowed locally
	// to 30 here, which masked a stale `7` in the shared constant.
	const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
	const isTrial = doc.is_trial === true;

	// Trial path: first charge deferred TRIAL_DAYS; anchor still computed so
	// that POST-trial cycles fall on a stable anchor day (the next-anchor
	// math at next_charge_at after the first trial-end charge will land
	// the DSA back on a normal monthly cadence). The cron sees state=active
	// + next_charge_at <= now and charges; trial users just have a far-
	// future next_charge_at.
	const anchor = assignAnchor(now);
	const firstCharge = isTrial ? new Date(now.getTime() + TRIAL_MS) : firstChargeAtForSubscribe(now);
	const trialUntil = isTrial ? new Date(now.getTime() + TRIAL_MS) : undefined;

	await applyTransition(
		doc.dsa_id,
		'pending_mandate',
		'active',
		isTrial ? 'webhook mandate.authorized (trial)' : 'webhook mandate.authorized',
		{
			mandate_token: newToken,
			anchor_day: anchor,
			next_charge_at: firstCharge,
			...(trialUntil && { trial_until: trialUntil })
		},
		{
			provider_event_correlation: pendingRegFromPayload,
			...(isTrial && { is_trial_grant: true })
		}
	);

	// Trial path: stamp the abuse-defense blocklist NOW (post-authorization)
	// so a DSA who abandoned the auth flow earlier doesn't burn their trial
	// without ever using it. recordTrialGrant catches E11000 cleanly — safe
	// to call on webhook replay (idempotent at the row level).
	//
	// We pass the pre-computed `pending_device_id_hash` from the doc (set
	// at subscribe-recurring time) so the device-id row joins the mobile/
	// PAN/GST rows in the blocklist. If the client couldn't supply a
	// device_id, the field is absent and the gate gracefully degrades to
	// the 3 PII identifiers.
	if (isTrial) {
		try {
			const grantResult = await recordTrialGrant({
				dsa_id: doc.dsa_id,
				device_id_hash: doc.pending_device_id_hash ?? null
			});
			logger.info(
				{
					dsa_id: doc.dsa_id.toString(),
					blocklist_inserted: grantResult.inserted,
					device_hash_present: !!doc.pending_device_id_hash
				},
				'webhook mandate.authorized: trial blocklist hashes recorded'
			);

			// Best-effort cleanup of the pending_device_id_hash field — the
			// blocklist row is now the source of truth, the sub doc no
			// longer needs the hash. Failure is non-fatal (the data is
			// just a tiny field; doesn't affect any downstream consumer).
			if (doc.pending_device_id_hash) {
				await BillingSubscriptions.updateOne(
					{ _id: doc._id },
					{ $unset: { pending_device_id_hash: '' } }
				).catch((err) => {
					logger.warn(
						{ dsa_id: doc.dsa_id.toString(), err: (err as Error).message },
						'webhook mandate.authorized: pending_device_id_hash cleanup failed (non-fatal)'
					);
				});
			}
		} catch (err) {
			// Don't let blocklist failure roll back the mandate transition —
			// the trial is live, the gate is just temporarily weaker. Log
			// loudly so ops can backfill if needed.
			logger.error(
				{
					dsa_id: doc.dsa_id.toString(),
					err: (err as Error).message
				},
				'webhook mandate.authorized: trial blocklist insert FAILED — operator follow-up'
			);
		}
	}
}

/**
 * charge.succeeded — confirmation that a recurring charge cleared.
 *
 * The S3 cron (chargeEngine) is the AUTHORITATIVE path for the renewal
 * cycle. Its two-phase persist writes ChargeAttempts + applyTransition +
 * BillingTransaction inside one call. By the time this webhook fires,
 * the cron has usually ALREADY recorded success.
 *
 * Webhook role here:
 *   1. AUDIT — write a webhook_event audit row regardless
 *   2. CROSS-CHECK — if no ChargeAttempt with this provider_payment_id
 *      exists, that's a charge that happened OUTSIDE our cron (operator
 *      manual trigger, future dunning retry path, etc). Write a
 *      defensive BillingTransaction (kind: 'webhook_confirmation') and
 *      log loudly so the operator notices. No state transition — the
 *      reconcile cron (S7) will sweep these.
 *   3. NO STATE TRANSITION here. The cron owns state.
 *
 * Idempotency:
 *   - processedWebhookEvents (top of handler) catches Razorpay's retry
 *   - we additionally short-circuit if BillingTransactions already has
 *     a row with this provider_payment_id (covers the cron-already-wrote
 *     path; the webhook is then purely an audit emit)
 */
async function handleChargeSucceeded(normalized: NormalizedEvent): Promise<void> {
	const provider_payment_id = normalized.provider_payment_id;
	if (!provider_payment_id) {
		logger.warn('charge.succeeded: missing provider_payment_id');
		return;
	}

	const attempt = await ChargeAttempts.findOne({ provider_payment_id });
	const existingTx = await BillingTransactions.findOne({
		kind: { $in: ['recurring_charge', 'webhook_confirmation'] },
		provider_payment_id
	} as unknown as Record<string, unknown>);

	await writeBillingAuditLog({
		event_class: 'webhook_event',
		event_name: 'charge.succeeded',
		actor: 'webhook',
		event_id: normalized.provider_event_id,
		subscription_id: attempt?.subscription_id,
		dsa_id: attempt?.dsa_id,
		payload: {
			provider_payment_id,
			attempt_id: attempt?.attempt_id,
			cron_already_recorded: !!attempt && attempt.status === 'succeeded',
			tx_already_exists: !!existingTx
		}
	});

	// If the cron already wrote a transaction for this payment, the webhook
	// is purely confirmation — nothing more to do.
	if (existingTx) {
		logger.info(
			{ provider_payment_id, kind: existingTx.kind },
			'charge.succeeded: cron already recorded — webhook is confirmation only'
		);
		return;
	}

	// No ChargeAttempt either? This is an orphan charge — happened outside
	// our cron path. Write a defensive transaction so reconcile (S7) sees it
	// and an operator can investigate. We cannot transition state because
	// we don't have a subscription_id to act on.
	if (!attempt) {
		logger.warn(
			{ provider_payment_id, amount_paise: normalized.amount_paise },
			'charge.succeeded: NO ChargeAttempt found — orphan charge, will be picked up by reconcile cron'
		);
		return;
	}

	// We have a ChargeAttempt but no transaction — cron crashed between
	// persisting the attempt and writing the tx. Write the tx now (kind:
	// 'webhook_confirmation' so reconcile can tell who wrote it).
	const tx: RecurringBillingTransactionDoc = {
		kind: 'webhook_confirmation',
		dsa_id: attempt.dsa_id,
		subscription_id: attempt.subscription_id,
		attempt_id: attempt.attempt_id,
		plan_id: attempt.plan_id,
		amount_paise: normalized.amount_paise ?? attempt.amount_paise,
		status: 'succeeded',
		provider: 'razorpay',
		provider_payment_id,
		cycle_anchor: attempt.cycle_anchor,
		charged_at: normalized.occurred_at,
		created_at: new Date()
	};
	await BillingTransactions.insertOne(tx);
	logger.info(
		{ provider_payment_id, subscription_id: attempt.subscription_id.toString() },
		'charge.succeeded: webhook wrote BillingTransaction (cron crashed mid-call, recovered)'
	);
}

/**
 * charge.failed — confirmation that a recurring charge failed.
 *
 * Same separation of concerns as charge.succeeded:
 *   - Cron's two-phase persist already updated the ChargeAttempt + transitioned
 *     the subscription state (active→dunning_t0 or active→downgraded).
 *   - Webhook role: AUDIT the event, CROSS-CHECK that the cron path saw it.
 *   - NO state transition from the webhook. The S4 retry state machine
 *     (future) will own dunning escalation; for S3 the cron is authoritative.
 */
async function handleChargeFailed(normalized: NormalizedEvent): Promise<void> {
	const provider_payment_id = normalized.provider_payment_id;
	const failure_code = normalized.failure_code as FailureCode | undefined;

	const attempt = provider_payment_id
		? await ChargeAttempts.findOne({ provider_payment_id })
		: null;

	await writeBillingAuditLog({
		event_class: 'webhook_event',
		event_name: 'charge.failed',
		actor: 'webhook',
		event_id: normalized.provider_event_id,
		subscription_id: attempt?.subscription_id,
		dsa_id: attempt?.dsa_id,
		payload: {
			provider_payment_id,
			failure_code,
			attempt_id: attempt?.attempt_id,
			cron_already_recorded: !!attempt && attempt.status === 'failed'
		}
	});

	if (!attempt) {
		logger.warn(
			{ provider_payment_id, failure_code },
			'charge.failed: NO ChargeAttempt found — orphan failure event'
		);
		return;
	}

	logger.info(
		{
			provider_payment_id,
			subscription_id: attempt.subscription_id.toString(),
			failure_code,
			cron_status: attempt.status
		},
		'charge.failed: webhook acknowledged — cron path is authoritative for state'
	);
}

/**
 * mandate.revoked — bank/customer cancelled the mandate.
 * Transitions: any active-side state → downgraded
 */
async function handleMandateRevoked(normalized: { mandate_token?: string }): Promise<void> {
	const token = normalized.mandate_token;
	if (!token) {
		logger.warn('mandate.revoked event missing mandate_token');
		return;
	}
	const doc = await findByMandateToken(token);
	if (!doc) {
		logger.warn({ token_prefix: token.slice(0, 8) }, 'mandate.revoked: no matching subscription');
		return;
	}
	// Allowable from-states: active, paused, dunning_t0, dunning_grace, dunning_final
	// All of them transition to downgraded.
	if (
		doc.state === 'active' ||
		doc.state === 'dunning_t0' ||
		doc.state === 'dunning_grace' ||
		doc.state === 'dunning_final'
	) {
		await applyTransition(doc.dsa_id, doc.state, 'downgraded', 'webhook mandate.revoked');
	} else if (doc.state === 'paused') {
		await applyTransition(doc.dsa_id, 'paused', 'cancelled', 'webhook mandate.revoked while paused');
	}
}
