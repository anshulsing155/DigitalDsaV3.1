/**
 * POST  /api/communication/render-for-case
 * ══════════════════════════════════════════════════════════════════
 * Auto-populates template variables from case data and the
 * authenticated DSA's profile, then renders the template.
 *
 * Auth required.
 *
 * Request body:
 *   {
 *     case_id: string,
 *     template_id: string,
 *     overrides?: Record<string, string>
 *   }
 *
 * Returns:
 *   { subject, body, missing_vars, whatsapp_url?, variables_used }
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { DsaApplications, Cases } from '$lib/database/mongo.js';
import { resolveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';
import {
	renderTemplate,
	getTemplateById,
	generateWhatsAppUrl
} from '$lib/server/templateRenderer.js';

const renderForCaseSchema = z.object({
	case_id: z.string().min(1, 'case_id is required'),
	template_id: z.string().min(1, 'template_id is required'),
	overrides: z.record(z.string(), z.string()).optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate request body
		const parsed = renderForCaseSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const { case_id, template_id, overrides } = parsed.data;

		// Verify template exists
		const template = getTemplateById(template_id);
		if (!template) {
			return apiError(`Template "${template_id}" not found`, 404);
		}

		// Resolve DSA and verify case ownership
		const dsaResult = await resolveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}

		const caseResult = await verifyCaseOwnership(case_id, dsaResult.dsaId);
		if (!caseResult.ok) {
			return apiError(caseResult.error, 404);
		}

		const caseDoc = caseResult.caseDoc;

		// Look up DSA profile for name/firm. SEC-2: encrypted-first
		// lookup; decrypt so the template renderer sees plaintext name
		// (used as `{{ dsa_name }}` in templates downstream).
		const dsaRaw = await findUserByMobile(DsaApplications, locals.user!.mobileNumber);
		const dsa = await decryptUserPii(dsaRaw);

		// ── Auto-populate variables from case + DSA data ─────────
		const autoVars: Record<string, string> = {};

		// Case-level data
		autoVars.applicant_label = caseDoc.label || '';
		autoVars.loan_type = caseDoc.loan?.type || '';
		autoVars.loan_amount = caseDoc.loan?.amount_required
			? String(caseDoc.loan.amount_required)
			: '';
		autoVars.current_stage = caseDoc.stage || '';

		// Customer contact from case
		if (caseDoc.optional_contact?.full_name) {
			autoVars.customer_name = caseDoc.optional_contact.full_name;
		}
		if (caseDoc.optional_contact?.mobile) {
			autoVars.phone = caseDoc.optional_contact.mobile;
		}

		// Source info
		if (caseDoc.source?.label) {
			autoVars.source_name = caseDoc.source.label;
		}

		// Primary lender application data
		const primaryLenderApp = caseDoc.primary_lender_id
			? caseDoc.lender_applications.find(
					(la) => la.lender_application_id === caseDoc.primary_lender_id
				)
			: caseDoc.lender_applications[0];

		if (primaryLenderApp) {
			autoVars.lender_name = primaryLenderApp.lender_name || '';
			autoVars.login_number = primaryLenderApp.lender_tracking?.login_number || '';

			if (primaryLenderApp.sanction) {
				autoVars.sanction_amount = primaryLenderApp.sanction.amount
					? String(primaryLenderApp.sanction.amount)
					: '';
				autoVars.roi = primaryLenderApp.sanction.roi ? String(primaryLenderApp.sanction.roi) : '';
				autoVars.tenure_months = primaryLenderApp.sanction.tenure_months
					? String(primaryLenderApp.sanction.tenure_months)
					: '';
			}
		}

		// DSA profile data
		if (dsa) {
			autoVars.dsa_name = dsa.name || '';
			autoVars.dsa_firm = dsa.businessType || dsa.name || '';
			autoVars.dsa_phone = String(dsa.mobileNumber || '');
		}

		// Apply overrides (DSA customizations take precedence)
		const finalVars: Record<string, string> = {
			...autoVars,
			...(overrides || {})
		};

		// Render the template
		const rendered = renderTemplate(template_id, finalVars);

		// Build response
		const responseData: Record<string, any> = {
			subject: rendered.subject,
			body: rendered.body,
			missing_vars: rendered.missing_vars,
			variables_used: finalVars
		};

		// Generate WhatsApp URL if phone is available
		if (finalVars.phone) {
			responseData.whatsapp_url = generateWhatsAppUrl(finalVars.phone, rendered.body);
		}

		return apiOk(responseData);
	} catch (err) {
		return apiServerError(err, 'Failed to render template for case');
	}
};
