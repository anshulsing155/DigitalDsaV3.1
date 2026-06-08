/**
 * Case Lock — Lock & Unlock-and-Relock Operations
 * ══════════════════════════════════════════════════════════════════
 * Orchestrates the full lock workflow: fingerprint computation →
 * atomic quota consumption → case.lock field write. Both operations
 * are designed to be called from API endpoints after auth/ownership
 * checks are complete.
 *
 * Key guarantees:
 * - Idempotent locking: same fingerprint = no-op (no double-charge)
 * - Atomic quota: uses daQuota.consumeQuota() which has $expr gate
 * - Edit history: unlock-and-relock appends to case.lock.edit_history
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §4.3
 * ══════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { Cases } from '$lib/database/mongo';
import { computeCaseFingerprint, fingerprintsMatch } from './fingerprint';
import { consumeQuota, currentYearMonth } from '$lib/server/billing/daQuota';
import logger from '$lib/server/logger';
import type { DaUsageEvent } from '$lib/types/monthlyAssessmentUsage';
import type {
	CaseLockState,
	CaseLockApplicant,
	CaseLockEditEntry,
	LockCaseArgs,
	LockCaseResult,
	UnlockAndRelockArgs,
	UnlockAndRelockResult
} from './types';

// ── Lock Case ──────────────────────────────────────────────────

/**
 * Lock a case for document assessment, consuming 1 DA quota.
 *
 * Flow:
 * 1. Verify case has assessment_mode = 'doc_upload'
 * 2. Check if already locked with same fingerprint → idempotent no-op
 * 3. Check if already locked with DIFFERENT fingerprint → reject (must unlock first)
 * 4. Compute fingerprint from current case identity
 * 5. Atomically consume 1 DA quota
 * 6. Write case.lock to MongoDB
 *
 * @param args - Lock parameters (caseId, dsaId, tier, case identity data)
 * @returns Success with lock state, or failure with reason
 */
export async function lockCase(args: LockCaseArgs): Promise<LockCaseResult> {
	const { caseId, dsaId, tier, loanType, loanAmount, applicants } = args;

	// Step 1: Pull the case and check assessment_mode
	const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: dsaId });
	if (!caseDoc) {
		logger.error({ caseId, dsaId: dsaId.toString() }, 'lockCase: case not found');
		return { ok: false, reason: 'case_not_found' };
	}

	// Check assessment_mode — only doc-upload cases participate in lock flow
	if (caseDoc.assessment_mode !== 'doc_upload') {
		return { ok: false, reason: 'not_doc_upload_mode' };
	}

	// Step 2 & 3: Check existing lock state
	const existingLock = caseDoc.lock;

	// Step 4: Compute fingerprint from current case identity
	const fingerprintResult = computeCaseFingerprint({
		loan_type: loanType,
		applicants: applicants.map((a) => ({ pan: a.pan })),
		loan_amount: loanAmount
	});

	// Idempotency check: if already locked with SAME fingerprint, return success (no charge)
	if (existingLock?.is_locked) {
		if (fingerprintsMatch(existingLock.fingerprint_sha256, fingerprintResult.fingerprint_sha256)) {
			logger.info(
				{ caseId, fingerprint: fingerprintResult.fingerprint_sha256 },
				'lockCase: idempotent — same fingerprint already locked'
			);
			return { ok: true, lock: existingLock, was_idempotent: true };
		}

		// Different fingerprint while already locked — must use unlock-and-relock path
		return { ok: false, reason: 'already_locked_different_fingerprint' };
	}

	// Step 5: Consume 1 DA quota atomically
	const yearMonth = currentYearMonth();
	const event: DaUsageEvent = {
		case_id: caseId,
		action: 'initial_lock',
		at: new Date(),
		fingerprint_at_event: fingerprintResult.fingerprint_sha256
	};

	const quotaResult = await consumeQuota(dsaId, yearMonth, tier, event);

	if (!quotaResult.ok) {
		logger.warn(
			{ caseId, dsaId: dsaId.toString(), consumed: quotaResult.consumed, total: quotaResult.total },
			'lockCase: quota exhausted'
		);
		return {
			ok: false,
			reason: 'quota_exhausted',
			consumed: quotaResult.consumed,
			total: quotaResult.total,
			can_topup: quotaResult.can_topup
		};
	}

	// Step 6: Write case.lock to MongoDB
	const lockState: CaseLockState = {
		is_locked: true,
		locked_at: new Date(),
		fingerprint_sha256: fingerprintResult.fingerprint_sha256,
		loan_type_at_lock: loanType,
		amount_at_lock: loanAmount,
		amount_bucket: fingerprintResult.amount_bucket,
		applicants_at_lock: buildApplicantsSnapshot(applicants, fingerprintResult.pan_hashes),
		edit_history: []
	};

	await Cases.updateOne(
		{ case_id: caseId, dsa_id: dsaId },
		{ $set: { lock: lockState, updated_at: new Date() } }
	);

	logger.info(
		{
			caseId,
			dsaId: dsaId.toString(),
			fingerprint: fingerprintResult.fingerprint_sha256,
			amountBucket: fingerprintResult.amount_bucket
		},
		'Case locked successfully'
	);

	return { ok: true, lock: lockState, was_idempotent: false };
}

