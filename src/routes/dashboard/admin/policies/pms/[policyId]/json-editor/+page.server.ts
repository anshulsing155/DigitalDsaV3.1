/**
 * Admin JSON Editor loader.
 * Only published policies can be edited here — the editor forks a new draft.
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { getPolicyById, PolicyNotFoundError } from '$lib/server/pms/policyService.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');

	const { policyId } = params;

	let policy;
	try {
		policy = await getPolicyById(policyId);
	} catch (err) {
		if (err instanceof PolicyNotFoundError) throw error(404, 'Policy not found');
		throw err;
	}

	// JSON editor is only for published policies — all other statuses use the encode/edit flows
	if (policy.status !== 'published') {
		redirect(302, `/dashboard/admin/policies/pms/${policyId}`);
	}

	const lenderName = LENDER_BY_ID.get(policy.lenderId)?.lenderName ?? policy.lenderId;

	return {
		policyId,
		lenderName,
		loanProduct: policy.loanProduct,
		lockVersion: policy.lockVersion,
		// Pass sections as plain JSON so the editor textarea can show them formatted
		sectionsJson: JSON.stringify(policy.sections, null, 2)
	};
};
