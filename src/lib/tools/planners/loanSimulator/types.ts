/**
 * Loan Simulation Data Model
 * ═══════════════════════════════════════════════════════════════
 *
 * CORE PRINCIPLE: A loan is a BASE SCHEDULE + MODIFIERS over time.
 *
 * Everything is modeled as a TIMELINE OF EVENTS.
 * The simulation engine processes events month-by-month,
 * applying them in strict priority order to produce
 * a deterministic amortization schedule.
 *
 * This replaces the old separate part-payment and flexible-EMI
 * engines with a unified system that supports:
 * - Step-up/down EMI (%, fixed, event-based, custom)
 * - Part-payments (one-time, recurring, conditional)
 * - Moratoriums (with interest capitalization options)
 * - Interest rate changes (floating rate simulation)
 * - Temporary overrides (increase for N months, then revert)
 * - Hybrid loan structures (interest-only periods, bullet)
 * - Multiple strategies simultaneously
 *
 * Designed for 30-year loans with hundreds of overlapping events.
 * ═══════════════════════════════════════════════════════════════
 */

// ============================================================================
// 1. BASE LOAN CONFIGURATION
// ============================================================================

/** How interest is initially treated */
export type InitialEmiType =
	| 'standard' // Regular reducing-balance EMI from month 1
	| 'interest_only' // Pay only interest for initialInterestOnlyMonths
	| 'step_emi'; // Bank-defined EMI slabs (pre-set step-up loan product)

/** The starting loan parameters */
export interface BaseLoanConfig {
	/** Loan principal in INR */
	principalAmount: number;

	/** Annual interest rate as percentage (e.g., 8.5 for 8.5%) */
	annualInterestRate: number;

	/** Total loan tenure in months */
	tenureMonths: number;

	/** Loan disbursement date in "YYYY-MM" format */
	startDate: string;

	/** How the loan starts */
	emiType: InitialEmiType;

	/** For interest_only: how many months of interest-only payments */
	interestOnlyMonths?: number;

	/** For step_emi: pre-defined EMI values for each slab period */
	stepEmiSlabs?: { fromMonth: number; toMonth: number; emiAmount: number }[];

	/** For bullet loans: % of principal to be paid at maturity */
	bulletPercentage?: number;
}

// ============================================================================
// 2. TIMELINE EVENTS — The heart of the system
// ============================================================================

/**
 * Every modification to the loan is a TimelineEvent.
 * Events are processed in priority order at each month.
 *
 * Events can be:
 * - Point events (happen at a specific month)
 * - Range events (active for a duration)
 * - Recurring events (repeat at intervals)
 * - Conditional events (triggered by thresholds)
 */

/** Priority order (lower number = higher priority, applied first) */
export const EVENT_PRIORITY = {
	moratorium: 1, // Moratorium overrides everything
	rate_change: 2, // Rate change affects all subsequent calculations
	part_payment: 3, // Part-payment reduces principal before EMI calc
	emi_override: 4, // Temporary EMI override
	step_change: 5, // Step-up/down adjustments
	custom_emi: 6 // User-defined EMI for specific months
} as const;

export type EventType =
	| 'moratorium'
	| 'rate_change'
	| 'part_payment'
	| 'recurring_part_payment'
	| 'conditional_part_payment'
	| 'emi_step_up'
	| 'emi_step_down'
	| 'emi_override'
	| 'emi_one_time_jump'
	| 'custom_emi_schedule'
	| 'multi_phase_step';

/** What to do after a part-payment reduces the principal */
export type PartPaymentEffect =
	| 'reduce_tenure' // Keep EMI same, loan ends sooner
	| 'reduce_emi' // Recalculate EMI for remaining tenure
	| 'hybrid'; // Split: X% EMI reduction + rest tenure reduction

/** How interest accumulates during moratorium */
export type MoratoriumInterestTreatment =
	| 'capitalize' // Add accrued interest to principal (grows the loan)
	| 'pay_separately' // Interest paid during moratorium, principal untouched
	| 'waive'; // Bank waives interest (rare, COVID-era schemes)

// ── Individual Event Types ──────────────────────────────────────

/** No EMI for a period. Interest accrues based on treatment. */
export interface MoratoriumEvent {
	type: 'moratorium';
	id: string;
	fromMonth: number; // 1-based month index from loan start
	toMonth: number; // inclusive
	interestTreatment: MoratoriumInterestTreatment;
	label?: string; // "COVID moratorium", "Job transition"
}

