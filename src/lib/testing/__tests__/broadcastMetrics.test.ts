/**
 * C.3 — broadcast engagement-metric helpers unit tests.
 *
 * The pure helpers extracted from /dashboard/rm/broadcasts/+page.svelte
 * compute reach/opened/percentage for the per-broadcast engagement chip
 * and the recipient-aware Send button label. Pre-fix the page showed
 * bare "N DSAs · M read" which left "did anyone actually open it?" as
 * a math problem the RM had to do mentally; these helpers surface the
 * percentage so the engagement signal is one glance.
 */

import { describe, it, expect } from 'vitest';
import {
	openedPercentage,
	formatEngagement,
	formatSendButtonLabel
} from '$lib/utils/broadcastMetrics';

describe('openedPercentage', () => {
	it('returns null for zero recipients (avoids divide-by-zero)', () => {
		expect(openedPercentage({ target: 0, opened: 0 })).toBeNull();
	});

	it('returns 0 when nothing has been opened', () => {
		expect(openedPercentage({ target: 23, opened: 0 })).toBe(0);
	});

	it('returns 100 when everyone has opened', () => {
		expect(openedPercentage({ target: 23, opened: 23 })).toBe(100);
	});

	it('rounds to the nearest integer (52% not 52.17%)', () => {
		expect(openedPercentage({ target: 23, opened: 12 })).toBe(52);
		expect(openedPercentage({ target: 7, opened: 1 })).toBe(14);
	});

	it('clamps opened > target (data drift) instead of returning >100%', () => {
		// Defensive: if read_by accumulates beyond target_dsa_ids (e.g., DSA
		// re-connects + reads), surface should not show "23 of 20 opened (115%)".
		expect(openedPercentage({ target: 20, opened: 23 })).toBe(100);
	});
});

describe('formatEngagement', () => {
	it('renders the one-line chip with target + opened + percentage', () => {
		expect(formatEngagement({ target: 23, opened: 12 })).toBe(
			'Sent to 23 · Opened 12 (52%)'
		);
	});

	it('renders 0% when nothing opened', () => {
		expect(formatEngagement({ target: 5, opened: 0 })).toBe('Sent to 5 · Opened 0 (0%)');
	});

	it('renders 100% when everyone opened', () => {
		expect(formatEngagement({ target: 5, opened: 5 })).toBe('Sent to 5 · Opened 5 (100%)');
	});

	it('falls back gracefully when target is zero', () => {
		// Shouldn't happen in practice (the POST blocks zero-recipient sends),
		// but defensive copy in case of historical rows.
		expect(formatEngagement({ target: 0, opened: 0 })).toBe('Sent to no one');
	});

	it('clamps over-counting so the chip never shows >100%', () => {
		expect(formatEngagement({ target: 10, opened: 15 })).toBe('Sent to 10 · Opened 10 (100%)');
	});
});

describe('formatSendButtonLabel', () => {
	it('singularises for one recipient', () => {
		expect(formatSendButtonLabel(1)).toBe('Send to 1 DSA');
	});

	it('pluralises for multiple recipients', () => {
		expect(formatSendButtonLabel(23)).toBe('Send to 23 DSAs');
	});

	it('falls back to a generic label when there are no recipients', () => {
		// The send button is disabled in that state anyway, but the label
		// should still be readable rather than "Send to 0 DSAs".
		expect(formatSendButtonLabel(0)).toBe('Send Broadcast');
		expect(formatSendButtonLabel(-1)).toBe('Send Broadcast');
	});
});
