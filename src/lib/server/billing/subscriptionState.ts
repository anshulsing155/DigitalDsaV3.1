/**
 * D.1 Recurring Billing — Subscription state machine
 * ══════════════════════════════════════════════════════════════════
 * The single chokepoint for every subscription-state transition.
 *
 * Why a function instead of a class: pure, easy to test, no
 * mongo/network coupling. The caller persists the returned doc
 * (atomic findOneAndUpdate in the live code paths). Calling this
 * function with an illegal (from, to) pair THROWS — the spec's §3.2.1
 * "illegal transitions" rule.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2 + §3.2.1
 * ══════════════════════════════════════════════════════════════════
 */

import type {
	SubscriptionState,
	StateTransitionEntry,
	TransitionInput,
	BillingSubscriptionDoc
} from '$lib/types/billingSubscription';

// ── The transition table (source of truth) ─────────────────────

/**
 * Every legal (from → to) edge from §3.2.1 transition table.
 * The Set holds "from→to" string keys for O(1) membership check.
 *
 * Keep this list IN SYNC with §3.2.1. The static test
 * `subscriptionStateTransitionTable.test.ts` cross-checks the
 * count and a representative sample to catch drift.
 */
const LEGAL_TRANSITIONS: ReadonlySet<string> = new Set([
	// #1 — subscribe path
	'not_subscribed->pending_mandate',

	// #2 — mandate authorized
	'pending_mandate->active',

	// #3 — pending_mandate TTL expires
	'pending_mandate->not_subscribed',

	// #4 — pending_mandate re-subscribe (token replaced); self-loop
	'pending_mandate->pending_mandate',

	// #5 — successful charge renews cycle; self-loop
	'active->active',

	// #5a/b/c — retry within the same dunning state; self-loop (S4)
	// A failed retry within dunning_t0 doesn't escalate state — that's S5's
	// job, based on day-counting from dunning_started_at. The state machine
	// stays put while failed_attempt_count and next_charge_at update.
	'dunning_t0->dunning_t0',
	'dunning_grace->dunning_grace',
	'dunning_final->dunning_final',

	// #6 — first charge fail (retryable)
	'active->dunning_t0',

	// #7 — first charge fail (non-retryable mandate dead)
	'active->downgraded',

	// #8, #8a — pause (from active OR from dunning)
	'active->paused',
	'dunning_t0->paused',
	'dunning_grace->paused',
	'dunning_final->paused',

	// #9 — cancel at cycle end (cron processes at next anchor)
	'active->cancelled',

	// #10, #13, #16 — retry succeeded during dunning, back to active
	'dunning_t0->active',
	'dunning_grace->active',
	'dunning_final->active',

	// #11 — dunning escalation (cron advance)
	'dunning_t0->dunning_grace',

	// #12, #15, #18 — mandate dies mid-dunning
	'dunning_t0->downgraded',
	'dunning_grace->downgraded',
	'dunning_final->downgraded',

	// #14 — dunning escalation grace→final
	'dunning_grace->dunning_final',

	// #17 — final dunning timeout (cron advance day ≥ 8)
	'dunning_final->downgraded',

	// #19 — resume from paused (caller picks target via paused_from_state)
	'paused->active',
	'paused->dunning_t0',
	'paused->dunning_grace',
	'paused->dunning_final',

	// #20, #20a — pause→cancelled (DSA cancels while paused OR 90d auto-cancel)
	'paused->cancelled',

	// #21, #22 — re-subscribe after terminal state
	'downgraded->pending_mandate',
	'cancelled->pending_mandate'
]);

/**
 * Number of legal edges currently in the table. Used by the static
 * cross-check test to catch silent additions/removals.
 *
 * §3.2.1 lists 22 rows but rows #8/#8a expand to 4 entries (one per
 * dunning sub-state pausing) and row #19 expands to 4 entries (one per
 * resume target). Net set size was 27 originally; S4 adds 3 dunning
 * self-loops (dunning_t0/grace/final → same state) so the count is now 30.
 */
