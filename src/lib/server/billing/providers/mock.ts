/**
 * D.1 Recurring Billing — MockProvider
 * ══════════════════════════════════════════════════════════════════
 * In-memory implementation of BillingProvider used by:
 *   - Unit tests (no network, deterministic outcomes)
 *   - The R11 simulate-event test driver (drives the state machine
 *     through every failure path without hitting Razorpay sandbox)
 *
 * Crucially: this mock implements the SAME contract Razorpay sandbox
 * implements, so tests written against MockProvider don't break when
 * the runtime is swapped to RazorpayProvider. The contract-conformance
 * test cross-checks both.
 *
 * Knobs (via the `programmedOutcomes` map) let callers force any
 * failure code on the next charge — used by simulate-event.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S1 (MockProvider
 * scope) + R11 + critique MISS-2 (contract tests).
 * ══════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
	BillingProvider,
	ChargeRequest,
	ChargeResult,
	FailureCode,
	MandateRegistrationRequest,
	MandateRegistrationResult,
	NormalizedEvent,
	ProviderMandateStatus,
	RefundRequest,
	RefundResult,
	RevokeMandateResult,
	SettlementEntry
} from './BillingProvider';

// ── Programmable outcomes (R11 simulate-event driver) ──────────

/**
 * Per-mandate scheduled outcomes — when the next `chargeMandate` call
 * matches a programmed mandate_token, it returns the queued result
 * instead of success. Caller is responsible for queueing in test setup.
 *
 * Multiple outcomes are consumed in FIFO order (one per charge call).
 */
type ProgrammedOutcome =
	| { kind: 'succeed' }
	| { kind: 'fail'; failure_code: FailureCode; failure_message?: string }
	| { kind: 'pending' };

// ── Mock state (in-memory) ─────────────────────────────────────

interface MockMandateRecord {
	mandate_token: string;
	status: ProviderMandateStatus;
	plan_id: string;
	max_amount_paise: number;
	customer_email: string;
	created_at: Date;
}

interface MockChargeRecord {
	provider_payment_id: string;
	mandate_token: string;
	attempt_id: string;
	amount_paise: number;
	status: 'succeeded' | 'failed' | 'refunded';
	created_at: Date;
	settled_at?: Date;
}

interface MockRefundRecord {
	provider_refund_id: string;
	provider_payment_id: string;
	amount_paise: number;
	created_at: Date;
}

// ── Implementation ─────────────────────────────────────────────

export class MockProvider implements BillingProvider {
	readonly name = 'mock' as const;

	/** Webhook signing secret — set via constructor for test isolation. */
	private readonly webhookSecret: string;

	/** Mandates created by registerMandate, keyed by token. */
	private readonly mandates = new Map<string, MockMandateRecord>();

	/** Charges, keyed by provider_payment_id. */
	private readonly charges = new Map<string, MockChargeRecord>();

	/** Refunds, keyed by provider_refund_id. */
	private readonly refunds = new Map<string, MockRefundRecord>();

	/** Idempotency cache: attempt_id → existing charge result. */
	private readonly chargeAttempts = new Map<string, ChargeResult>();

	/** Programmed outcomes (R11 driver), keyed by mandate_token → FIFO queue. */
	private readonly programmedOutcomes = new Map<string, ProgrammedOutcome[]>();

	/** Pending registration → mandate_token mapping (for webhook simulation). */
	private readonly pendingTokens = new Map<string, string>();

	constructor(opts: { webhookSecret?: string } = {}) {
		this.webhookSecret = opts.webhookSecret ?? 'mock-webhook-secret';
	}

	// ── Testing helpers (NOT on the interface — mock-only escape hatches) ──

	/** Queue an outcome to be returned by the NEXT chargeMandate call on this token. */
	programNextOutcome(mandate_token: string, outcome: ProgrammedOutcome): void {
		const queue = this.programmedOutcomes.get(mandate_token) ?? [];
		queue.push(outcome);
		this.programmedOutcomes.set(mandate_token, queue);
	}

	/** Force a mandate's status (e.g. to simulate a bank-side revoke). */
	setMandateStatus(mandate_token: string, status: ProviderMandateStatus): void {
		const m = this.mandates.get(mandate_token);
		if (m) m.status = status;
	}

	/** Reset all in-memory state — call between tests. */
	reset(): void {
		this.mandates.clear();
		this.charges.clear();
		this.refunds.clear();
		this.chargeAttempts.clear();
		this.programmedOutcomes.clear();
		this.pendingTokens.clear();
	}

