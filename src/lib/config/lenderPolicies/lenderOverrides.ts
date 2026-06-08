/**
 * Lender-Specific Overrides — Tier 1 Policy Customizations
 * ══════════════════════════════════════════════════════════════════
 * Comprehensive, researched policy overrides for 18 Tier 1 lenders.
 * Values sourced from official websites, BankBazaar, PaisaBazaar,
 * MyLoanCare, and lender annual reports (2025-2026 data).
 *
 * Lenders not listed here use pure category defaults from categoryDefaults.ts.
 * When RM provides confirmed data, update values here.
 *
 * Last researched: 2026-03-26
 * ══════════════════════════════════════════════════════════════════
 */

import type { CategoryPolicyConfig } from './categoryDefaults';
import type { ProductNameMapping, ExtendedPolicyData } from './types';

// ============================================================================
// DEEP PARTIAL & MERGE UTILITY
// ============================================================================

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type LenderOverride = DeepPartial<CategoryPolicyConfig>;

/** Full override entry with product names and extended data */
export interface LenderOverrideEntry {
	override: LenderOverride;
	productNames?: ProductNameMapping[];
	extendedPolicy?: ExtendedPolicyData;
}

type Obj = Record<string, unknown>;

export function applyOverride(
	base: CategoryPolicyConfig,
	override: LenderOverride
): CategoryPolicyConfig {
	const result = structuredClone(base);
	deepMerge(result as unknown as Obj, override as unknown as Obj);
	return result;
}

function deepMerge(target: Obj, source: Obj): void {
	for (const key of Object.keys(source)) {
		const srcVal = source[key];
		const tgtVal = target[key];
		if (
			srcVal !== null &&
			typeof srcVal === 'object' &&
			!Array.isArray(srcVal) &&
			tgtVal !== null &&
			typeof tgtVal === 'object' &&
			!Array.isArray(tgtVal)
		) {
			deepMerge(tgtVal as Obj, srcVal as Obj);
		} else {
			target[key] = srcVal;
		}
	}
}

// ============================================================================
// PSB OVERRIDES (5 banks)
// ============================================================================

const SBI: LenderOverrideEntry = {
	override: {
		// SBI: EBLR 8.15%, CIBIL 550+, age 18-70, FOIR 55-65%
		minCibil: 550,
		eligibility: { minAge: 18, maxAge: 70 },
		foir: { highCap: 0.65, highThreshold: 150000, midCap: 0.55, lowThreshold: 50000, lowCap: 0.5 },
		income: {
			professionalHaircut: 20,
			businessHaircut: 30,
			partnershipHaircut: 30,
			directorHaircut: 25,
			pensionHaircut: 0,
			rentalHaircut: 30,
			rentalMaxContrib: 40,
			freelanceHaircut: 40,
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
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 70 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 70 },
			plotLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 70 },
			personalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 65 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 70 },
			professionalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 8.15, standardRate: 8.25, baseRate: 8.45, fallbackRate: 8.65 },
			lap: { premiumRate: 9.2, standardRate: 9.5, baseRate: 9.85, fallbackRate: 10.75 },
			plotLoan: { premiumRate: 9.4, standardRate: 9.5, baseRate: 9.55, fallbackRate: 10.5 },
			personalLoan: {
				premiumRate: 10.05,
				standardRate: 11.75,
				baseRate: 13.5,
				fallbackRate: 15.05
			},
			businessLoan: { premiumRate: 8.0, standardRate: 10.0, baseRate: 11.0, fallbackRate: 12.5 },
			professionalLoan: {
				premiumRate: 10.0,
				standardRate: 11.0,
				baseRate: 12.0,
				fallbackRate: 13.5
			}
		},
		processingFeePercent: {
			homeLoan: 0.35,
			lap: 0.5,
			plotLoan: 0.35,
			personalLoan: 1.0,
			businessLoan: 0.5,
			professionalLoan: 0.75
		},
		turnaroundDays: '10-15 working days',
		roiType: 'Floating (Linked to RLLR/EBLR)',
		cibilDeviationRelax: 600,
		cibilDeviationIncomeThreshold: 150000
	},
	productNames: [
		{ lenderProductName: 'SBI Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'SBI Maxgain Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Maxgain',
			description: 'OD-linked home loan, prepay via savings'
		},
		{
			lenderProductName: 'SBI Flexipay Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Flexipay',
			description: 'Step-up EMI for young borrowers'
		},
		{
			lenderProductName: 'SBI Privilege Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Privilege',
			description: 'For SBI salary account holders'
		},
		{
			lenderProductName: 'SBI Shaurya Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Shaurya',
			description: 'For defense personnel'
		},
		{ lenderProductName: 'SBI NRI Home Loan', ourProduct: 'Home Loan', variant: 'NRI' },
		{ lenderProductName: 'SBI Realty Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'SBI Loan Against Property', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'SBI Xpress Credit (Personal Loan)', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'SBI SME Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'SBI Doctor Plus',
			ourProduct: 'Professional Loan',
			variant: 'Doctor',
			description: 'For medical professionals'
		}
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		baseRateValue: 8.15,
		spread: 0.0,
		prepaymentFloating: 'Nil',
		prepaymentFixed: 'N/A (only floating offered)',
		btMinVintageMonths: 12,
		btRequiresForeclosure: true,
		womenBorrowerDiscount: 5,
		specialSchemes: [
			'PMAY-CLSS subsidy',
			'SBI Festive Offers (Oct-Dec)',
			'SBI Privilege for salary a/c'
		],
		maxLoanAmount: { 'Home Loan': 100000000, 'Personal Loan': 2000000 },
		minLoanAmount: { 'Home Loan': 500000, 'Personal Loan': 100000 },
		loginFee: 0,
		valuationFee: 'As per panel valuer — ₹1,500-5,000',
		specialConditions: [
			'0.05% concession for women borrowers',
			'Additional 0.05% concession for green/energy-efficient homes',
			'No prepayment penalty on floating rate loans',
			'Maxgain: OD facility against home loan — park surplus savings to reduce interest'
		],
		sourceUrls: ['https://sbi.co.in/web/personal-banking/loans/home-loans'],
		lastResearched: '2026-03-26'
	}
};

