/**
 * Server-Side Form Engine
 *
 * Evaluates form schemas, determines visible questions, validates answers,
 * and computes navigation/progress -- all on the server.
 *
 * The client NEVER sees:
 * - showWhen rules
 * - validation thresholds
 * - the full schema structure
 * - hidden questions/pages
 */
import type {
	PageResponse,
	ClientQuestion,
	NavigationState,
	FormProgress,
	SectionProgress,
	FieldError,
	FieldWarning,
	RawSchema,
	RawSchemaPage,
	RawSchemaQuestion,
	RawSchemaOption,
	ClientOption,
	VisiblePageEntry
} from '$lib/types/formEngine';
import { dev } from '$app/environment';
import { loadSchema } from './schemaLoader';
import { isQuestionVisible, isPageVisible, type AnswersMap } from './visibility';
import { resolveText, resolveDynamicMessages, isSwitchArray } from './textResolver';
import { resolveOptions, resolveAuthorityForCity, dynamicGeneratorIds } from './optionResolver';
import { computeMonthsSinceDisbursement } from '$lib/utils/combinedAnswersMemo';

// ============================================================================
// ShowWhen Obfuscation (production only)
// ============================================================================

/**
 * XOR-cipher a showWhen condition using sessionId as key, then base64 encode.
 * Produces a session-specific opaque string — different sessions see different
 * encodings for the same condition. In dev mode, this function is NOT called.
 */
export function encodeShowWhen(condition: unknown, sessionId: string): string {
	const json = JSON.stringify(condition);
	const keyBytes = new TextEncoder().encode(sessionId);
	const dataBytes = new TextEncoder().encode(json);
	const result = new Uint8Array(dataBytes.length);
	for (let i = 0; i < dataBytes.length; i++) {
		result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
	}
	return btoa(String.fromCharCode(...result));
}

/**
 * Short deterministic hash of an ID + seed. Used for DOM ID obfuscation.
 * Same (id, seed) always produces same hash; different seeds produce different hashes.
 */
function shortHash(id: string, seed: string): string {
	let h = 0;
	const combined = seed + id;
	for (let i = 0; i < combined.length; i++) {
		h = ((h << 5) - h + combined.charCodeAt(i)) | 0;
	}
	return 'f' + Math.abs(h).toString(36).slice(0, 8);
}

// ============================================================================
// JSON Logic → Custom ShowWhen Transformer
// ============================================================================

/**
 * Transform a JSON Logic rule to the custom ShowWhenCondition format
 * used by the client-side showWhenEngine.ts.
 *
 * JSON Logic uses `{"var": "key"}` objects for field references.
 * Custom format uses plain `"key"` strings.
 *
 * Example:
 *   JSON Logic:  {"==": [{"var": "propertyIdentified"}, "Yes"]}
 *   Custom:      {"==": ["propertyIdentified", "Yes"]}
 */
export function transformJsonLogicToCustom(rule: unknown): unknown {
	if (!rule || typeof rule !== 'object') return rule;

	// Preserve plain arrays (e.g. the list in {"in": [{"var":"x"}, ["a","b","c"]]})
	// Only recurse into arrays that are operator arguments (handled below).
	if (Array.isArray(rule)) {
		return rule.map((item) => transformJsonLogicToCustom(item));
	}

	// Handle {"var": "key"} → "key"
	if ('var' in (rule as Record<string, unknown>)) {
		return (rule as { var: string }).var;
	}

	const obj = rule as Record<string, unknown>;
	const result: Record<string, unknown> = {};

	for (const [key, val] of Object.entries(obj)) {
		if (Array.isArray(val)) {
			// Recursively transform array elements (operator arguments)
			const transformedArgs = val.map((item) => transformJsonLogicToCustom(item));

			// JSON Logic sometimes encodes scalar RHS values as a single-item array
			// (e.g. {"==":[{"var":"loanType"},["Plot Loan Only"]]}). json-logic-js
			// treats that as equal via JS coercion, but our client showWhen engine
			// uses strict equality. Normalize to keep server+client semantics aligned.
			if (
				(key === '==' || key === '!=' || key === '===' || key === '!==') &&
				transformedArgs.length >= 2 &&
				Array.isArray(transformedArgs[1]) &&
				(transformedArgs[1] as unknown[]).length === 1
			) {
				transformedArgs[1] = (transformedArgs[1] as unknown[])[0];
			}

			// JSON-Logic `!` / `not` wraps a single expression in an array:
			// { "!": [expr] }. The client showWhen engine expects a plain object,
			// not an array. Unwrap so evaluateCondition receives the right shape.
			if ((key === '!' || key === 'not') && transformedArgs.length === 1) {
				result[key] = transformedArgs[0];
			} else {
				result[key] = transformedArgs;
			}
		} else if (typeof val === 'object' && val !== null) {
			// Recursively transform nested objects
			result[key] = transformJsonLogicToCustom(val);
		} else {
			result[key] = val;
		}
	}

	return result;
}

