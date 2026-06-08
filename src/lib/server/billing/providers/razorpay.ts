/**
 * D.1 Recurring Billing — RazorpayProvider (S2 scaffold)
 * ══════════════════════════════════════════════════════════════════
 * v1 leaf implementation of BillingProvider per ADR-0014.
 *
 * THIS IS SCAFFOLDING. Methods that need live Razorpay API calls
 * throw `NotImplementedError` for now. The real implementation
 * lands in S2 — this scaffold establishes:
 *
 *   ✅ Env-var reading + validation
 *   ✅ HMAC signature verification (pure crypto, no API)
 *   ✅ Failure code translation (pure mapping, no API)
 *   ✅ Webhook event parsing (Razorpay payload → NormalizedEvent)
 *   ❌ registerMandate (needs Razorpay subscriptions/tokens API)
 *   ❌ chargeMandate (needs Razorpay tokens charge API)
 *   ❌ refundCharge (needs Razorpay refunds API)
 *   ❌ queryMandateStatus (needs Razorpay tokens fetch API)
 *   ❌ fetchSettlements (needs Razorpay settlements API)
 *
 * Calling any unimplemented method throws loudly — accidents won't
 * silently no-op.
 *
 * ⚠️ NEW ENV VAR NEEDED before S2 ships:
 *   - RAZORPAY_WEBHOOK_SECRET — separate from RAZORPAY_KEY_SECRET;
 *     set in Razorpay dashboard → Webhooks → Add webhook → returns
 *     the secret. Must be stored in Vercel env (production) +
 *     local .env (dev).
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.1 + §4 S2 + §6
 * ══════════════════════════════════════════════════════════════════
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import type {
	BillingProvider,
	ChargeRequest,
	ChargeResult,
	MandateRegistrationRequest,
	MandateRegistrationResult,
	NormalizedEvent,
	ProviderMandateStatus,
	RefundRequest,
	RefundResult,
	RevokeMandateResult,
	SettlementEntry
} from './BillingProvider';
import { translateRazorpayFailure } from './failureCodeTranslation';

// ── NotImplementedError for unfilled methods ───────────────────

/**
 * Thrown when a scaffold method is called before S2 fills it in.
 * The error message points at the spec slice so the implementer
 * knows where to look.
 */
export class NotImplementedError extends Error {
	constructor(public method: string, public spec: string) {
		super(
			`RazorpayProvider.${method}() is scaffolded but not yet implemented. ` +
				`See docs/specs/D-1-RECURRING-BILLING-SPEC.md ${spec} for the contract this must satisfy.`
		);
		this.name = 'NotImplementedError';
	}
}

// ── Configuration (env-driven) ─────────────────────────────────

export interface RazorpayProviderConfig {
	/** Razorpay key id — used for client SDK + server auth. */
	keyId: string;
	/** Razorpay key secret — used for server auth + HMAC on order verify. */
	keySecret: string;
	/**
	 * Razorpay webhook secret — DIFFERENT from keySecret. Used for HMAC
	 * verification of inbound webhook events. Configured separately in
	 * the Razorpay dashboard → Webhooks → Add Webhook.
	 *
	 * MUST be set before S2 wires up the webhook endpoint. Until then,
	 * verifyWebhookSignature() will return false on every request
	 * (defense-in-depth — won't accept un-signed events).
	 */
	webhookSecret: string;
}

/**
 * Validate the required env vars are set. Throws a clear error if any
 * are missing. Used by providerRegistry at boot time.
 */
export function validateRazorpayConfig(config: Partial<RazorpayProviderConfig>): asserts config is RazorpayProviderConfig {
	const missing: string[] = [];
	if (!config.keyId) missing.push('RAZORPAY_KEY_ID');
	if (!config.keySecret) missing.push('RAZORPAY_KEY_SECRET');
	if (!config.webhookSecret) missing.push('RAZORPAY_WEBHOOK_SECRET');
	if (missing.length > 0) {
		throw new Error(
			`RazorpayProvider missing required env vars: ${missing.join(', ')}. ` +
				`See docs/specs/D-1-RECURRING-BILLING-SPEC.md §6 security checklist for setup instructions.`
		);
	}
}

// ── Razorpay webhook event types we care about ─────────────────

