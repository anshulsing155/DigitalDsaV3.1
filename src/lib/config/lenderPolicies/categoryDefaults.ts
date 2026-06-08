/**
 * Category Defaults — Reasonable industry-standard policy values
 * ══════════════════════════════════════════════════════════════════
 * Per-classification (PSB/PVT/HFC/NBFC/SFB) default policy configs.
 * These provide reasonable starting points for lenders where we don't
 * have specific policy data. All values marked source: 'industry_standard'.
 *
 * When RM provides actual data, the lender-specific override takes
 * precedence and source changes to 'rm_confirmed'.
 *
 * Basis for defaults:
 *   - RBI circulars (LTV norms, NPA norms)
 *   - NHB guidelines (HFC-specific)
 *   - BankBazaar/PaisaBazaar aggregated comparison data
 *   - Industry reports (ICRA, CRISIL rating reports)
 * ══════════════════════════════════════════════════════════════════
 */

import type { LenderClassification } from '$lib/types/policyEngine';
import type {
	EligibilityConfig,
	FoirConfig,
	IncomeConfig,
	LtvConfig,
	ObligationConfig,
	TenureConfig,
	RoiConfig
} from './helpers';

// ============================================================================
// COMPLETE CATEGORY CONFIG — All sections for one classification
// ============================================================================

export interface CategoryPolicyConfig {
	eligibility: EligibilityConfig;
	minCibil: number;
	foir: FoirConfig;
	income: IncomeConfig;
	ltv: LtvConfig; // Used for secured products only
	obligations: ObligationConfig;
	tenure: {
		homeLoan: TenureConfig;
		lap: TenureConfig;
		plotLoan: TenureConfig;
		personalLoan: TenureConfig;
		businessLoan: TenureConfig;
		professionalLoan: TenureConfig;
	};
	roi: {
		homeLoan: RoiConfig;
		lap: RoiConfig;
		plotLoan: RoiConfig;
		personalLoan: RoiConfig;
		businessLoan: RoiConfig;
		professionalLoan: RoiConfig;
	};
	processingFeePercent: {
		homeLoan: number;
		lap: number;
		plotLoan: number;
		personalLoan: number;
		businessLoan: number;
		professionalLoan: number;
	};
	turnaroundDays: string;
	roiType: 'Floating' | 'Fixed' | 'Floating (Linked to RLLR/EBLR)';
	cibilDeviationRelax: number; // e.g., 650 (CIBIL relaxed to this via deviation)
	cibilDeviationIncomeThreshold: number; // Monthly income threshold for deviation
	/** Whose CIBIL to check for the min-CIBIL gate:
	 *  - 'financial_only': Only financially-involved applicants
	 *  - 'all_co_applicants': All co-applicants including property-only (DEFAULT)
	 *  - 'all_including_guarantors': Everyone on the loan including guarantors
	 */
	cibilScope: 'financial_only' | 'all_co_applicants' | 'all_including_guarantors';
}

// ============================================================================
// PSB DEFAULTS — Government Banks
// ============================================================================

