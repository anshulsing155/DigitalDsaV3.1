// export function getLoanTypeOptions(applicants, tellUsWhoIsApplying, personalLoanType, businessLoanType) {
// 	return applicants.map((applicant) => {
// 		const employment = applicant?.employmentType ?? '';

// 		if (tellUsWhoIsApplying !== 'Company (Non-individual entity)') {
// 			if (
// 				['Unemployed', 'Home-maker', 'Salaried(Government)', 'Salaried(Private)'].includes(
// 					employment
// 				)
// 			) {
// 				return personalLoanType;
// 			}

// 			// Merge both arrays uniquely by value
// 			return [
// 				...new Map(
// 					[...personalLoanType, ...businessLoanType].map((item) => [item.value, item])
// 				).values()
// 			];
// 		}

// 		return employment === 'Self-employed(Businessman)'
// 			? businessLoanType
// 			: personalLoanType;
// 	});
// }

import type { Option } from '$lib/types/formTypes';

export function getLoanTypeOptions(
	employment: string,
	tellUsWhoIsApplying: string,
	businessLoanType: Option[],
	personalLoanType: Option[]
): Option[] {
	// Case 1: Not a company
	if (tellUsWhoIsApplying !== 'Company (Non-individual entity)') {
		// Case 1-A: Employment belongs to personal-only category
		if (
			['Others', 'Home-maker', 'Salaried(Government)', 'Salaried(Private)'].includes(employment)
		) {
			return personalLoanType;
		}

		// Case 1-B: Merge personal + business loan types uniquely by value
		return [
			...new Map(
				[...personalLoanType, ...businessLoanType].map((item) => [item.value, item])
			).values()
		];
	}

	// Case 2: When it's a Company
	return employment === 'Self-employed(Businessman)' ? businessLoanType : personalLoanType;
}
