/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Schema Fixture Factory: public entry point
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The ONE function consumers should import: `toScenario(journey, extra?)`.
 *
 * Takes a journey declaration, plays it through the real form engine,
 * assembles the resulting form-state into a LoanApplicationPayload, and
 * wraps the whole thing as a `FormPathScenario` — the public type the
 * existing fixture system exposes. Downstream consumers see the same
 * shape they always did; the insides just got correct.
 *
 * Three modes of use:
 *
 *   1. Direct — tests that want factory output on demand:
 *        const scenario = toScenario(HL_NEW_SAL_CLEAN_JOURNEY);
 *
 *   2. Through `fixtureProfiles.ts` / `formPathScenarios.ts` — those
 *      files call `toScenario()` at module load and re-export the
 *      results under their legacy names (fixture01_SalariedClean, etc.).
 *
 *   3. Through `syntheticGenerator.ts` — the breadth generator loops
 *      over many journeys (with seeded parameter variations) to build
 *      its 500-profile corpus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	FormPathScenario,
	FormPath,
	ExpectedFill
} from '$lib/testing/scenarios/formPathScenarios.js';
import { playJourney, VISIBILITY_REF } from './journeyPlayer.js';
import { toLoanApplicationPayload } from './payloadAssembler.js';
import type { Journey, FormEndState } from './journeyTypes.js';
import type { RawSchemaQuestion } from '$lib/types/formEngine.js';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Route derivation (used when Journey doesn't override expectedRoute)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_BY_LOAN_NAME: Record<string, string> = {
	'Home Loan': '/form/home-loan',
	'Loan Against Property': '/form/loan-against-property',
	'Plot Loan': '/form/plot-loan',
	'Personal Loan': '/form/personal-loan',
	'Business Loan': '/form/business-loan',
	'Professional Loan': '/form/professional-loan'
};

// Shared composer map — keep in sync with journeyPlayer.SCHEMA_COMPOSERS.
// Duplicated here (rather than re-imported) so this module stays a thin
// façade over the player + assembler. Any divergence is caught by the
// identity smoke test in schemaFixtureFactory.test.ts.
const SCHEMA_COMPOSERS: Record<string, () => { pages: Array<{ questions: RawSchemaQuestion[] }> }> = {
	'Home Loan': composeHomeLoanSchema,
	'Loan Against Property': composeLapLoanSchema,
	'Plot Loan': composePlotLoanSchema,
	'Personal Loan': composePersonalLoanSchema,
	'Business Loan': composeBusinessLoanSchema,
	'Professional Loan': composeProfessionalLoanSchema
};

