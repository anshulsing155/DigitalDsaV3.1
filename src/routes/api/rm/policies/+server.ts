/**
 * POST/GET /api/rm/policies
 * ═══════════════════════════════════════════════════════════════════
 * Policy one-pager upload and listing for RMs (6.10).
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications, CommunicationThreads, PolicyDocuments } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import imagekit from '$lib/imagekit/server.js';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── POST: Upload a new policy document ───────────────────────────
export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const form = await request.formData();
		const file = form.get('file') as File | null;
		const title = ((form.get('title') as string) || '').trim();
		const description = ((form.get('description') as string) || '').trim();

		// ── Validate inputs ─────────────────────────────────────
		if (!file) {
			return apiError('No file provided', 400);
		}
		if (file.type !== 'application/pdf') {
			return apiError('Only PDF files are allowed', 400);
		}
		if (file.size > 10 * 1024 * 1024) {
			return apiError('File too large (max 10MB)', 400);
		}
		if (!title || title.length > 200) {
			return apiError('Title is required (max 200 characters)', 400);
		}
		if (description.length > 500) {
			return apiError('Description must be 500 characters or less', 400);
		}

		// ── Resolve RM ──────────────────────────────────────────
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

		// ── Upload to ImageKit ──────────────────────────────────
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64 = buffer.toString('base64');
		const dataUri = `data:${file.type};base64,${base64}`;

		const result = await imagekit.files.upload({
			file: dataUri,
			fileName: file.name || `policy_${Date.now()}.pdf`,
			folder: `/policies/${rmDoc._id.toString()}/`,
			useUniqueFileName: true
		});

		if (!result.url || !result.fileId) {
			return apiError('Upload succeeded but file URL missing', 500);
		}

		// ── Version handling ────────────────────────────────────
		const existing = await PolicyDocuments.findOne(
			{ rm_id: rmDoc._id, title },
			{ sort: { version: -1 } }
		);
		const version = existing ? existing.version + 1 : 1;
		const supersedes = existing?._id || undefined;

		// ── Get connected DSA IDs ───────────────────────────────
		const threads = await CommunicationThreads.find({ rm_id: rmDoc._id }).toArray();
		const dsaIdSet = new Set(threads.map((t) => t.dsa_id.toString()));
		const notified_dsa_ids = [...dsaIdSet].map((id) => new ObjectId(id));

		// ── Insert policy document ──────────────────────────────
		const insertResult = await PolicyDocuments.insertOne({
			rm_id: rmDoc._id,
			lender_name:
				rmDoc.bankName ||
				getLenderNameFromDomain((rmDoc as any).officialEmail || rmDoc.rmOfficialEmail || '') ||
				'',
			title,
			description: description || undefined,
			file_url: result.url,
			file_id: result.fileId,
			version,
			supersedes,
			notified_dsa_ids,
			created_at: new Date()
		});

		return apiOk({ policy_id: insertResult.insertedId.toString() });
	} catch (error) {
		return apiServerError(error, 'Failed to upload policy');
	}
};

// ── GET: List policies for the current RM ────────────────────────
export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

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
			return apiOk([]);
		}

		const policiesRaw = await PolicyDocuments.find({ rm_id: rmDoc._id })
			.sort({ created_at: -1 })
			.limit(50)
			.toArray();

		const data = policiesRaw.map((p) => ({
			_id: p._id?.toString() || '',
			title: p.title,
			description: p.description || '',
			file_url: p.file_url,
			version: p.version,
			notified_count: p.notified_dsa_ids.length,
			created_at:
				p.created_at instanceof Date
					? p.created_at.toISOString()
					: new Date(p.created_at).toISOString()
		}));

		return apiOk(data);
	} catch (error) {
		return apiServerError(error, 'Failed to load policies');
	}
};
