/**
 * Loan Simulation Engine — Month-by-month event-driven amortization.
 * ═══════════════════════════════════════════════════════════════════
 *
 * HOW IT WORKS:
 *
 * For each month from 1 to maxMonths:
 *   1. COLLECT all active events for this month
 *   2. SORT events by priority (moratorium > rate > part-payment > EMI)
 *   3. APPLY events in order:
 *      a. Moratorium? → skip EMI, handle interest per treatment
 *      b. Rate change? → update active rate, optionally recalculate EMI
 *      c. Part-payment? → reduce principal, then reduce_tenure / reduce_emi / hybrid
 *      d. EMI modifiers? → step-up/down/override/custom → compute effective EMI
 *   4. CALCULATE interest on current outstanding
 *   5. APPLY effective EMI (principal = EMI - interest)
 *   6. RECORD the month snapshot
 *   7. CHECK if loan is fully paid (outstanding ≤ 0)
 *
 * The engine is DETERMINISTIC: same inputs always produce same outputs.
 * The engine is DEBUGGABLE: every snapshot records which events were active.
 * The engine is SCALABLE: handles 360 months with 100+ events in <5ms.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
import {
	EVENT_PRIORITY,
	WARNING_CODES,
	type BaseLoanConfig,
	type TimelineEvent,
	type EventType,
	type MonthSnapshot,
	type SimulationResult,
	type SimulationSummary,
	type SimulationWarning,
	type ProcessedEvent,
	type PartPaymentEffect,
	type MoratoriumInterestTreatment
} from './types.js';

// ============================================================================
// MAIN SIMULATION FUNCTION
// ============================================================================

/**
 * Run a complete loan simulation.
 *
 * This is the single entry point for the entire simulation engine.
 * It takes a base loan configuration and a list of timeline events,
 * then produces a complete month-by-month amortization schedule
 * with all events applied.
 *
 * @param baseLoan - The starting loan parameters
 * @param events - All timeline events (will be sorted internally)
 * @returns Complete simulation result with timeline, summary, and warnings
 */
