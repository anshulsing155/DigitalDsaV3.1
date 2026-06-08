/**
 * Template Rendering Engine
 * ══════════════════════════════════════════════════════════════════
 * Renders communication templates by substituting variables,
 * reports missing required variables, and generates WhatsApp URLs.
 * ══════════════════════════════════════════════════════════════════
 */

import {
	COMMUNICATION_TEMPLATES,
	type CommunicationTemplate
} from '$lib/server/data/communicationTemplates.js';

// ============================================================================
// TEMPLATE LOOKUP
// ============================================================================

/**
 * Returns a template by its unique template_id, or undefined if not found.
 */
export function getTemplateById(templateId: string): CommunicationTemplate | undefined {
	return COMMUNICATION_TEMPLATES.find((t) => t.template_id === templateId);
}

/**
 * Returns all templates whose trigger_stage matches the given stage string.
 * Useful for auto-suggesting templates when a case transitions to a new stage.
 */
export function getTemplatesForStage(stage: string): CommunicationTemplate[] {
	return COMMUNICATION_TEMPLATES.filter((t) => t.trigger_stage === stage);
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Renders a template by substituting `{{variable}}` placeholders with
 * the provided values.
 *
 * - Required variables that are missing are collected in `missing_vars`.
 * - Optional variables that are missing are replaced with an empty string.
 * - Returns the rendered subject, body, and any missing required variable names.
 */
export function renderTemplate(
	templateId: string,
	variables: Record<string, string>
): { subject: string; body: string; missing_vars: string[] } {
	const template = getTemplateById(templateId);

	if (!template) {
		return {
			subject: '',
			body: '',
			missing_vars: [`__template_not_found:${templateId}`]
		};
	}

	// Build a set of required variable names for quick lookup
	const requiredVarNames = new Set(template.variables.filter((v) => v.required).map((v) => v.name));

	// Identify missing required variables
	const missing_vars: string[] = [];
	for (const varName of requiredVarNames) {
		if (!variables[varName] || variables[varName].trim() === '') {
			missing_vars.push(varName);
		}
	}

	// Replace all {{variable}} placeholders
	const replacePlaceholders = (text: string): string => {
		return text.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
			if (variables[varName] !== undefined && variables[varName] !== null) {
				return variables[varName];
			}
			// If not provided, replace with empty string (for optional vars)
			return '';
		});
	};

	const subject = replacePlaceholders(template.subject);
	const body = replacePlaceholders(template.body);

	return { subject, body, missing_vars };
}

// ============================================================================
// WHATSAPP URL GENERATION
// ============================================================================

/**
 * Generates a WhatsApp click-to-chat URL.
 *
 * - Cleans the phone number (removes spaces, dashes, +, parentheses)
 * - Prefixes with 91 (India country code) if not already present
 * - URL-encodes the message body
 *
 * @param phone - Phone number (e.g. "+91 98765 43210", "9876543210")
 * @param message - The pre-filled message text
 * @returns A `https://wa.me/...` URL
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
	// Clean the phone number: remove spaces, dashes, +, parentheses
	let cleaned = phone.replace(/[\s\-\+\(\)]/g, '');

	// Prefix with 91 if not already starting with 91 and the number looks like a 10-digit Indian number
	if (!cleaned.startsWith('91') && cleaned.length === 10) {
		cleaned = '91' + cleaned;
	}

	const encodedMessage = encodeURIComponent(message);
	return `https://wa.me/${cleaned}?text=${encodedMessage}`;
}
