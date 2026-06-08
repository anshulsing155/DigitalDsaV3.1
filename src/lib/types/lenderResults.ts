// ============================================================================
// LENDER RESULTS TYPES — Eligibility results displayed to DSA per lender
// ============================================================================

/** Color-coded rating for a metric (maps to emerald/blue/amber/red) */
export type MetricRating = 'excellent' | 'good' | 'average' | 'poor';

/** A single factor explaining why a lender result is what it is */
export interface DecisionFactor {
	id: string;
	label: string;
	/** 'positive' = helped the case, 'negative' = hurt it, 'neutral' = informational */
	impact: 'positive' | 'negative' | 'neutral';
	/** Short explanation (1-2 sentences) */
	description: string;
	/** Optional metric with value and benchmark for comparison */
	metric?: {
		label: string;
		value: string;
		/** e.g. "max 55%" or "min 700" */
		benchmark?: string;
	};
	category: 'income' | 'credit' | 'property' | 'obligation' | 'profile' | 'policy';
}

/** An actionable suggestion to improve the loan result */
export interface ImprovementSuggestion {
	id: string;
	title: string;
	description: string;
	/** Estimated impact if suggestion is followed */
	potential_impact?: {
		metric: 'amount' | 'roi' | 'tenure';
		direction: 'increase' | 'decrease';
		/** Human-readable estimate, e.g. "up to ₹5L more" */
		estimated_value?: string;
	};
	/** How hard is this to implement */
	effort: 'easy' | 'moderate' | 'significant';
}

/** Corporate DSA channel recommendation for a lender */
export interface CorporateDsaRec {
	name: string;
	payout_percent: number;
	/** How this compares to DSA's own channel */
	comparison: 'best' | 'better' | 'same';
	benefits?: string[];
}

// ============================================================================
// DISCOMFORT ZONE TYPES — Identifies what's blocking/limiting eligibility
// ============================================================================

/** Category of discomfort — ability (can they repay?) vs intent (will they repay?) */
export type DiscomfortCategory = 'ability' | 'intent';

/** How severe is the discomfort zone */
export type DiscomfortSeverity = 'blocking' | 'limiting' | 'marginal';

/** A single discomfort zone — quantified gap between current and required */
export interface DiscomfortZone {
	/** Unique zone identifier */
	zone_id: string;
	/** Ability (FOIR, income, age) or Intent (LTV, down payment, CIBIL) */
	category: DiscomfortCategory;
	/** Human-readable label: "FOIR Breach", "LTV Shortfall", etc. */
	label: string;
	/** Blocking = hard stop, Limiting = reduces amount, Marginal = close to limit */
	severity: DiscomfortSeverity;
	/** Current value of the metric */
	current_value: number;
	/** Required/threshold value */
	required_value: number;
	/** Absolute gap (current - required or required - current depending on direction) */
	gap: number;
	/** Unit for human display: "%", "₹", "points", "months", "years" */
	gap_unit: string;
	/** Human-readable explanation with specific numbers */
	explanation: string;
}

/** A calculated solution to resolve a discomfort zone */
export interface QuickSolution {
	/** Unique solution identifier */
	id: string;
	/** Links to the DiscomfortZone this solves */
	zone_id: string;
	/** Short title: "Extend tenure to 25 years" */
	title: string;
	/** Detailed description with calculated impact */
	description: string;
	/** Calculated before/after impact */
	impact: {
		/** Which metric improves */
		metric: string;
		/** Value before applying solution */
		before: number;
		/** Value after applying solution */
		after: number;
		/** Human-readable: "FOIR drops from 58% to 52%" */
		improvement: string;
	};
	/** How hard is this to implement */
	effort: 'easy' | 'moderate' | 'significant';
	/** When can this be done */
	timeframe: 'immediate' | 'weeks' | 'months';
	/** Intent risk signal — e.g., PL for down payment = high risk */
	intent_risk: 'none' | 'low' | 'high';
	/** Explanation of intent risk if applicable */
	intent_risk_note?: string;
}

/** Complete discomfort analysis for a lender evaluation */
export interface DiscomfortAnalysis {
	/** Primary bottlenecks sorted by severity */
	discomfort_zones: DiscomfortZone[];
	/** Calculated solutions (top ranked) */
	quick_solutions: QuickSolution[];
	/** Hints for async deep analysis */
	async_hints: {
		needs_inverse_solve: boolean;
		needs_cross_lender: boolean;
		needs_pl_bridge: boolean;
	};
}

// ============================================================================
// TRANCHE BREAKDOWN TYPES — Phase 4: Loan disbursement structure
// ============================================================================