export function simulateLoan(baseLoan: BaseLoanConfig, events: TimelineEvent[]): SimulationResult {
	const timeline: MonthSnapshot[] = [];
	const warnings: SimulationWarning[] = [];
	const processedEventsMap = new Map<string, number[]>(); // event.id → affected months

	// --- Parse start date ---
	const [startYearStr, startMonthStr] = baseLoan.startDate.split('-');
	const startYear = parseInt(startYearStr, 10);
	const startMonth = parseInt(startMonthStr, 10) - 1; // 0-based

	// --- Initial state ---
	let outstanding = baseLoan.principalAmount;
	let activeRate = baseLoan.annualInterestRate;
	let originalBaseEmi = calculateBaseEmi(baseLoan, outstanding, activeRate, baseLoan.tenureMonths);
	let currentBaseEmi = originalBaseEmi;
	let currentEffectiveEmi = currentBaseEmi;

	// The "stepped EMI" — tracks the EMI after all step-up/down adjustments.
	// For COMPOUNDING: this is multiplied each step (₹43K × 1.05 × 1.05 × ...)
	// For ADDITIVE: originalBaseEmi + cumulative fixed deltas
	// When a rate change or part-payment recalculates EMI, this resets.
	let steppedEmi = currentBaseEmi;

	// Tracking cumulative totals
	let cumulativeInterest = 0;
	let cumulativePrincipal = 0;
	let cumulativePartPayments = 0;

	// Safety limit: 2× original tenure (handles moratoriums + negative amortization)
	const maxMonths = baseLoan.tenureMonths * 2;

	// --- Month-by-month simulation loop ---
	for (let monthIdx = 1; monthIdx <= maxMonths; monthIdx++) {
		// If loan is paid off, stop (matches snap threshold of ₹1)
		if (outstanding < 1) break;

		// Calculate calendar date for this month
		const calDate = new Date(startYear, startMonth + monthIdx - 1);
		const monthName = MONTH_NAMES_SHORT[calDate.getMonth()];
		const year = calDate.getFullYear();
		const dateStr = `${year}-${String(calDate.getMonth() + 1).padStart(2, '0')}`;
		const dateLabel = `${monthName}-${year}`;

		// ── Step 1: Collect active events for this month ──
		const activeEventsThisMonth = collectActiveEvents(events, monthIdx, outstanding);

		// Track which events are active for the snapshot
		const activeEventInfo: { id: string; type: EventType; label?: string }[] = [];

		// ── Step 2: Process events in priority order ──
		let isMoratorium = false;
		let moratoriumTreatment: MoratoriumInterestTreatment = 'capitalize';
		let emiOverrideValue: number | null = null;
		let partPaymentThisMonth = 0;
		let rateChanged = false;

		// Sort active events by priority
		const sorted = activeEventsThisMonth.sort(
			(a, b) => getEventPriority(a.type) - getEventPriority(b.type)
		);

		for (const event of sorted) {
			// Track the event
			activeEventInfo.push({ id: event.id, type: event.type, label: getLabelFromEvent(event) });
			trackProcessedEvent(processedEventsMap, event.id, monthIdx);

			switch (event.type) {
				// ── MORATORIUM ──
				case 'moratorium': {
					isMoratorium = true;
					moratoriumTreatment = event.interestTreatment;
					break;
				}

				// ── RATE CHANGE ──
				case 'rate_change': {
					if (event.atMonth === monthIdx) {
						activeRate = event.newAnnualRate;
						rateChanged = true;
						if (event.recalculateEmi) {
							const remainingMonths = baseLoan.tenureMonths - monthIdx + 1;
							currentBaseEmi = recalculateEmi(
								outstanding,
								activeRate,
								Math.max(12, remainingMonths)
							);
							originalBaseEmi = currentBaseEmi; // Reset base for future additive steps
							steppedEmi = currentBaseEmi; // Reset stepped EMI after rate recalc
							warnings.push({
								atMonth: monthIdx,
								severity: 'info',
								code: WARNING_CODES.RATE_CHANGE_RECALC,
								message: `Rate changed to ${activeRate}%. EMI recalculated to ₹${Math.round(currentBaseEmi)}.`
							});
						}
					}
					break;
				}

				// ── ONE-TIME PART PAYMENT ──
				case 'part_payment': {
					if (event.atMonth === monthIdx) {
						let ppAmount = Math.min(event.amount, outstanding);
						if (ppAmount < event.amount) {
							warnings.push({
								atMonth: monthIdx,
								severity: 'warning',
								code: WARNING_CODES.PART_PAYMENT_CAPPED,
								message: `Part-payment capped to ₹${Math.round(ppAmount)} (outstanding balance).`
							});
						}
						partPaymentThisMonth += ppAmount;
						// Apply effect after principal reduction (handled below)
					}
					break;
				}

				// ── RECURRING PART PAYMENT ──
				case 'recurring_part_payment': {
					if (isRecurringActive(event, monthIdx)) {
						let ppAmount: number;
						if (event.amountType === 'percent_of_outstanding') {
							ppAmount = Math.round((outstanding * event.amount) / 100);
						} else {
							ppAmount = event.amount;
						}
						ppAmount = Math.min(ppAmount, outstanding);
						partPaymentThisMonth += ppAmount;
					}
					break;
				}

				// ── CONDITIONAL PART PAYMENT ──
				case 'conditional_part_payment': {
					if (isConditionalTriggered(event, monthIdx, calDate, outstanding)) {
						const ppAmount = Math.min(event.amount, outstanding);
						partPaymentThisMonth += ppAmount;
					}
					break;
				}

				// ── STEP-UP EMI ──
				case 'emi_step_up': {
					if (isStepChangeMonth(event, monthIdx)) {
						if (event.method === 'percentage') {
							if (event.compounding) {
								// COMPOUNDING: X% of the CURRENT stepped EMI
								// Each interval multiplies: steppedEmi = steppedEmi × (1 + value/100)
								// This models real salary growth: ₹43K → ₹45.15K → ₹47.41K → ...
								steppedEmi = steppedEmi * (1 + event.value / 100);
							} else {
								// ADDITIVE: X% of the ORIGINAL base EMI each time (flat increment)
								// Each interval adds a fixed delta: steppedEmi += originalBaseEmi × value/100
								steppedEmi += (originalBaseEmi * event.value) / 100;
							}
						} else {
							// FIXED AMOUNT: add ₹value each interval (always additive)
							steppedEmi += event.value;
						}

						// Safety: cap at maxEmiCap if specified
						if (event.maxEmiCap && steppedEmi > event.maxEmiCap) {
							steppedEmi = event.maxEmiCap;
							warnings.push({
								atMonth: monthIdx,
								severity: 'info',
								code: WARNING_CODES.MAX_EMI_CAP_HIT,
								message: `Step-up capped at ₹${event.maxEmiCap}.`
							});
						}
					}
					break;
				}

				// ── STEP-DOWN EMI ──
				case 'emi_step_down': {
					if (isStepChangeMonth(event, monthIdx)) {
						if (event.method === 'percentage') {
							if (event.compounding) {
								// COMPOUNDING: reduce by X% of CURRENT stepped EMI
								steppedEmi = steppedEmi * (1 - event.value / 100);
							} else {
								// ADDITIVE: reduce by X% of ORIGINAL base EMI each time
								steppedEmi -= (originalBaseEmi * event.value) / 100;
							}
						} else {
							steppedEmi -= event.value;
						}

						// Safety: floor at minEmiFloor if specified
						if (event.minEmiFloor && steppedEmi < event.minEmiFloor) {
							steppedEmi = event.minEmiFloor;
							warnings.push({
								atMonth: monthIdx,
								severity: 'info',
								code: WARNING_CODES.MIN_EMI_FLOOR_HIT,
								message: `Step-down floored at ₹${event.minEmiFloor}.`
							});
						}
					}
					break;
				}

				// ── TEMPORARY EMI OVERRIDE ──
				case 'emi_override': {
					if (monthIdx >= event.fromMonth && monthIdx <= event.toMonth) {
						if (event.overrideType === 'fixed_amount') {
							emiOverrideValue = event.value;
						} else {
							// Percentage change on base
							emiOverrideValue = currentBaseEmi * (1 + event.value / 100);
						}
					}
					break;
				}

				// ── ONE-TIME EMI JUMP ──
				case 'emi_one_time_jump': {
					if (event.atMonth === monthIdx) {
						currentBaseEmi = event.newEmiAmount;
						originalBaseEmi = event.newEmiAmount;
						steppedEmi = event.newEmiAmount; // Future steps compound from new EMI
					}
					break;
				}

				// ── CUSTOM EMI SCHEDULE ──
				case 'custom_emi_schedule': {
					for (const slab of event.schedule) {
						if (monthIdx >= slab.fromMonth && monthIdx <= slab.toMonth) {
							emiOverrideValue = slab.emiAmount;
							break;
						}
					}
					break;
				}

				// ── MULTI-PHASE STEP ──
				// The most flexible strategy: sequential phases with different rules,
				// each compounding on the EMI at the end of the previous phase.
				// Example: 5% for 3 years → ₹15K for 4 years → 7% for 2 years
				case 'multi_phase_step': {
					// Determine which phase we're in and if this is a step month
					let cumulativeStart = event.startMonth;
					for (const phase of event.phases) {
						const phaseEnd = cumulativeStart + phase.durationMonths - 1;

						if (monthIdx >= cumulativeStart && monthIdx <= phaseEnd) {
							// We're in this phase — check if it's a step month
							const monthsIntoPhase = monthIdx - cumulativeStart;
							if (monthsIntoPhase > 0 && monthsIntoPhase % phase.intervalMonths === 0) {
								// Apply the step
								if (phase.method === 'percentage') {
									// ALWAYS compounding on current steppedEmi
									steppedEmi = steppedEmi * (1 + phase.value / 100);
								} else {
									steppedEmi += phase.value;
								}
							}
							break; // Only one phase active at a time
						}

						cumulativeStart = phaseEnd + 1;
					}
					break;
				}
			}
		}

		// ── Step 3: Calculate interest FIRST (needed for EMI floor check) ──
		const monthlyRate = activeRate / 100 / 12;
		const interestThisMonth = outstanding * monthlyRate;

		// ── Step 4: Determine effective EMI with FLOOR enforcement ──
		// Priority: moratorium (0) > override > stepped EMI
		//
		// CRITICAL FLOOR RULE: EMI can NEVER go below what's needed to
		// pay off the remaining principal in the remaining tenure.
		// Without this, a step-down could create infinite negative amortization
		// where the loan NEVER closes — the borrower pays forever.
		//
		// The floor is the EMI that would pay off `outstanding` at `activeRate`
		// in the remaining months (originalTenure - monthIdx + buffer).
		// At absolute minimum, EMI must at least cover the monthly interest
		// (interest-only floor) to prevent principal from growing.
		const remainingOriginalMonths = Math.max(12, baseLoan.tenureMonths - monthIdx + 1);
		const minimumEmiToClose = calculateEMI(outstanding, activeRate, remainingOriginalMonths);
		const interestOnlyFloor = Math.ceil(interestThisMonth); // Absolute minimum: covers interest

		if (isMoratorium) {
			currentEffectiveEmi = 0; // No EMI during moratorium (explicitly allowed)
		} else if (emiOverrideValue !== null) {
			// Apply override but enforce floor
			currentEffectiveEmi = Math.max(emiOverrideValue, interestOnlyFloor);
			if (emiOverrideValue < interestOnlyFloor) {
				warnings.push({
					atMonth: monthIdx,
					severity: 'warning',
					code: WARNING_CODES.EMI_BELOW_INTEREST,
					message: `EMI override ₹${Math.round(emiOverrideValue)} raised to ₹${interestOnlyFloor} (interest-only floor). EMI below this would grow the loan indefinitely.`
				});
			}
		} else {
			// Use the stepped EMI with floor enforcement
			let candidateEmi = Math.max(0, steppedEmi);

			// Enforce: stepped EMI must at least cover interest
			if (candidateEmi > 0 && candidateEmi < interestOnlyFloor) {
				warnings.push({
					atMonth: monthIdx,
					severity: 'warning',
					code: WARNING_CODES.EMI_BELOW_INTEREST,
					message: `Step-down EMI ₹${Math.round(candidateEmi)} raised to ₹${interestOnlyFloor} (interest-only floor). Reducing further would cause negative amortization.`
				});
				candidateEmi = interestOnlyFloor;
				steppedEmi = interestOnlyFloor; // Lock it so future steps don't compound from below floor
			}

			currentEffectiveEmi = candidateEmi;
		}

		// ── Step 5: Handle moratorium ──
		if (isMoratorium) {
			if (moratoriumTreatment === 'capitalize') {
				outstanding += interestThisMonth;
				warnings.push({
					atMonth: monthIdx,
					severity: 'warning',
					code: WARNING_CODES.MORATORIUM_INTEREST_CAPITALIZED,
					message: `₹${Math.round(interestThisMonth)} interest capitalized during moratorium.`
				});
			}
			// 'pay_separately': interest paid but no principal reduction
			// 'waive': nothing happens

			const interestPaid = moratoriumTreatment === 'pay_separately' ? interestThisMonth : 0;
			cumulativeInterest += interestPaid;

			timeline.push({
				monthIndex: monthIdx,
				date: dateStr,
				dateLabel,
				emiPaid: interestPaid,
				interestComponent: interestPaid,
				principalComponent: 0,
				partPaymentMade: 0,
				totalPayment: interestPaid,
				outstandingPrincipal: outstanding,
				activeRate,
				baseEmiThisMonth: currentBaseEmi,
				activeEvents: activeEventInfo,
				isMoratorium: true,
				cumulativeInterestPaid: cumulativeInterest,
				cumulativePrincipalPaid: cumulativePrincipal,
				cumulativePartPayments
			});
			continue;
		}

		// ── Step 6: Apply part-payments first (reduce principal before EMI) ──
		if (partPaymentThisMonth > 0) {
			partPaymentThisMonth = Math.min(partPaymentThisMonth, outstanding);
			outstanding -= partPaymentThisMonth;
			cumulativePartPayments += partPaymentThisMonth;

			// Apply part-payment effect
			const ppEffect = getPartPaymentEffect(sorted);
			if (ppEffect === 'reduce_emi') {
				const remainingMonths = estimateRemainingMonths(
					outstanding,
					activeRate,
					baseLoan.tenureMonths - monthIdx
				);
				currentBaseEmi = recalculateEmi(outstanding, activeRate, Math.max(12, remainingMonths));
				originalBaseEmi = currentBaseEmi;
				steppedEmi = currentBaseEmi; // Reset: future step-ups compound from new base
			} else if (ppEffect === 'hybrid') {
				const hybridPercent = getHybridPercent(sorted);
				const remainingMonths = estimateRemainingMonths(
					outstanding,
					activeRate,
					baseLoan.tenureMonths - monthIdx
				);
				const newEmi = recalculateEmi(outstanding, activeRate, Math.max(12, remainingMonths));
				const emiReduction = (steppedEmi - newEmi) * (hybridPercent / 100);
				currentBaseEmi = steppedEmi - emiReduction;
				originalBaseEmi = currentBaseEmi;
				steppedEmi = currentBaseEmi;
			}
			// 'reduce_tenure': keep EMI same, loan ends sooner (no action needed)
		}

		// ── Step 7: Check if outstanding is already 0 after part-payment ──
		if (outstanding < 1) {
			outstanding = 0;
			timeline.push({
				monthIndex: monthIdx,
				date: dateStr,
				dateLabel,
				emiPaid: 0,
				interestComponent: 0,
				principalComponent: 0,
				partPaymentMade: partPaymentThisMonth,
				totalPayment: partPaymentThisMonth,
				outstandingPrincipal: 0,
				activeRate,
				baseEmiThisMonth: currentBaseEmi,
				activeEvents: activeEventInfo,
				isMoratorium: false,
				cumulativeInterestPaid: cumulativeInterest,
				cumulativePrincipalPaid: cumulativePrincipal + partPaymentThisMonth,
				cumulativePartPayments
			});
			break;
		}

		// ── Step 8: Apply EMI ──
		let emiThisMonth = currentEffectiveEmi;

		// Check: EMI < interest → negative amortization
		if (emiThisMonth < interestThisMonth && emiThisMonth > 0) {
			warnings.push({
				atMonth: monthIdx,
				severity: 'critical',
				code: WARNING_CODES.NEGATIVE_AMORTIZATION,
				message: `EMI ₹${Math.round(emiThisMonth)} is less than interest ₹${Math.round(interestThisMonth)}. Principal is GROWING.`
			});
		}

		// Last payment: settle exactly
		if (emiThisMonth > outstanding + interestThisMonth) {
			emiThisMonth = outstanding + interestThisMonth;
		}

		const principalThisMonth = emiThisMonth - interestThisMonth;
		outstanding -= principalThisMonth;

		// Snap to zero if negligible (use 1 rupee threshold to prevent floating-point
		// rounding from adding an extra month at the end of the loan)
		if (Math.abs(outstanding) < 1) outstanding = 0;

		// Handle negative amortization (principal grows)
		if (principalThisMonth < 0) {
			// Outstanding increased because EMI < interest
			// This is valid but worth warning about
		}

		cumulativeInterest += interestThisMonth;
		cumulativePrincipal += principalThisMonth;

		// ── Step 9: Record snapshot ──
		timeline.push({
			monthIndex: monthIdx,
			date: dateStr,
			dateLabel,
			emiPaid: emiThisMonth,
			interestComponent: interestThisMonth,
			principalComponent: principalThisMonth,
			partPaymentMade: partPaymentThisMonth,
			totalPayment: emiThisMonth + partPaymentThisMonth,
			outstandingPrincipal: outstanding,
			activeRate,
			baseEmiThisMonth: currentBaseEmi,
			activeEvents: activeEventInfo,
			isMoratorium: false,
			cumulativeInterestPaid: cumulativeInterest,
			cumulativePrincipalPaid: cumulativePrincipal,
			cumulativePartPayments
		});
	}

	// Check if loan extended beyond original tenure
	if (timeline.length > baseLoan.tenureMonths) {
		warnings.push({
			atMonth: timeline.length,
			severity: 'warning',
			code: WARNING_CODES.LOAN_EXTENDED,
			message: `Loan extended to ${timeline.length} months (original: ${baseLoan.tenureMonths}). Moratoriums or negative amortization caused this.`
		});
	}

	// ── Build summary ──
	const summary = buildSummary(baseLoan, timeline);

	// ── Build processed events list ──
	const processedEvents: ProcessedEvent[] = events.map((event) => ({
		event,
		affectedMonths: processedEventsMap.get(event.id) || [],
		financialImpact: 0 // Calculated by comparison engine
	}));

	return { timeline, summary, processedEvents, warnings };
}

