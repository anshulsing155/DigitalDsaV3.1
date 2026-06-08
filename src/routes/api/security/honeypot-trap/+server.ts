/**
 * POST  /api/security/honeypot-trap
 * ══════════════════════════════════════════════════════════════════
 * Receives honeypot field triggers from the client.
 * CSS-hidden fields that real users never see — only bots fill them.
 * Applies a massive trust score penalty (-50).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAuthApi } from '$lib/server/guards';
import { recordHoneypotTrigger } from '$lib/server/formGuard';
import { parseJsonBody } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth guard (need userId for trust scoring)
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const bodyParsed = await parseJsonBody<{ sessionId?: string; fieldName?: string }>(request);
	if (!bodyParsed.ok) return json({ success: true }); // Don't leak detection

	try {
		const { sessionId, fieldName } = bodyParsed.data;
		const userId = locals.user!.id;

		// Fire-and-forget: record the honeypot trigger
		recordHoneypotTrigger(userId, sessionId, fieldName).catch(() => {});

		// Return 200 (don't reveal that we detected them)
		return json({ success: true });
	} catch {
		return json({ success: true }); // Always return success to not leak detection
	}
};
