import { z } from 'zod';
import { isLenderDomain } from '$lib/config/lenderDomains';

/**
 * RM Page 2 schema.
 * Official email MUST be from a recognized bank/NBFC/HFC domain.
 * Working city — single city only.
 */
export const rmStep2Schema = z.object({
	officialEmail: z
		.string()
		.min(1, 'Enter your official bank email')
		.email('Enter a valid email address')
		.refine(
			(val) => isLenderDomain(val),
			'Email must be from a recognized bank / NBFC / HFC domain'
		),
	workingCity: z.string().min(1, 'Select your working city')
});

export type RmStep2Input = z.infer<typeof rmStep2Schema>;
