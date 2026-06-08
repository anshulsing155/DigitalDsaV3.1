/**
 * Option Resolver (Server-Side Only)
 *
 * Filters and resolves options for questions:
 * 1. Filters out options whose showWhen rules don't match current context
 * 2. Resolves dynamic option labels (financial year placeholders, etc.)
 * 3. Generates dynamic options for specific question types (age ranges, tenure, etc.)
 * 4. Strips showWhen rules from the response (client never sees them)
 *
 * Ported from: src/lib/form/homeLoan/options.ts (getOptions)
 */
import type { RawSchemaOption, RawSchemaQuestion, ClientOption } from '$lib/types/formEngine';
import { isOptionVisible, type AnswersMap } from './visibility';
import { resolveOptionLabel } from './textResolver';
import {
	getCityOptionsForState,
	getCityOptionsForAllState,
	getBuildersForCity,
	getProjectsForBuilder,
	getPincodeSuggestions
} from './engineContext';
import { transformJsonLogicToCustom, encodeShowWhen } from './engine';
import { dev } from '$app/environment';
import logger from '$lib/server/logger.js';

// ============================================================================
// Dynamic Option Generators
// ============================================================================

/**
 * Registry of question IDs that need dynamically generated options.
 * These override the static options from the schema.
 *
 * Ported from src/lib/form/homeLoan/options.ts
 */
type DynamicOptionGenerator = (
	question: RawSchemaQuestion,
	answers: AnswersMap,
	context?: OptionResolverContext
) => ClientOption[] | null | Promise<ClientOption[] | null>;

interface OptionResolverContext {
	/** State options for property location selects (filtered by supported states) */
	stateOptions?: ClientOption[];
	/** All state options (for residence state selects) */
	allStateOptions?: ClientOption[];
	/** Bank data for bank selection questions */
	bankData?: Array<{
		label: string;
		value: string;
		Classification?: string;
		[key: string]: unknown;
	}>;
	/** Session ID for anti-scraping encoding of item-level showWhen conditions */
	sessionId?: string;
}

/**
 * Generate a range of numeric options (for age, tenure, etc.)
 */
function generateRange(min: number, max: number): ClientOption[] {
	return Array.from({ length: max - min + 1 }, (_, i) => {
		const val = i + min;
		return { label: val.toString(), value: val.toString() };
	});
}

/**
 * Dynamic option generators keyed by question ID.
 * Returns null if no dynamic generation is needed (fall through to static options).
 */
