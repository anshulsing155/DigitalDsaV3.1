// src/routes/api/upload-photo/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import imagekit from '$lib/imagekit/server';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Rate limit: 10 requests per minute per user
	const mobileNumber = locals.user?.mobileNumber || 'anon';
	const isLimited = await rateLimit(mobileNumber, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `upload-photo:${mobileNumber}`
	});
	if (isLimited) {
		return json(
			{ success: false, error: 'Too many requests. Please try again later.' },
			{ status: 429 }
		);
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const form = await request.formData();
		const file = form.get('file') as File | null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Basic validation (customize limits as needed)
		if (file.size > 5 * 1024 * 1024) {
			// 5 MB max
			return json({ error: 'File too large (max 5MB)' }, { status: 400 });
		}

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			return json(
				{ error: 'Invalid file type (only JPEG, PNG, WebP, GIF allowed)' },
				{ status: 400 }
			);
		}

		// Convert web File → base64 string for imagekit SDK
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64 = buffer.toString('base64');
		const dataUri = `data:${file.type};base64,${base64}`;

		// Use imagekit.files.upload() for v7 SDK
		const result = await imagekit.files.upload({
			file: dataUri,
			fileName: file.name || `upload_${Date.now()}.jpg`
			// Optional but recommended additions:
			// folder: '/users/uploads/',
			// useUniqueFileName: true,
			// tags: ['sveltekit', 'user-upload'],
		});

		return json({
			success: true,
			url: result.url,
			fileId: result.fileId,
			name: result.name,
			size: result.size
		});
	} catch (err) {
		// Log full error server-side for debugging; never expose internals to client
		logger.error({ err }, 'ImageKit upload error');
		return json({ error: 'Failed to upload image. Please try again.' }, { status: 500 });
	}
};
