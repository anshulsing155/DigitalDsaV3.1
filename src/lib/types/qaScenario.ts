import type { ObjectId } from 'mongodb';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';

/**
 * A saved QA test scenario. Every field except testerNote and expectedWarnings
 * is derived from actual form answers — never hand-authored.
 *
 * autoName is always computed by deriveFixtureName() and is never editable.
 */
export interface QaScenario {
	_id?: ObjectId;

	// ── Identity ────────────────────────────────────────────────────────────────
	/** Computed by deriveFixtureName(). Never editable by the tester. */
	autoName: string;
	/** Optional free-text note from the tester. Only human-authored field. */
	testerNote: string;

	// ── Form state (the source of truth for this scenario) ─────────────────────
	/** All loan-level form answers (bindsTo keys). */
	loanAnswers: Record<string, unknown>;
	/** First-page application data — contains tellUsWhoIsApplying etc. */
	applicationData: Record<string, unknown>;
	/** Per-applicant answer maps. applicants[0] is the primary applicant. */
	applicants: Array<Record<string, unknown>>;
	/** Applicant-to-applicant relationships (optional). */
	relationships: Array<{
		fromId: string;
		toId: string;
		relationType: string;
		category?: string;
	}>;

	// ── Built payload ───────────────────────────────────────────────────────────
	/**
	 * Always derived from form answers via buildLoanPayload().
	 * Stored for fast read — never edited directly.
	 */
	payload: LoanApplicationPayload;

	// ── Flat indexed metadata (for fast MongoDB queries and UI filters) ─────────
	meta: QaScenarioMeta;

	// ── Test expectations ────────────────────────────────────────────────────────
	/** Warnings the tester expects to see during the form fill. */
	expectedWarnings: string[];

	// ── Run results ─────────────────────────────────────────────────────────────
	lastRunAt: Date | null;
	lastRunResult: 'pass' | 'fail' | 'warning' | null;
	lastRunDetails: QaRunDetails | null;

	// ── Audit ────────────────────────────────────────────────────────────────────
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	isArchived: boolean;
}

/** Flat metadata extracted from form answers. Indexed in MongoDB for fast filtering. */
export interface QaScenarioMeta {
	loanType: string;       // e.g. "Home Loan"
	formPath: string;       // e.g. "New Loan", "Balance Transfer"
	employment: string;     // e.g. "Salaried Private", "CA"
	city: string;           // primary city for this scenario
	cibil: number;          // primary applicant creditScore (0 if missing)
	applicantCount: number;
	tags: string[];         // ["NRI", "Low CIBIL"]
}

/** Stored result from a single test run. */
export interface QaRunDetails {
	ranAt: Date;
	/** Whether buildLoanPayload() succeeded without throwing. */
	payloadBuilt: boolean;
	/** Full evaluation output from evaluatePayload(). */
	evaluationResult: LenderResultsData | null;
	/** Which expected warnings were found in the form flow. */
	warningsMatched: string[];
	/** Which expected warnings were NOT found. */
	warningsMissing: string[];
	overallResult: 'pass' | 'fail' | 'warning';
	/** Error message if payloadBuilt is false. */
	buildError?: string;
}

/** Payload for POST /api/qa/scenarios — what the form sends when saving. */
export interface SaveScenarioRequest {
	loanAnswers: Record<string, unknown>;
	applicationData: Record<string, unknown>;
	applicants: Array<Record<string, unknown>>;
	relationships?: Array<{
		fromId: string;
		toId: string;
		relationType: string;
		category?: string;
	}>;
	testerNote?: string;
	expectedWarnings?: string[];
}

/** Payload for PATCH /api/qa/scenarios/[id] — only the editable fields. */
export interface UpdateScenarioRequest {
	testerNote?: string;
	expectedWarnings?: string[];
	isArchived?: boolean;
}

/** Payload for POST /api/qa/scenarios/run — run one or many scenarios. */
export interface RunScenariosRequest {
	/** Scenario IDs to run. Pass empty array to run all non-archived. */
	ids: string[];
}
