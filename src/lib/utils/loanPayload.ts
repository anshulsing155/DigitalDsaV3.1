export function buildLoanTransaction(currentAnswers: Record<string, unknown>) {
	const base: Record<string, unknown> = {
		LoanName: currentAnswers?.loanName,
		LoanType: currentAnswers?.loanType,
		propertyIdentified: currentAnswers?.propertyIdentified || 'Yes',
		numberOfDirectorOrApplicant: Number(currentAnswers?.numberOfDirectorOrApplicant) || 1,
		propertyStateName: currentAnswers?.propertyStateName || '',
		propertyCityName: currentAnswers?.propertyCityName || '',
		residenceCityName: currentAnswers?.residenceCityName || '',
		residenceStateName: currentAnswers?.residenceStateName || '',
		residenceOptionSame: currentAnswers?.residenceOptionSame || '',
		ApplicantIsNRI: currentAnswers?.ApplicantIsNRI || '',
		approvedByAuthority: currentAnswers?.approvedByAuthority || 'Yes',
		asPerMap: currentAnswers?.asPerMap || 'Yes',
		ContinuityProof: 'Yes',
		tellUsApplying: currentAnswers?.tellUsApplying || '',
		constructionType: currentAnswers?.constructionType || 'House',
		insurenceDetailsOptions: currentAnswers?.insurenceDetailsOptions || '',
		insurenceLoanAmount: currentAnswers?.insurenceLoanAmount || '',
		ifPropertyRegistered: currentAnswers?.ifPropertyRegistered || 'Yes'
	};

	if (currentAnswers?.loanType == 'Balance Transfer Only') {
		Object.assign(base, {
			// Audit BUG-B (2026-05-28): `newTenure` is a dead form key — removed
			// in V2 but still referenced here. Value resolved to 0 → engine floored
			// to 12 months → false RED across every lender. Correct source is the
			// existing loan's `remainingTenure` (in months, converted to years).
			mortgageYear: currentAnswers?.remainingTenure
				? Math.round(Number(currentAnswers.remainingTenure) / 12)
				: 0,
			approvedByAuthority: 'Yes',
			asPerMap: 'Yes',
			principalOutstanding: currentAnswers?.principalOutstanding || 0,
			selectSingleBank: currentAnswers?.selectSingleBank || '',
			propCost: currentAnswers?.currentPropertyValue || 0,
			propertyType: currentAnswers?.propertyType || currentAnswers?.constructionType || '',
			sixMonthsPassedAfterRegistry: currentAnswers?.sixMonthsPassedAfterRegistry || 'Yes',
			// ── Wired dead keys (Home Loan Redesign Phase 1) ──
			interestRateType: currentAnswers?.interestRateType || '',
			emiBounceHistory: currentAnswers?.emiBounceHistory || '',
			loanDisbursementDate: currentAnswers?.loanDisbursementDate || '',
			marketValue: Number(currentAnswers?.marketValue) || 0
		});
	}

	if (currentAnswers?.loanType == 'Top-up Only') {
		Object.assign(base, {
			PropertyStage: 'Ready To Move',
			UnstableCountries: 'No',
			includedCurrentEMIsAmount: Number(currentAnswers?.includedCurrentEMIsAmount) || 0,
			existingInterestRate: Number(currentAnswers?.existingInterestRate) || 0,
			mortgageYear: Number(currentAnswers?.topUpTenure) || 0,
			topUpTenure: Number(currentAnswers?.topUpTenure) || 0,
			propertyType: currentAnswers?.propertyType || currentAnswers?.constructionType || '',
			selectSingleBank: currentAnswers?.selectSingleBank || '',
			topUpAmount: Number(currentAnswers?.topUpAmount) || 0,
			orignalRemaningTenure: currentAnswers?.remainingTenure || '',
			remainingTenure: currentAnswers?.remainingTenure || '',
			principalOutstanding: currentAnswers?.principalOutstanding || 0,
			propCost: currentAnswers?.currentPropertyValue || 0,
			sanctionAmount: currentAnswers?.sanctionAmount || 0,
			sixMonthsPassedAfterRegistry: currentAnswers?.sixMonthsPassedAfterRegistry || 'Yes',
			checkpropCost: true,
			// ── Wired dead keys (Home Loan Redesign Phase 1) ──
			topUpPurpose: currentAnswers?.topUpPurpose || '',
			emiBounceHistory: currentAnswers?.emiBounceHistory || '',
			loanDisbursementDate: currentAnswers?.loanDisbursementDate || '',
			marketValue: Number(currentAnswers?.marketValue) || 0
		});
	}

	if (currentAnswers?.loanType == 'Balance Transfer With Top-up') {
		Object.assign(base, {
			PropertyStage: 'Ready To Move',
			asPerMap: 'Yes',
			approvedByAuthority: 'Yes',
			propertyType: currentAnswers?.propertyType || currentAnswers?.constructionType || '',
			// Audit BUG-B (2026-05-28): same dead-key issue as BT-Only above.
			// Base BT tenure derives from the existing loan's `remainingTenure`
			// (months → years). The top-up portion has its own `topUpTenure`
			// already mapped below (and engine-side dual-tenure modeling is
			// the BUG-E followup — out of scope for this commit).
			mortgageYear: currentAnswers?.remainingTenure
				? Math.round(Number(currentAnswers.remainingTenure) / 12)
				: 0,
			topUpTenure: Number(currentAnswers?.topUpTenure) || 0,
			topUpAmount: Number(currentAnswers?.topUpAmount) || 0,
			selectSingleBank: currentAnswers?.selectSingleBank || '',
			orignalRemaningTenure: currentAnswers?.remainingTenure || '',
			remainingTenure: currentAnswers?.remainingTenure || '',
			propCost: Number(currentAnswers?.currentPropertyValue) || 0,
			principalOutstanding: Number(currentAnswers?.principalOutstanding) || 0,
			includedCurrentEMIsAmount: Number(currentAnswers?.includedCurrentEMIsAmount) || 0,
			existingInterestRate: Number(currentAnswers?.existingInterestRate) || 0,
			currentEMIs: Number(currentAnswers?.includedCurrentEMIsAmount || 0),
			sanctionAmount: Number(currentAnswers?.sanctionAmount || 0),
			sixMonthsPassedAfterRegistry: currentAnswers?.sixMonthsPassedAfterRegistry || 'Yes',
			// ── Wired dead keys (Home Loan Redesign Phase 1) ──
			interestRateType: currentAnswers?.interestRateType || '',
			emiBounceHistory: currentAnswers?.emiBounceHistory || '',
			topUpPurpose: currentAnswers?.topUpPurpose || '',
			loanDisbursementDate: currentAnswers?.loanDisbursementDate || '',
			marketValue: Number(currentAnswers?.marketValue) || 0
		});
	}

	if (currentAnswers?.propertyIdentified === 'Yes' && currentAnswers?.loanType == 'New Loan') {
		const propertyData: Record<string, unknown> = {
			approvedByAuthority: currentAnswers?.approvedByAuthority || '',
			asPerMap: currentAnswers?.asPerMap || '',

			nameOfBuilder: currentAnswers?.nameOfBuilder || '',
			purchaseType: currentAnswers?.purchaseType || 'Direct Sale',
			PropertyStage: currentAnswers?.PropertyStage || 'Ready To Move',
			purchasedFrom: currentAnswers?.purchasedFrom || '',
			approvedBankForSelectedByUser: currentAnswers?.lendersName || [],
			propertyType: currentAnswers?.propertyType || currentAnswers?.constructionType || '',
			deposit: Number(currentAnswers?.deposit) || 0,
			mortgageYear: Number(currentAnswers?.mortgageYear) || 0,
			propCost: Number(currentAnswers?.dealValue) || Number(currentAnswers?.propCost) || 0,
			RequiredLoanAmount: Number(currentAnswers?.RequiredLoanAmount) || 0,
			differentATSandPV: currentAnswers?.isDifferATSAndPropertyValue || 'Yes',
			ATSReady: currentAnswers?.isATSReady || '',
			ATSvalue: currentAnswers?.ourSuggestionOrBySelf || '',
			agreementSellValue: Number(currentAnswers?.propertyValueAsPerATS) || 0,
			depositAsPerATS: Number(currentAnswers?.downpaymentByOwn) || 0,
			banksName: currentAnswers?.bankName || '',
			typeOfOccupationProperty: currentAnswers?.typeOfOccupationProperty || 'Self-occupied',
			insuranceDetailsOptions: currentAnswers?.insuranceDetailsOptions || '',
			insuranceLoanAmount: Number(currentAnswers?.insuranceLoanAmount) || null,
			// ── Home Loan Redesign: Three-Cost Model + New Signals ──
			marketValue: Number(currentAnswers?.marketValue) || 0,
			registryValue: Number(currentAnswers?.registryValue) || 0,
			auctionPropertyStatus: currentAnswers?.auctionPropertyStatus || '',
			registryTimeline: currentAnswers?.registryTimeline || '',
			priorAssessmentHistory: currentAnswers?.priorAssessmentHistory || ''
		};

		if (currentAnswers?.purchaseType === 'Resale') {
			propertyData.isAnyBuilderDemand = currentAnswers?.isAnyBuilderDemand || 'No';
			propertyData.outstandingAmount = Number(currentAnswers?.outstandingAmount) || 0;
			propertyData.isPropertyOnLoan = currentAnswers?.isPropertyOnLoan || 'No';
			propertyData.selectSingleBank = currentAnswers?.sellerLoanBankName || '';
			propertyData.foreclosureAmount = Number(currentAnswers?.foreclosureAmount) || 0;
			propertyData.isSellerNRI = currentAnswers?.isSellerNRI || 'No';
		}
		Object.assign(base, propertyData);
	} else if (currentAnswers?.propertyIdentified === 'No') {
		Object.assign(base, {
			propertyType: currentAnswers?.propertyType || currentAnswers?.constructionType || '',
			purchaseType: currentAnswers?.purchaseType || 'Direct Sale',
			PropertyStage: currentAnswers?.PropertyStage || 'Ready To Move',
			sanctionType: currentAnswers?.sanctionType || '',
			mortgageYear: Number(currentAnswers?.sanctionTenure) || 0,
			deposit: Number(currentAnswers?.deposit) || 0,
			approvedByAuthority: currentAnswers?.approvedByAuthority || '',
			asPerMap: currentAnswers?.asPerMap || '',
			ApplicantIsNRI: currentAnswers?.ApplicantIsNRI || '',
			tellUsApplying: currentAnswers?.tellUsApplying || '',
			incomeTaxAvailableOneFinancialYear:
				Boolean(currentAnswers?.incomeTaxAvailableOneFinancialYear) || false,
			// ── withPersonalLoan: wired (was hardcoded to "No") ──
			withPersonalLoan: currentAnswers?.withPersonalLoan || 'No',
			priorAssessmentHistory: currentAnswers?.priorAssessmentHistory || ''
		});
	}

	return base;
}

