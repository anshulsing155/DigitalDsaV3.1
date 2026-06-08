/**
 * PMS Type Definitions — Phase 0 + Phase 1
 * ══════════════════════════════════════════════════════════════════
 * All MongoDB document shapes, pipeline result types, and supporting
 * value types for the Policy Management System.
 *
 * Phases defined here:
 *   Phase 0 — RM identity + lender assignment
 *   Phase 1 — Policy document schema + pipeline types
 *
 * See: docs/specs/PMS-IMPLEMENTATION-PLAN.md §Phase 0, §Phase 1
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { LoanProduct } from '$lib/config/lenderPolicies/types';

// ─── Phase 0 ─────────────────────────────────────────────────────────────────

/**
 * Context field attached to PMS-issued OTPs.
 * Bound to a specific lender + policy + draft hash to prevent replay.
 * Stored additively on the existing OTPDocument in `emailOtps` collection.
 */
export interface PmsOtpContext {
	purpose: 'onboarding' | 'monthly_renewal' | 'policy_change' | 'lender_switch';
	lenderId: string;
	/** Required when purpose is 'policy_change' */
	policyId?: string;
	/** SHA-256 of draft content at OTP issue time — blocks replay on a different draft */
	draftHash?: string;
}

/**
 * RM ↔ Lender assignment record.
 * Collection: `rm_lender_assignments`
 *
 * One active record per (rmUserId, lenderId) pair.
 * Unique index: { rmUserId: 1, lenderId: 1 }
 */
export interface RmLenderAssignment {
	_id: ObjectId;
	rmUserId: string;
	lenderId: string;
	lenderName: string;
	/** Verified at onboarding — domain must match lenderDirectory officialEmailDomain */
	officialBankEmail: string;
	status: 'active' | 'suspended' | 'pending_verification';
	onboardedAt: Date;
	lastMonthlyVerifiedAt: Date;
	/** Rolling 30-day window from lastMonthlyVerifiedAt */
	nextVerificationDueBy: Date;
	suspendedAt: Date | null;
	suspendedReason: string | null;
	/** Set when an admin transfers this assignment to a replacement RM */
	transferredTo: string | null;
	transferredAt: Date | null;
}

// ─── Phase 1 — Supporting value types ────────────────────────────────────────

/** JSON-Logic rule — any valid json-logic expression */
export type JsonLogicRule = Record<string, unknown>;

export type ClauseTag =
	| 'eligibility'
	| 'income'
	| 'foir'
	| 'ltv'
	| 'tenure'
	| 'roi'
	| 'geo'
	| 'fee'
	| 'obligation'
	| 'deviation'
	| 'other';

export type ConditionScope =
	| 'primary_applicant'
	| 'any_applicant'
	| 'all_applicants'
	| 'property'
	| 'loan'
	| 'global';

/**
 * The resulting effect of a conditional override — what value gets written
 * when the condition evaluates to true.
 */
export interface PolicyEffect {
	fieldPath: string;
	operation: 'set' | 'add' | 'multiply' | 'max' | 'min';
	value: number | string | boolean;
}

/** Eligibility section of a lender policy */
export interface EligibilityConfig {
	minAge: number;
	maxAge: number;
	minCreditScore: number;
	allowedEmploymentTypes: string[];
	allowedNationalities: string[];
	isDefaulterAllowed: boolean;
	notes: string | null;
}

/** Income assessment section */
export interface IncomeConfig {
	allowedIncomeSources: string[];
	haircutBySalaried: number;
	haircutBySelfEmployed: number;
	haircutByRental: number;
	haircutByOther: number;
	minNetIncome: number | null;
	minGrossIncome: number | null;
	notes: string | null;
}

/** FOIR constraints */
export interface FoirConfig {
	salaried: number;
	selfEmployed: number;
	notes: string | null;
}

/** LTV constraints */
export interface LtvConfig {
	maxLtvByPropertyType: Record<string, number>;
	maxLtvByLoanAmount: { upTo: number; maxLtv: number }[];
	notes: string | null;
}

/** Obligation handling */
export interface ObligationConfig {
	deductFromFoir: boolean;
	creditCardFoirMethod: 'utilization' | 'limit_percentage' | 'full_limit';
	creditCardLimitPercentage: number | null;
	notes: string | null;
}

/** Tenure constraints */
export interface TenureConfig {
	minTenureMonths: number;
	maxTenureMonths: number;
	maxAgeAtMaturity: number;
	notes: string | null;
}

/** Rate of interest section */
export interface RoiConfig {
	minRoi: number;
	maxRoi: number;
	spreadOverRepo: number | null;
	roiType: 'fixed' | 'floating' | 'both';
	notes: string | null;
}

