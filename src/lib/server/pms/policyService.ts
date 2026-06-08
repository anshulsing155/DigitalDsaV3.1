/**
 * PMS Policy Service
 * ══════════════════════════════════════════════════════════════════
 * CRUD operations for PolicyDocument in the `lender_policies` collection.
 *
 * All writes use optimistic locking via `lockVersion` to prevent
 * last-write-wins collisions when multiple admin/RM sessions are open.
 *
 * Status lifecycle:
 *   draft → submitted → approved / approved_scheduled → published → archived
 *   (admin can reject submitted → back to draft with rejection note)
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import type { PolicyDocument, ConditionalOverride, ConflictRecord, PendingChange } from '$lib/config/pms/policyTypes.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';
import { rebuildAllConflicts } from './conflictChecker.js';
// Lazy import — only resolved when a policy is actually published, not at module load
async function invalidatePmsEvalCache(lenderId: string, loanProduct: string): Promise<void> {
	try {
		const { invalidatePmsCache } = await import('$lib/ruleEngine/evaluationEngine.js');
		invalidatePmsCache(lenderId, loanProduct);
	} catch {
		// Non-fatal — cache will expire naturally via TTL
	}
}

// ── Error types ───────────────────────────────────────────────────────────────

export class PolicyNotFoundError extends Error {
	constructor(id: string) {
		super(`Policy not found: ${id}`);
		this.name = 'PolicyNotFoundError';
	}
}

export class PolicyLockConflictError extends Error {
	constructor(expected: number, actual: number) {
		super(
			`Optimistic lock conflict — expected lockVersion ${expected}, got ${actual}. ` +
			'Reload the policy and retry.'
		);
		this.name = 'PolicyLockConflictError';
	}
}

export class PolicyStatusError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PolicyStatusError';
	}
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/** Returns the active published policy for a (lenderId, loanProduct) pair. */
export async function getPublishedPolicy(
	lenderId: string,
	loanProduct: LoanProduct
): Promise<PolicyDocument | null> {
	return PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: 'published' },
		{ sort: { version: -1 } }
	) as Promise<PolicyDocument | null>;
}

/** Returns all non-archived policies for a given lender (any product). */
export async function getPoliciesForLender(lenderId: string): Promise<PolicyDocument[]> {
	return PmsLenderPolicies.find(
		{ lenderId, status: { $ne: 'archived' } },
		{ sort: { loanProduct: 1, version: -1 } }
	).toArray() as Promise<PolicyDocument[]>;
}

/** Returns all non-archived policies for a given RM's assigned lenders. */
export async function getPoliciesForRm(
	lenderIds: string[]
): Promise<PolicyDocument[]> {
	if (lenderIds.length === 0) return [];
	return PmsLenderPolicies.find(
		{ lenderId: { $in: lenderIds }, status: { $ne: 'archived' } },
		{ sort: { lenderId: 1, loanProduct: 1, version: -1 } }
	).toArray() as Promise<PolicyDocument[]>;
}

/** Fetches a policy by its MongoDB _id. Throws PolicyNotFoundError if missing. */
export async function getPolicyById(policyId: string): Promise<PolicyDocument> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const doc = await PmsLenderPolicies.findOne({ _id: oid });
	if (!doc) throw new PolicyNotFoundError(policyId);
	return doc as PolicyDocument;
}

// ── Write operations ──────────────────────────────────────────────────────────

/**
 * Creates a new draft policy for a (lenderId, loanProduct) pair.
 * Only one draft per (lenderId, loanProduct) is allowed at a time.
 * Throws PolicyStatusError if a draft already exists.
 */
