let userData = {
	loanTransaction: {
		LoanName: 'Loan Against Property',
		LoanType: 'Balance Transfer With Top-up',
		propertyStateName: 'Maharashtra',
		propertyCityName: 'Nagpur',
		applicantResidingInProperty: 'Yes',
		ifPropertyRegistered: 'Yes',
		approvedByAuthority: 'Yes',
		asPerMap: 'Yes',
		ApplicantIsNRI: 'No',
		propertyType: 'Lease Hold',
		categoryOfProperty: 'Residential',
		constructionType: 'House / Villa',
		typeOfOccupationProperty: 'Self-occupied',
		tellUsApplying: 'Family',
		principalOutstanding: 4000000,
		existingInterestRate: 8,
		remainingTenure: 120,
		banksName: 'Godrej Housing Finance',
		showResultOfBtWithTopUp: 'Yes',
		includedCurrentEMIsAmount: 48500,
		insuranceDetailsOptions: 'No',
		insuranceLoanAmount: null,
		propCost: 10000000,
		topUpAmount: 1000000,
		mortgageYear: 14
	},
	allApplicantDetails: [
		{
			title: 'Mr.',
			fullName: 'Alok',
			existingRoleOfPerson: 'For loan repayment only',
			employmentType: 'Salaried(Government)',
			selectedAge: 35,
			netIncome: 100000, // Changed from monthlyIncome
			monthlyOtherIncome: 0,
			obligations: [],
			creditScore: '800'
		},
		{
			title: 'Mr.',
			fullName: 'Aman',
			existingRoleOfPerson: 'Loan repayment and having name on the property papers',
			employmentType: 'Salaried(Private)',
			PFdeducted: 'Yes',
			selectedAge: 36,
			RelationWithPrimary: 'Sister',
			grossIncome: 100000, // Changed from monthlyIncome
			monthlyOtherIncome: 0,
			obligations: [],
			creditScore: '800'
		},
		{
			title: 'Mr.',
			fullName: 'Amar',
			existingRoleOfPerson: 'Loan repayment and having name on the property papers',
			employmentType: 'Salaried(Private)',
			PFdeducted: 'Yes',
			selectedAge: 36,
			RelationWithPrimary: 'Sister',
			grossIncome: 100000, // Changed from monthlyIncome
			monthlyOtherIncome: 0,
			creditScore: '800',
			obligations: [
				{
					id: 'sample-obl-1',
					obligationType: 'term_loan',
					loanType: 'Loan Against Property',
					bankName: 'Dhanlaxmi Bank',
					selectedToClose: 'Keep Running',
					emi: '1200',
					totalLimit: '',
					tenure: '8',
					interestRate: '21'
				},
				{
					id: 'sample-obl-2',
					obligationType: 'term_loan',
					loanType: 'Business Loan - Unsecured',
					bankName: 'Bank of Baroda',
					selectedToClose: 'Keep Running',
					emi: '14000',
					totalLimit: '',
					tenure: '8',
					interestRate: '8'
				}
			]
		}
	]
};
