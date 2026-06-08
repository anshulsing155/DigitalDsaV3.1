/**
 * Contact Form — Server Actions
 * ══════════════════════════════════════════════════════════════════
 * Stores contact form submissions to MongoDB.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { ContactSubmissions } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const isLimited = await rateLimit(ip, {
			maxRequests: 1,
			windowMs: 5 * 60 * 1000,
			identifier: `contact:${ip}`
		});

		if (isLimited) {
			return fail(429, {
				error: 'Please wait a few minutes before submitting again.',
				name: '',
				email: '',
				message: ''
			});
		}

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const message = (formData.get('message') as string)?.trim();

		if (!name || !email || !message) {
			return fail(400, { error: 'All fields are required', name, email, message });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Please enter a valid email address', name, email, message });
		}

		if (message.length > 2000) {
			return fail(400, { error: 'Message must be under 2000 characters', name, email, message });
		}

		try {
			await ContactSubmissions.insertOne({
				name,
				email,
				message,
				created_at: new Date(),
				is_read: false
			});

			return { success: true };
		} catch (err) {
			logger.error({ err }, 'Contact form error');
			return fail(500, {
				error: 'Something went wrong. Please try again later.',
				name,
				email,
				message
			});
		}
	}
} satisfies Actions;