const PNB: LenderOverrideEntry = {
	override: {
		// PNB: RLLR 8.10%, HL 8.90% for 800+ (>30L), CIBIL 611+
		minCibil: 611,
		eligibility: { minAge: 21, maxAge: 70 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 20, businessHaircut: 30, acceptsAgriculture: true },
		ltv: { maxLcr: 90 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 70 },
			lap: { maxTenureMonths: 240, maxAgeAtMaturity: 70 },
			personalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 8.9, standardRate: 8.95, baseRate: 9.4, fallbackRate: 10.5 },
			lap: { premiumRate: 9.05, standardRate: 9.25, baseRate: 10.0, fallbackRate: 11.0 },
			plotLoan: { premiumRate: 9.05, standardRate: 9.25, baseRate: 9.5, fallbackRate: 10.25 },
			personalLoan: { premiumRate: 10.25, standardRate: 11.0, baseRate: 13.0, fallbackRate: 16.8 },
			businessLoan: { premiumRate: 10.0, standardRate: 11.0, baseRate: 12.0, fallbackRate: 13.5 }
		},
		processingFeePercent: { homeLoan: 0.25, lap: 0.5, personalLoan: 1.0, businessLoan: 0.5 },
		turnaroundDays: '10-15 working days',
		roiType: 'Floating (Linked to RLLR/EBLR)',
		cibilDeviationRelax: 600,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{ lenderProductName: 'PNB Housing Loan', ourProduct: 'Home Loan' },
		{ lenderProductName: 'PNB Makan (Home Loan)', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'PNB Antarim Aawas Rin (Plot Purchase)',
			ourProduct: 'Plot and Construction Loan'
		},
		{ lenderProductName: 'PNB Property Loan', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'PNB Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'PNB SME Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'PNB Gen-Next Housing Finance Scheme',
			ourProduct: 'Home Loan',
			variant: 'Gen-Next',
			description: 'Young borrowers scheme'
		},
		{
			lenderProductName: 'PNB NIRMAAN 2025',
			ourProduct: 'Home Loan',
			variant: 'NIRMAAN',
			description: 'Zero processing fee campaign'
		},
		{
			lenderProductName: 'PNB Max-Saver',
			ourProduct: 'Home Loan',
			variant: 'Max-Saver',
			description: 'OD facility against home loan'
		}
	],
	extendedPolicy: {
		baseRateType: 'RLLR',
		baseRateValue: 8.1,
		prepaymentFloating: 'Nil',
		womenBorrowerDiscount: 0,
		specialSchemes: [
			'PMAY subsidy',
			'PNB NIRMAAN 2025 (zero processing fee)',
			'PNB Pride (govt employees: 8.95% flat)'
		],
		specialConditions: [
			'RLLR 8.10% — rates higher than SBI/BoB',
			'PNB Pride: govt employee concessional rate 8.95% irrespective of CIBIL',
			'CIBIL min 611 (lowest threshold among PSBs)',
			'NRI tenure restricted to 15 years',
			'Min income ₹15K-25K gross monthly',
			'Min work experience 3 years',
			'Defence personnel: no CIBIL check for personal loan'
		],
		sourceUrls: [
			'https://pnb.bank.in/Retail-Advances-interst-rate-on-advances-linked-to-mclr.html'
		],
		lastResearched: '2026-03-26'
	}
};

const BOB: LenderOverrideEntry = {
	override: {
		// BoB: BRLLR 7.90%, HL starts 7.45%, FOIR explicitly 65%, CIBIL 675+
		minCibil: 675,
		eligibility: { minAge: 21, maxAge: 70 },
		foir: { highCap: 0.65, highThreshold: 150000, midCap: 0.55, lowThreshold: 50000, lowCap: 0.5 },
		income: { professionalHaircut: 20, businessHaircut: 30, acceptsAgriculture: true },
		roi: {
			homeLoan: { premiumRate: 7.45, standardRate: 7.7, baseRate: 8.2, fallbackRate: 9.2 },
			lap: { premiumRate: 9.2, standardRate: 9.65, baseRate: 10.5, fallbackRate: 12.0 },
			plotLoan: { premiumRate: 8.5, standardRate: 8.8, baseRate: 9.3, fallbackRate: 10.0 },
			personalLoan: { premiumRate: 10.15, standardRate: 11.4, baseRate: 13.9, fallbackRate: 17.0 },
			businessLoan: { premiumRate: 7.25, standardRate: 9.5, baseRate: 11.0, fallbackRate: 13.5 }
		},
		processingFeePercent: { homeLoan: 0.5, lap: 0.5, personalLoan: 1.0, businessLoan: 0.5 },
		turnaroundDays: '10-15 working days',
		roiType: 'Floating (Linked to RLLR/EBLR)',
		cibilDeviationRelax: 600,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{ lenderProductName: 'Baroda Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'Baroda Advantage Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Advantage',
			description: 'For premium salaried customers'
		},
		{ lenderProductName: 'Baroda Plot Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'Baroda Mortgage Loan', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Baroda Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Baroda MSME Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'Baroda Professional Loan',
			ourProduct: 'Professional Loan',
			description: 'Min ITR ₹2.5L, 3yr experience'
		}
	],
	extendedPolicy: {
		baseRateType: 'RLLR',
		baseRateValue: 7.9,
		spread: 0.25,
		prepaymentFloating: 'Nil',
		womenBorrowerDiscount: 5,
		btMinVintageMonths: 12,
		btRequiresForeclosure: true,
		maxLoanAmount: { 'Home Loan': 200000000 },
		specialSchemes: ['PMAY subsidy', 'Baroda Home Loan Takeover Scheme'],
		specialConditions: [
			'HL starts at 7.45% (BRLLR 7.90%) — among lowest PSB rates',
			'FOIR explicitly stated as max 65% of income',
			'CIBIL slabs: 760+/725-759/675-724 (different from other PSBs)',
			'BT: min 12 EMIs paid, CIBIL 701+, up to ₹20Cr',
			'Risk premium 0.05% (waivable with credit insurance)',
			'Work experience: 2yr salaried, 3yr self-employed'
		],
		sourceUrls: [
			'https://bankofbaroda.bank.in/interest-rate-and-service-charges/retail-loans-interest-rates'
		],
		lastResearched: '2026-03-26'
	}
};

