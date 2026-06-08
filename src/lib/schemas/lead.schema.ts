// Lead Management Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const leadStatusEnum = z.enum([
	'new',
	'contacted',
	'qualified',
	'converted',
	'dropped',
	'follow_up'
]);

// ============================================================================
// CREATE SCHEMA
// ============================================================================

export const leadCreateSchema = z.object({
	label: z.string().min(1, 'Lead label is required').max(200),
	loan_type: z.string().optional(),
	estimated_amount: z.number().positive().optional(),
	source_id: z.string().optional(),
	optional_contact: z
		.object({
			full_name: z.string().optional(),
			mobile: z.string().optional(),
			email: z.string().email().optional()
		})
		.optional(),
	follow_up_date: z.coerce.date().optional(),
	notes: z.string().max(2000).optional()
});

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const leadUpdateSchema = z.object({
	label: z.string().min(1).max(200).optional(),
	loan_type: z.string().optional(),
	estimated_amount: z.number().positive().optional(),
	source_id: z.string().nullable().optional(),
	optional_contact: z
		.object({
			full_name: z.string().optional(),
			mobile: z.string().optional(),
			email: z.string().email().optional()
		})
		.optional(),
	status: leadStatusEnum.optional(),
	follow_up_date: z.coerce.date().nullable().optional(),
	notes: z.string().max(2000).optional(),
	is_archived: z.boolean().optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type LeadStatusEnum = z.infer<typeof leadStatusEnum>;
export type LeadCreateData = z.infer<typeof leadCreateSchema>;
export type LeadUpdateData = z.infer<typeof leadUpdateSchema>;
