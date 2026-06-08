/**
 * Reverse Schema Map
 * ══════════════════════════════════════════════════════════════════
 * Reads loan-type schemas and inverts the bindsTo/bindsTo_template
 * mapping: from storage key -> question metadata.
 *
 * Used by E2E data-driven form filling to map payload keys back to
 * form question IDs + answer types.
 *
 * Also traverses dynamic component schemas (applicantQuestion,
 * obligation, companyQuestion) that the main schemas reference
 * via empty `questions: []` placeholder pages.
 * ══════════════════════════════════════════════════════════════════
 */

import { loadSchema, loadComponentSchema } from './schemaLoader.js';
import type { RawSchema, RawSchemaQuestion, RawSchemaOption } from '$lib/types/formEngine.js';

// ============================================================================
// Types
// ============================================================================

export interface ReverseMapEntry {
	/** The question's ID in the schema (e.g. "q1_isDefaulter") */
	questionId: string;
	/** Question input type */
	questionType: string;
	/** Page ID this question belongs to */
	pageId: string;
	/** 0-based page index within the schema */
	pageIndex: number;
	/** Available options for radio/select questions */
	options?: Array<{ label: string; value: string }>;
	/** Whether the question is marked required */
	required: boolean;
}

/** payloadKey -> ReverseMapEntry (for a given loan type) */
export type ReverseMap = Map<string, ReverseMapEntry>;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Resolve the storage key for a question using the same priority as the engine:
 * bindsTo_template > bindsTo > id
 *
 * Since no schemas currently use template variables ({...}) in bindsTo_template,
 * we treat it as a plain string. If templates are introduced later, this function
 * would need an answers map parameter.
 */
function resolveStorageKey(question: RawSchemaQuestion): string {
	return question.bindsTo_template || question.bindsTo || question.id;
}

/**
 * Normalize option labels to plain strings.
 * Some options have `label: { var: "..." }` — we skip those since they're
 * dynamic and can't be statically mapped.
 */
function normalizeOptions(
	options: RawSchemaOption[] | string | undefined
): Array<{ label: string; value: string }> | undefined {
	if (!options || typeof options === 'string') return undefined;

	return options
		.filter((opt) => typeof opt.label === 'string')
		.map((opt) => ({
			label: opt.label as string,
			value: String(opt.value)
		}));
}

/**
 * Add questions to the map from a flat array (component schema format).
 * Used for applicantQuestion.json, obligation.json, etc.
 */
function addQuestionsToMap(
	map: ReverseMap,
	questions: RawSchemaQuestion[],
	pageId: string,
	pageIndex: number
): void {
	for (const question of questions) {
		const storageKey = resolveStorageKey(question);

		// Skip if already mapped (first occurrence wins — matches engine behavior)
		if (map.has(storageKey)) continue;

		map.set(storageKey, {
			questionId: question.id,
			questionType: question.type,
			pageId,
			pageIndex,
			options: normalizeOptions(question.options),
			required: question.required ?? false
		});
	}
}

/**
 * Safely extract questions from a component schema.
 * Component schemas have varying shapes:
 *   - { questions: [...] }                    (obligation.json, applicantQuestion.json)
 *   - { pages: [{ questions: [...] }] }       (companyQuestion.json)
 *   - { applicant: [...] }                    (applicantBasicDetails.json — deprecated)
 */
function extractComponentQuestions(schema: unknown): RawSchemaQuestion[] {
	if (!schema || typeof schema !== 'object') return [];

	const obj = schema as Record<string, unknown>;

	// Shape: { questions: [...] }
	if (Array.isArray(obj.questions)) {
		return obj.questions as RawSchemaQuestion[];
	}

	// Shape: { pages: [{ questions: [...] }] }
	if (Array.isArray(obj.pages)) {
		const questions: RawSchemaQuestion[] = [];
		for (const page of obj.pages as Array<{ questions?: unknown[] }>) {
			if (Array.isArray(page.questions)) {
				questions.push(...(page.questions as RawSchemaQuestion[]));
			}
		}
		return questions;
	}

	// Shape: { applicant: [...] } (deprecated applicantBasicDetails.json)
	if (Array.isArray(obj.applicant)) {
		return (obj.applicant as Array<Record<string, unknown>>).map((q) => ({
			...q,
			// Map legacy "key" field to bindsTo_template for consistency
			bindsTo_template: (q.bindsTo_template || q.key || q.id) as string,
			type: (q.type || 'text') as string,
			id: (q.id || '') as string
		})) as RawSchemaQuestion[];
	}

	return [];
}

