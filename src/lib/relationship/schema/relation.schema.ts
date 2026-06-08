// import { z } from 'zod';
// import { relationshipCatalog } from '$lib/relationship/rules/relationship.rules';

// export const RelationSchema = z.array(
// 	z.object({
// 		fullName: z.string(),
// 		age: z.string(),
// 		gender: z.enum(['Male', 'Female']),
// 		relationship: z.string().min(1, 'Select relationship'),
// 		relationwith: z.string().min(1, 'Select relation with')
// 	})
// ).superRefine((data, ctx) => {
// 	data.forEach((row, index) => {
// 		const rule = relationshipCatalog[row.gender]
// 			.find(r => r.label === row.relationship);

// 		if (!rule || rule.maxAgeDiff === undefined) return;

// 		const target = data.find(d => d.fullName === row.relationwith);
// 		if (!target) return;

// 		const diff = Math.abs(
// 			Number(row.age) - Number(target.age)
// 		);

// 		if (diff > rule.maxAgeDiff) {
// 			ctx.addIssue({
// 				path: [index, 'relationwith'],
// 				message: `Invalid age difference for ${row.relationship}`
// 			});
// 		}
// 	});
// });
