import { z } from 'zod';

const AgeSchema = z.coerce
	.number({ message: 'Age is required' })
	.refine((val) => Number.isFinite(val), 'Age must be a valid number')
	.min(18, 'Age must be at least 18')
	.max(80, 'Age must be at most 80');

const CibilScoreSchema = z.coerce
	.number({ message: 'CIBIL Score is required' })
	.refine((val) => Number.isFinite(val), 'CIBIL Score must be a valid number')
	.min(300, 'CIBIL Score must be at least 300')
	.max(900, 'CIBIL Score must be at most 900');

export const GPAProfileSchema = z.object({
	name: z
		.string()
		.min(1, 'Full Name is required')
		.min(2, 'Name must be at least 2 characters')
		.refine((val) => /^[A-Za-z\s]+$/.test(val), 'Name can contain only letters and spaces')
		.refine((val) => !/(.)\1{2,}/.test(val), 'Name should not contain repetitive characters'),
	age: AgeSchema,
	relationshipWithNRI: z.string().min(1, 'Relationship with NRI is required'),
	relationshipType: z.string().min(1, 'Relationship Type is required'),
	cibilScore: CibilScoreSchema
});

export type GPAProfile = z.infer<typeof GPAProfileSchema>;
