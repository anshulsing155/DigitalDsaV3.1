/**
 * Application Form Utilities — shared validation, formatting, and submission
 * for the 7 loan application pages in (Application)/.
 */

/**
 * Format a number as Indian currency (₹12,34,567).
 * Returns 'N/A' if the amount is falsy.
 */
export function formatLoanCurrency(amount: number | undefined): string {
	if (!amount) return 'N/A';
	return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Validate a form field value for number or text format.
 * Returns an error message string, or null if valid.
 */
export function getValidationErrorMessage(
	val: string | number | null | undefined,
	uiType: 'number' | 'text'
): string | null {
	if (!val) return null;
	const strVal = String(val);

	if (uiType === 'number') {
		if (!/^\d*$/.test(strVal)) return 'Value must be digits only';
		if (strVal.length < 6) return 'Number must be at least 6 digits long';
		if (strVal.length > 15) return 'Number must not exceed 15 digits';
	}

	if (uiType === 'text') {
		if (!/^[A-Za-z ]+$/.test(strVal)) return 'Name can only contain letters and spaces';
		if (strVal.length < 3) return 'Name must be at least 3 characters long';
		if (strVal.length > 100) return 'Name must not exceed 100 characters';
	}

	return null;
}

/** Base fields present in all application forms */
export interface ApplicationFormBase {
	fullName: string;
	email: string;
	phone: string;
	alternatePhone: string;
	panCard: string;
	aadharCard: string;
	loanAmount: string;
	tenure: string;
	termsAccepted: boolean;
}

/** Extended fields for secured/personal loans that include employment */
export interface ApplicationFormWithEmployment extends ApplicationFormBase {
	employmentType: string;
	monthlyIncome: string;
}

/**
 * Validate required form fields.
 * Returns an array of missing field names.
 *
 * @param data - The form data object
 * @param includeEmployment - Whether to validate employment fields (false for Business/Professional)
 */
export function validateApplicationForm(
	data: ApplicationFormBase | ApplicationFormWithEmployment,
	includeEmployment: boolean
): string[] {
	const missing: string[] = [];

	if (!data.fullName) missing.push('Full Name');
	if (!data.email) missing.push('Email');
	if (!data.phone) missing.push('Phone Number');
	if (!data.panCard) missing.push('PAN Card');
	if (!data.aadharCard) missing.push('Aadhar Card');

	if (includeEmployment && 'employmentType' in data) {
		if (!data.employmentType) missing.push('Employment Type');
		if (!data.monthlyIncome) missing.push('Monthly Income');
	}

	if (!data.loanAmount) missing.push('Desired Loan Amount');
	if (!data.tenure) missing.push('Preferred Tenure');
	if (!data.termsAccepted) missing.push('Terms and Conditions');

	return missing;
}

/** Config for each loan type's application page */
export interface LoanApplicationConfig {
	loanType: string;
	loanDisplayName: string;
	storageKey: string;
	offersRoute: string;
	hasEmploymentFields: boolean;
}

/** Application page configurations keyed by loan type */
export const LOAN_APP_CONFIGS: Record<string, LoanApplicationConfig> = {
	home: {
		loanType: 'Home Loan',
		loanDisplayName: 'Home',
		storageKey: 'selectedHomeLoanOffer',
		offersRoute: '/home-loan-offers',
		hasEmploymentFields: true
	},
	lap: {
		loanType: 'LAP',
		loanDisplayName: 'LAP',
		storageKey: 'selectedLAPOffer',
		offersRoute: '/lap-offers',
		hasEmploymentFields: true
	},
	plot: {
		loanType: 'Plot Loan',
		loanDisplayName: 'Plot',
		storageKey: 'selectedHomeLoanOffer', // Uses same key as home (existing behavior)
		offersRoute: '/plot-offers',
		hasEmploymentFields: true
	},
	personal: {
		loanType: 'Personal Loan',
		loanDisplayName: 'Personal',
		storageKey: 'selectedPersonalLoanOffer',
		offersRoute: '/personal-loan-offers',
		hasEmploymentFields: true
	},
	business: {
		loanType: 'Business Loan',
		loanDisplayName: 'Business',
		storageKey: 'selectedBusinessLoanOffer',
		offersRoute: '/business-offers',
		hasEmploymentFields: false
	},
	professional: {
		loanType: 'Professional Loan',
		loanDisplayName: 'Professional',
		storageKey: 'selectedProfessionalLoanOffer',
		offersRoute: '/professional-offers',
		hasEmploymentFields: false
	}
};