/** Geographic coverage constraints */
export interface GeoConfig {
	allowedStates: string[];
	excludedCities: string[];
	notes: string | null;
}

/** Fees and charges */
export interface FeeConfig {
	processingFeePercent: number | null;
	processingFeeFlat: number | null;
	processingFeeMin: number | null;
	processingFeeMax: number | null;
	prepaymentAllowed: boolean;
	prepaymentChargePercent: number | null;
	notes: string | null;
}

/** Conflict between two conditional overrides */
export interface ConflictRecord {
	existingOverrideId: string;
	existingLabel: string;
	conflictType: 'same_field_override' | 'overlapping_scope';
	description: string;
}

/**
 * A single conditional policy override (one IF-THEN rule).
 * Stored as array on PolicyDocument.conditionalOverrides.
 */
export interface ConditionalOverride {
	id: string;
	label: string;
	sourceClauseId: string;
	authoringMode: 'template' | 'custom_json' | 'bank_card';
	templateId: string | null;
	templateParams: Record<string, unknown> | null;
	condition: JsonLogicRule;
	effect: PolicyEffect;
	scope: ConditionScope;
	source: 'website' | 'rm_confirmed' | 'aggregator' | 'assumed';
	/** RM-set confidence 0.0–1.0 */
	confidence: number;
	/** AI-assigned confidence from Pass 3 — may differ from RM-set */
	aiConfidence: number | null;
	conflictCheck: {
		ranAt: Date;
		conflicts: ConflictRecord[];
		acknowledgedBy: string | null;
		acknowledgedAt: Date | null;
	} | null;
	/** custom_json overrides require explicit admin co-approval */
	adminCoApproved: boolean;
	adminCoApprovedBy: string | null;
	adminCoApprovedAt: Date | null;
	notes: string;
	addedBy: string;
	addedAt: Date;
}

/** Free-text note shown on the DSA-facing bank card */
export interface BankCardNote {
	id: string;
	text: string;
	addedBy: string;
	addedAt: Date;
}

/** Single discrepancy found when comparing PMS policy against legacy TS policy */
export interface LegacyDiscrepancy {
	field: string;
	legacyValue: unknown;
	pmsValue: unknown;
	/**
	 * Resolution state stored in MongoDB.
	 *   - 'pending'                — admin has not yet resolved
	 *   - 'pms_wins'               — keep PMS value, no follow-up needed
	 *   - 'legacy_wins_pending_rm' — admin chose legacy value; an RM PendingChange is queued to update PMS
	 *   - 'ask_rm'                 — admin punted to RM; RM must decide on next reconciliation pass
	 */
	resolution: 'pms_wins' | 'legacy_wins_pending_rm' | 'ask_rm' | 'pending';
	resolvedBy: string | null;
	resolvedAt: Date | null;
	note: string | null;
}

/** Pending change record — created when a discrepancy resolution requires future RM action */
export interface PendingChange {
	field: string;
	oldValue: unknown;
	newValue: unknown;
	reason:
		| 'legacy_comparison'
		| 'compare_with_legacy'
		| 'stale_key_remediation'
		| 'rm_edit'
		| 'admin_manual_entry'
		| 'delta_parse'
		| 'admin_json_edit';
	changedBy: string;
	changedAt: Date;
	rmAcknowledged: boolean;
	rmAcknowledgedAt: Date | null;
}

/** A single field-level change detected by the delta parse pipeline */
export interface PolicyDelta {
	/** Section of the policy (e.g. 'eligibility', 'foir') */
	sectionKey: string;
	/** Field within the section (e.g. 'minAge', 'maxFoirSalaried') */
	fieldKey: string;
	oldValue: unknown;
	newValue: unknown;
	/** 0.0–1.0 — how confident the AI is that this change is real */
	confidence: number;
	/** Exact quote from the addendum that supports this change */
	evidenceQuote: string;
	/** Set by RM in Step 1 review */
	rmDecision: 'accepted' | 'rejected' | 'edited' | null;
	/** Only present when rmDecision === 'edited' */
	editedValue?: unknown;
}

/** Full result of one delta parse run */
export interface DeltaResult {
	deltas: PolicyDelta[];
	tokensUsed: number;
	overallConfidence: number;
	summary: string;
	ranAt: string;
}

/** Reconciliation record attached to every PolicyDocument */
export interface ReconciliationRecord {
	status: 'pending' | 'in_progress' | 'complete';
	assignedTo: string;
	clauses: {
		clauseId: string;
		status: 'pending' | 'accepted' | 'amended' | 'rejected';
		note: string | null;
		reviewedAt: Date | null;
	}[];
	completedAt: Date | null;
	completedBy: string | null;
}

// ─── Phase 1 — AI Pipeline result types ──────────────────────────────────────

