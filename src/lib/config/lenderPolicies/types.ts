/**
 * Lender Policy System — Type Definitions
 * ══════════════════════════════════════════════════════════════════
 * Universal types for the lender policy system.
 * Includes geographic coverage, data source tracking, and
 * the standardized policy format.
 *
 * All data is RM-editable — every value tracks its source
 * so DSAs know what's researched vs assumed vs confirmed.
 * ══════════════════════════════════════════════════════════════════
 */

import type { LenderClassification } from '$lib/types/policyEngine';

// ============================================================================
// 1. INDIAN GEOGRAPHY — Canonical State/UT List
// ============================================================================

/** All 28 states + 8 UTs of India (canonical values matching form data) */
export const ALL_INDIA_STATES = [
	'Andhra Pradesh',
	'Arunachal Pradesh',
	'Assam',
	'Bihar',
	'Chhattisgarh',
	'Goa',
	'Gujarat',
	'Haryana',
	'Himachal Pradesh',
	'Jharkhand',
	'Karnataka',
	'Kerala',
	'Madhya Pradesh',
	'Maharashtra',
	'Manipur',
	'Meghalaya',
	'Mizoram',
	'Nagaland',
	'Odisha',
	'Punjab',
	'Rajasthan',
	'Sikkim',
	'Tamil Nadu',
	'Telangana',
	'Tripura',
	'Uttar Pradesh',
	'Uttarakhand',
	'West Bengal',
	// Union Territories
	'Delhi',
	'Chandigarh',
	'Puducherry',
	'Jammu & Kashmir',
	'Ladakh',
	'Andaman & Nicobar Islands',
	'Dadra & Nagar Haveli and Daman & Diu',
	'Lakshadweep'
] as const;

export type IndianState = (typeof ALL_INDIA_STATES)[number];

// ============================================================================
// 2. GEOGRAPHIC COVERAGE — Per-Lender Presence Data
// ============================================================================

/**
 * How broadly a lender operates across India.
 * Determines the default behavior of the geo filter.
 */
export type CoverageType =
	| 'pan_india' // Present in 25+ states, ubiquitous (SBI, HDFC, ICICI)
	| 'multi_state' // Present in 10-24 states, wide reach
	| 'regional' // Present in 3-9 states, geographic focus
	| 'state_focused' // 1-2 states, strong local dominance
	| 'metro_only'; // Only in select metros/tier-1 cities

/** City tier classification */
export type CityTier = 'metro' | 'tier1' | 'tier2' | 'tier3_rural';

/**
 * Geographic presence data for a lender.
 * Used to pre-filter lenders before evaluation — no point evaluating
 * a lender who doesn't operate in the applicant's area.
 *
 * Editable: When RM confirms actual branch presence, update and set
 * source to 'rm_confirmed'.
 */
export interface LenderGeoCoverage {
	/** How broadly this lender operates */
	coverage: CoverageType;

	/**
	 * States where lender has strongest presence / market dominance.
	 * These states get priority weighting in offer curation.
	 * Example: Bank of Maharashtra → ['Maharashtra', 'Goa']
	 */
	strongholdStates: IndianState[];

	/**
	 * All states where lender has operational branches.
	 * For 'pan_india' lenders, this is ALL_INDIA_STATES minus excludedStates.
	 * For regional lenders, this is the explicit list.
	 */
	activeStates: IndianState[];

	/**
	 * States where lender explicitly does NOT operate.
	 * Only meaningful for 'pan_india' / 'multi_state' lenders.
	 * More maintainable than listing 30+ active states.
	 */
	excludedStates?: IndianState[];

	/**
	 * City tier presence — what size cities does this lender serve?
	 * metro: Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad
	 * tier1: 50+ other major cities (Jaipur, Lucknow, Kochi, etc.)
	 * tier2: District headquarters, smaller cities
	 * tier3_rural: Taluka/tehsil towns, rural branches
	 */
	cityTierPresence: CityTier[];

	/**
	 * Optional: Specific cities where lender has branches.
	 * Only used for 'metro_only' or very focused lenders.
	 * For broad lenders, cityTierPresence is sufficient.
	 */
	activeCities?: string[];

	/**
	 * Optional: Cities where lender has dominant presence.
	 * Useful for offer prioritization (not just filtering).
	 */
	strongholdCities?: string[];

	/**
	 * Approximate total branch count (PAN India).
	 * Useful for gauging lender's ground presence and DSA relevance.
	 */
	branchCount?: number;

	/** Data source for this coverage information */
	source: DataSource;

	/** Notes for RM/admin reference */
	notes?: string;
}

// ============================================================================
// 3. DATA SOURCE TRACKING
// ============================================================================

/**
 * Where a policy value came from — critical for RM editability.
 * When RM provides real data, source changes to 'rm_confirmed'.
 */
export type DataSource =
	| 'website' // From lender's official website
	| 'aggregator' // From BankBazaar/PaisaBazaar/MyLoanCare
	| 'industry_standard' // Based on category norms (PSB/PVT/HFC/NBFC/SFB)
	| 'assumed' // Intelligent assumption, needs verification
	| 'rm_confirmed'; // Confirmed by actual bank RM — highest confidence

