// Source Management Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const sourceCategoryEnum = z.enum([
	'builder',
	'ca',
	'broker',
	'referral',
	'online',
	'walk_in',
	'self',
	'other'
]);

// ============================================================================
// CREATE SCHEMA
// ============================================================================

export const sourceCreateSchema = z.object({
	name: z.string().min(1, 'Source name is required').max(200),
	category: sourceCategoryEnum,
	contact_name: z.string().max(100).optional(),
	contact_phone: z.string().max(15).optional(),
	contact_email: z.string().email().optional(),
	city: z.string().max(100).optional()
});

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const sourceUpdateSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	category: sourceCategoryEnum.optional(),
	contact_name: z.string().max(100).nullable().optional(),
	contact_phone: z.string().max(15).nullable().optional(),
	contact_email: z.string().email().nullable().optional(),
	city: z.string().max(100).nullable().optional(),
	is_active: z.boolean().optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type SourceCategoryEnum = z.infer<typeof sourceCategoryEnum>;
export type SourceCreateData = z.infer<typeof sourceCreateSchema>;
export type SourceUpdateData = z.infer<typeof sourceUpdateSchema>;
