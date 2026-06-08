/**
 * Disclaimer Zod Schemas — Validation for disclaimer acceptance
 *
 * @see AD-11 in DEVELOPMENT-PLAN.md
 */

import { z } from 'zod';

// ── Disclaimer Placement ─────────────────────────────────────

export const disclaimerPlacementSchema = z.enum([
	'onboarding',
	'inline',
	'footer',
	'tag',
	'persistent',
	'pdf',
	'tos'
]);

// ── Disclaimer Config Schema ─────────────────────────────────

export const disclaimerConfigSchema = z.object({
	id: z.string().min(1, 'Disclaimer ID is required'),
	version: z.number().int().positive('Version must be a positive integer'),
	placement: disclaimerPlacementSchema,
	requires_acceptance: z.boolean(),
	server_enforced: z.boolean(),
	title_key: z.string().min(1, 'Title key is required'),
	body_key: z.string().min(1, 'Body key is required'),
	checkbox_key: z.string().optional(),
	effective_from: z.coerce.date(),
	supersedes: z.string().optional()
});

// ── Disclaimer Acceptance Schema ─────────────────────────────

/**
 * Validates a disclaimer acceptance submission from the client.
 * Used when RM clicks "मैंने पढ़ लिया, समझ गया" checkbox.
 */
export const disclaimerAcceptanceSchema = z.object({
	disclaimer_id: z
		.string()
		.min(1, 'Disclaimer ID is required')
		.regex(/^[a-z_]+_v\d+$/, 'Invalid disclaimer ID format'),
	disclaimer_version: z.number().int().positive('Version must be a positive integer')
});

/**
 * Full acceptance record (includes server-generated fields)
 */
export const disclaimerAcceptanceRecordSchema = disclaimerAcceptanceSchema.extend({
	user_id: z.string().min(1, 'User ID is required'),
	accepted_at: z.coerce.date(),
	ip_address: z.string().optional(),
	user_agent: z.string().optional()
});

// ── Type exports from schemas ────────────────────────────────

export type DisclaimerPlacementSchema = z.infer<typeof disclaimerPlacementSchema>;
export type DisclaimerConfigSchema = z.infer<typeof disclaimerConfigSchema>;
export type DisclaimerAcceptanceInput = z.infer<typeof disclaimerAcceptanceSchema>;
export type DisclaimerAcceptanceRecord = z.infer<typeof disclaimerAcceptanceRecordSchema>;