/**
 * Razorpay-side webhook event names mapped to OUR NormalizedEvent types.
 * Razorpay's catalog is at https://razorpay.com/docs/webhooks/payloads/
 * — we subscribe only to the events we act on.
 */
const RAZORPAY_EVENT_MAP: Record<string, NormalizedEvent['event_type']> = {
	'subscription.authenticated': 'mandate.authorized',
	'subscription.activated': 'mandate.authorized',
	'subscription.charged': 'charge.succeeded',
	'subscription.cancelled': 'mandate.revoked',
	'subscription.halted': 'mandate.revoked',
	'token.confirmed': 'mandate.authorized',
	'token.cancelled': 'mandate.revoked',
	'payment.captured': 'charge.succeeded',
	'payment.failed': 'charge.failed',
	'refund.processed': 'charge.succeeded', // refund completion (D.3 will distinguish)
	'settlement.processed': 'settlement.completed'
};

// ── The implementation ─────────────────────────────────────────

export class RazorpayProvider implements BillingProvider {
	readonly name = 'razorpay' as const;

	private readonly config: RazorpayProviderConfig;
	private readonly client: Razorpay;

	constructor(config: RazorpayProviderConfig, clientOverride?: Razorpay) {
		validateRazorpayConfig(config);
		this.config = config;
		// clientOverride is for tests — lets us inject a stubbed Razorpay instance
		// without hitting the real API. Production always passes only the config.
		this.client =
			clientOverride ??
			new Razorpay({
				key_id: config.keyId,
				key_secret: config.keySecret
			});
	}

	// ── Mandate registration ──