/** Output of Pass 1 — Normalize: Terminology Resolution + Relevance Classification */
export interface Pass1Result {
	normalizedText: string;
	segments: {
		id: string;
		originalText: string;
		normalizedText: string;
		relevance: 'in_scope' | 'out_of_scope' | 'ambiguous';
		unknownTerms: string[];
	}[];
}

/** Output of Pass 2 — Atomization + Ambiguity Flagging */
export interface Pass2Clause {
	id: string;
	originalText: string;
	normalizedText: string;
	atoms: {
		conditionText: string;
		candidateKeyPath: string | null;
		operator: string | null;
		value: unknown;
		scope: string | null;
	}[];
	outcome: { fieldPath: string | null; value: unknown };
	ambiguityFlags: {
		type: 'multiple_interpretations' | 'internal_conflict' | 'external_reference' | 'unmapped_key';
		description: string;
		interpretations?: string[];
	}[];
	tag: ClauseTag;
}

/** Output of Pass 3 — Encode: Template Matching + JSON-Logic */
export interface Pass3Encoding {
	clauseId: string;
	mappable: boolean;
	preferredMode: 'template' | 'custom_json' | null;
	templateId: string | null;
	templateParams: Record<string, unknown> | null;
	rawCondition: JsonLogicRule | null;
	effect: PolicyEffect | null;
	scope: ConditionScope | null;
	/** AI confidence 0.0–1.0 */
	confidence: number;
	unmappableReason: string | null;
	routingRecommendation: 'encode' | 'bank_card' | 'dev_queue';
}

/** Output of Pass 4 — Encoding Verification */
export interface Pass4Result {
	overallScore: number;
	/** True when overallScore >= 85 */
	isValid: boolean;
	clauseScores: {
		clauseId: string;
		score: number;
		issues: {
			severity: 'critical' | 'high' | 'medium' | 'low';
			category: 'wrong_field' | 'hallucination' | 'missing' | 'wrong_value' | 'wrong_logic';
			description: string;
			policyQuote: string;
			correction: string;
		}[];
	}[];
	summary: string;
}

/** Output of Pass 6 — Reconstruction */
export interface Pass6Result {
	/** Method A: deterministic, template-based reconstruction (zero tokens) */
	methodA: { clauseId: string; reconstructedText: string }[];
	/** Method B: AI prose reconstruction of the full policy */
	methodB: string;
}

// ─── Phase 6 — QA Impact Report types ────────────────────────────────────────

export interface QaProfileSummary {
	profileId: string;
	description: string;
	loanType: string;
	/** null when no baseline policy exists to compare against */
	before: {
		trafficLight: 'green' | 'amber' | 'red' | 'grey';
		gatesPassed: boolean;
		foir: number;
		roi: number;
		tenureMonths: number;
		eligibleAmount: number;
	} | null;
	after: {
		trafficLight: 'green' | 'amber' | 'red' | 'grey';
		gatesPassed: boolean;
		foir: number;
		roi: number;
		tenureMonths: number;
		eligibleAmount: number;
	};
	changed: boolean;
	changeTypes: ('eligibility' | 'foir' | 'roi' | 'tenure')[];
}

export interface QaRunResult {
	ranAt: Date;
	/** All profiles generated by variationGenerator (always 296) */
	totalProfiles: number;
	/** Profiles that match this policy's loanProduct */
	testedProfiles: number;
	changedProfiles: number;
	/** Profiles where traffic_light crossed the pass/fail boundary */
	flippedEligibility: number;
	/** False when no previously published version exists — comparison is against null baseline */
	hadBaseline: boolean;
	results: QaProfileSummary[];
}

// ─── Phase 1 — PolicyDocument (lender_policies collection) ───────────────────

/**
 * The central policy document stored in MongoDB.
 * Collection: `lender_policies`
 *
 * Indexes:
 *   { lenderId: 1, loanProduct: 1, status: 1 }
 *   { lenderId: 1, loanProduct: 1, version: -1 }
 *   { status: 1, scheduledPublishAt: 1 }   ← for cron promotion of approved_scheduled
 */
export interface PolicyDocument {
	_id: ObjectId;
	lenderId: string;
	loanProduct: LoanProduct;
	/** Increments on each publish — starts at 1 */
	version: number;
	/** SHA-256 of compiled JSON-Logic at publish time */
	hash: string;
	status:
		| 'draft'
		| 'submitted'
		| 'approved_scheduled'
		| 'approved'
		| 'published'
		| 'archived';
	validFrom: Date;
	validTo: Date | null;

	/**
	 * Optimistic lock counter — incremented on every write.
	 * All PATCH/submit requests must echo the last-known value.
	 * On mismatch → 409 Conflict.
	 */
	lockVersion: number;

