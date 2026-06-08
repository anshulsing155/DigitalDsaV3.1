import { z } from 'zod';

export const ExistingRoleSchema = z.enum(
	[
		'Having name on the property papers',
		'Loan repayment and having name on the papers',
		'For loan repayment only'
	] as const,
	{
		error: () => ({ message: 'Please select existing role' })
	}
);

const AgeSchema = z.coerce
	.number({ error: 'Age is required' })
	.refine((val) => Number.isFinite(val), 'Age must be a number')
	.min(18, 'Age must be at least 18')
	.max(80, 'Age must be at most 80');

const ON_PAPERS_ROLES: readonly string[] = [
	'Having name on the property papers',
	'Loan repayment and having name on the papers'
];

const LOAN_REPAYMENT_ROLES: readonly string[] = [
	'Loan repayment and having name on the papers',
	'For loan repayment only'
];

const ApplicantTypeSchema = z.object({
	applicantType: z.enum(['Individual', 'Company'], {
		error: () => ({ message: 'Please select applicant type' })
	})
});

// Standard Individual Schema (with gender and marital status validation)
const IndividualSchema = ApplicantTypeSchema.extend({
	applicantType: z.literal('Individual'),

	fullName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.refine((val) => /^[A-Za-z\s]+$/.test(val), 'Name can contain only letters and spaces')
		.refine((val) => !/(.)\1{2,}/.test(val), 'Name should not contain repetitive characters'),

	age: AgeSchema,

	isNRI: z.preprocess(
		(v) => (v === '' ? undefined : v),
		z.enum(['Yes', 'No'], {
			message: 'Please select NRI status'
		})
	),

	gender: z.enum(['male', 'female'] as const, {
		error: () => ({ message: 'Please select gender' })
	}),

	maritalStatus: z.enum(['single', 'married'] as const, {
		error: () => ({ message: 'Please select marital status' })
	}),

	existingRole: ExistingRoleSchema.optional()
});

// Couple Individual Schema (without gender and marital status validation)
const CoupleIndividualSchema = ApplicantTypeSchema.extend({
	applicantType: z.literal('Individual'),

	fullName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.refine((val) => /^[A-Za-z\s]+$/.test(val), 'Name can contain only letters and spaces')
		.refine((val) => !/(.)\1{2,}/.test(val), 'Name should not contain repetitive characters'),

	age: AgeSchema,

	isNRI: z.preprocess(
		(v) => (v === '' ? undefined : v),
		z.enum(['Yes', 'No'], {
			message: 'Please select NRI status'
		})
	),

	// Optional gender and marital status for couples
	gender: z.enum(['male', 'female'] as const).optional(),
	maritalStatus: z.enum(['single', 'married'] as const).optional(),

	existingRole: ExistingRoleSchema.optional()
});

const CompanySchema = ApplicantTypeSchema.extend({
	applicantType: z.literal('Company'),

	companyName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.refine((val) => /^[A-Za-z\s]+$/.test(val), 'Name can contain only letters and spaces')
		.refine((val) => !/(.)\1{2,}/.test(val), 'Name should not contain repetitive characters'),

	companyType: z.enum(
		['LLP', 'Partnership Firm', 'Private Limited', 'One Person Company (OPC)'] as const,
		{ error: () => ({ message: 'Please select company type' }) }
	),

	existingRole: ExistingRoleSchema.optional()
});

// Standard Applicant Schema
export const ApplicantSchema = z.discriminatedUnion('applicantType', [
	IndividualSchema,
	CompanySchema
]);

// Couple Applicant Schema (without strict gender/marital validation)
export const CoupleApplicantSchema = z.discriminatedUnion('applicantType', [
	CoupleIndividualSchema,
	CompanySchema
]);

/* ---------------------------------- */
/* Applicants Array Rules */
/* ---------------------------------- */

export const ApplicantsSchema = z
	.array(ApplicantSchema)
	.min(1, 'At least 1 applicant is required')
	.max(8, 'Maximum 8 applicants allowed')
	.superRefine((applicants, ctx) => {
		if (applicants.length < 2) return;

		let hasOnPapersApplicant = false;
		let hasLoanRepaymentApplicant = false;

		applicants.forEach((applicant, index) => {
			if (index > 0 && !applicant.existingRole) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'Existing role is required'
				});
			}

			if (applicant.existingRole && ON_PAPERS_ROLES.includes(applicant.existingRole)) {
				hasOnPapersApplicant = true;
			}

			if (applicant.existingRole && LOAN_REPAYMENT_ROLES.includes(applicant.existingRole)) {
				hasLoanRepaymentApplicant = true;
			}
		});

		if (!hasOnPapersApplicant) {
			applicants.forEach((_, index) => {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'At least one applicant must have name on property papers'
				});
			});
		}

		if (!hasLoanRepaymentApplicant) {
			applicants.forEach((_, index) => {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'At least one applicant must be on loan repayment'
				});
			});
		}
	});

// Couple Applicants Schema (uses CoupleApplicantSchema)
export const CoupleApplicantsSchema = z
	.array(CoupleApplicantSchema)
	.length(2, 'Exactly 2 applicants required for couple')
	.superRefine((applicants, ctx) => {
		let hasOnPapersApplicant = false;
		let hasLoanRepaymentApplicant = false;

		applicants.forEach((applicant, index) => {
			if (index > 0 && !applicant.existingRole) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'Existing role is required'
				});
			}

			if (applicant.existingRole && ON_PAPERS_ROLES.includes(applicant.existingRole)) {
				hasOnPapersApplicant = true;
			}

			if (applicant.existingRole && LOAN_REPAYMENT_ROLES.includes(applicant.existingRole)) {
				hasLoanRepaymentApplicant = true;
			}
		});

		if (!hasOnPapersApplicant) {
			applicants.forEach((_, index) => {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'At least one applicant must have name on property papers'
				});
			});
		}

		if (!hasLoanRepaymentApplicant) {
			applicants.forEach((_, index) => {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index, 'existingRole'],
					message: 'At least one applicant must be on loan repayment'
				});
			});
		}
	});