/**
 * Component schemas that should be included when building the reverse map.
 * These represent dynamic sections (applicant details, obligations, income)
 * that the main loan schemas reference via empty `questions: []` placeholder pages.
 *
 * Each entry maps: component schema name → candidate page ID patterns.
 * The builder tries each pattern to find the matching page in the schema,
 * because different loan types use different page IDs:
 *   Home Loan:              tellUs_homeLoan
 *   LAP / Plot:             tellUsApplyingPage
 *   Personal/Business/Prof: applicantPage
 */
const COMPONENT_SCHEMA_PAGE_MAP: Record<string, string[]> = {
	applicantQuestion: ['applicantPage', 'tellUs_homeLoan', 'tellUsApplyingPage'],
	obligation: ['obligationsPage'],
	companyQuestion: ['applicantPage', 'tellUs_homeLoan', 'tellUsApplyingPage']
};

/**
 * Build a reverse map from payload storage keys to question metadata
 * for a given loan type.
 *
 * @param loanType - The loan type name (e.g. "Home Loan", "LAP")
 * @returns Map of storage key -> ReverseMapEntry
 */
/**
 * Expand a location-type question into its compound bindsTo keys.
 * Location questions use locationConfig.prefix to generate 4 storage keys:
 *   {prefix}StateName, {prefix}CityName, {prefix}Area, {prefix}Pincode
 */
function expandLocationQuestion(
	question: RawSchemaQuestion,
	map: ReverseMap,
	pageId: string,
	pageIndex: number
): void {
	const config = question.locationConfig;
	if (!config?.prefix) return;

	const prefix = config.prefix;
	const suffixes: Array<{ suffix: string; subType: string }> = [
		{ suffix: 'StateName', subType: 'select' },
		{ suffix: 'CityName', subType: 'select' },
		{ suffix: 'Area', subType: 'text' },
		{ suffix: 'Pincode', subType: 'text' }
	];

	for (const { suffix, subType } of suffixes) {
		const storageKey = `${prefix}${suffix}`;
		if (map.has(storageKey)) continue;

		map.set(storageKey, {
			questionId: question.id,
			questionType: subType,
			pageId,
			pageIndex,
			required: question.required ?? false
		});
	}
}

export function buildReverseMap(loanType: string): ReverseMap {
	const schema: RawSchema = loadSchema(loanType);
	const map: ReverseMap = new Map();

	for (let pageIndex = 0; pageIndex < schema.pages.length; pageIndex++) {
		const page = schema.pages[pageIndex];

		for (const question of page.questions) {
			// Location questions expand into compound bindsTo keys
			if (question.type === 'location' && question.locationConfig) {
				expandLocationQuestion(question, map, page.id, pageIndex);
				continue;
			}

			const storageKey = resolveStorageKey(question);

			// Skip if already mapped (first occurrence wins — matches engine behavior)
			if (map.has(storageKey)) continue;

			map.set(storageKey, {
				questionId: question.id,
				questionType: question.type,
				pageId: page.id,
				pageIndex,
				options: normalizeOptions(question.options),
				required: question.required ?? false
			});
		}
	}

	// ── Extend with component schemas ────────────────────────────────────
	// The main schema has empty question arrays for applicant, income,
	// credit score, and obligations pages. These are filled dynamically
	// by the form renderer using component schemas. We include them here
	// so the gap report accurately reflects what the form actually asks.

	const totalPages = schema.pages.length;

	for (const [componentName, candidatePageIds] of Object.entries(COMPONENT_SCHEMA_PAGE_MAP)) {
		try {
			const componentSchema = loadComponentSchema(componentName);
			const questions = extractComponentQuestions(componentSchema);

			if (questions.length > 0) {
				// Find the matching page by trying each candidate ID pattern
				let matchingPage = null;
				for (const candidateId of candidatePageIds) {
					matchingPage = schema.pages.find((p) => p.id === candidateId) ?? null;
					if (matchingPage) break;
				}
				const pageIndex = matchingPage ? schema.pages.indexOf(matchingPage) : totalPages;
				const pageId = matchingPage?.id || candidatePageIds[0];

				addQuestionsToMap(map, questions, pageId, pageIndex);
			}
		} catch {
			// Component schema not available — skip silently
		}
	}

	return map;
}

/**
 * Get all available loan types that can be reverse-mapped.
 */
export { getAvailableLoanTypes } from './schemaLoader.js';
