<script lang="ts">
	/**
	 * LoanPlanner — Full-width stacked layout with plannerMode filtering.
	 *
	 * Layout (top to bottom, full width):
	 *   1. Loan Details — compact horizontal strip
	 *   2. Custom Event Builder — main input area with pill tabs
	 *   3. Active Events — horizontal chips
	 *   4. Impact Summary + Comparison Table — side by side
	 *   5. Graph — full width, prominent
	 *   6. Amortization Schedule — collapsible
	 */

	import {
		TrendingUp,
		TrendingDown,
		Banknote,
		Calendar,
		Percent,
		Plus,
		Trash2,
		Zap,
		PiggyBank,
		Timer,
		Rocket,
		IndianRupee,
		Calculator,
		Layers,
		Target,
		Lightbulb,
		Pencil,
		Download
	} from '$lib/utils/iconRegistry';
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import MonthYearInput from '$lib/components/tools/shared/MonthYearInput.svelte';
	import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import ComparisonSummary from '$lib/components/tools/shared/ComparisonSummary.svelte';
	import AmortizationTable from '$lib/components/tools/shared/AmortizationTable.svelte';
	import {
		buildBalanceComparisonLine,
		buildPrincipalInterestDoughnut
	} from '$lib/components/tools/charts/chartConfigs.js';
	import {
		simulateLoan,
		STRATEGY_INTENTS,
		type BaseLoanConfig,
		type TimelineEvent,
		type SimulationResult,
		type MultiPhaseStep
	} from '$lib/tools/planners/loanSimulator/index.js';
	import { groupScheduleByCalendarYear } from '$lib/tools/calculators/emiEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';
	import type { MonthlyPaymentEntry } from '$lib/tools/types.js';

	// =========================================================================
	// PROPS
	// =========================================================================

	interface Props {
		config?: CalculatorConfig;
		/** Controls which event tabs are shown */
		plannerMode?: 'part-payment' | 'emi' | 'all';
	}

	let { config = DASHBOARD_CONFIG, plannerMode = 'all' }: Props = $props();

	// =========================================================================
	// BASE LOAN INPUTS
	// =========================================================================

	let loanAmount: number = $state(50_00_000);
	let interestRate: number = $state(8.5);
	let tenureMonths: number = $state(240);
	let tenureYears: number = $derived(Math.round(tenureMonths / 12));

	const now = new Date();
	let loanStartYear: number = $state(now.getFullYear());
	let loanStartMonth: number = $state(now.getMonth() + 1);

	// Loan start as monthIndex from a fixed reference (for MonthYearInput binding)
	// Reference point: 40 years ago from now
	const startDateRefYear = now.getFullYear() - 40;
	let loanStartMonthIndex = $state((now.getFullYear() - startDateRefYear) * 12 + now.getMonth());

	// Sync loanStartYear/Month when user picks a date
	$effect(() => {
		const date = new Date(startDateRefYear, loanStartMonthIndex);
		const newYear = date.getFullYear();
		const newMonth = date.getMonth() + 1;
		if (newYear !== loanStartYear || newMonth !== loanStartMonth) {
			loanStartYear = newYear;
			loanStartMonth = newMonth;
		}
	});
	let loanStartDate: string = $derived(
		`${loanStartYear}-${String(loanStartMonth).padStart(2, '0')}`
	);

	// =========================================================================
	// MONTH-YEAR ↔ MONTH INDEX CONVERSION
	// =========================================================================

	/** Convert monthIndex (0-based from loan start) to "MM-YYYY" string for DatePicker */
	function monthIndexToDateStr(idx: number | null): string {
		if (idx == null || idx < 0) return '';
		const date = new Date(loanStartYear, loanStartMonth - 1 + idx);
		return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
	}

	/** Convert "MM-YYYY" string from DatePicker to monthIndex (0-based from loan start) */
	function dateStrToMonthIndex(dateStr: string): number {
		if (!dateStr) return 0;
		const [monthStr, yearStr] = dateStr.split('-');
		const month = parseInt(monthStr, 10);
		const year = parseInt(yearStr, 10);
		if (isNaN(month) || isNaN(year)) return 0;
		return (year - loanStartYear) * 12 + (month - loanStartMonth);
	}

	/** Convert monthIndex to human-readable label like "Apr-2027" */
	function monthIndexToLabel(idx: number | null): string {
		if (idx == null || idx < 0) return '';
		const date = new Date(loanStartYear, loanStartMonth - 1 + idx);
		return `${MONTH_NAMES_SHORT[date.getMonth()]}-${date.getFullYear()}`;
	}

	// =========================================================================
	// ACTIVE EVENTS
	// =========================================================================

	let activeEvents: TimelineEvent[] = $state([]);
	let nextEventId: number = $state(1);

	// =========================================================================
	// CUSTOM EVENT FORM STATE
	// =========================================================================

	let customEventType: string = $state('part_payment');

	// Editing state: null = new event, string = editing event ID
	let editingEventId: string | null = $state(null);

	// -- Part-payment fields --
	let ppPaymentType: string = $state('one_time'); // one_time | recurring | year_end
	let ppAmountMode: string = $state('fixed'); // fixed | percent
	let ppAmount: number = $state(500_000);
	let ppPercentValue: number = $state(2);
	let ppMonth: number = $state(12);
	let ppFromMonth: number = $state(12);
	let ppToMonth: number = $state(240);
	let ppInterval: number = $state(12);
	let ppEffect: string = $state('reduce_tenure');
	let ppHybridPercent: number = $state(50);

	// -- EMI Step-Up fields --
	let stepUpMethod: string = $state('percentage');
	let stepUpValue: number = $state(5);
	let stepUpCompounding: boolean = $state(true);
	let stepUpInterval: number = $state(12);
	let stepUpFromMonth: number = $state(13);
	let stepUpToMonth: number | null = $state(null); // null = till end
	let stepUpMaxCap: number | null = $state(null); // null = no cap

	// -- EMI Step-Down fields --
	let stepDownMethod: string = $state('percentage');
	let stepDownValue: number = $state(10);
	let stepDownCompounding: boolean = $state(true);
	let stepDownInterval: number = $state(12);
	let stepDownFromMonth: number = $state(181);
	let stepDownToMonth: number | null = $state(null);
	let stepDownMinFloor: number | null = $state(null);

	// -- EMI Change fields --
	let emiChangeMode: string = $state('increase_percent');
	let emiChangeValue: number = $state(10);
	let emiChangeFromMonth: number = $state(24);
	let emiChangeToMonth: number | null = $state(null);

	// Recurring: repeat every N months (step-up/step-down pattern)
	let emiChangeIsRecurring: boolean = $state(false);
	let emiChangeInterval: number = $state(12);

	// Duration: derived from emiChangeToMonth — null means "till end of loan"
	let emiChangeIsPermanent = $derived(emiChangeToMonth == null);

	const emiChangeModeOptions = [
		{ label: 'Increase by %', value: 'increase_percent' },
		{ label: 'Decrease by %', value: 'decrease_percent' },
		{ label: 'Increase by ₹', value: 'increase_amount' },
		{ label: 'Decrease by ₹', value: 'decrease_amount' },
		{ label: 'Set to specific ₹', value: 'set_amount' }
	];

	let emiChangeValueLabel = $derived(
		(emiChangeMode as string).includes('percent')
			? 'Change by (%)'
			: (emiChangeMode as string) === 'set_amount'
				? 'New EMI (₹)'
				: 'Change by (₹)'
	);

	// -- Moratorium fields --
	let moraFromMonth: number = $state(1);
	let moraToMonth: number = $state(3);
	let moraInterestTreatment: string = $state('capitalize');

	// -- Rate Change fields --
	let rateChangeMonth: number = $state(13);
	let newRate: number = $state(9.0);
	let rateRecalcEmi: boolean = $state(true);

	// -- Multi-Phase fields --
	let multiPhaseStartMonth: number = $state(13);
	let multiPhaseRows: {
		durationMonths: number;
		intervalMonths: number;
		method: string;
		value: number;
	}[] = $state([
		{ durationMonths: 36, intervalMonths: 12, method: 'percentage', value: 5 },
		{ durationMonths: 48, intervalMonths: 12, method: 'fixed_amount', value: 15000 },
		{ durationMonths: 24, intervalMonths: 12, method: 'percentage', value: 7 }
	]);

	// -- UI State --
	let showAmortization: boolean = $state(false);

	// =========================================================================
	// DERIVED — Simulation
	// =========================================================================

	let baseLoan = $derived<BaseLoanConfig>({
		principalAmount: loanAmount,
		annualInterestRate: interestRate,
		tenureMonths: tenureMonths,
		startDate: loanStartDate,
		emiType: 'standard'
	});

	let baseResult: SimulationResult = $derived.by(() => simulateLoan(baseLoan, []));

	let modifiedResult: SimulationResult = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		return simulateLoan(baseLoan, activeEvents);
	});

	let hasEvents: boolean = $derived(activeEvents.length > 0);

	let baseEmi: number = $derived(Math.round(baseResult.summary.peakEmi));

	// Loan Snapshot — pie chart data (same design as EMI Calculator)
	let snapshotTotalInterest = $derived(Math.round(baseResult.summary.totalInterestPaid));
	let snapshotTotalPayment = $derived(loanAmount + snapshotTotalInterest);
	let snapshotPrincipalPercent = $derived(
		snapshotTotalPayment > 0 ? ((loanAmount / snapshotTotalPayment) * 100).toFixed(1) : '0'
	);
	let snapshotInterestPercent = $derived(
		snapshotTotalPayment > 0
			? ((snapshotTotalInterest / snapshotTotalPayment) * 100).toFixed(1)
			: '0'
	);

	// Loan start display label
	let loanStartLabel = $derived(`${MONTH_NAMES_SHORT[loanStartMonth - 1]}-${loanStartYear}`);

	// Animated pie chart config — reuses the same builder as EMI Calculator
	let snapshotPieChart = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (loanAmount <= 0 || snapshotTotalInterest <= 0) return null;
		return buildPrincipalInterestDoughnut(loanAmount, snapshotTotalInterest);
	});

	function snapshotsToMonthlyEntries(result: SimulationResult): MonthlyPaymentEntry[] {
		return result.timeline.map((s) => ({
			monthNumber: s.monthIndex,
			formattedDate: s.dateLabel,
			numericDate: s.date,
			emiAmount: s.emiPaid,
			interestAmount: s.interestComponent,
			principalAmount: s.principalComponent,
			closingBalance: s.outstandingPrincipal,
			partPaymentAmount: s.partPaymentMade
		}));
	}

	let baseYearlySummary = $derived.by(() =>
		groupScheduleByCalendarYear(snapshotsToMonthlyEntries(baseResult), loanAmount)
	);

	let modifiedYearlySummary = $derived.by(() =>
		groupScheduleByCalendarYear(snapshotsToMonthlyEntries(modifiedResult), loanAmount)
	);

	let chartConfig = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		return buildBalanceComparisonLine(baseYearlySummary, modifiedYearlySummary);
	});

	// =========================================================================
	// DERIVED — Summary data
	// =========================================================================

	let savingsItems = $derived.by(() => {
		const interestSaved =
			baseResult.summary.totalInterestPaid - modifiedResult.summary.totalInterestPaid;
		const tenureSaved = modifiedResult.summary.tenureSavedMonths;
		const totalPP = modifiedResult.summary.totalPartPayments;

		return [
			{
				label: 'Interest Saved',
				value: interestSaved > 0 ? `₹ ${formatNumber(Math.round(interestSaved))}` : '₹ 0',
				highlight: interestSaved > 0,
				subText:
					interestSaved > 0
						? `${((interestSaved / baseResult.summary.totalInterestPaid) * 100).toFixed(1)}% reduction`
						: 'Add strategies to save'
			},
			{
				label: 'Tenure Saved',
				value: tenureSaved > 0 ? `${tenureSaved} months` : '0 months',
				subText:
					tenureSaved > 0 ? `${(tenureSaved / 12).toFixed(1)} years earlier` : 'No tenure change'
			},
			{
				label: 'Total Part-Payments',
				value: totalPP > 0 ? `₹ ${formatNumber(Math.round(totalPP))}` : '₹ 0',
				subText:
					totalPP > 0
						? `${((totalPP / loanAmount) * 100).toFixed(1)}% of principal`
						: 'No part-payments'
			}
		];
	});

	let comparisonRows = $derived([
		{
			label: 'Total Interest',
			original: baseResult.summary.totalInterestPaid,
			modified: modifiedResult.summary.totalInterestPaid,
			showSaving: true,
			isHighlighted: true
		},
		{
			label: 'Tenure',
			original: baseResult.summary.originalTenureMonths,
			modified: modifiedResult.summary.actualTenureMonths,
			showSaving: true,
			unit: 'months'
		},
		{
			label: 'Total Payment',
			original: baseResult.summary.totalAmountPaid,
			modified: modifiedResult.summary.totalAmountPaid,
			showSaving: true
		},
		{
			label: 'Peak EMI',
			original: baseResult.summary.peakEmi,
			modified: modifiedResult.summary.peakEmi,
			showSaving: false
		},
		{
			label: 'Average EMI',
			original: baseResult.summary.averageEmi,
			modified: modifiedResult.summary.averageEmi,
			showSaving: false
		}
	]);

	// =========================================================================
	// ICON + LABEL MAPS
	// =========================================================================

	const EVENT_TYPE_ICONS: Record<string, any> = {
		emi_step_up: TrendingUp,
		emi_step_down: TrendingDown,
		part_payment: Banknote,
		recurring_part_payment: IndianRupee,
		conditional_part_payment: Target,
		moratorium: Calendar,
		rate_change: Percent,
		emi_override: Zap,
		emi_one_time_jump: TrendingUp,
		custom_emi_schedule: Layers,
		multi_phase_step: Layers
	};

	const WARNING_COLORS: Record<string, string> = {
		info: 'bg-blue-50 text-blue-800 border-blue-200',
		warning: 'bg-amber-50 text-amber-800 border-amber-200',
		critical: 'bg-red-50 text-red-800 border-red-200'
	};

	// =========================================================================
	// QUICK-ADD PILL DEFINITIONS
	// =========================================================================

	const QUICK_PILLS: {
		icon: string;
		label: string;
		/** Which plannerModes this pill should appear in */
		modes: ('part-payment' | 'emi' | 'all')[];
		fill: () => void;
	}[] = [
		{
			icon: '📈',
			label: '5% Step-Up',
			modes: ['emi', 'all'],
			fill: () => {
				customEventType = 'emi_step_up';
				stepUpMethod = 'percentage';
				stepUpValue = 5;
				stepUpCompounding = true;
				stepUpInterval = 12;
				stepUpFromMonth = 13;
				stepUpToMonth = null;
				stepUpMaxCap = null;
				editingEventId = null;
			}
		},
		{
			icon: '🪔',
			label: 'Diwali ₹1L',
			modes: ['part-payment', 'all'],
			fill: () => {
				customEventType = 'part_payment';
				ppPaymentType = 'year_end';
				ppAmountMode = 'fixed';
				ppAmount = 100_000;
				ppEffect = 'reduce_tenure';
				editingEventId = null;
			}
		},
		{
			icon: '⚡',
			label: 'Aggressive',
			modes: ['part-payment', 'all'],
			fill: () => {
				customEventType = 'part_payment';
				ppPaymentType = 'recurring';
				ppAmountMode = 'fixed';
				ppAmount = 50_000;
				ppFromMonth = 4;
				ppToMonth = tenureMonths;
				ppInterval = 3;
				ppEffect = 'reduce_tenure';
				editingEventId = null;
			}
		},
		{
			icon: '⏸️',
			label: 'Relief',
			modes: ['all'],
			fill: () => {
				customEventType = 'moratorium';
				moraFromMonth = 1;
				moraToMonth = 3;
				moraInterestTreatment = 'capitalize';
				editingEventId = null;
			}
		},
		{
			icon: '💰',
			label: 'Bonus ₹5L',
			modes: ['part-payment', 'all'],
			fill: () => {
				customEventType = 'part_payment';
				ppPaymentType = 'one_time';
				ppAmountMode = 'fixed';
				ppAmount = 500_000;
				ppMonth = 12;
				ppEffect = 'reduce_tenure';
				editingEventId = null;
			}
		},
		{
			icon: '📉',
			label: 'Rate Cut',
			modes: ['all'],
			fill: () => {
				customEventType = 'rate_change';
				rateChangeMonth = 19;
				newRate = Math.max(6, interestRate - 0.25);
				rateRecalcEmi = true;
				editingEventId = null;
			}
		},
		{
			icon: '🔀',
			label: 'Multi-Phase',
			modes: ['emi', 'all'],
			fill: () => {
				customEventType = 'multi_phase_step';
				multiPhaseStartMonth = 13;
				multiPhaseRows = [
					{ durationMonths: 36, intervalMonths: 12, method: 'percentage', value: 5 },
					{ durationMonths: 48, intervalMonths: 12, method: 'fixed_amount', value: 15000 }
				];
				editingEventId = null;
			}
		}
	];

	// =========================================================================
	// SELECT OPTIONS
	// =========================================================================

	const ALL_EVENT_TYPE_OPTIONS = [
		{ label: 'Part-Payment', value: 'part_payment' },
		{ label: 'EMI Change', value: 'emi_change' },
		{ label: 'EMI Step-Up', value: 'emi_step_up' },
		{ label: 'EMI Step-Down', value: 'emi_step_down' },
		{ label: 'Moratorium', value: 'moratorium' },
		{ label: 'Rate Change', value: 'rate_change' },
		{ label: 'Multi-Phase Step', value: 'multi_phase_step' }
	];

	const ppPaymentTypeOptions = [
		{ label: 'One-Time', value: 'one_time' },
		{ label: 'Recurring', value: 'recurring' },
		{ label: 'Year-End Bonus', value: 'year_end' }
	];

	const ppAmountModeOptions = [
		{ label: 'Fixed Amount (₹)', value: 'fixed' },
		{ label: '% of Outstanding', value: 'percent' }
	];

	const ppEffectOptions = [
		{ label: 'Reduce Tenure', value: 'reduce_tenure' },
		{ label: 'Reduce EMI', value: 'reduce_emi' },
		{ label: 'Hybrid (50/50)', value: 'hybrid' }
	];

	const stepMethodOptions = [
		{ label: 'Percentage', value: 'percentage' },
		{ label: 'Fixed Amount (₹)', value: 'fixed_amount' }
	];

	const moraInterestOptions = [
		{ label: 'Capitalize (adds to loan)', value: 'capitalize' },
		{ label: 'Pay Separately', value: 'pay_separately' },
		{ label: 'Waived', value: 'waive' }
	];

	const phaseMethodOptions = [
		{ label: '% of EMI', value: 'percentage' },
		{ label: 'Fixed ₹', value: 'fixed_amount' }
	];

	// =========================================================================
	// DERIVED — Filtered by plannerMode
	// =========================================================================

	const PART_PAYMENT_TYPES = new Set(['part_payment']);
	const EMI_TYPES = new Set(['emi_change']);

	let visibleEventTypes = $derived.by(() => {
		if (plannerMode === 'part-payment') {
			return ALL_EVENT_TYPE_OPTIONS.filter((o) => PART_PAYMENT_TYPES.has(o.value));
		}
		if (plannerMode === 'emi') {
			return ALL_EVENT_TYPE_OPTIONS.filter((o) => EMI_TYPES.has(o.value));
		}
		return ALL_EVENT_TYPE_OPTIONS; // 'all'
	});

	let filteredStrategies = $derived.by(() => {
		return QUICK_PILLS.filter((p) => p.modes.includes(plannerMode));
	});

	// Auto-select first visible event type if current is not visible
	$effect(() => {
		const visibleValues = visibleEventTypes.map((o) => o.value);
		if (!visibleValues.includes(customEventType) && visibleValues.length > 0) {
			customEventType = visibleValues[0];
		}
	});

	// =========================================================================
	// EVENT ACTIONS
	// =========================================================================

	function getEventLabel(event: TimelineEvent): string {
		return (event as any).label || event.type.replace(/_/g, ' ');
	}

	function getEventIcon(event: TimelineEvent): any {
		return EVENT_TYPE_ICONS[event.type] || Calculator;
	}

	function getEventSummary(event: TimelineEvent): string {
		switch (event.type) {
			case 'emi_step_up':
				return `${event.value}${event.method === 'percentage' ? '%' : '₹'}/yr${event.compounding ? ' compounding' : ''}`;
			case 'emi_step_down':
				return `${event.value}${event.method === 'percentage' ? '%' : '₹'}/yr down`;
			case 'part_payment':
				return `₹${formatNumber(event.amount)} at mo ${event.atMonth}`;
			case 'recurring_part_payment':
				return `${event.amountType === 'fixed' ? '₹' + formatNumber(event.amount) : event.amount + '%'} every ${event.intervalMonths}mo`;
			case 'conditional_part_payment':
				return `₹${formatNumber(event.amount)} ${event.trigger.replace(/_/g, ' ')}`;
			case 'moratorium':
				return `Months ${event.fromMonth}-${event.toMonth}`;
			case 'rate_change':
				return `${event.newAnnualRate}% at mo ${event.atMonth}`;
			case 'multi_phase_step':
				return `${event.phases.length} phases from mo ${event.startMonth}`;
			default:
				return '';
		}
	}

	function removeEvent(eventId: string) {
		activeEvents = activeEvents.filter((e) => e.id !== eventId);
		if (editingEventId === eventId) {
			editingEventId = null;
		}
	}

	function clearAllEvents() {
		activeEvents = [];
		editingEventId = null;
	}

	/** Load an existing event into the form for editing */
	function editEvent(event: TimelineEvent) {
		editingEventId = event.id;

		// Map internal event type → form tab category
		// Internal types like 'recurring_part_payment' and 'conditional_part_payment'
		// are sub-types under the 'part_payment' tab, controlled by ppPaymentType.
		// Without this mapping, the switch in addCustomEvent would miss them
		// because it only has cases for the tab categories, not the sub-types.
		switch (event.type) {
			case 'part_payment':
			case 'recurring_part_payment':
			case 'conditional_part_payment':
				customEventType = 'part_payment';
				break;
			case 'emi_override':
			case 'emi_step_up':
			case 'emi_step_down':
				customEventType = 'emi_change';
				break;
			default:
				customEventType = event.type;
		}

		switch (event.type) {
			case 'part_payment':
				ppPaymentType = 'one_time';
				ppAmountMode = 'fixed';
				ppAmount = event.amount;
				ppMonth = event.atMonth;
				ppEffect = event.effect;
				ppHybridPercent = event.hybridEmiReductionPercent ?? 50;
				break;
			case 'recurring_part_payment':
				ppPaymentType = 'recurring';
				ppAmountMode = event.amountType === 'fixed' ? 'fixed' : 'percent';
				ppAmount = event.amountType === 'fixed' ? event.amount : 50_000;
				ppPercentValue = event.amountType === 'percent_of_outstanding' ? event.amount : 2;
				ppFromMonth = event.fromMonth;
				ppToMonth = event.toMonth;
				ppInterval = event.intervalMonths;
				ppEffect = event.effect;
				ppHybridPercent = event.hybridEmiReductionPercent ?? 50;
				break;
			case 'conditional_part_payment':
				ppPaymentType = 'year_end';
				ppAmountMode = 'fixed';
				ppAmount = event.amount;
				ppEffect = event.effect;
				ppHybridPercent = event.hybridEmiReductionPercent ?? 50;
				break;
			case 'emi_override':
				emiChangeIsRecurring = false;
				emiChangeToMonth = event.toMonth >= tenureMonths ? null : event.toMonth;
				emiChangeFromMonth = event.fromMonth;
				emiChangeToMonth = event.toMonth;
				if (event.overrideType === 'percentage_change') {
					emiChangeMode = event.value >= 0 ? 'increase_percent' : 'decrease_percent';
					emiChangeValue = Math.abs(event.value);
				} else {
					// fixed_amount — determine if it was an increase or decrease from base EMI
					if (event.value > baseEmi) {
						emiChangeMode = 'increase_amount';
						emiChangeValue = event.value - baseEmi;
					} else if (event.value < baseEmi) {
						emiChangeMode = 'decrease_amount';
						emiChangeValue = baseEmi - event.value;
					} else {
						emiChangeMode = 'set_amount';
						emiChangeValue = event.value;
					}
				}
				break;
			case 'emi_step_up':
				emiChangeIsRecurring = true;
				emiChangeToMonth = event.toMonth ?? null;
				emiChangeMode = event.method === 'percentage' ? 'increase_percent' : 'increase_amount';
				emiChangeValue = event.value;
				emiChangeInterval = event.intervalMonths;
				emiChangeFromMonth = event.fromMonth;
				emiChangeToMonth = event.toMonth ?? null;
				// Also keep legacy fields in sync
				stepUpMethod = event.method;
				stepUpValue = event.value;
				stepUpCompounding = event.compounding ?? false;
				stepUpInterval = event.intervalMonths;
				stepUpFromMonth = event.fromMonth;
				stepUpToMonth = event.toMonth ?? null;
				stepUpMaxCap = event.maxEmiCap ?? null;
				break;
			case 'emi_step_down':
				emiChangeIsRecurring = true;
				emiChangeToMonth = event.toMonth ?? null;
				emiChangeMode = event.method === 'percentage' ? 'decrease_percent' : 'decrease_amount';
				emiChangeValue = event.value;
				emiChangeInterval = event.intervalMonths;
				emiChangeFromMonth = event.fromMonth;
				emiChangeToMonth = event.toMonth ?? null;
				// Also keep legacy fields in sync
				stepDownMethod = event.method;
				stepDownValue = event.value;
				stepDownCompounding = event.compounding ?? false;
				stepDownInterval = event.intervalMonths;
				stepDownFromMonth = event.fromMonth;
				stepDownToMonth = event.toMonth ?? null;
				stepDownMinFloor = event.minEmiFloor ?? null;
				break;
			case 'moratorium':
				moraFromMonth = event.fromMonth;
				moraToMonth = event.toMonth;
				moraInterestTreatment = event.interestTreatment;
				break;
			case 'rate_change':
				rateChangeMonth = event.atMonth;
				newRate = event.newAnnualRate;
				rateRecalcEmi = event.recalculateEmi;
				break;
			case 'multi_phase_step':
				multiPhaseStartMonth = event.startMonth;
				multiPhaseRows = event.phases.map((p) => ({
					durationMonths: p.durationMonths,
					intervalMonths: p.intervalMonths,
					method: p.method,
					value: p.value
				}));
				break;
		}
	}

	/** Add or update event from form */
	function addCustomEvent() {
		const id = editingEventId ?? `custom-${nextEventId}-${Date.now()}`;
		let event: TimelineEvent;

		switch (customEventType) {
			case 'part_payment': {
				if (ppPaymentType === 'one_time') {
					event = {
						type: 'part_payment',
						id,
						atMonth: ppMonth,
						amount: ppAmountMode === 'fixed' ? ppAmount : ppPercentValue,
						effect: ppEffect as any,
						hybridEmiReductionPercent: ppEffect === 'hybrid' ? ppHybridPercent : undefined,
						label:
							ppAmountMode === 'fixed'
								? `₹${formatNumber(ppAmount)} part-payment at month ${ppMonth}`
								: `${ppPercentValue}% part-payment at month ${ppMonth}`
					};
				} else if (ppPaymentType === 'recurring') {
					event = {
						type: 'recurring_part_payment',
						id,
						fromMonth: ppFromMonth,
						toMonth: ppToMonth,
						intervalMonths: ppInterval,
						amountType: ppAmountMode === 'fixed' ? 'fixed' : 'percent_of_outstanding',
						amount: ppAmountMode === 'fixed' ? ppAmount : ppPercentValue,
						effect: ppEffect as any,
						hybridEmiReductionPercent: ppEffect === 'hybrid' ? ppHybridPercent : undefined,
						label:
							ppAmountMode === 'fixed'
								? `₹${formatNumber(ppAmount)} every ${ppInterval} months`
								: `${ppPercentValue}% every ${ppInterval} months`
					};
				} else {
					// year_end
					event = {
						type: 'conditional_part_payment',
						id,
						trigger: 'every_year_end',
						amount: ppAmountMode === 'fixed' ? ppAmount : ppPercentValue,
						effect: ppEffect as any,
						hybridEmiReductionPercent: ppEffect === 'hybrid' ? ppHybridPercent : undefined,
						label: `Year-end ₹${formatNumber(ppAmountMode === 'fixed' ? ppAmount : ppPercentValue)} bonus`
					};
				}
				break;
			}

			case 'emi_change': {
				const isPercent = (emiChangeMode as string).includes('percent');
				const isDecrease = (emiChangeMode as string).includes('decrease');
				const isSetAmount = (emiChangeMode as string) === 'set_amount';
				const fromLabel = monthIndexToLabel(emiChangeFromMonth);

				// Build human-readable change label
				let changeLabel: string;
				if (isSetAmount) {
					changeLabel = `Set EMI to ₹${formatNumber(emiChangeValue)}`;
				} else if (isPercent) {
					changeLabel = `${isDecrease ? '-' : '+'}${emiChangeValue}%`;
				} else {
					changeLabel = `${isDecrease ? '-' : '+'}₹${formatNumber(emiChangeValue)}`;
				}

				if (emiChangeIsRecurring) {
					// Recurring change → maps to emi_step_up or emi_step_down engine event
					const toMonth = emiChangeIsPermanent ? undefined : (emiChangeToMonth ?? undefined);
					const toLabel = emiChangeIsPermanent ? 'end' : monthIndexToLabel(emiChangeToMonth);
					event = {
						type: isDecrease ? 'emi_step_down' : 'emi_step_up',
						id,
						method: isPercent ? 'percentage' : 'fixed_amount',
						value: emiChangeValue,
						intervalMonths: emiChangeInterval,
						fromMonth: emiChangeFromMonth,
						toMonth,
						compounding: true,
						label: `${changeLabel} every ${emiChangeInterval}mo from ${fromLabel} to ${toLabel}`
					};
				} else {
					// One-time or temporary → maps to emi_override engine event
					let overrideType: 'fixed_amount' | 'percentage_change';
					let overrideValue: number;

					if (isSetAmount) {
						overrideType = 'fixed_amount';
						overrideValue = emiChangeValue;
					} else if (isPercent) {
						overrideType = 'percentage_change';
						overrideValue = isDecrease ? -emiChangeValue : emiChangeValue;
					} else {
						overrideType = 'fixed_amount';
						overrideValue = isDecrease ? baseEmi - emiChangeValue : baseEmi + emiChangeValue;
					}

					const toLabel = emiChangeIsPermanent ? 'end' : monthIndexToLabel(emiChangeToMonth);
					event = {
						type: 'emi_override',
						id,
						fromMonth: emiChangeFromMonth,
						toMonth: emiChangeIsPermanent ? tenureMonths : (emiChangeToMonth ?? tenureMonths),
						overrideType,
						value: overrideValue,
						label: `${changeLabel} from ${fromLabel} to ${toLabel}`
					};
				}
				break;
			}

			case 'emi_step_up': {
				const toMonth = stepUpToMonth ?? undefined;
				const maxCap = stepUpMaxCap ?? undefined;
				event = {
					type: 'emi_step_up',
					id,
					method: stepUpMethod as 'percentage' | 'fixed_amount',
					value: stepUpValue,
					intervalMonths: stepUpInterval,
					fromMonth: stepUpFromMonth,
					toMonth: toMonth,
					maxEmiCap: maxCap,
					compounding: stepUpCompounding,
					label: `${stepUpValue}${stepUpMethod === 'percentage' ? '%' : '₹'} step-up every ${stepUpInterval}mo${stepUpCompounding ? ' (compounding)' : ''}`
				};
				break;
			}

			case 'emi_step_down': {
				const toMonth = stepDownToMonth ?? undefined;
				const minFloor = stepDownMinFloor ?? undefined;
				event = {
					type: 'emi_step_down',
					id,
					method: stepDownMethod as 'percentage' | 'fixed_amount',
					value: stepDownValue,
					intervalMonths: stepDownInterval,
					fromMonth: stepDownFromMonth,
					toMonth: toMonth,
					minEmiFloor: minFloor,
					compounding: stepDownCompounding,
					label: `${stepDownValue}${stepDownMethod === 'percentage' ? '%' : '₹'} step-down every ${stepDownInterval}mo`
				};
				break;
			}

			case 'moratorium':
				event = {
					type: 'moratorium',
					id,
					fromMonth: moraFromMonth,
					toMonth: moraToMonth,
					interestTreatment: moraInterestTreatment as any,
					label: `Moratorium months ${moraFromMonth}-${moraToMonth} (${moraInterestTreatment})`
				};
				break;

			case 'rate_change':
				event = {
					type: 'rate_change',
					id,
					atMonth: rateChangeMonth,
					newAnnualRate: newRate,
					recalculateEmi: rateRecalcEmi,
					label: `Rate → ${newRate}% at month ${rateChangeMonth}`
				};
				break;

			case 'multi_phase_step':
				event = {
					type: 'multi_phase_step',
					id,
					startMonth: multiPhaseStartMonth,
					phases: multiPhaseRows.map((row) => ({
						durationMonths: row.durationMonths,
						intervalMonths: row.intervalMonths,
						method: row.method as 'percentage' | 'fixed_amount',
						value: row.value
					})),
					label: `Multi-phase: ${multiPhaseRows.length} phases from month ${multiPhaseStartMonth}`
				};
				break;

			default:
				return;
		}

		if (editingEventId) {
			// UPDATE existing event, then clear form for a new entry
			activeEvents = activeEvents.map((e) => (e.id === editingEventId ? event : e));
		} else {
			// ADD new event
			activeEvents = [...activeEvents, event];
			nextEventId += 1;
		}
		// Always exit edit mode and clear form after add/update
		// Form is ready for the next entry (multi-phase workflow)
		editingEventId = null;
		// User clicks "Cancel Edit" or another event's pencil to exit/switch.
	}

	/** Add a pre-built strategy event directly (bypasses form) */
	function addStrategyEvent(createEvent: (loan: BaseLoanConfig) => TimelineEvent) {
		const event = createEvent(baseLoan);
		activeEvents = [...activeEvents, event];
		nextEventId += 1;
	}

	function addPhaseRow() {
		multiPhaseRows = [
			...multiPhaseRows,
			{ durationMonths: 24, intervalMonths: 12, method: 'percentage', value: 5 }
		];
	}

	function removePhaseRow(index: number) {
		multiPhaseRows = multiPhaseRows.filter((_, i) => i !== index);
	}

	/** Interest-only EMI for step-down floor hint */
	let interestOnlyEmi = $derived(Math.round((loanAmount * interestRate) / (12 * 100)));