const PSB_DEFAULTS: CategoryPolicyConfig = {
	eligibility: {
		minAge: 21,
		maxAge: 65,
		minCibil: 650,
		acceptsNRI: true,
		acceptsCompany: true,
		companyMinVintageYears: 3
	},
	minCibil: 650,
	foir: {
		highCap: 0.55,
		highThreshold: 150000,
		midCap: 0.5,
		lowThreshold: 50000,
		lowCap: 0.45
	},
	income: {
		professionalHaircut: 20,
		businessHaircut: 30,
		partnershipHaircut: 30,
		directorHaircut: 25,
		pensionHaircut: 0,
		rentalHaircut: 30,
		rentalMaxContrib: 40,
		freelanceHaircut: 40,
		agricultureHaircut: 50,
		investmentHaircut: 50,
		contractualHaircut: 15,
		acceptsAgriculture: true,
		acceptsInvestment: true,
		acceptsFreelance: true
	},
	ltv: {
		lowLtv: 90,
		lowThreshold: 3000000,
		midLtv: 80,
		highThreshold: 7500000,
		highLtv: 75,
		maxLcr: 90
	},
	obligations: {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	},
	tenure: {
		homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
		lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		plotLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 65 },
		personalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 },
		businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		professionalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 }
	},
	roi: {
		homeLoan: { premiumRate: 8.25, standardRate: 8.5, baseRate: 8.85, fallbackRate: 9.5 },
		lap: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.0, fallbackRate: 10.75 },
		plotLoan: { premiumRate: 8.75, standardRate: 9.0, baseRate: 9.5, fallbackRate: 10.25 },
		personalLoan: { premiumRate: 10.5, standardRate: 11.5, baseRate: 12.5, fallbackRate: 14.0 },
		businessLoan: { premiumRate: 10.0, standardRate: 11.0, baseRate: 12.0, fallbackRate: 13.5 },
		professionalLoan: {
			premiumRate: 10.25,
			standardRate: 11.25,
			baseRate: 12.25,
			fallbackRate: 13.5
		}
	},
	processingFeePercent: {
		homeLoan: 0.35,
		lap: 0.5,
		plotLoan: 0.35,
		personalLoan: 1.0,
		businessLoan: 0.75,
		professionalLoan: 0.75
	},
	turnaroundDays: '10-15 working days',
	roiType: 'Floating (Linked to RLLR/EBLR)',
	cibilDeviationRelax: 600,
	cibilDeviationIncomeThreshold: 150000,
	cibilScope: 'all_co_applicants'
};

// ============================================================================
// PVT DEFAULTS — Private Banks
// ============================================================================

const PVT_DEFAULTS: CategoryPolicyConfig = {
	eligibility: {
		minAge: 21,
		maxAge: 65,
		minCibil: 700,
		acceptsNRI: true,
		acceptsCompany: true,
		companyMinVintageYears: 3
	},
	minCibil: 700,
	foir: {
		highCap: 0.6,
		highThreshold: 150000,
		midCap: 0.5,
		lowThreshold: 50000,
		lowCap: 0.45
	},
	income: {
		professionalHaircut: 15,
		businessHaircut: 25,
		partnershipHaircut: 25,
		directorHaircut: 20,
		pensionHaircut: 0,
		rentalHaircut: 30,
		rentalMaxContrib: 50,
		freelanceHaircut: 35,
		agricultureHaircut: 50,
		investmentHaircut: 50,
		contractualHaircut: 10,
		acceptsAgriculture: false,
		acceptsInvestment: true,
		acceptsFreelance: true
	},
	ltv: {
		lowLtv: 90,
		lowThreshold: 3000000,
		midLtv: 80,
		highThreshold: 7500000,
		highLtv: 75,
		maxLcr: 90
	},
	obligations: {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	},
	tenure: {
		homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
		lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		plotLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 65 },
		personalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 },
		businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		professionalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 }
	},
	roi: {
		homeLoan: { premiumRate: 8.5, standardRate: 8.75, baseRate: 9.15, fallbackRate: 9.85 },
		lap: { premiumRate: 9.25, standardRate: 9.75, baseRate: 10.25, fallbackRate: 11.0 },
		plotLoan: { premiumRate: 9.0, standardRate: 9.25, baseRate: 9.75, fallbackRate: 10.5 },
		personalLoan: { premiumRate: 10.99, standardRate: 12.0, baseRate: 14.0, fallbackRate: 16.0 },
		businessLoan: { premiumRate: 11.0, standardRate: 12.5, baseRate: 14.0, fallbackRate: 16.0 },
		professionalLoan: { premiumRate: 10.75, standardRate: 12.0, baseRate: 13.5, fallbackRate: 15.5 }
	},
	processingFeePercent: {
		homeLoan: 0.5,
		lap: 0.75,
		plotLoan: 0.5,
		personalLoan: 2.0,
		businessLoan: 1.5,
		professionalLoan: 1.5
	},
	turnaroundDays: '7-10 working days',
	roiType: 'Floating',
	cibilDeviationRelax: 650,
	cibilDeviationIncomeThreshold: 200000,
	cibilScope: 'all_co_applicants'
};

// ============================================================================
// HFC DEFAULTS — Housing Finance Companies
// ============================================================================

