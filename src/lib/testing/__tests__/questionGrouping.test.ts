/**
 * Tests for question grouping utility.
 * Verifies consecutive groupId merging, solo entries, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { groupQuestions } from '$lib/utils/questionGrouping';
import type { ClientQuestion } from '$lib/types/formEngine';

/** Minimal question stub for testing */
function q(id: string, groupId?: string, groupTitle?: string): ClientQuestion {
	return {
		id,
		bindsTo: id,
		type: 'text',
		question: id,
		required: false,
		groupId,
		groupTitle
	} as ClientQuestion;
}

describe('groupQuestions', () => {
	it('returns empty array for empty input', () => {
		expect(groupQuestions([])).toEqual([]);
	});

	it('returns solo entries when no questions have groupId', () => {
		const questions = [q('a'), q('b'), q('c')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(3);
		expect(groups.every((g) => g.groupId === undefined)).toBe(true);
		expect(groups.map((g) => g.questions[0].id)).toEqual(['a', 'b', 'c']);
	});

	it('merges consecutive questions with same groupId', () => {
		const questions = [q('a', 'g1', 'Group 1'), q('b', 'g1'), q('c', 'g1')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(1);
		expect(groups[0].groupId).toBe('g1');
		expect(groups[0].groupTitle).toBe('Group 1');
		expect(groups[0].questions).toHaveLength(3);
	});

	it('separates different groupIds into different groups', () => {
		const questions = [q('a', 'g1', 'One'), q('b', 'g1'), q('c', 'g2', 'Two'), q('d', 'g2')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(2);
		expect(groups[0].groupId).toBe('g1');
		expect(groups[0].questions).toHaveLength(2);
		expect(groups[1].groupId).toBe('g2');
		expect(groups[1].questions).toHaveLength(2);
	});

	it('interleaves grouped and ungrouped questions', () => {
		const questions = [q('a'), q('b', 'g1', 'Grp'), q('c', 'g1'), q('d'), q('e', 'g2')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(4);
		// Solo a
		expect(groups[0].groupId).toBeUndefined();
		expect(groups[0].questions[0].id).toBe('a');
		// Group g1
		expect(groups[1].groupId).toBe('g1');
		expect(groups[1].questions).toHaveLength(2);
		// Solo d
		expect(groups[2].groupId).toBeUndefined();
		// Group g2
		expect(groups[3].groupId).toBe('g2');
	});

	it('captures groupTitle from any question in the group', () => {
		// Title on second question, not first
		const questions = [q('a', 'g1'), q('b', 'g1', 'Late Title')];
		const groups = groupQuestions(questions);
		expect(groups[0].groupTitle).toBe('Late Title');
	});

	it('creates separate groups for non-consecutive same groupId', () => {
		// g1, g2, g1 — the two g1 runs are NOT merged (order matters)
		const questions = [q('a', 'g1', 'First'), q('b', 'g2', 'Second'), q('c', 'g1', 'Third')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(3);
		expect(groups[0].groupId).toBe('g1');
		expect(groups[1].groupId).toBe('g2');
		expect(groups[2].groupId).toBe('g1');
	});

	it('handles single question in a group', () => {
		const questions = [q('a', 'g1', 'Solo Group')];
		const groups = groupQuestions(questions);
		expect(groups).toHaveLength(1);
		expect(groups[0].groupId).toBe('g1');
		expect(groups[0].questions).toHaveLength(1);
	});
});