const CANARA: LenderOverrideEntry = {
	override: {
		// Canara: RLLR 8.00%, HL 8.85% for 700+ salaried, CIBIL accepts 500+
		minCibil: 500,
		eligibility: { minAge: 21, maxAge: 70 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 20, businessHaircut: 30, acceptsAgriculture: true },
		roi: {
			homeLoan: { premiumRate: 8.85, standardRate: 9.25, baseRate: 9.75, fallbackRate: 11.0 },
			lap: { premiumRate: 10.05, standardRate: 10.5, baseRate: 11.0, fallbackRate: 12.35 },
			plotLoan: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.0, fallbackRate: 11.0 },
			personalLoan: { premiumRate: 9.25, standardRate: 11.0, baseRate: 13.0, fallbackRate: 15.75 },
			businessLoan: { premiumRate: 9.85, standardRate: 10.9, baseRate: 11.85, fallbackRate: 13.1 }
		},
		processingFeePercent: { homeLoan: 0.5, lap: 0.5, personalLoan: 1.0, businessLoan: 0.5 },
		turnaroundDays: '10-15 working days',
		roiType: 'Floating (Linked to RLLR/EBLR)',
		cibilDeviationRelax: 500,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{ lenderProductName: 'Canara Housing Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'Canara Home Loan Plus',
			ourProduct: 'Home Loan',
			variant: 'Plus',
			description: 'Term loan variant'
		},
		{ lenderProductName: 'Canara Home Loan Secure', ourProduct: 'Home Loan', variant: 'Secure' },
		{
			lenderProductName: 'Canara Home Loan for Women',
			ourProduct: 'Home Loan',
			variant: 'Women',
			description: 'Up to 0.85% concession'
		},
		{
			lenderProductName: 'Housing Loan (Minimal/Nil Income Proof)',
			ourProduct: 'Home Loan',
			variant: 'Minimal Docs',
			description: 'For borrowers with limited documentation'
		},
		{ lenderProductName: 'Canara Site Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'Canara Mortgage', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Canara Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Canara MSME Loan', ourProduct: 'Business Loan' }
	],
	extendedPolicy: {
		baseRateType: 'RLLR',
		baseRateValue: 8.0,
		prepaymentFloating: 'Nil',
		womenBorrowerDiscount: 85,
		specialSchemes: [
			'PMAY',
			'NRI Home Loan (8.65-8.85%, max ₹75L)',
			'Women concession up to 0.85%'
		],
		specialConditions: [
			'CIBIL accepts down to 500 (lowest among all banks)',
			'Women borrowers: up to 0.85% rate concession',
			'Salary account holder concession available',
			'NRI HL: 8.65-8.85%, max ₹75L, up to 30yr',
			'Minimal/nil income proof product available',
			'Min work experience 3 years'
		],
		sourceUrls: ['https://canarabank.com/interest-rate-range-on-loans'],
		lastResearched: '2026-03-26'
	}
};

const UNION: LenderOverrideEntry = {
	override: {
		// Union: EBLR 8.00%, HL 8.35% for 800+, CIBIL 600+, max exit 75
		minCibil: 600,
		eligibility: { minAge: 18, maxAge: 75 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 20, businessHaircut: 30, acceptsAgriculture: true },
		roi: {
			homeLoan: { premiumRate: 8.35, standardRate: 8.5, baseRate: 9.15, fallbackRate: 10.75 },
			lap: { premiumRate: 9.2, standardRate: 9.55, baseRate: 9.95, fallbackRate: 10.65 },
			plotLoan: { premiumRate: 8.75, standardRate: 9.0, baseRate: 9.4, fallbackRate: 10.15 },
			personalLoan: {
				premiumRate: 10.35,
				standardRate: 11.25,
				baseRate: 12.5,
				fallbackRate: 14.45
			},
			businessLoan: { premiumRate: 9.8, standardRate: 10.85, baseRate: 11.8, fallbackRate: 13.0 }
		},
		processingFeePercent: { homeLoan: 0.5, lap: 0.5, personalLoan: 1.0, businessLoan: 0.5 },
		turnaroundDays: '10-15 working days',
		roiType: 'Floating (Linked to RLLR/EBLR)',
		cibilDeviationRelax: 550,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{ lenderProductName: 'Union Home', ourProduct: 'Home Loan' },
		{ lenderProductName: 'Union Awas', ourProduct: 'Home Loan', variant: 'Awas' },
		{
			lenderProductName: 'Union Smart Save',
			ourProduct: 'Home Loan',
			variant: 'Smart Save',
			description: 'OD facility against home loan'
		},
		{ lenderProductName: 'Union Top-Up', ourProduct: 'Home Loan', variant: 'Top-Up' },
		{ lenderProductName: 'Union Mortgage Loan', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Union Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Union MSME Loan', ourProduct: 'Business Loan' }
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		baseRateValue: 8.0,
		prepaymentFloating: 'Nil',
		womenBorrowerDiscount: 5,
		specialSchemes: ['PMAY', 'Women professional PL: up to ₹50L, 7yr tenure'],
		specialConditions: [
			'CIBIL 600+ (some approvals even below 600)',
			'Max exit age 75 (most lenient among PSBs)',
			'Govt employees 750+: 8.35% flat for any quantum',
			'Construction moratorium up to 36 months',
			'Women professionals: PL up to ₹50L at 11.25%, 7yr tenure'
		],
		sourceUrls: ['https://www.unionbankofindia.bank.in/en/details/home-loan-interest-rate'],
		lastResearched: '2026-03-26'
	}
};

// ============================================================================
// PVT BANK OVERRIDES (8 banks)
// ============================================================================

const HDFC_BANK: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.6, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: {
			professionalHaircut: 15,
			businessHaircut: 25,
			partnershipHaircut: 25,
			directorHaircut: 20,
			contractualHaircut: 10,
			freelanceHaircut: 30,
			acceptsAgriculture: false
		},
		ltv: { maxLcr: 90 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			personalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			professionalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 }
		},
		roi: {
			homeLoan: { premiumRate: 7.75, standardRate: 8.5, baseRate: 9.0, fallbackRate: 13.2 },
			lap: { premiumRate: 9.05, standardRate: 10.0, baseRate: 11.5, fallbackRate: 13.5 },
			plotLoan: { premiumRate: 8.5, standardRate: 8.75, baseRate: 9.0, fallbackRate: 9.4 },
			personalLoan: { premiumRate: 9.99, standardRate: 12.0, baseRate: 16.0, fallbackRate: 24.0 },
			businessLoan: { premiumRate: 10.75, standardRate: 14.0, baseRate: 18.0, fallbackRate: 22.5 },
			professionalLoan: {
				premiumRate: 10.75,
				standardRate: 13.0,
				baseRate: 16.0,
				fallbackRate: 20.0
			}
		},
		processingFeePercent: {
			homeLoan: 0.5,
			lap: 1.0,
			personalLoan: 2.5,
			businessLoan: 2.0,
			professionalLoan: 1.5
		},
		turnaroundDays: '7-10 working days',
		cibilDeviationRelax: 650,
		cibilDeviationIncomeThreshold: 200000
	},
	productNames: [
		{
			lenderProductName: 'HDFC Home Loan (ARHL)',
			ourProduct: 'Home Loan',
			description: 'Adjustable rate home loan'
		},
		{
			lenderProductName: 'HDFC TruFixed Home Loan',
			ourProduct: 'Home Loan',
			variant: 'TruFixed',
			description: 'Fixed 2yrs then floating'
		},
		{
			lenderProductName: 'HDFC Reach Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Reach',
			description: 'Affordable housing (EWS/LIG)'
		},
		{
			lenderProductName: 'HDFC Home Extension Loan',
			ourProduct: 'Home Loan',
			variant: 'Extension',
			description: 'Renovation/extension'
		},
		{ lenderProductName: 'HDFC NRI Home Loan', ourProduct: 'Home Loan', variant: 'NRI' },
		{ lenderProductName: 'HDFC Plot Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'HDFC Loan Against Property', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'HDFC Personal Loan', ourProduct: 'Personal Loan' },
		{
			lenderProductName: 'HDFC Xpress Personal Loan',
			ourProduct: 'Personal Loan',
			variant: 'Xpress'
		},
		{ lenderProductName: 'HDFC SmartBiz Business Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'HDFC Professional Loan',
			ourProduct: 'Professional Loan',
			description: 'For doctors, CAs, lawyers, architects'
		}
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		prepaymentFixed: '2% of outstanding',
		btMinVintageMonths: 12,
		btRequiresForeclosure: true,
		womenBorrowerDiscount: 5,
		specialSchemes: ['PMAY-CLSS', 'HDFC Festive Housing Campaign'],
		maxLoanAmount: { 'Home Loan': 100000000, 'Personal Loan': 4000000 },
		loginFee: 3000,
		specialConditions: [
			'0.05% rate concession for women borrowers',
			'Pre-approved home loan offers for salary account holders',
			'Top-up available after 12 EMIs on home loan',
			'NRI: GPA required — eligible: parents, spouse, siblings, children'
		],
		sourceUrls: ['https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan'],
		lastResearched: '2026-03-26'
	}
};