const HFC_DEFAULTS: CategoryPolicyConfig = {
	eligibility: {
		minAge: 21,
		maxAge: 65,
		minCibil: 650,
		acceptsNRI: true,
		acceptsCompany: true,
		companyMinVintageYears: 3
	},
	minCibil: 650,
	foir: {
		highCap: 0.55,
		highThreshold: 150000,
		midCap: 0.5,
		lowThreshold: 50000,
		lowCap: 0.45
	},
	income: {
		professionalHaircut: 15,
		businessHaircut: 30,
		partnershipHaircut: 30,
		directorHaircut: 25,
		pensionHaircut: 0,
		rentalHaircut: 30,
		rentalMaxContrib: 40,
		freelanceHaircut: 40,
		agricultureHaircut: 50,
		investmentHaircut: 50,
		contractualHaircut: 10,
		acceptsAgriculture: true,
		acceptsInvestment: true,
		acceptsFreelance: true
	},
	ltv: {
		lowLtv: 90,
		lowThreshold: 3000000,
		midLtv: 80,
		highThreshold: 7500000,
		highLtv: 75,
		maxLcr: 85
	},
	obligations: {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	},
	tenure: {
		homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
		lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		plotLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 65 },
		personalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 60 },
		businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		professionalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 60 }
	},
	roi: {
		homeLoan: { premiumRate: 8.5, standardRate: 8.75, baseRate: 9.25, fallbackRate: 10.0 },
		lap: { premiumRate: 9.5, standardRate: 10.0, baseRate: 10.5, fallbackRate: 11.5 },
		plotLoan: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.0, fallbackRate: 10.75 },
		personalLoan: { premiumRate: 12.0, standardRate: 14.0, baseRate: 16.0, fallbackRate: 18.0 },
		businessLoan: { premiumRate: 11.5, standardRate: 13.0, baseRate: 15.0, fallbackRate: 17.0 },
		professionalLoan: { premiumRate: 11.0, standardRate: 13.0, baseRate: 15.0, fallbackRate: 17.0 }
	},
	processingFeePercent: {
		homeLoan: 0.5,
		lap: 1.0,
		plotLoan: 0.5,
		personalLoan: 2.5,
		businessLoan: 1.5,
		professionalLoan: 1.5
	},
	turnaroundDays: '7-12 working days',
	roiType: 'Floating',
	cibilDeviationRelax: 600,
	cibilDeviationIncomeThreshold: 150000,
	cibilScope: 'all_co_applicants'
};

// ============================================================================
// NBFC DEFAULTS — Non-Banking Financial Companies
// ============================================================================

const NBFC_DEFAULTS: CategoryPolicyConfig = {
	eligibility: {
		minAge: 23,
		maxAge: 65,
		minCibil: 650,
		acceptsNRI: false,
		acceptsCompany: true,
		companyMinVintageYears: 3
	},
	minCibil: 650,
	foir: {
		highCap: 0.6,
		highThreshold: 150000,
		midCap: 0.5,
		lowThreshold: 50000,
		lowCap: 0.45
	},
	income: {
		professionalHaircut: 20,
		businessHaircut: 35,
		partnershipHaircut: 35,
		directorHaircut: 30,
		pensionHaircut: 10,
		rentalHaircut: 30,
		rentalMaxContrib: 40,
		freelanceHaircut: 35,
		agricultureHaircut: 50,
		investmentHaircut: 50,
		contractualHaircut: 15,
		acceptsAgriculture: false,
		acceptsInvestment: false,
		acceptsFreelance: true
	},
	ltv: {
		lowLtv: 85,
		lowThreshold: 3000000,
		midLtv: 75,
		highThreshold: 7500000,
		highLtv: 70,
		maxLcr: 85
	},
	obligations: {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	},
	tenure: {
		homeLoan: { maxTenureMonths: 300, maxAgeAtMaturity: 65 },
		lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		plotLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		personalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 60 },
		businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
		professionalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 60 }
	},
	roi: {
		homeLoan: { premiumRate: 8.75, standardRate: 9.25, baseRate: 9.75, fallbackRate: 10.5 },
		lap: { premiumRate: 10.0, standardRate: 10.75, baseRate: 11.5, fallbackRate: 12.5 },
		plotLoan: { premiumRate: 9.5, standardRate: 10.0, baseRate: 10.75, fallbackRate: 11.5 },
		personalLoan: { premiumRate: 12.0, standardRate: 14.0, baseRate: 17.0, fallbackRate: 20.0 },
		businessLoan: { premiumRate: 12.0, standardRate: 14.0, baseRate: 16.0, fallbackRate: 18.0 },
		professionalLoan: { premiumRate: 11.5, standardRate: 13.5, baseRate: 15.5, fallbackRate: 18.0 }
	},
	processingFeePercent: {
		homeLoan: 1.0,
		lap: 1.5,
		plotLoan: 1.0,
		personalLoan: 2.5,
		businessLoan: 2.0,
		professionalLoan: 2.0
	},
	turnaroundDays: '5-7 working days',
	roiType: 'Floating',
	cibilDeviationRelax: 600,
	cibilDeviationIncomeThreshold: 100000,
	cibilScope: 'all_co_applicants'
};

