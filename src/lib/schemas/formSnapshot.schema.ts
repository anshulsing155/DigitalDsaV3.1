// Form Snapshot Zod Schemas
import { z } from 'zod';

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const formSnapshotSchema = z.object({
	_id: z.string().optional(),
	case_id: z.string().min(1),
	version: z.number().int().positive(),
	payload: z.record(z.string(), z.any()),
	payload_hash: z.string().min(1),
	created_by: z.string().min(1),
	created_at: z.coerce.date(),
	change_summary: z.string().optional()
});

// ============================================================================
// CREATE SCHEMA
// ============================================================================

/** Schema for creating a new form snapshot */
export const formSnapshotCreateSchema = z.object({
	case_id: z.string().min(1, 'Case ID is required'),
	payload: z.record(z.string(), z.any()),
	change_summary: z.string().optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type FormSnapshotData = z.infer<typeof formSnapshotSchema>;
export type FormSnapshotCreateData = z.infer<typeof formSnapshotCreateSchema>;
