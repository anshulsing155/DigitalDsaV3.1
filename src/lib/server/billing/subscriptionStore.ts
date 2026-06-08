/**
 * D.1 Recurring Billing — Subscription persistence helpers
 * ══════════════════════════════════════════════════════════════════
 * Thin Mongo-typed helpers over the BillingSubscriptions collection.
 * Used by:
 *   - subscribe-recurring endpoint (create / find)
 *   - webhook handler (update on state transition)
 *   - cron jobs (sweep + bulk transitions)
 *   - admin tooling
 *
 * Every state-changing write goes through transitionSubscription() in
 * subscriptionState.ts to enforce the §3.2.1 legal-transition table.
 * These helpers SHOULD NOT mutate `state` directly — they always
 * accept a TransitionInput-shaped patch and apply atomically.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2 + §4 S2-S8
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId, type ObjectId as MObjectId } from 'mongodb';
import { BillingSubscriptions, ProcessedWebhookEvents } from '$lib/database/mongo';
import type {
	BillingSubscriptionDoc,
	SubscriptionState,
	TransitionInput
} from '$lib/types/billingSubscription';
import { makeFreshSubscription, transitionSubscription } from './subscriptionState';
import type { PlanId } from '$lib/config/billing';
import type { BillingProviderName } from '$lib/types/billingSubscription';
import logger from '$lib/server/logger';

// ── Reads ──────────────────────────────────────────────────────

/** Look up a DSA's subscription. Returns null if they've never subscribed. */
export async function findByDsaId(dsa_id: MObjectId | string): Promise<BillingSubscriptionDoc | null> {
	const id = typeof dsa_id === 'string' ? new ObjectId(dsa_id) : dsa_id;
	return await BillingSubscriptions.findOne({ dsa_id: id });
}

/** Look up by pending_registration_id (used by webhook dispatch for mandate.* events). */
export async function findByPendingRegistrationId(
	pending_registration_id: string
): Promise<BillingSubscriptionDoc | null> {
	return await BillingSubscriptions.findOne({
		pending_registration_id
	} as unknown as Record<string, unknown>);
}

/** Look up by mandate_token (used by webhook dispatch for charge + settlement events). */
export async function findByMandateToken(
	mandate_token: string
): Promise<BillingSubscriptionDoc | null> {
	return await BillingSubscriptions.findOne({ mandate_token });
}

/**
 * Look up by `pending_replacement_registration_id` (S6 M3 webhook swap path).
 * The replacement mandate's `mandate.authorized` webhook arrives while the
 * subscription is in active or dunning_X or paused — NOT pending_mandate — so the
 * primary pending_registration_id lookup won't match.
 */
export async function findByPendingReplacementRegistrationId(
	pending_registration_id: string
): Promise<BillingSubscriptionDoc | null> {
	return await BillingSubscriptions.findOne({
		pending_replacement_registration_id: pending_registration_id
	} as unknown as Record<string, unknown>);
}

// ── Writes ─────────────────────────────────────────────────────

export interface CreatePendingInput {
	dsa_id: MObjectId;
	plan_id: PlanId;
	max_amount_paise: number;
	provider: BillingProviderName;
	pending_registration_id: string;
	provider_customer_id: string;
	pending_expires_at: Date;
	/**
	 * Free-trial intent (2026-05-28). When true, the pending doc remembers
	 * that the DSA chose the trial path; the webhook handler then defers
	 * the first charge by 30 days AND records the abuse-defense blocklist
	 * hashes on successful authorization. Cleared if the pending expires.
	 */
	is_trial?: boolean;
	/**
	 * Pre-computed SHA-256(device_id || pepper) — set when the trial path is
	 * taken AND the client supplied a device_id. Persisted on the pending
	 * sub so the async webhook handler can insert a `kind: 'device'` row in
	 * the trial blocklist without needing access to the plaintext device id
	 * (which lives only client-side).
	 */
	pending_device_id_hash?: string;
}

/**
 * Create or refresh a DSA's subscription doc with a fresh pending_mandate
 * registration. If the DSA already has a subscription that's NOT in a
 * terminal state, this REJECTS per the pending re-subscribe policy (§4 S2 #4
 * / §3.2.1 transition #4 — DSA must wait for prior to complete or expire).
 *
 * Returns the resulting subscription doc.
 */