	/**
	 * Creates a Razorpay customer + an eNACH registration link that the DSA
	 * visits to authorize the mandate. The chargeable mandate_token DOES
	 * NOT exist until the user completes authorization — it arrives via
	 * the `token.confirmed` webhook later. We return only the
	 * pending_registration_id + customer_id; the orchestration layer
	 * stores these on the subscription doc and pairs them with the
	 * mandate_token when the webhook fires.
	 *
	 * Razorpay docs:
	 *   https://razorpay.com/docs/api/payments/recurring-payments/emandate/create-authorization-transaction
	 */
	async registerMandate(req: MandateRegistrationRequest): Promise<MandateRegistrationResult> {
		// Step 1: ensure a Razorpay customer exists for this DSA.
		// fail_existing: 0 is documented to "return existing customer" but
		// Razorpay's TEST mode (and sometimes live) still throws
		// "Customer already exists for the merchant" when there's a partial
		// match on email/contact. Catch that specific error and fetch the
		// existing customer via customers.all (filtered by email — Razorpay
		// supports email/contact as filter keys). Surfaced during D.1 S2
		// smoke 2026-05-26 after earlier failed attempts had already
		// created customer records in Razorpay.
		let customer: { id: string };
		try {
			customer = await this.client.customers.create({
				name: req.customer_name,
				email: req.customer_email,
				contact: req.customer_mobile,
				fail_existing: 0,
				notes: { dsa_id: req.dsa_id }
			});
		} catch (err) {
			const description = (err as { error?: { description?: string } })?.error?.description ?? '';
			if (!description.toLowerCase().includes('customer already exists')) {
				throw err;
			}
			// Look up the existing customer. Razorpay's customers.all supports
			// `email` and `contact` filter params; we prefer email (more unique).
			const existing = (await this.client.customers.all({
				email: req.customer_email,
				count: 1
			} as unknown as Parameters<typeof this.client.customers.all>[0])) as unknown as {
				items?: Array<{ id: string }>;
			};
			const found = existing.items?.[0];
			if (!found?.id) {
				throw new Error(
					`Razorpay says customer exists for email ${req.customer_email} but customers.all returned no match`
				);
			}
			customer = { id: found.id };
		}

		// Step 2: create the eNACH registration link.
		// amount + first_payment_amount: MUST be 0 for eMandate. Razorpay's
		// API rejects non-zero values with "The amount must be 0 for eMandate
		// registration" — eNACH authorizes the mandate via the NACH protocol
		// directly, not via a money hold. The "₹1 verification charge" from
		// spec §11.1 is a Card/UPI-Autopay concept (hold ₹1 → refund ₹1 to
		// prove the rail works) and doesn't apply here. The user-facing
		// disclosure copy in SubscribeRecurringSection still mentions ₹1 —
		// that should be amended in a follow-up to reflect "your bank will
		// authorize the mandate directly; no money is debited" for eNACH.
		// Surfaced 2026-06-01 during the first end-to-end test-mode smoke.
		// max_amount: per-debit ceiling per §11 Q3 (monthly × 1.5).
		// expire_at: 10 years out — eNACH mandates last as long as the
		// customer doesn't revoke. The 24h TTL is on the AUTHORIZATION LINK,
		// not the mandate itself; we track that as expires_at below.
		const tenYears = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
		const registrationLink = (await this.client.subscriptions.createRegistrationLink({
			customer: {
				name: req.customer_name,
				email: req.customer_email,
				contact: String(req.customer_mobile)
			},
			type: 'link',
			currency: 'INR',
			amount: 0,
			description: 'Subscription mandate authorization',
			// Note (2026-06-02): we briefly tried to pass `callback_url` +
			// `callback_method` here to redirect the user back to our app
			// after mandate completion. Razorpay's SDK type for
			// createRegistrationLink (Subscriptions.RazorpayRegistrationLink
			// BaseRequestBody extends Invoices.RazorpayInvoiceBaseRequestBody)
			// does NOT declare callback_url — the hosted invoice flow
			// terminates on the "Mandate registration completed" screen with
			// no redirect, by Razorpay design. The intended UX (return to
			// our app post-auth) requires a different integration path: the
			// Razorpay Checkout SDK (window.Razorpay({...}).open() with a
			// handler callback) which captures success/failure inline. Until
			// that migration, users either close the Razorpay tab manually
			// (returning to our original tab) or navigate back; the
			// SubscribeRecurringSection polls pending_mandate state on
			// mount regardless of how the user arrived.
			subscription_registration: {
				method: 'emandate',
				auth_type: 'netbanking',
				max_amount: req.max_amount_paise,
				expire_at: tenYears,
				first_payment_amount: 0
			},
			// Razorpay caps receipt at 40 chars. Mongo ObjectId is 24 hex chars,
			// so 'mandate_' (8) + id (24) + '_' (1) + Date.now() decimal (13) = 46.
			// Shorten with 'm_' prefix + base36 timestamp: 2 + 24 + 1 + ~8 = 35.
			receipt: `m_${req.dsa_id}_${Date.now().toString(36)}`,
			notes: {
				dsa_id: req.dsa_id,
				plan_id: req.plan_id,
				purpose: 'mandate_verification'
			}
		} as unknown as Parameters<typeof this.client.subscriptions.createRegistrationLink>[0])) as unknown as {
			id: string;
			short_url?: string;
			[k: string]: unknown;
		};

		if (!registrationLink.id) {
			throw new Error('Razorpay registration link missing id — unexpected SDK response shape');
		}
		if (!registrationLink.short_url) {
			throw new Error('Razorpay registration link missing short_url — cannot redirect DSA to auth');
		}

		return {
			pending_registration_id: registrationLink.id,
			customer_id: customer.id,
			authorization_url: registrationLink.short_url,
			// 24h authorization window per §4 S2 — Razorpay's actual TTL may be
			// longer but we enforce the §3.2.1 #3 transition at this point.
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		};
	}

