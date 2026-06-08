/**
 * POST /api/rm/submissions/[id]/documents
 * Upload evidence documents for an RM submission.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, RMSubmissions, PolicyEvidenceDocuments } from '$lib/database/mongo.js';
import imagekit from '$lib/imagekit/server.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const user = locals.user!;
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		} catch {
			// SEC-2: encrypted-first lookup; decrypt for downstream reads.
			const rmDocRaw = await findUserByMobile(rmApplications, user.mobileNumber);
			rmDoc = await decryptUserPii(rmDocRaw);
		}
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		// Verify submission exists and belongs to this RM
		const submission = await RMSubmissions.findOne({
			submission_id: params.id,
			rm_id: rmDoc._id.toString()
		});
		if (!submission) {
			return apiError('Submission not found', 404);
		}

		const form = await request.formData();
		const files = form.getAll('files') as File[];
		const description = ((form.get('description') as string) || '').trim();

		if (files.length === 0) {
			return apiError('At least one file is required', 400);
		}

		const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
		const uploadedDocs: string[] = [];

		for (const file of files) {
			if (!validTypes.includes(file.type)) {
				return apiError(`Invalid file type: ${file.name}. Allowed: PDF, JPEG, PNG, WebP`, 400);
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
				fileName: file.name || `evidence_${Date.now()}.pdf`,
				folder: `/rm/submissions/${params.id}/`,
				useUniqueFileName: true
			});

			if (!result.url) continue;

			const now = new Date();
			const document_id = `DOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

			await PolicyEvidenceDocuments.insertOne({
				document_id,
				lender_id: submission.lender_id,
				mime_type: file.type,
				original_name: file.name || 'unknown',
				url: result.url,
				imagekit_file_id: result.fileId || undefined,
				size_bytes: file.size,
				uploaded_by: rmDoc._id.toString(),
				uploaded_by_role: 'rm',
				description: description || undefined,
				created_at: now
			} as any);

			uploadedDocs.push(document_id);
		}

		// Update submission with new document IDs. Defense-in-depth: scope
		// the write to (submission_id, rm_id). The findOne above is the BOLA
		// gate; this keeps the write safe even if someone removes the gate
		// in a future refactor.
		if (uploadedDocs.length > 0) {
			await RMSubmissions.updateOne(
				{ submission_id: params.id, rm_id: rmDoc._id.toString() },
				{
					$push: { document_ids: { $each: uploadedDocs } } as any,
					$set: { updated_at: new Date() }
				}
			);
		}

		return apiOk({ uploaded: uploadedDocs.length, document_ids: uploadedDocs });
	} catch (err) {
		return apiServerError(err, 'Failed to upload documents');
	}
};