export async function createOrRefreshPending(
	input: CreatePendingInput
): Promise<BillingSubscriptionDoc> {
	const existing = await findByDsaId(input.dsa_id);

	// First-time subscriber — fresh doc.
	if (!existing) {
		const fresh = makeFreshSubscription(
			input.dsa_id,
			input.plan_id,
			input.max_amount_paise,
			input.provider
		);
		const seeded = transitionSubscription(fresh, 'pending_mandate', {
			reason: 'DSA clicked Subscribe (initial)',
			meta: {
				pending_registration_id: input.pending_registration_id,
				provider_customer_id: input.provider_customer_id
			}
		}) as BillingSubscriptionDoc;
		const doc: BillingSubscriptionDoc = {
			...seeded,
			pending_registration_id: input.pending_registration_id,
			provider_customer_id: input.provider_customer_id,
			updated_at: new Date(),
			// Persist the trial intent so the webhook handler can branch on it.
			// Not stamping trial_until yet — that happens at mandate.authorized.
			...(input.is_trial && { is_trial: true }),
			// Persist the device-id hash so the webhook can insert the
			// `kind: 'device'` blocklist row without needing plaintext.
			...(input.pending_device_id_hash && {
				pending_device_id_hash: input.pending_device_id_hash
			})
		} as BillingSubscriptionDoc & {
			pending_registration_id: string;
			provider_customer_id: string;
		};
		await BillingSubscriptions.insertOne(doc as unknown as BillingSubscriptionDoc);
		return doc;
	}

	// Re-subscribe path: existing doc is in a terminal "no live subscription"
	// state. Legal source states for re-subscribe are:
	//   - downgraded / cancelled — per transitions #21/#22
	//   - not_subscribed — what the pending-cleanup cron transitions a stale
	//     pending_mandate to (§4 S2). A DSA who abandoned the bank-auth flow
	//     should be able to come back and subscribe again with no ceremony.
	//     (Pre-fix this fell through to the "use change-plan" invariant throw,
	//     which surfaced during D.1 S2 smoke 2026-05-26 after Test 14 swept
	//     a stale pending and the DSA retried subscribe.)
	if (
		existing.state === 'downgraded' ||
		existing.state === 'cancelled' ||
		existing.state === 'not_subscribed'
	) {
		const seeded = transitionSubscription(existing, 'pending_mandate', {
			reason: 'DSA re-subscribed after terminal state',
			meta: {
				pending_registration_id: input.pending_registration_id,
				provider_customer_id: input.provider_customer_id,
				prior_state: existing.state
			}
		});
		// The MongoDB driver rejects updateOne when the same path appears in
		// both $set and $unset — "Updating the path 'X' would create a
		// conflict at 'X'". Because `existing` is spread into `updated`,
		// any stale mandate_token/anchor_day/next_charge_at from a prior
		// active subscription would end up in $set even if we tried to clear
		// them with `: undefined`. We must explicitly delete them from the
		// $set payload so only $unset operates on those paths. Surfaced
		// during D.1 S2 smoke 2026-05-26 on the not_subscribed → pending
		// re-subscribe path.
		const updated = {
			...existing,
			...seeded,
			plan_id: input.plan_id, // user can switch plans on re-subscribe
			max_amount_paise: input.max_amount_paise,
			pending_registration_id: input.pending_registration_id,
			provider_customer_id: input.provider_customer_id,
			updated_at: new Date(),
			// Trial intent flows through re-subscribe path too. Endpoint-layer
			// eligibility check is the authoritative gate; if it passed
			// `is_trial: true` we persist it here.
			...(input.is_trial && { is_trial: true }),
			...(input.pending_device_id_hash && {
				pending_device_id_hash: input.pending_device_id_hash
			})
		} as unknown as BillingSubscriptionDoc;
		const setPayload = { ...updated } as Record<string, unknown>;
		delete setPayload.mandate_token;
		delete setPayload.anchor_day;
		delete setPayload.next_charge_at;
		// If is_trial wasn't requested on this re-subscribe, ensure any
		// stale flag from a prior attempt is cleared. Same for the device-id
		// hash — stale hashes from an abandoned trial flow shouldn't survive.
		const unsetFields: Record<string, ''> = {
			mandate_token: '',
			anchor_day: '',
			next_charge_at: ''
		};
		if (!input.is_trial) {
			unsetFields.is_trial = '';
			unsetFields.trial_until = '';
			delete setPayload.is_trial;
			delete setPayload.trial_until;
		}
		if (!input.pending_device_id_hash) {
			unsetFields.pending_device_id_hash = '';
			delete setPayload.pending_device_id_hash;
		}
		await BillingSubscriptions.updateOne(
			{ dsa_id: input.dsa_id },
			{ $set: setPayload, $unset: unsetFields }
		);
		return updated;
	}

	// Existing doc is in pending_mandate — re-subscribe within 24h window.
	// Per §4 S2 pending re-subscribe policy: if prior is still live at
	// provider, this should 409 at the endpoint layer BEFORE we get here.
	// If we got here, caller has decided to overwrite.
	if (existing.state === 'pending_mandate') {
		const seeded = transitionSubscription(existing, 'pending_mandate', {
			reason: 'DSA re-clicked Subscribe; prior pending overwritten',
			meta: {
				prior_pending_registration_id: existing.pending_registration_id,
				new_pending_registration_id: input.pending_registration_id
			},
			idempotent: false
		});
		const updated = {
			...existing,
			...seeded,
			plan_id: input.plan_id,
			max_amount_paise: input.max_amount_paise,
			pending_registration_id: input.pending_registration_id,
			provider_customer_id: input.provider_customer_id,
			updated_at: new Date()
		} as unknown as BillingSubscriptionDoc;
		await BillingSubscriptions.updateOne({ dsa_id: input.dsa_id }, { $set: updated });
		return updated;
	}

	// Existing doc is active / paused / dunning_* — DSA already has a live
	// subscription. They should use change-plan or update-payment-method,
	// not subscribe again. Caller should have validated this; throw as
	// invariant violation.
	throw new Error(
		`createOrRefreshPending called for DSA ${input.dsa_id} already in state '${existing.state}'. ` +
			`Use change-plan or update-payment-method endpoints instead.`
	);
}

