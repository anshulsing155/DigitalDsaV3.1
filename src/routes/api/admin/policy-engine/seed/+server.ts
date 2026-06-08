/**
 * POST /api/admin/policy-engine/seed
 * Run the policy engine seed script (admin only).
 *
 * Body flags (all optional):
 *   { fixtures, synthetics, rules, policyEngine }
 *
 * When NO flags are set (empty body), seeds the core policy engine
 * (lenders + geo scopes + artifact migration).
 * When specific flags are set, only those operations run.
 * Each operation is independent — a failure in one does not block others.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { apiError, apiOk, parseJsonBody } from '$lib/server/apiResponse.js';
// Lazy-loaded below — these modules are heavy and only needed when admin triggers a seed
// import { seedPolicyEngine, seedFixtureProfiles, seedSyntheticProfiles } from '$lib/database/seedPolicyEngine.js';
// import { seedSampleRuleDocuments } from '$lib/ruleEngine/sampleRuleDocs.js';
// import { seedCompiledLenders } from '$lib/config/lenderPolicies/seedCompiledLenders.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{
		fixtures?: boolean;
		synthetics?: boolean;
		rules?: boolean;
		compiledLenders?: boolean;
		policyEngine?: boolean;
	}>(request);
	const body = parsed.ok ? parsed.data : {};

	const hasSpecificFlag =
		body.fixtures || body.synthetics || body.rules || body.compiledLenders || body.policyEngine;
	const errors: string[] = [];

	// Lazy-load seed modules — only import when actually needed
	const loadSeedPolicyEngine = () => import('$lib/database/seedPolicyEngine.js');
	const loadSampleRuleDocs = () => import('$lib/ruleEngine/sampleRuleDocs.js');
	const loadCompiledLenders = () => import('$lib/config/lenderPolicies/seedCompiledLenders.js');

	// Core policy engine: run when no flags (default) or explicitly requested
	let policyEngineResult = null;
	if (!hasSpecificFlag || body.policyEngine) {
		try {
			const { seedPolicyEngine } = await loadSeedPolicyEngine();
			policyEngineResult = await seedPolicyEngine();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err }, 'Seed policy engine error');
			errors.push(`Policy engine: ${msg}`);
		}
	}

	// Fixture profiles
	let fixturesResult = null;
	if (body.fixtures) {
		try {
			const { seedFixtureProfiles } = await loadSeedPolicyEngine();
			fixturesResult = await seedFixtureProfiles();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err }, 'Seed fixtures error');
			errors.push(`Fixtures: ${msg}`);
		}
	}

	// Synthetic profiles
	let syntheticsResult = null;
	if (body.synthetics) {
		try {
			const { seedSyntheticProfiles } = await loadSeedPolicyEngine();
			syntheticsResult = await seedSyntheticProfiles();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err }, 'Seed synthetics error');
			errors.push(`Synthetics: ${msg}`);
		}
	}

	// Sample rule documents
	let rulesResult = null;
	if (body.rules) {
		try {
			const { seedSampleRuleDocuments } = await loadSampleRuleDocs();
			rulesResult = await seedSampleRuleDocuments();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err }, 'Seed rules error');
			errors.push(`Rules: ${msg}`);
		}
	}

	// Compiled lender policy documents (77 lenders × ~3 products = ~260 docs)
	let compiledLendersResult = null;
	if (body.compiledLenders) {
		try {
			const { seedCompiledLenders } = await loadCompiledLenders();
			compiledLendersResult = await seedCompiledLenders();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err }, 'Seed compiled lenders error');
			errors.push(`Compiled lenders: ${msg}`);
		}
	}

	// If ALL requested operations failed, return error
	const requestedOps = [
		!hasSpecificFlag || body.policyEngine ? policyEngineResult : 'skip',
		body.fixtures ? fixturesResult : 'skip',
		body.synthetics ? syntheticsResult : 'skip',
		body.rules ? rulesResult : 'skip',
		body.compiledLenders ? compiledLendersResult : 'skip'
	].filter((r) => r !== 'skip');

	const allFailed =
		requestedOps.length > 0 && requestedOps.every((r) => r === null) && errors.length > 0;

	if (allFailed) {
		return apiError(errors.join('; '), 500);
	}

	return apiOk({
		...(policyEngineResult ?? {}),
		fixtures: fixturesResult,
		synthetics: syntheticsResult,
		rules: rulesResult,
		compiledLenders: compiledLendersResult,
		...(errors.length > 0 ? { warnings: errors } : {})
	});
};