export async function createDraftPolicy(
	params: {
		lenderId: string;
		loanProduct: LoanProduct;
		sourceText: string;
		sourceFileName: string;
		uploadedBy: string;
		reconciliationAssignedTo: string;
	}
): Promise<PolicyDocument> {
	// Guard: no existing draft for this lender+product
	const existingDraft = await PmsLenderPolicies.findOne({
		lenderId: params.lenderId,
		loanProduct: params.loanProduct,
		status: 'draft'
	});
	if (existingDraft) {
		throw new PolicyStatusError(
			`A draft policy already exists for ${params.lenderId}/${params.loanProduct}. ` +
			'Resume the existing draft or archive it before creating a new one.'
		);
	}

	const now = new Date();

	const newPolicy: Omit<PolicyDocument, '_id'> = {
		lenderId: params.lenderId,
		loanProduct: params.loanProduct,
		version: 0,
		hash: '',
		status: 'draft',
		validFrom: now,
		validTo: null,
		lockVersion: 0,
		reconciliationAssignedTo: params.reconciliationAssignedTo,

		sections: {
			eligibility: {
				minAge: 21,
				maxAge: 65,
				minCreditScore: 650,
				allowedEmploymentTypes: [],
				allowedNationalities: ['Indian'],
				isDefaulterAllowed: false,
				notes: null
			},
			income: {
				allowedIncomeSources: [],
				haircutBySalaried: 0,
				haircutBySelfEmployed: 30,
				haircutByRental: 30,
				haircutByOther: 30,
				minNetIncome: null,
				minGrossIncome: null,
				notes: null
			},
			foir: { salaried: 50, selfEmployed: 50, notes: null },
			ltv: null,
			obligations: {
				deductFromFoir: true,
				creditCardFoirMethod: 'utilization',
				creditCardLimitPercentage: null,
				notes: null
			},
			tenure: {
				minTenureMonths: 12,
				maxTenureMonths: 360,
				maxAgeAtMaturity: 70,
				notes: null
			},
			roi: {
				minRoi: 0,
				maxRoi: 0,
				spreadOverRepo: null,
				roiType: 'floating',
				notes: null
			},
			geo: { allowedStates: [], excludedCities: [], notes: null },
			fees: {
				processingFeePercent: null,
				processingFeeFlat: null,
				processingFeeMin: null,
				processingFeeMax: null,
				prepaymentAllowed: true,
				prepaymentChargePercent: null,
				notes: null
			}
		},

		conditionalOverrides: [],
		bankCardNotes: [],
		pendingChanges: [],

		sourceDocument: {
			text: params.sourceText,
			fileName: params.sourceFileName,
			uploadedAt: now,
			uploadedBy: params.uploadedBy
		},

		pipelineState: null,
		reconciliation: {
			status: 'pending',
			assignedTo: params.reconciliationAssignedTo,
			clauses: [],
			completedAt: null,
			completedBy: null
		},

		aiPipelineRun: null,
		legacyComparison: null,
		registryHealthCheck: null,

		createdBy: params.uploadedBy,
		createdAt: now,
		updatedBy: params.uploadedBy,
		updatedAt: now,
		submittedBy: null,
		submittedAt: null,
		approvedBy: null,
		approvedAt: null,
		scheduledPublishAt: null,
		publishedBy: null,
		publishedAt: null,
		adminRejectionNote: null,
		adminRejectedAt: null,
		adminClauseComments: [],
		qaRun: null
	};

	const result = await PmsLenderPolicies.insertOne(newPolicy as PolicyDocument);

	return { ...newPolicy, _id: result.insertedId } as PolicyDocument;
}

/**
 * Forks a published policy into a new draft for Phase 5 RM edit mode.
 * Copies sections + conditionalOverrides + bankCardNotes from the published policy
 * so the RM edits the current live configuration, not a blank slate.
 *
 * Guards:
 *   - source policy must be in 'published' status
 *   - no existing draft for the same (lenderId, loanProduct) — caller resumes that instead
 */
