/**
 * POST  /api/form/submit
 * ══════════════════════════════════════════════════════════════════
 * Validates all form pages and prepares a submission payload.
 *
 * Runs server-side validation across every visible page.
 * If any page has errors, returns them grouped by page.
 * Write operations are blocked for demo users.
 *
 * Security layers (via FormGuard):
 * - Trust score check (blocked/suspended)
 * - Rate limiting (3 submissions per 5 minutes)
 * - Session marked as submitted on success
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAuthApi, blockDemoWrite } from '$lib/server/guards';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { createFormEngine } from '$lib/server/formEngine/engine';
import type { FormSubmitRequest } from '$lib/types/formEngine';
import { validateSubmitRequest } from '$lib/server/formGuard';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// 1. Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// 2. Block demo writes
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// 3. Parse request — validate field shapes at the boundary, no blind cast
		const body = jsonParsed.data;
		const loanType = typeof body.loanType === 'string' ? body.loanType : '';
		const answers =
			body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
				? (body.answers as FormSubmitRequest['answers'])
				: null;
		const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

		// 4. Validate required fields
		if (!loanType || !answers) {
			return apiError('Missing required fields: loanType, answers', 400);
		}

		// 5. FormGuard: trust check + rate limit + mark submitted
		const userId = locals.user!.id;
		const ip = getClientAddress();

		const guardResult = await validateSubmitRequest({
			userId,
			loanType,
			sessionId,
			ip
		});

		if (!guardResult.allowed) {
			// left: guardResult.reason is string | undefined; apiError requires a
			// string, and coercing would change the body when reason is undefined.
			return json({ success: false, error: guardResult.reason }, { status: 403 });
		}

		// 6. Create engine
		const engine = createFormEngine(loanType);

		// 7. Validate all visible pages
		const allPages = engine.getVisiblePages(answers);
		const allErrors: Array<{
			pageIndex: number;
			pageTitle: string;
			errors: Array<{ questionId: string; bindsTo: string; message: string }>;
		}> = [];

		for (let i = 0; i < allPages.length; i++) {
			const pageErrors = engine.validatePage(allPages[i], answers);
			if (pageErrors.length > 0) {
				allErrors.push({
					pageIndex: i,
					pageTitle: allPages[i].title || `Page ${i}`,
					errors: pageErrors
				});
			}
		}

		if (allErrors.length > 0) {
			// left: top-level validationErrors key has no apiResponse helper equivalent
			return json(
				{ success: false, error: 'Validation failed', validationErrors: allErrors },
				{ status: 400 }
			);
		}

		// 8. Build submission payload (future: deriveSubmission)
		// For now, return success indicating validation passed
		return apiOk({ validated: true, pageCount: allPages.length });
	} catch (err) {
		return apiServerError(err, 'Form submission failed');
	}
};