	// ── BillingProvider contract ──

	async registerMandate(req: MandateRegistrationRequest): Promise<MandateRegistrationResult> {
		// Mock mimics Razorpay: registerMandate returns pending_registration_id +
		// customer_id but NOT the chargeable mandate_token (which webhook
		// emits later — tests drive that via setMandateStatus + webhook fixture).
		const pending_registration_id = `mock_reg_${randomUUID()}`;
		const customer_id = `mock_cust_${randomUUID()}`;
		const mandate_token = `mock_mandate_${randomUUID()}`;
		const now = new Date();
		this.mandates.set(mandate_token, {
			mandate_token,
			status: 'pending_authorization',
			plan_id: req.plan_id,
			max_amount_paise: req.max_amount_paise,
			customer_email: req.customer_email,
			created_at: now
		});
		// Mock convenience: also store the pending → token mapping so tests
		// can "authorize" without re-creating the mandate.
		this.pendingTokens.set(pending_registration_id, mandate_token);
		return {
			pending_registration_id,
			customer_id,
			authorization_url: `https://mock-provider.local/auth/${pending_registration_id}`,
			expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h TTL per §4 S2
		};
	}

	/**
	 * Mock-only helper: returns the mandate_token associated with a
	 * pending_registration_id. Used by tests to simulate the
	 * `mandate.authorized` webhook (which would normally arrive
	 * asynchronously and contain the token).
	 */
	resolvePendingToken(pending_registration_id: string): string | undefined {
		return this.pendingTokens.get(pending_registration_id);
	}

	async chargeMandate(req: ChargeRequest): Promise<ChargeResult> {
		// Idempotency: same attempt_id → return cached result.
		const cached = this.chargeAttempts.get(req.attempt_id);
		if (cached) return cached;

		const mandate = this.mandates.get(req.mandate_token);
		if (!mandate) {
			const result: ChargeResult = {
				status: 'failed',
				failure_code: 'MANDATE_INVALID',
				failure_message: 'No such mandate',
				raw_response: { mock_error: 'mandate_not_found', attempt_id: req.attempt_id }
			};
			this.chargeAttempts.set(req.attempt_id, result);
			return result;
		}

		if (mandate.status !== 'active') {
			const result: ChargeResult = {
				status: 'failed',
				failure_code: 'MANDATE_INVALID',
				failure_message: `Mandate not active (status: ${mandate.status})`,
				raw_response: { mock_error: 'mandate_inactive', mandate_status: mandate.status }
			};
			this.chargeAttempts.set(req.attempt_id, result);
			return result;
		}

		if (req.amount_paise > mandate.max_amount_paise) {
			const result: ChargeResult = {
				status: 'failed',
				failure_code: 'MANDATE_INVALID',
				failure_message: 'Amount exceeds mandate cap',
				raw_response: { mock_error: 'amount_over_cap', cap: mandate.max_amount_paise }
			};
			this.chargeAttempts.set(req.attempt_id, result);
			return result;
		}

		// Pop a programmed outcome if one is queued.
		const queue = this.programmedOutcomes.get(req.mandate_token);
		const programmed = queue?.shift();
		if (queue && queue.length === 0) this.programmedOutcomes.delete(req.mandate_token);

		if (programmed?.kind === 'fail') {
			const result: ChargeResult = {
				status: 'failed',
				failure_code: programmed.failure_code,
				failure_message: programmed.failure_message ?? `Programmed failure: ${programmed.failure_code}`,
				raw_response: { mock_programmed: true, failure_code: programmed.failure_code }
			};
			this.chargeAttempts.set(req.attempt_id, result);
			return result;
		}

		if (programmed?.kind === 'pending') {
			const result: ChargeResult = {
				status: 'pending',
				raw_response: { mock_programmed: true, status: 'pending' }
			};
			this.chargeAttempts.set(req.attempt_id, result);
			return result;
		}

		// Default: success.
		const provider_payment_id = `mock_pay_${randomUUID()}`;
		this.charges.set(provider_payment_id, {
			provider_payment_id,
			mandate_token: req.mandate_token,
			attempt_id: req.attempt_id,
			amount_paise: req.amount_paise,
			status: 'succeeded',
			created_at: new Date(),
			settled_at: new Date() // mock settles instantly
		});
		const result: ChargeResult = {
			status: 'succeeded',
			provider_payment_id,
			raw_response: { mock_success: true, attempt_id: req.attempt_id }
		};
		this.chargeAttempts.set(req.attempt_id, result);
		return result;
	}

