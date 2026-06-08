/**
 * Question Grouping Utility
 * ═══════════════════════════════════════════════════════════════════
 * Transforms a flat array of visible questions into grouped chunks
 * for rendering inside visual card containers.
 *
 * Questions with the same `groupId` that appear consecutively are
 * merged into one group. Questions without `groupId` become solo
 * (ungrouped) entries that render identically to the old flat layout.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ClientQuestion } from '$lib/types/formEngine';

export interface QuestionGroup {
	/** Group identifier — undefined for ungrouped (solo) questions */
	groupId?: string;
	/** Card header text for the group */
	groupTitle?: string;
	/** Questions in this group */
	questions: ClientQuestion[];
}

/**
 * Group consecutive questions by `groupId` into visual chunks.
 *
 * - Consecutive questions with the same groupId → one QuestionGroup
 * - Questions without groupId → solo QuestionGroup (no card wrapper)
 * - If no questions have groupId, returns solo entries (backward compatible)
 * - groupTitle is captured from whichever question in the group defines it
 */
export function groupQuestions(questions: ClientQuestion[]): QuestionGroup[] {
	if (questions.length === 0) return [];

	const groups: QuestionGroup[] = [];
	let currentGroup: QuestionGroup | null = null;

	for (const question of questions) {
		if (question.groupId) {
			// Continue existing group or start a new one
			if (currentGroup && currentGroup.groupId === question.groupId) {
				currentGroup.questions.push(question);
			} else {
				currentGroup = {
					groupId: question.groupId,
					groupTitle: question.groupTitle,
					questions: [question]
				};
				groups.push(currentGroup);
			}
			// Capture groupTitle from whichever question defines it
			if (question.groupTitle && currentGroup) {
				currentGroup.groupTitle = question.groupTitle;
			}
		} else {
			// Ungrouped question — solo entry
			currentGroup = null;
			groups.push({ questions: [question] });
		}
	}

	return groups;
}