export const LEGAL_TRANSITION_COUNT = 30;

// ── Transition helper ──────────────────────────────────────────

/** Error class so callers can `catch` specifically on illegal transitions. */
export class IllegalSubscriptionTransitionError extends Error {
	constructor(
		public from: SubscriptionState,
		public to: SubscriptionState,
		public reason: string
	) {
		super(
			`Illegal subscription transition: ${from} → ${to} (reason: ${reason}). ` +
				`See docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2.1 for the legal transition table.`
		);
		this.name = 'IllegalSubscriptionTransitionError';
	}
}

export interface TransitionOptions {
	/** Plain-English reason. Required — surfaces in audit log + error messages. */
	reason: string;
	/**
	 * Optional structured metadata (provider_event_id, attempt_id, etc.) —
	 * stored on the transition history entry. Kept lean to avoid bloat.
	 */
	meta?: Record<string, unknown>;
	/**
	 * If true and the requested transition is a self-loop on the same state
	 * (idempotent re-application — e.g. webhook replay), no-op + return the
	 * input unchanged. Default false (will THROW if from === to and the edge
	 * is not a legal self-loop like active→active).
	 *
	 * Use this in webhook handlers where duplicate delivery is expected.
	 */
	idempotent?: boolean;
}

/**
 * Apply a state transition. Returns a NEW input object with `state` flipped,
 * `state_history` appended, `updated_at` bumped. Does NOT persist — caller
 * is responsible for the atomic write.
 *
 * Throws `IllegalSubscriptionTransitionError` if (from, to) is not in the
 * legal table.
 *
 * Special-case behavior baked in (per spec §3.2.1):
 *   - Transition to `dunning_t0` initializes `dunning_started_at` if unset.
 *   - Transition `dunning_* → active` (recovery) clears `dunning_started_at`
 *     and resets `failed_attempt_count` to 0.
 *   - Transition `* → paused` records `paused_from_state` (caller passes
 *     the from-state implicitly via the input doc's `state` field).
 *   - Transition `paused → *` clears `paused_from_state`.
 */
