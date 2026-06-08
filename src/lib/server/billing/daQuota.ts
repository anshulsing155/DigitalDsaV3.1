/**
 * DA (Document Assessment) Quota Management
 * ══════════════════════════════════════════════════════════════════
 * Handles monthly quota tracking for the Document Assessment feature.
 * Key design point: consumeQuota is ATOMIC — uses MongoDB's $expr gate
 * inside findOneAndUpdate so concurrent requests never over-consume.
 *
 * Decision 1.1 — pricing per PHASE-3-DESIGN-DECISIONS.md §1.
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §3.2
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { MonthlyAssessmentUsage } from '$lib/database/mongo';
import { TIERS, tierHasOverage, type TierId } from '$lib/config/billing';
import type {
	MonthlyAssessmentUsageDoc,
	DaUsageEvent,
	DaTierId,
	TopupPack
} from '$lib/types/monthlyAssessmentUsage';
import logger from '$lib/server/logger';

// ── Types ───────────────────────────────────────────────────────

export interface QuotaConsumeSuccess {
	ok: true;
	/** Updated consumed count after this operation */
	consumed: number;
	/** Total available quota (base + topup) */
	total: number;
}

export interface QuotaConsumeFailure {
	ok: false;
	/** Current consumed count */
	consumed: number;
	/** Total available quota (base + legacy topup) */
	total: number;
	/**
	 * Historically true when the DSA's tier allowed top-up purchases. After
	 * the 2026-05-28 top-up retirement this is ALWAYS false — callers
	 * should treat it as "no top-up path; user must upgrade plan or wait
	 * for next cycle." Kept on the interface so existing UI consumers
	 * don't break; will be removed after a cleanup pass.
	 */
	can_topup: boolean;
	/** Whether this is an enterprise overage scenario */
	is_overage: boolean;
}

export type QuotaConsumeResult = QuotaConsumeSuccess | QuotaConsumeFailure;

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Get the current year-month string in Asia/Kolkata timezone.
 * Format: 'YYYY-MM' (e.g. '2026-05')
 *
 * Why Asia/Kolkata specifically: billing cycles align with Indian
 * business months. A lock at 11:30 PM IST on March 31 must bill
 * to March, not April (UTC would put it in April).
 */
export function currentYearMonth(): string {
	const now = new Date();

	// Format in IST (UTC+5:30) — always use the Indian calendar month
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Kolkata',
		year: 'numeric',
		month: '2-digit'
	});

	// en-CA gives 'YYYY-MM-DD' format; we just need 'YYYY-MM'
	const parts = formatter.formatToParts(now);
	const year = parts.find((p) => p.type === 'year')?.value;
	const month = parts.find((p) => p.type === 'month')?.value;

	return `${year}-${month}`;
}

/**
 * Validate that a tier is a DA-enabled tier (has da_quota > 0).
 * Guards against calling quota operations on non-DA tiers.
 */
function isDaTier(tier: TierId): tier is DaTierId {
	return tier === 'basic_da' || tier === 'pro_da' || tier === 'enterprise_da';
}

// ── Core Operations ─────────────────────────────────────────────

/**
 * Get or create the monthly usage document for a DSA.
 *
 * Uses upsert to atomically create-if-not-exists. If the doc already
 * exists for this month, returns it unchanged. If it doesn't exist,
 * creates it with the DSA's current base_quota from their tier.
 *
 * @param dsaId - The DSA's ObjectId
 * @param yearMonth - The billing month ('YYYY-MM')
 * @param tier - The DSA's current DA tier
 */
export async function getOrCreateMonthlyUsage(
	dsaId: ObjectId,
	yearMonth: string,
	tier: DaTierId
): Promise<MonthlyAssessmentUsageDoc> {
	const baseQuota = TIERS[tier].da_quota;

	// Upsert: create with defaults if it doesn't exist, return current if it does.
	// $setOnInsert only applies on insert (first time this month).
	const result = await MonthlyAssessmentUsage.findOneAndUpdate(
		{ dsa_id: dsaId, year_month: yearMonth },
		{
			$setOnInsert: {
				tier,
				base_quota: baseQuota,
				topup_quota: 0,
				consumed: 0,
				events: [],
				overage_charges_pending: 0
			}
		},
		{ upsert: true, returnDocument: 'after' }
	);

	if (!result) {
		// Should never happen with upsert + returnDocument:'after', but TS requires handling
		throw new Error(`Failed to get/create monthly usage for DSA ${dsaId} month ${yearMonth}`);
	}

	return result;
}

/**
 * Atomically consume one unit of DA quota.
 *
 * This is the critical concurrency-safe primitive. Uses $expr inside
 * findOneAndUpdate to ensure we ONLY increment if consumed < total.
 * Two concurrent requests cannot both succeed on the last slot.
 *
 * For enterprise_da: if base+topup is exhausted, allows overage
 * (increments overage_charges_pending instead of rejecting).
 *
 * @param dsaId - The DSA consuming quota
 * @param yearMonth - The billing month
 * @param tier - The DSA's DA tier (needed for overage logic)
 * @param event - The event to record (lock, major-edit, etc.)
 */