const ICICI_BANK: LenderOverrideEntry = {
	override: {
		minCibil: 650,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.65, highThreshold: 200000, midCap: 0.55, lowThreshold: 75000, lowCap: 0.5 },
		income: {
			professionalHaircut: 10,
			businessHaircut: 20,
			partnershipHaircut: 20,
			directorHaircut: 15,
			contractualHaircut: 10,
			freelanceHaircut: 25,
			acceptsAgriculture: false
		},
		ltv: { maxLcr: 90 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			personalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 60 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			professionalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 60 }
		},
		roi: {
			homeLoan: { premiumRate: 8.75, standardRate: 8.9, baseRate: 9.25, fallbackRate: 9.9 },
			lap: { premiumRate: 9.5, standardRate: 9.75, baseRate: 10.25, fallbackRate: 10.9 },
			plotLoan: { premiumRate: 9.0, standardRate: 9.25, baseRate: 9.65, fallbackRate: 10.35 },
			personalLoan: { premiumRate: 10.75, standardRate: 12.25, baseRate: 14.5, fallbackRate: 16.5 },
			businessLoan: { premiumRate: 11.0, standardRate: 12.75, baseRate: 14.5, fallbackRate: 16.5 },
			professionalLoan: {
				premiumRate: 10.5,
				standardRate: 12.0,
				baseRate: 14.0,
				fallbackRate: 16.0
			}
		},
		processingFeePercent: {
			homeLoan: 0.5,
			lap: 1.0,
			personalLoan: 2.25,
			businessLoan: 1.5,
			professionalLoan: 1.5
		},
		turnaroundDays: '7-10 working days',
		cibilDeviationRelax: 600,
		cibilDeviationIncomeThreshold: 150000
	},
	productNames: [
		{ lenderProductName: 'ICICI Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'ICICI Home Loan Balance Transfer',
			ourProduct: 'Home Loan',
			variant: 'BT'
		},
		{ lenderProductName: 'ICICI NRI Home Loan', ourProduct: 'Home Loan', variant: 'NRI' },
		{ lenderProductName: 'ICICI Plot Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'ICICI Loan Against Property', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'ICICI Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'ICICI Business Loan', ourProduct: 'Business Loan' },
		{ lenderProductName: 'ICICI Professional Loan', ourProduct: 'Professional Loan' }
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		prepaymentFixed: '2% of outstanding',
		btMinVintageMonths: 12,
		btRequiresForeclosure: true,
		womenBorrowerDiscount: 5,
		specialSchemes: ['PMAY-CLSS'],
		specialConditions: [
			'NRI: CIBIL minimum 700 (higher than resident 650)',
			'NRI: GPA required — eligible: parents, spouse, siblings'
		],
		sourceUrls: ['https://www.icicibank.com/personal-banking/loans/home-loan'],
		lastResearched: '2026-03-26'
	}
};

const AXIS_BANK: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.65, highThreshold: 200000, midCap: 0.6, lowThreshold: 75000, lowCap: 0.5 },
		income: {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 5,
			freelanceHaircut: 30
		},
		ltv: { maxLcr: 85 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 240, maxAgeAtMaturity: 65 },
			personalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 65 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 8.0, standardRate: 8.75, baseRate: 9.15, fallbackRate: 11.9 },
			lap: { premiumRate: 9.25, standardRate: 9.75, baseRate: 10.5, fallbackRate: 11.5 },
			plotLoan: { premiumRate: 8.75, standardRate: 8.9, baseRate: 9.1, fallbackRate: 9.19 },
			personalLoan: { premiumRate: 9.99, standardRate: 12.0, baseRate: 16.0, fallbackRate: 22.0 },
			businessLoan: { premiumRate: 12.0, standardRate: 14.0, baseRate: 16.0, fallbackRate: 18.0 }
		},
		processingFeePercent: { homeLoan: 1.0, lap: 1.0, personalLoan: 2.0, businessLoan: 1.5 },
		turnaroundDays: '7-10 working days',
		cibilDeviationRelax: 650,
		cibilDeviationIncomeThreshold: 200000
	},
	productNames: [
		{ lenderProductName: 'Axis Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'Axis Asha Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Asha',
			description: 'Affordable housing (< 28 lacs)'
		},
		{
			lenderProductName: 'Axis Shubh Aarambh Home Loan',
			ourProduct: 'Home Loan',
			variant: 'Shubh Aarambh',
			description: 'First-time home buyers'
		},
		{ lenderProductName: 'Axis Plot Purchase Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'Axis Loan Against Property', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Axis Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Axis Business Loan', ourProduct: 'Business Loan' }
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		prepaymentFixed: '2% of outstanding',
		womenBorrowerDiscount: 5,
		specialSchemes: ['PMAY-CLSS', 'Axis Festive Offer'],
		specialConditions: [
			'Max age at maturity 60 (stricter than peers)',
			'FOIR up to 70% for high-income salaried (most generous)',
			'Asha Home Loan: special rates for < ₹28L property value'
		],
		sourceUrls: ['https://www.axisbank.com/retail/loans/home-loan'],
		lastResearched: '2026-03-26'
	}
};

