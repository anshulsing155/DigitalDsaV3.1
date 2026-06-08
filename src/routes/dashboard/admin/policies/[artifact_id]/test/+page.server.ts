import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { LenderRuleArtifacts, LenderRuleFixtures, SyntheticProfiles } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { evaluateLender, buildResults } from '$lib/ruleEngine/evaluationEngine.js';
import { analyzeDiscomfort } from '$lib/ruleEngine/discomfortAnalyzer.js';
import type { ParsedLenderRuleDocument, LenderEvaluation } from '$lib/ruleEngine/types.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import type { DiscomfortAnalysis } from '$lib/types/lenderResults.js';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireRole(locals, 'admin');

	// Unparseable ObjectId → 404 (the resource cannot exist), not 400.
	// Same rationale as qa/[id]/+page.server.ts. Note: the form-action below
	// (line ~145) keeps fail(400, ...) because that's a submission-validation
	// signal, not a navigation error.
	let artifactOid: ObjectId;
	try {
		artifactOid = new ObjectId(params.artifact_id);
	} catch {
		throw error(404, 'Artifact not found');
	}

	const artifact = await LenderRuleArtifacts.findOne({ _id: artifactOid });
	if (!artifact) {
		throw error(404, 'Artifact not found');
	}

	if (!artifact.json_logic) {
		throw error(400, 'Artifact has no parsed rules to test against');
	}

	// Load fixture profiles from the database
	const fixturesFromDb = await LenderRuleFixtures.find({}).sort({ created_at: 1 }).toArray();

	const fixtures = fixturesFromDb.map((f) => ({
		_id: f._id.toString(),
		fixture_id: f.fixture_id,
		name: f.name,
		description: f.description,
		payload: f.payload,
		expected_results: f.expected_results || null
	}));

	// Optionally load a synthetic profile if ?syntheticId= is provided
	let syntheticProfile: {
		profile_id: string;
		loan_type: string;
		payload: Record<string, unknown> | LoanApplicationPayload;
	} | null = null;
	const syntheticId = url.searchParams.get('syntheticId');
	if (syntheticId) {
		const synDoc = await SyntheticProfiles.findOne({ profile_id: syntheticId });
		if (synDoc) {
			syntheticProfile = {
				profile_id: synDoc.profile_id,
				loan_type: synDoc.loan_type,
				payload: synDoc.payload
			};
		}
	}

	return {
		artifact: {
			_id: artifact._id.toString(),
			artifact_id: artifact.artifact_id,
			lender_id: artifact.lender_id,
			lender_name: artifact.lender_name,
			version: artifact.version,
			status: artifact.status,
			json_logic: artifact.json_logic
		},
		fixtures,
		syntheticProfile
	};
};

/** Serialize a LenderEvaluation for JSON transport, with optional discomfort analysis */
function serializeEvaluation(ev: LenderEvaluation, payload?: LoanApplicationPayload) {
	let discomfort: DiscomfortAnalysis | null = null;
	if (payload) {
		try {
			discomfort = analyzeDiscomfort(ev, payload);
		} catch {
			// Discomfort analysis is non-critical — don't fail the evaluation
			discomfort = null;
		}
	}

	return {
		lender_id: ev.lender_id,
		lender_name: ev.lender_name,
		classification: ev.classification,
		gate_results: ev.gate_results,
		all_gates_passed: ev.all_gates_passed,
		failed_gate_ids: ev.failed_gate_ids,
		assessed_income: ev.assessed_income,
		income_sources: ev.income_sources,
		obligation_load_monthly: ev.obligation_load_monthly,
		obligation_details: ev.obligation_details,
		foir: ev.foir,
		max_foir: ev.max_foir,
		foir_eligible_amount: ev.foir_eligible_amount,
		ltv: ev.ltv,
		max_ltv: ev.max_ltv,
		ltv_capped_amount: ev.ltv_capped_amount,
		roi: ev.roi,
		tenure_months: ev.tenure_months,
		processing_fee_percent: ev.processing_fee_percent,
		eligible_amount: ev.eligible_amount,
		offered_amount: ev.offered_amount,
		emi: ev.emi,
		deviations_applied: ev.deviations_applied,
		traffic_light: ev.traffic_light,
		traffic_light_message: ev.traffic_light_message,
		approval_probability: ev.approval_probability,
		policies: ev.policies,
		discomfort
	};
}

export const actions: Actions = {
	evaluate: async ({ request, locals, params }) => {
		requireRole(locals, 'admin');

		const formData = await request.formData();
		const payloadJson = formData.get('payload') as string | null;

		if (!payloadJson) {
			return fail(400, { error: 'No payload provided' });
		}

		let payload: LoanApplicationPayload;
		try {
			payload = JSON.parse(payloadJson);
		} catch {
			return fail(400, { error: 'Invalid JSON payload' });
		}

		if (!payload.loanTransaction || !payload.allApplicantDetails) {
			return fail(400, { error: 'Payload must have loanTransaction and allApplicantDetails' });
		}

		// Load the artifact
		let artifactOid: ObjectId;
		try {
			artifactOid = new ObjectId(params.artifact_id);
		} catch {
			return fail(400, { error: 'Invalid artifact ID' });
		}

		const artifact = await LenderRuleArtifacts.findOne({ _id: artifactOid });
		if (!artifact?.json_logic) {
			return fail(404, { error: 'Artifact not found or has no rules' });
		}

		const ruleDoc = artifact.json_logic as unknown as ParsedLenderRuleDocument;
		const evaluation = evaluateLender(payload, ruleDoc);

		return {
			mode: 'single' as const,
			evaluation: serializeEvaluation(evaluation, payload)
		};
	},

	compare: async ({ request, locals }) => {
		requireRole(locals, 'admin');

		const formData = await request.formData();
		const payloadJson = formData.get('payload') as string | null;

		if (!payloadJson) {
			return fail(400, { error: 'No payload provided' });
		}

		let payload: LoanApplicationPayload;
		try {
			payload = JSON.parse(payloadJson);
		} catch {
			return fail(400, { error: 'Invalid JSON payload' });
		}

		if (!payload.loanTransaction || !payload.allApplicantDetails) {
			return fail(400, { error: 'Payload must have loanTransaction and allApplicantDetails' });
		}

		const loanName = payload.loanTransaction.loanName;

		// Load ALL active rule docs matching this loan type
		const activeArtifacts = await LenderRuleArtifacts.find({
			status: 'active',
			loan_types: loanName
		}).toArray();

		if (activeArtifacts.length === 0) {
			return fail(404, { error: `No active rule documents found for "${loanName}"` });
		}

		const evaluations: LenderEvaluation[] = [];
		for (const art of activeArtifacts) {
			if (!art.json_logic) continue;
			const ruleDoc = art.json_logic as unknown as ParsedLenderRuleDocument;
			evaluations.push(evaluateLender(payload, ruleDoc));
		}

		const results = buildResults(evaluations, payload);

		return {
			mode: 'compare' as const,
			evaluations: evaluations.map((ev) => serializeEvaluation(ev, payload)),
			results: {
				results: results.results.map((r) => ({
					...r,
					factors: r.factors,
					suggestions: r.suggestions
				})),
				summary: results.summary
			}
		};
	}
};