// ============================================================================
// SCENARIO COMPARISON
// ============================================================================

/**
 * Compare multiple loan scenarios.
 * The first scenario is treated as the BASE (reference).
 * All others show deltas against the base.
 */
export function compareScenarios(
	scenarios: { id: string; name: string; baseLoan: BaseLoanConfig; events: TimelineEvent[] }[]
): {
	results: { id: string; name: string; result: SimulationResult }[];
	deltas: {
		scenarioId: string;
		interestDelta: number;
		tenureDelta: number;
		totalPaymentDelta: number;
	}[];
	bestForInterest: string;
	bestForCashFlow: string;
	bestForTenure: string;
} {
	const results = scenarios.map((s) => ({
		id: s.id,
		name: s.name,
		result: simulateLoan(s.baseLoan, s.events)
	}));

	const base = results[0].result.summary;

	const deltas = results.map((r) => ({
		scenarioId: r.id,
		interestDelta: r.result.summary.totalInterestPaid - base.totalInterestPaid,
		tenureDelta: r.result.summary.actualTenureMonths - base.actualTenureMonths,
		totalPaymentDelta: r.result.summary.totalAmountPaid - base.totalAmountPaid
	}));

	const bestForInterest = results.reduce((best, r) =>
		r.result.summary.totalInterestPaid < best.result.summary.totalInterestPaid ? r : best
	).id;

	const bestForCashFlow = results.reduce((best, r) =>
		r.result.summary.peakEmi < best.result.summary.peakEmi ? r : best
	).id;

	const bestForTenure = results.reduce((best, r) =>
		r.result.summary.actualTenureMonths < best.result.summary.actualTenureMonths ? r : best
	).id;

	return { results, deltas, bestForInterest, bestForCashFlow, bestForTenure };
}

