/**
 * Business-runner co-applicant (P12)
 * ════════════════════════════════════════════════════════════════════════════
 * Business Loan, SOLE PROPRIETORSHIP only: when the proprietor is female, the
 * form asks "Who runs the business?". If the answer is NOT "Self", that person
 * (husband / father / son / other) must be added as a CO-APPLICANT whose full
 * personal financials are captured — for income VALIDATION / fraud checks only,
 * never pooled into eligibility (consistent with P16 / ADR-0012: a Business Loan
 * is sized on the business entity). The runner therefore carries the
 * `non_applicant_full_financial` classification (full data, not pooled).
 *
 * This module is the pure, testable core of that lifecycle: given the answer and
 * the current applicants list, it returns the next applicants list plus the
 * relationship intent. The Svelte component owns the actual store side-effects.
 */

import { v4 as uuidv4 } from 'uuid';

export interface BusinessRunnerRelation {
	label: string;
	/** Relationship of the RUNNER to the (female) proprietor, e.g. "Husband of".
	 *  undefined for 'other' — relation is unknown, so no edge is created. */
	relationType: string | undefined;
	/** Gender the runner is inferred to have. undefined for 'other'. */
	gender: 'male' | undefined;
}

/** Runner answer value → relationship metadata. 'self' is intentionally absent. */
export const BUSINESS_RUNNER_RELATIONS: Record<string, BusinessRunnerRelation> = {
	husband: { label: 'Husband', relationType: 'Husband of', gender: 'male' },
	father: { label: 'Father', relationType: 'Father of', gender: 'male' },
	son: { label: 'Son', relationType: 'Son of', gender: 'male' }
	// 'other' handled explicitly (unknown relation + gender) — see OTHER_RUNNER.
};

const OTHER_RUNNER: BusinessRunnerRelation = {
	label: 'Other',
	relationType: undefined,
	gender: undefined
};

/** Options for the "Who runs the business?" select (full canonical list). */
export const BUSINESS_RUNNER_OPTIONS = [
	{ label: 'Self', value: 'self' },
	{ label: 'Husband', value: 'husband' },
	{ label: 'Father', value: 'father' },
	{ label: 'Son', value: 'son' },
	{ label: 'Other', value: 'other' }
];

/**
 * Filter the runner options by the proprietor's marital status.
 *
 * Per-option rules (Indian family-context the form is designed for):
 *
 *   - "Husband": requires CURRENTLY being married. A single / divorced /
 *     separated / widowed woman has no current husband — the form previously
 *     let the DSA pick "Single" + "Husband" together (user-reported
 *     2026-05-26, BL screenshot).
 *
 *   - "Son": requires having BEEN married at some point (a son old enough
 *     to run a business implies the proprietor went through marriage).
 *     Married / Divorced / Separated / Widowed all qualify. Single does
 *     NOT (user-reported 2026-05-26 follow-up — picking "Single" + "Son"
 *     is the same class of impossible combination as Single + Husband).
 *
 *   - "Father": always valid (every adult has one biologically; the
 *     proprietor's marital status doesn't determine the father's existence).
 *
 *   - "Self" / "Other": always valid (proprietor herself, or catch-all).
 *
 * Unknown / empty marital status returns the FULL list — don't punish a
 * DSA who hasn't answered marital status yet. The Next-disabled validator
 * on `maritalStatus` handles the unanswered case separately.
 */
export function getBusinessRunnerOptionsForMaritalStatus(
	maritalStatus: string | undefined | null
): typeof BUSINESS_RUNNER_OPTIONS {
	const status = (maritalStatus ?? '').trim().toLowerCase();
	// Empty / unknown → permissive (full list).
	if (!status) return BUSINESS_RUNNER_OPTIONS;

	const excluded = new Set<string>();
	// "Husband" requires currently being married.
	if (status !== 'married') excluded.add('husband');
	// "Son" requires having been married at some point.
	if (status === 'single') excluded.add('son');

	if (excluded.size === 0) return BUSINESS_RUNNER_OPTIONS;
	return BUSINESS_RUNNER_OPTIONS.filter((o) => !excluded.has(o.value));
}

/** True when the answer means someone OTHER than the proprietor runs the business. */
export function runnerIsOther(whoRuns: string | undefined | null): boolean {
	return !!whoRuns && whoRuns !== 'self';
}

/** True when the relation fully determines gender (husband/father/son = male). */
export function relationLocksGender(whoRuns: string | undefined | null): boolean {
	return whoRuns === 'husband' || whoRuns === 'father' || whoRuns === 'son';
}

/** Minimum age for any co-applicant (legal threshold in India). */
export const MIN_CO_APPLICANT_AGE = 18;