// ============================================================================
// Binding Resolution (ported from schema.ts)
// ============================================================================

/**
 * Sanitize a string to be used as a storage key.
 * Replaces spaces with underscores.
 */
function sanitizeKey(value: string | undefined): string {
	if (!value) return '';
	return value.replace(/\s+/g, '_');
}

/**
 * Resolve the bindsTo key for a question, handling bindsTo_template patterns.
 *
 * This is the SERVER copy. Kept standalone (not re-using the client version
 * at `$lib/form/firstPage/schema.ts`) for three structural reasons:
 *
 *   1. `locationConfig` pre-flatten branch — server receives compound
 *      `type: 'location'` questions that the client never sees (they are
 *      flattened before the client payload is built). The client
 *      `Question` type does not even carry a `locationConfig` field.
 *
 *   2. `jsonLogic.add_operation` singleton boundary — the server module
 *      mutates the shared `json-logic-js` singleton to implement fail-hide
 *      `!=` / `!==` semantics (see `visibility.ts` + CLAUDE.md Pitfall #1).
 *      Client code must not import the server module or those overrides
 *      would leak into the client bundle. This resolver lives alongside
 *      that override in server-only code by design.
 *
 *   3. `loanName` alias — server accepts both `q1_loanName` and `loanName`
 *      as the substitution key (client only handles `q1_loanName`). The
 *      server receives payloads from multiple ingestion points with slightly
 *      different key hygiene; supporting both matches what the caller gives.
 *
 * Historical port source was `src/lib/form/homeLoan/schema.ts`, now archived
 * at `$lib/form/_archive/homeLoan-schema.ts` (session S77b-4B, 2026-04-21).
 * See `docs/RESOLUTION-PLAN.md` §4B (CLOSED) and §4A for the full rationale.
 */
function resolveBindsTo(
	question: RawSchemaQuestion,
	answers: AnswersMap,
	loanName: string
): string {
	// Location questions use prefix-based compound keys — primary = state key
	if (question.type === 'location' && question.locationConfig) {
		return `${question.locationConfig.prefix}StateName`;
	}

	if (!question.bindsTo_template) return question.bindsTo || question.id;

	return question.bindsTo_template.replace(/\{([^}]+)\}/g, (_, key: string) => {
		if (key === 'q1_loanName' || key === 'loanName') return sanitizeKey(loanName);
		const val = answers[key];
		return typeof val === 'string' ? sanitizeKey(val) : (val?.toString() ?? '');
	});
}

/**
 * Resolve the full bindsTo map for a location compound question.
 * Returns { state, city, area, pincode } → actual storage keys.
 */
function resolveLocationBindsToMap(
	question: RawSchemaQuestion
): { state: string; city: string; area: string; pincode: string } | null {
	if (question.type !== 'location' || !question.locationConfig) return null;
	const p = question.locationConfig.prefix;
	return {
		state: `${p}StateName`,
		city: `${p}CityName`,
		area: `${p}Area`,
		pincode: `${p}Pincode`
	};
}

/**
 * Check if a location compound question is "complete" based on its config.
 * Checks all required sub-fields (state + city required by default).
 */
function isLocationQuestionComplete(question: RawSchemaQuestion, answers: AnswersMap): boolean {
	const map = resolveLocationBindsToMap(question);
	if (!map) return false;
	const cfg = question.locationConfig!;

	const hasValue = (key: string): boolean => {
		const val = answers[key];
		return val !== undefined && val !== null && val !== '';
	};

	if (cfg.stateRequired !== false && !hasValue(map.state)) return false;
	if (cfg.cityRequired !== false && !hasValue(map.city)) return false;
	if (cfg.areaRequired && !hasValue(map.area)) return false;
	if (cfg.pincodeRequired && !hasValue(map.pincode)) return false;
	return true;
}

/**
 * Generic completion check for any question (handles both regular and location types).
 */
function isQuestionComplete(
	question: RawSchemaQuestion,
	answers: AnswersMap,
	loanName: string
): boolean {
	if (question.type === 'location') {
		return isLocationQuestionComplete(question, answers);
	}
	const key = resolveBindsTo(question, answers, loanName);
	const val = answers[key];
	return (
		val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)
	);
}

// ============================================================================
// FormEngine Class
// ============================================================================

