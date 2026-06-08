import { z } from 'zod';

/* -------------------------------------------------
   RELATIONSHIP ENUM
-------------------------------------------------- */
export const RelationshipEnum = z.enum([
	'Father',
	'Mother',
	'Son',
	'Daughter',
	'Brother',
	'Sister',
	'Uncle',
	'Aunty',
	'Friend',
	'Husband',
	'Wife',
	'Grand Father',
	'Grand Mother',
	'Not in Blood Relation'
]);

/* -------------------------------------------------
   APPLICANT
-------------------------------------------------- */
export const ApplicantSchema = z.object({
	relationship: RelationshipEnum.optional(),
	age: z.number().int().nonnegative().optional()
});

/* -------------------------------------------------
   UNIQUE RELATION CONFIG
-------------------------------------------------- */
export const UNIQUE_RELATIONS = ['Uncle', 'Aunty', 'Brother', 'Sister', 'Friend'] as const;

/* -------------------------------------------------
   RELATION VALIDATION
-------------------------------------------------- */
export const RelationSchema = z
	.array(ApplicantSchema)
	.min(2, 'At least 2 applicants are required')
	.max(8, 'Maximum 8 applicants are allowed')
	.superRefine((applicants, ctx) => {
		const valid = applicants
			.map((a, i) => ({ ...a, index: i }))
			.filter((a) => a.relationship && a.age != null);

		if (!valid.length) return;

		/* -------- GROUP BY RELATIONSHIP -------- */
		const by: Record<string, typeof valid> = {};
		valid.forEach((a) => {
			by[a.relationship!] ??= [];
			by[a.relationship!].push(a);
		});

		const father = by.Father?.[0];
		const mother = by.Mother?.[0];
		const husband = by.Husband?.[0];
		const wife = by.Wife?.[0];

		/* -------- UNIQUE RELATIONS -------- */
		UNIQUE_RELATIONS.forEach((rel) => {
			const list = by[rel] ?? [];
			if (list.length > 1) {
				list.slice(1).forEach((a) => {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Only one ${rel} is allowed`,
						path: [a.index, 'relationship']
					});
				});
			}
		});

		/* -------- PARENT RULES -------- */
		[father, mother].forEach((parent) => {
			if (!parent || parent.age == null) return;
			if (parent.age < 18) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${parent.relationship} must be at least 18 years old`,
					path: [parent.index, 'age']
				});
			}
		});

		/* -------- CHILD RULES -------- */
		(by.Son ?? []).concat(by.Daughter ?? []).forEach((child) => {
			if (child.age == null) return;
			if (father && father.age != null && child.age >= father.age) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Child must be younger than Father',
					path: [child.index, 'age']
				});
			}
			if (mother && mother.age != null && child.age >= mother.age) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Child must be younger than Mother',
					path: [child.index, 'age']
				});
			}
		});

		/* -------- SIBLING RULES -------- */
		if (father && father.age != null) {
			(by.Brother ?? []).concat(by.Sister ?? []).forEach((sibling) => {
				if (sibling.age == null) return;
				if (Math.abs(sibling.age - father.age!) > 8) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Sibling age must be within ±8 years of Father',
						path: [sibling.index, 'age']
					});
				}
			});
		}

		/* -------- SPOUSE RULES -------- */
		[husband, wife].forEach((spouse) => {
			if (spouse && spouse.age != null && spouse.age < 18) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${spouse.relationship} must be at least 18 years old`,
					path: [spouse.index, 'age']
				});
			}
		});

		if (
			husband &&
			wife &&
			husband.age != null &&
			wife.age != null &&
			Math.abs(husband.age - wife.age) > 15
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Age difference between Husband and Wife cannot exceed 15 years'
			});
		}

		/* -------- GRANDPARENT RULES -------- */
		(by['Grand Father'] ?? []).forEach((gf) => {
			if (gf.age == null) return;
			if (father && father.age != null && gf.age < father.age + 18) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Grand Father must be at least 18 years older than Father',
					path: [gf.index, 'age']
				});
			}
		});

		(by['Grand Mother'] ?? []).forEach((gm) => {
			if (gm.age == null) return;
			if (mother && mother.age != null && gm.age < mother.age + 18) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Grand Mother must be at least 18 years older than Mother',
					path: [gm.index, 'age']
				});
			}
		});
	});