export interface RunnerAgeBounds {
	/** Inclusive minimum age the runner must be. */
	min: number;
	/** Inclusive maximum age the runner can be. undefined = no upper cap. */
	max?: number;
	/** Plain-English label rendered as the field's helper text + error message. */
	label: string;
}

/**
 * Permitted age range for the runner co-applicant given the proprietor's age.
 *
 * Indian socio-legal norms drive the gaps:
 *   - Husband: spouse age within ±15 years of proprietor (covers typical
 *     marriages including a reasonable late-marriage spread).
 *   - Father: at least 15 years older than proprietor (a parent has to be old
 *     enough to be one; tighter than biological minimum to also reject obvious
 *     entry errors).
 *   - Son: at least 15 years younger than proprietor (mirror of Father) AND
 *     at least 18 (legal co-applicant minimum — a minor cannot sign).
 *   - Other: only the 18-year legal minimum, no upper cap.
 *
 * Returns null when the relation is self/blank/unknown OR proprietor's age is
 * not yet entered (caller renders no bounds in that case).
 */
export function ageGapBoundsFor(
	whoRuns: string | undefined | null,
	proprietorAge: number | undefined | null
): RunnerAgeBounds | null {
	if (!whoRuns || whoRuns === 'self') return null;
	const propAge = typeof proprietorAge === 'number' ? proprietorAge : Number(proprietorAge);
	const haveProp = Number.isFinite(propAge) && propAge > 0;

	if (whoRuns === 'husband') {
		if (!haveProp) {
			return { min: MIN_CO_APPLICANT_AGE, label: `Must be at least ${MIN_CO_APPLICANT_AGE}.` };
		}
		const min = Math.max(MIN_CO_APPLICANT_AGE, propAge - 15);
		const max = propAge + 15;
		return {
			min,
			max,
			label: `Husband's age should be between ${min} and ${max} (within 15 years of the proprietor).`
		};
	}

	if (whoRuns === 'father') {
		if (!haveProp) {
			return { min: MIN_CO_APPLICANT_AGE, label: `Must be at least ${MIN_CO_APPLICANT_AGE}.` };
		}
		const min = propAge + 15;
		return {
			min,
			label: `Father must be at least ${min} (15 years older than the proprietor).`
		};
	}

	if (whoRuns === 'son') {
		if (!haveProp) {
			return { min: MIN_CO_APPLICANT_AGE, label: `Must be at least ${MIN_CO_APPLICANT_AGE}.` };
		}
		const maxCandidate = propAge - 15;
		// If the proprietor is too young for the son to also be ≥18, the relation is
		// impossible — caller surfaces this as a hard error (max < min).
		const max = maxCandidate;
		return {
			min: MIN_CO_APPLICANT_AGE,
			max,
			label:
				max < MIN_CO_APPLICANT_AGE
					? `Proprietor must be at least ${MIN_CO_APPLICANT_AGE + 15} for a Son co-applicant aged ${MIN_CO_APPLICANT_AGE}+.`
					: `Son's age should be between ${MIN_CO_APPLICANT_AGE} and ${max} (15 years younger than the proprietor).`
		};
	}

	// 'other' or unknown — only the legal floor applies.
	return { min: MIN_CO_APPLICANT_AGE, label: `Must be at least ${MIN_CO_APPLICANT_AGE}.` };
}

/** True when `age` falls within the permitted bounds for the relation. */
export function isRunnerAgeValid(
	whoRuns: string | undefined | null,
	proprietorAge: number | undefined | null,
	runnerAge: number | undefined | null
): boolean {
	const bounds = ageGapBoundsFor(whoRuns, proprietorAge);
	if (!bounds) return true;
	const age = typeof runnerAge === 'number' ? runnerAge : Number(runnerAge);
	if (!Number.isFinite(age) || age <= 0) return false;
	if (age < bounds.min) return false;
	if (bounds.max !== undefined && age > bounds.max) return false;
	return true;
}

function relationFor(whoRuns: string): BusinessRunnerRelation {
	return BUSINESS_RUNNER_RELATIONS[whoRuns] ?? OTHER_RUNNER;
}

/** Build a fresh runner co-applicant record (or rebuild with a reused id). */
export function buildBusinessRunnerApplicant(
	proprietorId: string,
	whoRuns: string,
	reuseId?: string
): Record<string, unknown> {
	const rel = relationFor(whoRuns);
	return {
		id: reuseId ?? uuidv4(),
		applicantType: 'Individual',
		applicantSubType: 'business_runner',
		/** Back-pointer to the proprietor this runner was created for. */
		businessRunnerFor: proprietorId,
		/** The chosen relation answer (husband/father/son/other). */
		businessRunnerRelation: whoRuns,
		// Verification-only: full financials captured, NEVER pooled into eligibility.
		applicantClassification: 'non_applicant_full_financial',
		onEMI: false,
		onProperty: false,
		isNRI: 'No',
		gender: rel.gender ?? '',
		touchedFields: {}
	};
}