export interface FormEngineOptions {
	/** State options for property location selects */
	stateOptions?: ClientOption[];
	/** All state options for residence selects */
	allStateOptions?: ClientOption[];
	/** Bank data for bank selection questions */
	bankData?: Array<{
		label: string;
		value: string;
		Classification?: string;
		[key: string]: unknown;
	}>;
	/** Session ID for response fingerprinting (zero-width chars in descriptions) */
	sessionId?: string;
}

// ============================================================================
// Response Fingerprinting Utilities
// ============================================================================

/** Zero-width characters used for invisible session encoding */
export const ZWC_ZERO = '\u200B'; // zero-width space = bit 0
export const ZWC_ONE = '\u200D'; // zero-width joiner = bit 1

/**
 * Encode the first 8 characters of a sessionId as zero-width characters.
 * Each character is converted to 8-bit binary, encoded as ZWC_ZERO/ZWC_ONE.
 * Result is invisible in UI but present in DOM/API response.
 * Max 64 zero-width chars (8 chars × 8 bits).
 */
/** @internal Exported for testing only. */
export function encodeSessionFingerprint(sessionId: string): string {
	const chars = sessionId.slice(0, 8);
	let result = '';
	for (const ch of chars) {
		const code = ch.charCodeAt(0);
		for (let bit = 7; bit >= 0; bit--) {
			result += (code >> bit) & 1 ? ZWC_ONE : ZWC_ZERO;
		}
	}
	return result;
}

/**
 * Deterministic shuffle of an array based on a seed string.
 * Same seed always produces same order (consistent UX per session).
 * Different seeds produce different orders (leaked responses traceable).
 */
