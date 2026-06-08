/**
 * Archetype Helpers - Builds profile sub-objects for each employment type
 *
 * All boolean fields are explicitly set (never undefined) to prevent
 * test failures from missing booleans.
 */

import type {
	ApplicantPayload,
	LoanTransactionPayload,
	ObligationEntry,
	FinancialsData
} from '$lib/utils/payloadBuilder.js';
import type { ArchetypeTemplate } from './archetypeTemplates.js';
import type { CityEntry } from '../dataPools/cityPool.js';
import { getPropertyCostRange } from '../dataPools/cityPool.js';
import {
	SALARIED_PRIVATE_INCOME,
	SALARIED_GOVT_INCOME,
	PROFESSIONAL_INCOME,
	BUSINESS_INCOME,
	PROFESSION_MULTIPLIER,
	PENSION_INCOME,
	DEPRECIATION_RANGE,
	BANK_BALANCE_MULTIPLIER
} from '../dataPools/incomePool.js';
import { generateObligations, generateBtDetails } from '../dataPools/obligationPool.js';
import { pickName } from '../dataPools/namePool.js';
import {
	buildSalariedIncomeEntries,
	buildProfessionalIncomeEntries,
	buildBusinessIncomeEntries,
	buildPensionIncomeEntries,
	buildRentalIncomeEntry,
	buildFreelanceConsultingEntry,
	buildDirectorCompanyEntry
} from '../dataPools/incomeEntryPool.js';
import { enforceConditionalFields } from '../dataPools/conditionalFieldEnforcer.js';

