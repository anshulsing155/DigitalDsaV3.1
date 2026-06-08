/**
 * Form Option Fetcher — Targeted option resolution for dependent selects.
 *
 * When the server returns all questions on a page at once (no per-answer re-evaluation),
 * some questions need updated options based on other answers (e.g., state → city).
 * This utility fetches options for specific question IDs via a lightweight API endpoint.
 */

import { secureFetch } from '$lib/utils/csrf';
import type { ClientOption } from '$lib/types/formEngine';

/**
 * Fetch resolved options for specific question IDs from the server.
 * Called when a "trigger" answer changes (e.g., state selection → city options).
 *
 * @param loanType - The loan type string (e.g., "Home Loan")
 * @param questionIds - Question IDs to resolve options for
 * @param answers - Current form answers
 * @returns Map of questionId → resolved options, or null on failure
 */
export async function fetchQuestionOptions(
	loanType: string,
	questionIds: string[],
	answers: Record<string, unknown>,
	retries = 2
): Promise<Record<string, ClientOption[]> | null> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await secureFetch('/api/form/options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ loanType, questionIds, answers })
			});

			if (!res.ok) {
				if (attempt < retries) {
					await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
					continue;
				}
				return null;
			}

			const result = await res.json();
			if (result.success && result.data) {
				return result.data as Record<string, ClientOption[]>;
			}
			return null;
		} catch {
			if (attempt < retries) {
				await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
				continue;
			}
			return null;
		}
	}
	return null;
}

/**
 * Map of bindsTo keys that trigger option resolution for dependent questions.
 * Key: bindsTo key that changed. Value: array of question IDs that need option refresh.
 *
 * Each form page provides its own trigger map based on question IDs in its schema.
 */
export type OptionTriggerMap = Record<string, string[]>;