export async function revisePublishedPolicy(
	sourcePolicyId: string,
	revisedBy: string
): Promise<PolicyDocument> {
	const source = await getPolicyById(sourcePolicyId);

	if (source.status !== 'published') {
		throw new PolicyStatusError(
			`Cannot revise policy ${sourcePolicyId} — only published policies can be revised (current status: ${source.status}).`
		);
	}

	const existingDraft = await PmsLenderPolicies.findOne({
		lenderId: source.lenderId,
		loanProduct: source.loanProduct,
		status: 'draft'
	});
	if (existingDraft) {
		throw new PolicyStatusError(
			`A draft already exists for ${source.lenderId}/${source.loanProduct}. Resume or archive it before starting a new revision.`
		);
	}

	const now = new Date();

	const newDraft: Omit<PolicyDocument, '_id'> = {
		lenderId: source.lenderId,
		loanProduct: source.loanProduct,
		version: 0,
		hash: '',
		status: 'draft',
		validFrom: now,
		validTo: null,
		lockVersion: 0,
		reconciliationAssignedTo: source.reconciliationAssignedTo,

		// Clone current live config so RM edits against the real values
		sections: structuredClone(source.sections),
		conditionalOverrides: structuredClone(source.conditionalOverrides),
		bankCardNotes: structuredClone(source.bankCardNotes),
		pendingChanges: [],

		sourceDocument: {
			// Marker so list views can distinguish a revision from a fresh encode
			text: `(Revision of v${source.version} — ${source.sourceDocument.fileName})`,
			fileName: source.sourceDocument.fileName,
			uploadedAt: now,
			uploadedBy: revisedBy
		},

		// Revisions skip the encode wizard — go straight to edit mode
		pipelineState: null,
		reconciliation: {
			status: 'pending',
			assignedTo: source.reconciliationAssignedTo,
			clauses: [],
			completedAt: null,
			completedBy: null
		},

		aiPipelineRun: null,
		legacyComparison: null,
		registryHealthCheck: null,
		createdBy: revisedBy,
		createdAt: now,
		updatedBy: revisedBy,
		updatedAt: now,
		submittedBy: null,
		submittedAt: null,
		approvedBy: null,
		approvedAt: null,
		scheduledPublishAt: null,
		publishedBy: null,
		publishedAt: null,
		adminRejectionNote: null,
		adminRejectedAt: null,
		adminClauseComments: [],
		qaRun: null
	};

	const result = await PmsLenderPolicies.insertOne(newDraft as PolicyDocument);
	return { ...newDraft, _id: result.insertedId } as PolicyDocument;
}

/**
 * Phase 5 Entry B — Delta parse revision:
 * Forks a published policy to a new draft, applies accepted deltas to the
 * cloned sections, and records each changed field as a PendingChange with
 * reason: 'delta_parse'.
 *
 * Returns the new draft document (including its _id for OTP submit).
 *
 * Guards (same as revisePublishedPolicy):
 *   - source policy must be 'published'
 *   - no existing draft for same (lenderId, loanProduct)
 */
export async function applyDeltaRevision(
	sourcePolicyId: string,
	acceptedDeltas: Array<{
		sectionKey: string;
		fieldKey: string;
		newValue: unknown;
		rmDecision: 'accepted' | 'edited';
		editedValue?: unknown;
	}>,
	revisedBy: string
): Promise<PolicyDocument> {
	// Fork published → draft (reuses existing guard logic)
	const draft = await revisePublishedPolicy(sourcePolicyId, revisedBy);

	if (acceptedDeltas.length === 0) {
		return draft;
	}

	// Apply each accepted delta to the draft's section clone.
	// 'edited' means the RM corrected the AI's proposed value before saving.
	// Cast via unknown first — PolicyDocument sections has strongly-typed sub-configs
	// which TypeScript won't let us widen directly to Record<…> without the bridge.
	const newSections = structuredClone(draft.sections) as unknown as Record<string, Record<string, unknown>>;
	for (const delta of acceptedDeltas) {
		const section = newSections[delta.sectionKey];
		if (!section || typeof section !== 'object') continue;
		const valueToApply = delta.rmDecision === 'edited' ? delta.editedValue : delta.newValue;
		section[delta.fieldKey] = valueToApply;
	}

	const pendingChanges = diffSections(
		draft.sections,
		newSections as unknown as PolicyDocument['sections'],
		revisedBy,
		'delta_parse'
	);

	const now = new Date();
	const oid = draft._id;

	await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'draft', lockVersion: 0 },
		{
			$set: {
				sections: newSections as unknown as PolicyDocument['sections'],
				pendingChanges,
				updatedBy: revisedBy,
				updatedAt: now
			},
			$inc: { lockVersion: 1 }
		}
	);

	return {
		...draft,
		sections: newSections as unknown as PolicyDocument['sections'],
		pendingChanges,
		lockVersion: 1,
		updatedBy: revisedBy,
		updatedAt: now
	};
}

/**
 * Admin JSON Editor — Phase 7 escape valve.
 *
 * Forks a published policy into a new draft with the admin's edited sections,
 * then auto-advances the draft to 'submitted' status (bypassing RM OTP because
 * admin is already the approval authority). The admin is then redirected to the
 * standard review page where they can approve immediately or make further changes.
 *
 * Guards:
 *   - source policy must be 'published'
 *   - no existing draft for the same (lenderId, loanProduct)
 *
 * Returns the new draft's _id string (as submitted status).
 */