/** Interest rate changes at a point in time (floating rate simulation) */
export interface RateChangeEvent {
	type: 'rate_change';
	id: string;
	atMonth: number;
	newAnnualRate: number; // New rate in % (e.g., 9.25)
	recalculateEmi: boolean; // Should EMI be recalculated for remaining tenure?
	label?: string; // "RBI rate hike Q2 2026"
}

/** One-time lump sum part-payment */
export interface PartPaymentEvent {
	type: 'part_payment';
	id: string;
	atMonth: number;
	amount: number;
	effect: PartPaymentEffect;
	hybridEmiReductionPercent?: number; // For 'hybrid': what % of benefit goes to EMI
	label?: string; // "Bonus payment", "Property sale proceeds"
}

/** Recurring part-payment at fixed intervals */
export interface RecurringPartPaymentEvent {
	type: 'recurring_part_payment';
	id: string;
	fromMonth: number;
	toMonth: number; // inclusive
	intervalMonths: number; // e.g., 3 = quarterly, 12 = yearly
	amountType: 'fixed' | 'percent_of_outstanding';
	amount: number; // Fixed INR or percentage (e.g., 2 for 2%)
	effect: PartPaymentEffect;
	hybridEmiReductionPercent?: number;
	label?: string; // "Yearly Diwali payment"
}

/** Part-payment triggered by a condition (e.g., bonus, year-end) */
export interface ConditionalPartPaymentEvent {
	type: 'conditional_part_payment';
	id: string;
	trigger: 'every_year_end' | 'every_half_year' | 'when_outstanding_below';
	triggerValue?: number; // For 'when_outstanding_below': threshold amount
	amount: number;
	effect: PartPaymentEffect;
	hybridEmiReductionPercent?: number;
	label?: string;
}

/**
 * Step-up: EMI increases over time.
 *
 * TWO percentage modes (critical distinction):
 *
 * compounding: false (default, additive)
 *   Each step adds X% of the ORIGINAL base EMI.
 *   Year 1: ₹43,000 → Year 2: +₹2,150 → Year 3: +₹2,150
 *   EMI: 43K → 45.15K → 47.3K → 49.45K (linear growth)
 *
 * compounding: true (incremental, like salary growth)
 *   Each step adds X% of the CURRENT EMI at that point.
 *   Year 1: ₹43,000 → Year 2: ×1.05 → Year 3: ×1.05
 *   EMI: 43K → 45.15K → 47.41K → 49.78K (exponential growth)
 *
 * Over 20 years at 5%:
 *   Additive final EMI: ₹86,000
 *   Compounding final EMI: ₹1,14,065
 *
 * For "increase EMI when salary grows" → use compounding: true.
 * For "add ₹5K every year" → use method: 'fixed_amount'.
 */
export interface EmiStepUpEvent {
	type: 'emi_step_up';
	id: string;
	method: 'percentage' | 'fixed_amount';
	value: number; // e.g., 5 for 5% or 2000 for ₹2000
	intervalMonths: number; // Every N months
	fromMonth: number;
	toMonth?: number; // Optional: stop after this month
	maxEmiCap?: number; // Safety: don't increase beyond this EMI
	/** When true + method 'percentage': X% of CURRENT EMI (compounds).
	 *  When false (default): X% of ORIGINAL base EMI (additive). */
	compounding?: boolean;
	label?: string; // "Annual salary growth step-up"
}

/**
 * Step-down: EMI decreases over time.
 * Same compounding logic as step-up but in reverse.
 */
export interface EmiStepDownEvent {
	type: 'emi_step_down';
	id: string;
	method: 'percentage' | 'fixed_amount';
	value: number;
	intervalMonths: number;
	fromMonth: number;
	toMonth?: number;
	minEmiFloor?: number; // Safety: don't decrease below this
	/** When true + method 'percentage': X% of CURRENT EMI (compounds).
	 *  When false (default): X% of ORIGINAL base EMI (additive). */
	compounding?: boolean;
	label?: string; // "Post-retirement EMI reduction"
}

/** Temporary EMI override for a specific period */
export interface EmiOverrideEvent {
	type: 'emi_override';
	id: string;
	fromMonth: number;
	toMonth: number;
	overrideType: 'fixed_amount' | 'percentage_change';
	value: number; // Fixed EMI amount or % change (e.g., +20 or -15)
	label?: string; // "6-month intensive repayment", "Temporary relief"
}