/**
 * Apply a state transition to a stored subscription doc atomically.
 * Wraps transitionSubscription() and a Mongo updateOne.
 *
 * Returns the updated doc, or null if the precondition (doc state ===
 * expectedFromState) was violated (concurrent update race).
 *
 * The precondition check is what makes this safe under concurrency: if
 * two webhooks try to advance the same subscription, only one can
 * succeed; the other sees the precondition mismatch and no-ops (the
 * idempotent property of the spec's transition table makes this safe).
 */
export async function applyTransition(
	dsa_id: MObjectId | string,
	expectedFromState: SubscriptionState,
	toState: SubscriptionState,
	reason: string,
	patch: Partial<BillingSubscriptionDoc> = {},
	meta?: Record<string, unknown>
): Promise<BillingSubscriptionDoc | null> {
	const id = typeof dsa_id === 'string' ? new ObjectId(dsa_id) : dsa_id;

	const existing = await BillingSubscriptions.findOne({ dsa_id: id });
	if (!existing) return null;
	if (existing.state !== expectedFromState) {
		logger.info(
			{ dsa_id: String(id), expected: expectedFromState, actual: existing.state, toState },
			'applyTransition: precondition mismatch — concurrent update or duplicate event'
		);
		return null;
	}

	// Use transitionSubscription to validate the transition + build history.
	const transitioned = transitionSubscription(existing as TransitionInput, toState, {
		reason,
		meta
	});

	const updateDoc = {
		...(patch as Record<string, unknown>),
		state: transitioned.state,
		state_history: transitioned.state_history,
		updated_at: transitioned.updated_at,
		...(transitioned.paused_from_state !== undefined && {
			paused_from_state: transitioned.paused_from_state
		}),
		...(transitioned.dunning_started_at !== undefined && {
			dunning_started_at: transitioned.dunning_started_at
		}),
		failed_attempt_count: transitioned.failed_attempt_count
	};

	// $unset cleared fields. transitionSubscription sets these to `undefined`
	// when a side-effect clears them (e.g. dunning_*→active recovery clears
	// dunning_started_at; paused→non-paused clears paused_from_state). The
	// $set spread above only includes them when defined, so without an
	// explicit $unset Mongo keeps the prior value silently.
	//
	// Surfaced 2026-05-27 by D.1 S4 smoke Test S4-5: after recovery
	// dunning_started_at lingered, which would have caused the NEXT failure
	// to skip the "set fresh dunning_started_at" branch (it guards on
	// `!input.dunning_started_at`) — making S5's day-counting think the sub
	// had been in dunning since the old timestamp and instantly escalating
	// to downgraded. Silent data corruption with operationally severe
	// downstream effect; locked by static-scan + a behavioral test.
	const unsetDoc: Record<string, ''> = {};
	if (
		existing.dunning_started_at !== undefined &&
		transitioned.dunning_started_at === undefined
	) {
		unsetDoc.dunning_started_at = '';
	}
	if (
		existing.paused_from_state !== undefined &&
		transitioned.paused_from_state === undefined
	) {
		unsetDoc.paused_from_state = '';
	}

	// Atomic update keyed on the from-state precondition.
	const updateOps: Record<string, unknown> = { $set: updateDoc };
	if (Object.keys(unsetDoc).length > 0) {
		updateOps.$unset = unsetDoc;
	}
	const result = await BillingSubscriptions.findOneAndUpdate(
		{ dsa_id: id, state: expectedFromState },
		updateOps,
		{ returnDocument: 'after' }
	);

	return result;
}

