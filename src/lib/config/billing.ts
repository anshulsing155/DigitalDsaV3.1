/**
 * Billing Plan Configuration
 * ══════════════════════════════════════════════════════════════════
 * Static plan definitions for DSA subscription tiers.
 * Razorpay amounts are in paise (₹999 = 99900 paise).
 * ══════════════════════════════════════════════════════════════════
 */

// ── Plan Types ───────────────────────────────────────────────────

export type PlanId = 'basic' | 'pro' | 'enterprise';

/**
 * **Legacy pre-D.1 subscription status** — describes the one-time-payment
 * subscription model that pre-dates the D.1 recurring rail. Consumed by
 * `User.subscription.status`, `isSubscriptionActive`, `getActiveCaseLimit`,
 * and a small set of legacy admin views. New code on the D.1 recurring
 * rail uses `SubscriptionState` from `$lib/types/billingSubscription`
 * (state machine: `not_subscribed` / `pending_mandate` / `active` /
 * `paused` / `dunning_*` / `cancelled` etc.). The two types are NOT
 * interchangeable — pick by which rail the caller is on.
 */
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

// NOTE: a `BillingCycle = 'monthly' | 'annual'` type briefly lived here
// during D.6 Slice 3 (2026-05-28) but was removed the same day per
// owner decision: this product does monthly subscriptions only — no
// annual variants, no quarterly, no toggle UI. Spec D.6's annual
// recommendation is intentionally NOT implemented. If product ever
// reverses, the type lives in git history at commit eea241b0.

export interface BillingPlan {
	id: PlanId;
	name: string;
	/** Monthly price in INR, INCLUSIVE of 18% GST per ADR-0019. */
	priceMonthly: number;
	/** Razorpay amount in paise */
	amountPaise: number;
	/** Max active cases (Infinity for unlimited) */
	caseLimit: number;
	/**
	 * Maximum number of quota-blocked cases this plan allows in the save
	 * buffer at any one time. When a DSA hits `caseLimit`, they can save up
	 * to `saveBuffer` additional cases that get auto-processed FIFO on plan
	 * upgrade OR monthly cycle reset. Per-plan rather than a derived ratio
	 * so marketing can flex each plan independently.
	 *
	 * `0` means "no buffer" — used for Infinity-capacity plans (Enterprise)
	 * where the buffer concept doesn't apply. The gate logic treats 0 as
	 * "never enter the save-prompt path" so the user-visible behavior is
	 * "you have no limit, this never fires."
	 *
	 * REPLACES the pre-2026-05-29 one-extra-case gesture (hardLimit =
	 * caseLimit + 1). See docs/specs/QUOTA-BLOCKED-CASES-SPEC.md and ADR-0022.
	 */
	saveBuffer: number;
	/** Subscription duration in months (default: 1) */
	durationMonths: number;
	/** Feature highlights for display */
	features: string[];
	// NOTE: the legacy `badge?: string` field was removed 2026-05-28 per spec
	// D.6. It carried two simultaneous static badges ("Most Popular" on Pro +
	// "Best Value" on Enterprise), which the audit flagged as confusing. The
	// new model: at most ONE badge ("Recommended") placed by `recommendPlan()`
	// based on the DSA's actual active-case count. UI consumers call the
	// helper instead of reading a static field. Zero consumers of the old
	// field existed at removal time — checked via grep.
}

// ── Plan Definitions ─────────────────────────────────────────────

export const PLANS: Record<PlanId, BillingPlan> = {
	basic: {
		id: 'basic',
		name: 'Basic',
		priceMonthly: 999,
		amountPaise: 99900,
		caseLimit: 10,
		saveBuffer: 1,
		durationMonths: 1,
		features: [
			'10 active cases',
			'Rule engine evaluation',
			'All 6 loan types',
			'CRM & team features',
			'Lender matching'
		]
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		priceMonthly: 3999,
		amountPaise: 399900,
		caseLimit: 50,
		saveBuffer: 5,
		durationMonths: 1,
		features: [
			'50 active cases',
			'Rule engine evaluation',
			'All 6 loan types',
			'CRM & team features',
			'Lender matching',
			'Priority support'
		]
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		priceMonthly: 9999,
		amountPaise: 999900,
		caseLimit: Infinity,
		saveBuffer: 0,
		durationMonths: 1,
		features: [
			'Unlimited cases',
			'Rule engine evaluation',
			'All 6 loan types',
			'CRM & team features',
			'Lender matching',
			'Priority support',
			'Dedicated account manager'
		]
	}
};

