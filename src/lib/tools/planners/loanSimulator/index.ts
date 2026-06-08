/**
 * Loan Simulator — Barrel export.
 *
 * Usage:
 *   import { simulateLoan, compareScenarios } from '$lib/tools/planners/loanSimulator';
 *   import { STRATEGY_INTENTS } from '$lib/tools/planners/loanSimulator';
 *   import type { BaseLoanConfig, TimelineEvent } from '$lib/tools/planners/loanSimulator';
 */

// Core engine
export { simulateLoan, compareScenarios } from './engine.js';

// Pre-built strategies and intents
export { STRATEGY_INTENTS, getAllStrategies, createBaseScenario } from './intents.js';

// All types
export type {
	BaseLoanConfig,
	InitialEmiType,
	TimelineEvent,
	EventType,
	MoratoriumEvent,
	RateChangeEvent,
	PartPaymentEvent,
	RecurringPartPaymentEvent,
	ConditionalPartPaymentEvent,
	EmiStepUpEvent,
	EmiStepDownEvent,
	EmiOverrideEvent,
	EmiOneTimeJumpEvent,
	CustomEmiScheduleEvent,
	MultiPhaseStepEvent,
	MultiPhaseStep,
	PartPaymentEffect,
	MoratoriumInterestTreatment,
	MonthSnapshot,
	SimulationResult,
	SimulationSummary,
	SimulationWarning,
	ProcessedEvent,
	SimulationScenario,
	ScenarioComparison,
	UserIntent
} from './types.js';

// Constants
export { EVENT_PRIORITY, WARNING_CODES } from './types.js';