const KOTAK: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.6, highThreshold: 200000, midCap: 0.5, lowThreshold: 75000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25, freelanceHaircut: 30 },
		tenure: {
			homeLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			personalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 60 },
			professionalLoan: { maxTenureMonths: 72, maxAgeAtMaturity: 60 }
		},
		roi: {
			homeLoan: { premiumRate: 7.7, standardRate: 7.99, baseRate: 8.5, fallbackRate: 9.5 },
			lap: { premiumRate: 9.5, standardRate: 10.25, baseRate: 11.0, fallbackRate: 12.0 },
			personalLoan: { premiumRate: 10.99, standardRate: 14.0, baseRate: 18.0, fallbackRate: 24.0 },
			businessLoan: { premiumRate: 16.0, standardRate: 17.5, baseRate: 18.5, fallbackRate: 19.99 },
			professionalLoan: {
				premiumRate: 15.0,
				standardRate: 17.0,
				baseRate: 19.0,
				fallbackRate: 21.0
			}
		},
		processingFeePercent: {
			homeLoan: 0.5,
			lap: 1.5,
			personalLoan: 5.0,
			businessLoan: 3.0,
			professionalLoan: 2.0
		},
		turnaroundDays: '5-7 working days'
	},
	productNames: [
		{ lenderProductName: 'Kotak Home Loan', ourProduct: 'Home Loan' },
		{ lenderProductName: 'Kotak LAP', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Kotak Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Kotak Business Loan', ourProduct: 'Business Loan' },
		{ lenderProductName: 'Kotak Professional Loan (Doctor/CA)', ourProduct: 'Professional Loan' }
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		maxLoanAmount: { 'Home Loan': 50000000, 'Personal Loan': 4000000 },
		specialConditions: ['Home loan max tenure 20 years (shorter than peers)'],
		sourceUrls: ['https://www.kotak.com/en/personal-banking/loans/home-loan.html'],
		lastResearched: '2026-03-26'
	}
};

const YES_BANK: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.6, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25 },
		roi: {
			homeLoan: { premiumRate: 8.75, standardRate: 9.0, baseRate: 9.5, fallbackRate: 10.25 },
			lap: { premiumRate: 9.75, standardRate: 10.0, baseRate: 10.5, fallbackRate: 11.25 },
			personalLoan: { premiumRate: 10.99, standardRate: 13.5, baseRate: 16.0, fallbackRate: 18.0 },
			professionalLoan: {
				premiumRate: 10.5,
				standardRate: 12.0,
				baseRate: 14.0,
				fallbackRate: 16.5
			}
		},
		processingFeePercent: { homeLoan: 1.0, lap: 1.5, personalLoan: 2.5, professionalLoan: 1.5 },
		turnaroundDays: '7-10 working days'
	},
	productNames: [
		{ lenderProductName: 'Yes Home Loan', ourProduct: 'Home Loan' },
		{ lenderProductName: 'Yes LAP', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Yes Personal Loan', ourProduct: 'Personal Loan' },
		{
			lenderProductName: 'Yes Professional Loan',
			ourProduct: 'Professional Loan',
			description: 'Up to ₹75L for doctors/CAs'
		}
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		specialConditions: ['Professional loans up to ₹75L for select professions'],
		sourceUrls: ['https://www.yesbank.in'],
		lastResearched: '2026-03-26'
	}
};

const INDUSIND: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 23, maxAge: 65 },
		foir: { highCap: 0.6, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25 },
		ltv: { lowLtv: 85, midLtv: 80, highLtv: 75 },
		roi: {
			homeLoan: { premiumRate: 8.25, standardRate: 8.65, baseRate: 9.45, fallbackRate: 10.0 },
			lap: { premiumRate: 8.5, standardRate: 9.5, baseRate: 10.75, fallbackRate: 13.5 },
			personalLoan: { premiumRate: 10.49, standardRate: 14.0, baseRate: 20.0, fallbackRate: 31.5 },
			professionalLoan: {
				premiumRate: 12.0,
				standardRate: 14.0,
				baseRate: 16.0,
				fallbackRate: 18.0
			}
		},
		processingFeePercent: { homeLoan: 0.5, lap: 1.0, personalLoan: 2.5, professionalLoan: 1.5 },
		turnaroundDays: '7-10 working days'
	},
	productNames: [
		{ lenderProductName: 'IndusInd Home Loan', ourProduct: 'Home Loan' },
		{ lenderProductName: 'IndusInd LAP', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'IndusInd Personal Loan', ourProduct: 'Personal Loan' },
		{
			lenderProductName: 'IndusInd Doctor Loan',
			ourProduct: 'Professional Loan',
			variant: 'Doctor',
			description: 'Specialized for medical professionals'
		}
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		specialConditions: [
			'Doctor Loan: specialized product for medical professionals, higher limits'
		],
		sourceUrls: ['https://www.indusind.com'],
		lastResearched: '2026-03-26'
	}
};

const IDFC_FIRST: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 23, maxAge: 58 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 60 },
			personalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 58 },
			professionalLoan: { maxTenureMonths: 84, maxAgeAtMaturity: 60 }
		},
		roi: {
			homeLoan: { premiumRate: 8.85, standardRate: 9.25, baseRate: 9.75, fallbackRate: 10.5 },
			lap: { premiumRate: 9.0, standardRate: 11.0, baseRate: 15.0, fallbackRate: 20.0 },
			personalLoan: { premiumRate: 9.99, standardRate: 12.0, baseRate: 15.0, fallbackRate: 18.0 },
			businessLoan: { premiumRate: 11.0, standardRate: 12.5, baseRate: 14.0, fallbackRate: 16.0 },
			professionalLoan: {
				premiumRate: 11.0,
				standardRate: 11.99,
				baseRate: 13.0,
				fallbackRate: 15.0
			}
		},
		processingFeePercent: {
			homeLoan: 0.5,
			lap: 1.0,
			personalLoan: 1.5,
			businessLoan: 3.0,
			professionalLoan: 1.5
		},
		turnaroundDays: '5-7 working days'
	},
	productNames: [
		{ lenderProductName: 'IDFC FIRST Home Loan', ourProduct: 'Home Loan' },
		{ lenderProductName: 'IDFC FIRST LAP', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'IDFC FIRST Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'IDFC FIRST Business Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'IDFC FIRST Doctor Loan',
			ourProduct: 'Professional Loan',
			variant: 'Doctor',
			description: 'Up to ₹1Cr for doctors'
		},
		{
			lenderProductName: 'IDFC FIRST CA Loan',
			ourProduct: 'Professional Loan',
			variant: 'CA',
			description: 'For chartered accountants'
		}
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		specialConditions: [
			'Doctor Loan up to ₹1Cr, minimal paperwork',
			'CA Loan with special rates for practicing CAs',
			'Max age 58 (stricter than peers)'
		],
		sourceUrls: ['https://www.idfcfirstbank.com'],
		lastResearched: '2026-03-26'
	}
};