	/**
	 * Charge a previously-authorized mandate.
	 *
	 * Razorpay's recurring-payment flow: create an order first (with the
	 * mandate's token + amount), then call createRecurringPayment which
	 * uses that order + token.
	 *
	 * Idempotency: we pass attempt_id as the order receipt; Razorpay rejects
	 * duplicate receipts with REQUEST_ENTITY_ALREADY_EXISTS so re-invocation
	 * with the same attempt_id is naturally safe.
	 *
	 * Razorpay docs:
	 *   https://razorpay.com/docs/api/payments/recurring-payments/emandate/create-subsequent-payments
	 */
	async chargeMandate(req: ChargeRequest): Promise<ChargeResult> {
		if (!req.customer_id) {
			return {
				status: 'failed',
				failure_code: 'UNKNOWN',
				failure_message:
					'chargeMandate requires customer_id (set on subscription doc at registerMandate time)',
				raw_response: { local_validation_error: 'missing_customer_id' }
			};
		}
		if (!req.customer_email || !req.customer_mobile) {
			return {
				status: 'failed',
				failure_code: 'UNKNOWN',
				failure_message:
					'chargeMandate requires customer_email + customer_mobile (Razorpay API requirement)',
				raw_response: { local_validation_error: 'missing_customer_details' }
			};
		}

		try {
			// Step 1: create the order (Razorpay requires an order per charge).
			// receipt = our attempt_id → idempotent retries return the same order.
			const order = await this.client.orders.create({
				amount: req.amount_paise,
				currency: 'INR',
				receipt: req.attempt_id,
				payment_capture: true,
				notes: {
					attempt_id: req.attempt_id,
					mandate_token: req.mandate_token
				}
			});

			// Step 2: create the recurring payment using the order + token.
			const payment = await this.client.payments.createRecurringPayment({
				email: req.customer_email,
				contact: req.customer_mobile,
				amount: req.amount_paise,
				currency: 'INR',
				order_id: order.id,
				customer_id: req.customer_id,
				token: req.mandate_token,
				recurring: true,
				description: req.description
			} as Parameters<typeof this.client.payments.createRecurringPayment>[0]);

			// createRecurringPayment returns { razorpay_payment_id, ... } on
			// synchronous success. Some eNACH debits complete asynchronously —
			// they return without a payment id and the actual outcome arrives
			// via `payment.captured` / `payment.failed` webhook. We treat
			// missing payment_id as `pending` so the reconcile cron resolves.
			if (payment.razorpay_payment_id) {
				return {
					status: 'succeeded',
					provider_payment_id: payment.razorpay_payment_id,
					raw_response: payment
				};
			}
			return {
				status: 'pending',
				raw_response: payment
			};
		} catch (err) {
			return interpretRazorpayError(err);
		}
	}

	/**
	 * Refund a previous charge.
	 *
	 * Razorpay docs:
	 *   https://razorpay.com/docs/api/refunds/#create-a-normal-refund
	 *
	 * Used both for D.3 customer refunds and §11.1 ₹1 verification refunds
	 * (the latter caller passes reason='mandate_verification').
	 */
	async refundCharge(req: RefundRequest): Promise<RefundResult> {
		try {
			const refund = await this.client.payments.refund(req.provider_payment_id, {
				amount: req.amount_paise,
				notes: {
					reason: req.reason,
					attempt_id: req.attempt_id
				}
			});
			return {
				status: 'succeeded',
				provider_refund_id: refund.id,
				raw_response: refund
			};
		} catch (err) {
			return {
				status: 'failed',
				raw_response: extractRazorpayErrorPayload(err)
			};
		}
	}

	/**
	 * Query the live status of a mandate at the provider.
	 *
	 * Used by:
	 *   - Webhook-miss recovery (poll if pending_mandate state lasts > expected)
	 *   - Admin tooling
	 *   - Pending re-subscribe policy (§4 S2 — check if old token still active
	 *     before creating a new mandate)
	 */
	async queryMandateStatus(mandate_token: string): Promise<ProviderMandateStatus> {
		try {
			// tokens.fetch is provider-side; doesn't need customer_id.
			const token = (await (
				this.client as unknown as {
					tokens: { fetch(p: { id: string }): Promise<{ status?: string; recurring_status?: string }> };
				}
			).tokens.fetch({ id: mandate_token })) as {
				status?: string;
				recurring_status?: string;
			};

			// Razorpay's status field can be either `status` or `recurring_status`
			// depending on the token type — check both.
			const raw = (token.recurring_status ?? token.status ?? '').toLowerCase();
			switch (raw) {
				case 'confirmed':
				case 'active':
					return 'active';
				case 'initiated':
				case 'pending':
					return 'pending_authorization';
				case 'rejected':
				case 'cancelled':
				case 'failed':
				case 'revoked':
					return 'revoked';
				case 'expired':
					return 'expired';
				case 'paused':
					return 'paused';
				default:
					return 'halted';
			}
		} catch {
			// Token not found OR API error → treat as expired (safer than 'active').
			return 'expired';
		}
	}