export const PLAN_LIST: BillingPlan[] = [PLANS.basic, PLANS.pro, PLANS.enterprise];

/**
 * Trial duration in days. SINGLE SOURCE OF TRUTH for the trial window —
 * imported by API handlers (subscribe-recurring, webhook/razorpay) AND every
 * landing/disclaimer/CTA surface that mentions the trial duration. Do NOT
 * declare a local shadow constant; that's the exact drift this consolidates.
 *
 * History: previously 7; shadowed locally to 30 in two API handlers, leaving
 * landing pages (Hero/CTA/Disclaimer/Pricing) silently advertising 7 / 14 / 7
 * while the live billing flow used 30 (ADR-0018 / D.1 S2). Flipped to 30 here
 * + literals replaced with `{TRIAL_DAYS}` interpolation across landing copy on
 * 2026-05-28 to make this the only place to edit.
 */
export const TRIAL_DAYS = 30;

/** Trial plan — new DSAs get Pro features for the TRIAL_DAYS window */
export const TRIAL_PLAN: PlanId = 'pro';

// ── Helpers ──────────────────────────────────────────────────────

/** Check if a subscription is currently active (not expired/cancelled) */
export function isSubscriptionActive(sub?: {
	status: SubscriptionStatus;
	expires_at: Date;
}): boolean {
	if (!sub) return false;
	if (sub.status === 'expired' || sub.status === 'cancelled') return false;
	return new Date(sub.expires_at) > new Date();
}

/** Get the case limit for a subscription, or 0 if expired */
export function getActiveCaseLimit(sub?: {
	status: SubscriptionStatus;
	expires_at: Date;
	case_limit: number;
}): number {
	if (!sub || !isSubscriptionActive(sub)) return 0;
	return sub.case_limit;
}

/** Format price for display (₹999/mo) */
export function formatPlanPrice(plan: BillingPlan): string {
	return `₹${plan.priceMonthly.toLocaleString('en-IN')}/mo`;
}