/** One-time EMI jump (single point change, permanent) */
export interface EmiOneTimeJumpEvent {
	type: 'emi_one_time_jump';
	id: string;
	atMonth: number;
	newEmiAmount: number; // The new permanent EMI from this month onwards
	label?: string; // "Promotion EMI increase"
}

/** User-defined EMI values for specific month ranges */
export interface CustomEmiScheduleEvent {
	type: 'custom_emi_schedule';
	id: string;
	schedule: { fromMonth: number; toMonth: number; emiAmount: number }[];
	label?: string;
}

/**
 * Multi-phase step plan — the most flexible EMI growth strategy.
 *
 * Lets users define sequential phases of EMI changes, each building
 * on the EMI at the END of the previous phase.
 *
 * Example: "5% for 3 years, then ₹15K for 4 years, then 7% for 2 years"
 * → phases: [
 *     { durationMonths: 36, method: 'percentage', value: 5, intervalMonths: 12 },
 *     { durationMonths: 48, method: 'fixed_amount', value: 15000, intervalMonths: 12 },
 *     { durationMonths: 24, method: 'percentage', value: 7, intervalMonths: 12 }
 *   ]
 *
 * Each phase's percentage is ALWAYS compounding on the current EMI at that time.
 * There is no additive mode here — users who pick this want real-world behavior.
 */
export interface MultiPhaseStepEvent {
	type: 'multi_phase_step';
	id: string;
	/** Sequential phases. Each starts where the previous ended. */
	phases: MultiPhaseStep[];
	/** Which month the first phase begins (1-based from loan start) */
	startMonth: number;
	label?: string;
}

/** A single phase within a multi-phase step plan */
export interface MultiPhaseStep {
	/** How long this phase lasts (in months) */
	durationMonths: number;

	/** How often the step fires within this phase (e.g., 12 = yearly) */
	intervalMonths: number;

	/** Increase method */
	method: 'percentage' | 'fixed_amount';

	/** The value: % of current EMI (always compounding) or fixed ₹ amount */
	value: number;

	/** Optional label for this phase */
	phaseLabel?: string;
}

/** Union of all possible events */
export type TimelineEvent =
	| MoratoriumEvent
	| RateChangeEvent
	| PartPaymentEvent
	| RecurringPartPaymentEvent
	| ConditionalPartPaymentEvent
	| EmiStepUpEvent
	| EmiStepDownEvent
	| EmiOverrideEvent
	| EmiOneTimeJumpEvent
	| CustomEmiScheduleEvent
	| MultiPhaseStepEvent;

// ============================================================================
// 3. SIMULATION OUTPUT
// ============================================================================

/** A single month's snapshot in the simulation */
export interface MonthSnapshot {
	/** Month index (1-based from loan start) */
	monthIndex: number;

	/** Calendar date "YYYY-MM" */
	date: string;

	/** Human-readable date "Jan-2026" */
	dateLabel: string;

	/** The EMI paid this month (may be 0 during moratorium) */
	emiPaid: number;

	/** Interest component of this month's payment */
	interestComponent: number;

	/** Principal component of this month's payment */
	principalComponent: number;

	/** Any part-payment made this month */
	partPaymentMade: number;

	/** Total payment this month (EMI + part-payment) */
	totalPayment: number;

	/** Outstanding principal after this month's payments */
	outstandingPrincipal: number;

	/** Annual interest rate active this month */
	activeRate: number;

	/** The "base" EMI before any modifiers (for comparison) */
	baseEmiThisMonth: number;

	/** All events that were active/applied this month */
	activeEvents: { id: string; type: EventType; label?: string }[];

	/** Whether this month was under moratorium */
	isMoratorium: boolean;

	/** Cumulative interest paid up to this month */
	cumulativeInterestPaid: number;

	/** Cumulative principal paid up to this month */
	cumulativePrincipalPaid: number;

	/** Cumulative part-payments made up to this month */
	cumulativePartPayments: number;
}

/** Complete simulation result */
export interface SimulationResult {
	/** The full monthly timeline */
	timeline: MonthSnapshot[];

	/** Summary metrics */
	summary: SimulationSummary;

	/** All events that were processed (with their effective months) */
	processedEvents: ProcessedEvent[];

	/** Any warnings or edge cases encountered */
	warnings: SimulationWarning[];
}

/** High-level summary of the simulation */
export interface SimulationSummary {
	/** Original loan amount */
	originalPrincipal: number;

	/** Original tenure in months */
	originalTenureMonths: number;