// ============================================================================
// SFB DEFAULTS — Small Finance Banks
// ============================================================================

const SFB_DEFAULTS: CategoryPolicyConfig = {
	eligibility: {
		minAge: 21,
		maxAge: 60,
		minCibil: 650,
		acceptsNRI: false,
		acceptsCompany: true,
		companyMinVintageYears: 5
	},
	minCibil: 650,
	foir: {
		highCap: 0.5,
		highThreshold: 100000,
		midCap: 0.45,
		lowThreshold: 40000,
		lowCap: 0.4
	},
	income: {
		professionalHaircut: 20,
		businessHaircut: 35,
		partnershipHaircut: 35,
		directorHaircut: 30,
		pensionHaircut: 10,
		rentalHaircut: 40,
		rentalMaxContrib: 30,
		freelanceHaircut: 40,
		agricultureHaircut: 40,
		investmentHaircut: 50,
		contractualHaircut: 20,
		acceptsAgriculture: true,
		acceptsInvestment: false,
		acceptsFreelance: true
	},
	ltv: {
		lowLtv: 80,
		lowThreshold: 2000000,
		midLtv: 75,
		highThreshold: 5000000,
		highLtv: 70,
		maxLcr: 80
	},
	obligations: {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	},
	tenure: {
		homeLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 60 },
		lap: { maxTenureMonths: 120, maxAgeAtMaturity: 60 },
		plotLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 60 },
		personalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 58 },
		businessLoan: { maxTenureMonths: 120, maxAgeAtMaturity: 60 },
		professionalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 58 }
	},
	roi: {
		homeLoan: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.25, fallbackRate: 11.0 },
		lap: { premiumRate: 10.5, standardRate: 11.25, baseRate: 12.0, fallbackRate: 13.0 },
		plotLoan: { premiumRate: 9.75, standardRate: 10.25, baseRate: 11.0, fallbackRate: 12.0 },
		personalLoan: { premiumRate: 13.0, standardRate: 15.0, baseRate: 18.0, fallbackRate: 22.0 },
		businessLoan: { premiumRate: 13.0, standardRate: 15.0, baseRate: 17.0, fallbackRate: 20.0 },
		professionalLoan: { premiumRate: 12.5, standardRate: 14.5, baseRate: 17.0, fallbackRate: 20.0 }
	},
	processingFeePercent: {
		homeLoan: 1.0,
		lap: 1.5,
		plotLoan: 1.0,
		personalLoan: 3.0,
		businessLoan: 2.0,
		professionalLoan: 2.0
	},
	turnaroundDays: '5-10 working days',
	roiType: 'Floating',
	cibilDeviationRelax: 600,
	cibilDeviationIncomeThreshold: 75000,
	cibilScope: 'all_co_applicants'
};

// ============================================================================
// REGISTRY — Look up defaults by classification
// ============================================================================

export const CATEGORY_DEFAULTS: Record<LenderClassification, CategoryPolicyConfig> = {
	GOV: PSB_DEFAULTS,
	PVT: PVT_DEFAULTS,
	HFC: HFC_DEFAULTS,
	NBFC: NBFC_DEFAULTS,
	SFB: SFB_DEFAULTS
};

/**
 * Get category defaults for a classification.
 * Returns a deep copy so callers can safely mutate for lender-specific overrides.
 */
export function getCategoryDefaults(classification: LenderClassification): CategoryPolicyConfig {
	return structuredClone(CATEGORY_DEFAULTS[classification]);
}