// ─────────────────────────────────────────────────────────────────────
// D.6 Pricing-fence helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Recommend the cheapest plan whose `caseLimit` is at least `activeCases`.
 * Drives the single "Recommended" badge on the Billing page (replacing the
 * previous dual static badges). Pure function — same input always gives the
 * same output, safe to call at render time.
 *
 * Examples:
 *   recommendPlan(0)  → 'basic'      (0 cases fits Basic's 10-cap)
 *   recommendPlan(10) → 'basic'      (exactly at Basic's cap is still Basic)
 *   recommendPlan(11) → 'pro'        (over Basic — recommend Pro)
 *   recommendPlan(50) → 'pro'        (exactly at Pro's cap is still Pro)
 *   recommendPlan(51) → 'enterprise' (over Pro — only Enterprise has the headroom)
 *
 * Iteration is ordered by `caseLimit` ascending so the FIRST match wins —
 * always returns the cheapest sufficient tier. Enterprise's `Infinity` cap
 * always satisfies any finite `activeCases`, so the function never returns
 * undefined.
 */
export function recommendPlan(activeCases: number): PlanId {
	// Ordered cheap → expensive; mirrors PLAN_LIST. If PLAN_LIST is reordered
	// later, this must stay sorted by caseLimit ascending for the
	// "cheapest sufficient" guarantee.
	const ordered: PlanId[] = ['basic', 'pro', 'enterprise'];
	for (const id of ordered) {
		if (activeCases <= PLANS[id].caseLimit) return id;
	}
	// Unreachable — Enterprise's caseLimit is Infinity. Defensive return for
	// the type-checker.
	return 'enterprise';
}

// Annual pricing helpers (ANNUAL_PRICE_MULTIPLIER + getAnnualPrice +
// getAnnualSavings) briefly lived here during D.6 Slice 3 and were
// removed the same day per owner decision: monthly only, no annual
// product. Removing the exports rather than leaving them as dead code
// keeps the public API of $lib/config/billing aligned with what the
// product actually does — a future RE-add must be deliberate.

/**
 * GST breakdown for an INCLUSIVE-of-GST amount.
 *
 * Per ADR-0019 the displayed plan prices (₹999 / ₹3,999 / ₹9,999) INCLUDE
 * 18% GST already. The billing page needs to show the GST-exclusive
 * (taxable) component + the GST amount + the total. This back-computes:
 *
 *   netTaxable = round(amountInclusive / 1.18)
 *   gst        = amountInclusive − netTaxable  (subtraction guarantees the
 *                three components sum exactly to the total — no paise drift
 *                even when the divide doesn't land on a whole rupee)
 *
 * Returns whole-rupee values (Math.round) suitable for display. The billing
 * engine uses its own paise-precise version in `invoiceEngine.ts`
 * (`computeInvoiceMoney`) for the actual money math — this helper is for
 * UI only.
 *
 *   getGstBreakdown(3999) → { netTaxable: 3389, gst: 610, total: 3999 }
 *   getGstBreakdown(999)  → { netTaxable: 847, gst: 152, total: 999 }
 *
 * The standard GST rate for SaaS is 18% and is the same in `invoiceEngine.ts`.
 * If the rate ever changes (never trivially does), update BOTH locations.
 */
export const GST_RATE = 0.18;

export function getGstBreakdown(amountInclusive: number): {
	netTaxable: number;
	gst: number;
	total: number;
} {
	const netTaxable = Math.round(amountInclusive / (1 + GST_RATE));
	const gst = amountInclusive - netTaxable;
	return { netTaxable, gst, total: amountInclusive };
}

// ══════════════════════════════════════════════════════════════════
// Document Assessment (DA) — Pricing Tiers + Top-up Packs
// ══════════════════════════════════════════════════════════════════

export type TierId =
	| 'free'
	| 'basic'
	| 'basic_da'
	| 'pro'
	| 'pro_da'
	| 'enterprise'
	| 'enterprise_da';

export interface TierDefinition {
	name: string;
	price_inr: number;
	case_limit: number;
	da_quota: number;
	da_overage_per_case_inr?: number;
}

export const TIERS: Record<TierId, TierDefinition> = {
	free: { name: 'Free', price_inr: 0, case_limit: 0, da_quota: 0 },
	basic: { name: 'Basic', price_inr: 999, case_limit: 10, da_quota: 0 },
	basic_da: { name: 'Basic + Doc Assessment', price_inr: 2499, case_limit: 10, da_quota: 10 },
	pro: { name: 'Pro', price_inr: 3999, case_limit: 50, da_quota: 0 },
	pro_da: { name: 'Pro + Doc Assessment', price_inr: 11499, case_limit: 50, da_quota: 50 },
	enterprise: { name: 'Enterprise', price_inr: 9999, case_limit: Infinity, da_quota: 0 },
	enterprise_da: {
		name: 'Enterprise + Doc Assessment',
		price_inr: 24999,
		case_limit: Infinity,
		da_quota: 100,
		da_overage_per_case_inr: 150
	}
} as const;

// Top-up packs (TopupPackId/TopupPackDefinition/TOPUP_PACKS) and the
// `purchaseTopup` helper were retired 2026-05-28 per owner decision —
// they added complexity for a feature path that wasn't shipping. DSAs
// who hit their plan's case limit are now offered ONE extra case as a
// soft gesture (see evaluate-and-persist case-limit gate) + prompted
// to upgrade via the Manage panel. See `docs/CHANGELOG.md` 2026-05-28.

export function tierAllowsDocAssessment(tier: TierId): boolean {
	return TIERS[tier].da_quota > 0;
}

export function tierHasOverage(tier: TierId): boolean {
	return tier === 'enterprise_da';
}

export function getTierDaQuota(tier: TierId): number {
	return TIERS[tier].da_quota;
}
