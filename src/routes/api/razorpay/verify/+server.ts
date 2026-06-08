import crypto from 'crypto';
import { RAZORPAY_KEY_SECRET } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { parseJsonBody, apiError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Rate limit: 10 verifications per minute per user
	const userId = locals.user!.id;
	const limited = await rateLimit(userId, {
		identifier: `razorpay-verify:${userId}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (limited) return apiError('Too many requests. Please wait before trying again.', 429);

	const bodyParsed = await parseJsonBody<{
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
	}>(request);
	if (!bodyParsed.ok) return bodyParsed.response;

	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = bodyParsed.data;

		const body = razorpay_order_id + '|' + razorpay_payment_id;
		const expectedSignature = crypto
			.createHmac('sha256', RAZORPAY_KEY_SECRET)
			.update(body.toString())
			.digest('hex');

		if (expectedSignature === razorpay_signature) {
			return json({ success: true, message: 'Payment verified' });
		} else {
			return json({ success: false, message: 'Invalid signature' });
		}
	} catch (e: unknown) {
		return json({ success: false }, { status: 500 });
	}
};