export async function adminJsonEditPolicy(
	sourcePolicyId: string,
	newSections: PolicyDocument['sections'],
	adminUserId: string,
	expectedLockVersion?: number
): Promise<string> {
	// Step 0 (optional): optimistic-lock check. The endpoint passes the lockVersion
	// the admin's client saw when they loaded the policy. Two admins editing the
	// same published policy concurrently would otherwise have the second silently
	// overwrite the first — every other PMS write path enforces this; the JSON
	// editor used to be the lone exception.
	if (typeof expectedLockVersion === 'number') {
		const source = await getPolicyById(sourcePolicyId);
		if (source.lockVersion !== expectedLockVersion) {
			throw new PolicyLockConflictError(expectedLockVersion, source.lockVersion);
		}
	}

	// Step 1: Fork published → fresh draft (guards: published-only, no existing draft)
	const draft = await revisePublishedPolicy(sourcePolicyId, adminUserId);

	// Step 2: Diff original sections vs. admin's edits for the audit trail
	const changes = diffSections(draft.sections, newSections, adminUserId, 'admin_json_edit');
	const now = new Date();

	// Step 3: Patch draft with new sections, record changes, auto-submit.
	// Reconciliation is marked complete — admin JSON edits bypass the encode wizard flow.
	await PmsLenderPolicies.updateOne(
		{ _id: draft._id, status: 'draft' },
		{
			$set: {
				sections: newSections,
				status: 'submitted',
				submittedBy: adminUserId,
				submittedAt: now,
				updatedBy: adminUserId,
				updatedAt: now,
				'reconciliation.status': 'complete',
				'reconciliation.completedAt': now,
				'reconciliation.completedBy': adminUserId
			},
			$push: { pendingChanges: { $each: changes } },
			$inc: { lockVersion: 1 }
		}
	);

	return draft._id.toString();
}

/**
 * Computes per-leaf-field differences between two `sections` objects.
 * Each differing leaf becomes one PendingChange record for audit trail.
 *
 * Nested objects/arrays are compared via JSON-stringify; the whole nested
 * value is stored as oldValue/newValue (not decomposed further).
 */
export function diffSections(
	oldSections: PolicyDocument['sections'],
	newSections: PolicyDocument['sections'],
	changedBy: string,
	reason: PendingChange['reason'] = 'rm_edit'
): PendingChange[] {
	const changes: PendingChange[] = [];
	const now = new Date();

	// Iterate every section (eligibility, income, foir, ...) — both old and new may have nulls (e.g. ltv)
	const sectionKeys = Object.keys({ ...oldSections, ...newSections }) as Array<keyof PolicyDocument['sections']>;

	for (const sectionKey of sectionKeys) {
		const oldSection = (oldSections as Record<string, unknown>)[sectionKey];
		const newSection = (newSections as Record<string, unknown>)[sectionKey];

		// Whole-section null transitions (e.g. ltv: null → object): record as single change
		if (oldSection === null || newSection === null || typeof oldSection !== 'object' || typeof newSection !== 'object') {
			if (JSON.stringify(oldSection) !== JSON.stringify(newSection)) {
				changes.push({
					field: `sections.${sectionKey}`,
					oldValue: oldSection,
					newValue: newSection,
					reason,
					changedBy,
					changedAt: now,
					rmAcknowledged: false,
					rmAcknowledgedAt: null
				});
			}
			continue;
		}

		// Per-field diff within the section
		const oldFields = oldSection as Record<string, unknown>;
		const newFields = newSection as Record<string, unknown>;
		const fieldKeys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);

		for (const fieldKey of fieldKeys) {
			const oldValue = oldFields[fieldKey];
			const newValue = newFields[fieldKey];
			if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
				changes.push({
					field: `sections.${String(sectionKey)}.${fieldKey}`,
					oldValue,
					newValue,
					reason,
					changedBy,
					changedAt: now,
					rmAcknowledged: false,
					rmAcknowledgedAt: null
				});
			}
		}
	}

	return changes;
}

/**
 * Phase 5 RM edit save: writes new section values + appends PendingChange
 * records for every changed field. Atomic under optimistic lock.
 *
 * Used by PATCH /api/pms/policies/[id] when the body includes `sections` and
 * the intent is an RM edit (not a pipeline-driven update). Returns the list
 * of PendingChange records that were appended so the caller can surface them.
 */
