/**
 * Smart Reminder Engine — Phase 4.5
 * ══════════════════════════════════════════════════════════════════
 * Pure-function module: receives case data, returns reminders.
 * No database calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type {
	Case,
	LenderApplication,
	DocumentChecklistItem,
	LenderQuery
} from '$lib/types/case.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Reminder {
	reminder_id: string;
	type: 'action_needed' | 'follow_up' | 'expiring' | 'stale' | 'milestone';
	priority: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	action_label?: string;
	action_url?: string;
	case_id: string;
	lender_app_id?: string;
	created_at: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Priority sort weight: lower = higher priority */
const PRIORITY_WEIGHT: Record<Reminder['priority'], number> = {
	high: 0,
	medium: 1,
	low: 2
};

// ============================================================================
// HELPERS
// ============================================================================

/** Compute days elapsed between two dates */
function daysBetween(from: Date, to: Date): number {
	return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

/** Get the timestamp when the case entered its current stage */
function getCurrentStageTimestamp(caseDoc: Case): Date | null {
	const history = caseDoc.stage_history;
	if (!history || history.length === 0) return null;

	// Walk backwards to find the most recent transition *into* the current stage
	for (let i = history.length - 1; i >= 0; i--) {
		if (history[i].to === caseDoc.stage) {
			return new Date(history[i].timestamp);
		}
	}

	// Fallback: use the last transition timestamp
	return new Date(history[history.length - 1].timestamp);
}

/** Get the timestamp when a lender app entered its current status */
function getCurrentStatusTimestamp(lenderApp: LenderApplication): Date | null {
	const history = lenderApp.status_history;
	if (!history || history.length === 0) return null;

	for (let i = history.length - 1; i >= 0; i--) {
		if (history[i].to === lenderApp.status) {
			return new Date(history[i].timestamp);
		}
	}

	return new Date(history[history.length - 1].timestamp);
}

/** Build a deterministic reminder ID */
function makeId(caseId: string, suffix: string): string {
	return `${caseId}__${suffix}`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate all applicable reminders for a single case document.
 * Returns reminders sorted by priority (high first), then by created_at (oldest first).
 */
export function generateReminders(caseDoc: any, now?: Date): Reminder[] {
	const currentTime = now ?? new Date();
	const reminders: Reminder[] = [];
	const c = caseDoc as Case;

	// Skip archived or terminal cases
	if (c.is_archived || c.stage === 'closed') {
		return [];
	}

	// ── Stage-based reminders ──────────────────────────────────────
	const stageTs = getCurrentStageTimestamp(c);

	if (stageTs) {
		const daysInStage = daysBetween(stageTs, currentTime);

		// 1. intake > 3 days → move to profiling
		if (c.stage === 'intake' && daysInStage > 3) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_intake_stale'),
				type: 'stale',
				priority: 'medium',
				title: 'Move to profiling',
				description: `Case "${c.label}" has been in intake for ${Math.floor(daysInStage)} days. Start profiling to move forward.`,
				action_label: 'Start Profiling',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}

		// 2. profiling > 5 days → complete profiling
		if (c.stage === 'profiling' && daysInStage > 5) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_profiling_stale'),
				type: 'stale',
				priority: 'medium',
				title: 'Complete profiling',
				description: `Case "${c.label}" has been in profiling for ${Math.floor(daysInStage)} days. Complete it to start file building.`,
				action_label: 'Complete Profiling',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}

		// 3. file_building > 7 days → complete documentation and submit
		if (c.stage === 'file_building' && daysInStage > 7) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_file_building_stale'),
				type: 'stale',
				priority: 'medium',
				title: 'Complete documentation and submit',
				description: `Case "${c.label}" has been in file building for ${Math.floor(daysInStage)} days. Complete documentation and submit to lenders.`,
				action_label: 'Upload Documents',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}

		// 4. submitted > 14 days → follow up with lender
		if (c.stage === 'submitted' && daysInStage > 14) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_submitted_followup'),
				type: 'follow_up',
				priority: 'high',
				title: 'Follow up with lender',
				description: `Case "${c.label}" has been submitted for ${Math.floor(daysInStage)} days with no progress. Follow up with the lender.`,
				action_label: 'Follow Up',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}

		// 5. processing > 21 days → check on review status
		if (c.stage === 'processing' && daysInStage > 21) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_processing_followup'),
				type: 'follow_up',
				priority: 'high',
				title: 'Check on review status',
				description: `Case "${c.label}" has been in processing for ${Math.floor(daysInStage)} days. Check on the review status with the lender.`,
				action_label: 'Follow Up',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}

		// 6. sanctioned > 7 days → process disbursement
		if (c.stage === 'sanctioned' && daysInStage > 7) {
			reminders.push({
				reminder_id: makeId(c.case_id, 'stage_sanctioned_disburse'),
				type: 'action_needed',
				priority: 'medium',
				title: 'Process disbursement',
				description: `Case "${c.label}" was sanctioned ${Math.floor(daysInStage)} days ago. Proceed with disbursement process.`,
				action_label: 'Process Disbursement',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				created_at: stageTs
			});
		}
	}

	// ── Lender-based reminders ─────────────────────────────────────
	const lenderApps = c.lender_applications || [];

	for (const la of lenderApps) {
		const statusTs = getCurrentStatusTimestamp(la);

		// 7. query / query_responded with open queries older than 3 days
		if (la.status === 'query' || la.status === 'query_responded') {
			const openQueries = (la.queries || []).filter((q: LenderQuery) => q.status === 'open');
			for (const q of openQueries) {
				const daysOpen = daysBetween(new Date(q.raised_at), currentTime);
				if (daysOpen > 3) {
					reminders.push({
						reminder_id: makeId(c.case_id, `query_${la.lender_application_id}_${q.query_id}`),
						type: 'action_needed',
						priority: 'high',
						title: `Respond to lender query — ${la.lender_name}`,
						description: `Query from ${la.lender_name} has been open for ${Math.floor(daysOpen)} days: "${q.query_text.substring(0, 80)}${q.query_text.length > 80 ? '...' : ''}"`,
						action_label: 'Respond to Query',
						action_url: `/cases/${c.case_id}`,
						case_id: c.case_id,
						lender_app_id: la.lender_application_id,
						created_at: new Date(q.raised_at)
					});
				}
			}
		}

		// 8. submitted > 10 days with no tracking info → add login number
		if (la.status === 'submitted' && statusTs) {
			const daysSubmitted = daysBetween(statusTs, currentTime);
			const hasTracking = la.lender_tracking?.login_number;
			if (daysSubmitted > 10 && !hasTracking) {
				reminders.push({
					reminder_id: makeId(c.case_id, `tracking_${la.lender_application_id}`),
					type: 'action_needed',
					priority: 'medium',
					title: `Add login number — ${la.lender_name}`,
					description: `Application to ${la.lender_name} was submitted ${Math.floor(daysSubmitted)} days ago with no login number or tracking info.`,
					action_label: 'Add Tracking Info',
					action_url: `/cases/${c.case_id}`,
					case_id: c.case_id,
					lender_app_id: la.lender_application_id,
					created_at: statusTs
				});
			}
		}

		// 9. processing with technical_status = 'negative'
		if (la.status === 'processing' && la.lender_tracking?.technical_status === 'negative') {
			reminders.push({
				reminder_id: makeId(c.case_id, `tech_negative_${la.lender_application_id}`),
				type: 'action_needed',
				priority: 'high',
				title: `Address technical issues — ${la.lender_name}`,
				description: `Technical valuation for ${la.lender_name} came back negative. Address the issues to avoid rejection.`,
				action_label: 'Address Issues',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				lender_app_id: la.lender_application_id,
				created_at: currentTime
			});
		}

		// 10. processing with legal_status = 'not_clear'
		if (la.status === 'processing' && la.lender_tracking?.legal_status === 'not_clear') {
			reminders.push({
				reminder_id: makeId(c.case_id, `legal_unclear_${la.lender_application_id}`),
				type: 'action_needed',
				priority: 'high',
				title: `Address legal issues — ${la.lender_name}`,
				description: `Legal opinion for ${la.lender_name} is not clear. Resolve legal concerns before proceeding.`,
				action_label: 'Address Issues',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				lender_app_id: la.lender_application_id,
				created_at: currentTime
			});
		}

		// ── Document-based reminders (per lender application) ────────
		const docs = la.document_checklist || [];
		const stageIndex = getStageIndex(c.stage);

		for (const doc of docs) {
			// 11. Mandatory doc not started — high if stage >= file_building
			if (doc.is_mandatory && doc.status === 'not_started') {
				const isHighPriority = stageIndex >= getStageIndex('file_building');
				reminders.push({
					reminder_id: makeId(c.case_id, `doc_missing_${la.lender_application_id}_${doc.doc_id}`),
					type: 'action_needed',
					priority: isHighPriority ? 'high' : 'medium',
					title: `Upload required document: ${doc.doc_name}`,
					description: `Mandatory document "${doc.doc_name}" for ${la.lender_name} has not been started.`,
					action_label: 'Upload Document',
					action_url: `/cases/${c.case_id}`,
					case_id: c.case_id,
					lender_app_id: la.lender_application_id,
					created_at: currentTime
				});
			}

			// 12. Document expiring within 15 days
			if (doc.validity?.valid_until) {
				const validUntil = new Date(doc.validity.valid_until);
				const daysUntilExpiry = daysBetween(currentTime, validUntil);

				if (daysUntilExpiry <= 0) {
					// 13. Already expired
					reminders.push({
						reminder_id: makeId(c.case_id, `doc_expired_${la.lender_application_id}_${doc.doc_id}`),
						type: 'expiring',
						priority: 'high',
						title: `Document expired: ${doc.doc_name}`,
						description: `"${doc.doc_name}" for ${la.lender_name} has expired. Get a fresh copy immediately.`,
						action_label: 'Upload Fresh Copy',
						action_url: `/cases/${c.case_id}`,
						case_id: c.case_id,
						lender_app_id: la.lender_application_id,
						created_at: validUntil
					});
				} else if (daysUntilExpiry <= 15) {
					// Expiring soon
					reminders.push({
						reminder_id: makeId(
							c.case_id,
							`doc_expiring_${la.lender_application_id}_${doc.doc_id}`
						),
						type: 'expiring',
						priority: 'medium',
						title: `Document expiring soon: ${doc.doc_name}`,
						description: `"${doc.doc_name}" for ${la.lender_name} expires in ${Math.ceil(daysUntilExpiry)} days.`,
						action_label: 'Renew Document',
						action_url: `/cases/${c.case_id}`,
						case_id: c.case_id,
						lender_app_id: la.lender_application_id,
						created_at: currentTime
					});
				}
			}
		}

		// ── Milestone: all mandatory docs uploaded ────────────────────
		const mandatoryDocs = docs.filter((d: DocumentChecklistItem) => d.is_mandatory);
		if (mandatoryDocs.length > 0) {
			const allUploaded = mandatoryDocs.every(
				(d: DocumentChecklistItem) => d.status === 'uploaded' || d.status === 'received'
			);
			if (
				allUploaded &&
				(la.status === 'selected' || la.status === 'file_building' || la.status === 'ready')
			) {
				reminders.push({
					reminder_id: makeId(c.case_id, `milestone_docs_ready_${la.lender_application_id}`),
					type: 'milestone',
					priority: 'low',
					title: `All documents ready — ${la.lender_name}`,
					description: `All mandatory documents for ${la.lender_name} have been uploaded. Consider submitting the application.`,
					action_label: 'Submit Application',
					action_url: `/cases/${c.case_id}`,
					case_id: c.case_id,
					lender_app_id: la.lender_application_id,
					created_at: currentTime
				});
			}
		}

		// ── Milestone: sanction received ──────────────────────────────
		if (la.status === 'sanctioned' && la.sanction?.amount) {
			reminders.push({
				reminder_id: makeId(c.case_id, `milestone_sanctioned_${la.lender_application_id}`),
				type: 'milestone',
				priority: 'low',
				title: `Congratulations! Sanction from ${la.lender_name}`,
				description: `Sanction of Rs ${la.sanction.amount.toLocaleString('en-IN')} received from ${la.lender_name}. Proceed to disbursement.`,
				action_label: 'Process Disbursement',
				action_url: `/cases/${c.case_id}`,
				case_id: c.case_id,
				lender_app_id: la.lender_application_id,
				created_at: la.sanction.sanction_date ? new Date(la.sanction.sanction_date) : currentTime
			});
		}
	}

	// ── Sort: high → medium → low, then by created_at (oldest first) ─
	reminders.sort((a, b) => {
		const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
		if (pDiff !== 0) return pDiff;
		return a.created_at.getTime() - b.created_at.getTime();
	});

	return reminders;
}

// ============================================================================
// STAGE INDEX HELPER
// ============================================================================

const STAGE_ORDER = [
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'query',
	'sanctioned',
	'disbursed',
	'closed'
] as const;

function getStageIndex(stage: string): number {
	const idx = STAGE_ORDER.indexOf(stage as any);
	return idx === -1 ? 0 : idx;
}
