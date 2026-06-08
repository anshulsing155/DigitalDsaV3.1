/**
 * GET /api/test/screenshots/[...path]
 * ══════════════════════════════════════════════════════════════════
 * Dev-only endpoint to serve E2E run screenshots.
 * Files live in test-results/playwright/screenshots/{runId}/{pageId}.png
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const SCREENSHOT_BASE = 'test-results/playwright/screenshots';

export const GET: RequestHandler = async ({ params }) => {
	if (!dev) throw error(404, 'Not found');

	const requestedPath = params.path;
	if (!requestedPath) throw error(400, 'Missing path');

	// Prevent directory traversal
	if (requestedPath.includes('..') || requestedPath.includes('\\')) {
		throw error(400, 'Invalid path');
	}

	const filePath = resolve(SCREENSHOT_BASE, requestedPath);

	// Verify the resolved path is still within the screenshots directory
	const baseResolved = resolve(SCREENSHOT_BASE);
	if (!filePath.startsWith(baseResolved)) {
		throw error(403, 'Access denied');
	}

	try {
		const data = await readFile(filePath);
		return new Response(data, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'no-cache'
			}
		});
	} catch {
		throw error(404, 'Screenshot not found');
	}
};