/**
 * Wraps any policy value with provenance tracking.
 * Every value in the universal policy format is Sourced<T>.
 */
export interface Sourced<T> {
	value: T;
	source: DataSource;
	/** Confidence score 0.0-1.0 */
	confidence: number;
	/** ISO date string of last verification */
	lastVerified?: string;
	/** Free-text notes — "Confirmed by RM Rajesh, HDFC Pune branch, Mar 2026" */
	notes?: string;
}

// ============================================================================
// 4. LOAN PRODUCT TYPES
// ============================================================================

/** The 6 primary loan products this platform supports */
export type LoanProduct =
	| 'Home Loan'
	| 'Loan Against Property'
	| 'Plot and Construction Loan'
	| 'Personal Loan'
	| 'Business Loan'
	| 'Professional Loan';

export const ALL_LOAN_PRODUCTS: LoanProduct[] = [
	'Home Loan',
	'Loan Against Property',
	'Plot and Construction Loan',
	'Personal Loan',
	'Business Loan',
	'Professional Loan'
];

// ============================================================================
// 4B. PRODUCT NAME MAPPING — Lender-specific names → our types
// ============================================================================

/**
 * Maps a lender's product name to our standard LoanProduct.
 * Example: SBI's "SBI Maxgain Home Loan" → 'Home Loan'
 */
export interface ProductNameMapping {
	/** Lender's official product name */
	lenderProductName: string;
	/** Our standardized loan product type */
	ourProduct: LoanProduct;
	/** Product variant if applicable (New, BT, Top-up, etc.) */
	variant?: string;
	/** Brief description of what makes this variant special */
	description?: string;
}

// ============================================================================
// 4C. EXTENDED POLICY METADATA — Rich data beyond core rules
// ============================================================================

/**
 * Extended policy data that doesn't directly feed into JSON-Logic rules
 * but is valuable for DSA guidance and offer card display.
 */
export interface ExtendedPolicyData {
	/** Base rate type */
	baseRateType?: 'EBLR' | 'RLLR' | 'MCLR' | 'PLR' | 'Fixed';
	/** Base rate value (e.g., 9.15 for EBLR) */
	baseRateValue?: number;
	/** Spread over base rate */
	spread?: number;
	/** Prepayment charges — floating rate */
	prepaymentFloating?: string;
	/** Prepayment charges — fixed rate */
	prepaymentFixed?: string;
	/** BT: minimum vintage of existing loan (months) */
	btMinVintageMonths?: number;
	/** BT: requires foreclosure letter? */
	btRequiresForeclosure?: boolean;
	/** Women borrower discount (basis points) */
	womenBorrowerDiscount?: number;
	/** Special schemes (PMAY, festive offers, etc.) */
	specialSchemes?: string[];
	/** Negative areas / excluded property types */
	negativeAreas?: string[];
	/** Maximum loan amount per product */
	maxLoanAmount?: Partial<Record<LoanProduct, number>>;
	/** Minimum loan amount per product */
	minLoanAmount?: Partial<Record<LoanProduct, number>>;
	/** Login fee (flat amount) */
	loginFee?: number;
	/** Legal/technical valuation fee */
	valuationFee?: string;
	/** Documents required (summary) */
	keyDocuments?: string[];
	/** Stamp duty / MODT charges */
	stampDutyNote?: string;
	/** Any unique rules or conditions */
	specialConditions?: string[];
	/** Source URLs for verification */
	sourceUrls?: string[];
	/** Last researched date */
	lastResearched?: string;
}

// ============================================================================
// 5. LENDER MASTER ENTRY
// ============================================================================

/**
 * Complete lender metadata — extends bankName.ts BankEntry with
 * geographic coverage, product scope, and operational details.
 */
export interface LenderMasterEntry {
	/** Unique kebab-case identifier: "hdfc-bank", "sbi", "bajaj-finserv" */
	lenderId: string;
	/** Display name matching bankName.ts value: "HDFC Bank" */
	lenderName: string;
	/** Lender classification */
	classification: LenderClassification;
	/** Geographic coverage data */
	geoCoverage: LenderGeoCoverage;
	/** Which loan products this lender offers */
	loanProducts: LoanProduct[];
	/** Whether this lender works with DSA channel */
	dsaChannelAvailable: boolean;
	/** Lender's official website */
	website?: string;
	/** City of headquarters */
	headquarters?: string;
	/**
	 * Lender's product names mapped to our standard types.
	 * Empty array = uses our standard names.
	 */
	productNames?: ProductNameMapping[];
	/**
	 * Extended policy data beyond core rules — for DSA guidance and offer cards.
	 * This data is informational, not fed into JSON-Logic evaluation.
	 */
	extendedPolicy?: ExtendedPolicyData;
	/**
	 * Official email domain for RM-lender OTP verification (PMS Phase 0).
	 * e.g. "hdfcbank.com" — RM's bank email must match this domain at onboarding.
	 * Optional: lenders without RM assignment support leave this undefined.
	 */
	officialEmailDomain?: string;
}