	/** Actual tenure (may be shorter due to part-payments/step-ups) */
	actualTenureMonths: number;

	/** Tenure saved (positive = loan ended early) */
	tenureSavedMonths: number;

	/** Total interest paid over the loan */
	totalInterestPaid: number;

	/** Total principal paid (should equal original principal) */
	totalPrincipalPaid: number;

	/** Total part-payments made */
	totalPartPayments: number;

	/** Total of all payments (EMI + part-payments) */
	totalAmountPaid: number;

	/** Average effective EMI */
	averageEmi: number;

	/** Highest EMI in any month */
	peakEmi: number;

	/** Lowest non-zero EMI */
	lowestEmi: number;

	/** Final interest rate (may differ from original if rate changes occurred) */
	finalRate: number;

	/** Interest saved vs. base schedule (no modifications) */
	interestSavedVsBase: number;
}

/** Record of an event being processed */
export interface ProcessedEvent {
	/** The original event */
	event: TimelineEvent;

	/** Which months it affected */
	affectedMonths: number[];

	/** Total financial impact (positive = saved money) */
	financialImpact: number;
}

/** Warning generated during simulation */
export interface SimulationWarning {
	/** Month where the warning occurred */
	atMonth: number;

	/** Warning severity */
	severity: 'info' | 'warning' | 'critical';

	/** Warning code for programmatic handling */
	code: string;

	/** Human-readable message */
	message: string;
}

// ============================================================================
// 4. SCENARIO COMPARISON
// ============================================================================

/** For comparing multiple strategies side by side */
export interface SimulationScenario {
	/** Unique scenario identifier */
	id: string;

	/** Display name: "Base Case", "Aggressive", "Conservative" */
	name: string;

	/** The base loan config */
	baseLoan: BaseLoanConfig;

	/** Events applied in this scenario */
	events: TimelineEvent[];

	/** The computed result (populated after simulation) */
	result?: SimulationResult;
}

/** Comparison output between scenarios */
export interface ScenarioComparison {
	/** The scenarios being compared */
	scenarios: SimulationScenario[];

	/** Which scenario saves the most interest */
	bestForInterest: string;

	/** Which scenario has the lowest peak EMI */
	bestForCashFlow: string;

	/** Which scenario ends the loan soonest */
	bestForTenure: string;

	/** Per-scenario deltas vs. the base (first) scenario */
	deltas: {
		scenarioId: string;
		interestDelta: number; // Negative = saved
		tenureDelta: number; // Negative = shorter
		totalPaymentDelta: number; // Negative = paid less
	}[];
}

// ============================================================================
// 5. USER INTENT — Natural language → Structured events
// ============================================================================

/**
 * Pre-defined intents that map to structured events.
 * The UI presents these as "strategies" the user can pick.
 */
export interface UserIntent {
	/** Display label */
	label: string;

	/** Description */
	description: string;

	/** Icon/emoji */
	icon: string;

	/** The event template this intent creates */
	createEvent: (baseLoan: BaseLoanConfig) => TimelineEvent;
}

// ============================================================================
// 6. EDGE CASE CODES
// ============================================================================

/** Warning codes for deterministic edge-case handling */
export const WARNING_CODES = {
	NEGATIVE_AMORTIZATION: 'NEG_AMORT', // EMI < interest → principal grows
	OVERPAYMENT: 'OVERPAYMENT', // Part-payment exceeds outstanding
	CONFLICTING_EVENTS: 'CONFLICT', // Two events try to set EMI differently
	MORATORIUM_INTEREST_CAPITALIZED: 'MORA_CAP', // Interest added to principal during moratorium
	EMI_BELOW_INTEREST: 'EMI_LOW', // Step-down brought EMI below interest
	LOAN_EXTENDED: 'LOAN_EXTENDED', // Modifications extended beyond original tenure
	RATE_CHANGE_RECALC: 'RATE_RECALC', // EMI recalculated due to rate change
	ROUNDING_ADJUSTMENT: 'ROUNDING', // Final month adjusted for rounding
	MAX_EMI_CAP_HIT: 'MAX_CAP', // Step-up capped at maxEmiCap
	MIN_EMI_FLOOR_HIT: 'MIN_FLOOR', // Step-down floored at minEmiFloor
	PART_PAYMENT_CAPPED: 'PP_CAPPED', // Part-payment reduced to outstanding balance
	BULLET_PAYMENT: 'BULLET' // Bullet principal paid at maturity
} as const;