const FEDERAL: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 7.3, standardRate: 8.0, baseRate: 8.75, fallbackRate: 9.75 },
			lap: { premiumRate: 9.5, standardRate: 10.5, baseRate: 12.0, fallbackRate: 14.8 },
			personalLoan: { premiumRate: 12.0, standardRate: 14.0, baseRate: 18.0, fallbackRate: 22.5 },
			businessLoan: { premiumRate: 10.5, standardRate: 12.0, baseRate: 14.0, fallbackRate: 16.0 }
		},
		processingFeePercent: { homeLoan: 0.5, lap: 0.75, personalLoan: 2.0, businessLoan: 1.0 },
		turnaroundDays: '7-10 working days'
	},
	productNames: [
		{ lenderProductName: 'Federal Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'Fed Home (NRI)',
			ourProduct: 'Home Loan',
			variant: 'NRI',
			description: 'Strong NRI home loan product (Kerala NRI focus)'
		},
		{ lenderProductName: 'Federal LAP', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'Federal Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Federal Business Loan', ourProduct: 'Business Loan' }
	],
	extendedPolicy: {
		baseRateType: 'EBLR',
		prepaymentFloating: 'Nil',
		specialConditions: ['Strong NRI home loan product — dominant in Kerala NRI segment'],
		sourceUrls: ['https://www.federalbank.co.in'],
		lastResearched: '2026-03-26'
	}
};

// ============================================================================
// NBFC/HFC OVERRIDES (5 lenders)
// ============================================================================

const BAJAJ_FINSERV: LenderOverrideEntry = {
	override: {
		// Two entities: Bajaj Housing Finance (HFC: HL/LAP/Plot) + Bajaj Finance (NBFC: PL/BL/Prof)
		minCibil: 675,
		eligibility: { minAge: 23, maxAge: 70 },
		foir: { highCap: 0.6, highThreshold: 150000, midCap: 0.55, lowThreshold: 50000, lowCap: 0.5 },
		income: {
			professionalHaircut: 15,
			businessHaircut: 30,
			freelanceHaircut: 35,
			acceptsAgriculture: false,
			acceptsInvestment: false
		},
		ltv: { maxLcr: 85 },
		tenure: {
			homeLoan: { maxTenureMonths: 384, maxAgeAtMaturity: 70 }, // 32yr salaried, 25yr prof, 20yr SE
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 70 },
			personalLoan: { maxTenureMonths: 96, maxAgeAtMaturity: 67 },
			businessLoan: { maxTenureMonths: 240, maxAgeAtMaturity: 70 },
			professionalLoan: { maxTenureMonths: 96, maxAgeAtMaturity: 67 }
		},
		roi: {
			homeLoan: { premiumRate: 7.15, standardRate: 7.75, baseRate: 8.5, fallbackRate: 10.25 },
			lap: { premiumRate: 8.45, standardRate: 9.25, baseRate: 10.0, fallbackRate: 11.0 },
			personalLoan: { premiumRate: 11.0, standardRate: 14.0, baseRate: 18.0, fallbackRate: 24.0 },
			businessLoan: { premiumRate: 14.0, standardRate: 17.0, baseRate: 20.0, fallbackRate: 25.0 },
			professionalLoan: {
				premiumRate: 11.0,
				standardRate: 13.0,
				baseRate: 15.0,
				fallbackRate: 18.0
			}
		},
		processingFeePercent: {
			homeLoan: 2.0,
			lap: 2.0,
			personalLoan: 3.0,
			businessLoan: 2.5,
			professionalLoan: 2.0
		},
		turnaroundDays: '3-5 working days',
		cibilDeviationRelax: 625,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{ lenderProductName: 'Bajaj Housing Finance Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'Bajaj Housing Finance Balance Transfer',
			ourProduct: 'Home Loan',
			variant: 'BT'
		},
		{
			lenderProductName: 'Bajaj Housing Finance Top-Up Loan',
			ourProduct: 'Home Loan',
			variant: 'Top-Up'
		},
		{
			lenderProductName: 'Bajaj Housing Finance Plot/Land Loan',
			ourProduct: 'Plot and Construction Loan'
		},
		{ lenderProductName: 'Bajaj Housing Finance LAP', ourProduct: 'Loan Against Property' },
		{
			lenderProductName: 'Bajaj Housing Finance Commercial Property Loan',
			ourProduct: 'Loan Against Property',
			variant: 'Commercial'
		},
		{ lenderProductName: 'Bajaj Finserv Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'Bajaj Finserv Business Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'Bajaj Finserv Doctor Loan',
			ourProduct: 'Professional Loan',
			variant: 'Doctor'
		},
		{
			lenderProductName: 'Bajaj Finserv CA/CS Loan',
			ourProduct: 'Professional Loan',
			variant: 'CA/CS'
		}
	],
	extendedPolicy: {
		baseRateType: 'PLR',
		baseRateValue: 14.95,
		prepaymentFloating: 'Nil for individuals (home loan/LAP floating)',
		prepaymentFixed: 'Up to 4% of outstanding + GST',
		womenBorrowerDiscount: 0,
		specialSchemes: [
			'Bajaj Finserv EMI Card integration',
			'Pre-approved offers on app',
			'48-hour disbursal',
			'Flexi Term & Flexi Hybrid Loan variants'
		],
		maxLoanAmount: {
			'Home Loan': 150000000,
			'Personal Loan': 5500000,
			'Professional Loan': 8000000
		},
		minLoanAmount: { 'Home Loan': 400000 },
		specialConditions: [
			'Two entities: Bajaj Housing Finance (HFC) for secured + Bajaj Finance (NBFC) for unsecured',
			'Home loan tenure varies: 32yr salaried, 25yr professional, 20yr self-employed',
			'HL starts at 7.15% for salaried (most competitive among NBFCs)',
			'CIBIL 725+ ideal for HL, 685+ for PL/BL',
			'Salaried min income: ₹25K/month (₹40K in metros)',
			'Self-employed: 3+ years business vintage, ITR-based',
			'Bajaj EMI Card cross-sell on all products'
		],
		sourceUrls: [
			'https://www.bajajhousingfinance.in/home-loan-interest-rates',
			'https://www.bajajfinserv.in/personal-loan-processing-fees-and-interest-rates',
			'https://www.bajajfinserv.in/doctor-loan-fees-and-charges'
		],
		lastResearched: '2026-03-26'
	}
};