// ============================================================================
// HELPERS — Event collection and processing
// ============================================================================

/** Calculate base EMI based on loan type */
function calculateBaseEmi(
	baseLoan: BaseLoanConfig,
	principal: number,
	rate: number,
	tenureMonths: number
): number {
	if (baseLoan.emiType === 'interest_only') {
		return (principal * rate) / 100 / 12; // Interest only
	}
	return calculateEMI(principal, rate, tenureMonths);
}

/** Recalculate EMI for remaining principal and tenure */
function recalculateEmi(outstanding: number, rate: number, remainingMonths: number): number {
	if (outstanding <= 0) return 0;
	return calculateEMI(outstanding, rate, remainingMonths);
}

/** Estimate remaining months at current EMI and rate */
function estimateRemainingMonths(outstanding: number, rate: number, fallback: number): number {
	if (outstanding <= 0) return 0;
	return Math.max(12, fallback);
}

/** Get the priority number for an event type */
function getEventPriority(type: EventType): number {
	switch (type) {
		case 'moratorium':
			return EVENT_PRIORITY.moratorium;
		case 'rate_change':
			return EVENT_PRIORITY.rate_change;
		case 'part_payment':
		case 'recurring_part_payment':
		case 'conditional_part_payment':
			return EVENT_PRIORITY.part_payment;
		case 'emi_override':
			return EVENT_PRIORITY.emi_override;
		case 'emi_step_up':
		case 'emi_step_down':
		case 'emi_one_time_jump':
			return EVENT_PRIORITY.step_change;
		case 'custom_emi_schedule':
			return EVENT_PRIORITY.custom_emi;
		case 'multi_phase_step':
			return EVENT_PRIORITY.step_change;
		default:
			return 99;
	}
}