export async function patchDraftSections(
	policyId: string,
	newSections: PolicyDocument['sections'],
	expectedLockVersion: number,
	updatedBy: string
): Promise<{ appendedChanges: PendingChange[]; newLockVersion: number }> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const current = await getPolicyById(policyId);
	if (current.status !== 'draft') {
		throw new PolicyStatusError(`Policy ${policyId} is not in draft status — cannot edit.`);
	}

	const appendedChanges = diffSections(current.sections, newSections, updatedBy, 'rm_edit');

	// Nothing actually changed — no-op, still bump lockVersion so client refreshes
	if (appendedChanges.length === 0) {
		return { appendedChanges: [], newLockVersion: current.lockVersion };
	}

	const now = new Date();
	const result = await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'draft', lockVersion: expectedLockVersion },
		{
			$set: { sections: newSections, updatedBy, updatedAt: now },
			$push: { pendingChanges: { $each: appendedChanges } },
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { lockVersion: 1, status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		if ((doc as PolicyDocument).status !== 'draft') {
			throw new PolicyStatusError(`Policy ${policyId} is not in draft status — cannot edit.`);
		}
		throw new PolicyLockConflictError(expectedLockVersion, (doc as PolicyDocument).lockVersion);
	}

	return { appendedChanges, newLockVersion: expectedLockVersion + 1 };
}

/**
 * Admin review action: attach a comment to a specific clause during Phase 6 review.
 * Idempotent on (policyId, clauseId) — overwrites any existing comment for that clauseId.
 * Accepts 'submitted' policies (admin review state).
 */
export async function upsertAdminClauseComment(
	policyId: string,
	clauseId: string,
	comment: string
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const trimmed = comment.trim();
	if (!trimmed) {
		// Empty comment = remove
		await PmsLenderPolicies.updateOne(
			{ _id: oid, status: 'submitted' },
			{ $pull: { adminClauseComments: { clauseId } } }
		);
		return;
	}

	// Pull any existing comment for this clauseId, then push the new one atomically
	await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'submitted' },
		{ $pull: { adminClauseComments: { clauseId } } }
	);
	await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'submitted' },
		{ $push: { adminClauseComments: { clauseId, comment: trimmed } } }
	);
}

/**
 * Saves updated sections or overrides to a draft policy.
 * Enforces optimistic lock — caller must supply the current lockVersion.
 * Throws PolicyLockConflictError on stale write.
 */
export async function updateDraftPolicy(
	policyId: string,
	updates: Partial<Pick<PolicyDocument, 'sections' | 'conditionalOverrides' | 'bankCardNotes' | 'pipelineState' | 'reconciliationAssignedTo' | 'pendingChanges'>>,
	expectedLockVersion: number,
	updatedBy: string
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	// Run conflict detection if overrides are being updated
	const conflictCheckedUpdates = { ...updates };
	if (updates.conditionalOverrides) {
		conflictCheckedUpdates.conditionalOverrides = rebuildAllConflicts(updates.conditionalOverrides);
	}

	const now = new Date();

	const result = await PmsLenderPolicies.updateOne(
		{
			_id: oid,
			status: 'draft',
			lockVersion: expectedLockVersion
		},
		{
			$set: {
				...conflictCheckedUpdates,
				updatedBy,
				updatedAt: now
			},
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		// Determine whether it was a lock conflict or missing document
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { lockVersion: 1, status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		if ((doc as PolicyDocument).status !== 'draft') {
			throw new PolicyStatusError(`Policy ${policyId} is not in draft status — cannot update.`);
		}
		throw new PolicyLockConflictError(expectedLockVersion, (doc as PolicyDocument).lockVersion);
	}
}

/**
 * Transitions a draft policy to submitted status.
 * RM clicks "Submit for admin review" after reconciliation sign-off.
 */
export async function submitPolicy(
	policyId: string,
	submittedBy: string,
	expectedLockVersion: number
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const now = new Date();

	const result = await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'draft', lockVersion: expectedLockVersion },
		{
			$set: { status: 'submitted', submittedBy, submittedAt: now, updatedBy: submittedBy, updatedAt: now },
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { lockVersion: 1, status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		if ((doc as PolicyDocument).status !== 'draft') {
			throw new PolicyStatusError(`Policy ${policyId} is not in draft status — cannot submit.`);
		}
		throw new PolicyLockConflictError(expectedLockVersion, (doc as PolicyDocument).lockVersion);
	}
}

/**
 * Admin approves a submitted policy.
 * - No scheduledPublishAt → immediately transitions to 'published' (live now)
 * - scheduledPublishAt set → transitions to 'approved_scheduled'; cron promotes at the given time
 *
 * Invalidates the evaluation engine's PMS cache on immediate publish so the
 * next DSA evaluation picks up the new policy without waiting for the 60s TTL.
 */
export async function approvePolicy(
	policyId: string,
	approvedBy: string,
	scheduledPublishAt: Date | null
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const now = new Date();

	// Immediate approval → live immediately as 'published'
	// Scheduled approval → holds in 'approved_scheduled' until cron promotes it
	const newStatus = scheduledPublishAt ? 'approved_scheduled' : 'published';

	const result = await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'submitted' },
		{
			$set: {
				status: newStatus,
				approvedBy,
				approvedAt: now,
				scheduledPublishAt: scheduledPublishAt ?? null,
				// Stamp publishedAt/By only when going live immediately
				...(newStatus === 'published' ? { publishedAt: now, publishedBy: approvedBy } : {}),
				updatedBy: approvedBy,
				updatedAt: now
			},
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		throw new PolicyStatusError(
			`Policy ${policyId} is in status "${(doc as PolicyDocument).status}" — only "submitted" policies can be approved.`
		);
	}

	// Invalidate the evaluation engine cache so the next evaluation uses the new policy
	if (newStatus === 'published') {
		const policy = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { lenderId: 1, loanProduct: 1 } });
		if (policy) {
			await invalidatePmsEvalCache(
				(policy as PolicyDocument).lenderId,
				(policy as PolicyDocument).loanProduct
			);
		}
	}
}

