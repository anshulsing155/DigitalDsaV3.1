/**
 * DATA-3 — Verify-gate: pure four-gate check per spec §5.
 *
 * The gate answers ONE question: "is this document safe to queue for
 * deletion right now?" — answered YES only if all four sub-gates pass.
 * Anything else means hold.
 *
 *   G1  Field completeness    — all required extraction fields non-null
 *   G2  Confidence floor      — LLM confidence ≥ 0.85 across required fields
 *   G3  DSA confirmation OR   — explicit DSA confirm OR 14d auto-verify floor
 *       auto-verify floor
 *   G4  Case locked + billed  — case.lock.is_locked AND billed for the lock
 *
 * Why this lives separately from `stateMachine.ts`:
 *   - The state machine handles transitions; the verify-gate provides ONE
 *     specific transition's input (`verifyGatePassed`).
 *   - Tests are simpler: state-machine tests don't need gate fixtures, gate
 *     tests don't need a status machine.
 *   - The retention floor (which is also part of "eligible for deletion?")
 *     lives in `retentionFloor.ts` — keep it separate because the floor is
 *     time-of-sweep, not time-of-verify. A row can be verified for weeks
 *     before its floor elapses.
 */

import type { DocumentTier } from './types.js';

/** Input to the verify gate. Hand-built fixture or projection from a real row. */
export interface VerifyGateInput {
	/** From the extracted-fields envelope. */
	extraction: {
		fields: Record<string, unknown>;
		confidence: number; // 0..1
	} | null;

	/** Which required-field keys the document type expects to be non-null. */
	requiredFieldKeys: string[];

	/** DSA review state. */
	dsa: {
		confirmedAt: Date | null; // explicit "Looks correct" click
		extractedAt: Date | null; // when the LLM finished — used for auto-verify
	};

	/** Case-level context for G4. */
	caseState: {
		isLocked: boolean;
		isBilled: boolean;
	};

	/** Clock pin for the auto-verify computation. */
	now: Date;
}

/** Per-gate result — useful for diagnostics on why a row is held. */
export interface VerifyGateResult {
	verified: boolean;
	g1_fieldCompleteness: boolean;
	g2_confidenceFloor: boolean;
	g3_dsaConfirmedOrAutoVerified: boolean;
	g4_caseLockedAndBilled: boolean;
	reason: string | null; // first-failing gate's human-readable summary; null if verified
}

/** Confidence threshold below which extraction is treated as `partial`. */
export const CONFIDENCE_FLOOR = 0.85;

/** Days a row sits in `extracted` before auto-verifying without DSA action. */
export const AUTO_VERIFY_FLOOR_DAYS = 14;

/**
 * Check all four gates. Returns a structured result so callers can log
 * exactly WHY a row is held (the `reason` field).
 *
 * @example
 *   const result = checkVerifyGate({
 *     extraction: { fields: {...}, confidence: 0.92 },
 *     requiredFieldKeys: ['account_holder', 'closing_balance'],
 *     dsa: { confirmedAt: new Date('2026-05-01'), extractedAt: new Date('2026-05-01') },
 *     caseState: { isLocked: true, isBilled: true },
 *     now: new Date('2026-05-16')
 *   });
 *   // → { verified: true, ... }
 */
export function checkVerifyGate(input: VerifyGateInput): VerifyGateResult {
	const { extraction, requiredFieldKeys, dsa, caseState, now } = input;

	// G1 — every required field present and non-null. An extraction object
	// itself being null also fails G1 (no fields to even check).
	const g1 = (() => {
		if (!extraction) return false;
		if (requiredFieldKeys.length === 0) return true; // pathological: nothing required
		return requiredFieldKeys.every((key) => {
			const v = extraction.fields[key];
			return v !== null && v !== undefined && v !== '';
		});
	})();

	// G2 — LLM confidence floor.
	const g2 = !!extraction && extraction.confidence >= CONFIDENCE_FLOOR;

	// G3 — DSA confirmed OR auto-verify floor elapsed (extractedAt + 14d ≤ now).
	const g3 = (() => {
		if (dsa.confirmedAt !== null) return true;
		if (!dsa.extractedAt) return false;
		const autoVerifyAt = new Date(
			dsa.extractedAt.getTime() + AUTO_VERIFY_FLOOR_DAYS * 24 * 60 * 60 * 1000
		);
		return now.getTime() >= autoVerifyAt.getTime();
	})();

	// G4 — case lock AND billing.
	const g4 = caseState.isLocked && caseState.isBilled;

	const verified = g1 && g2 && g3 && g4;

	// Build a diagnostic reason for the first-failing gate.
	let reason: string | null = null;
	if (!g1) {
		reason = !extraction
			? 'G1 — extraction envelope missing'
			: 'G1 — one or more required extraction fields are null/missing';
	} else if (!g2) {
		reason = `G2 — extraction confidence ${extraction!.confidence.toFixed(2)} < floor ${CONFIDENCE_FLOOR}`;
	} else if (!g3) {
		reason =
			dsa.extractedAt === null
				? 'G3 — DSA has not confirmed and no extractedAt timestamp'
				: 'G3 — DSA has not confirmed and 14-day auto-verify floor has not elapsed';
	} else if (!g4) {
		reason = !caseState.isLocked
			? 'G4 — case is not locked'
			: 'G4 — case lock has not been billed';
	}

	return {
		verified,
		g1_fieldCompleteness: g1,
		g2_confidenceFloor: g2,
		g3_dsaConfirmedOrAutoVerified: g3,
		g4_caseLockedAndBilled: g4,
		reason
	};
}

/**
 * Required-field-key registry per document tier. Used by callers that don't
 * have a per-doc_id extraction schema yet (early rollout). When the LLM
 * extraction pipeline lands, each doc_id will export its own
 * `requiredFieldKeys` and this fallback will fade.
 */
export const DEFAULT_REQUIRED_KEYS_BY_TIER: Record<DocumentTier, string[]> = {
	// Financial documents — at minimum we need owner + a parsed primary metric
	financial: ['account_holder', 'closing_balance'],
	// KYC — at minimum the identifier number we extracted
	kyc: ['document_number'],
	// Property — title-bearing party and document number
	property: ['title_holder', 'document_number'],
	// High-stakes — strict; should be overridden per doc_id in practice
	high_stakes: ['title_holder', 'document_number', 'execution_date']
};