export function buildApplicantDetails(
	applicants: Record<string, unknown>[] | unknown = [],
	tellUsApplying?: string
) {
	const safeApplicants = Array.isArray(applicants) ? applicants : [];
	const safeArray = (value: unknown, fallback: unknown[] = []) =>
		Array.isArray(value) ? value : fallback;

	const mapemploymentType = (empType: unknown): string =>
		typeof empType === 'string' ? empType.replace(/\s+/g, '') : '';

	return safeApplicants.map((applicant: Record<string, unknown>) => {
		const employmentType = applicant?.employmentType as string | undefined;
		const financialsTable = applicant?.financialsTable as Record<string, unknown> | undefined;

		const common = {
			employmentType: mapemploymentType(employmentType),
			fullName: applicant?.fullName,
			title: applicant?.title || 'Mr.',
			age: applicant?.age,
			obligation: applicant?.obligation,
			applicantIsNRI: applicant?.applicantIsNRI || '',
			RelationWithPrimary:
				tellUsApplying === 'Couple' ? 'Spouse' : applicant?.yourRelationship || 'Primary Applicant',
			creditScore: applicant?.creditScore || '',
			incomeTaxAvailableThreeFinancialYear:
				applicant?.incomeTaxAvailableThreeFinancialYear || 'Yes',
			cibilScoreAbove780: applicant?.cibilScoreAbove780,
			existingRoleOfPerson: applicant?.existingRoleOfPerson,
			obligations:
				applicant?.obligation === 'Yes'
					? (applicant?.obligations as Record<string, unknown>[] | undefined)?.map(
							(entry: Record<string, unknown>) => ({ ...entry })
						) || []
					: []
		};

		if (
			employmentType !== 'Self-employed(Businessman)' &&
			employmentType !== 'Self-employed(Professional)' &&
			employmentType !== 'Self-employed(Other)'
		) {
			return {
				...common,
				netIncome: Number(applicant?.netIncome) || 0,
				fixedSalary: Number(applicant?.netIncome) || 0,
				grossIncome: Number(applicant?.grossIncome) || 0,
				monthlyOtherIncome: Number(applicant?.monthlyOtherIncome) || 0
			};
		}

		if (employmentType === 'Self-employed(Businessman)') {
			return {
				...common,
				financialYearDecision: applicant?.financialYearDecision,
				incomeTaxAvailableThreeFinancialYear: applicant?.incomeTaxAvailableThreeFinancialYear,
				financialsTable: financialsTable,
				netProfitArray: safeArray(financialsTable?.netProfitArray, [0, 0, 0]),
				netProfit: safeArray(financialsTable?.netProfitArray, [0, 0, 0]),
				depreciationArray: safeArray(financialsTable?.depreciationArray, [0, 0, 0])
			};
		}

		if (employmentType === 'Self-employed(Other)') {
			return {
				...common,
				financialYearDecision: applicant?.financialYearDecision,
				incomeTaxAvailableThreeFinancialYear:
					applicant?.incomeTaxAvailableThreeFinancialYear || 'Yes',
				financialsTable: financialsTable,
				netProfitArray: safeArray(financialsTable?.netProfitArray, [0, 0, 0]),
				netProfit: safeArray(financialsTable?.netProfitArray, [0, 0, 0])
			};
		}

		if (employmentType === 'Self-employed(Professional)') {
			return {
				...common,
				professionType: applicant?.professionType,
				financialYearDecision: applicant?.financialYearDecision,
				incomeTaxAvailableThreeFinancialYear: applicant?.incomeTaxAvailableThreeFinancialYear,
				financialsTable: financialsTable,
				grossReceiptsArray: safeArray(financialsTable?.turnOver, [0, 0, 0]),
				netProfitArray: safeArray(financialsTable?.netProfitArray, [0, 0, 0]),
				netProfit: safeArray(financialsTable?.netProfitArray, [0, 0, 0])
			};
		}

		return common;
	});
}