	/** rmUserId or adminUserId responsible for Step 4 reconciliation sign-off */
	reconciliationAssignedTo: string;

	sections: {
		eligibility: EligibilityConfig;
		income: IncomeConfig;
		foir: FoirConfig;
		ltv: LtvConfig | null;
		obligations: ObligationConfig;
		tenure: TenureConfig;
		roi: RoiConfig;
		geo: GeoConfig;
		fees: FeeConfig;
	};

	conditionalOverrides: ConditionalOverride[];
	bankCardNotes: BankCardNote[];

	/**
	 * Per-field audit trail. Appended on every RM edit (Phase 5), legacy-wins
	 * admin resolution, and admin manual entry. Preserved on version stamp.
	 */
	pendingChanges: PendingChange[];

	sourceDocument: {
		text: string;
		fileName: string;
		uploadedAt: Date;
		uploadedBy: string;
	};

	/**
	 * Persisted wizard state — allows full resume on page mount.
	 * null = wizard not yet started.
	 */
	pipelineState: {
		currentStep: 0 | 1 | 2 | 3 | 4 | 5;
		pass1Result: Pass1Result | null;
		pass2Clauses: Pass2Clause[] | null;
		rmStep1Decisions: Record<string, 'in_scope' | 'out_of_scope' | 'bank_card' | string>;
		rmStep2Encodings: Partial<ConditionalOverride>[];
		pass4LastScore: number | null;
		/** Saved after pass6 completes so reconciliation table restores on browser refresh */
		pass6Result?: Pass6Result | null;
		/** Saved after delta parse completes — Entry B only */
		deltaResult?: DeltaResult | null;
		lastSavedAt: Date;
		/** Populated when a pass times out or fails */
		errorState: { step: number; message: string } | null;
	} | null;

	reconciliation: ReconciliationRecord;

	aiPipelineRun: {
		mode: 'automated' | 'manual_entry';
		pass1Score: number | null;
		pass4ScoreBeforeCorrection: number | null;
		pass5Triggered: boolean;
		finalScore: number | null;
		passesExecuted: number;
		totalTokensUsed: number;
		ranAt: Date;
	} | null;

	legacyComparison: {
		comparedAt: Date;
		discrepancies: LegacyDiscrepancy[];
		resolvedAt: Date | null;
		resolvedBy: string | null;
	} | null;

	/** Phase 6 — QA impact report (296-profile synthetic run) */
	qaRun: QaRunResult | null;

	/** Key registry health — populated by Phase 11 health scan */
	registryHealthCheck: {
		ranAt: Date;
		staleKeys: string[];
		status: 'healthy' | 'stale_keys_found';
	} | null;

	// Audit trail
	createdBy: string;
	createdAt: Date;
	updatedBy: string;
	updatedAt: Date;
	submittedBy: string | null;
	submittedAt: Date | null;
	approvedBy: string | null;
	approvedAt: Date | null;
	/** Only set when status === 'approved_scheduled' */
	scheduledPublishAt: Date | null;
	publishedBy: string | null;
	publishedAt: Date | null;
	adminRejectionNote: string | null;
	adminRejectedAt: Date | null;
	adminClauseComments: { clauseId: string; comment: string }[];
}

// ─── Phase 1 — PolicySuggestion (policy_suggestions collection) ──────────────

/**
 * DSA-submitted suggestion for a policy change.
 * Collection: `policy_suggestions`
 *
 * Deduplication index (sparse): { lenderId, loanProduct, fieldPath, submittedBy }
 * TTL: 30 days from submittedAt
 */
export interface PolicySuggestion {
	_id: ObjectId;
	lenderId: string;
	loanProduct: LoanProduct;
	clauseId: string | null;
	fieldPath: string | null;
	currentValue: unknown;
	suggestedValue: unknown;
	/** Min 20 chars, max 500 chars — server-enforced */
	dsaNote: string;
	caseReference: string | null;
	branchCity: string | null;
	status: 'pending' | 'accepted' | 'dismissed';
	reviewedBy: string | null;
	reviewNote: string | null;
	submittedBy: string;
	submittedAt: Date;
}

// ─── Phase 1 — FutureEnhancementItem (policy_future_queue collection) ─────────

/**
 * An unmappable clause queued for future form key addition.
 * Collection: `policy_future_queue`
 */
export interface FutureEnhancementItem {
	_id: ObjectId;
	clauseText: string;
	proposedKeyPath: string | null;
	proposedKeyType: 'string' | 'number' | 'boolean' | 'enum' | null;
	/** Which lenders have this requirement */
	lenderIds: string[];
	status: 'pending' | 'in_progress' | 'promoted' | 'dismissed';
	promotedKeyPath: string | null;
	promotedAt: Date | null;
	promotedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}
