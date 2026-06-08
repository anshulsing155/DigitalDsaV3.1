/**
 * Email suppression list — behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the filter contract of filterSuppressedRecipients:
 *   - no suppressed addresses → returns all original
 *   - one suppressed address → dropped, others survive
 *   - all suppressed → empty allowed list
 *   - case-insensitive matching (webhook stores lowercased)
 *   - Mongo error → fail-open (return original, log)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDsaFind = vi.fn();
const mockRmFind = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: {
		find: (...args: unknown[]) => mockDsaFind(...args)
	},
	rmApplications: {
		find: (...args: unknown[]) => mockRmFind(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { filterSuppressedRecipients } from '$lib/server/emailProviders/suppressionList';

function chainable(rows: Array<{ email: string }>) {
	return {
		limit: () => ({ toArray: () => Promise.resolve(rows) })
	};
}

beforeEach(() => {
	mockDsaFind.mockReset();
	mockRmFind.mockReset();
});

describe('filterSuppressedRecipients', () => {
	it('returns original list + empty dropped when no recipients are suppressed', async () => {
		mockDsaFind.mockReturnValue(chainable([]));
		mockRmFind.mockReturnValue(chainable([]));

		const result = await filterSuppressedRecipients(['alice@example.com', 'bob@example.com']);
		expect(result.allowed).toEqual(['alice@example.com', 'bob@example.com']);
		expect(result.dropped).toEqual([]);
	});

	it('drops suppressed addresses from the DsaApplications collection', async () => {
		mockDsaFind.mockReturnValue(chainable([{ email: 'alice@example.com' }]));
		mockRmFind.mockReturnValue(chainable([]));

		const result = await filterSuppressedRecipients(['alice@example.com', 'bob@example.com']);
		expect(result.allowed).toEqual(['bob@example.com']);
		expect(result.dropped).toEqual(['alice@example.com']);
	});

	it('drops suppressed addresses from rmApplications collection too', async () => {
		mockDsaFind.mockReturnValue(chainable([]));
		mockRmFind.mockReturnValue(chainable([{ email: 'rm@example.com' }]));

		const result = await filterSuppressedRecipients(['alice@example.com', 'rm@example.com']);
		expect(result.allowed).toEqual(['alice@example.com']);
		expect(result.dropped).toEqual(['rm@example.com']);
	});

	it('returns empty allowed list when every recipient is suppressed', async () => {
		mockDsaFind.mockReturnValue(chainable([{ email: 'alice@example.com' }]));
		mockRmFind.mockReturnValue(chainable([{ email: 'bob@example.com' }]));

		const result = await filterSuppressedRecipients(['alice@example.com', 'bob@example.com']);
		expect(result.allowed).toEqual([]);
		expect(result.dropped.sort()).toEqual(['alice@example.com', 'bob@example.com']);
	});

	it('is case-insensitive (webhook lowercases stored addresses)', async () => {
		mockDsaFind.mockReturnValue(chainable([{ email: 'alice@example.com' }]));
		mockRmFind.mockReturnValue(chainable([]));

		const result = await filterSuppressedRecipients(['Alice@EXAMPLE.com']);
		expect(result.allowed).toEqual([]);
		expect(result.dropped).toEqual(['Alice@EXAMPLE.com']);
	});

	it('fails open on Mongo error — returns original list, no drops', async () => {
		mockDsaFind.mockImplementation(() => {
			throw new Error('Mongo unavailable');
		});
		mockRmFind.mockReturnValue(chainable([]));

		const result = await filterSuppressedRecipients(['alice@example.com']);
		expect(result.allowed).toEqual(['alice@example.com']);
		expect(result.dropped).toEqual([]);
	});

	it('handles empty input cleanly', async () => {
		const result = await filterSuppressedRecipients([]);
		expect(result.allowed).toEqual([]);
		expect(result.dropped).toEqual([]);
		expect(mockDsaFind).not.toHaveBeenCalled();
		expect(mockRmFind).not.toHaveBeenCalled();
	});
});
