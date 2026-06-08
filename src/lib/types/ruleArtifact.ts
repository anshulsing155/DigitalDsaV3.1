/**
 * Rule Artifact Type Definitions
 * ══════════════════════════════════════════════════════════════════
 * Types for the rule authoring pipeline. Every rule authoring cycle
 * produces a paired artifact: JSON-Logic rules + human-readable doc.
 * Stored in the `lenderRuleArtifacts` collection.
 *
 * See: docs/RULE-ENGINE-SPECIFICATION.md Section 2.2
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { LenderClassification } from './policyEngine';

// ── Pipeline Status ────────────────────────────────────────────────

export type ArtifactStatus =
	| 'draft'
	| 'parsing'
	| 'in_review'
	| 'rm_pending'
	| 'approved'
	| 'active'
	| 'superseded'
	| 'parse_error';

// ── Diff Report (per-section comparison) ───────────────────────────

export interface DiffSection {
	section: string;
	severity: 'match' | 'minor' | 'major' | 'missing';
	source_excerpt: string;
	generated_excerpt: string;
	discrepancy?: string;
}

export interface DiffReport {
	overall_match: boolean;
	sections: DiffSection[];
	summary: string;
}

// ── Parse Iteration ────────────────────────────────────────────────

export interface ParseIteration {
	iteration: number;
	diff_report: DiffReport;
	corrections_made: string[];
	resolved: boolean;
	human_intervention_needed: boolean;
	completed_at: Date;
}

// ── RM Query (raised during verification) ──────────────────────────

export type RMQueryCategory =
	| 'rate_discrepancy'
	| 'missing_product'
	| 'eligibility_mismatch'
	| 'documentation_error'
	| 'fee_discrepancy'
	| 'general';

export interface RMQuery {
	query_id: string;
	category: RMQueryCategory;
	section: string;
	question: string;
	response?: string;
	resolved: boolean;
	raised_at: Date;
	resolved_at?: Date;
}

// ── RM Review ──────────────────────────────────────────────────────

export interface RMReview {
	thread_id?: ObjectId;
	queries: RMQuery[];
	approved_by?: string;
	approved_at?: Date;
}

// ── Confidence Scores ──────────────────────────────────────────────

/** Per-section confidence from AI parsing (0.0 to 1.0) */
export type ConfidenceScores = Record<string, number>;

// ── Rule Artifact Pair (the main document) ─────────────────────────

export interface RuleArtifactPair {
	_id: ObjectId;
	artifact_id: string;
	lender_id: string;
	lender_name: string;
	classification: LenderClassification;
	loan_types: string[];
	version: number;

	status: ArtifactStatus;

	/** The pair -- always together, never separate */
	json_logic: Record<string, unknown> | null;
	human_readable: string | null;

	/** Per-section confidence scores from AI parse */
	confidence_scores: ConfidenceScores | null;

	/** Audit trail of parse/diff iterations */
	parse_iterations: ParseIteration[];

	/** RM verification state */
	rm_review: RMReview;

	/** Source traceability */
	source_document_urls: string[];
	parsed_by: string;
	reviewed_by?: string;

	/** Version tracking — links to previous version when superseded */
	change_summary?: string;
	previous_version_id?: string;
	changes_from_previous?: VersionChanges;

	/** Soft-delete tracking */
	deleted_by?: string;
	deleted_at?: Date;

	created_at: Date;
	activated_at?: Date;
	updated_at: Date;
}

// ── Version Change Tracking ──────────────────────────────────────

export interface ParameterChange {
	param: string;
	old_value: unknown;
	new_value: unknown;
}

export interface VersionChanges {
	sections_modified: string[];
	rules_added: number;
	rules_removed: number;
	rules_modified: number;
	parameter_changes: ParameterChange[];
}

// ── Lender Rule Fixture (test profile) ─────────────────────────────

export interface LenderRuleFixture {
	_id: ObjectId;
	fixture_id: string;
	name: string;
	description: string;
	payload: Record<string, unknown>;
	expected_results?: Record<string, unknown>;
	created_at: Date;
}