	/**
	 * Best-effort revoke of an existing Razorpay mandate (S6 M3).
	 *
	 * Razorpay does NOT expose a single "revoke this token" REST endpoint
	 * that maps cleanly onto our needs — the right call depends on whether
	 * the mandate was provisioned via the Subscriptions API or as a raw
	 * recurring token. For v1 ship we return `not_supported` and log
	 * loudly so the operator handles cleanup via the Razorpay dashboard.
	 * Our-side swap still happens (the webhook handler does not gate on
	 * this result), so functionally the DSA can no longer be charged on
	 * the old token from our cron either way.
	 *
	 * TODO (D.1 post-launch hardening): once we confirm with Razorpay
	 * support whether `subscriptions.cancel()` or `tokens.cancel()` is
	 * the correct call for the mandate type our registerMandate creates,
	 * upgrade this to `succeeded` on success.
	 */
	async revokeMandate(mandate_token: string): Promise<RevokeMandateResult> {
		return {
			status: 'not_supported',
			raw_response: {
				note:
					'Razorpay revokeMandate not implemented — operator must revoke ' +
					'via dashboard. Our-side mandate_token has been swapped.',
				mandate_token_prefix: mandate_token.slice(0, 8)
			}
		};
	}

	/**
	 * Fetch the provider's settlements that fall within a given IST calendar day.
	 *
	 * Razorpay's `settlements.all` returns settlements in their internal time.
	 * We pass `from`/`to` as Unix seconds bounding the IST day per §4 S7.
	 *
	 * Razorpay docs:
	 *   https://razorpay.com/docs/api/settlements/fetch-all
	 */
	async fetchSettlements(istDate: Date): Promise<SettlementEntry[]> {
		// Bound the IST calendar day: [00:00 IST, 23:59:59.999 IST]
		// Express as Unix seconds for Razorpay's API.
		const istOffsetMs = 5.5 * 60 * 60 * 1000;
		const shifted = new Date(istDate.getTime() + istOffsetMs);
		const istY = shifted.getUTCFullYear();
		const istM = shifted.getUTCMonth();
		const istD = shifted.getUTCDate();
		const fromMs = Date.UTC(istY, istM, istD, 0, 0, 0) - istOffsetMs;
		const toMs = fromMs + 24 * 60 * 60 * 1000 - 1;
		const from = Math.floor(fromMs / 1000);
		const to = Math.floor(toMs / 1000);

		const response = (await this.client.settlements.all({
			from,
			to,
			count: 100
		})) as {
			items: Array<{
				id: string;
				amount: number;
				status: string;
				created_at: number;
			}>;
		};

		// Razorpay's settlement entries don't directly carry provider_payment_id;
		// they're aggregated. Real reconciliation in S7 will need a second pass
		// per-settlement to fetch its component payments. For now return the
		// aggregate entries so caller has the shape.
		return response.items.map((item) => ({
			provider_payment_id: item.id,
			amount_paise: item.amount,
			settled_at: new Date(item.created_at * 1000),
			type: 'charge' as const
		}));
	}

	// ── Webhook signature verification (REAL — pure HMAC) ──

	/**
	 * Razorpay signs every webhook with HMAC-SHA256 of the raw request
	 * body using the webhook secret. We compare in constant time to
	 * prevent timing attacks.
	 *
	 * https://razorpay.com/docs/webhooks/validate-test/
	 */
	verifyWebhookSignature(body: string, signature: string): boolean {
		if (!signature) return false;
		try {
			const expected = createHmac('sha256', this.config.webhookSecret)
				.update(body)
				.digest('hex');
			const sigBuf = Buffer.from(signature, 'utf8');
			const expBuf = Buffer.from(expected, 'utf8');
			// timingSafeEqual requires equal-length buffers; short-circuit if not.
			if (sigBuf.length !== expBuf.length) return false;
			return timingSafeEqual(sigBuf, expBuf);
		} catch {
			// Any crypto error → treat as invalid (defense in depth).
			return false;
		}
	}

	// ── Webhook event parsing (REAL — pure mapping) ──