export async function consumeQuota(
	dsaId: ObjectId,
	yearMonth: string,
	tier: DaTierId,
	event: DaUsageEvent
): Promise<QuotaConsumeResult> {
	// First, ensure the monthly doc exists
	const usage = await getOrCreateMonthlyUsage(dsaId, yearMonth, tier);
	const totalQuota = usage.base_quota + usage.topup_quota;

	// Attempt atomic increment with $expr guard:
	// Only succeeds if consumed < (base_quota + topup_quota)
	const result = await MonthlyAssessmentUsage.findOneAndUpdate(
		{
			dsa_id: dsaId,
			year_month: yearMonth,
			// The atomic gate: only increment if there's room
			$expr: { $lt: ['$consumed', { $add: ['$base_quota', '$topup_quota'] }] }
		},
		{
			$inc: { consumed: 1 },
			$push: { events: event }
		},
		{ returnDocument: 'after' }
	);

	if (result) {
		// Success — slot was available and we claimed it atomically
		logger.info(
			{ dsaId: dsaId.toString(), yearMonth, consumed: result.consumed, total: totalQuota },
			'DA quota consumed successfully'
		);
		return {
			ok: true,
			consumed: result.consumed,
			total: result.base_quota + result.topup_quota
		};
	}

	// The $expr guard failed — quota is exhausted.
	// For enterprise_da: allow overage (bill at ₹150/case end-of-month)
	if (tierHasOverage(tier)) {
		// TOCTOU note: this branch is unconditional — two concurrent requests
		// that both fail the $expr gate above will both enter here and both
		// increment overage. For the same case_id this means a double charge.
		// Acceptable in beta (single-user DSA accounts make this nearly impossible);
		// log case_id so we can detect it in production if it ever happens.
		if (event.case_id) {
			logger.warn(
				{ dsaId: dsaId.toString(), yearMonth, caseId: event.case_id },
				'DA overage path entered — monitor for duplicate case_id charges'
			);
		}

		const overageResult = await MonthlyAssessmentUsage.findOneAndUpdate(
			{ dsa_id: dsaId, year_month: yearMonth },
			{
				$inc: { consumed: 1, overage_charges_pending: 1 },
				$push: { events: { ...event, action: 'overage' as const } }
			},
			{ returnDocument: 'after' }
		);

		if (overageResult) {
			logger.info(
				{
					dsaId: dsaId.toString(),
					yearMonth,
					consumed: overageResult.consumed,
					overage: overageResult.overage_charges_pending
				},
				'DA quota consumed as overage (enterprise_da)'
			);
			return {
				ok: true,
				consumed: overageResult.consumed,
				total: overageResult.base_quota + overageResult.topup_quota
			};
		}
	}

	// Non-enterprise tier, quota exhausted — hard reject
	logger.warn(
		{ dsaId: dsaId.toString(), yearMonth, consumed: usage.consumed, total: totalQuota },
		'DA quota exhausted — consumption rejected'
	);
	return {
		ok: false,
		consumed: usage.consumed,
		total: totalQuota,
		// Top-ups retired 2026-05-28 — no purchase path. Caller's UX should
		// route to "upgrade plan" instead. (Field retained on the interface
		// for backwards compat with existing UI consumers until a cleanup pass.)
		can_topup: false,
		is_overage: false
	};
}

/**
 * purchaseTopup was retired 2026-05-28 — top-up packs are no longer a
 * product offering. The DA quota system now only honors the per-tier
 * base quota (TIERS[tier].da_quota); top-up purchase logic + the
 * Razorpay verification endpoint that called this helper have both
 * been archived. Historical `topup_quota` values on existing
 * MonthlyAssessmentUsage rows are STILL summed into `totalQuota` by
 * the consumeQuota / getUsageSummary helpers so legacy quota stays
 * usable — we just don't add to it anymore.
 *
 * If a future product slice resurrects top-ups, restore this function
 * + the TOPUP_PACKS constants from git history. See CHANGELOG.md
 * 2026-05-28 for the retirement rationale.
 */

/**
 * Get current usage summary for display (dashboard badges, modals).
 * Returns null if DSA has no usage record for this month (hasn't
 * locked any case yet this month).
 */
export async function getUsageSummary(
	dsaId: ObjectId,
	yearMonth: string
): Promise<{
	consumed: number;
	total: number;
	remaining: number;
	overage: number;
} | null> {
	const doc = await MonthlyAssessmentUsage.findOne({
		dsa_id: dsaId,
		year_month: yearMonth
	});

	if (!doc) return null;

	const total = doc.base_quota + doc.topup_quota;
	return {
		consumed: doc.consumed,
		total,
		remaining: Math.max(0, total - doc.consumed),
		overage: doc.overage_charges_pending
	};
}
