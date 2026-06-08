import { AppliedApplications } from '$lib/database/mongo.js';
import type { RequestHandler } from './$types';
import { sendAdminEmail, sendUserEmail } from '$lib/utils/emailSend';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { z } from 'zod';

/**
 * Validates the shape of an applied application submission.
 * Unknown fields are stripped — this prevents field injection
 * (e.g. attackers adding is_admin: true or MongoDB operator keys).
 */
const appliedApplicationSchema = z.object({
	fullName: z.string().min(1).max(200),
	email: z.string().email().max(254),
	mobileNumber: z.string().regex(/^\d{10,15}$/),
	loanType: z.string().min(1).max(100).optional(),
	loanAmount: z.union([z.string(), z.number()]).optional(),
	message: z.string().max(5000).optional(),
	source: z.string().max(100).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<Record<string, any>>(request);
	if (!parsed.ok) return parsed.response;

	try {
		// Validate required fields before inserting into MongoDB
		const validated = appliedApplicationSchema.safeParse(parsed.data);
		if (!validated.success) {
			return apiError(
				`Invalid application data: ${validated.error.issues.map((i) => i.message).join(', ')}`
			);
		}
		const data = validated.data;

		const result = await AppliedApplications.insertOne(data);
		await Promise.all([sendUserEmail(data.email, data.fullName), sendAdminEmail(data)]);

		return apiOk({ id: result.insertedId });
	} catch (error) {
		return apiServerError(error, 'Failed to save data');
	}
};