const LIC_HOUSING: LenderOverrideEntry = {
	override: {
		// LIC HFL: Very competitive rates (7.15% for 825+), conservative LTV, women-friendly
		minCibil: 600,
		eligibility: { minAge: 21, maxAge: 80 }, // Griha Varishtha allows up to 80 at maturity
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 0,
			acceptsAgriculture: true
		},
		ltv: {
			lowLtv: 90,
			lowThreshold: 3000000,
			midLtv: 80,
			highThreshold: 7500000,
			highLtv: 75,
			maxLcr: 85
		},
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 70 }, // 30yr salaried, 25yr SE
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 },
			plotLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 7.15, standardRate: 7.35, baseRate: 7.55, fallbackRate: 9.0 },
			lap: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.0, fallbackRate: 11.0 },
			plotLoan: { premiumRate: 8.75, standardRate: 9.25, baseRate: 9.75, fallbackRate: 10.5 }
		},
		processingFeePercent: { homeLoan: 0.25, lap: 0.5, plotLoan: 0.25 },
		turnaroundDays: '10-12 working days',
		cibilDeviationRelax: 550,
		cibilDeviationIncomeThreshold: 100000
	},
	productNames: [
		{
			lenderProductName: 'Griha Prakash',
			ourProduct: 'Home Loan',
			description: 'Standard home loan for salaried/SE/professionals'
		},
		{
			lenderProductName: 'Griha Shobha',
			ourProduct: 'Home Loan',
			variant: 'NRI',
			description: 'NRI home loan'
		},
		{
			lenderProductName: 'Griha Suvidha',
			ourProduct: 'Home Loan',
			variant: 'Banking Surrogate',
			description: 'Cash salary/banking surrogate based (min 70% banking)'
		},
		{
			lenderProductName: 'Griha Suvidha Asha',
			ourProduct: 'Home Loan',
			variant: 'EWS/LIG',
			description: 'Lower income/EWS segment'
		},
		{
			lenderProductName: 'Griha Varishtha',
			ourProduct: 'Home Loan',
			variant: 'Senior Citizen',
			description: 'Pensioners/senior citizens, up to age 80'
		},
		{
			lenderProductName: 'New Griha Lakshmi',
			ourProduct: 'Home Loan',
			variant: 'Women',
			description: 'Women borrowers — zero processing fee, no CIBIL for ≤30L'
		},
		{ lenderProductName: 'Advantage Plus', ourProduct: 'Home Loan', variant: 'Premium' },
		{
			lenderProductName: 'New Face Lift',
			ourProduct: 'Home Loan',
			variant: 'Renovation',
			description: 'Home renovation/extension'
		},
		{
			lenderProductName: 'Griha Bhoomi',
			ourProduct: 'Plot and Construction Loan',
			description: 'Plot purchase loan'
		},
		{ lenderProductName: 'Griha Vikas / New Griha Vikas', ourProduct: 'Loan Against Property' },
		{
			lenderProductName: 'MY Office - LAP',
			ourProduct: 'Loan Against Property',
			variant: 'Commercial',
			description: 'LAP against commercial property'
		},
		{ lenderProductName: 'Loans to Professionals', ourProduct: 'Professional Loan' }
	],
	extendedPolicy: {
		baseRateType: 'PLR',
		prepaymentFloating: 'Nil',
		prepaymentFixed: '2% (external refinance only; self-funded: Nil)',
		womenBorrowerDiscount: 5,
		specialSchemes: [
			'PMAY-CLSS',
			'Griha Lakshmi (women: zero processing fee)',
			'Griha Suvidha (banking surrogate based)'
		],
		maxLoanAmount: { 'Home Loan': 150000000 },
		minLoanAmount: { 'Home Loan': 100000 },
		loginFee: 0,
		valuationFee: 'As per panel — ₹1,500-5,000',
		specialConditions: [
			'HL starts at 7.15% for CIBIL 825+ (most competitive HFC rate)',
			'Women borrowers: ZERO processing fee + no CIBIL required for loans ≤ ₹30L',
			'Griha Suvidha: banking surrogate assessment (cash salary, min 70% banking)',
			'Griha Varishtha: age at maturity up to 80 years (pensioners)',
			'Processing fee capped: ₹15K for ≤₹1Cr, ₹25K for ₹2-5Cr, ₹50K for ₹5-15Cr',
			'PSU-backed trust factor (LIC subsidiary)',
			'Government/PSU employees get faster processing'
		],
		sourceUrls: [
			'https://www.lichousing.com/housing-loan',
			'https://cdn.lichousing.com/2025/09/fees_and_other_charges.pdf'
		],
		lastResearched: '2026-03-26'
	}
};

const PNB_HOUSING: LenderOverrideEntry = {
	override: {
		minCibil: 650,
		eligibility: { minAge: 21, maxAge: 65 },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 15, businessHaircut: 25, freelanceHaircut: 35 },
		tenure: {
			homeLoan: { maxTenureMonths: 360, maxAgeAtMaturity: 65 },
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 65 }
		},
		roi: {
			homeLoan: { premiumRate: 8.5, standardRate: 8.85, baseRate: 9.35, fallbackRate: 10.0 },
			lap: { premiumRate: 9.75, standardRate: 10.25, baseRate: 10.75, fallbackRate: 11.5 },
			plotLoan: { premiumRate: 9.0, standardRate: 9.5, baseRate: 10.0, fallbackRate: 10.75 }
		},
		processingFeePercent: { homeLoan: 0.5, lap: 1.0, plotLoan: 0.5 },
		turnaroundDays: '7-10 working days'
	},
	productNames: [
		{ lenderProductName: 'PNB HFL Home Loan', ourProduct: 'Home Loan' },
		{
			lenderProductName: 'PNB HFL Unnati (Affordable)',
			ourProduct: 'Home Loan',
			variant: 'Affordable'
		},
		{ lenderProductName: 'PNB HFL Plot Purchase Loan', ourProduct: 'Plot and Construction Loan' },
		{ lenderProductName: 'PNB HFL Loan Against Property', ourProduct: 'Loan Against Property' }
	],
	extendedPolicy: {
		baseRateType: 'PLR',
		prepaymentFloating: 'Nil',
		specialConditions: ['Unnati: affordable housing variant with lower rates'],
		sourceUrls: ['https://www.pnbhousing.com'],
		lastResearched: '2026-03-26'
	}
};