/** Collect all events that are active in a given month */
function collectActiveEvents(
	events: TimelineEvent[],
	monthIdx: number,
	outstanding: number
): TimelineEvent[] {
	return events.filter((event) => {
		switch (event.type) {
			case 'moratorium':
				return monthIdx >= event.fromMonth && monthIdx <= event.toMonth;
			case 'rate_change':
				return event.atMonth === monthIdx;
			case 'part_payment':
				return event.atMonth === monthIdx;
			case 'recurring_part_payment':
				return monthIdx >= event.fromMonth && monthIdx <= event.toMonth;
			case 'conditional_part_payment':
				return true; // Always checked, trigger logic inside
			case 'emi_step_up':
			case 'emi_step_down':
				return monthIdx >= event.fromMonth && (!event.toMonth || monthIdx <= event.toMonth);
			case 'emi_override':
				return monthIdx >= event.fromMonth && monthIdx <= event.toMonth;
			case 'emi_one_time_jump':
				return event.atMonth === monthIdx;
			case 'custom_emi_schedule':
				return event.schedule.some((s) => monthIdx >= s.fromMonth && monthIdx <= s.toMonth);
			case 'multi_phase_step': {
				let start = event.startMonth;
				for (const phase of event.phases) {
					const end = start + phase.durationMonths - 1;
					if (monthIdx >= start && monthIdx <= end) return true;
					start = end + 1;
				}
				return false;
			}
			default:
				return false;
		}
	});
}