// ── Unlock and Relock ──────────────────────────────────────────

/**
 * Unlock-and-relock a case after a major edit, consuming 1 DA quota.
 *
 * This is the "major edit" path: the DSA changed something fundamental
 * about the loan identity (loan type, applicant PAN, large amount change,
 * property state). The old fingerprint is invalidated, a new one is
 * computed, and the edit is recorded in history.
 *
 * Flow:
 * 1. Verify case is currently locked
 * 2. Compute new fingerprint from updated identity
 * 3. Atomically consume 1 DA quota
 * 4. Update case.lock with new fingerprint + append to edit_history
 *
 * @param args - Unlock parameters including new case identity + edit reasons
 * @returns Success with updated lock, or failure with reason
 */
export async function unlockAndRelockCase(args: UnlockAndRelockArgs): Promise<UnlockAndRelockResult> {
	const { caseId, dsaId, tier, loanType, loanAmount, applicants, reasons } = args;

	// Step 1: Pull the case and verify it's currently locked
	const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: dsaId });
	if (!caseDoc) {
		logger.error({ caseId, dsaId: dsaId.toString() }, 'unlockAndRelockCase: case not found');
		return { ok: false, reason: 'case_not_found' };
	}

	if (caseDoc.assessment_mode !== 'doc_upload') {
		return { ok: false, reason: 'not_doc_upload_mode' };
	}

	const existingLock = caseDoc.lock;
	if (!existingLock?.is_locked) {
		return { ok: false, reason: 'case_not_locked' };
	}

	// Step 2: Compute new fingerprint from updated identity
	const newFingerprintResult = computeCaseFingerprint({
		loan_type: loanType,
		applicants: applicants.map((a) => ({ pan: a.pan })),
		loan_amount: loanAmount
	});

	// If fingerprints are actually the same (shouldn't happen if classifyEdit said major,
	// but guard against accidental calls), treat as no-op
	if (fingerprintsMatch(existingLock.fingerprint_sha256, newFingerprintResult.fingerprint_sha256)) {
		logger.info(
			{ caseId, fingerprint: newFingerprintResult.fingerprint_sha256 },
			'unlockAndRelockCase: fingerprints match — no actual identity change'
		);
		return { ok: true, lock: existingLock };
	}

	// Step 3: Consume 1 DA quota atomically
	const yearMonth = currentYearMonth();
	const event: DaUsageEvent = {
		case_id: caseId,
		action: 'major_edit_unlock',
		at: new Date(),
		fingerprint_at_event: newFingerprintResult.fingerprint_sha256
	};

	const quotaResult = await consumeQuota(dsaId, yearMonth, tier, event);

	if (!quotaResult.ok) {
		logger.warn(
			{ caseId, dsaId: dsaId.toString(), consumed: quotaResult.consumed, total: quotaResult.total },
			'unlockAndRelockCase: quota exhausted'
		);
		return {
			ok: false,
			reason: 'quota_exhausted',
			consumed: quotaResult.consumed,
			total: quotaResult.total,
			can_topup: quotaResult.can_topup
		};
	}

	// Step 4: Build updated lock state + edit history entry
	const editEntry: CaseLockEditEntry = {
		at: new Date(),
		by_dsa_id: dsaId.toString(),
		fields_changed: reasons,
		impact: 'major',
		quota_charged: true,
		new_fingerprint: newFingerprintResult.fingerprint_sha256
	};

	const updatedLock: CaseLockState = {
		is_locked: true,
		locked_at: new Date(),
		fingerprint_sha256: newFingerprintResult.fingerprint_sha256,
		loan_type_at_lock: loanType,
		amount_at_lock: loanAmount,
		amount_bucket: newFingerprintResult.amount_bucket,
		applicants_at_lock: buildApplicantsSnapshot(applicants, newFingerprintResult.pan_hashes),
		edit_history: [...existingLock.edit_history, editEntry]
	};

	await Cases.updateOne(
		{ case_id: caseId, dsa_id: dsaId },
		{ $set: { lock: updatedLock, updated_at: new Date() } }
	);

	logger.info(
		{
			caseId,
			dsaId: dsaId.toString(),
			oldFingerprint: existingLock.fingerprint_sha256,
			newFingerprint: newFingerprintResult.fingerprint_sha256,
			reasons
		},
		'Case unlocked and relocked (major edit)'
	);

	return { ok: true, lock: updatedLock };
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Build the applicants_at_lock snapshot from input applicants + computed hashes.
 * Maps each applicant to their slot + role + pre-computed PAN hash.
 *
 * Note: pan_hashes from computeCaseFingerprint are SORTED alphabetically
 * for fingerprint stability. But applicants_at_lock preserves slot order
 * (slot 0 = primary) for audit display. So we compute hashes per-slot here.
 */
function buildApplicantsSnapshot(
	applicants: Array<{ pan: string; role: 'primary' | 'co_applicant' | 'guarantor'; relationship: string }>,
	_sortedPanHashes: string[]
): CaseLockApplicant[] {
	// We re-hash per-slot to preserve order (sorted hashes are for fingerprint only)
	return applicants.map((app, index) => ({
		applicant_slot: index,
		role: app.role,
		pan_hash: createHash('sha256').update(app.pan.toUpperCase().trim()).digest('hex'),
		relationship: app.relationship
	}));
}