export interface RunnerSyncResult {
	/** Next applicants list (runner added / updated / removed). */
	applicants: Array<Record<string, unknown>>;
	/** The runner's id that the caller should re-sync relationships for — set when
	 *  a runner currently exists OR was just removed. null when no runner is involved. */
	runnerId: string | null;
	/** Forward relationship to add (runner → proprietor). null for 'other' / removal. */
	relationshipToAdd: { fromId: string; toId: string; relationType: string } | null;
	/** The full runner object that was just REMOVED, so the caller can stash it for
	 *  later retrieval (the proprietor may return to female and want it back). null
	 *  when no removal happened. */
	removedRunner: Record<string, unknown> | null;
}

/**
 * Rebuild a runner from a previously-stashed runner so the proprietor can RETRIEVE
 * earlier details after flipping gender away and back. Critically it REUSES the
 * stashed id — income/obligations live in applicantDataStore keyed by applicant id,
 * so reusing the id makes that data re-link automatically. The relation-derived
 * fields are refreshed to the current answer; everything else (name/age/marital…)
 * is preserved.
 */
function rebuildFromStash(
	proprietorId: string,
	whoRuns: string,
	stashed: Record<string, unknown>
): Record<string, unknown> {
	const rel = relationFor(whoRuns);
	return {
		...stashed,
		id: stashed.id, // reuse id → applicantDataStore income/obligations re-link
		applicantType: 'Individual',
		applicantSubType: 'business_runner',
		businessRunnerFor: proprietorId,
		businessRunnerRelation: whoRuns,
		applicantClassification: 'non_applicant_full_financial',
		onEMI: false,
		onProperty: false,
		// Keep a DSA-chosen gender; otherwise use the inferred one for the new relation.
		gender: (stashed.gender as string) || rel.gender || ''
	};
}

/**
 * Reconcile the runner co-applicant against the current answer.
 *
 * - answer is Self / blank → remove any existing runner (returns it as `removedRunner`
 *   so the caller can stash it) and signal its id so the caller drops relationships.
 * - answer is husband/father/son/other → ensure a runner exists. An existing runner is
 *   preserved (keeps any data the DSA already filled); if none exists but a `stashedRunner`
 *   is supplied, it is rehydrated (earlier-details retrieval); otherwise a fresh one is made.
 *
 * The caller is expected to: drop relationships involving `runnerId`, then add
 * `relationshipToAdd` if present, and stash `removedRunner` if set.
 */
export function syncBusinessRunnerCoApplicant(
	proprietorId: string,
	whoRuns: string | undefined | null,
	applicants: Array<Record<string, unknown>>,
	stashedRunner?: Record<string, unknown> | null
): RunnerSyncResult {
	const existing = applicants.find((a) => a.businessRunnerFor === proprietorId);

	// No runner needed → remove any existing one (and hand it back for stashing).
	if (!runnerIsOther(whoRuns)) {
		if (!existing) {
			return { applicants, runnerId: null, relationshipToAdd: null, removedRunner: null };
		}
		return {
			applicants: applicants.filter((a) => a.id !== existing.id),
			runnerId: existing.id as string,
			relationshipToAdd: null,
			removedRunner: existing
		};
	}

	const value = whoRuns as string;
	const rel = relationFor(value);

	if (existing) {
		const runnerId = existing.id as string;
		const updated = applicants.map((a) =>
			a.id === runnerId
				? {
						...a,
						businessRunnerRelation: value,
						// Only auto-fill gender if the DSA hasn't already chosen one.
						gender: a.gender || rel.gender || ''
					}
				: a
		);
		return {
			applicants: updated,
			runnerId,
			relationshipToAdd: rel.relationType
				? { fromId: runnerId, toId: proprietorId, relationType: rel.relationType }
				: null,
			removedRunner: null
		};
	}

	// Create — rehydrate from the stash when one exists (retrieve earlier details).
	const runner =
		stashedRunner && stashedRunner.id
			? rebuildFromStash(proprietorId, value, stashedRunner)
			: buildBusinessRunnerApplicant(proprietorId, value);
	const runnerId = runner.id as string;
	return {
		applicants: [...applicants, runner],
		runnerId,
		relationshipToAdd: rel.relationType
			? { fromId: runnerId, toId: proprietorId, relationType: rel.relationType }
			: null,
		removedRunner: null
	};
}
