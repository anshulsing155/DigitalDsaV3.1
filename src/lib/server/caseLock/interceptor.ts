/**
 * Case Lock — Edit Interceptor
 * ══════════════════════════════════════════════════════════════════
 * Guards case edits against locked doc-upload cases. Sits between
 * "DSA wants to save" and "persist the edit". For major edits on
 * locked cases, returns a "needs confirmation" response so the UI
 * can show the unlock modal — does NOT auto-charge.
 *
 * Integration points:
 * - evaluate-and-persist (form wizard save)
 * - case patch endpoints (API direct edits)
 * - Any answer-write path that touches loan identity fields
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §4.4
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { classifyEdit, type CaseEditSnapshot } from './editImpact';
import { getOrCreateMonthlyUsage, currentYearMonth } from '$lib/server/billing/daQuota';
import type { DaTierId } from '$lib/types/monthlyAssessmentUsage';
import type { CaseLockState } from './types';

// ── Types ───────────────────────────────────────────────────────

/** UI action the frontend should take when a major edit is detected */
export type EditCheckUiAction =
	| 'show_unlock_confirmation_with_quota_cost'
	| 'show_unlock_modal_quota_exhausted'
	| 'show_topup_required';

/** Result when the edit is allowed (minor or no lock) */
export interface EditCheckAllowed {
	allowed: true;
}

/** Result when the edit is blocked (major, needs DSA confirmation) */
export interface EditCheckBlocked {
	allowed: false;
	/** The edit requires quota consumption */
	requires_quota: true;
	/** Reason codes explaining what triggered the major classification */
	reasons: string[];
	/** What the UI should show */
	ui_action: EditCheckUiAction;
	/** Current quota state for display */
	quota_consumed: number;
	/** Total available quota */
	quota_total: number;
	/** Whether the DSA can buy a top-up to resolve */
	can_topup: boolean;
}

export type EditCheckResult = EditCheckAllowed | EditCheckBlocked;

/**
 * Minimal case shape needed by the interceptor.
 * We only need the lock state + assessment_mode for classification.
 * Callers can pass a full Case or a hand-built minimal object — both
 * are structurally compatible.
 */
export interface InterceptorCaseDoc {
	/** The case's assessment mode — only 'doc_upload' participates in lock flow */
	assessment_mode?: 'manual' | 'doc_upload';
	/** The lock state (null if never locked) */
	lock?: CaseLockState | null;
}

// ── Core Function ───────────────────────────────────────────────

/**
 * Check whether a proposed edit on a locked case is allowed.
 *
 * Decision flow:
 * 1. Manual-mode cases → always allowed (no lock concept)
 * 2. Unlocked doc-upload cases → always allowed
 * 3. Locked doc-upload cases:
 *    a. Minor edit → allowed
 *    b. Major edit + quota available → blocked with "confirm" UI action
 *    c. Major edit + quota exhausted → blocked with "topup/exhausted" action
 *
 * IMPORTANT: This function does NOT charge quota. It only classifies
 * and returns what the UI should show. The actual charge happens when
 * the DSA confirms via POST /api/cases/[case_id]/unlock-and-relock.
 *
 * @param caseDoc - The current case document (must have lock + assessment_mode)
 * @param before - Identity snapshot BEFORE the edit (from current locked state)
 * @param after - Identity snapshot AFTER the proposed edit
 * @param dsaId - The DSA making the edit (for quota lookup)
 * @param tier - The DSA's current DA tier (for quota lookup)
 * @returns Whether the edit is allowed, or blocked with UI action details
 */
export async function checkEditAllowed(
	caseDoc: InterceptorCaseDoc,
	before: CaseEditSnapshot,
	after: CaseEditSnapshot,
	dsaId: ObjectId,
	tier: DaTierId
): Promise<EditCheckResult> {
	// ── 1. Manual-mode cases: always allow ──────────────────────
	if (caseDoc.assessment_mode !== 'doc_upload') {
		return { allowed: true };
	}

	// ── 2. Unlocked doc-upload cases: always allow ──────────────
	if (!caseDoc.lock?.is_locked) {
		return { allowed: true };
	}

	// ── 3. Locked doc-upload case: classify the edit ────────────
	const { impact, reasons } = classifyEdit(before, after);

	// Minor edit → silently allowed, no quota consumed
	if (impact === 'minor') {
		return { allowed: true };
	}

	// ── Major edit detected — check quota state ─────────────────
	const yearMonth = currentYearMonth();
	const usage = await getOrCreateMonthlyUsage(dsaId, yearMonth, tier);
	const totalQuota = usage.base_quota + usage.topup_quota;
	const quotaAvailable = usage.consumed < totalQuota;

	if (quotaAvailable) {
		// Quota is available — show confirmation modal with cost.
		// can_topup is now permanently false (top-ups retired 2026-05-28);
		// the field stays on the interface so existing UI consumers don't
		// break, and the modal copy should say "upgrade to keep editing
		// locked cases" rather than offering a top-up purchase.
		return {
			allowed: false,
			requires_quota: true,
			reasons,
			ui_action: 'show_unlock_confirmation_with_quota_cost',
			quota_consumed: usage.consumed,
			quota_total: totalQuota,
			can_topup: false
		};
	}

	// Quota exhausted — check if enterprise (overage allowed). Non-enterprise
	// previously routed to top-up purchase; now they route to plan upgrade
	// because top-ups are retired. UI tooling should display an upgrade CTA
	// when can_topup is false and is_overage is false.
	if (tier === 'enterprise_da') {
		return {
			allowed: false,
			requires_quota: true,
			reasons,
			ui_action: 'show_unlock_confirmation_with_quota_cost',
			quota_consumed: usage.consumed,
			quota_total: totalQuota,
			can_topup: false // overage applies; no purchase needed
		};
	}

	// Non-enterprise, quota exhausted — must upgrade plan (was: buy top-up).
	return {
		allowed: false,
		requires_quota: true,
		reasons,
		ui_action: 'show_topup_required',
		quota_consumed: usage.consumed,
		quota_total: totalQuota,
		can_topup: false
	};
}

// ── Convenience Helpers ────────────────────────────────────────

/**
 * Quick check: is this edit allowed without async quota lookup?
 * Use for synchronous pre-checks in the UI (before hitting server).
 *
 * Only checks: assessment_mode, lock state, and edit classification.
 * Does NOT check quota availability (that requires async DB call).
 *
 * Returns 'allowed' | 'major_needs_server_check'
 */
export function quickClassifyEdit(
	caseDoc: InterceptorCaseDoc,
	before: CaseEditSnapshot,
	after: CaseEditSnapshot
): { allowed: true } | { allowed: false; reasons: string[] } {
	// Manual or unlocked → always allowed
	if (caseDoc.assessment_mode !== 'doc_upload') return { allowed: true };
	if (!caseDoc.lock?.is_locked) return { allowed: true };

	// Classify
	const { impact, reasons } = classifyEdit(before, after);
	if (impact === 'minor') return { allowed: true };

	return { allowed: false, reasons };
}