function deriveRoute(loanName: string): string {
	return ROUTE_BY_LOAN_NAME[loanName] ?? `/form/${loanName.toLowerCase().replace(/\s+/g, '-')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FormPath derivation — Layer-1 metadata for FormPathScenario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the `FormPath` shape (q1_loanName, q4_loanType, etc.) from
 * the journey's accumulated answers. The existing scenarios populate
 * this from hand-written literals; the factory reads it from the
 * end-state, which is more correct (the form-path is whatever the
 * journey actually picked).
 *
 * Known FormPath keys across all 6 loan types:
 *   - q1_loanName              (always — = journey.loanName)
 *   - q4_loanType              (always — accumulated answer 'loanType')
 *   - q2_facilityType_LAP       (LAP only)
 *   - q2_loanType                (Plot scope picker)
 *   - q2_facilityType_unsec      (Personal/Business/Professional)
 *   - q4_loanVariant             (Plot only — selects variant when scope=New Loan)
 *   - q3_obligationsRunning      (unsecured loans)
 */
function deriveFormPath(journey: Journey, endState: FormEndState): FormPath {
	const a = endState.answers;
	const formPath: FormPath = {
		q1_loanName: journey.loanName,
		q4_loanType: String(a.loanType ?? 'New Loan')
	};
	// facilityType is set by LAP + unsecured loans. We populate both q-ids
	// since only the one visible for the current loan family will be picked up.
	if (a.facilityType !== undefined) {
		formPath.q2_facilityType_LAP = String(a.facilityType);
		formPath.q2_facilityType_unsec = String(a.facilityType);
	}
	if (a.loanVariant !== undefined) formPath.q4_loanVariant = String(a.loanVariant);
	if (a.ObligationsRunning !== undefined)
		formPath.q3_obligationsRunning = String(a.ObligationsRunning);

	// Journey override takes precedence (for tests that need deterministic
	// form-path metadata regardless of what the journey walked).
	if (journey.formPathOverride) {
		Object.assign(formPath, journey.formPathOverride);
	}
	return formPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpectedFill derivation — visibility-aware question inventory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks every question in the loan schema under the final AnswersMap.
 * A question is "expectedAsked" if `VISIBILITY_REF` returns true for
 * it; "expectedSkipped" otherwise.
 *
 * This is the key advance over the archetype system: expectedAsked /
 * expectedSkipped are no longer hand-curated (and therefore no longer
 * subject to drift). They're computed from the schema + the journey's
 * final state, which is ground truth.
 */
function deriveExpectedFill(journey: Journey, endState: FormEndState): ExpectedFill {
	const composer = SCHEMA_COMPOSERS[journey.loanName];
	if (!composer) {
		// Shouldn't happen — playJourney would have thrown first.
		return { expectedAsked: [], expectedSkipped: [], expectedPageCount: 0 };
	}
	const schema = composer();
	const asked: string[] = [];
	const skipped: string[] = [];
	const pagesWithAnyAsked = new Set<string>();

	for (const page of (schema as { pages: Array<{ id: string; questions: RawSchemaQuestion[] }> })
		.pages) {
		for (const q of page.questions) {
			const key = resolveBindsTo(q);
			if (!key) continue;
			if (VISIBILITY_REF(q, endState.answers)) {
				asked.push(key);
				pagesWithAnyAsked.add(page.id);
			} else {
				skipped.push(key);
			}
		}
	}

	// Dedupe + preserve first-seen order.
	const dedupeInOrder = (arr: string[]) => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const k of arr) {
			if (seen.has(k)) continue;
			seen.add(k);
			out.push(k);
		}
		return out;
	};

	return {
		expectedAsked: dedupeInOrder(asked),
		expectedSkipped: dedupeInOrder(skipped).filter((k) => !asked.includes(k)),
		expectedPageCount: pagesWithAnyAsked.size
	};
}

function resolveBindsTo(q: RawSchemaQuestion): string | undefined {
	if (typeof q.bindsTo === 'string' && q.bindsTo.length > 0) return q.bindsTo;
	if (typeof q.bindsTo_template === 'string' && q.bindsTo_template.length > 0)
		return q.bindsTo_template;
	return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API — toScenario()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converts a Journey into a FormPathScenario.
 *
 * @param journey  The journey declaration.
 * @param opts     Optional overrides for downstream assembly:
 *                   - extraApplicationData: extra keys for buildLoanPayload's applicationData
 *                   - relationships: family/co-borrower ties
 *                   - descriptionOverride: replace the journey's description
 *                     on the output scenario (used when a journey backs
 *                     multiple named fixtures under different descriptions)
 */
/**
 * Frozen "now" for fixture-factory output. Used as the default time anchor
 * for every snapshot test and the `_regenLapSnapshots` regen script. Keeping
 * it constant means time-derived payload fields (`loanVintageMonths`) stay
 * stable across runs, regardless of when the test actually executes.
 *
 * Why this exact date: 2026-06-01 matches the date the 4 LAP/Plot snapshots
 * were last regenerated (S208.5 + S210). Changing this value will invalidate
 * those snapshots — only do so as part of a coordinated regen. Added
 * 2026-06-01 (S210, TECH-DEBT-CLEANUP D-incoming-4 Level-3 fix).
 */
export const FIXTURE_NOW: Date = new Date('2026-06-01T00:00:00.000Z');

export function toScenario(
	journey: Journey,
	opts?: {
		extraApplicationData?: Record<string, unknown>;
		relationships?: Array<{
			fromId: string;
			toId: string;
			relationType: string;
			category?: string;
		}>;
		descriptionOverride?: string;
		/**
		 * Override the frozen `FIXTURE_NOW` time anchor. Caller-supplied
		 * overrides are useful for tests that verify time-derived field
		 * behavior at a specific moment. Default is `FIXTURE_NOW`.
		 */
		now?: Date;
	}
): FormPathScenario {
	const endState = playJourney(journey);
	const payload = toLoanApplicationPayload(endState, journey.loanName, {
		extraApplicationData: opts?.extraApplicationData,
		relationships: opts?.relationships,
		now: opts?.now ?? FIXTURE_NOW
	});

	return {
		id: journey.id,
		description: opts?.descriptionOverride ?? journey.description,
		formPath: deriveFormPath(journey, endState),
		expectedRoute: journey.expectedRoute ?? deriveRoute(journey.loanName),
		payload,
		expectedFill: deriveExpectedFill(journey, endState),
		tags: [...journey.tags]
	};
}

// Re-export for consumers that want to play a journey directly without
// wrapping as a FormPathScenario (e.g. Phase 1.6 tests that need to
// inspect end-state before it's assembled).
export { playJourney, VISIBILITY_REF } from './journeyPlayer.js';
export { toLoanApplicationPayload } from './payloadAssembler.js';
export type { Journey, FormEndState, JourneyStep } from './journeyTypes.js';
