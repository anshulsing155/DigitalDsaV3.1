// RM Contact Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const rmDesignationEnum = z.enum([
	'RM',
	'Senior RM',
	'Credit Manager',
	'Branch Manager',
	'Other'
]);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const rmContactSchema = z.object({
	_id: z.string().optional(),
	rm_name: z.string().min(1),
	lender_name: z.string().min(1),
	branch: z.string().optional(),
	city: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	whatsapp: z.string().optional(),
	designation: rmDesignationEnum.optional(),
	loan_types_handled: z.array(z.string()).optional(),
	contributed_by: z.array(z.string()),
	contributed_at: z.coerce.date(),
	last_confirmed_at: z.coerce.date(),
	confirmation_count: z.number().int().min(0),
	is_active: z.boolean(),
	notes_by_dsa: z.record(z.string(), z.string()),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date()
});

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/** Schema for creating a new RM contact */
export const rmContactCreateSchema = z.object({
	rm_name: z.string().min(1, 'RM name is required'),
	lender_name: z.string().min(1, 'Lender name is required'),
	branch: z.string().optional(),
	city: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email('Please enter a valid email').optional(),
	whatsapp: z.string().optional(),
	designation: rmDesignationEnum.optional(),
	loan_types_handled: z.array(z.string()).optional(),
	notes_by_dsa: z.record(z.string(), z.string()).optional()
});

/** Schema for partial updates to an existing RM contact */
export const rmContactUpdateSchema = z.object({
	rm_name: z.string().min(1).optional(),
	lender_name: z.string().min(1).optional(),
	branch: z.string().optional(),
	city: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	whatsapp: z.string().optional(),
	designation: rmDesignationEnum.optional(),
	loan_types_handled: z.array(z.string()).optional(),
	is_active: z.boolean().optional(),
	notes_by_dsa: z.record(z.string(), z.string()).optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type RMContactData = z.infer<typeof rmContactSchema>;
export type RMContactCreateData = z.infer<typeof rmContactCreateSchema>;
export type RMContactUpdateData = z.infer<typeof rmContactUpdateSchema>;
