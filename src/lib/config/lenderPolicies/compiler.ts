/**
 * Policy Compiler — Converts CategoryPolicyConfig → ParsedLenderRuleDocument
 * ══════════════════════════════════════════════════════════════════
 * Takes a lender's policy config (category defaults + overrides)
 * and produces one ParsedLenderRuleDocument per loan product.
 *
 * The output is 100% compatible with evaluationEngine.ts — zero
 * engine changes needed. evaluateLender() consumes these directly.
 *
 * Usage:
 *   const config = getCategoryDefaults('PVT');
 *   // Apply lender-specific overrides...
 *   const ruleDocs = compileRuleDocs('hdfc-bank', 'HDFC Bank', 'PVT',
 *     ['Home Loan', 'Loan Against Property'], config);
 * ══════════════════════════════════════════════════════════════════
 */

import type { ParsedLenderRuleDocument } from '$lib/ruleEngine/types';
import type { LenderClassification } from '$lib/types/policyEngine';
import type { LoanProduct } from './types';
import type { CategoryPolicyConfig } from './categoryDefaults';
import {
	makeEligibilityRules,
	makeCibilRules,
	makeFoirRules,
	makeFullIncomeRules,
	makeLtvRules,
	makeObligationRules,
	makeTenureRules,
	makeRoiRules,
	makeFeeRules,
	makeNriGate,
	makeCompanyGate,
	makeStandardCibilDeviation,
	makeStandardPolicies,
	type TenureConfig,
	type RoiConfig
} from './helpers';

// ============================================================================
// PRODUCT → CONFIG KEY MAPPING
// ============================================================================

type TenureKey = keyof CategoryPolicyConfig['tenure'];
type RoiKey = keyof CategoryPolicyConfig['roi'];
type FeeKey = keyof CategoryPolicyConfig['processingFeePercent'];

const PRODUCT_KEY_MAP: Record<LoanProduct, { tenure: TenureKey; roi: RoiKey; fee: FeeKey }> = {
	'Home Loan': { tenure: 'homeLoan', roi: 'homeLoan', fee: 'homeLoan' },
	'Loan Against Property': { tenure: 'lap', roi: 'lap', fee: 'lap' },
	'Plot and Construction Loan': { tenure: 'plotLoan', roi: 'plotLoan', fee: 'plotLoan' },
	'Personal Loan': { tenure: 'personalLoan', roi: 'personalLoan', fee: 'personalLoan' },
	'Business Loan': { tenure: 'businessLoan', roi: 'businessLoan', fee: 'businessLoan' },
	'Professional Loan': {
		tenure: 'professionalLoan',
		roi: 'professionalLoan',
		fee: 'professionalLoan'
	}
};

/** Secured loan types that need LTV rules */
const SECURED_PRODUCTS: Set<LoanProduct> = new Set([
	'Home Loan',
	'Loan Against Property',
	'Plot and Construction Loan'
]);

// ============================================================================
// COMPILE A SINGLE PRODUCT RULE DOCUMENT
// ============================================================================

/**
 * Compile a single ParsedLenderRuleDocument for one lender + one product.
 */
function compileForProduct(
	lenderId: string,
	lenderName: string,
	classification: LenderClassification,
	product: LoanProduct,
	cfg: CategoryPolicyConfig
): ParsedLenderRuleDocument {
	const prefix = lenderId;
	const keys = PRODUCT_KEY_MAP[product];
	const isSecured = SECURED_PRODUCTS.has(product);

	const tenureCfg: TenureConfig = cfg.tenure[keys.tenure];
	const roiCfg: RoiConfig = cfg.roi[keys.roi];
	const feePercent: number = cfg.processingFeePercent[keys.fee];

	// Confidence baseline: category defaults get 0.7, specific overrides get higher
	const confidence = 0.7;

	return {
		lender_id: lenderId,
		lender_name: lenderName,
		classification,
		loan_types: [product],

		sections: {
			eligibility: makeEligibilityRules(prefix, cfg.eligibility, confidence),
			cibil: makeCibilRules(prefix, cfg.minCibil, confidence),
			foir: makeFoirRules(prefix, cfg.foir, confidence),
			income_assessment: makeFullIncomeRules(prefix, cfg.income, confidence),
			ltv: isSecured ? makeLtvRules(prefix, cfg.ltv, confidence) : null,
			obligation_treatment: makeObligationRules(prefix, cfg.obligations),
			property: null,
			transaction: null,
			tenure: makeTenureRules(prefix, tenureCfg, confidence),
			roi: makeRoiRules(prefix, roiCfg, confidence),
			fees: makeFeeRules(prefix, feePercent, confidence),
			disbursement: null,
			documentation: null,
			nri: cfg.eligibility.acceptsNRI ? [makeNriGate(prefix)] : null,
			company: cfg.eligibility.acceptsCompany
				? [makeCompanyGate(prefix, cfg.eligibility.companyMinVintageYears)]
				: null,
			balance_transfer: null,
			top_up: null
		},

		deviations: [
			makeStandardCibilDeviation(
				prefix,
				cfg.minCibil,
				cfg.cibilDeviationRelax,
				cfg.cibilDeviationIncomeThreshold
			)
		],

		policies: makeStandardPolicies({
			processingFeePercent: feePercent,
			maxAgeAtMaturity: tenureCfg.maxAgeAtMaturity,
			turnaroundDays: cfg.turnaroundDays,
			roiType: cfg.roiType
		})
	};
}

// ============================================================================
// COMPILE ALL PRODUCTS FOR A LENDER
// ============================================================================

/**
 * Compile ParsedLenderRuleDocuments for a lender across all specified products.
 * Returns one document per product — the evaluation engine loads all of them.
 *
 * @param lenderId     - Kebab-case identifier (e.g., "hdfc-bank")
 * @param lenderName   - Display name (e.g., "HDFC Bank")
 * @param classification - Lender classification
 * @param products     - Which loan products this lender offers
 * @param config       - Policy config (start with getCategoryDefaults(), override specific fields)
 */
export function compileRuleDocs(
	lenderId: string,
	lenderName: string,
	classification: LenderClassification,
	products: LoanProduct[],
	config: CategoryPolicyConfig
): ParsedLenderRuleDocument[] {
	return products.map((product) =>
		compileForProduct(lenderId, lenderName, classification, product, config)
	);
}

/**
 * Compile rule documents for a lender using its LenderMasterEntry data.
 * Convenience wrapper that pulls lenderId, name, classification, and products
 * from the directory entry.
 */
export function compileFromDirectory(
	entry: {
		lenderId: string;
		lenderName: string;
		classification: LenderClassification;
		loanProducts: LoanProduct[];
	},
	config: CategoryPolicyConfig
): ParsedLenderRuleDocument[] {
	return compileRuleDocs(
		entry.lenderId,
		entry.lenderName,
		entry.classification,
		entry.loanProducts,
		config
	);
}
