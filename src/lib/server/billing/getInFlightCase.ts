/**
 * ConfirmModal redesign — In-flight case lookup
 * ══════════════════════════════════════════════════════════════════════
 * Returns the most recent in-flight case for a DSA (stage = 'intake' or
 * 'evaluating') so the submit/edit ConfirmModal can surface the trade-off:
 * "you have an in-flight case for X in [stage] — submitting now uses your
 * last save / shares this cycle's quota."
 *
 * Consumed by per-loan +page.server.ts loaders → threaded into
 * confirmAndSubmit → rendered as `footerNote` on the ConfirmModal.
 *
 * Returns `null` when the DSA has no in-flight case (the common path —
 * no footer is rendered in that case). Single indexed query; safe to call
 * from any page-server load.
 *
 * LEND-1 stack-pop, 2026-06-02.
 */

import { ObjectId } from 'mongodb';
import { Cases } from '$lib/database/mongo';

/** Stages we treat as "in-flight" from the DSA's perspective — the case is
 * still actively being worked on the DSA side (form → results → file build),
 * not yet submitted to a lender. Submitted/processing/query are alive too
 * but on the lender side; the DSA can't action them, so we don't surface
 * them in the submit-time modal footer. */
const IN_FLIGHT_STAGES = ['intake', 'profiling', 'file_building'] as const;
type InFlightStage = (typeof IN_FLIGHT_STAGES)[number];

/**
 * Lightweight shape returned to the client — only the fields the modal
 * footer actually renders. Avoids leaking the full Case document into the
 * page-level prop graph for a single-line note.
 */
export interface InFlightCaseSummary {
	case_id: string;
	/** DSA-facing label (auto-generated name+city+type or DSA-customized via B.1). */
	label: string;
	/** Early-stage label — drives the footer wording. */
	stage: InFlightStage;
	/** ISO timestamp; useful for "started X days ago" extensions in future. */
	created_at: string;
}

/**
 * Find the most recent in-flight (`intake` or `evaluating`) case for a DSA.
 *
 * @returns the summary, or `null` when none exists.
 */
export async function getInFlightCase(
	dsaId: ObjectId | string
): Promise<InFlightCaseSummary | null> {
	const id = typeof dsaId === 'string' ? new ObjectId(dsaId) : dsaId;

	const doc = await Cases.findOne(
		{
			dsa_id: id,
			is_archived: { $ne: true },
			stage: { $in: [...IN_FLIGHT_STAGES] }
		},
		{ sort: { created_at: -1 } }
	);
	if (!doc) return null;

	return {
		case_id: doc.case_id,
		label: doc.label ?? 'an existing case',
		stage: doc.stage as InFlightStage,
		created_at:
			doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at)
	};
}
