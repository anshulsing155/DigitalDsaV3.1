/**
 * POST /api/newsletter/subscribe — Newsletter subscription
 * ══════════════════════════════════════════════════════════════════
 * Public endpoint. Validates email, checks duplicates, inserts.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { NewsletterSubscriptions } from '$lib/database/mongo.js';
import { apiOkMessage, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 5 subscriptions per hour per IP to prevent abuse
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 5,
		windowMs: 60 * 60 * 1000,
		identifier: `newsletter:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ email: string }>(request);
	if (!parsed.ok) return parsed.response;

	try {
		const email = (parsed.data.email as string)?.trim().toLowerCase();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return apiError('Please enter a valid email address', 400);
		}

		// Check duplicate (unique index will also catch this, but give a friendlier message)
		const existing = await NewsletterSubscriptions.findOne({ email });
		if (existing) {
			if (existing.is_active) {
				return apiOkMessage("You're already subscribed!");
			}
			// Re-activate
			await NewsletterSubscriptions.updateOne(
				{ email },
				{ $set: { is_active: true, resubscribed_at: new Date() } }
			);
			return apiOkMessage('Welcome back! You have been re-subscribed.');
		}

		await NewsletterSubscriptions.insertOne({
			email,
			subscribed_at: new Date(),
			is_active: true,
			source: 'footer'
		});

		return apiOkMessage('Successfully subscribed!');
	} catch (err) {
		return apiServerError(err, 'Something went wrong. Please try again.');
	}
};
