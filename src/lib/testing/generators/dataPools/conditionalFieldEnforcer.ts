/**
 * Conditional Field Enforcer
 *
 * Enforces showWhen conditional field logic from profileFormConfig.ts
 * on synthetic profile data. Ensures generated data never contains
 * field combinations that the form UI would prevent.
 *
 * Reference: src/lib/config/incomeProfiles/profileFormConfig.ts
 */

import type { SeededRandom } from './namePool.js';

// ============================================================================
// BUSINESS PROFILE CONDITIONAL ENFORCEMENT
// ============================================================================

/**
 * Enforces conditional fields on a business profile object.
 * Modifies the object in place and returns it.
 *
 * Rules from profileFormConfig.ts:
 * - profitable3Years: only when itrFiled === true
 * - hasInventory: only when businessType in ['manufacturing', 'trading']
 * - hasFactory: only when businessType === 'manufacturing'
 * - averageBankBalance: only when hasCurrentAccount === true && hasCcOd === false, min 20000
 * - hasSavingsAccount: only when hasCurrentAccount === false
 */
export function enforceBusinessConditionals(
	profile: Record<string, unknown>,
	businessType: string | undefined,
	rng: SeededRandom
): void {
	// profitable3Years requires itrFiled === true
	if (profile.itrFiled !== true) {
		delete profile.profitable3Years;
	}

	// hasInventory requires businessType in [manufacturing, trading]
	const bt = (businessType ?? '').toLowerCase();
	const isManufacturingOrTrading = bt.includes('manufacturing') || bt.includes('trading');
	if (!isManufacturingOrTrading) {
		delete profile.hasInventory;
	} else if (profile.hasInventory === undefined) {
		profile.hasInventory = rng.boolean(0.6);
	}

	// hasFactory requires businessType === manufacturing
	const isManufacturing = bt.includes('manufacturing');
	if (!isManufacturing) {
		delete profile.hasFactory;
	} else if (profile.hasFactory === undefined) {
		profile.hasFactory = rng.boolean(0.5);
	}

	// averageBankBalance requires hasCurrentAccount === true && hasCcOd === false
	if (profile.hasCurrentAccount !== true || profile.hasCcOd === true) {
		// If hasCurrentAccount is false, may have savings account
		if (profile.hasCurrentAccount === false && profile.hasSavingsAccount === undefined) {
			profile.hasSavingsAccount = rng.boolean(0.7);
		}
	} else {
		// hasCurrentAccount === true && hasCcOd !== true -> averageBankBalance required
		delete profile.hasSavingsAccount;
	}

	// hasSavingsAccount requires hasCurrentAccount === false
	if (profile.hasCurrentAccount !== false) {
		delete profile.hasSavingsAccount;
	}
}

// ============================================================================
// PROFESSIONAL PRACTICE CONDITIONAL ENFORCEMENT
// ============================================================================

/**
 * Enforces conditional fields on a professional profile.
 *
 * Rules from profileFormConfig.ts:
 * - barCouncilChamber: only when professionType === 'Lawyer'
 * - enrolledWithCouncil: depends on profession type
 */
export function enforceProfessionalConditionals(
	profile: Record<string, unknown>,
	professionType: string | undefined
): void {
	// barCouncilChamber only valid for Lawyers
	if (professionType !== 'Lawyer') {
		delete profile.barCouncilChamber;
		delete profile.hasBarCouncilChamber;
	}
}

// ============================================================================
// PENSION CONDITIONAL ENFORCEMENT
// ============================================================================

/**
 * Enforces conditional fields on a pension profile.
 *
 * Rules from profileFormConfig.ts:
 * - pensionRegular: only when pensionCreditedMonthly === true
 * - pensionSlip: only when pensionCreditedMonthly === true
 */
export function enforcePensionConditionals(profile: Record<string, unknown>): void {
	if (profile.pensionCreditedMonthly !== true) {
		delete profile.pensionRegular;
		delete profile.pensionSlip;
	}
}

// ============================================================================
// SALARIED CONDITIONAL ENFORCEMENT
// ============================================================================

/**
 * Enforces conditional fields on a salaried profile.
 *
 * Rules from profileFormConfig.ts:
 * - companyHas3YearsITR: only when employerType in [private_other, private_small]
 *   AND yearsWithEmployer in [lt_6m, 6m_1y, 1_2y]
 * - defencePosting: only when employerType === 'defence'
 * - alternateAddress: only when employerType === 'defence' AND defencePosting === true
 * - pensionEligible: only when employerType in [government, state_government, defence]
 * - employerSharesFinancials: only when employerType === 'private_small'
 * - companySize: only when employerType === 'private_other'
 */
export function enforceSalariedConditionals(specifics: Record<string, unknown>): void {
	const empType = specifics.employerType as string | undefined;

	// employerSharesFinancials only for private_small
	if (empType !== 'private_small') {
		delete specifics.employerSharesFinancials;
	}

	// companySize only for private_other
	if (empType !== 'private_other') {
		delete specifics.companySize;
	}

	// companyHas3YearsITR only for private_other/private_small with short tenure
	const shortTenure = ['lt_6m', '6m_1y', '1_2y'];
	const itrCheckTypes = ['private_other', 'private_small'];
	if (
		!itrCheckTypes.includes(empType ?? '') ||
		!shortTenure.includes((specifics.yearsWithEmployer as string) ?? '')
	) {
		delete specifics.companyHas3YearsITR;
	}

	// Defence-specific
	if (empType !== 'defence') {
		delete specifics.defencePosting;
		delete specifics.alternateAddress;
	} else if (specifics.defencePosting !== true) {
		delete specifics.alternateAddress;
	}

	// Pension eligibility only for government/defence
	const pensionEligibleTypes = ['government', 'state_government', 'defence'];
	if (!pensionEligibleTypes.includes(empType ?? '')) {
		delete specifics.pensionEligible;
	}
}

// ============================================================================
// MASTER ENFORCER
// ============================================================================

/**
 * Master function that dispatches to the correct enforcer based on employment type.
 * Call this after building any profile to clean up invalid field combinations.
 */
export function enforceConditionalFields(
	employmentType: string,
	profileData: Record<string, unknown>,
	options: {
		businessType?: string;
		professionType?: string;
		rng: SeededRandom;
	}
): void {
	if (employmentType === 'Self-employed(Other)') {
		enforceBusinessConditionals(profileData, options.businessType, options.rng);
	} else if (employmentType === 'Self-employed(Professional)') {
		enforceProfessionalConditionals(profileData, options.professionType);
		enforceBusinessConditionals(profileData, undefined, options.rng);
	} else if (employmentType === 'Pensioner') {
		enforcePensionConditionals(profileData);
	} else if (employmentType === 'Salaried(Private)' || employmentType === 'Salaried(Government)') {
		enforceSalariedConditionals(profileData);
	}
}
