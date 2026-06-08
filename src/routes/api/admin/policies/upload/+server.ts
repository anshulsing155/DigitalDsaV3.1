/**
 * POST /api/admin/policies/upload
 * Upload raw policy documents and create a new rule artifact.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import imagekit from '$lib/imagekit/server.js';
import type { RuleArtifactPair } from '$lib/types/ruleArtifact.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError, apiServerError } from '$lib/server/apiResponse.js';

/** Zod schema for the loanTypes JSON parsed from the form's loanTypes string field */
const loanTypesSchema = z.array(z.string().min(1)).max(20);

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	// Rate limit: 5 requests per minute per admin
	const mobileNumber = locals.user?.mobileNumber || 'anon';
	const isLimited = await rateLimit(mobileNumber, {
		maxRequests: 5,
		windowMs: 60_000,
		identifier: `policy-upload:${mobileNumber}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	try {
		const form = await request.formData();
		const lenderName = ((form.get('lenderName') as string) || '').trim();
		const lenderId = ((form.get('lenderId') as string) || '').trim();
		const classification = ((form.get('classification') as string) || 'PVT') as
			| 'PVT'
			| 'GOV'
			| 'NBFC';
		const loanTypesStr = (form.get('loanTypes') as string) || '[]';
		const parsedBy = ((form.get('parsedBy') as string) || '').trim();
		const files = form.getAll('files') as File[];

		// Validate
		if (!lenderName || !lenderId) {
			return apiError('Lender name and ID are required', 400);
		}
		if (files.length === 0) {
			return apiError('At least one file is required', 400);
		}
		if (!parsedBy) {
			return apiError('Parsed by is required', 400);
		}

		let loanTypes: string[];
		try {
			const parsedJson = JSON.parse(loanTypesStr);
			const loanTypesResult = loanTypesSchema.safeParse(parsedJson);
			if (!loanTypesResult.success) {
				return apiValidationError(
					'Invalid loanTypes: must be an array of strings',
					loanTypesResult.error.issues
				);
			}
			loanTypes = loanTypesResult.data;
		} catch {
			return apiError('Invalid loanTypes: must be valid JSON array', 400);
		}

		// Upload files to ImageKit
		const uploadedUrls: string[] = [];
		for (const file of files) {
			const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
			if (!validTypes.includes(file.type)) {
				return apiError(`Invalid file type: ${file.name}`, 400);
			}
			if (file.size > 10 * 1024 * 1024) {
				return apiError(`File too large: ${file.name} (max 10MB)`, 400);
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const base64 = buffer.toString('base64');
			const dataUri = `data:${file.type};base64,${base64}`;

			const result = await imagekit.files.upload({
				file: dataUri,
				fileName: file.name || `policy_${Date.now()}.pdf`,
				folder: `/admin/policies/${lenderId}/`,
				useUniqueFileName: true
			});

			if (result.url) {
				uploadedUrls.push(result.url);
			}
		}

		if (uploadedUrls.length === 0) {
			return apiError('File upload failed', 500);
		}

		// Determine version number
		const existing = await LenderRuleArtifacts.findOne(
			{ lender_id: lenderId },
			{ sort: { version: -1 } }
		);
		const version = existing ? existing.version + 1 : 1;
		const artifactId = `${lenderId}-v${version}`;

		// Create artifact document
		const now = new Date();
		const artifact: Omit<RuleArtifactPair, '_id'> = {
			artifact_id: artifactId,
			lender_id: lenderId,
			lender_name: lenderName,
			classification,
			loan_types: loanTypes,
			version,
			status: 'draft',
			json_logic: null,
			human_readable: null,
			confidence_scores: null,
			parse_iterations: [],
			rm_review: { queries: [] },
			source_document_urls: uploadedUrls,
			parsed_by: parsedBy,
			created_at: now,
			updated_at: now
		};

		const insertResult = await LenderRuleArtifacts.insertOne(artifact as RuleArtifactPair);

		return apiOk({
			artifact_id: insertResult.insertedId.toString(),
			artifact_name: artifactId,
			version,
			files_uploaded: uploadedUrls.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to upload policy');
	}
};
