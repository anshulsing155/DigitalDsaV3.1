/**
 * Server-enforced disclaimer footer injection.
 * Called before DB insert — the footer CANNOT be removed by the client.
 */

import { getDisclaimer } from '$lib/types/disclaimer.js';

// Hardcoded footer texts (same as i18n en.ts — server-side doesn't use t())
const FOOTER_TEXTS: Record<string, string> = {
	broadcast_footer_v1:
		'\u26a0\ufe0f This information is shared by the RM based on their understanding. ' +
		'The platform does not guarantee it. Please confirm through official channels.',
	pdf_review_footer_v1:
		'This is a preliminary assessment \u2014 PII (name, PAN, Aadhaar) is intentionally excluded. The final file will be different.',
	pdf_submission_footer_v1:
		'The data in this file is provided by the DSA. The platform has not verified it.'
};

/**
 * Inject a disclaimer footer into message body.
 * Returns the body with footer appended.
 * Throws if disclaimerId is not found or not server_enforced.
 */
export function injectDisclaimerFooter(body: string, disclaimerId: string): string {
	const disclaimer = getDisclaimer(disclaimerId);
	if (!disclaimer) {
		throw new Error(`Disclaimer not found: ${disclaimerId}`);
	}
	if (!disclaimer.server_enforced) {
		throw new Error(`Disclaimer ${disclaimerId} is not server-enforced`);
	}

	const footerText = FOOTER_TEXTS[disclaimerId];
	if (!footerText) {
		throw new Error(`No footer text configured for: ${disclaimerId}`);
	}

	// Double newline separator between body and footer
	return `${body.trimEnd()}\n\n---\n${footerText}`;
}

/**
 * Get the raw footer text for a disclaimer (for preview purposes).
 */
export function getFooterText(disclaimerId: string): string {
	return FOOTER_TEXTS[disclaimerId] || '';
}
