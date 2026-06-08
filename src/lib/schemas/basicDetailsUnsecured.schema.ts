import { z } from 'zod';

const AgeSchema = z.coerce
	.number({ message: 'Age is required' })
	.refine((v) => Number.isFinite(v), 'Age must be a valid number')
	.min(18, 'Age must be at least 18')
	.max(80, 'Age must be at most 80');

export const BasicUnsecuredLoanSchema = z.object({
	fullName: z
		.string()
		.min(1, 'Full name is required')
		.min(2, 'Name must be at least 2 characters')
		.refine((val) => /^[A-Za-z\s]+$/.test(val), 'Name can contain only letters and spaces')
		.refine((val) => !/(.)\1{2,}/.test(val), 'Name should not contain repetitive characters'),

	age: AgeSchema,

	gender: z.string().min(1, 'Gender is required'),

	employmentType: z.string().min(1, 'Employment type is required'),

	companyName: z
		.string()
		.min(1, 'Company name is required')
		.regex(/^[A-Za-z0-9 .&-]+$/, 'Special characters are not allowed in company name')
});

export type BasicUnsecuredLoan = z.infer<typeof BasicUnsecuredLoanSchema>;
