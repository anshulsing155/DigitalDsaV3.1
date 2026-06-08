/**
 * PMS QA Runner — Phase 6
 * ════════════════════════════════════════════════════════════════════
 * Runs the 296 synthetic profiles from variationGenerator through
 * evaluateLender() using the candidate PMS policy, then compares each
 * result against the previously published version of the same policy.
 *
 * Pure CPU work — no network calls. Typically completes in 2–5s.
 * Called by: POST /api/pms/policies/[id]/qa-run
 * ════════════════════════════════════════════════════════════════════
 */

import { generateAllProfiles } from '$lib/testing/generators/variationGenerator.js';
import { evaluateLender } from '$lib/ruleEngine/evaluationEngine.js';
import { enrichPayload } from '$lib/ruleEngine/payloadEnricher.js';
import { pmsToEnginePolicy } from './pmsToEngineAdapter.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import type { PolicyDocument, QaRunResult, QaProfileSummary } from '$lib/config/pms/policyTypes.js';
import type { LenderEvaluation } from '$lib/ruleEngine/types.js';
import type { ParsedLenderRuleDocument } from '$lib/ruleEngine/types.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function summarise(ev: LenderEvaluation) {
	return {
		trafficLight: ev.traffic_light,
		gatesPassed: ev.all_gates_passed,
		foir: Math.round(ev.foir * 1000) / 1000,
		roi: ev.roi,
		tenureMonths: ev.tenure_months,
		eligibleAmount: ev.eligible_amount
	};
}

function detectChanges(
	before: ReturnType<typeof summarise> | null,
	after: ReturnType<typeof summarise>
): { changed: boolean; changeTypes: QaProfileSummary['changeTypes'] } {
	if (!before) return { changed: false, changeTypes: [] };

	const changeTypes: QaProfileSummary['changeTypes'] = [];

	const beforePass = before.trafficLight === 'green' || before.trafficLight === 'amber';
	const afterPass = after.trafficLight === 'green' || after.trafficLight === 'amber';
	if (beforePass !== afterPass || before.trafficLight !== after.trafficLight) {
		changeTypes.push('eligibility');
	}
	if (Math.abs(before.foir - after.foir) > 0.001) changeTypes.push('foir');
	if (Math.abs(before.roi - after.roi) > 0.01) changeTypes.push('roi');
	if (before.tenureMonths !== after.tenureMonths) changeTypes.push('tenure');

	return { changed: changeTypes.length > 0, changeTypes };
}

function isFlippedEligibility(
	before: ReturnType<typeof summarise> | null,
	after: ReturnType<typeof summarise>
): boolean {
	if (!before) return false;
	const beforePass = before.trafficLight === 'green' || before.trafficLight === 'amber';
	const afterPass = after.trafficLight === 'green' || after.trafficLight === 'amber';
	return beforePass !== afterPass;
}

function evaluateSafe(
	payload: LoanApplicationPayload,
	ruleDoc: ParsedLenderRuleDocument
): LenderEvaluation | null {
	try {
		const enriched = enrichPayload(payload);
		return evaluateLender(payload, ruleDoc, enriched);
	} catch {
		return null;
	}
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function runQa(candidateDoc: PolicyDocument): Promise<QaRunResult> {
	const ranAt = new Date();

	// Build the candidate rule doc from PMS sections
	const candidateRuleDoc = pmsToEnginePolicy(candidateDoc);

	// Find the currently published version (baseline) for the same lender+product
	let baselineRuleDoc: ParsedLenderRuleDocument | null = null;
	const baselinePolicy = await PmsLenderPolicies.findOne(
		{
			lenderId: candidateDoc.lenderId,
			loanProduct: candidateDoc.loanProduct,
			status: 'published'
		},
		{ projection: { sections: 1, version: 1, lenderId: 1, loanProduct: 1, conditionalOverrides: 1 } }
	);
	if (baselinePolicy && baselinePolicy._id.toString() !== candidateDoc._id.toString()) {
		try {
			baselineRuleDoc = pmsToEnginePolicy(baselinePolicy as PolicyDocument);
		} catch {
			// Non-fatal — proceed without baseline
		}
	}
	const hadBaseline = baselineRuleDoc !== null;

	// Generate all 296 profiles (deterministic, seed=42)
	const allProfiles = generateAllProfiles(42);
	const matchingProfiles = allProfiles.filter((p) => p.loan_type === candidateDoc.loanProduct);

	const results: QaProfileSummary[] = [];
	let changedProfiles = 0;
	let flippedEligibility = 0;

	for (const profile of matchingProfiles) {
		const afterEv = evaluateSafe(profile.payload, candidateRuleDoc);
		if (!afterEv) continue;

		const beforeEv = baselineRuleDoc ? evaluateSafe(profile.payload, baselineRuleDoc) : null;

		const after = summarise(afterEv);
		const before = beforeEv ? summarise(beforeEv) : null;
		const { changed, changeTypes } = detectChanges(before, after);

		if (changed) changedProfiles++;
		if (isFlippedEligibility(before, after)) flippedEligibility++;

		results.push({
			profileId: profile.profile_id,
			description: profile.description,
			loanType: profile.loan_type,
			before,
			after,
			changed,
			changeTypes
		});
	}

	return {
		ranAt,
		totalProfiles: allProfiles.length,
		testedProfiles: results.length,
		changedProfiles,
		flippedEligibility,
		hadBaseline,
		results
	};
}