/**
 * Admin rejects a submitted policy — sends it back to draft with a note.
 */
export async function rejectPolicy(
	policyId: string,
	rejectedBy: string,
	rejectionNote: string
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const now = new Date();

	const result = await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'submitted' },
		{
			$set: {
				status: 'draft',
				adminRejectionNote: rejectionNote,
				adminRejectedAt: now,
				updatedBy: rejectedBy,
				updatedAt: now
			},
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		throw new PolicyStatusError(
			`Policy ${policyId} is in status "${(doc as PolicyDocument).status}" — only "submitted" policies can be rejected.`
		);
	}
}

/**
 * Archives a published policy — typically called before publishing its replacement.
 */
export async function archivePolicy(
	policyId: string,
	archivedBy: string
): Promise<void> {
	let oid: ObjectId;
	try {
		oid = new ObjectId(policyId);
	} catch {
		throw new PolicyNotFoundError(policyId);
	}

	const result = await PmsLenderPolicies.updateOne(
		{ _id: oid, status: 'published' },
		{
			$set: { status: 'archived', validTo: new Date(), updatedBy: archivedBy, updatedAt: new Date() },
			$inc: { lockVersion: 1 }
		}
	);

	if (result.matchedCount === 0) {
		const doc = await PmsLenderPolicies.findOne({ _id: oid }, { projection: { status: 1 } });
		if (!doc) throw new PolicyNotFoundError(policyId);
		throw new PolicyStatusError(
			`Policy ${policyId} is in status "${(doc as PolicyDocument).status}" — only "published" policies can be archived.`
		);
	}
}

/**
 * Adds a single override to a draft policy.
 * Runs conflict detection against all existing overrides automatically.
 */
export async function addOverride(
	policyId: string,
	override: ConditionalOverride,
	expectedLockVersion: number,
	updatedBy: string
): Promise<ConflictRecord[]> {
	const policy = await getPolicyById(policyId);

	if (policy.status !== 'draft') {
		throw new PolicyStatusError(`Policy ${policyId} is not in draft status — cannot add overrides.`);
	}

	// Run conflict check against existing overrides
	const { checkForConflicts } = await import('./conflictChecker.js');
	const conflicts = checkForConflicts(override, policy.conditionalOverrides);

	const overrideWithConflict: ConditionalOverride = {
		...override,
		conflictCheck: {
			ranAt: new Date(),
			conflicts,
			acknowledgedBy: null,
			acknowledgedAt: null
		}
	};

	await updateDraftPolicy(
		policyId,
		{
			conditionalOverrides: [...policy.conditionalOverrides, overrideWithConflict]
		},
		expectedLockVersion,
		updatedBy
	);

	return conflicts;
}
