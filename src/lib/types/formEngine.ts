/**
 * Types shared between server-side form engine and client-side rendering.
 * These define the API contract -- what the server returns to the client.
 *
 * IMPORTANT: These types contain NO business logic, NO showWhen rules,
 * NO validation thresholds. They are pure data contracts.
 */

import type { RulesLogic } from './questionSchema';

// ============================================================================
// SERVER -> CLIENT RESPONSE TYPES
// ============================================================================

/** What the server returns for a page evaluation */
export interface PageResponse {
	/** Only the visible questions for this page, with text resolved and options filtered */
	questions: ClientQuestion[];
	/** Navigation state */
	navigation: NavigationState;
	/** Overall form progress */
	progress: FormProgress;
	/** Validation errors for current answers */
	validationErrors: FieldError[];
	/** Warning messages for current answers (non-blocking) */
	validationWarnings: FieldWarning[];
	/** Page metadata */
	pageTitle: string;
	pageDescription?: string;
	/** Page ID from schema */
	pageId: string;
	/** Total visible pages count (for progress indicator) */
	totalVisiblePages: number;
	/** Current page index within visible pages */
	currentVisiblePageIndex: number;
	/** Next button visibility mode from schema */
	nextButtonVisibility?: { mode: string[] };
	/** Lightweight map of all visible pages (for wizard sidebar) */
	visiblePageMap: VisiblePageEntry[];
}

/** Lightweight page entry for the wizard sidebar — no questions or rules */
export interface VisiblePageEntry {
	id: string;
	title: string;
	/** Index within the visible pages array */
	index: number;
	/** Server-computed: all required visible questions on this page are answered */
	complete: boolean;
}

/** Question as received by client -- NO business logic */
export interface ClientQuestion {
	id: string;
	bindsTo: string;
	contextKey?: string;
	type: string; // 'radio' | 'select' | 'text' | 'number' | 'checkbox' | 'multiple-select' | 'derivedSelect' | 'location' | etc
	question: string; // Already resolved (no "switch" arrays -- server evaluated them)
	description?: string; // Already resolved
	descriptionHeader?: string;
	descriptionText?: string;
	required: boolean;
	options?: ClientOption[];
	currentValue?: unknown; // Pre-filled from draft answers
	/** Compound bindsTo map for location questions — maps sub-fields to storage keys */
	locationBindsTo?: LocationBindsToMap;
	/** Client-side location config (rendering hints, no business logic) */
	locationConfig?: ClientLocationConfig;
	uiMeta?: Record<string, unknown>;
	/** UI layout hints -- passed through from schema, no logic */
	uiGroup?: string;
	radioClass?: string;
	selectClass?: string;
	textFieldClass?: string;
	optionContainerClass?: string;
	parentClass?: string;
	labelClass?: string;
	/** Field constraints (passed through, no thresholds hidden) */
	fieldType?: string;
	valueType?: 'string' | 'number';
	maxLimit?: number;
	/**
	 * Numeric lower bound (inclusive). REQUIRED for numeric questions
	 * (uiType==='number' / type==='number') — see CLAUDE.md Pitfall #14.
	 * Set to 0 if 0 is a legitimate answer (counts, "EMIs paid so far"),
	 * 1 for positive amounts (loan, salary, area), or higher domain floor.
	 * The `numericFieldsHaveExplicitLimits` test enforces this at CI.
	 */
	minLimit?: number;
	tenureUnit?: 'years' | 'months';
	searchBarNeeded?: boolean;
	continueButton?: boolean;
	infoIcon?: string;
	layoutGroup?: string;
	layoutCols?: number;
	/** Visual card group — consecutive questions with same groupId render inside a shared container */
	groupId?: string;
	/** Card header text for the group (only needed on first question in group) */
	groupTitle?: string;
	modalWidth?: string;
	/** UI type hint (e.g., 'number' for numeric text fields) */
	uiType?: string;
	/** Label description shown below the main label */
	labelDescription?: string;
	/** Sub-label for select fields */
	subLabel?: string;
	/** Selected option class override */
	selectedClass?: string;
	/** Multi-select class override */
	multipleSelectClass?: string;
	/** Limit checker text template (for dynamic max validation display) */
	limitCheckerText?: string;
	/** Limit rule (evaluated server-side, value sent to client) */
	computedLimit?: number | null;
	/** Helper text for options */
	helperText?: string;
	/** Explains WHY this question is asked — from lender/offer preparation perspective */
	whyAsked?: string;
	/**
	 * Within-page showWhen rule (for instant client-side reveals).
	 * Only included for questions on the CURRENT page — NOT cross-page rules.
	 * Uses the custom ShowWhenCondition format (plain string field paths).
	 * Server already filters invisible questions; this enables instant
	 * show/hide within a page without a server round-trip.
	 */
	showWhen?: unknown;
	/**
	 * Obfuscated ID for DOM rendering (production only).
	 * Session-seeded hash — different per session, opaque in DOM inspector.
	 * JavaScript logic still uses `id` for comparisons; domId is for HTML attributes only.
	 * In dev mode, this field is absent (use `id` directly).
	 */
	domId?: string;
	// NO validation rules -- server validates on submit
	/**
	 * Warning conditions (JSON-Logic case/then array) for client-side evaluation.
	 * Session 32: Warnings are now evaluated client-side for instant reactivity.
	 * Server still evaluates as fallback/audit trail.
	 */
	warning?: { condition?: Array<{ case: unknown; then: string }> };
	/** True when server cleared a stale value because it was no longer valid in the new option set */
	staleCleared?: boolean;
	/**
	 * Raw switch source for dynamic text fields. Forwarded when the schema source
	 * was a SwitchArray so the client can re-resolve against current answers
	 * after every keystroke / radio change without a server round-trip.
	 *
	 * The matching `question`/`description`/`descriptionHeader`/`labelDescription`
	 * string fields remain populated with the server-resolved value (resolved
	 * against the answers known to the server at request time) so SSR / first
	 * paint still renders correctly. When the *Dynamic field is present,
	 * `deriveVisibleQuestions` re-evaluates it client-side and overrides the
	 * matching string field — keeping text reactive on the SAME page (e.g.
	 * "What type of area is the customer looking to buy in?" switches to
	 * "Which type of area is this property located in?" when the user flips
	 * propertyIdentified Yes/No without leaving the page).
	 *
	 * See `b8e2ab6c (server-on-next-only)` for why per-keystroke server evals
	 * were removed — these dynamic fields restore the in-page text reactivity
	 * that change eliminated.
	 */
	questionDynamic?: SwitchArray;
	descriptionDynamic?: SwitchArray;
	descriptionHeaderDynamic?: SwitchArray;
	labelDescriptionDynamic?: SwitchArray;
}

