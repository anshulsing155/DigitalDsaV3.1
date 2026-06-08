import { z } from 'zod';

/**
 * DSA Page 2 schema.
 *
 * Two branches:
 *  - hasDirectDsaCode = true  → lenderName + dsaCode required
 *  - hasDirectDsaCode = false → panNumber + workingCity required (freelance / sub-DSA)
 *
 * GST is always optional (some DSAs get cash payouts).
 */
export const dsaStep2Schema = z
	.object({
		hasDirectDsaCode: z.boolean({ message: 'Please select an option' }),

		// Direct DSA fields
		lenderName: z.string().max(100, 'Lender name cannot exceed 100 characters').optional(),
		dsaCode: z.string().max(50, 'DSA code cannot exceed 50 characters').optional(),

		// Freelance / Sub-DSA fields
		panNumber: z.string().max(10, 'PAN must be exactly 10 characters').optional(),
		workingCity: z.string().max(100, 'City name cannot exceed 100 characters').optional(),

		// Always optional — GST is exactly 15 characters
		gstNumber: z
			.string()
			.max(15, 'GST number must be exactly 15 characters')
			.optional()
			.refine(
				(val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
				'Enter valid GST number (e.g. 22ABCDE1234F1Z5)'
			)
	})
	.superRefine((data, ctx) => {
		if (data.hasDirectDsaCode === true) {
			if (!data.lenderName || data.lenderName.trim().length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Select the lender / bank',
					path: ['lenderName']
				});
			}
			if (!data.dsaCode || data.dsaCode.trim().length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enter your DSA code',
					path: ['dsaCode']
				});
			}
		} else if (data.hasDirectDsaCode === false) {
			if (!data.panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enter a valid PAN (e.g. ABCDE1234F)',
					path: ['panNumber']
				});
			}
			if (!data.workingCity || data.workingCity.trim().length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Select your working city',
					path: ['workingCity']
				});
			}
		}
	});

export type DsaStep2Input = z.infer<typeof dsaStep2Schema>;