const HDB_FINANCIAL: LenderOverrideEntry = {
	override: {
		// HDB does NOT offer Home Loans or Plot Loans — LAP, PL, BL only
		minCibil: 700,
		eligibility: { minAge: 21, maxAge: 65, acceptsNRI: false },
		foir: { highCap: 0.65, highThreshold: 150000, midCap: 0.6, lowThreshold: 50000, lowCap: 0.55 },
		income: {
			professionalHaircut: 20,
			businessHaircut: 30,
			freelanceHaircut: 30,
			acceptsAgriculture: true
		},
		roi: {
			lap: { premiumRate: 8.0, standardRate: 10.0, baseRate: 14.0, fallbackRate: 20.0 },
			personalLoan: { premiumRate: 10.0, standardRate: 14.0, baseRate: 20.0, fallbackRate: 30.0 },
			businessLoan: { premiumRate: 10.0, standardRate: 14.0, baseRate: 20.0, fallbackRate: 30.0 }
		},
		processingFeePercent: { lap: 2.5, personalLoan: 2.5, businessLoan: 2.5 },
		turnaroundDays: '3-5 working days'
	},
	productNames: [
		{ lenderProductName: 'HDB Loan Against Property', ourProduct: 'Loan Against Property' },
		{
			lenderProductName: 'HDB Loan Against Lease Rental',
			ourProduct: 'Loan Against Property',
			variant: 'Lease Rental'
		},
		{ lenderProductName: 'HDB Salaried Personal Loan', ourProduct: 'Personal Loan' },
		{
			lenderProductName: 'HDB Self-Employed Personal Loan',
			ourProduct: 'Personal Loan',
			variant: 'Self-Employed'
		},
		{
			lenderProductName: 'HDB New-to-Credit Loan',
			ourProduct: 'Personal Loan',
			variant: 'NTC',
			description: 'No credit history required'
		},
		{ lenderProductName: 'HDB Enterprise Business Loan (EBL)', ourProduct: 'Business Loan' }
	],
	extendedPolicy: {
		baseRateType: 'PLR',
		baseRateValue: 19.05,
		prepaymentFloating: 'LAP/EBL floating (individual): Nil. PL: 4% foreclosure charge + tax',
		prepaymentFixed: '4% + taxes',
		maxLoanAmount: { 'Loan Against Property': 250000000, 'Personal Loan': 5000000 },
		specialConditions: [
			'HDFC Bank subsidiary — serves informal income segments bank cannot',
			'New-to-Credit product available (no CIBIL history required)',
			'Banking surrogate assessment: HDFC Bank account data + bank statements',
			'Cash income borrowers accepted with bank statement analysis',
			'Very wide rate ranges (10-35%) — case-by-case pricing for subprime',
			'Does NOT offer Home Loans or Plot Loans — only LAP/PL/BL',
			'Decentralized regional credit assessment for Enterprise Lending',
			'Min annual income: ₹1L (metro), ₹75K (non-metro) for BL',
			'AUM split: Enterprise 39%, Asset Finance 38%, Consumer 23%'
		],
		sourceUrls: [
			'https://www.hdbfs.com/customer-services/interest-rates',
			'https://www.paisabazaar.com/hdb/personal-loan/'
		],
		lastResearched: '2026-03-26'
	}
};

const ADITYA_BIRLA: LenderOverrideEntry = {
	override: {
		minCibil: 700,
		eligibility: { minAge: 23, maxAge: 58, acceptsNRI: false },
		foir: { highCap: 0.55, highThreshold: 150000, midCap: 0.5, lowThreshold: 50000, lowCap: 0.45 },
		income: { professionalHaircut: 20, businessHaircut: 30, freelanceHaircut: 35 },
		tenure: {
			lap: { maxTenureMonths: 180, maxAgeAtMaturity: 60 },
			personalLoan: { maxTenureMonths: 60, maxAgeAtMaturity: 58 },
			businessLoan: { maxTenureMonths: 180, maxAgeAtMaturity: 60 }
		},
		roi: {
			lap: { premiumRate: 10.0, standardRate: 10.5, baseRate: 11.25, fallbackRate: 12.5 },
			personalLoan: { premiumRate: 11.0, standardRate: 14.0, baseRate: 18.0, fallbackRate: 22.0 },
			businessLoan: { premiumRate: 11.5, standardRate: 13.5, baseRate: 16.0, fallbackRate: 19.0 }
		},
		processingFeePercent: { lap: 1.5, personalLoan: 3.0, businessLoan: 2.0 },
		turnaroundDays: '3-5 working days'
	},
	productNames: [
		{ lenderProductName: 'ABCL Loan Against Property', ourProduct: 'Loan Against Property' },
		{ lenderProductName: 'ABCL Personal Loan', ourProduct: 'Personal Loan' },
		{ lenderProductName: 'ABCL Business Loan', ourProduct: 'Business Loan' },
		{
			lenderProductName: 'ABCL Professional Loan',
			ourProduct: 'Professional Loan',
			description: 'For doctors, CAs, architects'
		}
	],
	extendedPolicy: {
		baseRateType: 'PLR',
		prepaymentFloating: '2-4%',
		maxLoanAmount: { 'Loan Against Property': 35000000, 'Personal Loan': 4000000 },
		specialConditions: [
			'Max age 58 (stricter than peers)',
			'No NRI lending',
			'Part-prepayment charges apply',
			'Personal loan up to ₹40L (higher than most NBFCs)'
		],
		sourceUrls: ['https://www.adityabirlacapital.com'],
		lastResearched: '2026-03-26'
	}
};

// ============================================================================
// OVERRIDE REGISTRY — lenderId → LenderOverrideEntry
// ============================================================================

/**
 * Registry of all lender-specific overrides.
 * Key must match lenderId from lenderDirectory.ts.
 * Lenders not in this map use pure category defaults.
 *
 * 18 Tier 1 lenders with researched data:
 *   PSBs: SBI, PNB, BoB, Canara, Union
 *   PVTs: HDFC, ICICI, Axis, Kotak, Yes, IndusInd, IDFC First, Federal
 *   NBFCs/HFCs: Bajaj, LIC Housing, PNB Housing, HDB Financial, Aditya Birla
 */
export const LENDER_OVERRIDE_ENTRIES: Record<string, LenderOverrideEntry> = {
	// ── PSBs ──
	sbi: SBI,
	pnb: PNB,
	bob: BOB,
	canara: CANARA,
	union: UNION,
	// ── PVT Banks ──
	'hdfc-bank': HDFC_BANK,
	'icici-bank': ICICI_BANK,
	'axis-bank': AXIS_BANK,
	kotak: KOTAK,
	'yes-bank': YES_BANK,
	indusind: INDUSIND,
	'idfc-first': IDFC_FIRST,
	federal: FEDERAL,
	// ── NBFCs/HFCs ──
	'bajaj-finserv': BAJAJ_FINSERV,
	'lic-housing': LIC_HOUSING,
	'pnb-housing': PNB_HOUSING,
	'hdb-financial': HDB_FINANCIAL,
	'aditya-birla': ADITYA_BIRLA
};

/**
 * Backward-compatible flat override map (just the CategoryPolicyConfig overrides).
 * Used by compileAll.ts — strips out productNames and extendedPolicy.
 */
export const LENDER_OVERRIDES: Record<string, LenderOverride> = Object.fromEntries(
	Object.entries(LENDER_OVERRIDE_ENTRIES).map(([id, entry]) => [id, entry.override])
);
