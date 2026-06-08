/**
 * Monthly Assessment Usage — DA (Document Assessment) quota tracking
 * ══════════════════════════════════════════════════════════════════
 * One document per DSA per calendar month. Tracks how many DA cases
 * they've consumed, how many top-ups they've bought, and a full
 * event log for audit.
 *
 * Collection: monthlyAssessmentUsage
 * Unique index: { dsa_id: 1, year_month: 1 }
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §3.2
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

// ── Event types ─────────────────────────────────────────────────

export type DaEventAction =
	| 'initial_lock'
	| 'major_edit_unlock'
	| 'overage'
	| 'topup_purchase';

export type TopupPack = '+5' | '+20' | '+50';

export interface DaUsageEvent {
	/** The case that triggered this event (for lock/unlock/overage) */
	case_id?: string;
	/** What happened */
	action: DaEventAction;
	/** When it happened (server time, Asia/Kolkata) */
	at: Date;
	/** Fingerprint at the time of lock/unlock (audit trail) */
	fingerprint_at_event?: string;
	/** Which pack was purchased (for topup_purchase events only) */
	topup_pack?: TopupPack;
}

// ── DA Tier IDs (only tiers that grant DA quota) ────────────────

export type DaTierId = 'basic_da' | 'pro_da' | 'enterprise_da';

// ── Document shape ──────────────────────────────────────────────

export interface MonthlyAssessmentUsageDoc {
	_id?: ObjectId;
	/** The DSA this usage belongs to */
	dsa_id: ObjectId;
	/** Calendar month in 'YYYY-MM' format (Asia/Kolkata) */
	year_month: string;
	/** The DSA's DA tier at the time this doc was created */
	tier: DaTierId;
	/** Base quota from their subscription (10 / 50 / 100) */
	base_quota: number;
	/** Sum of all top-ups purchased this month */
	topup_quota: number;
	/** Count of DA-charging events (locks + major-edit unlocks) */
	consumed: number;
	/** Full event log for audit */
	events: DaUsageEvent[];
	/**
	 * For enterprise_da only: count of cases consumed beyond
	 * (base_quota + topup_quota), billed at ₹150/case end-of-month.
	 * For non-enterprise tiers this is always 0 (they get hard-capped).
	 */
	overage_charges_pending: number;
}
