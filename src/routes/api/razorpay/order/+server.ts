/**
 * POST /api/razorpay/order
 * Create a Razorpay payment order for a billing plan.
 *
 * SECURITY: Server-side price enforcement (PB-1).
 * The client sends only `planId` — the server looks up the price
 * from PLANS config. No client-controlled amounts ever reach Razorpay.
 *
 * Body: { planId: 'basic' | 'pro' | 'enterprise' }
 * Returns: { orderId, key, planId, amount }
 */

import Razorpay from 'razorpay';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { PLANS, type PlanId } from '$lib/config/billing.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Step 1: Auth — only authenticated DSAs can create payment orders
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Rate limit: 5 orders per minute per user — prevents rapid order creation
	const userId = locals.user!.id;
	const limited = await rateLimit(userId, {
		identifier: `razorpay-order:${userId}`,
		maxRequests: 5,
		windowMs: 60_000
	});
	if (limited) return apiError('Too many requests. Please wait before trying again.', 429);

	// Step 2: Parse request body — client sends only the plan identifier
	const bodyParsed = await parseJsonBody<{ planId: string }>(request);
	if (!bodyParsed.ok) return bodyParsed.response;
	const { planId } = bodyParsed.data;

	// Step 3: Look up plan config server-side — reject invalid plan IDs
	const plan = PLANS[planId as PlanId];
	if (!plan) {
		return apiError('Invalid plan', 400);
	}

	// Step 4: Create Razorpay order with server-controlled amount
	const dsaId = locals.user!.id;
	try {
		const instance = new Razorpay({
			key_id: RAZORPAY_KEY_ID,
			key_secret: RAZORPAY_KEY_SECRET
		});

		const order = await instance.orders.create({
			amount: plan.amountPaise,
			currency: 'INR',
			receipt: `dsa_${dsaId}_${planId}_${Date.now()}`,
			notes: {
				dsa_id: dsaId,
				plan_id: planId
			}
		});

		logger.info(
			{ dsaId, planId, orderId: order.id, amount: plan.amountPaise },
			'Razorpay order created'
		);

		// Return order details — amount is server-authoritative for client display
		return apiOk({
			orderId: order.id,
			key: RAZORPAY_KEY_ID,
			planId,
			amount: plan.amountPaise
		});
	} catch (err) {
		return apiServerError(err, 'Payment service unavailable');
	}
};
