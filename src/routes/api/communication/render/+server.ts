/**
 * POST  /api/communication/render
 * ══════════════════════════════════════════════════════════════════
 * Renders a communication template with the provided variables.
 *
 * Auth required.
 *
 * Request body:
 *   {
 *     template_id: string,
 *     variables: Record<string, string>,
 *     channel?: 'whatsapp' | 'email' | 'sms'
 *   }
 *
 * Returns:
 *   { subject, body, missing_vars, whatsapp_url? }
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuthApi, blockDemoWrite } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import {
	renderTemplate,
	getTemplateById,
	generateWhatsAppUrl
} from '$lib/server/templateRenderer.js';

const renderBodySchema = z.object({
	template_id: z.string().min(1, 'template_id is required'),
	variables: z.record(z.string(), z.string()),
	channel: z.enum(['whatsapp', 'email', 'sms']).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate request body
		const parsed = renderBodySchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const { template_id, variables, channel } = parsed.data;

		// Verify template exists
		const template = getTemplateById(template_id);
		if (!template) {
			return apiError(`Template "${template_id}" not found`, 404);
		}

		// Render the template
		const rendered = renderTemplate(template_id, variables);

		// Build response
		const responseData: Record<string, any> = {
			subject: rendered.subject,
			body: rendered.body,
			missing_vars: rendered.missing_vars
		};

		// Generate WhatsApp URL if channel is whatsapp and phone is provided
		if (channel === 'whatsapp' && variables.phone) {
			responseData.whatsapp_url = generateWhatsAppUrl(variables.phone, rendered.body);
		}

		return apiOk(responseData);
	} catch (err) {
		return apiServerError(err, 'Failed to render template');
	}
};
