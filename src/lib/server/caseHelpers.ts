/**
 * Case Helper Functions
 * ══════════════════════════════════════════════════════════════════
 * Shared utilities used across multiple case-related API routes.
 *
 * - resolveDsaId: resolves DSA _id from locals.user.mobileNumber
 * - verifyCaseOwnership: finds case and verifies dsa_id match
 * - createTimelineEvent: inserts a timeline event for a case
 * - generateCaseId: generates sequential case ID (PREFIX-YEAR-SEQ)
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { DsaApplications, Cases, TimelineEvents, CaseIdCounters } from '$lib/database/mongo.js';
import type { Case } from '$lib/types/case.js';
import type { TimelineEventType } from '$lib/types/timeline.js';
import { LOAN_TYPE_FORM_ROUTES } from '$lib/config/routes.js';
import logger from '$lib/server/logger.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';

// ============================================================================
// LOAN TYPE → PREFIX MAPPING
// ============================================================================

const LOAN_TYPE_PREFIX: Record<string, string> = {
	'Home Loan': 'HL',
	'Plot and Construction Loan': 'PLT',
	'Loan Against Property': 'LAP',
	'Personal Loan': 'PL',
	'Vehicle Loan': 'VL',
	'Gold Loan': 'GL',
	'Credit Card Loan': 'CCL',
	'Consumer Durable Loan': 'CDL',
	'Education Loan': 'EL',
	'Insta Loan': 'IL',
	'Business Loan - Unsecured': 'BLU',
	'OD Limit': 'OD',
	'CC Limit': 'CCL',
	'Dropline OD': 'DOD',
	'Balance Transfer': 'BT',
	'Machinery Loan': 'ML',
	'Property Loan': 'PRL',
	'Other Type Loan': 'OTH'
};

/** Get the prefix for a loan type, falling back to 'CS' (case) if unknown */
export function getLoanTypePrefix(loanType: string): string {
	return LOAN_TYPE_PREFIX[loanType] || 'CS';
}

// ============================================================================
// LOAN TYPE → FORM ROUTE MAPPING
// ============================================================================

/** Maps a loan type to its form route path. Returns null if no form exists for this loan type. */
export function loanTypeToFormRoute(loanType: string): string | null {
	return LOAN_TYPE_FORM_ROUTES[loanType] || null;
}

// ============================================================================
// RESOLVE DSA ID
// ============================================================================

/**
 * Resolves the DSA _id from locals.user.mobileNumber.
 * Returns the DSA ObjectId or null if not found.
 */
export async function resolveDsaId(
	locals: App.Locals
): Promise<{ ok: true; dsaId: ObjectId } | { ok: false; error: string }> {
	if (!locals.user) {
		return { ok: false, error: 'Authentication required' };
	}

	// SEC-2: encrypted-first lookup. Only _id is used downstream — no
	// decrypt needed. This helper is called by ~30 routes, so wiring
	// it once propagates encryption-awareness across the dashboard.
	const dsa = await findUserByMobile(DsaApplications, locals.user.mobileNumber);

	if (!dsa?._id) {
		return { ok: false, error: 'DSA profile not found' };
	}

	return { ok: true, dsaId: dsa._id };
}

// ============================================================================
// RESOLVE EFFECTIVE DSA ID (Team-Aware)
// ============================================================================

/**
 * F9 (2026-06-05): request-scoped memoization for resolveEffectiveDsaId.
 *
 * Many requests resolve the effective DSA id more than once across the
 * load chain — e.g. the dashboard parent layout resolves it for caseCount
 * and the child layout resolves it AGAIN for quotaState; phase 2 +
 * results-data each resolve it independently for ownership; multi-step
 * server loaders resolve it from a helper. The DB lookup inside
 * (`findUserByMobile` → CSFLE-aware DsaApplications findOne) costs
 * 30-100ms cold, and there's no semantic reason to repeat it within a
 * single request.
 *
 * Strategy: module-scope WeakMap keyed by the request's `locals` object.
 * SvelteKit gives each request its own `locals` POJO, so the WeakMap
 * entry naturally lives for the request lifetime and is GC'd the moment
 * the request finishes. No cross-request contamination is possible.
 *
 * Why successes only get cached (not failures):
 *  - A transient DB blip on the first call shouldn't poison the request.
 *    Subsequent calls retry naturally.
 *  - "Authentication required" / "Invalid team owner reference" cases
 *    are deterministic from `locals.user` shape — re-running is cheap
 *    (no DB call) and safe.
 *  - "DSA profile not found" indicates a data-integrity issue — retrying
 *    once per call site won't recover but also won't make things worse.
 *
 * Edge case: admin impersonation toggle. When an admin starts/stops
 * impersonating a DSA, `locals.user` is replaced. A new request → new
 * `locals` → new WeakMap entry. Within a single request, locals doesn't
 * mutate — there's no in-flight impersonation switch that could see
 * a stale cached value.
 *
 * Zero call-site changes — all 70+ consumers automatically benefit.
 */