/** @internal Exported for testing only. */
export function deterministicShuffle<T>(arr: T[], seed: string): T[] {
	if (arr.length <= 1) return arr;
	const result = [...arr];
	// Simple hash-based Fisher-Yates shuffle
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	for (let i = result.length - 1; i > 0; i--) {
		hash = (hash * 1103515245 + 12345) | 0;
		const j = Math.abs(hash) % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export class FormEngine {
	private schema: RawSchema;
	private loanName: string;

	constructor(loanType: string) {
		this.loanName = loanType;
		this.schema = loadSchema(loanType);
	}

	// ========================================================================
	// Page Evaluation
	// ========================================================================

	/**
	 * Evaluate a single page -- returns only visible questions with resolved text.
	 * This is the main entry point called by form API endpoints.
	 */
	async evaluatePage(
		pageIndex: number,
		answers: AnswersMap,
		options?: FormEngineOptions
	): Promise<PageResponse> {
		// 1. Build combined answers with shorthand keys
		const combinedAnswers = this.buildCombinedAnswers(answers);

		// 2. Get all visible pages
		const visiblePages = this.getVisiblePages(combinedAnswers);
		const totalVisiblePages = visiblePages.length;

		// 3. Clamp page index
		const clampedIndex = Math.max(0, Math.min(pageIndex, totalVisiblePages - 1));
		const page = visiblePages[clampedIndex];

		if (!page) {
			// Edge case: no visible pages at all
			return this.emptyPageResponse(pageIndex, totalVisiblePages);
		}

		// 4. Convert ALL questions to client format (with showWhen for client-side filtering).
		// Client handles within-page visibility via shouldShow(). This eliminates the need
		// for per-answer server round-trips — server is called only on page navigation.
		let clientQuestions = await Promise.all(
			page.questions.map((q) => this.toClientQuestion(q, combinedAnswers, options))
		);

		// Keep visible-only set for navigation/progress/validation computation
		const visibleQuestions = page.questions.filter((q) => isQuestionVisible(q, combinedAnswers));

		// 5b. Deterministic question ordering for response fingerprinting.
		// Same session always sees same order (consistent UX).
		// Different sessions see different order (leaked responses traceable).
		// Only shuffle when sessionId is available and page has 3+ questions.
		const hasGroupedQuestions = page.questions.some((q) => q.groupId);
		if (options?.sessionId && clientQuestions.length >= 3 && !hasGroupedQuestions) {
			clientQuestions = deterministicShuffle(clientQuestions, options.sessionId + page.id);
		}

		// 6. Compute navigation state (using visible-only questions for accuracy)
		const visibleClientQuestions = await Promise.all(
			visibleQuestions.map((q) => this.toClientQuestion(q, combinedAnswers, options))
		);
		const navigation = this.computeNavigation(
			clampedIndex,
			visiblePages,
			visibleClientQuestions,
			combinedAnswers
		);

		// 7. Compute progress
		const progress = this.computeProgress(clampedIndex, visiblePages, combinedAnswers);

		// 8. Validate current page answers
		const validationErrors = this.validatePage(page, combinedAnswers);

		// 9. Evaluate warnings
		const validationWarnings = this.evaluateWarnings(page, combinedAnswers);

		// 10. Build lightweight page map (for wizard sidebar navigation)
		const visiblePageMap: VisiblePageEntry[] = visiblePages.map((p, i) => {
			const vq = p.questions.filter((q) => isQuestionVisible(q, combinedAnswers));
			const rq = vq.filter((q) => q.required);
			// No required visible questions → page is inherently complete
			const complete =
				rq.length === 0 || rq.every((q) => isQuestionComplete(q, combinedAnswers, this.loanName));
			return { id: p.id, title: p.title ?? `Page ${i + 1}`, index: i, complete };
		});

		return {
			questions: clientQuestions,
			navigation,
			progress,
			validationErrors,
			validationWarnings,
			pageTitle: page.title ?? '',
			pageDescription: page.description,
			pageId: page.id,
			totalVisiblePages,
			currentVisiblePageIndex: clampedIndex,
			nextButtonVisibility: page.nextButtonVisibility,
			visiblePageMap
		};
	}

	// ========================================================================
	// Targeted Option Resolution (for client-side state→city updates)
	// ========================================================================

	/**
	 * Resolve options for specific question IDs without full page evaluation.
	 * Used by /api/form/options for lightweight option updates (state→city, etc.).
	 */
	async resolveQuestionOptions(
		questionIds: string[],
		answers: Record<string, unknown>,
		options?: FormEngineOptions
	): Promise<Record<string, import('$lib/types/formEngine').ClientOption[]>> {
		const combinedAnswers = this.buildCombinedAnswers(answers);
		const result: Record<string, import('$lib/types/formEngine').ClientOption[]> = {};

		// Search all pages for the requested question IDs
		const idSet = new Set(questionIds);
		for (const page of this.schema.pages) {
			for (const q of page.questions) {
				if (idSet.has(q.id)) {
					const resolved = await resolveOptions(q, combinedAnswers, options);
					result[q.id] = resolved ?? [];
					idSet.delete(q.id);
					if (idSet.size === 0) return result;
				}
			}
		}

		return result;
	}

	// ========================================================================
	// Visible Pages
	// ========================================================================

	/**
	 * Get all visible pages based on current answers.
	 * Includes component-handled pages (0 questions) — client renders custom UI for those.
	 */
	getVisiblePages(answers: AnswersMap): RawSchemaPage[] {
		return this.schema.pages.filter(
			(page) => Array.isArray(page.questions) && isPageVisible(page, answers)
		);
	}

	// ========================================================================
	// Client Question Conversion
	// ========================================================================

	/**
	 * Convert a raw schema question to a client-safe question.
	 * Resolves text, filters options, strips all business logic.
	 */
	private async toClientQuestion(
		question: RawSchemaQuestion,
		answers: AnswersMap,
		options?: FormEngineOptions
	): Promise<ClientQuestion> {
		const bindsTo = resolveBindsTo(question, answers, this.loanName);

		const clientQ: ClientQuestion = {
			id: question.id,
			bindsTo,
			type: question.type,
			question: resolveText(question.question, answers),
			required: question.required ?? false,
			currentValue: answers[bindsTo]
		};

		// Forward raw switch arrays so the client can re-resolve dynamic text
		// reactively when answers change on the same page. The resolved string
		// above remains the SSR / first-paint fallback. See ClientQuestion
		// docstring + Pitfall #2 (server→client field mapping).
		if (isSwitchArray(question.question)) {
			clientQ.questionDynamic = question.question;
		}

		// Location compound question: add bindsTo map, config, and compound currentValue
		if (question.type === 'location' && question.locationConfig) {
			const locMap = resolveLocationBindsToMap(question)!;
			clientQ.locationBindsTo = locMap;
			clientQ.locationConfig = {
				showArea: question.locationConfig.showArea ?? false,
				showPincode: question.locationConfig.showPincode !== false,
				dataSource: question.locationConfig.dataSource
			};
			// Override currentValue with compound object for all sub-fields
			clientQ.currentValue = {
				state: answers[locMap.state] ?? '',
				city: answers[locMap.city] ?? '',
				area: answers[locMap.area] ?? '',
				pincode: answers[locMap.pincode] ?? ''
			};
			// Provide state options directly (so component doesn't need a separate call)
			if (options) {
				const stateOpts =
					question.locationConfig.dataSource === 'selected'
						? options.stateOptions
						: options.allStateOptions;
				if (stateOpts) clientQ.options = stateOpts;
			}
		}

		// Resolve optional text fields
		if (question.contextKey) clientQ.contextKey = question.contextKey;
		if (question.description) {
			clientQ.description = resolveText(question.description, answers);
			if (isSwitchArray(question.description)) {
				clientQ.descriptionDynamic = question.description;
			}
		}
		if (question.descriptionHeader) {
			clientQ.descriptionHeader = resolveText(question.descriptionHeader, answers);
			if (isSwitchArray(question.descriptionHeader)) {
				clientQ.descriptionHeaderDynamic = question.descriptionHeader;
			}
		}
		if (question.descriptionText) clientQ.descriptionText = question.descriptionText;

		// Resolve options (filtered by visibility, labels resolved)
		const resolvedOptions = await resolveOptions(question, answers, options);
		if (resolvedOptions) clientQ.options = resolvedOptions;

		// Stale dynamic value check: if current answer is no longer in the resolved options,
		// clear it so the client shows a fresh select. This handles city→authority, city→builder etc.
		// Only for VISIBLE questions with dynamically generated options (not static showWhen-gated ones).
		// Static options with showWhen are sent to client for client-side filtering — the value may
		// be valid for a sibling question sharing the same bindsTo key.
		const isDynamicQuestion = !!dynamicGeneratorIds.has(question.id);
		const isVisible = isQuestionVisible(question, answers);
		if (
			isDynamicQuestion &&
			isVisible &&
			resolvedOptions &&
			clientQ.currentValue &&
			typeof clientQ.currentValue === 'string' &&
			clientQ.currentValue !== ''
		) {
			const validValues = new Set(resolvedOptions.map((o) => o.value));
			if (!validValues.has(clientQ.currentValue)) {
				clientQ.currentValue = '';
				clientQ.staleCleared = true;
			}
		}

		// Pass through UI metadata (no logic, pure presentation)
		if (question.uiMeta) clientQ.uiMeta = { ...question.uiMeta };

		// Authority auto-suggestion: inject suggestedValue based on property
		// city. Covers Home Loan (q1_authorityName/authorityName) and Plot
		// Loan (q2_developmentAuthority/developmentAuthority) — both read the
		// same property location answers.
		if (
			(question.id === 'q1_authorityName' && !answers['authorityName']) ||
			(question.id === 'q2_developmentAuthority' && !answers['developmentAuthority'])
		) {
			const city = (answers['propertyCityName'] ?? '') as string;
			const suggested = resolveAuthorityForCity(city);
			if (suggested) {
				if (!clientQ.uiMeta) clientQ.uiMeta = {};
				clientQ.uiMeta.suggestedValue = suggested;
			}
		}
		if (question.uiGroup) clientQ.uiGroup = question.uiGroup;
		if (question.radioClass) clientQ.radioClass = question.radioClass;
		if (question.selectClass) clientQ.selectClass = question.selectClass;
		if (question.textFieldClass) clientQ.textFieldClass = question.textFieldClass;
		if (question.optionContainerClass) clientQ.optionContainerClass = question.optionContainerClass;
		if (question.parentClass) clientQ.parentClass = question.parentClass;
		if (question.labelClass) clientQ.labelClass = question.labelClass;
		if (question.fieldType) clientQ.fieldType = question.fieldType;
		if (question.valueType) clientQ.valueType = question.valueType;
		if (question.maxLimit !== undefined) clientQ.maxLimit = question.maxLimit;
		if (question.minLimit !== undefined) clientQ.minLimit = question.minLimit;
		if (question.tenureUnit) clientQ.tenureUnit = question.tenureUnit;
		if (question.searchBarNeeded) clientQ.searchBarNeeded = question.searchBarNeeded;
		if (question.continueButton) clientQ.continueButton = question.continueButton;
		if (question.infoIcon) clientQ.infoIcon = question.infoIcon;
		if (question.layoutGroup) clientQ.layoutGroup = question.layoutGroup;
		if (question.layoutCols) clientQ.layoutCols = question.layoutCols;
		if (question.groupId) clientQ.groupId = question.groupId;
		if (question.groupTitle) clientQ.groupTitle = question.groupTitle as string;
		if (question.modalWidth) clientQ.modalWidth = question.modalWidth;
		if (question.uiType) clientQ.uiType = question.uiType;
		if (question.labelDescription) {
			clientQ.labelDescription = resolveText(question.labelDescription as string, answers);
			if (isSwitchArray(question.labelDescription)) {
				clientQ.labelDescriptionDynamic = question.labelDescription;
			}
		}
		if (question.subLabel) clientQ.subLabel = question.subLabel as string;
		if (question.selectedClass) clientQ.selectedClass = question.selectedClass as string;
		if (question.multipleSelectClass)
			clientQ.multipleSelectClass = question.multipleSelectClass as string;
		if (question.limitCheckerText) clientQ.limitCheckerText = question.limitCheckerText as string;
		if (question.whyAsked) clientQ.whyAsked = question.whyAsked as string;

		// Include within-page showWhen for instant client-side reveals.
		// Transform JSON Logic format to custom ShowWhenCondition format.
		// Page-level showWhen is NOT sent (cross-page routing stays hidden).
		// In production, XOR-cipher with sessionId so network inspector sees opaque base64.
		if (question.showWhen) {
			const transformed = transformJsonLogicToCustom(question.showWhen);
			if (!dev && options?.sessionId) {
				clientQ.showWhen = encodeShowWhen(transformed, options.sessionId);
			} else {
				clientQ.showWhen = transformed;
			}
		}

		// Production: DOM ID obfuscation — short session-seeded hash for HTML attributes.
		// JavaScript logic still uses question.id for hardcoded comparisons.
		if (!dev && options?.sessionId) {
			clientQ.domId = shortHash(question.id, options.sessionId);
		}

		// Response fingerprinting: embed invisible session marker in descriptions.
		// Zero-width characters encode the first 8 chars of sessionId.
		// Not visible in UI but present in DOM — traceable if leaked.
		if (options?.sessionId && clientQ.description) {
			clientQ.description += encodeSessionFingerprint(options.sessionId);
		}

		// Session 32: Pass warning conditions to client for instant reactivity.
		// Server still evaluates as fallback/audit trail.
		if (question.warning?.condition) {
			clientQ.warning = {
				condition: question.warning.condition as Array<{ case: unknown; then: string }>
			};
		}

		// INTENTIONALLY NOT included:
		// - validation (server validates, client doesn't need rules)
		// - affirmative (server evaluates)
		// - bindsTo_template (resolved to bindsTo)

		return clientQ;
	}

	// ========================================================================
	// Navigation
	// ========================================================================

	private computeNavigation(
		currentIndex: number,
		visiblePages: RawSchemaPage[],
		clientQuestions: ClientQuestion[],
		_answers: AnswersMap
	): NavigationState {
		const total = visiblePages.length;
		const canGoPrev = currentIndex > 0;
		const canGoNext = currentIndex < total - 1;

		// Check if all required questions on current page are answered
		const pageComplete = clientQuestions
			.filter((q) => q.required)
			.every((q) => {
				// Location questions: check required sub-fields via compound currentValue
				if (q.type === 'location' && q.locationBindsTo) {
					const cv = q.currentValue as Record<string, string> | undefined;
					if (!cv) return false;
					// State and city are always required for location questions
					return !!cv.state && !!cv.city;
				}
				const val = q.currentValue;
				return (
					val !== undefined &&
					val !== null &&
					val !== '' &&
					!(Array.isArray(val) && val.length === 0)
				);
			});

		return {
			canGoNext,
			canGoPrev,
			nextPageIndex: canGoNext ? currentIndex + 1 : null,
			prevPageIndex: canGoPrev ? currentIndex - 1 : null,
			pageComplete
		};
	}

	// ========================================================================
	// Progress
	// ========================================================================

	private computeProgress(
		currentIndex: number,
		visiblePages: RawSchemaPage[],
		answers: AnswersMap
	): FormProgress {
		const totalPages = visiblePages.length;

		// Count completed pages (all required questions answered)
		let completedPages = 0;
		const sections: SectionProgress[] = [];

		for (let i = 0; i < visiblePages.length; i++) {
			const page = visiblePages[i];
			const visibleQuestions = page.questions.filter((q) => isQuestionVisible(q, answers));
			const requiredQuestions = visibleQuestions.filter((q) => q.required);

			const allAnswered = requiredQuestions.every((q) =>
				isQuestionComplete(q, answers, this.loanName)
			);

			if (allAnswered && requiredQuestions.length > 0) {
				completedPages++;
			}

			sections.push({
				id: page.id,
				label: page.title ?? `Page ${i + 1}`,
				completed: allAnswered && requiredQuestions.length > 0,
				reachable: i <= completedPages // Simple sequential reachability
			});
		}

		const overallPercentage = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

		return {
			currentPage: currentIndex,
			totalPages,
			completedPages,
			sections,
			overallPercentage
		};
	}

	// ========================================================================
	// Validation
	// ========================================================================

	/**
	 * Validate answers for a page. Returns errors for questions that have
	 * validation conditions and whose conditions trigger.
	 */
	validatePage(page: RawSchemaPage, answers: AnswersMap): FieldError[] {
		const errors: FieldError[] = [];

		for (const question of page.questions) {
			// Skip invisible questions
			if (!isQuestionVisible(question, answers)) continue;

			const bindsTo = resolveBindsTo(question, answers, this.loanName);
			const val = answers[bindsTo];

			// Skip validation if field is empty (required-check is separate)
			if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
				continue;
			}

			// Evaluate validation condition (dynamic error messages from schema)
			if (question.validation?.condition) {
				// Coerce numeric string answers to actual numbers for JSON-Logic comparisons.
				// Form inputs store values as strings (e.g., "5000000"), but JSON-Logic's
				// <, >, <=, >= operators need real numbers for reliable comparison.
				const coercedAnswers = { ...answers };
				if (question.uiType === 'number' || question.type === 'currency') {
					const numVal = Number(val);
					if (!isNaN(numVal) && val !== '') {
						coercedAnswers[bindsTo] = numVal;
					}
				}
				const errorMessages = resolveDynamicMessages(question.validation.condition, coercedAnswers);
				if (errorMessages.length > 0) {
					errors.push({
						questionId: question.id,
						bindsTo,
						message: errorMessages.join(' and\n')
					});
				}
			}
		}

		return errors;
	}

	/**
	 * Evaluate warning conditions for a page. Warnings are non-blocking.
	 */
	private evaluateWarnings(page: RawSchemaPage, answers: AnswersMap): FieldWarning[] {
		const warnings: FieldWarning[] = [];

		for (const question of page.questions) {
			if (!isQuestionVisible(question, answers)) continue;

			const bindsTo = resolveBindsTo(question, answers, this.loanName);
			const val = answers[bindsTo];

			if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
				continue;
			}

			if (question.warning?.condition) {
				// Coerce numeric strings for reliable JSON-Logic comparisons (same as validation)
				const coercedAnswers = { ...answers };
				if (question.uiType === 'number' || question.type === 'currency') {
					const numVal = Number(val);
					if (!isNaN(numVal) && val !== '') {
						coercedAnswers[bindsTo] = numVal;
					}
				}
				const warningMessages = resolveDynamicMessages(question.warning.condition, coercedAnswers);
				if (warningMessages.length > 0) {
					warnings.push({
						questionId: question.id,
						bindsTo,
						message: warningMessages.join(' and\n')
					});
				}
			}
		}

		return warnings;
	}

	// ========================================================================
	// Combined Answers
	// ========================================================================

	/**
	 * Build combined answers with shorthand keys and context key mappings.
	 *
	 * One of THREE buildCombinedAnswers shapes in the codebase. They are NOT
	 * three copies of the same function — they are three different algorithms
	 * solving three different problems. See `docs/RESOLUTION-PLAN.md` §4C
	 * (CLOSED S77b-4C) for the full three-row algorithmic-differences table.
	 *
	 * This server variant has two specialisations not present in the client
	 * variants — both are structurally required and would silently regress if
	 * ported naively:
	 *
	 *   1. **locationConfig pre-flatten branch** (via the server `resolveBindsTo`
	 *      above). Server evaluates compound `type: 'location'` questions that
	 *      the client never sees — they are flattened to `${prefix}StateName`,
	 *      `${prefix}CityName` before the payload reaches the client. Lives
	 *      inside the `jsonLogic.add_operation` singleton-override boundary
	 *      documented in §4A + CLAUDE.md Pitfall #1.
	 *
	 *   2. **flagKey resolution with contextKey-collision guard.** When a
	 *      radio/select option is selected and its option definition carries a
	 *      `flagKey` object (e.g. `{ purchaseType: 'resale', sellerHasLoan: true }`),
	 *      those key-value pairs get merged into combined answers so downstream
	 *      showWhen conditions can reference them. The guard: boolean flagKey
	 *      entries whose key matches the question's own `contextKey` are
	 *      skipped — otherwise they would overwrite the string answer ("Yes"/"No")
	 *      with `true` / `false`, silently breaking every downstream
	 *      `{ "==": [{ "var": "<contextKey>" }, "Yes"] }` comparison.
	 *
	 * Opposite to the `$lib/form/firstPage/schema.ts` variant, this method
	 * ONLY copies real answers — it does not inject type-specific defaults.
	 * Default injection would pollute the submission payload AND is unnecessary
	 * because the server evaluator uses the fail-HIDE `!=` / `!==` overrides
	 * from §4A for unanswered dependencies. The canonical CLIENT form-page
	 * variants live in `$lib/utils/combinedAnswersMemo.ts` (flat merge, no
	 * schema walk, applicant meta flags, paired with `stableReference()`).
	 *
	 * Historical port source was `src/lib/form/homeLoan/schema.ts`, archived
	 * S77b-4B (2026-04-21) — that source had zero live importers at archive
	 * time. Do NOT consolidate the three surviving shapes without reading
	 * RESOLUTION-PLAN §4C and the headers on the other two files.
	 */
	private buildCombinedAnswers(answers: AnswersMap): AnswersMap {
		const combined: AnswersMap = { ...answers };

		for (const page of this.schema.pages) {
			for (const q of page.questions) {
				const key = resolveBindsTo(q, answers, this.loanName);
				if (!key) continue;

				// Only copy real answers (don't inject defaults)
				if (answers[key] !== undefined) {
					combined[key] = answers[key];

					// Shorthand alias (e.g. "q1_propertyIdentified" -> "propertyIdentified")
					if (key.includes('_')) {
						combined[key.split('_').pop()!] = answers[key];
					}

					// Context key mapping
					if (q.contextKey) {
						combined[q.contextKey] = answers[key];
					}

					// flagKey resolution: when a radio/select option has a flagKey object,
					// merge those key-value pairs into combined answers so downstream
					// showWhen conditions can reference them (e.g. purchaseType, sellerHasLoan).
					// IMPORTANT: Skip boolean flagKeys where the key matches the question's
					// own contextKey — those would overwrite the string answer ("Yes"/"No")
					// with true/false, breaking all downstream showWhen comparisons.
					if (Array.isArray(q.options)) {
						const selectedValue = answers[key];
						const selectedOpt = (q.options as RawSchemaOption[]).find(
							(o) => String(o.value) === String(selectedValue)
						);
						if (selectedOpt?.flagKey) {
							const contextKey = q.contextKey;
							for (const [flagK, flagV] of Object.entries(selectedOpt.flagKey)) {
								if (typeof flagV === 'boolean' && flagK === contextKey) continue;
								combined[flagK] = flagV;
							}
						}
					}
				}
			}
		}

		combined.loanName = this.loanName;
		combined.q1_loanName = this.loanName;

		// BT cross-field validation: compute max possible EMIs from disbursement date
		const disbDateRaw = (combined['loanDisbursementDate'] ?? combined['disbursementDate']) as
			| string
			| undefined;
		if (disbDateRaw && typeof disbDateRaw === 'string') {
			const maxEmis = computeMonthsSinceDisbursement(disbDateRaw);
			if (maxEmis !== null) combined['_maxPossibleEmis'] = maxEmis;
		}

		return combined;
	}

	// ========================================================================
	// Helpers
	// ========================================================================

	private emptyPageResponse(pageIndex: number, totalVisiblePages: number): PageResponse {
		return {
			questions: [],
			navigation: {
				canGoNext: false,
				canGoPrev: false,
				nextPageIndex: null,
				prevPageIndex: null,
				pageComplete: true
			},
			progress: {
				currentPage: pageIndex,
				totalPages: totalVisiblePages,
				completedPages: 0,
				sections: [],
				overallPercentage: 0
			},
			validationErrors: [],
			validationWarnings: [],
			pageTitle: '',
			pageId: '',
			totalVisiblePages,
			currentVisiblePageIndex: 0,
			visiblePageMap: []
		};
	}

	/**
	 * Get the underlying schema (for advanced use cases like schema introspection).
	 * Should only be called from server-side code.
	 */
	getSchema(): RawSchema {
		return this.schema;
	}

	/**
	 * Get the loan name/type this engine was created for.
	 */
	getLoanName(): string {
		return this.loanName;
	}
}

