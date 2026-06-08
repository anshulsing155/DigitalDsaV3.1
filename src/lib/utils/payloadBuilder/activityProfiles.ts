/**
 * Multi-select activity profile builders.
 * Maps form activity selections to structured profile objects.
 */

import type { ApplicantPayload } from './types.js';

/**
 * Extracts selected options from a multi-select visible object
 * Filters out false/null values, returns only true selections
 */
export function extractSelectedOptions(
	visibleObj: Record<string, unknown> | undefined
): Record<string, boolean> {
	if (!visibleObj || typeof visibleObj !== 'object') return {};

	const selected: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(visibleObj)) {
		if (value === true) {
			selected[key] = true;
		}
	}
	return selected;
}

/**
 * Checks if object has any true values
 */
export function hasAnySelected(obj: Record<string, boolean> | undefined): boolean {
	if (!obj) return false;
	return Object.values(obj).some((v) => v === true);
}

export function buildSalariedProfile(
	selections: Record<string, boolean>
): ApplicantPayload['salariedProfile'] {
	return {
		worksForReputedOrg: selections['works_for_reputed_org'] ?? false,
		companyHas100PlusEmployees: selections['company_100plus_employees'] ?? false,
		employerIsProprietorship: selections['employer_is_proprietorship_or_partnership'] ?? false,
		employerSharesFinancials: selections['employer_shares_financials'] ?? false,
		isPermanentEmployee: selections['holds_permanent_position'] ?? false,
		twoYearsWithSameEmployer: selections['employed_2plus_years'] ?? false,
		threeYearsTotalExperience: selections['total_experience_3plus_years'] ?? false,
		hasProvidentFund: selections['provides_staff_benefits'] ?? false,
		salaryInBankAccount: selections['salary_credited_regularly'] ?? false,
		receivesBonus: selections['receives_bonus'] ?? false,
		receivesSalarySlip: selections['receives_salary_slip_form16'] ?? false,
		hasHigherEducation: selections['has_professional_qualification'] ?? false
	};
}

export function buildGovernmentProfile(
	selections: Record<string, boolean>
): ApplicantPayload['governmentProfile'] {
	return {
		isCentralGovt: selections['govt_central_employee'] ?? false,
		isDefense: selections['govt_defense_employee'] ?? false,
		isStateGovt: selections['govt_state_employee'] ?? false,
		isPermanent: selections['govt_position_permanent'] ?? false,
		isContractual: selections['govt_position_contractual'] ?? false,
		probationCompleted: selections['govt_probation_completed'] ?? false,
		twoYearsService: selections['govt_more_than_2_years'] ?? false,
		noDisciplinaryAction: selections['govt_no_disciplinary_action'] ?? false,
		nonAccessiblePosting: selections['defense_non_accessible_posting'] ?? false,
		verificationPossible: selections['physical_verification_possible'] ?? false,
		alternateAddressAvailable: selections['alternate_verification_address_available'] ?? false,
		receivesBonus: selections['govt_incentive_bonus'] ?? false,
		pensionEligible: selections['govt_pension_eligible'] ?? false,
		receivesSalarySlip: selections['govt_salary_slip_received'] ?? false,
		filesITR: selections['govt_itr_filed'] ?? false,
		ownsProperty: selections['govt_owns_property'] ?? false,
		hasOtherIncome: selections['govt_other_income_source'] ?? false
	};
}

export function buildBusinessProfile(
	selections: Record<string, boolean>
): ApplicantPayload['businessProfile'] {
	return {
		gstRegistered: selections['gst_registered'] ?? false,
		hasCurrentAccount: selections['has_current_account'] ?? false,
		usesSavingsAccount: selections['has_saving_account'] ?? false,
		filesITRRegularly: selections['itr_filed_regularly'] ?? false,
		profitableLast3Years: selections['profit_last_3_years'] ?? false,
		profitableSinceStart: selections['profit_since_starting'] ?? false,
		majorCashSales: selections['major_cash_sales'] ?? false,
		fewKeyClients: selections['very_few_clients'] ?? false,
		hasCCOD: selections['has_cc_od'] ?? false,
		hasOtherIncome: selections['has_other_income_source'] ?? false,
		hasProfessionalLicense: selections['has_professional_license'] ?? false,
		hasCommercialPremises: selections['has_commercial_premises'] ?? false,
		ownsPremises: selections['owns_premises'] ?? false,
		threeYearsInBusiness: selections['business_3plus_years'] ?? false,
		enrolledWithProfessionalBody: selections['bar_council_registered'] ?? false,
		priorExperience: selections['two_years_experience_before_practice'] ?? false,
		seasonalBusiness: selections['seasonal_business'] ?? false
	};
}

export function buildPensionProfile(
	selections: Record<string, boolean>
): ApplicantPayload['pensionProfile'] {
	return {
		pensionInBankAccount:
			selections['pension_credited_regularly'] ?? selections['pension_credited_monthly'] ?? false,
		pensionRegular:
			selections['pension_credited_regularly'] ?? selections['pension_regular'] ?? false,
		isGovernmentPension: selections['govt_pension'] ?? false,
		isPSUDefensePension: selections['psu_defence_pension'] ?? false,
		isLifelongPension: selections['lifelong_pension'] ?? false,
		isFamilyPension: selections['family_pension'] ?? false,
		continuesBeyond75: selections['pension_continues_75plus'] ?? false,
		receivesPensionSlip: selections['pension_slip_available'] ?? false,
		nationalizedBankAccount: selections['pension_bank_nationalised'] ?? false,
		noPensionLoanDeduction: selections['no_pension_loan_deduction'] ?? false,
		hasOtherIncome: selections['pension_other_income'] ?? false,
		ownsProperty: selections['pension_owns_property'] ?? false,
		spousePensionApplicable: selections['spouse_pension_applicable'] ?? false,
		filesITR: selections['pension_itr_filed'] ?? false,
		verificationPossible: selections['pension_physical_verification'] ?? false
	};
}

export function buildLowCreditReasons(
	selections: Record<string, boolean>
): ApplicantPayload['lowCreditReasons'] {
	return {
		delayedEMI: selections['delayedEMI'] ?? false,
		highCreditUtilization: selections['highCreditUtilization'] ?? false,
		noCreditHistory: selections['noCreditHistory'] ?? false,
		minimumDueOnly: selections['minimumDueOnly'] ?? false,
		multipleEnquiries: selections['multipleEnquiries'] ?? false,
		coApplicantDefault: selections['coApplicantDefault'] ?? false,
		loanDefault: selections['loanDefault'] ?? false,
		onlyUnsecuredLoans: selections['onlyUnsecuredLoans'] ?? false
	};
}
