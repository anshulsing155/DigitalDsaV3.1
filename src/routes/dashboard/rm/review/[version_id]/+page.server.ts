import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import {
	PolicyVersions,
	PolicyRules,
	ProductVariations,
	Lenders,
	GeoScopes,
	ReviewComments,
	RmLenderAssignments
} from '$lib/database/mongo.js';
import { generatePolicyDoc } from '$lib/server/policyDocGenerator.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import type { ProductType } from '$lib/types/policyEngine.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'rm');

	const versionId = params.version_id;
	if (!ObjectId.isValid(versionId)) {
		throw error(400, 'Invalid version ID');
	}

	const version = await PolicyVersions.findOne({ _id: new ObjectId(versionId) });
	if (!version) {
		throw error(404, 'Version not found');
	}

	if (version.status !== 'pending_rm_review') {
		throw error(400, 'This version is not pending your review');
	}

	const rule = await PolicyRules.findOne({ policy_rule_id: version.policy_rule_id });
	if (!rule) {
		throw error(404, 'Associated policy rule not found');
	}

	// SEC-5 — assignment-scoped BOLA gate. Mirrors the S103 API fix on
	// the sibling /api/rm/review/[version_id]/+server.ts (Finding M1).
	// Without this, ANY RM could open the review page for ANY lender's
	// pending version — silent cross-bank disclosure of unapproved
	// policy fields. Admin bypass via activeRole === 'admin' so admins
	// can preview the page; non-admin RMs must have an active
	// assignment for the rule's lender.
	const isAdmin = locals.user?.activeRole === 'admin';
	if (!isAdmin) {
		const userId = locals.user!.id;
		const assignment = await RmLenderAssignments.findOne({
			rmUserId: userId,
			lenderId: rule.lender_id,
			status: 'active'
		});
		if (!assignment) {
			throw error(403, 'No active assignment for this lender');
		}
	}

	const [variation, lender, geoScope, comments] = await Promise.all([
		ProductVariations.findOne({ variation_id: rule.variation_id }),
		Lenders.findOne({ lender_id: rule.lender_id }),
		GeoScopes.findOne({ geo_scope_id: rule.geo_scope_id }),
		ReviewComments.find({
			target_type: 'policy_version',
			target_id: new ObjectId(versionId)
		})
			.sort({ created_at: -1 })
			.toArray()
	]);

	const productType = variation?.product_id?.split(':')[1] as ProductType | undefined;
	const productLabel =
		productType && PRODUCT_TYPE_LABELS[productType]
			? PRODUCT_TYPE_LABELS[productType]
			: 'Unknown Product';

	const doc = generatePolicyDoc({
		lender_name: lender?.lender_name || rule.lender_id,
		product_label: productLabel,
		variation_label: variation?.label || 'Standard',
		geo_label: geoScope?.label || 'PAN India',
		policy_fields: version.policy_fields,
		version_number: version.version_number,
		effective_from: version.effective_from,
		source_type: version.provenance?.source_type
	});

	return {
		version: {
			_id: versionId,
			policy_rule_id: version.policy_rule_id,
			version_number: version.version_number,
			status: version.status,
			policy_fields: version.policy_fields,
			provenance: version.provenance,
			created_at: version.created_at ? new Date(version.created_at).toISOString() : null
		},
		lender_name: lender?.lender_name || rule.lender_id,
		product_label: productLabel,
		variation_label: variation?.label || 'Standard',
		geo_label: geoScope?.label || 'PAN India',
		human_readable_doc: doc,
		comments: comments.map((c) => ({
			_id: c._id.toString(),
			author_name: c.author_name,
			author_role: c.author_role,
			text: c.text,
			is_resolved: c.is_resolved,
			created_at: c.created_at ? new Date(c.created_at).toISOString() : null
		}))
	};
};