/** Single tranche in a loan disbursement structure */
export interface LoanTranche {
	category: string;
	label: string;
	amount: number;
	roi: number;
	timing: 'before_registry' | 'at_registry' | 'after_registry';
	timing_label: string;
	/** Who receives the disbursement */
	recipient?: 'seller' | 'buyer';
	/** Condition for release (e.g., "after buyer pays remaining to seller") */
	release_condition?: string;
}

/** Own contribution breakdown for the buyer */
export interface OwnContribution {
	/** Advance/bayana already paid to seller per agreement */
	advance_paid: number;
	/** Amount buyer still needs to pay seller before F&F release */
	remaining_to_seller: number;
	/** Total own money needed: advance_paid + remaining_to_seller */
	total: number;
}

/** Complete tranche breakdown for a lender offer */
export interface TrancheBreakdown {
	structure_type: 'new_loan' | 'balance_transfer';
	tranches: LoanTranche[];
	total_sanctioned: number;
	post_registry_gap: number;
	mitigation_guidance?: string;
	/** true when LCR used a failsafe value (90%) instead of lender-specific rule */
	lcr_is_failsafe?: boolean;
	/** Buyer's own contribution breakdown */
	own_contribution?: OwnContribution;
	/** "Coming Soon" PL cross-sell hint when own contribution exceeds deposit */
	pl_crosssell_hint?: string;
}

/** BT market value appreciation signal */
export interface BTAppreciationSignal {
	current_market_value: number;
	reference_value: number;
	appreciation_percent: number;
	label: string;
	strength: 'strong' | 'moderate' | 'weak' | 'negative';
}

// ============================================================================
// CROSS-SELL TYPES
// ============================================================================

/** Cross-sell opportunity when LTV gap exists */
export interface CrossSellOpp {
	parent_lender: string;
	/** Gap between eligible amount and LTV-capped amount */
	shortfall: number;
	loan_type: 'Personal Loan' | 'Business Loan';
	explanation: string;
	options: Array<{
		lender: string;
		amount: number;
		roi: number;
		emi: number;
	}>;
}

/** Policy field resolved from DB for offer card display */
export interface PolicyDisplayField {
	key: string;
	label: string;
	value: unknown;
	category: string;
}

/**
 * Per-lender guarantor eligibility assessment surfaced on the result card.
 *
 * Mirrors the engine-internal `GuarantorAssessment` in `ruleEngine/types.ts`.
 * Re-declared here (not imported) so this consumer-facing type can live
 * without a back-edge into the engine package; the engine builder validates
 * the two shapes match (any divergence trips type-check).
 *
 * Locked decisions (`GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md`):
 *   - At most ONE guarantor per case
 *   - Default threshold 80% when the lender hasn't set per-lender data
 *   - Two states only — accepted or rejected (no Marginal)
 *   - When rejected, traffic-light demotes GREEN → AMBER
 */
export interface GuarantorResultRow {
	applicant_index: number;
	name: string;
	capacity_percent: number;
	required_percent: number;
	accepted_by_lender: boolean;
	failure_reason?: 'capacity' | 'age_at_maturity' | 'not_accepted';
}

/** Per-lender eligibility result */
export interface LenderResult {
	lender_application_id: string;
	/** Stable slug identifier (e.g. "hdfc-bank") — used for suggestion routing and PMS lookup */
	lender_id: string;
	lender_name: string;
	traffic_light: 'green' | 'amber' | 'red' | 'grey';
	traffic_light_message: string;

	/** Full eligible amount before LTV cap */
	eligible_amount: number;
	/** Amount after LTV cap (secured loans only) */
	ltv_capped_amount?: number;
	/** Final offered amount (min of eligible, LTV-capped, requested) */
	offered_amount: number;
	roi: number;
	emi: number;
	tenure_months: number;
	processing_fee_percent?: number;

	/** Overall result quality */
	rating: MetricRating;
	/** Per-metric ratings for color-coded display */
	metric_ratings: {
		amount: MetricRating;
		roi: MetricRating;
		emi: MetricRating;
		tenure: MetricRating;
	};

	factors: DecisionFactor[];
	suggestions: ImprovementSuggestion[];
	corporate_dsas: CorporateDsaRec[];

	rm_contact?: {
		rm_name: string;
		phone?: string;
		whatsapp?: string;
		designation?: string;
	};

	/** Key derived metrics that shaped this result */
	key_metrics: {
		foir?: number;
		ltv?: number;
		net_income: number;
		cibil: number;
		approval_probability: number;
	};

	/** Discomfort analysis — what's blocking/limiting and how to fix it */
	discomfort?: DiscomfortAnalysis;