/**
 * Declarative risk signal on a schema option.
 * Unlike riskType (which triggers an API lookup), riskSignal is purely
 * informational — the client renders a badge/tooltip without any server call.
 */
export interface RiskSignal {
	/** Visual severity: info (blue), caution (amber), warning (orange), critical (red) */
	severity: 'info' | 'caution' | 'warning' | 'critical';
	/** DSA-facing explanation of why this option is risky */
	message: string;
	/** Optional grouping category (e.g., 'property_risk', 'income_risk', 'compliance_risk') */
	category?: string;
}

export interface ClientOption {
	label: string;
	value: string | number;
	icon?: string;
	description?: string;
	color?: string;
	selectedColor?: string;
	nestedLabel?: string;
	optionsDescription?: string;
	/** Flag keys to set when this option is selected (drives downstream visibility) */
	flagKey?: Record<string, unknown>;
	/** Helper text displayed alongside the option */
	helperText?: string;
	/** Secondary label text shown below the option label (used by RadioField) */
	labelDescription?: string;
	/** Nested items for grouped option types (multiple-select-toggle) */
	items?: ClientOptionItem[];
	/** Risk type identifier — when present, triggers NBFC capability check on client.
	 *  Used for drop-level options where no major bank will finance (e.g., AGREEMENT_POA, UNREGISTERED_POA). */
	riskType?: string;
	/** Declarative risk signal — client shows badge/tooltip, no API call needed.
	 *  Complements riskType (API-driven) with a lighter-weight mechanism for common risky answers. */
	riskSignal?: RiskSignal;
	/** Option-level showWhen for client-side dynamic filtering.
	 *  When present, the client filters visible options based on current answers
	 *  (e.g., qualification options depend on professional category).
	 *  Uses the custom ShowWhenCondition format (plain string field paths). */
	showWhen?: unknown;
	/** When true, selecting this option clears all non-exclusive selections,
	 *  and selecting any non-exclusive option removes this one (e.g., "None collected yet"). */
	exclusive?: boolean;
}

/** Nested item within a grouped option (used by MultiOptionGroupField) */
export interface ClientOptionItem {
	label: string;
	value: string;
	description?: string;
	optionsDescription?: string;
	nestedLabel?: number | string;
	/** ShowWhen condition for item-level toggle dependencies (evaluated client-side) */
	showWhen?: unknown;
}

export interface NavigationState {
	canGoNext: boolean;
	canGoPrev: boolean;
	nextPageIndex: number | null;
	prevPageIndex: number | null;
	/** True if all required questions on current page are answered */
	pageComplete: boolean;
}

export interface FormProgress {
	currentPage: number;
	totalPages: number;
	completedPages: number;
	/** Per-section progress for sidebar */
	sections: SectionProgress[];
	overallPercentage: number;
}

export interface SectionProgress {
	id: string;
	label: string;
	completed: boolean;
	reachable: boolean;
	subsections?: SubsectionProgress[];
}

export interface SubsectionProgress {
	id: string;
	label: string;
	completed: boolean;
	pageIds: string[];
}

export interface FieldError {
	questionId: string;
	bindsTo: string;
	message: string;
}

export interface FieldWarning {
	questionId: string;
	bindsTo: string;
	message: string;
}

