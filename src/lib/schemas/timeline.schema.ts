// Timeline Event Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const timelineEventTypeEnum = z.enum([
	'case_created',
	'case_updated',
	'stage_changed',
	'lender_added',
	'lender_status_changed',
	'document_uploaded',
	'document_status_changed',
	'document_expiring',
	'query_raised',
	'query_responded',
	'query_resolved',
	'review_pdf_generated',
	'submission_pdf_generated',
	'message_sent',
	'note_added',
	'form_updated',
	'rejection',
	'sanction',
	'disbursement'
]);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const timelineEventSchema = z.object({
	_id: z.string().optional(),
	case_id: z.string().min(1),
	event_type: timelineEventTypeEnum,
	description: z.string().min(1),
	metadata: z.record(z.string(), z.any()).optional(),
	created_at: z.coerce.date()
});

// ============================================================================
// CREATE SCHEMA
// ============================================================================

/** Schema for creating a new timeline event */
export const timelineEventCreateSchema = z.object({
	case_id: z.string().min(1, 'Case ID is required'),
	event_type: timelineEventTypeEnum,
	description: z.string().min(1, 'Description is required'),
	metadata: z.record(z.string(), z.any()).optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type TimelineEventData = z.infer<typeof timelineEventSchema>;
export type TimelineEventCreateData = z.infer<typeof timelineEventCreateSchema>;
