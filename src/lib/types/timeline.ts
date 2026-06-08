// Timeline Event Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// TIMELINE EVENT TYPES
// ============================================================================

export type TimelineEventType =
	| 'case_created'
	| 'case_updated'
	| 'stage_changed'
	| 'lender_added'
	| 'lender_status_changed'
	| 'document_uploaded'
	| 'document_status_changed'
	| 'document_expiring'
	| 'query_raised'
	| 'query_responded'
	| 'query_resolved'
	| 'review_pdf_generated'
	| 'submission_pdf_generated'
	| 'message_sent'
	| 'note_added'
	| 'form_updated'
	| 'rejection'
	| 'sanction'
	| 'disbursement'
	| 'results_evaluated'
	| 'results_refreshed'
	| 'lender_shortlisted'
	| 'lender_selected'
	| 'lender_deselected';

export interface TimelineEvent {
	_id?: ObjectId;
	case_id: string;
	event_type: TimelineEventType;
	description: string;
	metadata?: Record<string, any>;
	created_at: Date;
}
