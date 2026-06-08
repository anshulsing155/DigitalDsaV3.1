import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCollection } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { parseJsonBody, apiServerError } from '$lib/server/apiResponse.js';

const TEST_TAG = '_testData';
const ALLOWED_COLLECTIONS = ['users', 'dsas', 'rms', 'loanApplications'];

// GET - Fetch all test-tagged records
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!dev) throw error(404, 'Not found');

	// Even in dev, require admin authentication to prevent data enumeration
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const collection = url.searchParams.get('collection') ?? 'users';
	if (!ALLOWED_COLLECTIONS.includes(collection)) {
		throw error(400, `Invalid collection: ${collection}`);
	}

	const col = await getCollection(collection);
	const records = await col.find({ [TEST_TAG]: true }).toArray();

	return json({ collection, count: records.length, records });
};

// POST - Insert a test-tagged record
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const bodyParsed = await parseJsonBody<{ collection?: string; data?: Record<string, unknown> }>(
			request
		);
		if (!bodyParsed.ok) return bodyParsed.response;
		const { collection, data } = bodyParsed.data;

		if (!collection || !ALLOWED_COLLECTIONS.includes(collection)) {
			throw error(400, `Invalid collection: ${collection}`);
		}

		if (!data || typeof data !== 'object') {
			throw error(400, 'Missing or invalid data');
		}

		const col = await getCollection(collection);
		const result = await col.insertOne({
			...data,
			[TEST_TAG]: true,
			_createdAt: new Date()
		});

		return json({ success: true, insertedId: result.insertedId });
	} catch (err) {
		return apiServerError(err, 'Failed to create test data');
	}
};

// DELETE - Remove all test-tagged records
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const collection = url.searchParams.get('collection');

	if (collection) {
		if (!ALLOWED_COLLECTIONS.includes(collection)) {
			throw error(400, `Invalid collection: ${collection}`);
		}
		const col = await getCollection(collection);
		const result = await col.deleteMany({ [TEST_TAG]: true });
		return json({ success: true, collection, deletedCount: result.deletedCount });
	}

	// Delete from all collections
	const results: Record<string, number> = {};
	for (const name of ALLOWED_COLLECTIONS) {
		const col = await getCollection(name);
		const result = await col.deleteMany({ [TEST_TAG]: true });
		results[name] = result.deletedCount;
	}

	return json({ success: true, deletedCounts: results });
};