	async refundCharge(req: RefundRequest): Promise<RefundResult> {
		const charge = this.charges.get(req.provider_payment_id);
		if (!charge) {
			return {
				status: 'failed',
				raw_response: { mock_error: 'charge_not_found' }
			};
		}
		if (req.amount_paise > charge.amount_paise) {
			return {
				status: 'failed',
				raw_response: { mock_error: 'refund_exceeds_charge', charge_amount: charge.amount_paise }
			};
		}
		const provider_refund_id = `mock_refund_${randomUUID()}`;
		this.refunds.set(provider_refund_id, {
			provider_refund_id,
			provider_payment_id: req.provider_payment_id,
			amount_paise: req.amount_paise,
			created_at: new Date()
		});
		charge.status = 'refunded';
		return {
			status: 'succeeded',
			provider_refund_id,
			raw_response: { mock_success: true, attempt_id: req.attempt_id }
		};
	}

	async queryMandateStatus(mandate_token: string): Promise<ProviderMandateStatus> {
		const m = this.mandates.get(mandate_token);
		return m?.status ?? 'expired';
	}

	async revokeMandate(mandate_token: string): Promise<RevokeMandateResult> {
		const m = this.mandates.get(mandate_token);
		if (!m) {
			return {
				status: 'failed',
				raw_response: { mock_error: 'mandate_not_found' }
			};
		}
		m.status = 'revoked';
		return {
			status: 'succeeded',
			raw_response: { mock_success: true, mandate_token, revoked_at: new Date().toISOString() }
		};
	}

	async fetchSettlements(istDate: Date): Promise<SettlementEntry[]> {
		// IST calendar day boundaries per §4 S7.
		// Approach: shift istDate by +05:30 to make IST calendar arithmetic
		// equivalent to UTC arithmetic, take the day components, then build
		// the corresponding [00:00 IST, 23:59:59.999 IST] window expressed
		// in UTC by subtracting the offset back.
		const istOffsetMs = 5.5 * 60 * 60 * 1000;
		const shifted = new Date(istDate.getTime() + istOffsetMs);
		const istY = shifted.getUTCFullYear();
		const istM = shifted.getUTCMonth();
		const istD = shifted.getUTCDate();
		const startOfDayMs = Date.UTC(istY, istM, istD, 0, 0, 0) - istOffsetMs;
		const endOfDayMs = startOfDayMs + 24 * 60 * 60 * 1000 - 1;
		const startOfDay = new Date(startOfDayMs);
		const endOfDay = new Date(endOfDayMs);

		const entries: SettlementEntry[] = [];
		for (const charge of this.charges.values()) {
			if (
				charge.settled_at &&
				charge.settled_at >= startOfDay &&
				charge.settled_at <= endOfDay &&
				charge.status !== 'failed'
			) {
				entries.push({
					provider_payment_id: charge.provider_payment_id,
					amount_paise: charge.amount_paise,
					settled_at: charge.settled_at,
					type: charge.status === 'refunded' ? 'refund' : 'charge'
				});
			}
		}
		return entries;
	}

	verifyWebhookSignature(body: string, signature: string): boolean {
		const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
		const sigBuf = Buffer.from(signature, 'utf8');
		const expBuf = Buffer.from(expected, 'utf8');
		if (sigBuf.length !== expBuf.length) return false;
		return timingSafeEqual(sigBuf, expBuf);
	}

	parseWebhookEvent(body: unknown): NormalizedEvent | null {
		// Mock accepts a shape matching NormalizedEvent directly (no provider quirks).
		if (typeof body !== 'object' || body === null) return null;
		const b = body as Record<string, unknown>;
		if (typeof b.provider_event_id !== 'string') return null;
		if (typeof b.event_type !== 'string') return null;
		return {
			provider_event_id: b.provider_event_id,
			event_type: b.event_type as NormalizedEvent['event_type'],
			mandate_token: typeof b.mandate_token === 'string' ? b.mandate_token : undefined,
			provider_payment_id:
				typeof b.provider_payment_id === 'string' ? b.provider_payment_id : undefined,
			amount_paise: typeof b.amount_paise === 'number' ? b.amount_paise : undefined,
			failure_code: b.failure_code as FailureCode | undefined,
			occurred_at: b.occurred_at ? new Date(b.occurred_at as string | number | Date) : new Date(),
			raw: body
		};
	}
}
