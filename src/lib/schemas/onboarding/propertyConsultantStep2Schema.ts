import { z } from 'zod';

/**
 * Property Consultant Page 2 schema.
 * PAN number is REQUIRED for property consultants.
 * RERA number is optional — not all consultants have one.
 * Working city — single city only.
 */
export const pcStep2Schema = z.object({
	panNumber: z
		.string()
		.min(1, 'PAN number is required')
		.regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN number (e.g. ABCDE1234F)'),
	reraNumber: z
		.string()
		.optional()
		.refine(
			(val) => !val || /^[A-Za-z0-9/-]+$/.test(val),
			'Enter a valid RERA registration number'
		),
	workingCity: z.string().min(1, 'Select your working city')
});

export type PcStep2Input = z.infer<typeof pcStep2Schema>;