// ============================================================================
// Factory (with instance caching)
// ============================================================================

/**
 * Cache of FormEngine instances, keyed by loan type.
 *
 * WHY THIS IS SAFE: FormEngine is stateless — it holds only a reference to
 * the frozen schema and the loan type string. All per-request state (answers,
 * options, sessionId) is passed as arguments to evaluatePage(). Caching
 * eliminates redundant object creation on every /api/form/evaluate call
 * and every +page.server.ts load.
 *
 * The cache lives at module scope, so it persists for the server process
 * lifetime — matching the schema cache lifetime in schemaLoader.ts.
 */
const engineCache = new Map<string, FormEngine>();

/**
 * Factory function to get a form engine for a specific loan type.
 *
 * Returns a cached instance if one exists for this loan type, otherwise
 * creates one and caches it. Since FormEngine is stateless (frozen schema +
 * loan type string only), the same instance is safe to reuse across requests.
 *
 * @param loanType - The loan type name (e.g. "Home Loan", "LAP", "Plot Loan")
 * @returns A configured FormEngine instance (may be cached)
 */
export function createFormEngine(loanType: string): FormEngine {
	const cached = engineCache.get(loanType);
	if (cached) return cached;

	const engine = new FormEngine(loanType);
	engineCache.set(loanType, engine);
	return engine;
}
