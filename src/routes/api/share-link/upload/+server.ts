/**
 * POST /api/share-link/upload
 * ═══════════════════════════════════════════════════════════════════
 * Handles document uploads from the shared form.
 * Public endpoint (no app auth) — guarded by valid share link token.
 *
 * - Accepts multipart/form-data with a single file + metadata
 * - Validates file type and size (10MB max)
 * - Uploads to ImageKit cloud storage
 * - Returns the ImageKit URL for client reference
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { validateShareLink, validateShareOtpProof } from '$lib/server/shareLinks';
import imagekit from '$lib/imagekit/server.js';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const formData = await request.formData();

		const file = formData.get('file') as File | null;
		const docId = formData.get('docId') as string | null;
		const token = formData.get('token') as string | null;

		// ── Validate inputs ──────────────────────────────────────
		if (!file || !docId) {
			return apiError('File and document ID are required');
		}

		// ── Validate token ───────────────────────────────────────
		if (!token) {
			return apiError('Share link token is required');
		}

		const linkResult = await validateShareLink(token);
		if (!linkResult.valid || !linkResult.link) {
			return apiError('Invalid or expired share link', 403);
		}

		// Server-side OTP proof validation
		if (linkResult.link.requiresOtp) {
			const otpProof = cookies.get('share-otp-proof');
			const mobileNumber = formData.get('mobileNumber') as string | null;
			if (!mobileNumber || !validateShareOtpProof(otpProof, token, mobileNumber)) {
				return apiError('OTP verification required', 403);
			}
		}

		// Check documents section is enabled for this link
		if (!linkResult.link.sections.includes('documents')) {
			return apiError('Document upload is not enabled for this link', 403);
		}

		// ── Validate file type ───────────────────────────────────
		if (!ALLOWED_TYPES.includes(file.type)) {
			return apiError(
				`File type "${file.type}" is not allowed. Accepted: PDF, JPEG, PNG, WebP, Excel.`
			);
		}

		// ── Validate file size ───────────────────────────────────
		if (file.size > MAX_FILE_SIZE) {
			return apiError('File exceeds 10MB size limit');
		}

		// ── Generate unique filename ─────────────────────────────
		const ext = getExtension(file.type);
		const uniqueId = crypto.randomUUID().slice(0, 12);
		const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
		const fileName = `${linkResult.link.applicationId}_${safeDocId}_${uniqueId}${ext}`;

		// ── Upload to ImageKit ───────────────────────────────────
		const buffer = Buffer.from(await file.arrayBuffer());
		const base64File = buffer.toString('base64');
		const folder = `/shared-docs/${linkResult.link.applicationId}`;

		const uploadResult = await imagekit.files.upload({
			file: base64File,
			fileName,
			folder
		});

		return apiOk({
			url: uploadResult.url,
			path: uploadResult.filePath,
			fileName: uploadResult.name,
			originalName: file.name,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		return apiServerError(error, 'Failed to upload file');
	}
};

/**
 * Get file extension from MIME type
 */
function getExtension(mimeType: string): string {
	const map: Record<string, string> = {
		'application/pdf': '.pdf',
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/webp': '.webp',
		'application/vnd.ms-excel': '.xls',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
	};
	return map[mimeType] || '.bin';
}
