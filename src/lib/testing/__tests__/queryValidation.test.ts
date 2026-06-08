import { describe, it, expect } from 'vitest';
import { lenderQuerySchema, queryCategoryEnum, queryStatusEnum } from '$lib/schemas/case.schema.js';

/**
 * Query workflow validation tests.
 *
 * The core lenderQuerySchema tests live in case.schema.test.ts.
 * This file adds deeper coverage for:
 *  - All 6 query categories (exhaustive)
 *  - Query status values and transitions
 *  - Response sub-object validation
 *  - Deadline handling
 *  - Days-open edge cases
 *  - Combined status + response consistency
 */

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

function baseQuery() {
	return {
		query_id: 'q-001',
		query_text: 'Please provide latest bank statement',
		category: 'document' as const,
		raised_at: NOW,
		status: 'open' as const,
		days_open: 0
	};
}

// ═══════════════════════════════════════════════════════════════
// queryCategoryEnum — all 6 categories
// ═══════════════════════════════════════════════════════════════

describe('queryCategoryEnum — exhaustive category validation', () => {
	const ALL_CATEGORIES = [
		'document',
		'clarification',
		'additional_info',
		'technical',
		'legal',
		'other'
	];

	it('has exactly 6 valid categories', () => {
		let passCount = 0;
		for (const cat of ALL_CATEGORIES) {
			if (queryCategoryEnum.safeParse(cat).success) passCount++;
		}
		expect(passCount).toBe(6);
	});

	it.each(ALL_CATEGORIES)('accepts valid category: %s', (cat) => {
		const result = queryCategoryEnum.safeParse(cat);
		expect(result.success).toBe(true);
	});

	it.each([
		'financial',
		'compliance',
		'general',
		'urgent',
		'',
		'DOCUMENT',
		'Document',
		'additional-info'
	])('rejects invalid category: %s', (cat) => {
		const result = queryCategoryEnum.safeParse(cat);
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// queryStatusEnum — all 3 statuses
// ═══════════════════════════════════════════════════════════════

describe('queryStatusEnum — status validation', () => {
	const ALL_STATUSES = ['open', 'responded', 'resolved'];

	it.each(ALL_STATUSES)('accepts valid status: %s', (status) => {
		const result = queryStatusEnum.safeParse(status);
		expect(result.success).toBe(true);
	});

	it.each(['pending', 'closed', 'in_progress', 'answered', '', 'OPEN', 'Open'])(
		'rejects invalid status: %s',
		(status) => {
			const result = queryStatusEnum.safeParse(status);
			expect(result.success).toBe(false);
		}
	);
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — query creation with each category
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — query with every category', () => {
	const categories = [
		'document',
		'clarification',
		'additional_info',
		'technical',
		'legal',
		'other'
	];

	it.each(categories)('accepts open query with category: %s', (cat) => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			category: cat
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — query_text validation
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — query_text field', () => {
	it('rejects missing query_text', () => {
		const { query_text, ...noText } = baseQuery();
		const result = lenderQuerySchema.safeParse(noText);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('query_text');
		}
	});

	it('rejects empty query_text', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), query_text: '' });
		expect(result.success).toBe(false);
	});

	it('accepts long query text', () => {
		const longText = 'A'.repeat(5000);
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), query_text: longText });
		expect(result.success).toBe(true);
	});

	it('accepts single character query text', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), query_text: 'Q' });
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — response sub-object
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — response sub-object validation', () => {
	it('accepts query with full response (text + attachments + responded_at)', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: 'Bank statement for last 6 months uploaded',
				attachments: ['https://storage.example.com/bs1.pdf', 'https://storage.example.com/bs2.pdf'],
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts response without attachments (attachments is optional)', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: 'Clarification provided verbally',
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts response with empty attachments array', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: 'No documents needed',
				attachments: [],
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects response with empty text', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: '',
				responded_at: NOW
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects response missing text', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				responded_at: NOW
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects response missing responded_at', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: 'Answer provided'
			}
		});
		expect(result.success).toBe(false);
	});

	it('coerces response.responded_at string to Date', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			response: {
				text: 'Done',
				responded_at: '2026-02-01T10:00:00Z'
			}
		});
		expect(result.success).toBe(true);
		if (result.success && result.data.response) {
			expect(result.data.response.responded_at).toBeInstanceOf(Date);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — deadline field
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — deadline handling', () => {
	it('accepts query without deadline (optional)', () => {
		const result = lenderQuerySchema.safeParse(baseQuery());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deadline).toBeUndefined();
		}
	});

	it('accepts query with a future deadline', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			deadline: FUTURE
		});
		expect(result.success).toBe(true);
	});

	it('accepts query with a past deadline (schema allows any date)', () => {
		// Note: The schema uses z.coerce.date().optional() — no future-only constraint
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			deadline: PAST
		});
		expect(result.success).toBe(true);
	});

	it('coerces deadline string to Date', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			deadline: '2026-03-15T00:00:00Z'
		});
		expect(result.success).toBe(true);
		if (result.success && result.data.deadline) {
			expect(result.data.deadline).toBeInstanceOf(Date);
		}
	});

	it('rejects invalid deadline string', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			deadline: 'not-a-date'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — days_open field
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — days_open field', () => {
	it('accepts zero days_open (just created)', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), days_open: 0 });
		expect(result.success).toBe(true);
	});

	it('accepts positive days_open', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), days_open: 45 });
		expect(result.success).toBe(true);
	});

	it('accepts large days_open', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), days_open: 365 });
		expect(result.success).toBe(true);
	});

	it('rejects negative days_open', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), days_open: -1 });
		expect(result.success).toBe(false);
	});

	it('rejects fractional days_open (must be integer)', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), days_open: 2.5 });
		expect(result.success).toBe(false);
	});

	it('rejects missing days_open', () => {
		const { days_open, ...noDays } = baseQuery();
		const result = lenderQuerySchema.safeParse(noDays);
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — all 3 statuses with valid data
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — status-specific payloads', () => {
	it('accepts "open" query without response', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'open'
		});
		expect(result.success).toBe(true);
	});

	it('accepts "responded" query with response', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded',
			days_open: 5,
			response: {
				text: 'Documents submitted',
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts "resolved" query with response', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'resolved',
			days_open: 7,
			response: {
				text: 'Query resolved after review',
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('schema allows open query with response (no cross-field constraint)', () => {
		// Note: Zod schema does not enforce that open queries must NOT have a response
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'open',
			response: {
				text: 'Pre-filled response',
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('schema allows responded query without response (no cross-field constraint)', () => {
		// Note: The schema does not enforce that responded queries MUST have a response
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			status: 'responded'
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — raised_at field
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — raised_at field', () => {
	it('rejects missing raised_at', () => {
		const { raised_at, ...noRaised } = baseQuery();
		const result = lenderQuerySchema.safeParse(noRaised);
		expect(result.success).toBe(false);
	});

	it('coerces raised_at string to Date', () => {
		const result = lenderQuerySchema.safeParse(baseQuery());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.raised_at).toBeInstanceOf(Date);
		}
	});

	it('rejects invalid raised_at value', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			raised_at: 'invalid-date'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema — query_id required
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema — query_id field', () => {
	it('rejects missing query_id', () => {
		const { query_id, ...noId } = baseQuery();
		const result = lenderQuerySchema.safeParse(noId);
		expect(result.success).toBe(false);
	});

	it('rejects empty query_id', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery(), query_id: '' });
		expect(result.success).toBe(false);
	});

	it('accepts any non-empty query_id string', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery(),
			query_id: 'q-custom-unique-id-2026'
		});
		expect(result.success).toBe(true);
	});
});