	/**
	 * Razorpay's webhook payload shape:
	 * {
	 *   "entity": "event",
	 *   "account_id": "acc_xxx",
	 *   "event": "subscription.charged",
	 *   "contains": ["payment", "subscription"],
	 *   "payload": {
	 *     "payment": { "entity": { "id": "pay_xxx", "amount": 399900, ... } },
	 *     "subscription": { "entity": { "id": "sub_xxx", ... } }
	 *   },
	 *   "created_at": 1716100000
	 * }
	 *
	 * Some events (like 'payment.failed') include `error_code` / `error_description`
	 * at the entity level — we translate via failureCodeTranslation.
	 */
	parseWebhookEvent(body: unknown): NormalizedEvent | null {
		if (typeof body !== 'object' || body === null) return null;
		const b = body as Record<string, unknown>;

		const eventName = typeof b.event === 'string' ? b.event : null;
		if (!eventName) return null;

		const mappedType = RAZORPAY_EVENT_MAP[eventName];
		if (!mappedType) return null; // event we don't care about

		// Razorpay uses `id` at the top level for newer webhooks; fall back
		// to nested payment.entity.id as a stable per-event identifier.
		const payload = (b.payload as Record<string, unknown> | undefined) ?? {};
		const paymentEntity = extractEntity(payload, 'payment');
		const subscriptionEntity = extractEntity(payload, 'subscription');
		const tokenEntity = extractEntity(payload, 'token');
		const refundEntity = extractEntity(payload, 'refund');

		// Dedup key for processedWebhookEvents — prefer Razorpay's top-level
		// event id when present; fall back to a composite of event + payment id.
		const paymentId =
			typeof paymentEntity?.id === 'string' ? (paymentEntity.id as string) : null;
		const subscriptionId =
			typeof subscriptionEntity?.id === 'string' ? (subscriptionEntity.id as string) : null;
		let provider_event_id: string | null = null;
		if (typeof b.id === 'string' && b.id.length > 0) {
			provider_event_id = b.id;
		} else if (paymentId) {
			provider_event_id = `${eventName}:${paymentId}`;
		} else if (subscriptionId) {
			provider_event_id = `${eventName}:${subscriptionId}`;
		}
		if (!provider_event_id) return null;

		// Failure code (only set on charge.failed)
		let failure_code = undefined;
		if (mappedType === 'charge.failed' && paymentEntity) {
			failure_code = translateRazorpayFailure({
				code: paymentEntity.error_code as string | undefined,
				description: paymentEntity.error_description as string | undefined,
				reason: paymentEntity.error_reason as string | undefined,
				source: paymentEntity.error_source as string | undefined
			});
		}

		return {
			provider_event_id,
			event_type: mappedType,
			mandate_token:
				(tokenEntity?.id as string | undefined) ??
				(subscriptionEntity?.token_id as string | undefined),
			provider_payment_id:
				(paymentEntity?.id as string | undefined) ?? (refundEntity?.payment_id as string | undefined),
			amount_paise: paymentEntity?.amount as number | undefined,
			failure_code,
			occurred_at: typeof b.created_at === 'number' ? new Date(b.created_at * 1000) : new Date(),
			raw: body
		};
	}
}

// ── Internal helper ────────────────────────────────────────────

/**
 * Razorpay's webhook payload nests entities under
 * `payload.<entity_name>.entity`. This helper safely extracts that.
 */
function extractEntity(
	payload: Record<string, unknown>,
	name: 'payment' | 'subscription' | 'token' | 'refund'
): Record<string, unknown> | null {
	const wrapper = payload[name];
	if (typeof wrapper !== 'object' || wrapper === null) return null;
	const entity = (wrapper as Record<string, unknown>).entity;
	if (typeof entity !== 'object' || entity === null) return null;
	return entity as Record<string, unknown>;
}

/**
 * Razorpay SDK throws errors with `.error` payload — extract the inner
 * error shape that translateRazorpayFailure expects.
 */
function extractRazorpayErrorPayload(err: unknown): Record<string, unknown> {
	if (typeof err !== 'object' || err === null) return { message: String(err) };
	const e = err as { error?: Record<string, unknown>; message?: string };
	if (e.error && typeof e.error === 'object') return e.error;
	return { message: e.message ?? 'Unknown Razorpay error' };
}

/**
 * Convert a Razorpay SDK exception into a normalized ChargeResult.
 * Used by chargeMandate's catch block. Pulls reason/code/description out
 * of the error envelope and routes through translateRazorpayFailure.
 */
function interpretRazorpayError(err: unknown): ChargeResult {
	const payload = extractRazorpayErrorPayload(err);
	const failure_code = translateRazorpayFailure({
		code: payload.code as string | undefined,
		description: payload.description as string | undefined,
		reason: payload.reason as string | undefined,
		source: payload.source as string | undefined
	});
	return {
		status: 'failed',
		failure_code,
		failure_message: (payload.description as string | undefined) ?? 'Razorpay charge failed',
		raw_response: payload
	};
}