// ============================================================================
// CLIENT -> SERVER REQUEST TYPES
// ============================================================================

/** Request body for /api/form/evaluate */
export interface FormEvaluateRequest {
	loanType: string;
	pageIndex: number;
	answers: Record<string, unknown>;
	applicantIndex?: number;
	/** The selected loan name (e.g. "Home Loan", "Plot Loan") */
	loanName?: string;
}

/** Request body for /api/form/submit */
export interface FormSubmitRequest {
	loanType: string;
	answers: Record<string, unknown>;
	applicants: unknown[];
	loanName?: string;
}

// ============================================================================
// INTERNAL SERVER-SIDE TYPES (used by the form engine, not exposed to client)
// ============================================================================

/**
 * Raw schema types -- mirrors JSON structure loaded from schema files.
 * These stay on the server; the client never sees them.
 */
export interface RawSchemaOption {
	label: string | { var: string };
	value: string | number;
	gender?: string;
	description?: string;
	icon?: string;
	color?: string;
	selectedColor?: string;
	showWhen?: RulesLogic;
	Classification?: string;
	nestedLabel?: string;
	optionsDescription?: string;
	flagKey?: Record<string, unknown>;
	labelDescription?: string;
	/** When true, selecting this option clears all non-exclusive selections (e.g., "None collected yet") */
	exclusive?: boolean;
	/** Declarative risk signal — severity + message for DSA guidance on risky answers */
	riskSignal?: RiskSignal;
	[key: string]: unknown;
}

export interface RawSchemaQuestion {
	id: string;
	bindsTo?: string;
	bindsTo_template?: string;
	contextKey?: string;
	type: string;
	question: string | SwitchArray;
	description?: string | SwitchArray;
	descriptionHeader?: string | SwitchArray;
	descriptionText?: string;
	required?: boolean;
	options?: RawSchemaOption[] | string;
	showWhen?: RulesLogic;
	validation?: {
		condition?: RulesLogic;
		message?: string;
	};
	warning?: {
		condition?: RulesLogic;
	};
	affirmative?: {
		condition?: RulesLogic;
	};
	errorMessage?: Record<string, string>;
	uiGroup?: string;
	uiMeta?: Record<string, unknown>;
	uiType?: string;
	radioClass?: string;
	selectClass?: string;
	textFieldClass?: string;
	optionContainerClass?: string;
	parentClass?: string;
	labelClass?: string;
	fieldType?: string;
	valueType?: 'string' | 'number';
	maxLimit?: number;
	minLimit?: number;
	tenureUnit?: 'years' | 'months';
	searchBarNeeded?: boolean;
	continueButton?: boolean;
	infoIcon?: string;
	layoutGroup?: string;
	layoutCols?: number;
	/** Visual card group — consecutive questions with same groupId render inside a shared container */
	groupId?: string;
	/** Card header text for the group (only needed on first question in group) */
	groupTitle?: string;
	modalWidth?: string;
	/** Location compound question config (type: 'location' only) */
	locationConfig?: LocationConfig;
	[key: string]: unknown;
}

// ============================================================================
// LOCATION COMPOUND QUESTION TYPES
// ============================================================================

/**
 * Server-side location config — defines how a compound location question
 * maps to multiple bindsTo keys and which sub-fields are visible/required.
 */
export interface LocationConfig {
	/** Prefix for auto-generated bindsTo keys: {prefix}StateName, {prefix}CityName, {prefix}Area, {prefix}Pincode */
	prefix: string;
	/** Which pincode dataset to use: 'selected' (23 supported states) or 'all' (36 states) */
	dataSource: 'selected' | 'all';
	/** Whether to show the area/locality field (default: false) */
	showArea?: boolean;
	/** Whether to show the pincode field (default: true) */
	showPincode?: boolean;
	/** Whether state is required (default: true) */
	stateRequired?: boolean;
	/** Whether city is required (default: true) */
	cityRequired?: boolean;
	/** Whether area is required (default: false) */
	areaRequired?: boolean;
	/** Whether pincode is required (default: false) */
	pincodeRequired?: boolean;
}

/** Maps location sub-fields to their actual bindsTo storage keys */
export interface LocationBindsToMap {
	state: string;
	city: string;
	area: string;
	pincode: string;
}

/** Client-side location rendering config (subset of LocationConfig, no business logic) */
export interface ClientLocationConfig {
	showArea: boolean;
	showPincode: boolean;
	dataSource: 'selected' | 'all';
}

export interface RawSchemaPage {
	id: string;
	title?: string;
	description?: string;
	questions: RawSchemaQuestion[];
	showWhen?: RulesLogic;
	nextButtonVisibility?: { mode: string[] };
	pageType?: string;
}

export interface RawSchema {
	formId: string;
	title: string;
	pages: RawSchemaPage[];
}

/** The "switch" array pattern found in question text and descriptions */
export interface SwitchCase {
	case: RulesLogic;
	then: string;
}

export type SwitchArray = {
	switch: SwitchCase[];
	default?: string;
};
