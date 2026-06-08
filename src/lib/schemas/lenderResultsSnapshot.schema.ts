// Lender Results Snapshot Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const lenderSelectionStateEnum = z.enum(['neutral', 'shortlisted', 'selected']);

export const evalTriggerEnum = z.enum([
	'initial_submit',
	'form_edit',
	'manual_refresh',
	'policy_update'
]);

// ============================================================================
// CREATE SCHEMA — validates POST body for new results
// ============================================================================

export const lenderResultsSnapshotCreateSchema = z.object({
	payload: z.record(z.string(), z.any()),
	source_form_snapshot_version: z.number().int().positive(),
	source_form_snapshot_hash: z.string().min(1),
	trigger: evalTriggerEnum,
	change_summary: z.string().optional()
});

// ============================================================================
// SELECTION UPDATE SCHEMA — validates PATCH body for selection changes
// ============================================================================

export const lenderSelectionUpdateSchema = z.object({
	selections: z
		.array(
			z.object({
				lender_application_id: z.string().min(1),
				state: lenderSelectionStateEnum
			})
		)
		.min(1)
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type LenderResultsSnapshotCreateData = z.infer<typeof lenderResultsSnapshotCreateSchema>;
export type LenderSelectionUpdateData = z.infer<typeof lenderSelectionUpdateSchema>;