	// ── Plot & Equity Loan 3-cap structure (LEND-1 Phase 2, ADR-0021) ──────
	// Populated ONLY when loanVariant === 'Plot & Equity Loan' AND the lender's
	// rule doc supplies all three caps. Phase 4 offer-card UI consumes these
	// for the four-number breakdown (sanction headline / seller payment /
	// buyer cash / buyer net out-of-pocket). The market + registry inputs ride
	// alongside so the UI can show the buyer-margin-on-registered sub-note
	// (registry − seller disbursement, due on registration day).
	/** X% × marketValue — what the lender committed to (headline number) */
	plot_equity_sanction_headline?: number;
	/** What goes to seller's account (the plot-loan file) */
	plot_equity_seller_disbursement?: number;
	/** What comes to buyer as cash from the LAP file */
	plot_equity_buyer_cash_component?: number;
	/** What buyer must bring from own pocket — the DSA conversation number */
	plot_equity_buyer_net_out_of_pocket?: number;
	/** Lender's appraised market value used in the 3-cap math (UI sub-note input). */
	plot_equity_market_value?: number;
	/** Registered / ATS value used in the 3-cap math (UI sub-note input). */
	plot_equity_registry_value?: number;

	/** Phase 4: Tranche breakdown (New Loan with identified property + registryValue < propertyCost) */
	tranche_breakdown?: TrancheBreakdown;
	/** Phase 4: NRI GPA policy string (only when ALL applicants are NRI) */
	nri_gpa_policy?: string;
	/** Phase 4: Registry timeline urgency ('urgent' when WITHIN_1_MONTH) */
	registry_urgency?: 'urgent' | 'normal';
	/** Phase 4: BT appreciation signal (BT cases with marketValue + currentPropertyValue) */
	bt_appreciation?: BTAppreciationSignal;

	/** DB-resolved policy fields for offer card display */
	policy_display?: PolicyDisplayField[];

	/**
	 * Guarantor eligibility assessment for this lender. Present ONLY when the
	 * case has a guarantor (Pitfall: hide the result row entirely otherwise —
	 * the spec UI is "two states or hidden", never "no guarantor" filler text).
	 */
	guarantor?: GuarantorResultRow;

	/** RE-7: Affordability back-calculation (secured loans with propertyIdentified = false) */
	affordability?: {
		/** Mode A: max affordable property assuming sufficient down payment */
		eligibility: {
			maxPropertyCost: number;
			homeLoanAmount: number;
			homeLoanEMI: number;
			ltvPercent: number;
			downPaymentRequired: number;
			downPaymentPercent: number;
			mode: 'eligibility' | 'dp_constrained' | 'bridge';
		} | null;
		/** Mode B: max affordable property constrained by available down payment */
		dpConstrained: {
			maxPropertyCost: number;
			homeLoanAmount: number;
			homeLoanEMI: number;
			ltvPercent: number;
			downPaymentRequired: number;
			downPaymentPercent: number;
			mode: 'eligibility' | 'dp_constrained' | 'bridge';
		} | null;
		/** Mode C: max affordable property with unsecured bridge loan for extra DP */
		bridge: {
			maxPropertyCost: number;
			homeLoanAmount: number;
			homeLoanEMI: number;
			ltvPercent: number;
			downPaymentRequired: number;
			downPaymentPercent: number;
			mode: 'bridge';
			bridgeLoanAmount: number;
			bridgeLoanEMI: number;
			totalEMI: number;
		} | null;
	};

	/** Geographic presence indicator — advisory chip for DSA */
	geo_presence?: {
		/** Chip type: strong_presence / available / limited_presence / verify_availability */
		chip: 'strong_presence' | 'available' | 'limited_presence' | 'verify_availability';
		/** Human-readable reason */
		reason: string;
		/** Whether lender has dominant presence in this area */
		is_stronghold: boolean;
		/** Relevance score 0-1 (used for ranking, not filtering) */
		geo_score: number;
	};

	computed_at: string;
}

/** Summary statistics for the results page header */
export interface ResultsSummary {
	total_lenders: number;
	green_count: number;
	amber_count: number;
	red_count: number;
	best_amount: { value: number; lender: string };
	best_roi: { value: number; lender: string };
	best_emi: { value: number; lender: string };
	requested_amount: number;
	loan_type: string;
}

/** Complete results page data structure */
/** Advisory suggestion when a different applicant would produce better results as primary */
export interface ApplicantSuggestion {
	/** Index of the recommended primary applicant */
	suggestedIndex: number;
	/** Display name of recommended applicant */
	suggestedName: string;
	/** Display name of current applicant at index 0 */
	currentName: string;
	/** Human-readable reason for the suggestion */
	reason: string;
}

export interface LenderResultsData {
	summary: ResultsSummary;
	results: LenderResult[];
	cross_sell: CrossSellOpp[];
	/** Advisory: suggests reordering applicants if a stronger primary exists */
	applicant_suggestion?: ApplicantSuggestion;
	computed_at: string;
}
