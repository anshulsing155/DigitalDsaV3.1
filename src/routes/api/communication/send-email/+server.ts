/**
 * POST  /api/communication/send-email
 * ══════════════════════════════════════════════════════════════════
 * Sends an email using a rendered communication template.
 * Logs the send attempt to the CommunicationLogs collection.
 *
 * Auth required. Demo users blocked. Rate limited.
 *
 * Request body:
 *   {
 *     template_id: string,
 *     variables: Record<string, string>,
 *     to: string,           // Recipient email address
 *     cc?: string,          // CC email address
 *     subject_override?: string, // Override the template subject
 *     case_id?: string      // Link to a case (for logging)
 *   }
 *
 * Returns:
 *   { ok: true, message_id: string }
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuthApi, blockDemoWrite } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { sendEmail } from '$lib/server/email.js';
import { getTemplateById, renderTemplate } from '$lib/server/templateRenderer.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { CommunicationLogs } from '$lib/database/mongo.js';
import { Cases } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';

const sendBodySchema = z.object({
	template_id: z.string().min(1, 'template_id is required'),
	variables: z.record(z.string(), z.string()),
	to: z.string().email('Valid email address required'),
	cc: z.string().email().optional(),
	subject_override: z.string().optional(),
	case_id: z.string().optional()
});

/** Escape HTML special characters to prevent XSS in email body */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Demo guard
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Rate limit: max 10 emails per minute per user
	const userId = locals.user?.id ?? 'unknown';
	const isRateLimited = await rateLimit(`email-send:${userId}`, {
		maxRequests: 10,
		windowMs: 60_000
	});
	if (isRateLimited)
		return apiError('Too many emails. Please wait a minute before sending again.', 429);

	// Parse body
	const parseResult = await parseJsonBody(request);
	if (!parseResult.ok) return parseResult.response;

	const validation = sendBodySchema.safeParse(parseResult.data);
	if (!validation.success) {
		return apiError(validation.error.issues.map((i) => i.message).join(', '), 400);
	}

	const { template_id, variables, to, cc, subject_override, case_id } = validation.data;
	const dsaId = locals.user?.id ?? '';

	// Case ownership check: if case_id provided, verify the DSA owns it
	if (case_id) {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (dsaResult.ok) {
			const caseDoc = await Cases.findOne({ case_id, dsa_id: dsaResult.dsaId });
			if (!caseDoc) {
				return apiError('Case not found or access denied', 403);
			}
		}
	}

	// Validate template exists
	const template = getTemplateById(template_id);
	if (!template) {
		return apiError(`Template not found: ${template_id}`, 404);
	}

	// Sanitize user-controlled variables before rendering into HTML
	const sanitizedVariables: Record<string, string> = {};
	for (const [key, value] of Object.entries(variables)) {
		sanitizedVariables[key] = escapeHtml(value);
	}

	// Render template with sanitized variables
	const rendered = renderTemplate(template_id, sanitizedVariables);
	const subject = subject_override ? escapeHtml(subject_override) : rendered.subject;
	const htmlBody = rendered.body;

	try {
		// Send via the central email service (uses Nodemailer SMTP or dev-mode)
		const result = await sendEmail({
			to,
			...(cc ? { cc: [cc] } : {}),
			subject,
			html: htmlBody
		});

		if (!result.success) {
			// Log failure
			await CommunicationLogs.insertOne({
				dsa_id: dsaId,
				case_id: case_id || undefined,
				channel: 'email',
				template_id,
				to,
				subject,
				status: 'failed',
				error: result.error,
				sent_at: new Date()
			}).catch(() => {
				/* don't fail on log failure */
			});

			return apiServerError('Failed to send email. Please try again.', result.error ?? '');
		}

		// Log success
		await CommunicationLogs.insertOne({
			dsa_id: dsaId,
			case_id: case_id || undefined,
			channel: 'email',
			template_id,
			to,
			cc: cc || undefined,
			subject,
			status: 'sent',
			message_id: result.messageId,
			sent_at: new Date()
		});

		logger.info('Email sent successfully', {
			template_id,
			to,
			messageId: result.messageId,
			case_id
		});

		return apiOk({ message_id: result.messageId });
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);

		// Log failure
		await CommunicationLogs.insertOne({
			dsa_id: dsaId,
			case_id: case_id || undefined,
			channel: 'email',
			template_id,
			to,
			subject,
			status: 'failed',
			error: errorMsg,
			sent_at: new Date()
		}).catch(() => {
			/* don't fail on log failure */
		});

		logger.error('Email send failed', {
			template_id,
			to,
			error: errorMsg
		});

		return apiServerError('Failed to send email. Please try again.', errorMsg);
	}
};