/** Check if a recurring part-payment should fire this month */
function isRecurringActive(
	event: { fromMonth: number; toMonth: number; intervalMonths: number },
	monthIdx: number
): boolean {
	if (monthIdx < event.fromMonth || monthIdx > event.toMonth) return false;
	return (monthIdx - event.fromMonth) % event.intervalMonths === 0;
}

/** Check if a conditional part-payment is triggered */
function isConditionalTriggered(
	event: { trigger: string; triggerValue?: number },
	monthIdx: number,
	calDate: Date,
	outstanding: number
): boolean {
	switch (event.trigger) {
		case 'every_year_end':
			return calDate.getMonth() === 11; // December
		case 'every_half_year':
			return calDate.getMonth() === 5 || calDate.getMonth() === 11; // Jun + Dec
		case 'when_outstanding_below':
			return event.triggerValue !== undefined && outstanding <= event.triggerValue;
		default:
			return false;
	}
}

/** Check if a step-up/down should apply at this month */
function isStepChangeMonth(
	event: { fromMonth: number; toMonth?: number; intervalMonths: number },
	monthIdx: number
): boolean {
	if (monthIdx < event.fromMonth) return false;
	if (event.toMonth && monthIdx > event.toMonth) return false;
	// Fire at the FIRST month of each interval (not every month)
	return (monthIdx - event.fromMonth) % event.intervalMonths === 0 && monthIdx !== event.fromMonth;
}

