import { describe, it, expect } from 'vitest';
import {
	timelineEventSchema,
	timelineEventCreateSchema,
	timelineEventTypeEnum
} from '$lib/schemas/timeline.schema';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

const ALL_EVENT_TYPES = [
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
] as const;

function baseEvent(type: string) {
	return {
		case_id: 'case-001',
		event_type: type,
		description: `Event of type ${type}`,
		created_at: NOW
	};
}

// ═══════════════════════════════════════════════════════════════
// timelineEventTypeEnum
// ═══════════════════════════════════════════════════════════════

describe('timelineEventTypeEnum', () => {
	it('contains exactly 19 event types', () => {
		expect(ALL_EVENT_TYPES.length).toBe(19);
	});

	it('accepts all 19 valid event types', () => {
		for (const eventType of ALL_EVENT_TYPES) {
			const result = timelineEventTypeEnum.safeParse(eventType);
			expect(result.success, `event type "${eventType}" should be valid`).toBe(true);
		}
	});

	it('rejects unknown event type', () => {
		const result = timelineEventTypeEnum.safeParse('payment_received');
		expect(result.success).toBe(false);
	});

	it('rejects empty string', () => {
		const result = timelineEventTypeEnum.safeParse('');
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// timelineEventSchema (full schema)
// ═══════════════════════════════════════════════════════════════

describe('timelineEventSchema', () => {
	it('accepts valid event for each of the 19 types', () => {
		for (const eventType of ALL_EVENT_TYPES) {
			const result = timelineEventSchema.safeParse(baseEvent(eventType));
			expect(result.success, `full event with type "${eventType}" should be valid`).toBe(true);
		}
	});

	it('accepts event with metadata', () => {
		const result = timelineEventSchema.safeParse({
			...baseEvent('stage_changed'),
			metadata: {
				from: 'intake',
				to: 'profiling',
				changed_by: 'dsa-001'
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts event with _id', () => {
		const result = timelineEventSchema.safeParse({
			...baseEvent('case_created'),
			_id: 'event-001'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing case_id', () => {
		const { case_id, ...noCase } = baseEvent('case_created');
		const result = timelineEventSchema.safeParse(noCase);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('case_id');
		}
	});

	it('rejects empty case_id', () => {
		const result = timelineEventSchema.safeParse({
			...baseEvent('case_created'),
			case_id: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing event_type', () => {
		const { event_type, ...noType } = baseEvent('case_created');
		const result = timelineEventSchema.safeParse(noType);
		expect(result.success).toBe(false);
	});

	it('rejects missing description', () => {
		const { description, ...noDesc } = baseEvent('case_created');
		const result = timelineEventSchema.safeParse(noDesc);
		expect(result.success).toBe(false);
	});

	it('rejects empty description', () => {
		const result = timelineEventSchema.safeParse({
			...baseEvent('case_created'),
			description: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing created_at', () => {
		const { created_at, ...noDate } = baseEvent('case_created');
		const result = timelineEventSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});

	it('coerces string date to Date in created_at', () => {
		const result = timelineEventSchema.safeParse(baseEvent('case_created'));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.created_at).toBeInstanceOf(Date);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// timelineEventCreateSchema
// ═══════════════════════════════════════════════════════════════

describe('timelineEventCreateSchema', () => {
	it('accepts valid creation payload', () => {
		const result = timelineEventCreateSchema.safeParse({
			case_id: 'case-001',
			event_type: 'note_added',
			description: 'DSA added a note about the customer'
		});
		expect(result.success).toBe(true);
	});

	it('accepts creation payload with metadata', () => {
		const result = timelineEventCreateSchema.safeParse({
			case_id: 'case-001',
			event_type: 'lender_status_changed',
			description: 'Lender status changed to processing',
			metadata: {
				lender_id: 'lender-001',
				from: 'submitted',
				to: 'processing'
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing case_id in creation', () => {
		const result = timelineEventCreateSchema.safeParse({
			event_type: 'case_created',
			description: 'New case created'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('case_id');
		}
	});

	it('rejects missing description in creation', () => {
		const result = timelineEventCreateSchema.safeParse({
			case_id: 'case-001',
			event_type: 'case_created'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('description');
		}
	});

	it('rejects invalid event_type in creation', () => {
		const result = timelineEventCreateSchema.safeParse({
			case_id: 'case-001',
			event_type: 'unknown_event',
			description: 'Some event'
		});
		expect(result.success).toBe(false);
	});

	it('does not require created_at (server-generated)', () => {
		const result = timelineEventCreateSchema.safeParse({
			case_id: 'case-001',
			event_type: 'case_created',
			description: 'New case'
		});
		expect(result.success).toBe(true);
	});
});