const dynamicGenerators: Record<string, DynamicOptionGenerator> = {
	// Plot Loan schema uses q1_ prefix for property state
	q1_propertyStateName: (_q, _a, ctx) => {
		return ctx?.stateOptions ?? null;
	},

	q2_propertyStateName: (_q, _a, ctx) => {
		return ctx?.stateOptions ?? null;
	},

	// V2 schema uses q4_ prefix for property state
	q4_propertyStateName: (_q, _a, ctx) => {
		return ctx?.stateOptions ?? null;
	},

	q5_residenceStateName: (_q, _a, ctx) => {
		return ctx?.allStateOptions ?? null;
	},

	// Plot Loan schema uses q4_ prefix for residence state
	q4_residenceStateName: (_q, _a, ctx) => {
		return ctx?.allStateOptions ?? null;
	},

	// Personal & Business Loan: residence state (all India)
	q1_residenceStateName: (_q, _a, ctx) => {
		return ctx?.allStateOptions ?? null;
	},

	// Business Loan: business state (all India)
	q1_businessStateName: (_q, _a, ctx) => {
		return ctx?.allStateOptions ?? null;
	},

	// Professional Loan: business state (all India)
	q4_businessStateName: (_q, _a, ctx) => {
		return ctx?.allStateOptions ?? null;
	},

	q4_bankName: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData
			.filter((b) => b.Classification !== 'NBFC')
			.map((b) => ({ label: b.label, value: b.value }));
	},

	q2_bankName: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData
			.filter((b) => b.Classification !== 'NBFC')
			.map((b) => ({ label: b.label, value: b.value }));
	},

	q_sellerLoanBankName: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData
			.filter((b) => b.Classification !== 'NBFC')
			.map((b) => ({ label: b.label, value: b.value }));
	},

	// V2 schema uses q3_sellerCurrentLender for seller's bank
	q3_sellerCurrentLender: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData
			.filter((b) => b.Classification !== 'NBFC')
			.map((b) => ({ label: b.label, value: b.value }));
	},

	q_selectSingleBank: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// V2 schema uses q9_ prefix for bank selection on BT existing loan page
	q9_selectSingleBank: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Shared BT-loan-details page (`btLoanDetailsQuestions.qBankName`) — used by
	// Plot Loan BT-only and LAP BT flows. Mirrors q9_selectSingleBank in HL —
	// includes ALL banks AND NBFCs (an existing loan being transferred can come
	// from any lender: vehicle / gold / personal / business loans frequently
	// originate at NBFCs and refinance into LAP). Detected 2026-05-28 when the
	// dropdown rendered empty on Plot Loan BT-only because q1_bankName was not
	// registered here (silent failure — Home Loan BT works because it uses its
	// own q9_selectSingleBank above).
	q1_bankName: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	q9_sellerCurrentLender: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// DC existing bank (business + professional loans) — deprecated but kept for saved forms
	q5_dcExistingBank: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Current account bank selector (professional loan)
	q5b_currentAccountBanks: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Current account bank selector (business loan)
	q5b_currentAccountBanks_business: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Seller's existing loan lender (plot loan resale)
	q5a_sellerLoanLender: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Plot loan — current lender holding the mortgage on the plot/property
	// (Construction Loan Only flow, when plotMortgageStatus === 'has_loan')
	q0c_plotLoanLender: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	// Case intake — assessment lenders (all loan types)
	q2_assessmentLenders: (_q, _a, ctx) => {
		if (!ctx?.bankData) return null;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	},

	q_newTenure: () => {
		return generateRange(1, 30);
	},

	q_topTenure: (_q, answers) => {
		const newTenure = answers?.newTenure;
		const maxAge = typeof newTenure === 'number' && newTenure >= 15 ? 15 : Number(newTenure) || 15;
		return generateRange(1, maxAge);
	},

	q_age: () => {
		return generateRange(18, 75);
	},

	// Pincode typeahead suggestions (based on partial input)
	q6_pincode: (_q, answers) => {
		// This returns suggestions for client-side autocomplete
		// Since pincode is a text field, we return suggestions as pseudo-options
		const currentPincode = answers['pincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) {
			return [];
		}

		// Get matching pincodes and format them for autocomplete display
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// LAP: Property pincode typeahead
	q3b_propertyPincode: (_q, answers) => {
		const currentPincode = answers['propertyPincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// LAP: Residence pincode typeahead
	q6b_residencePincode: (_q, answers) => {
		const currentPincode = answers['residencePincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// Plot Loan: Property pincode typeahead
	q2b_propertyPincode: (_q, answers) => {
		const currentPincode = answers['propertyPincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// Plot Loan: Residence pincode typeahead
	q5b_residencePincode: (_q, answers) => {
		const currentPincode = answers['residencePincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// Personal & Business Loan: Residence pincode typeahead
	q2b_residencePincode: (_q, answers) => {
		const currentPincode = answers['residencePincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// Professional Loan: Business pincode typeahead
	q5b_businessPincode: (_q, answers) => {
		const currentPincode = answers['businessPincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// City options derived from the selected state
	// Plot Loan schema uses q2_ prefix for property city
	q2_propertyCityName: (_q, answers) => {
		const state = (answers['propertyStateName'] ?? answers['q1_propertyStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForState(state);
	},

	q3_propertyCityName: (_q, answers) => {
		const state = (answers['propertyStateName'] ?? answers['q2_propertyStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForState(state);
	},

	// V2 schema uses q5_ prefix for property city
	q5_propertyCityName: (_q, answers) => {
		const state = (answers['propertyStateName'] ?? answers['q4_propertyStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForState(state);
	},

	q6_residenceCityName: (_q, answers) => {
		const state = (answers['residenceStateName'] ?? answers['q5_residenceStateName']) as
			| string
			| undefined;
		if (!state) return [];
		const cities = getCityOptionsForAllState(state);
		const propertyCity = (answers['propertyCityName'] ?? answers['q3_propertyCityName']) as
			| string
			| undefined;
		if (propertyCity) {
			const lc = propertyCity.trim().toLowerCase();
			return cities.filter((c) => (c.value as string).trim().toLowerCase() !== lc);
		}
		return cities;
	},

	// Plot Loan schema uses q5_ prefix for residence city
	q5_residenceCityName: (_q, answers) => {
		const state = (answers['residenceStateName'] ?? answers['q4_residenceStateName']) as
			| string
			| undefined;
		if (!state) return [];
		const cities = getCityOptionsForAllState(state);
		const propertyCity = (answers['propertyCityName'] ?? answers['q2_propertyCityName']) as
			| string
			| undefined;
		if (propertyCity) {
			const lc = propertyCity.trim().toLowerCase();
			return cities.filter((c) => (c.value as string).trim().toLowerCase() !== lc);
		}
		return cities;
	},

	// Personal & Business Loan: residence city (all India)
	q2_residenceCityName: (_q, answers) => {
		const state = (answers['residenceStateName'] ?? answers['q1_residenceStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForAllState(state);
	},

	// Business Loan: business city (all India)
	q2_businessCityName: (_q, answers) => {
		const state = (answers['businessStateName'] ?? answers['q1_businessStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForAllState(state);
	},

	// Professional Loan: business city (all India)
	q5_businessCityName: (_q, answers) => {
		const state = (answers['businessStateName'] ?? answers['q4_businessStateName']) as
			| string
			| undefined;
		if (!state) return [];
		return getCityOptionsForAllState(state);
	},

	// Business Loan: Business pincode typeahead
	q2b_businessPincode: (_q, answers) => {
		const currentPincode = answers['businessPincode'] as string | undefined;
		if (!currentPincode || currentPincode.length < 1) return [];
		const suggestions = getPincodeSuggestions(currentPincode, 'all', 10);
		return suggestions.map((s) => ({
			label: `${s.pincode} - ${s.area}, ${s.city}`,
			value: s.pincode
		}));
	},

	// Authority name — dynamic options from city/state, with city match first.
	// Shared between Home Loan (q1_authorityName) and Plot Loan
	// (q2_developmentAuthority); both read from the same property city/state
	// answers and produce the same option shape.
	q1_authorityName: buildAuthorityOptions,
	q2_developmentAuthority: buildAuthorityOptions,

	// Builder/Promoter selection — City → all builders (via RERA projects → junction → companies)
	q_builderName: async (_question, answers) => {
		const city = (answers['propertyCityName'] ?? '') as string;
		const state = (answers['propertyStateName'] ?? '') as string;
		if (!city) return [];

		const builders = await getBuildersForCity(city, state);
		if (builders.length === 0) return [];

		return [...builders, { label: 'Other', value: '__other__' }];
	},

	// Project selection — Builder → Projects in that city (via junction)
	q_projectName: async (_question, answers) => {
		const city = (answers['propertyCityName'] ?? '') as string;
		const state = (answers['propertyStateName'] ?? '') as string;
		const builder = (answers['builderName'] ?? '') as string;
		if (!city || !builder || builder === '__other__') return [];

		const projects = await getProjectsForBuilder(city, state, builder);
		if (projects.length === 0) return [];

		return [...projects, { label: 'Other', value: '__other__' }];
	},

	// Project Lenders — DSA selects known lenders that fund this project
	q_projectLenders: (_question, _answers, ctx) => {
		if (!ctx?.bankData) return null;
		// All banks + NBFCs available as lender options
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	}
};

// ============================================================================
// City → Authority Mapping
/**
 * Shared resolver for the development-authority dropdown.
 * Used by both Home Loan's `q1_authorityName` and Plot Loan's
 * `q2_developmentAuthority` — same field semantics, same option shape.
 */
function buildAuthorityOptions(
	_question: unknown,
	answers: Record<string, unknown>
): ClientOption[] {
	const city = (answers['propertyCityName'] ?? '') as string;
	const state = (answers['propertyStateName'] ?? '') as string;

	// City-specific authorities go first (marked as suggested).
	const options: ClientOption[] = [];
	const addedCodes = new Set<string>();
	const cityAuthorities = getAuthoritiesForCity(city);
	if (cityAuthorities.length > 0) {
		for (const auth of cityAuthorities) {
			const code = extractAuthorityCode(auth);
			if (!addedCodes.has(code)) {
				options.push({ label: auth, value: code, description: 'Suggested for ' + city });
				addedCodes.add(code);
			}
		}
	}

	// Fallback: if the city has no specific match, surface every authority in
	// the state so the DSA isn't stuck with only the two generic options.
	if (options.length === 0 && state) {
		const stateAuthorities = getAuthoritiesForState(state);
		for (const auth of stateAuthorities) {
			const code = extractAuthorityCode(auth);
			if (!addedCodes.has(code)) {
				options.push({ label: auth, value: code, description: state });
				addedCodes.add(code);
			}
		}
	}

	// Generic catch-all options at the end.
	if (!addedCodes.has('DEFENCE')) {
		options.push({
			label: 'Military / Defence authority (e.g., Army Welfare Housing)',
			value: 'DEFENCE'
		});
	}
	options.push({ label: 'Other authority', value: 'OTHER' });

	return options;
}

// Canonical lookup lives in `$lib/utils/developmentAuthorityLookup.ts` so the
// client-side form page can use the same data (auto-fill when a city has exactly
// one authority). Re-export so existing server-side callers don't break.
// ============================================================================

import {
	getAuthoritiesForCity as _getAuthoritiesForCity,
	getAuthoritiesForState as _getAuthoritiesForState,
	extractAuthorityCode as _extractAuthorityCode,
	resolveAuthorityForCity as _resolveAuthorityForCity,
	getAuthorityCodesForState as _getAuthorityCodesForState
} from '$lib/utils/developmentAuthorityLookup';

// Re-export the canonical lookup helpers so existing server callers keep working.
export const getAuthoritiesForCity = _getAuthoritiesForCity;
export const getAuthoritiesForState = _getAuthoritiesForState;
export const resolveAuthorityForCity = _resolveAuthorityForCity;
export const getAuthorityCodesForState = _getAuthorityCodesForState;
const extractAuthorityCode = _extractAuthorityCode;

/** IDs of questions with dynamically generated options (not static schema options) */
export const dynamicGeneratorIds = new Set(Object.keys(dynamicGenerators));

// ============================================================================
// String Option Reference Resolution
// ============================================================================

/**
 * Registry of string option references to data source resolvers.
 * When a schema question has `options: "bankNameJSON"`, this maps
 * the string to the correct data source from the context.
 */
const stringOptionResolvers: Record<
	string,
	(ctx?: OptionResolverContext) => ClientOption[] | undefined
> = {
	bankNameJSON: (ctx) => {
		if (!ctx?.bankData) return undefined;
		return ctx.bankData.map((b) => ({ label: b.label, value: b.value }));
	}
};

/**
 * Resolve a string option reference (e.g. "bankNameJSON") to actual option data.
 */
function resolveStringOptionRef(
	ref: string,
	context?: OptionResolverContext
): ClientOption[] | undefined {
	const resolver = stringOptionResolvers[ref];
	if (resolver) {
		return resolver(context);
	}
	logger.warn({ ref }, '[FormEngine] Unknown string option reference');
	return undefined;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve options for a question: filter by visibility, resolve labels.
 *
 * When options have showWhen rules, ALL options are sent to the client with
 * their showWhen conditions preserved (transformed to custom format) so the
 * client can dynamically re-filter when dependencies change on the same page.
 * When no option-level showWhen exists, options are filtered server-side.
 *
 * @param question - The raw schema question
 * @param answers - Current form answers for context
 * @param context - Optional context with state/bank data for dynamic options
 * @returns Array of client-safe options
 */
export async function resolveOptions(
	question: RawSchemaQuestion,
	answers: AnswersMap,
	context?: OptionResolverContext
): Promise<ClientOption[] | undefined> {
	// Check for dynamic generator first
	const generator = dynamicGenerators[question.id];
	if (generator) {
		const dynamicOptions = await generator(question, answers, context);
		if (dynamicOptions !== null) {
			return dynamicOptions;
		}
	}

	// Handle string option references (e.g. "bankNameJSON" → resolve from bank data)
	if (typeof question.options === 'string') {
		return resolveStringOptionRef(question.options, context);
	}

	// No static options defined
	if (!question.options || !Array.isArray(question.options)) {
		return undefined;
	}

	// Check if any options have showWhen rules for client-side dynamic filtering
	const hasOptionShowWhen = question.options.some((opt) => opt.showWhen);
	if (hasOptionShowWhen) {
		// Send ALL options with showWhen preserved (transformed to custom format)
		// so the client can re-filter dynamically when dependencies change on the same page
		return question.options.map((opt) => toClientOption(opt, answers, true, context?.sessionId));
	}

	// No option-level showWhen — filter server-side as before
	return question.options
		.filter((opt) => isOptionVisible(opt, answers))
		.map((opt) => toClientOption(opt, answers, false, context?.sessionId));
}

/**
 * Convert a raw schema option to a client-safe option.
 * Strips showWhen rules and resolves dynamic labels.
 */
function toClientOption(
	opt: RawSchemaOption,
	answers: AnswersMap,
	preserveShowWhen = false,
	sessionId?: string
): ClientOption {
	const clientOpt: ClientOption = {
		label: resolveOptionLabel(opt.label, answers),
		value: opt.value
	};

	// Pass through optional fields
	if (opt.icon) clientOpt.icon = opt.icon;
	if (opt.description) clientOpt.description = opt.description;
	if (opt.color) clientOpt.color = opt.color;
	if (opt.selectedColor) clientOpt.selectedColor = opt.selectedColor;
	if (opt.nestedLabel) clientOpt.nestedLabel = opt.nestedLabel;
	if (opt.optionsDescription) clientOpt.optionsDescription = opt.optionsDescription;
	if (opt.flagKey) clientOpt.flagKey = opt.flagKey;
	if (opt.helperText) clientOpt.helperText = opt.helperText as string;
	if (opt.riskType) clientOpt.riskType = opt.riskType as string;
	if (opt.riskSignal) clientOpt.riskSignal = opt.riskSignal as ClientOption['riskSignal'];
	if (opt.labelDescription) clientOpt.labelDescription = opt.labelDescription;
	if (opt.exclusive) clientOpt.exclusive = true;

	// Grouped items (multiple-select-toggle): pass through items with their
	// showWhen conditions — encoded in production for anti-scraping hardening
	const items = (opt as Record<string, unknown>).items;
	if (Array.isArray(items)) {
		clientOpt.items = items.map((item: Record<string, unknown>) => {
			const mapped: {
				label: string;
				value: string;
				description?: string;
				optionsDescription?: string;
				nestedLabel?: string | number;
				showWhen?: unknown;
			} = {
				label: String(item.label ?? ''),
				value: String(item.value ?? '')
			};
			if (item.description) mapped.description = String(item.description);
			if (item.optionsDescription) mapped.optionsDescription = String(item.optionsDescription);
			if (item.nestedLabel !== undefined) mapped.nestedLabel = item.nestedLabel as string | number;

			if (item.showWhen) {
				const transformed = transformJsonLogicToCustom(item.showWhen);
				mapped.showWhen = !dev && sessionId ? encodeShowWhen(transformed, sessionId) : transformed;
			}

			return mapped;
		});
	}

	// Preserve showWhen for client-side dynamic filtering when requested
	// Transform from JSON-Logic format ({var: "key"}) to custom format ("key")
	if (preserveShowWhen && opt.showWhen) {
		clientOpt.showWhen = transformJsonLogicToCustom(opt.showWhen);
	}

	return clientOpt;
}