// ── Webhook idempotency ────────────────────────────────────────

/**
 * Check + mark a webhook event as processed in one atomic operation.
 * Returns true if this is the first time we're seeing this event id
 * (caller should proceed with dispatch); false if it's a duplicate
 * (caller should 200 no-op).
 */
export async function checkAndMarkWebhookProcessed(
	provider_event_id: string
): Promise<{ firstTime: boolean }> {
	try {
		await ProcessedWebhookEvents.insertOne({
			_id: provider_event_id,
			processed_at: new Date()
		});
		return { firstTime: true };
	} catch (err) {
		// MongoDB duplicate-key error code 11000 → already processed.
		const e = err as { code?: number };
		if (e.code === 11000) return { firstTime: false };
		throw err;
	}
}

// ── Pending cleanup cron support ───────────────────────────────

// ── Replacement mandate (S6 M3) ────────────────────────────────

/** Result of the atomic mandate swap performed when the replacement webhook lands. */
export interface SwapMandateResult {
	subscription: BillingSubscriptionDoc;
	previous_mandate_token: string | undefined;
}

/**
 * Set the replacement-mandate-in-flight fields on a subscription. Returns
 * the updated doc, or null if the subscription's state moved out of the
 * "live" set between the endpoint's pre-check and this write (concurrent
 * cancel / downgrade). Only writes when state is one of active, paused, or dunning_X.
 */
export async function setPendingReplacement(
	dsa_id: MObjectId | string,
	pending_registration_id: string,
	pending_expires_at: Date,
	lock_until: Date
): Promise<BillingSubscriptionDoc | null> {
	const id = typeof dsa_id === 'string' ? new ObjectId(dsa_id) : dsa_id;
	const result = await BillingSubscriptions.findOneAndUpdate(
		{
			dsa_id: id,
			state: { $in: ['active', 'paused', 'dunning_t0', 'dunning_grace', 'dunning_final'] }
		},
		{
			$set: {
				pending_replacement_registration_id: pending_registration_id,
				pending_replacement_expires_at: pending_expires_at,
				mandate_update_lock_until: lock_until,
				updated_at: new Date()
			}
		},
		{ returnDocument: 'after' }
	);
	return result;
}

/**
 * Webhook-driven swap: replace the live `mandate_token` with the newly-
 * authorized one and clear the replacement-in-flight bookkeeping. Returns
 * the swapped doc + the previous token (so the caller can best-effort
 * revoke it at the provider).
 *
 * Concurrency safety: precondition pins on `pending_replacement_registration_id`
 * to prevent acting twice if the webhook fires twice (the second call
 * sees the field cleared and matches nothing → null return).
 */
export async function swapMandateAfterReplacement(
	pending_registration_id: string,
	new_mandate_token: string
): Promise<SwapMandateResult | null> {
	const existing = await BillingSubscriptions.findOne({
		pending_replacement_registration_id: pending_registration_id
	} as unknown as Record<string, unknown>);
	if (!existing) return null;

	const previous_mandate_token = existing.mandate_token;

	const result = await BillingSubscriptions.findOneAndUpdate(
		{
			_id: existing._id,
			pending_replacement_registration_id: pending_registration_id
		} as unknown as Record<string, unknown>,
		{
			$set: {
				mandate_token: new_mandate_token,
				updated_at: new Date()
			},
			$unset: {
				pending_replacement_registration_id: '',
				pending_replacement_expires_at: '',
				mandate_update_lock_until: ''
			}
		},
		{ returnDocument: 'after' }
	);
	if (!result) return null;
	return { subscription: result, previous_mandate_token };
}

/**
 * Sweep subscriptions in pending_mandate older than 24h. Used by the
 * pending-cleanup cron (§4 S2). Transitions them to not_subscribed
 * (§3.2.1 transition #3) so the DSA can retry cleanly.
 *
 * Returns the count of subscriptions transitioned.
 */
export async function sweepExpiredPendingMandates(
	now: Date = new Date()
): Promise<{ swept: number }> {
	const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const stale = await BillingSubscriptions.find({
		state: 'pending_mandate',
		updated_at: { $lt: cutoff }
	}).toArray();

	let swept = 0;
	for (const doc of stale) {
		const result = await applyTransition(
			doc.dsa_id,
			'pending_mandate',
			'not_subscribed',
			'24h pending TTL expired (cleanup cron)'
		);
		if (result) {
			swept++;
			logger.info(
				{ dsa_id: String(doc.dsa_id), pending_registration_id: doc.pending_registration_id },
				'pending-cleanup: swept expired pending_mandate'
			);
		}
	}
	return { swept };
}