const dsaIdMemo = new WeakMap<App.Locals, ObjectId>();

/**
 * Resolves the effective DSA _id, accounting for team membership.
 * - Team members → returns the OWNER's dsa_id (they operate on the owner's cases)
 * - Solo DSAs or team owners → returns their own dsa_id (unchanged from resolveDsaId)
 *
 * Memoized per-request via {@link dsaIdMemo} — see JSDoc above for the
 * caching contract + edge-case analysis.
 */
export async function resolveEffectiveDsaId(
	locals: App.Locals
): Promise<{ ok: true; dsaId: ObjectId } | { ok: false; error: string }> {
	// F9: request-scoped cache check. Hit returns instantly with no DB call.
	const cached = dsaIdMemo.get(locals);
	if (cached) return { ok: true, dsaId: cached };

	if (!locals.user) {
		return { ok: false, error: 'Authentication required' };
	}

	const ctx = locals.user.teamContext;

	// Team member (not owner) → use the owner's dsa_id
	if (ctx && !ctx.isOwner) {
		logger.debug(
			{ ownerDsaId: ctx.ownerDsaId, memberRole: ctx.memberRole },
			'[resolveEffectiveDsaId] team-member → using owner DSA ID'
		);
		try {
			const teamOwnerDsaId = new ObjectId(ctx.ownerDsaId);
			// F9: cache only successes — failures bypass the cache so a retry
			// after a transient blip can succeed.
			dsaIdMemo.set(locals, teamOwnerDsaId);
			return { ok: true, dsaId: teamOwnerDsaId };
		} catch {
			return { ok: false, error: 'Invalid team owner reference' };
		}
	}

	// Solo DSA or team owner → resolve own dsa_id (existing behavior).
	// F9: cache the success before returning so the next call in this same
	// request returns instantly. resolveDsaId is the encrypted-mobile lookup
	// (CSFLE-aware DsaApplications findOne) that this whole memoization is
	// designed to skip on repeat calls.
	const soloResult = await resolveDsaId(locals);
	if (soloResult.ok) {
		dsaIdMemo.set(locals, soloResult.dsaId);
	}
	return soloResult;
}

// ============================================================================
// VERIFY CASE OWNERSHIP
// ============================================================================

/**
 * Finds a case by case_id and verifies the DSA owns it.
 * Returns the case document or an error string.
 */
export async function verifyCaseOwnership(
	caseId: string,
	dsaId: ObjectId
): Promise<{ ok: true; caseDoc: Case } | { ok: false; error: string }> {
	// Query with BOTH case_id and dsa_id to use the compound unique index
	// and avoid returning a different DSA's document with the same case_id
	const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: dsaId });

	if (!caseDoc) {
		return { ok: false, error: 'Case not found' };
	}

	return { ok: true, caseDoc };
}

// ============================================================================
// CREATE TIMELINE EVENT
// ============================================================================

/**
 * Inserts a timeline event into the TimelineEvents collection.
 */
export async function createTimelineEvent(
	caseId: string,
	eventType: TimelineEventType,
	description: string,
	metadata?: Record<string, any>
): Promise<void> {
	await TimelineEvents.insertOne({
		case_id: caseId,
		event_type: eventType,
		description,
		metadata,
		created_at: new Date()
	});
}

// ============================================================================
// GENERATE CASE ID
// ============================================================================

/**
 * Generates a sequential case ID atomically in the format: {PREFIX}-{YEAR}-{SEQ}
 * e.g. HL-2026-0042
 *
 * Uses MongoDB atomic findOneAndUpdate (no race conditions).
 * Counter key format: "{dsaId}-{year}" ensures per-DSA-per-year sequence.
 *
 * Thread-safe: Multiple concurrent requests will get unique sequential IDs.
 */
export async function generateCaseId(loanType: string, dsaId: ObjectId): Promise<string> {
	const prefix = getLoanTypePrefix(loanType);
	const year = new Date().getFullYear();

	// Counter key: {dsaId}-{year} ensures separate sequences per DSA per year
	const counterKey = `${dsaId.toString()}-${year}`;

	// Atomically increment counter and get the new value
	// findOneAndUpdate with upsert=true: creates if doesn't exist, then increments
	const result = await CaseIdCounters.findOneAndUpdate(
		{ _id: counterKey },
		{ $inc: { seq: 1 } },
		{ upsert: true, returnDocument: 'after' }
	);

	// result is the updated document with new seq
	// If upsert creates new doc, seq starts at 1; subsequent calls increment
	const seq = result?.seq ?? 1;
	const paddedSeq = String(seq).padStart(4, '0');

	return `${prefix}-${year}-${paddedSeq}`;
}