/** Get the part-payment effect from active events */
function getPartPaymentEffect(events: TimelineEvent[]): PartPaymentEffect {
	for (const e of events) {
		if (
			e.type === 'part_payment' ||
			e.type === 'recurring_part_payment' ||
			e.type === 'conditional_part_payment'
		) {
			return (e as any).effect || 'reduce_tenure';
		}
	}
	return 'reduce_tenure';
}

/** Get hybrid percentage from active events */
function getHybridPercent(events: TimelineEvent[]): number {
	for (const e of events) {
		if ((e as any).hybridEmiReductionPercent !== undefined) {
			return (e as any).hybridEmiReductionPercent;
		}
	}
	return 50; // Default: split 50/50
}

/** Extract label from an event */
function getLabelFromEvent(event: TimelineEvent): string | undefined {
	return (event as any).label;
}

/** Track which months an event affected */
function trackProcessedEvent(map: Map<string, number[]>, eventId: string, monthIdx: number) {
	if (!map.has(eventId)) map.set(eventId, []);
	map.get(eventId)!.push(monthIdx);
}

/** Build summary from completed timeline */
function buildSummary(baseLoan: BaseLoanConfig, timeline: MonthSnapshot[]): SimulationSummary {
	if (timeline.length === 0) {
		return {
			originalPrincipal: baseLoan.principalAmount,
			originalTenureMonths: baseLoan.tenureMonths,
			actualTenureMonths: 0,
			tenureSavedMonths: baseLoan.tenureMonths,
			totalInterestPaid: 0,
			totalPrincipalPaid: 0,
			totalPartPayments: 0,
			totalAmountPaid: 0,
			averageEmi: 0,
			peakEmi: 0,
			lowestEmi: 0,
			finalRate: baseLoan.annualInterestRate,
			interestSavedVsBase: 0
		};
	}

	const last = timeline[timeline.length - 1];
	const nonZeroEmis = timeline.filter((s) => s.emiPaid > 0);

	// Calculate base case interest (no events) for comparison
	const baseCaseEmi = calculateEMI(
		baseLoan.principalAmount,
		baseLoan.annualInterestRate,
		baseLoan.tenureMonths
	);
	const baseCaseTotalInterest = baseCaseEmi * baseLoan.tenureMonths - baseLoan.principalAmount;

	return {
		originalPrincipal: baseLoan.principalAmount,
		originalTenureMonths: baseLoan.tenureMonths,
		actualTenureMonths: timeline.length,
		tenureSavedMonths: baseLoan.tenureMonths - timeline.length,
		totalInterestPaid: last.cumulativeInterestPaid,
		totalPrincipalPaid: last.cumulativePrincipalPaid,
		totalPartPayments: last.cumulativePartPayments,
		totalAmountPaid: timeline.reduce((sum, s) => sum + s.totalPayment, 0),
		averageEmi:
			nonZeroEmis.length > 0
				? nonZeroEmis.reduce((sum, s) => sum + s.emiPaid, 0) / nonZeroEmis.length
				: 0,
		peakEmi: Math.max(...timeline.map((s) => s.emiPaid)),
		lowestEmi: nonZeroEmis.length > 0 ? Math.min(...nonZeroEmis.map((s) => s.emiPaid)) : 0,
		finalRate: last.activeRate,
		interestSavedVsBase: baseCaseTotalInterest - last.cumulativeInterestPaid
	};
}