export function transitionSubscription<T extends TransitionInput>(
	input: T,
	to: SubscriptionState,
	options: TransitionOptions
): T {
	const from = input.state;
	const edge = `${from}->${to}`;

	// Idempotent re-application (e.g. webhook replay) — no-op return.
	if (options.idempotent && from === to && LEGAL_TRANSITIONS.has(edge)) {
		return input;
	}

	if (!LEGAL_TRANSITIONS.has(edge)) {
		throw new IllegalSubscriptionTransitionError(from, to, options.reason);
	}

	const now = new Date();

	// Build the new history entry.
	const historyEntry: StateTransitionEntry = {
		from,
		to,
		at: now,
		reason: options.reason,
		...(options.meta && { meta: options.meta })
	};

	// Start the mutated copy.
	const next = {
		...input,
		state: to,
		state_history: [...input.state_history, historyEntry],
		updated_at: now
	} as T;

	// ── Side-effects baked into specific transitions ──

	// Pause: record where we came from so resume can restore correctly.
	if (to === 'paused') {
		(next as TransitionInput).paused_from_state = from as Exclude<
			SubscriptionState,
			'paused'
		>;
	}

	// Resume from paused: clear paused_from_state.
	if (from === 'paused' && to !== 'paused') {
		(next as TransitionInput).paused_from_state = undefined;
	}

	// Entering dunning_t0 for the first time → start the dunning clock.
	if (to === 'dunning_t0' && !input.dunning_started_at) {
		(next as TransitionInput).dunning_started_at = now;
	}

	// Charge failure side-effect: increment failed_attempt_count on every
	// transition that represents a fresh failed charge attempt.
	//
	//   - active → dunning_t0       — first failure (chargeEngine handleFailure, S3)
	//   - active → downgraded       — terminal failure on MANDATE_INVALID (S3)
	//   - dunning_t0 → dunning_t0   — retry within dunning_t0 also failed (S4)
	//   - dunning_grace → dunning_grace — retry within dunning_grace failed (S4)
	//   - dunning_final → dunning_final — retry within dunning_final failed (S4)
	//   - dunning_t0 → dunning_grace — S5 day-3 escalation (NOT a fresh
	//     charge attempt; counted because S5 may also retry on advance)
	//   - dunning_grace → dunning_final — S5 day-7 escalation (same reasoning)
	//   - dunning_* → downgraded    — mandate died mid-dunning (S3/S4) OR
	//     S5 day-8 final timeout (S5)
	//
	// active → cancelled and active → active are NOT failure paths, so
	// they don't bump the count. Pause/resume don't either.
	//
	// Why the state machine owns this and not the caller: applyTransition
	// stamps `transitioned.failed_attempt_count` over any patch field with
	// the same key (the state machine is the chokepoint for state-machine-
	// managed fields). The smoke run discovered this — the caller's patch
	// was being silently dropped. By managing the increment here, callers
	// don't need to know the rule.
	//
	// Note on S5 day-counting escalations: dunning_t0 → dunning_grace is
	// bumped here too, even though it's an S5 cron action not a charge
	// attempt. The counter then represents "number of failure-class events"
	// not strictly "charge attempts." If S5 wants to advance state WITHOUT
	// bumping (e.g. on a pure day-count threshold with no charge call), it
	// can call applyTransition with a passthrough flag — not needed in v1
	// because every dunning_t0 → dunning_grace transition follows a failed
	// charge in practice.
	const isFreshFailure =
		(from === 'active' && (to === 'dunning_t0' || to === 'downgraded')) ||
		(from === 'dunning_t0' && (to === 'dunning_t0' || to === 'dunning_grace' || to === 'downgraded')) ||
		(from === 'dunning_grace' && (to === 'dunning_grace' || to === 'dunning_final' || to === 'downgraded')) ||
		(from === 'dunning_final' && (to === 'dunning_final' || to === 'downgraded'));
	if (isFreshFailure) {
		(next as TransitionInput).failed_attempt_count =
			(input.failed_attempt_count ?? 0) + 1;
	}

	// Recovery to active from any dunning state → clear dunning bookkeeping.
	if (
		to === 'active' &&
		(from === 'dunning_t0' || from === 'dunning_grace' || from === 'dunning_final')
	) {
		(next as TransitionInput).dunning_started_at = undefined;
		(next as TransitionInput).failed_attempt_count = 0;
	}

	return next;
}

/**
 * Convenience check used by API endpoints / tests — does NOT throw, just
 * returns whether (from, to) is a legal edge. Use this for UI affordances
 * (e.g. "should the Resume button be enabled?").
 */
export function isLegalTransition(from: SubscriptionState, to: SubscriptionState): boolean {
	return LEGAL_TRANSITIONS.has(`${from}->${to}`);
}

/**
 * Returns the set of states reachable from `from` in one transition.
 * Used by admin tooling + tests; not perf-critical.
 */
export function legalTargetsFrom(from: SubscriptionState): SubscriptionState[] {
	const targets: SubscriptionState[] = [];
	for (const edge of LEGAL_TRANSITIONS) {
		if (edge.startsWith(`${from}->`)) {
			targets.push(edge.split('->')[1] as SubscriptionState);
		}
	}
	return targets;
}

/**
 * Default-construct a fresh BillingSubscriptionDoc in `not_subscribed`
 * state for a given DSA. Used by S8 migration helper + tests.
 */
export function makeFreshSubscription(
	dsa_id: BillingSubscriptionDoc['dsa_id'],
	plan_id: BillingSubscriptionDoc['plan_id'],
	max_amount_paise: number,
	provider: BillingSubscriptionDoc['provider'] = 'razorpay'
): BillingSubscriptionDoc {
	const now = new Date();
	return {
		dsa_id,
		state: 'not_subscribed',
		plan_id,
		billing_cycle: 'monthly',
		provider,
		max_amount_paise,
		failed_attempt_count: 0,
		state_history: [],
		created_at: now,
		updated_at: now
	};
}