</script>

<!-- ======================================================================= -->
<!-- 6 FULL-WIDTH STACKED SECTIONS                                          -->
<!-- ======================================================================= -->

<div class="space-y-5">
	<!-- =================================================================== -->
	<!-- SECTION 1: LOAN DETAILS + SNAPSHOT                                  -->
	<!-- =================================================================== -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4 sm:p-5">
		<div class="grid gap-8 lg:grid-cols-5">
			<!-- LEFT: Inputs (3/5 width) — each slider on its own row -->
			<div class="flex flex-col justify-between gap-3 lg:col-span-3">
				<RangeSliderInput
					id="lp-amount"
					label="Loan Amount"
					bind:value={loanAmount}
					min={100_000}
					max={10_00_00_000}
					step="auto"
					unit="₹"
					unitPosition="prefix"
				/>
				<RangeSliderInput
					id="lp-rate"
					label="Interest Rate"
					bind:value={interestRate}
					min={5}
					max={20}
					step={0.1}
					unit="%"
					unitPosition="suffix"
					allowDecimals={true}
				/>
				<RangeSliderInput
					id="lp-tenure"
					label="Tenure ({tenureYears} yrs)"
					bind:value={tenureMonths}
					min={12}
					max={360}
					step={12}
					unit="months"
					unitPosition="suffix"
					formatLabel={(v) => `${Math.round(v / 12)}yr`}
				/>
				<MonthYearInput
					id="lp-start-date"
					label="Loan Start Date"
					bind:value={loanStartMonthIndex}
					startYear={startDateRefYear}
					startMonth={1}
					tenureMonths={480 + tenureMonths}
				/>

				<!-- Mobile-only: EMI amount below inputs -->
				<div
					class="mt-1 flex items-center justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-4 py-3 lg:hidden"
				>
					<span
						class="text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
						>Monthly EMI</span
					>
					<span class="text-xl font-extrabold text-[var(--ddsa-secondary)]"
						>₹{formatNumber(baseEmi)}</span
					>
				</div>
			</div>

			<!-- RIGHT: Loan Snapshot (2/5 width) — hidden on mobile -->
			<div class="hidden flex-col items-center justify-center lg:col-span-2 lg:flex">
				<!-- EMI hero -->
				<div class="mb-4 text-center">
					<p
						class="text-xs font-semibold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						Loan EMI
					</p>
					<p
						class="mt-1 text-3xl font-extrabold text-[var(--ddsa-secondary)]"
						style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
					>
						₹ {formatNumber(baseEmi)}
					</p>
					<p class="mt-1 text-[11px] text-[var(--ddsa-secondary-400)]">
						Loan Start: <span class="font-semibold text-[var(--ddsa-secondary-600)]"
							>{loanStartLabel}</span
						>
					</p>
				</div>

				<!-- Animated Pie Chart -->
				{#if snapshotPieChart}
					<div class="w-full max-w-[220px]">
						<p class="mb-2 text-center text-xs font-semibold text-[var(--ddsa-secondary-500)]">
							Break-up of Total Payment
						</p>
						<div class="relative">
							<ChartWrapper
								type="pie"
								data={snapshotPieChart.data}
								options={snapshotPieChart.options}
								height="180px"
								animated={true}
								animationDuration={1000}
							/>
							<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
								<div class="flex gap-8 text-xs font-bold text-white drop-shadow-md">
									<span>{snapshotPrincipalPercent}%</span>
									<span>{snapshotInterestPercent}%</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Legend with ₹ amounts -->
				<div class="mt-3 space-y-1.5 text-xs">
					<div class="flex items-center gap-2">
						<span class="h-3 w-3 rounded-full" style="background: var(--chart-principal, #8b8b6b);"
						></span>
						<span class="text-[var(--ddsa-secondary-600)]">Principal</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary-700)]"
							>₹{formatNumber(loanAmount)}</span
						>
					</div>
					<div class="flex items-center gap-2">
						<span class="h-3 w-3 rounded-full" style="background: var(--chart-interest, #d4a84e);"
						></span>
						<span class="text-[var(--ddsa-secondary-600)]">Interest</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary-700)]"
							>₹{formatNumber(snapshotTotalInterest)}</span
						>
					</div>
					<div class="flex items-center gap-2 border-t border-[var(--ddsa-secondary-200)] pt-1">
						<span class="text-[var(--ddsa-secondary-500)]">Total</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary)]"
							>₹{formatNumber(snapshotTotalPayment)}</span
						>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- =================================================================== -->
	<!-- SECTION 2: CUSTOM EVENT BUILDER                                     -->
	<!-- =================================================================== -->
	<div
		class="rounded-xl border border-[var(--ddsa-primary-300)] bg-[var(--ddsa-secondary-50)]/30 p-4 shadow-sm sm:p-5"
	>
		<!-- (a) Getting Started tips — only when no active events -->
		{#if activeEvents.length === 0}
			<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
				<p class="mb-1.5 text-xs font-bold tracking-wider text-amber-700 uppercase">
					Getting Started
				</p>
				<ul class="space-y-1 text-xs text-amber-800">
					<li class="flex items-start gap-1.5">
						<span class="mt-0.5 flex-shrink-0">&#8226;</span>
						Pick a quick strategy pill or choose an event type below
					</li>
					<li class="flex items-start gap-1.5">
						<span class="mt-0.5 flex-shrink-0">&#8226;</span>
						Customize values, then click "Add Event"
					</li>
					<li class="flex items-start gap-1.5">
						<span class="mt-0.5 flex-shrink-0">&#8226;</span>
						Combine multiple events to maximize savings
					</li>
					<li class="flex items-start gap-1.5">
						<span class="mt-0.5 flex-shrink-0">&#8226;</span>
						Chart and table update in real-time
					</li>
				</ul>
			</div>
		{/if}

		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ddsa-primary-50)]"
				>
					<Plus size={16} class="text-[var(--ddsa-primary-500)]" />
				</span>
				<h3 class="text-sm font-bold text-[var(--ddsa-secondary)]">
					{editingEventId ? 'Edit Event' : 'Custom Event Builder'}
				</h3>
			</div>
			{#if editingEventId}
				<button
					type="button"
					class="text-xs font-medium text-[var(--ddsa-secondary-400)] hover:text-[var(--ddsa-secondary-700)]"
					onclick={() => {
						editingEventId = null;
					}}
				>
					Cancel Edit
				</button>
			{/if}
		</div>

		<!-- (b) Event type tab pills -->
		<div class="mb-4 flex flex-wrap gap-2">
			{#each visibleEventTypes as eventType (eventType.value)}
				<button
					type="button"
					class="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150
						{customEventType === eventType.value
						? 'bg-[var(--ddsa-primary-500)] text-white shadow-sm'
						: 'border border-[var(--dash-border)] bg-white text-[var(--ddsa-secondary-600)] hover:border-[var(--ddsa-primary-400)] hover:text-[var(--ddsa-primary-700)]'}"
					onclick={() => {
						customEventType = eventType.value;
					}}
				>
					{eventType.label}
				</button>
			{/each}
		</div>

		<!-- (c) Form fields for selected event type -->

		<!-- PART-PAYMENT FORM -->
		{#if customEventType === 'part_payment'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SelectField
					id="pp-payment-type"
					label="Payment Type"
					bind:value={ppPaymentType}
					options={ppPaymentTypeOptions}
				/>
				<SelectField
					id="pp-amount-mode"
					label="Amount Mode"
					bind:value={ppAmountMode}
					options={ppAmountModeOptions}
				/>
				{#if ppAmountMode === 'fixed'}
					<NumberField
						id="pp-amount"
						label="Amount (₹)"
						bind:value={ppAmount}
						min={10_000}
						max={loanAmount}
						step={10_000}
					/>
				{:else}
					<NumberField
						id="pp-percent"
						label="% of Outstanding"
						bind:value={ppPercentValue}
						min={0.5}
						max={50}
						step="any"
					/>
				{/if}

				{#if ppPaymentType === 'one_time'}
					<MonthYearInput
						id="pp-month"
						label="At"
						bind:value={ppMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
					/>
				{/if}

				{#if ppPaymentType === 'recurring'}
					<MonthYearInput
						id="pp-from"
						label="From"
						bind:value={ppFromMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
					/>
					<MonthYearInput
						id="pp-to"
						label="To"
						bind:value={ppToMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
					/>
					<NumberField
						id="pp-interval"
						label="Every N Months"
						bind:value={ppInterval}
						min={1}
						max={60}
						step={1}
					/>
				{/if}

				<SelectField
					id="pp-effect"
					label="Effect"
					bind:value={ppEffect}
					options={ppEffectOptions}
				/>

				{#if ppEffect === 'hybrid'}
					<NumberField
						id="pp-hybrid"
						label="EMI Reduction %"
						bind:value={ppHybridPercent}
						min={10}
						max={90}
						step={5}
					/>
				{/if}
			</div>

			<!-- EMI CHANGE FORM -->
		{:else if customEventType === 'emi_change'}
			<!-- Row 1: Change Type + Value (equal width columns) -->
			<div class="grid grid-cols-2 gap-4">
				<div class="min-w-0">
					<SelectField
						id="emi-change-mode"
						label="Change Type"
						bind:value={emiChangeMode}
						options={emiChangeModeOptions}
					/>
				</div>
				<div class="min-w-0">
					<NumberField
						id="emi-change-value"
						label={emiChangeValueLabel}
						bind:value={emiChangeValue}
						min={(emiChangeMode as string).includes('percent') ? 0.5 : 1000}
						max={(emiChangeMode as string).includes('percent') ? 100 : 10_00_000}
						step={(emiChangeMode as string).includes('percent') ? 0.5 : 1000}
					/>
				</div>
			</div>

			<!-- Row 2: Start date + End date (equal width columns) -->
			<div class="mt-3 grid grid-cols-2 gap-4">
				<MonthYearInput
					id="emi-change-from"
					label="Start date"
					bind:value={emiChangeFromMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<MonthYearInput
					id="emi-change-to"
					label="End date"
					bind:value={emiChangeToMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
					showTillEnd={true}
					onTillEnd={() => {
						emiChangeToMonth = null;
					}}
				/>
			</div>

			<!-- Row 3: Repeat option (hidden for "set to specific ₹" — repeating a fixed amount is meaningless) -->
			{#if (emiChangeMode as string) !== 'set_amount'}
				<div
					class="mt-4 mb-1 flex flex-wrap items-center gap-4 border-t border-[var(--ddsa-secondary-100)] pt-3"
				>
					<label class="flex cursor-pointer items-center gap-2 select-none">
						<input
							type="checkbox"
							bind:checked={emiChangeIsRecurring}
							class="h-4 w-4 rounded border-[var(--ddsa-secondary-300)] text-[var(--ddsa-primary-500)] accent-[var(--ddsa-primary-500)]"
						/>
						<span class="text-sm text-[var(--ddsa-secondary-600)]">Repeat every</span>
					</label>
					{#if emiChangeIsRecurring}
						<div class="flex items-center gap-1.5">
							<input
								type="number"
								bind:value={emiChangeInterval}
								min={3}
								max={60}
								class="w-16 rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-2.5 py-1.5 text-center text-sm
								text-[var(--ddsa-secondary-700)] shadow-sm focus:border-[var(--ddsa-primary-500)] focus:ring-1 focus:ring-[var(--ddsa-primary-500)]"
							/>
							<span class="text-sm text-[var(--ddsa-secondary-500)]">months</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- EMI STEP-UP FORM -->
		{:else if customEventType === 'emi_step_up'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SelectField
					id="stepup-method"
					label="Method"
					bind:value={stepUpMethod}
					options={stepMethodOptions}
				/>
				<NumberField
					id="stepup-value"
					label={stepUpMethod === 'percentage' ? 'Value (%)' : 'Value (₹)'}
					bind:value={stepUpValue}
					min={1}
					max={stepUpMethod === 'percentage' ? 50 : 200_000}
					step={stepUpMethod === 'percentage' ? 0.5 : 1_000}
				/>
				<NumberField
					id="stepup-interval"
					label="Every N Months"
					bind:value={stepUpInterval}
					min={3}
					max={60}
					step={1}
				/>
				<MonthYearInput
					id="stepup-from"
					label="From"
					bind:value={stepUpFromMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<MonthYearInput
					id="stepup-to"
					label="To (empty = till end)"
					bind:value={stepUpToMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<NumberField
					id="stepup-cap"
					label="Max EMI Cap (optional)"
					bind:value={stepUpMaxCap}
					min={0}
					max={10_00_000}
					step={1_000}
				/>
			</div>
			<div class="mt-3 flex items-center gap-2">
				<input
					type="checkbox"
					id="stepup-compounding"
					bind:checked={stepUpCompounding}
					class="h-4 w-4 rounded border-[var(--ddsa-secondary-300)] text-[var(--ddsa-primary-500)] focus:ring-[var(--ddsa-primary-500)]"
				/>
				<label for="stepup-compounding" class="text-sm text-[var(--ddsa-secondary-600)]">
					Compounding (% of current EMI, not original)
				</label>
			</div>

			<!-- EMI STEP-DOWN FORM -->
		{:else if customEventType === 'emi_step_down'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SelectField
					id="stepdown-method"
					label="Method"
					bind:value={stepDownMethod}
					options={stepMethodOptions}
				/>
				<NumberField
					id="stepdown-value"
					label={stepDownMethod === 'percentage' ? 'Value (%)' : 'Value (₹)'}
					bind:value={stepDownValue}
					min={1}
					max={stepDownMethod === 'percentage' ? 50 : 200_000}
					step={stepDownMethod === 'percentage' ? 0.5 : 1_000}
				/>
				<NumberField
					id="stepdown-interval"
					label="Every N Months"
					bind:value={stepDownInterval}
					min={3}
					max={60}
					step={1}
				/>
				<MonthYearInput
					id="stepdown-from"
					label="From"
					bind:value={stepDownFromMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<MonthYearInput
					id="stepdown-to"
					label="To (empty = till end)"
					bind:value={stepDownToMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<NumberField
					id="stepdown-floor"
					label="Min EMI Floor (optional)"
					bind:value={stepDownMinFloor}
					min={0}
					max={10_00_000}
					step={1_000}
				/>
			</div>
			<div class="mt-3 flex items-center gap-2">
				<input
					type="checkbox"
					id="stepdown-compounding"
					bind:checked={stepDownCompounding}
					class="h-4 w-4 rounded border-[var(--ddsa-secondary-300)] text-[var(--ddsa-primary-500)] focus:ring-[var(--ddsa-primary-500)]"
				/>
				<label for="stepdown-compounding" class="text-sm text-[var(--ddsa-secondary-600)]">
					Compounding (% of current EMI)
				</label>
			</div>
			<p class="mt-2 text-[11px] text-[var(--ddsa-secondary-400)] italic">
				EMI will not go below interest-only payment (currently ₹{formatNumber(interestOnlyEmi)})
			</p>

			<!-- MORATORIUM FORM -->
		{:else if customEventType === 'moratorium'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<MonthYearInput
					id="mora-from"
					label="From"
					bind:value={moraFromMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<MonthYearInput
					id="mora-to"
					label="To"
					bind:value={moraToMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<SelectField
					id="mora-interest"
					label="Interest Treatment"
					bind:value={moraInterestTreatment}
					options={moraInterestOptions}
				/>
			</div>

			<!-- RATE CHANGE FORM -->
		{:else if customEventType === 'rate_change'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<MonthYearInput
					id="rate-month"
					label="At"
					bind:value={rateChangeMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
				<NumberField
					id="rate-new"
					label="New Rate (%)"
					bind:value={newRate}
					min={5}
					max={20}
					step="any"
				/>
				<div class="flex items-end pb-1">
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="rate-recalc"
							bind:checked={rateRecalcEmi}
							class="h-4 w-4 rounded border-[var(--ddsa-secondary-300)] text-[var(--ddsa-primary-500)] focus:ring-[var(--ddsa-primary-500)]"
						/>
						<label for="rate-recalc" class="text-sm text-[var(--ddsa-secondary-600)]">
							Recalculate EMI
						</label>
					</div>
				</div>
			</div>

			<!-- MULTI-PHASE STEP FORM -->
		{:else if customEventType === 'multi_phase_step'}
			<div class="mb-3">
				<MonthYearInput
					id="multi-start"
					label="Start From"
					bind:value={multiPhaseStartMonth}
					startYear={loanStartYear}
					startMonth={loanStartMonth}
					{tenureMonths}
				/>
			</div>

			<!-- Phase table -->
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-xs">
					<thead>
						<tr class="border-b border-[var(--dash-border)]">
							<th class="px-2 py-2 text-left font-semibold text-[var(--ddsa-secondary-500)]"
								>Phase</th
							>
							<th class="px-2 py-2 text-left font-semibold text-[var(--ddsa-secondary-500)]"
								>Duration (mo)</th
							>
							<th class="px-2 py-2 text-left font-semibold text-[var(--ddsa-secondary-500)]"
								>Interval (mo)</th
							>
							<th class="px-2 py-2 text-left font-semibold text-[var(--ddsa-secondary-500)]"
								>Method</th
							>
							<th class="px-2 py-2 text-left font-semibold text-[var(--ddsa-secondary-500)]"
								>Value</th
							>
							<th class="w-8 px-2 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each multiPhaseRows as row, idx (idx)}
							<tr class="border-b border-[var(--dash-border)] last:border-b-0">
								<td class="px-2 py-2 font-medium text-[var(--ddsa-secondary-600)]">{idx + 1}</td>
								<td class="px-1.5 py-1.5">
									<input
										type="number"
										class="w-full rounded border border-[var(--ddsa-secondary-200)] bg-white px-2 py-1 text-xs text-[var(--ddsa-secondary-700)] focus:border-[var(--ddsa-primary-400)] focus:outline-none"
										bind:value={row.durationMonths}
										min={6}
										max={240}
									/>
								</td>
								<td class="px-1.5 py-1.5">
									<input
										type="number"
										class="w-full rounded border border-[var(--ddsa-secondary-200)] bg-white px-2 py-1 text-xs text-[var(--ddsa-secondary-700)] focus:border-[var(--ddsa-primary-400)] focus:outline-none"
										bind:value={row.intervalMonths}
										min={1}
										max={60}
									/>
								</td>
								<td class="px-1.5 py-1.5">
									<select
										class="w-full rounded border border-[var(--ddsa-secondary-200)] bg-white px-2 py-1 text-xs text-[var(--ddsa-secondary-700)] focus:border-[var(--ddsa-primary-400)] focus:outline-none"
										bind:value={row.method}
									>
										{#each phaseMethodOptions as opt (opt.value)}
											<option value={opt.value}>{opt.label}</option>
										{/each}
									</select>
								</td>
								<td class="px-1.5 py-1.5">
									<input
										type="number"
										class="w-full rounded border border-[var(--ddsa-secondary-200)] bg-white px-2 py-1 text-xs text-[var(--ddsa-secondary-700)] focus:border-[var(--ddsa-primary-400)] focus:outline-none"
										bind:value={row.value}
										min={0.5}
										step={row.method === 'percentage' ? 0.5 : 1000}
									/>
								</td>
								<td class="px-1 py-1.5">
									{#if multiPhaseRows.length > 1}
										<button
											type="button"
											class="flex h-5 w-5 items-center justify-center rounded text-[var(--ddsa-secondary-400)] hover:bg-red-50 hover:text-[var(--ddsa-error)]"
											onclick={() => removePhaseRow(idx)}
											title="Remove phase"
										>
											<Trash2 size={11} />
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<button
				type="button"
				class="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--ddsa-primary-600)] hover:text-[var(--ddsa-primary-700)]"
				onclick={addPhaseRow}
			>
				<Plus size={12} />
				Add Phase
			</button>
		{/if}

		<!-- (d) Quick strategy pills — hidden in simplified EMI planner mode -->
		{#if filteredStrategies.length > 0 && plannerMode !== 'emi'}
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<span class="text-xs text-[var(--ddsa-secondary-400)]">Quick:</span>
				{#each filteredStrategies as strat (strat.label)}
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-full border border-[var(--ddsa-secondary-200)] bg-white px-3 py-1 text-xs font-medium text-[var(--ddsa-secondary-600)]
							transition-all duration-150
							hover:border-[var(--ddsa-primary-400)] hover:bg-[var(--ddsa-primary-50)] hover:text-[var(--ddsa-primary-700)]
							active:scale-95"
						onclick={() => strat.fill()}
					>
						<span class="text-sm leading-none">{strat.icon}</span>
						{strat.label}
					</button>
				{/each}
			</div>
		{/if}

		<!-- (e) Add / Update Event button -->
		<button
			type="button"
			class="mt-4 w-full rounded-xl bg-[var(--tool-cta-bg)] py-3 text-sm font-bold text-white transition-all hover:bg-[var(--tool-cta-hover)] active:scale-[0.98]"
			onclick={addCustomEvent}
		>
			{editingEventId ? 'Update Event' : '+ Add Event'}
		</button>

		<!-- (f) Active Events — prominent card rows -->
		{#if activeEvents.length > 0}
			<div class="mt-4 border-t border-[var(--dash-border)] pt-3">
				<div class="mb-2 flex items-center gap-2">
					<p class="text-xs font-bold tracking-wider text-[var(--ddsa-secondary-400)] uppercase">
						Active Events ({activeEvents.length})
					</p>
					<button
						onclick={clearAllEvents}
						class="ml-auto text-[10px] text-[var(--ddsa-error)] hover:underline"
					>
						Clear All
					</button>
				</div>
				<div class="flex flex-col gap-2">
					{#each activeEvents as event (event.id)}
						{@const EventIcon = getEventIcon(event)}
						{@const isEditing = editingEventId === event.id}
						<div
							class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all
							{isEditing
								? 'border-[var(--ddsa-primary-400)] bg-[var(--ddsa-primary-50)]'
								: 'border-[var(--ddsa-secondary-200)] bg-white hover:border-[var(--ddsa-primary-200)] dark:border-[var(--ddsa-secondary-600)] dark:bg-[var(--ddsa-secondary-800)]'}"
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ddsa-primary-100)]"
							>
								{#if typeof EventIcon === 'string'}
									<span class="text-sm">{EventIcon}</span>
								{:else}
									<EventIcon size={16} class="text-[var(--ddsa-primary-600)]" />
								{/if}
							</span>
							<span
								class="flex-1 text-sm font-medium text-[var(--ddsa-secondary-700)] dark:text-[var(--ddsa-secondary-200)]"
							>
								{getEventLabel(event)}
							</span>
							<button
								onclick={() => editEvent(event)}
								class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ddsa-primary-500)]
									transition-colors hover:bg-[var(--ddsa-primary-50)]"
								title="Edit"
							>
								<Pencil size={14} />
							</button>
							<button
								onclick={() => removeEvent(event.id)}
								class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ddsa-error)]
									transition-colors hover:bg-red-50"
								title="Remove"
							>
								<Trash2 size={14} />
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- =================================================================== -->
	<!-- SECTION 3: GRAPH (left ~70%) + IMPACT SUMMARY (right ~30%)          -->
	<!-- =================================================================== -->
	<div class="grid gap-4 lg:grid-cols-10">
		<!-- Graph: 7/10 width -->
		<div class="lg:col-span-7">
			{#if chartConfig}
				<div class="h-full rounded-xl border border-[var(--dash-border)] bg-white p-4">
					<h3 class="mb-3 text-sm font-bold text-[var(--ddsa-secondary)]">Balance Over Time</h3>
					<ChartWrapper
						type="line"
						data={chartConfig.data}
						options={chartConfig.options}
						height="380px"
						animated={true}
						animationDuration={1000}
					/>
				</div>
			{/if}
		</div>

		<!-- Impact Summary: 3/10 width, 3 stacked rows -->
		<div class="lg:col-span-3">
			<div class="h-full rounded-xl border border-[var(--dash-border)] bg-white p-4">
				<h3
					class="mb-3 text-xs font-bold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
				>
					Impact Summary
				</h3>
				<div class="space-y-3">
					<!-- Row 1: Interest Saved -->
					<div class="rounded-lg bg-[var(--ddsa-primary-50)] p-3 text-center">
						<p
							class="text-[9px] font-bold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
						>
							Interest Saved
						</p>
						<p class="mt-1 text-xl font-extrabold text-[var(--ddsa-primary-700)]">
							₹{hasEvents
								? formatNumber(Math.round(modifiedResult.summary.interestSavedVsBase))
								: '0'}
						</p>
						{#if hasEvents && modifiedResult.summary.interestSavedVsBase > 0 && baseResult.summary.totalInterestPaid > 0}
							<p class="mt-0.5 text-[10px] text-[var(--ddsa-secondary-400)]">
								{(
									(modifiedResult.summary.interestSavedVsBase /
										baseResult.summary.totalInterestPaid) *
									100
								).toFixed(1)}% reduction
							</p>
						{:else if !hasEvents}
							<p class="mt-0.5 text-[10px] text-[var(--ddsa-secondary-400)]">
								Add strategies to save
							</p>
						{/if}
					</div>

					<!-- Row 2: Tenure Saved -->
					<div class="rounded-lg bg-[var(--ddsa-secondary-50)] p-3 text-center">
						<p
							class="text-[9px] font-bold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
						>
							Tenure Saved
						</p>
						<p class="mt-1 text-xl font-extrabold text-[var(--ddsa-secondary)]">
							{hasEvents ? modifiedResult.summary.tenureSavedMonths : 0}
							<span class="text-sm font-semibold">months</span>
						</p>
						{#if hasEvents && modifiedResult.summary.tenureSavedMonths > 0}
							<p class="mt-0.5 text-[10px] text-[var(--ddsa-secondary-400)]">
								{(modifiedResult.summary.tenureSavedMonths / 12).toFixed(1)} years earlier
							</p>
						{:else if !hasEvents}
							<p class="mt-0.5 text-[10px] text-[var(--ddsa-secondary-400)]">
								Add strategies to reduce
							</p>
						{/if}
					</div>

					<!-- Row 3: Total Part-Payments -->
					<div class="rounded-lg bg-[var(--ddsa-secondary-50)] p-3 text-center">
						<p
							class="text-[9px] font-bold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
						>
							Total Part-Payments
						</p>
						<p class="mt-1 text-xl font-extrabold text-[var(--ddsa-secondary)]">
							₹{hasEvents
								? formatNumber(Math.round(modifiedResult.summary.totalPartPayments))
								: '0'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- =================================================================== -->
	<!-- SECTION 4: DETAILED COMPARISON (full width) + WARNINGS              -->
	<!-- =================================================================== -->
	{#if hasEvents}
		<div>
			<h3
				class="mb-2 text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
			>
				Detailed Comparison
			</h3>
			<ComparisonSummary rows={comparisonRows} />
		</div>
	{/if}

	<!-- Warnings -->
	{#if modifiedResult.warnings.length > 0}
		<div class="space-y-1.5">
			{#each modifiedResult.warnings as warning (warning.atMonth + '-' + warning.code)}
				{@const colorClass = WARNING_COLORS[warning.severity] || WARNING_COLORS.info}
				<div class="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs {colorClass}">
					<span class="mt-0.5 flex-shrink-0">
						{#if warning.severity === 'critical'}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line
									x1="9"
									y1="9"
									x2="15"
									y2="15"
								/></svg
							>
						{:else if warning.severity === 'warning'}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
								/><line x1="12" y1="9" x2="12" y2="13" /><line
									x1="12"
									y1="17"
									x2="12.01"
									y2="17"
								/></svg
							>
						{:else}
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line
									x1="12"
									y1="8"
									x2="12.01"
									y2="8"
								/></svg
							>
						{/if}
					</span>
					<span class="leading-snug">{warning.message}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- =================================================================== -->
	<!-- SECTION 5: AMORTIZATION SCHEDULE (collapsible)                      -->
	<!-- =================================================================== -->
	<div>
		<button
			type="button"
			class="flex w-full items-center justify-between rounded-xl border border-[var(--dash-border)] bg-white px-4 py-3 text-left transition-colors hover:bg-[var(--ddsa-secondary-50)]"
			onclick={() => (showAmortization = !showAmortization)}
		>
			<div class="flex items-center gap-2">
				<span
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ddsa-primary-50)]"
				>
					<IndianRupee size={14} class="text-[var(--ddsa-primary-500)]" />
				</span>
				<span class="text-sm font-bold text-[var(--ddsa-secondary)]">Amortization Schedule</span>
				{#if hasEvents}
					<span class="text-[10px] font-medium text-[var(--ddsa-secondary-400)]">
						({activeEvents.length} event{activeEvents.length !== 1 ? 's' : ''} applied)
					</span>
				{/if}
			</div>
			<span
				class="flex h-5 w-5 items-center justify-center rounded text-[var(--ddsa-secondary-400)] transition-transform duration-200 {showAmortization
					? 'rotate-180'
					: ''}"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none"
					><path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</span>
		</button>

		{#if showAmortization}
			<div class="mt-2">
				<AmortizationTable
					yearlySummary={modifiedYearlySummary}
					showPartPaymentColumn={modifiedResult.summary.totalPartPayments > 0}
					maxHeight="40rem"
				/>
			</div>
		{/if}
	</div>

	<!-- =================================================================== -->
	<!-- SECTION 6: DOWNLOAD AS PDF                                          -->
	<!-- =================================================================== -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4 sm:p-5">
		<div class="flex flex-wrap items-center gap-3">
			<span class="text-sm font-bold text-[var(--ddsa-secondary)]">Download as PDF:</span>
			<button
				type="button"
				class="rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ddsa-secondary-600)] transition-colors hover:border-[var(--ddsa-primary-400)] hover:text-[var(--ddsa-primary-700)]"
			>
				Graph Only
			</button>
			<button
				type="button"
				class="rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ddsa-secondary-600)] transition-colors hover:border-[var(--ddsa-primary-400)] hover:text-[var(--ddsa-primary-700)]"
			>
				Schedule Only
			</button>
			<button
				type="button"
				class="rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ddsa-secondary-600)] transition-colors hover:border-[var(--ddsa-primary-400)] hover:text-[var(--ddsa-primary-700)]"
			>
				Full Report
			</button>
		</div>
	</div>
</div>
