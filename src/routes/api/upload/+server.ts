import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';
import { apiError, apiServerError, apiValidationError } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

// ── Upload configuration ─────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_REQUEST = 10;

/**
 * Allowed MIME types for document uploads.
 * Maps MIME → safe extension (never trust client-provided extension).
 */
const ALLOWED_MIME_MAP: Record<string, string> = {
	'application/pdf': '.pdf',
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'application/vnd.ms-excel': '.xls',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
};

const ALLOWED_TYPES = new Set(Object.keys(ALLOWED_MIME_MAP));

interface UploadedFile {
	fileName: string;
	originalName: string;
	url: string;
	size: number;
	type: string;
}

/**
 * Sanitize filename: strip path traversal, special chars, and limit length.
 * Returns only the basename with safe characters.
 */
function sanitizeFilename(rawName: string): string {
	// Extract basename (remove any directory components)
	const basename = rawName.replace(/^.*[\\/]/, '');
	// Remove anything that's not alphanumeric, dash, underscore, or dot
	const safe = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
	// Limit length (preserve extension)
	const dot = safe.lastIndexOf('.');
	if (dot > 0) {
		const name = safe.substring(0, dot).substring(0, 80);
		const ext = safe.substring(dot).substring(0, 10);
		return name + ext;
	}
	return safe.substring(0, 80);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Rate limit: 10 requests per minute per user
	const mobileNumber = locals.user?.mobileNumber || 'anon';
	const isLimited = await rateLimit(mobileNumber, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `upload:${mobileNumber}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	try {
		const formData = await request.formData();
		const files = formData.getAll('files');

		if (!files.length) {
			return apiError('No files received');
		}

		if (files.length > MAX_FILES_PER_REQUEST) {
			return apiError(`Maximum ${MAX_FILES_PER_REQUEST} files per upload`);
		}

		const uploaded: UploadedFile[] = [];
		const errors: string[] = [];

		for (const file of files) {
			if (!(file instanceof File)) continue;

			// ── Validate MIME type ─────────────────────────────
			if (!ALLOWED_TYPES.has(file.type)) {
				errors.push(`"${sanitizeFilename(file.name)}": file type "${file.type}" not allowed`);
				continue;
			}

			// ── Validate file size ─────────────────────────────
			if (file.size > MAX_FILE_SIZE) {
				errors.push(
					`"${sanitizeFilename(file.name)}": exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
				);
				continue;
			}

			if (file.size === 0) {
				errors.push(`"${sanitizeFilename(file.name)}": empty file`);
				continue;
			}

			// ── Generate unique safe filename ──────────────────
			// Never use client-provided filename in storage path.
			// Use crypto UUID + MIME-derived extension.
			const ext = ALLOWED_MIME_MAP[file.type] || '.bin';
			const uniqueId = crypto.randomUUID();
			const safeOriginal = sanitizeFilename(file.name);
			const storedName = `${uniqueId}${ext}`;

			// Simulate upload delay (replace with actual storage in production)
			await new Promise<void>((resolve) => setTimeout(resolve, 200));

			uploaded.push({
				fileName: storedName,
				originalName: safeOriginal,
				url: `/uploads/${storedName}`,
				size: file.size,
				type: file.type
			});
		}

		if (uploaded.length === 0 && errors.length > 0) {
			return apiValidationError('All files rejected', errors);
		}

		return json({
			success: true,
			files: uploaded,
			...(errors.length > 0 && { warnings: errors })
		});
	} catch (err: unknown) {
		return apiServerError(err, 'Upload error');
	}
};