export interface SeededRandom {
	next(): number;
	range(min: number, max: number): number;
	choice<T>(arr: readonly T[]): T;
	boolean(probability?: number): boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// SALARIED PROFILE BUILDERS
// ════════════════════════════════════════════════════════════════════════════

export function buildSalariedProfile(
	rng: SeededRandom,
	tier: 1 | 2 | 3
): NonNullable<ApplicantPayload['salariedProfile']> {
	const isPrime = tier === 1;
	return {
		worksForReputedOrg: isPrime ? true : rng.boolean(0.5),
		companyHas100PlusEmployees: isPrime ? true : rng.boolean(0.6),
		employerIsProprietorship: isPrime ? false : rng.boolean(0.2),
		employerSharesFinancials: isPrime ? true : rng.boolean(0.7),
		isPermanentEmployee: isPrime ? true : rng.boolean(0.85),
		twoYearsWithSameEmployer: isPrime ? true : rng.boolean(0.7),
		threeYearsTotalExperience: isPrime ? true : rng.boolean(0.75),
		hasProvidentFund: isPrime ? true : rng.boolean(0.85),
		salaryInBankAccount: true,
		receivesBonus: isPrime ? true : rng.boolean(0.6),
		receivesSalarySlip: true,
		hasHigherEducation: isPrime ? true : rng.boolean(0.7)
	};
}

export function buildGovernmentProfile(
	rng: SeededRandom,
	tier: 1 | 2 | 3
): NonNullable<ApplicantPayload['governmentProfile']> {
	const type = rng.choice(['central', 'defense', 'state'] as const);
	return {
		isCentralGovt: type === 'central',
		isDefense: type === 'defense',
		isStateGovt: type === 'state',
		isPermanent: tier === 1 ? true : rng.boolean(0.9),
		isContractual: tier === 1 ? false : rng.boolean(0.1),
		probationCompleted: true,
		twoYearsService: tier === 1 ? true : rng.boolean(0.8),
		noDisciplinaryAction: true,
		nonAccessiblePosting: type === 'defense' ? rng.boolean(0.3) : false,
		verificationPossible: true,
		alternateAddressAvailable: type === 'defense' ? rng.boolean(0.4) : false,
		receivesBonus: rng.boolean(0.7),
		pensionEligible: true,
		receivesSalarySlip: true,
		filesITR: tier === 1 ? true : rng.boolean(0.8),
		ownsProperty: rng.boolean(0.6),
		hasOtherIncome: rng.boolean(0.3)
	};
}

export function buildBusinessProfile(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	options?: { hasProfessionalLicense?: boolean; hasCommercialPremises?: boolean }
): NonNullable<ApplicantPayload['businessProfile']> {
	return {
		gstRegistered: tier <= 2 ? true : rng.boolean(0.7),
		hasCurrentAccount: tier === 1 ? true : rng.boolean(0.85),
		usesSavingsAccount: tier === 1 ? false : rng.boolean(0.2),
		filesITRRegularly: tier <= 2 ? true : rng.boolean(0.7),
		profitableLast3Years: tier <= 2 ? true : rng.boolean(0.6),
		profitableSinceStart: tier === 1 ? true : rng.boolean(0.5),
		majorCashSales: tier === 1 ? false : rng.boolean(0.3),
		fewKeyClients: rng.boolean(0.3),
		hasCCOD: rng.boolean(0.4),
		hasOtherIncome: rng.boolean(0.3),
		hasProfessionalLicense: options?.hasProfessionalLicense ?? false,
		hasCommercialPremises: options?.hasCommercialPremises ?? rng.boolean(0.6),
		ownsPremises: rng.boolean(0.3),
		threeYearsInBusiness: tier <= 2 ? true : rng.boolean(0.6),
		enrolledWithProfessionalBody: options?.hasProfessionalLicense ?? false,
		priorExperience: tier === 1 ? true : rng.boolean(0.7),
		seasonalBusiness: false
	};
}

export function buildPensionProfile(
	rng: SeededRandom,
	tier: 1 | 2 | 3
): NonNullable<ApplicantPayload['pensionProfile']> {
	const pensionType = rng.choice(['govt', 'psu', 'defense'] as const);
	return {
		pensionInBankAccount: true,
		pensionRegular: true,
		isGovernmentPension: pensionType === 'govt',
		isPSUDefensePension: pensionType === 'psu' || pensionType === 'defense',
		isLifelongPension: true,
		isFamilyPension: rng.boolean(0.15),
		continuesBeyond75: pensionType === 'govt' || pensionType === 'defense',
		receivesPensionSlip: true,
		nationalizedBankAccount: true,
		noPensionLoanDeduction: tier === 1 ? true : rng.boolean(0.8),
		hasOtherIncome: rng.boolean(0.4),
		ownsProperty: rng.boolean(0.7),
		spousePensionApplicable: rng.boolean(0.5),
		filesITR: tier === 1 ? true : rng.boolean(0.8),
		verificationPossible: true
	};
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIALS BUILDER
// ════════════════════════════════════════════════════════════════════════════

export function buildFinancials(
	rng: SeededRandom,
	empType: string,
	tier: 1 | 2 | 3,
	multiplier: number = 1
): FinancialsData {
	const isProf = empType === 'Self-employed(Professional)';
	const incomeConfig = isProf ? PROFESSIONAL_INCOME[tier] : BUSINESS_INCOME[tier];

	const baseGross = rng.range(incomeConfig.grossReceipts[0], incomeConfig.grossReceipts[1]);
	const gross1 = Math.round(baseGross * multiplier);
	const gross2 = Math.round(gross1 * (1 + rng.range(5, 15) / 100));
	const gross3 = Math.round(gross2 * (1 + rng.range(5, 15) / 100));

	const margin =
		rng.range(
			Math.round(incomeConfig.profitMargin[0] * 100),
			Math.round(incomeConfig.profitMargin[1] * 100)
		) / 100;

	const net1 = Math.round(gross1 * margin);
	const net2 = Math.round(gross2 * margin);
	const net3 = Math.round(gross3 * margin);

	const depRate =
		rng.range(Math.round(DEPRECIATION_RANGE[0] * 100), Math.round(DEPRECIATION_RANGE[1] * 100)) /
		100;

	return {
		grossReceipts: [gross1, gross2, gross3],
		netProfit: [net1, net2, net3],
		depreciation: [
			Math.round(gross1 * depRate),
			Math.round(gross2 * depRate),
			Math.round(gross3 * depRate)
		],
		itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
	};
}

// ════════════════════════════════════════════════════════════════════════════
// LOAN TRANSACTION BUILDER
// ════════════════════════════════════════════════════════════════════════════

export function buildLoanTransaction(
	rng: SeededRandom,
	archetype: ArchetypeTemplate,
	city: CityEntry
): LoanTransactionPayload {
	const UNSECURED = ['Personal Loan', 'Business Loan', 'Professional Loan'];
	const isUnsecured = UNSECURED.includes(archetype.loanName);

	const tx: LoanTransactionPayload = {
		loanName: archetype.loanName,
		loanType: archetype.loanType,
		numberOfApplicants: archetype.numberOfApplicants,
		loanAmount: 0,
		tenureYears: 0
	};

	// Plot Loan variants live on `loanVariant` post-rename (ADR-0020); fold
	// through when the archetype declares it. Added S210 audit.
	if (archetype.loanVariant) {
		tx.loanVariant = archetype.loanVariant;
	}

	if (archetype.applicationStructure) {
		tx.applicationStructure = archetype.applicationStructure;
	}

	if (!isUnsecured) {
		tx.propertyIdentified = true;
		tx.propertyState = city.state;
		tx.propertyCity = city.city;
		tx.propertyType = archetype.propertyType || 'Flat';
		tx.constructionStatus = archetype.constructionStatus || 'Ready to Move';

		if (archetype.propertyStage) {
			tx.propertyStage = archetype.propertyStage;
		}
		if (archetype.purchaseType) {
			tx.purchaseType = archetype.purchaseType;
		}

		tx.propertyComplianceStatus =
			archetype.propertyAreaType === 'OLD_MUNICIPAL'
				? 'authorized_not_per_plan'
				: 'fully_compliant';

		if (tx.constructionStatus === 'Ready to Move') {
			tx.propertyRegistered = true;
		}

		const costRange = getPropertyCostRange(city, tx.propertyType || 'Flat');
		const propertyCost = roundToLakh(rng.range(costRange[0], costRange[1]));
		tx.propertyCost = propertyCost;

		// LTV varies by loan type
		let ltvPct: number;
		if (archetype.loanName === 'Loan Against Property') {
			ltvPct = rng.range(40, 60);
		} else if (archetype.loanName === 'Plot Loan') {
			ltvPct = rng.range(65, 80);
		} else {
			// Home loan
			if (propertyCost <= 3000000) ltvPct = rng.range(80, 90);
			else if (propertyCost <= 7500000) ltvPct = rng.range(75, 85);
			else ltvPct = rng.range(70, 80);
		}

		const loanAmount = roundToLakh(Math.round((propertyCost * ltvPct) / 100));
		tx.loanAmount = loanAmount;
		tx.downPayment = propertyCost - loanAmount;

		// Tenure
		tx.tenureYears = rng.range(10, 25);

		// LAP-specific fields
		if (archetype.loanName === 'Loan Against Property') {
			const area = rng.range(800, 3000);
			tx.carpetArea = area;
			tx.carpetAreaUnit = 'Feet';
			tx.carpetAreaRaw = area;
			tx.propertyAreaType = archetype.propertyAreaType || 'PLANNED_AUTHORITY';
			tx.ocCcAvailable = archetype.ocCcAvailable || 'BOTH';
			tx.municipalApproval = archetype.municipalApproval || 'APPROVED';
			tx.loanPurpose = archetype.loanPurpose || 'PERSONAL_NEEDS';
			// LAP legal fields
			tx.propertyAcquisitionMethod = 'PURCHASED';
			tx.originalDocumentsAvailable = 'YES';
			tx.ownershipChainComplete = 'YES';
			tx.noLegalDispute = 'YES';
			tx.encumbranceCertificateVerified = 'YES';
		}

		// ── E2E coverage: property compliance & legal (all secured loans) ──
		tx.priorAssessmentHistory = rng.choice(['first_assessment', 'assessed_1_2', 'assessed_3_plus']);
		tx.propertyUsageIntent = rng.choice(['SELF_USE', 'INVESTMENT', 'RENTAL']);
		tx.auctionPropertyStatus = rng.boolean(0.05) ? 'AUCTION_AWARE' : 'STANDARD';
		tx.titleChainStatus = rng.boolean(0.9) ? 'CLEAR' : 'PARTIAL_GAPS';
		tx.encumbranceCertStatus = rng.boolean(0.9) ? 'CLEAR' : 'ENCUMBERED';
		tx.successionStatus = rng.boolean(0.85) ? 'NOT_INHERITED' : 'SUCCESSION_COMPLETE';
		tx.revenueRecordMutation = rng.boolean(0.8) ? 'MUTATED' : 'MUTATION_PENDING';

		// Home Loan specific: deal financials
		if (archetype.loanName === 'Home Loan') {
			tx.propertyAreaType = archetype.propertyAreaType || 'PLANNED_AUTHORITY';
			tx.marketValue = Math.round((propertyCost * rng.range(100, 115)) / 100);
			tx.registryValue = Math.round((propertyCost * rng.range(90, 100)) / 100);
			tx.registryTimeline = rng.choice(['WITHIN_3_MONTHS', 'WITHIN_6_MONTHS', 'ALREADY_DONE']);
			tx.reraRegistrationStatus = rng.boolean(0.7) ? 'REGISTERED' : 'NOT_REGISTERED';
			tx.documentationReadiness = ['title_deed', 'sale_agreement', 'ec'];
		}

		// BT fields
		if (archetype.btLoan) {
			const bt = generateBtDetails(rng, propertyCost);
			tx.currentBank = bt.currentBank;
			tx.principalOutstanding = bt.principalOutstanding;
			tx.currentInterestRate = bt.currentInterestRate;
			tx.remainingTenure = bt.remainingTenure;
			tx.currentEMI = bt.currentEMI;
			tx.sixMonthsAfterRegistry = bt.sixMonthsAfterRegistry;
			tx.currentPropertyValue = bt.currentPropertyValue;
			tx.loanVintage = bt.loanVintage;
			tx.repaymentTrack = bt.repaymentTrack;
			// BT enrichment for E2E
			tx.interestRateType = rng.boolean(0.7) ? 'FLOATING' : 'FIXED';
			tx.emiBounceHistory = rng.boolean(0.8) ? '0' : String(rng.range(1, 3));
			tx.nocFromPreviousLender = 'YES';
		}

		// Top-up fields
		if (archetype.topUp) {
			tx.topUpAmount = roundToLakh(rng.range(500000, 2000000));
			tx.topUpTenure = rng.range(5, 15);
		}
	} else {
		// Unsecured loans
		if (archetype.loanName === 'Personal Loan') {
			tx.loanAmount = roundToLakh(rng.range(200000, 3000000));
			tx.tenureYears = rng.range(2, 5);
		} else if (archetype.loanName === 'Business Loan') {
			tx.loanAmount = roundToLakh(rng.range(500000, 20000000));
			tx.tenureYears = rng.range(3, 10);
		} else {
			// Professional Loan
			tx.loanAmount = roundToLakh(rng.range(500000, 8000000));
			tx.tenureYears = rng.range(3, 7);
		}
		// Unsecured common E2E fields
		tx.urgencyLevel = rng.choice(['STANDARD', 'URGENT', 'FLEXIBLE']);
		tx.existingBankRelationship = rng.boolean(0.6) ? 'YES' : 'NO';
	}

	// NRI flag
	if (archetype.isNRI) {
		tx.hasNRIApplicant = true;
	}

	return tx;
}

// ════════════════════════════════════════════════════════════════════════════
// APPLICANT BUILDER
// ════════════════════════════════════════════════════════════════════════════

export function buildApplicant(
	rng: SeededRandom,
	archetype: ArchetypeTemplate,
	city: CityEntry,
	index: number,
	profileId: string
): ApplicantPayload {
	const tier = city.tier;
	const isCoApplicant = index > 0;
	const isPrimary = !isCoApplicant;

	// Company applicant
	if (archetype.isCompany && isPrimary) {
		return buildCompanyApplicant(rng, archetype, city, profileId);
	}

	// Determine gender
	let gender: string;
	if (isCoApplicant && archetype.coApplicantType === 'spouse') {
		gender = 'Female';
	} else if (isCoApplicant && archetype.coApplicantType === 'son') {
		// son/daughter — randomize gender
		gender = rng.boolean(0.5) ? 'Male' : 'Female';
	} else if (isCoApplicant && archetype.coApplicantType === 'sibling') {
		gender = rng.boolean(0.5) ? 'Male' : 'Female';
	} else if (isCoApplicant && archetype.coApplicantType === 'in-law') {
		gender = rng.boolean(0.5) ? 'Male' : 'Female';
	} else {
		gender = rng.boolean(0.6) ? 'Male' : 'Female';
	}

	const genderLower = gender.toLowerCase() as 'male' | 'female';
	const name = pickName(rng, genderLower, archetype.regionHint);

	// Age
	let age: number;
	if (isCoApplicant && archetype.coApplicantType === 'spouse') {
		const primaryAge = rng.range(archetype.ageRange[0], archetype.ageRange[1]);
		age = Math.max(23, primaryAge - rng.range(0, 5));
	} else if (isCoApplicant && archetype.coApplicantType === 'son') {
		age = rng.range(23, 30);
	} else {
		age =
			archetype.ageRange[0] === archetype.ageRange[1]
				? archetype.ageRange[0]
				: rng.range(archetype.ageRange[0], archetype.ageRange[1]);
	}

	// Marital status
	let maritalStatus: string;
	if (isCoApplicant && archetype.coApplicantType === 'spouse') {
		maritalStatus = 'Married';
	} else if (age < 26) {
		maritalStatus = rng.choice(['Single', 'Single', 'Married'] as const);
	} else if (age < 40) {
		maritalStatus = rng.choice(['Single', 'Married', 'Married', 'Married'] as const);
	} else {
		maritalStatus = rng.choice(['Married', 'Married', 'Married', 'Divorced'] as const);
	}

	// Title
	let title: string;
	if (archetype.professionType?.includes('Doctor')) {
		title = 'Dr.';
	} else if (gender === 'Male') {
		title = 'Mr.';
	} else {
		title = maritalStatus === 'Married' ? 'Mrs.' : 'Ms.';
	}

	// Employment type for co-applicant
	let empType = archetype.employmentType;
	if (isCoApplicant) {
		if (archetype.coApplicantType === 'son') {
			empType = 'Salaried(Private)';
		} else if (archetype.coApplicantType === 'spouse') {
			empType = rng.boolean(0.7) ? 'Salaried(Private)' : archetype.employmentType;
		} else if (archetype.coApplicantType === 'sibling') {
			empType = rng.boolean(0.6) ? 'Salaried(Private)' : archetype.employmentType;
		} else if (archetype.coApplicantType === 'in-law') {
			empType = rng.boolean(0.5) ? 'Pensioner' : 'Salaried(Private)';
		} else if (archetype.coApplicantType === 'parent') {
			empType = rng.boolean(0.4) ? 'Pensioner' : 'Salaried(Private)';
		}
	}

	// Unemployed special handling
	if (empType === 'Unemployed' && isPrimary) {
		const applicant: ApplicantPayload = {
			applicantType: 'Individual',
			title,
			fullName: `${name.first} ${name.last}`,
			age,
			gender,
			maritalStatus,
			roleInApplication: 'Primary',
			residenceType: rng.choice(['Rented', 'Family Owned'] as const),
			employmentType: 'Unemployed',
			creditScore: rng.range(archetype.cibilRange[0], archetype.cibilRange[1]),
			hasExistingObligations: false
		};
		return applicant;
	}

	// CIBIL
	const cibil =
		archetype.cibilRange[0] === archetype.cibilRange[1]
			? archetype.cibilRange[0]
			: rng.range(archetype.cibilRange[0], archetype.cibilRange[1]);

	const applicant: ApplicantPayload = {
		applicantType: 'Individual',
		title,
		fullName: `${name.first} ${name.last}`,
		age,
		gender,
		maritalStatus,
		roleInApplication: isPrimary ? 'Primary' : 'Co-applicant',
		residenceType: rng.choice(['Owned', 'Rented', 'Family Owned'] as const),
		employmentType: empType,
		creditScore: isCoApplicant ? rng.range(700, 790) : cibil,
		hasExistingObligations: false
	};

	// Co-applicant relationship — gender-aware from form's Relationship type
	if (isCoApplicant) {
		if (archetype.coApplicantType === 'spouse') {
			// Spouse relationship depends on co-applicant gender
			applicant.relationshipWithPrimary = gender === 'Female' ? 'Wife' : 'Husband';
		} else if (archetype.coApplicantType === 'son') {
			applicant.relationshipWithPrimary = gender === 'Female' ? 'Daughter' : 'Son';
		} else if (archetype.coApplicantType === 'parent') {
			applicant.relationshipWithPrimary = gender === 'Female' ? 'Mother' : 'Father';
		} else if (archetype.coApplicantType === 'sibling') {
			applicant.relationshipWithPrimary = gender === 'Female' ? 'Sister' : 'Brother';
		} else if (archetype.coApplicantType === 'in-law') {
			applicant.relationshipWithPrimary = gender === 'Female' ? 'Mother-in-law' : 'Father-in-law';
		} else if (archetype.coApplicantType === 'business-partner') {
			applicant.relationshipWithPrimary = 'Not in Blood Relation';
		}
	}

	// NRI flag
	if (archetype.isNRI && isPrimary) {
		applicant.isNRI = true;
	}

	// Employment profile + income (incomeEntries[] + legacy backfill)
	const incMultiplier = (archetype.incomeMultiplier || 1) * city.salaryMultiplier;

	if (empType === 'Salaried(Private)') {
		applicant.salariedProfile = buildSalariedProfile(rng, tier);
		// Structured income entries (matches form output)
		applicant.incomeEntries = buildSalariedIncomeEntries(rng, tier, empType, incMultiplier);
		// Legacy backfill (matches payloadBuilder.ts:1300-1314)
		const salEntry = applicant.incomeEntries[0];
		applicant.grossIncome = salEntry.income.grossMonthlySalary as number;
		applicant.netIncome = salEntry.income.netMonthlySalary as number;
		if (rng.boolean(0.25)) {
			applicant.monthlyOtherIncome = rng.range(5000, 20000);
		}
	} else if (empType === 'Salaried(Government)') {
		applicant.governmentProfile = buildGovernmentProfile(rng, tier);
		applicant.incomeEntries = buildSalariedIncomeEntries(rng, tier, empType, incMultiplier);
		const salEntry = applicant.incomeEntries[0];
		applicant.grossIncome = salEntry.income.grossMonthlySalary as number;
		applicant.netIncome = salEntry.income.netMonthlySalary as number;
	} else if (empType === 'Self-employed(Professional)') {
		const profType =
			archetype.professionType ||
			rng.choice([
				'MBBS Doctor',
				'Chartered Accountant(CA)',
				'Architect',
				'Lawyer',
				'Company Secretary'
			] as const);
		applicant.professionType = profType;

		if (profType === 'Lawyer' && archetype.hasBarCouncilChamber !== false) {
			applicant.hasBarCouncilChamber = rng.boolean(0.7);
		}

		const profMult = PROFESSION_MULTIPLIER[profType] || 1;
		applicant.businessProfile = buildBusinessProfile(rng, tier, {
			hasProfessionalLicense: true,
			hasCommercialPremises: rng.boolean(0.7)
		});
		applicant.businessProfile.enrolledWithProfessionalBody = true;

		const vintageYears =
			tier === 1 ? rng.range(5, 12) : tier === 2 ? rng.range(3, 6) : rng.range(1, 4);
		if (applicant.businessProfile.gstRegistered) {
			const year = 2024 - vintageYears;
			const month = rng.range(1, 12);
			applicant.gstRegistrationDate = `${year}-${String(month).padStart(2, '0')}`;
		}

		// Structured income entries
		const lastName = applicant.fullName.split(' ').pop() ?? 'Sharma';
		applicant.incomeEntries = buildProfessionalIncomeEntries(rng, tier, profMult * incMultiplier, {
			professionType: profType,
			lastName
		});

		// Legacy backfill from financials
		applicant.financials = buildFinancials(rng, empType, tier, profMult * incMultiplier);
		const monthlyIncome = Math.round(applicant.financials.netProfit[2] / 12);
		const balMultRange = BANK_BALANCE_MULTIPLIER[tier];
		applicant.averageBankBalance = Math.round(
			monthlyIncome * rng.range(balMultRange[0], balMultRange[1])
		);

		// Enforce conditional fields
		enforceConditionalFields(
			empType,
			applicant.businessProfile as unknown as Record<string, unknown>,
			{
				professionType: profType,
				rng
			}
		);
	} else if (empType === 'Self-employed(Other)') {
		applicant.businessType =
			archetype.businessType ||
			rng.choice([
				'Trading',
				'Manufacturing',
				'B2B Services',
				'B2C Services',
				'Commission Based',
				'Freelancer'
			] as const);

		applicant.businessProfile = buildBusinessProfile(rng, tier);

		if (archetype.id.includes('SEASONAL')) {
			applicant.businessProfile.seasonalBusiness = true;
			applicant.businessProfile.majorCashSales = rng.boolean(0.5);
		}

		if (applicant.businessType === 'Freelancer') {
			applicant.businessProfile.gstRegistered = false;
			applicant.businessProfile.hasCurrentAccount = false;
			applicant.businessProfile.usesSavingsAccount = true;
			applicant.businessProfile.threeYearsInBusiness = rng.boolean(0.4);
			applicant.businessProfile.hasCommercialPremises = false;
		}

		const vintageYears =
			tier === 1 ? rng.range(5, 15) : tier === 2 ? rng.range(3, 7) : rng.range(1, 4);
		if (applicant.businessProfile.gstRegistered) {
			const year = 2024 - vintageYears;
			const month = rng.range(1, 12);
			applicant.gstRegistrationDate = `${year}-${String(month).padStart(2, '0')}`;
		}

		const hasCash = applicant.businessProfile.majorCashSales ?? false;
		// Structured income entries
		applicant.incomeEntries = buildBusinessIncomeEntries(rng, tier, incMultiplier, {
			businessType: applicant.businessType,
			hasCash
		});

		// Legacy backfill
		applicant.financials = buildFinancials(rng, empType, tier, incMultiplier);
		const monthlyIncome = Math.round(applicant.financials.netProfit[2] / 12);
		const balMultRange = BANK_BALANCE_MULTIPLIER[tier];
		applicant.averageBankBalance = Math.round(
			monthlyIncome * rng.range(balMultRange[0], balMultRange[1])
		);

		if (hasCash) {
			applicant.averageCashAmount = rng.range(20000, 100000);
		}

		if (applicant.businessProfile.hasOtherIncome) {
			applicant.monthlyOtherIncome = rng.range(10000, 50000);
		}

		// Enforce conditional fields
		enforceConditionalFields(
			empType,
			applicant.businessProfile as unknown as Record<string, unknown>,
			{
				businessType: applicant.businessType,
				rng
			}
		);
	} else if (empType === 'Pensioner') {
		applicant.pensionProfile = buildPensionProfile(rng, tier);
		// Structured income entries
		applicant.incomeEntries = buildPensionIncomeEntries(rng, tier, incMultiplier);
		// Legacy backfill
		applicant.netIncome = applicant.incomeEntries[0].income.monthlyPensionAmount as number;
		if (applicant.pensionProfile.hasOtherIncome) {
			applicant.monthlyOtherIncome = rng.range(5000, 25000);
		}
	}

	// Multi-income: add secondary income sources from archetype config
	if (archetype.multiIncome && isPrimary && applicant.incomeEntries) {
		for (const additionalType of archetype.multiIncome) {
			if (additionalType === 'rental_income') {
				applicant.incomeEntries.push(buildRentalIncomeEntry(rng, tier));
			} else if (additionalType === 'freelance_consulting') {
				applicant.incomeEntries.push(buildFreelanceConsultingEntry(rng, tier));
			} else if (additionalType === 'director_company') {
				applicant.incomeEntries.push(buildDirectorCompanyEntry(rng, tier, incMultiplier));
			}
		}
	}

	// Obligations (employment-type aware filtering)
	if (archetype.hasObligations && isPrimary) {
		const oblCount = archetype.obligationCount
			? rng.range(archetype.obligationCount[0], archetype.obligationCount[1])
			: rng.range(1, 2);

		const incomeLevel = tier === 1 ? 'high' : tier === 2 ? 'mid' : 'low';
		applicant.hasExistingObligations = true;
		applicant.obligations = generateObligations(
			rng,
			oblCount,
			incomeLevel as 'low' | 'mid' | 'high',
			profileId,
			empType
		);
	}

	// Low credit reasons
	if (cibil < 700 && isPrimary) {
		applicant.lowCreditReasons = {
			delayedEMI: cibil < 650 ? true : rng.boolean(0.3),
			highCreditUtilization: rng.boolean(0.5),
			noCreditHistory: false,
			minimumDueOnly: cibil < 680 ? rng.boolean(0.4) : false,
			multipleEnquiries: rng.boolean(0.3),
			coApplicantDefault: false,
			loanDefault: cibil < 600 ? true : false,
			onlyUnsecuredLoans: rng.boolean(0.2)
		};
	}

	// NRI GPA details
	if (archetype.isNRI && isPrimary) {
		const gpaName = pickName(rng, 'male', archetype.regionHint);
		applicant.gpaDetails = {
			fullName: `${gpaName.first} ${gpaName.last}`,
			age: rng.range(55, 70),
			relationship: 'Father',
			address: `Sector ${rng.range(1, 50)}, ${city.city}`
		};
	}

	// ── Unsecured business E2E fields (Business/Professional loans) ──
	const UNSECURED_BIZ = ['Business Loan', 'Professional Loan'];
	if (UNSECURED_BIZ.includes(archetype.loanName) && isPrimary) {
		const bizEntities = ['Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited'];
		const bizSectors = ['Trading', 'Manufacturing', 'Services', 'Retail', 'IT/Software'];
		const vintages = ['less_than_1yr', '1-3yr', '3-5yr', '5-10yr', '10+yr'];
		const turnoverRanges = ['BELOW_50L', '50L_1CR', '1CR_5CR', '5CR_25CR'];
		const empRanges = ['1_10', '11_50', '51_200', '200_plus'];

		applicant.businessEntityType = rng.choice(bizEntities as unknown as readonly string[]);
		applicant.businessIndustrySector = rng.choice(bizSectors as unknown as readonly string[]);
		applicant.businessVintage = rng.choice(vintages as unknown as readonly string[]);
		applicant.gstRegistrationStatus = rng.boolean(0.75) ? 'REGISTERED' : 'NOT_REGISTERED';
		applicant.annualTurnoverRange = rng.choice(turnoverRanges as unknown as readonly string[]);
		applicant.numberOfEmployees = rng.choice(empRanges as unknown as readonly string[]);
		applicant.banksOfCurrentAccount = [
			rng.choice([
				'HDFC Bank',
				'SBI',
				'ICICI Bank',
				'Axis Bank',
				'Kotak Mahindra Bank'
			] as unknown as readonly string[])
		];
	}

	return applicant;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPANY APPLICANT BUILDER
// ════════════════════════════════════════════════════════════════════════════

function buildCompanyApplicant(
	rng: SeededRandom,
	archetype: ArchetypeTemplate,
	city: CityEntry,
	profileId: string
): ApplicantPayload {
	const tier = city.tier;
	const companyAge = tier === 1 ? rng.range(5, 15) : tier === 2 ? rng.range(3, 8) : rng.range(1, 4);
	const companyType =
		archetype.companyType || rng.choice(['Private Limited', 'LLP', 'Partnership'] as const);

	const COMPANY_SUFFIXES: Record<string, string[]> = {
		'Private Limited': [
			'Solutions Pvt Ltd',
			'Technologies Pvt Ltd',
			'Enterprises Pvt Ltd',
			'Industries Pvt Ltd'
		],
		LLP: ['Solutions LLP', 'Consulting LLP', 'Services LLP', 'Associates LLP'],
		Partnership: ['Traders', 'Enterprises', 'Associates', 'Industries']
	};
	const suffixes = COMPANY_SUFFIXES[companyType] || COMPANY_SUFFIXES['Private Limited'];
	const compName = `${rng.choice(['Zenith', 'Vertex', 'Atlas', 'Phoenix', 'Nexus', 'Prime', 'Apex', 'Metro'] as const)} ${rng.choice(suffixes)}`;

	const numDirectors = rng.range(2, 4);
	const directors = Array.from({ length: numDirectors }, (_, i) => {
		const dName = pickName(rng, rng.boolean(0.7) ? 'male' : 'female', archetype.regionHint);
		return {
			name: `${dName.first} ${dName.last}`,
			age: rng.range(30, 60),
			designation:
				i === 0 ? 'Managing Director' : companyType === 'LLP' ? 'Designated Partner' : 'Director'
		};
	});

	const applicant: ApplicantPayload = {
		applicantType: 'Company',
		fullName: compName,
		age: 0,
		gender: 'Male',
		maritalStatus: 'Single',
		companyName: compName,
		companyType,
		companyAge,
		directors,
		employmentType: 'Self-employed(Other)',
		businessType: archetype.businessType || 'B2B Services',
		businessProfile: buildBusinessProfile(rng, tier),
		creditScore: rng.range(archetype.cibilRange[0], archetype.cibilRange[1]),
		hasExistingObligations: false
	};

	const vintageYears = companyAge;
	if (applicant.businessProfile!.gstRegistered) {
		const year = 2024 - vintageYears;
		const month = rng.range(1, 12);
		applicant.gstRegistrationDate = `${year}-${String(month).padStart(2, '0')}`;
	}

	// Structured income entries
	applicant.incomeEntries = buildBusinessIncomeEntries(rng, tier, archetype.incomeMultiplier || 1, {
		businessType: applicant.businessType
	});

	// Legacy backfill
	applicant.financials = buildFinancials(
		rng,
		'Self-employed(Other)',
		tier,
		archetype.incomeMultiplier || 1
	);

	const monthlyIncome = Math.round(applicant.financials!.netProfit[2] / 12);
	const balMultRange = BANK_BALANCE_MULTIPLIER[tier];
	applicant.averageBankBalance = Math.round(
		monthlyIncome * rng.range(balMultRange[0], balMultRange[1])
	);

	// Obligations (employment-type aware)
	if (archetype.hasObligations) {
		const oblCount = archetype.obligationCount
			? rng.range(archetype.obligationCount[0], archetype.obligationCount[1])
			: rng.range(1, 2);
		const incomeLevel = tier === 1 ? 'high' : tier === 2 ? 'mid' : 'low';
		applicant.hasExistingObligations = true;
		applicant.obligations = generateObligations(
			rng,
			oblCount,
			incomeLevel as 'low' | 'mid' | 'high',
			profileId,
			'Self-employed(Other)'
		);
	}

	return applicant;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function roundToLakh(n: number): number {
	return Math.round(n / 100000) * 100000;
}
