/**
 * Stamp Duty Calculator Engine — Computes stamp duty and registration charges.
 *
 * Stamp duty is a government tax paid when registering a property.
 * The rate varies by:
 * - State (each Indian state has its own stamp duty law)
 * - Gender of buyer (women often get concessions)
 * - Domicile (resident of the same state may get lower rates)
 *
 * Registration charges are additional fees for legally recording the property transfer.
 * They typically include a base fee plus a percentage of the property value.
 *
 * Data source: stampDutyData.json (state-wise rates)
 */

import stampDutyData from './stampDutyData.json';
import type { StampDutyInputs, StampDutyResult } from '$lib/tools/types.js';

// ============================================================================
// TYPE DEFINITIONS FOR THE JSON DATA STRUCTURE
// ============================================================================

/** Structure of registration charges for a single gender */
interface RegistrationChargeEntry {
	/** Base registration fee in INR */
	base: number;
	/** Additional charge as percentage of property value (e.g., 0.5 = 0.5%) */
	additionalCharges: number;
}

/** Structure of a state's stamp duty data */
interface StateStampDutyData {
	sameDomicile: { male: number; female: number; jointOwnership: number };
	differentDomicile: { male: number; female: number; jointOwnership: number };
	registrationCharges: {
		male: RegistrationChargeEntry;
		female: RegistrationChargeEntry;
		jointOwnership: RegistrationChargeEntry;
	};
}

// --- Pre-index the stamp duty data by state for fast lookups ---
const stampDutyByState = stampDutyData as Record<string, StateStampDutyData>;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the list of all states that have stamp duty data available.
 *
 * @returns Sorted array of state names
 */
export function getAvailableStates(): string[] {
	return Object.keys(stampDutyByState).sort();
}

/**
 * Calculate stamp duty and registration charges for a property purchase.
 *
 * @param inputs - Property details (state, value, gender, resident status)
 * @returns Stamp duty amount, registration charges, and total
 */
export function calculateStampDuty(inputs: StampDutyInputs): StampDutyResult | null {
	const { stateName, propertyValue, buyerGender, isResident } = inputs;

	// Step 1: Look up the state's stamp duty data
	const stateData = stampDutyByState[stateName];
	if (!stateData) return null;

	// Guard: propertyValue must be positive — otherwise registrationChargePercentage
	// (line below) would divide by zero and produce Infinity.
	if (!(propertyValue > 0)) return null;

	// Step 2: Determine the stamp duty percentage based on domicile and gender
	// "Same domicile" means the buyer lives in the same state as the property
	const domicileData = isResident ? stateData.sameDomicile : stateData.differentDomicile;

	// Map our gender values to the JSON data keys
	const genderKey =
		buyerGender === 'Male' ? 'male' : buyerGender === 'Female' ? 'female' : 'jointOwnership';
	const stampDutyPercentage = domicileData[genderKey];

	// Step 3: Calculate stamp duty amount
	// Stamp duty = property value × stamp duty rate ÷ 100
	const stampDutyAmount = (propertyValue * stampDutyPercentage) / 100;

	// Step 4: Calculate registration charges
	// Registration = base fee + (property value × additional charge rate ÷ 100)
	const registrationData = stateData.registrationCharges[genderKey];
	const registrationChargeAmount =
		registrationData.base + (propertyValue * registrationData.additionalCharges) / 100;

	const registrationChargePercentage = (registrationChargeAmount / propertyValue) * 100;

	// Step 5: Calculate total
	const totalCharges = stampDutyAmount + registrationChargeAmount;

	return {
		stampDutyAmount: Math.round(stampDutyAmount),
		stampDutyPercentage,
		registrationChargeAmount: Math.round(registrationChargeAmount),
		registrationChargePercentage,
		totalCharges: Math.round(totalCharges)
	};
}
