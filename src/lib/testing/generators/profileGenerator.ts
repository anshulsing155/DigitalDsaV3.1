/**
 * Profile Generator - Creates realistic applicant and property profiles
 */

import type {
	ApplicantProfile,
	PropertyProfile,
	EmploymentType,
	CityTier,
	SalariedProfile,
	GovernmentProfile,
	BusinessProfile,
	ProfessionalProfile,
	PensionProfile,
	CompanyDetails,
	ExistingLoan
} from '../types/testData.types';
import {
	GENDERS,
	MARITAL_STATUSES,
	SALARIED_TYPES,
	SELF_EMPLOYED_TYPES,
	BUSINESS_TYPES,
	PROFESSION_TYPES
} from '../schema/schemaExtractor';

// ==================== SEEDED RANDOM GENERATOR ====================

class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	range(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	choice<T>(arr: T[]): T {
		return arr[this.range(0, arr.length - 1)];
	}

	boolean(probability: number = 0.5): boolean {
		return this.next() < probability;
	}
}

// ==================== SAMPLE DATA ====================

const INDIAN_NAMES = {
	male: [
		'Rajesh Kumar',
		'Amit Sharma',
		'Vijay Singh',
		'Sanjay Patel',
		'Arun Gupta',
		'Rahul Verma',
		'Suresh Reddy',
		'Manoj Kumar',
		'Deepak Joshi',
		'Ravi Agarwal'
	],
	female: [
		'Priya Sharma',
		'Anjali Patel',
		'Neha Gupta',
		'Swati Singh',
		'Pooja Verma',
		'Kavita Reddy',
		'Sneha Joshi',
		'Ritu Agarwal',
		'Meera Kumar',
		'Divya Iyer'
	]
};

const COMPANY_NAMES = [
	'Tech Solutions Pvt Ltd',
	'Global Enterprises LLP',
	'Innovative Systems',
	'Prime Traders',
	'Excellence Manufacturing',
	'Smart Services',
	'Metro Consultants',
	'Urban Infrastructure',
	'Modern Technologies',
	'Advance Solutions'
];

const CITIES_BY_TIER = {
	Metro: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'],
	Tier1: ['Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Coimbatore'],
	Tier2: [
		'Vadodara',
		'Rajkot',
		'Meerut',
		'Varanasi',
		'Amritsar',
		'Bhopal',
		'Raipur',
		'Kochi',
		'Visakhapatnam'
	],
	Tier3: ['Agra', 'Nashik', 'Jodhpur', 'Madurai', 'Guwahati', 'Chandigarh', 'Mysore'],
	Rural: ['Palwal', 'Bhiwani', 'Rohtak', 'Karnal', 'Sonipat']
};

const STATE_FOR_CITY: Record<string, string> = {
	Mumbai: 'Maharashtra',
	Delhi: 'Delhi',
	Bangalore: 'Karnataka',
	Hyderabad: 'Telangana',
	Chennai: 'Tamil Nadu',
	Kolkata: 'West Bengal',
	Pune: 'Maharashtra',
	Ahmedabad: 'Gujarat',
	Surat: 'Gujarat',
	Jaipur: 'Rajasthan',
	Lucknow: 'Uttar Pradesh',
	Kanpur: 'Uttar Pradesh',
	Nagpur: 'Maharashtra',
	Indore: 'Madhya Pradesh'
};

// ==================== APPLICANT PROFILE GENERATOR ====================

export class ApplicantProfileGenerator {
	private rng: SeededRandom;

	constructor(seed: number = Date.now()) {
		this.rng = new SeededRandom(seed);
	}

	generate(
		employmentType: EmploymentType,
		tier: 1 | 2 | 3,
		options: Partial<ApplicantProfile> = {}
	): ApplicantProfile {
		const applicantType = options.applicantType || 'Individual';
		const gender = options.gender || this.rng.choice([...GENDERS]);
		const nameGender: 'male' | 'female' =
			gender !== 'male' && gender !== 'female'
				? this.rng.choice<'male' | 'female'>(['male', 'female'])
				: gender;
		const age = options.age || this.generateAge(employmentType, tier);
		const creditScore = options.creditScore || this.generateCreditScore(tier);

		const profile: ApplicantProfile = {
			profileId: this.generateId('APP'),
			profileName: `${employmentType} - Tier ${tier} - ${age}yr`,
			tier,
			tags: this.generateTags(employmentType, tier, creditScore),

			applicantType,
			title: gender === 'male' ? 'Mr.' : this.rng.choice(['Ms.', 'Mrs.']),
			fullName:
				applicantType === 'Individual'
					? this.rng.choice(INDIAN_NAMES[nameGender])
					: this.rng.choice(COMPANY_NAMES),
			age,
			gender: applicantType === 'Individual' ? gender : undefined,
			maritalStatus: applicantType === 'Individual' ? this.generateMaritalStatus(age) : undefined,

			employmentType,
			isNRI: options.isNRI || false,

			creditScore,
			hasExistingObligations: tier === 1 ? this.rng.boolean(0.3) : this.rng.boolean(0.6),

			expectedAcceptance: tier === 1 ? 'High' : tier === 2 ? 'Medium' : 'Low',
			description: `${employmentType} applicant, ${age} years old, CIBIL ${creditScore}`
		};

		// Generate income based on employment type
		this.addIncomeDetails(profile, employmentType, tier);

		// Add employment-specific profiles
		this.addEmploymentProfile(profile, employmentType, tier);

		// Add company details if company
		if (applicantType === 'Company') {
			profile.companyDetails = this.generateCompanyDetails(tier);
		}

		// Add obligations if applicable
		if (profile.hasExistingObligations) {
			profile.existingLoans = this.generateExistingLoans(tier);
			profile.totalMonthlyEMI = profile.existingLoans.reduce((sum, loan) => sum + loan.emi, 0);
		}

		// Add low credit reasons if CIBIL < 750
		if (creditScore < 750) {
			profile.lowCreditReasons = this.generateLowCreditReasons(creditScore);
		}

		return profile;
	}

	private generateId(prefix: string): string {
		return `${prefix}_${Date.now()}_${this.rng.range(1000, 9999)}`;
	}

	private generateAge(employmentType: EmploymentType, tier: 1 | 2 | 3): number {
		// Determine age range based on employment category
		let range: [number, number];
		if (employmentType === 'Pensioner') {
			range = [60, 75];
		} else if (employmentType.startsWith('Salaried')) {
			const isGovt = employmentType === 'Salaried(Government)';
			range = isGovt
				? tier === 1
					? [28, 50]
					: tier === 2
						? [25, 55]
						: [23, 58]
				: tier === 1
					? [25, 45]
					: tier === 2
						? [23, 50]
						: [21, 55];
		} else if (employmentType.startsWith('Self-employed')) {
			range = tier === 1 ? [30, 55] : tier === 2 ? [28, 58] : [25, 60];
		} else {
			// Others, Home-maker, etc.
			range = [25, 50];
		}
		return this.rng.range(range[0], range[1]);
	}

	private generateCreditScore(tier: 1 | 2 | 3): number {
		if (tier === 1) return this.rng.range(720, 850);
		if (tier === 2) return this.rng.range(660, 750);
		return this.rng.range(550, 680);
	}

	private generateMaritalStatus(age: number): string {
		// Schema values: single, married, divorced, separated, widowed
		if (age < 25) return this.rng.choice(['single', 'married']);
		if (age < 40) return this.rng.choice(['single', 'married', 'married', 'married']);
		return this.rng.choice(['married', 'married', 'married', 'divorced', 'widowed']);
	}

	private generateTags(employmentType: string, tier: number, creditScore: number): string[] {
		const tags = [employmentType.toLowerCase().replace(/[()]/g, '')];

		if (tier === 1) tags.push('prime');
		if (tier === 2) tags.push('standard');
		if (tier === 3) tags.push('subprime');

		if (creditScore >= 750) tags.push('excellent-cibil');
		else if (creditScore >= 650) tags.push('good-cibil');
		else tags.push('low-cibil');

		return tags;
	}

	private addIncomeDetails(
		profile: ApplicantProfile,
		employmentType: EmploymentType,
		tier: 1 | 2 | 3
	) {
		if (employmentType.startsWith('Salaried')) {
			const incomeRange =
				tier === 1 ? [80000, 300000] : tier === 2 ? [40000, 120000] : [20000, 60000];
			profile.netIncome = this.rng.range(incomeRange[0], incomeRange[1]);
			profile.grossIncome = Math.floor(profile.netIncome * 1.15); // 15% deductions
			profile.monthlyOtherIncome = this.rng.boolean(0.3) ? this.rng.range(5000, 20000) : 0;
		} else if (employmentType === 'Pensioner') {
			profile.netIncome = tier === 1 ? this.rng.range(40000, 90000) : this.rng.range(20000, 50000);
			profile.monthlyOtherIncome = this.rng.boolean(0.5) ? this.rng.range(5000, 25000) : 0;
		}
		// Self-employed/Professional income is in financials array (to be added in business profile)
	}

	private addEmploymentProfile(
		profile: ApplicantProfile,
		employmentType: EmploymentType,
		tier: 1 | 2 | 3
	) {
		if (employmentType === 'Salaried(Private)') {
			profile.salariedProfile = this.generateSalariedProfile(tier);
		} else if (employmentType === 'Salaried(Government)') {
			profile.governmentProfile = this.generateGovernmentProfile(tier);
		} else if (employmentType === 'Self-employed(Other)') {
			profile.businessProfile = this.generateBusinessProfile(tier, 'business');
		} else if (employmentType === 'Self-employed(Professional)') {
			profile.professionalProfile = this.generateProfessionalProfile(tier);
		} else if (employmentType === 'Pensioner') {
			profile.pensionProfile = this.generatePensionProfile(tier);
		}
	}

	private generateSalariedProfile(tier: 1 | 2 | 3): SalariedProfile {
		const isPrime = tier === 1;
		return {
			worksForReputedOrg: isPrime ? true : this.rng.boolean(0.5),
			companyHas100PlusEmployees: isPrime ? true : this.rng.boolean(0.6),
			employerIsProprietorship: isPrime ? false : this.rng.boolean(0.3),
			isPermanentEmployee: isPrime ? true : this.rng.boolean(0.8),
			twoYearsWithSameEmployer: isPrime ? true : this.rng.boolean(0.7),
			threeYearsTotalExperience: isPrime ? true : this.rng.boolean(0.75),
			hasProvidentFund: isPrime ? true : this.rng.boolean(0.85),
			salaryInBankAccount: true, // Always true - CRITICAL requirement
			receivesBonus: isPrime ? true : this.rng.boolean(0.6),
			receivesSalarySlip: true,
			hasHigherEducation: isPrime ? true : this.rng.boolean(0.7)
		};
	}

	private generateGovernmentProfile(tier: 1 | 2 | 3): GovernmentProfile {
		const type = this.rng.choice(['central', 'defense', 'state']);
		return {
			isCentralGovt: type === 'central',
			isDefense: type === 'defense',
			isStateGovt: type === 'state',
			isPermanent: tier === 1 ? true : this.rng.boolean(0.9),
			isContractual: tier === 1 ? false : this.rng.boolean(0.1),
			probationCompleted: true,
			twoYearsService: tier === 1 ? true : this.rng.boolean(0.8),
			noDisciplinaryAction: true,
			receivesBonus: this.rng.boolean(0.7),
			pensionEligible: true,
			receivesSalarySlip: true,
			filesITR: tier === 1 ? true : this.rng.boolean(0.8)
		};
	}

	private generateBusinessProfile(
		tier: 1 | 2 | 3,
		mode: 'business' | 'professional'
	): BusinessProfile {
		const vintageYears =
			tier === 1 ? this.rng.range(5, 15) : tier === 2 ? this.rng.range(2, 5) : this.rng.range(1, 3);

		return {
			businessType: this.rng.choice([...BUSINESS_TYPES]),
			gstRegistered: tier === 1 ? true : tier === 2 ? true : this.rng.boolean(0.7),
			gstRegistrationDate: this.generateGSTDate(vintageYears),
			hasCurrentAccount: tier === 1 ? true : this.rng.boolean(0.85),
			filesITRRegularly: tier === 1 ? true : tier === 2 ? true : this.rng.boolean(0.7),
			profitableLast3Years: tier === 1 ? true : tier === 2 ? true : this.rng.boolean(0.6),
			majorCashSales: tier === 1 ? false : this.rng.boolean(0.4),
			businessVintageYears: vintageYears,
			averageBankBalance:
				tier === 1
					? this.rng.range(500000, 5000000)
					: tier === 2
						? this.rng.range(100000, 800000)
						: this.rng.range(20000, 150000),
			averageCashAmount: this.rng.boolean(0.5) ? this.rng.range(50000, 500000) : 0
		};
	}

	private generateProfessionalProfile(tier: 1 | 2 | 3): ProfessionalProfile {
		const baseProfile = this.generateBusinessProfile(tier, 'professional');
		return {
			...baseProfile,
			professionType: this.rng.choice([...PROFESSION_TYPES]),
			hasBarCouncilChamber: tier === 1 ? true : this.rng.boolean(0.7),
			hasProfessionalLicense: true,
			hasCommercialPremises: tier === 1 ? true : this.rng.boolean(0.8),
			ownsPremises: tier === 1 ? this.rng.boolean(0.6) : this.rng.boolean(0.3),
			enrolledWithProfessionalBody: true,
			priorExperience: tier === 1 ? true : this.rng.boolean(0.7)
		};
	}

	private generatePensionProfile(tier: 1 | 2 | 3): PensionProfile {
		const pensionType = this.rng.choice(['govt', 'psu', 'defense', 'private']);
		return {
			pensionInBankAccount: true,
			pensionRegular: true,
			isGovernmentPension: pensionType === 'govt',
			isPSUDefensePension: pensionType === 'psu' || pensionType === 'defense',
			isLifelongPension: pensionType !== 'private',
			isFamilyPension: this.rng.boolean(0.2),
			continuesBeyond75: pensionType === 'govt' || pensionType === 'defense',
			receivesPensionSlip: true,
			noPensionLoanDeduction: tier === 1 ? true : this.rng.boolean(0.8),
			hasOtherIncome: tier === 1 ? this.rng.boolean(0.6) : this.rng.boolean(0.4)
		};
	}

	private generateGSTDate(vintageYears: number): string {
		const year = new Date().getFullYear() - vintageYears;
		const month = this.rng.range(1, 12);
		return `${year}-${month.toString().padStart(2, '0')}`;
	}

	private generateCompanyDetails(tier: 1 | 2 | 3): CompanyDetails {
		const companyAge =
			tier === 1 ? this.rng.range(5, 20) : tier === 2 ? this.rng.range(3, 8) : this.rng.range(1, 3);
		const numDirectors = this.rng.range(2, 5);

		return {
			companyName: this.rng.choice(COMPANY_NAMES),
			companyType: this.rng.choice(['Private Limited', 'LLP', 'Partnership Firm']),
			companyAge,
			numberOfDirectors: numDirectors,
			directors: Array.from({ length: numDirectors }, (_, i) => ({
				fullName: this.rng.choice([...INDIAN_NAMES.male, ...INDIAN_NAMES.female]),
				age: this.rng.range(30, 65),
				designation: i === 0 ? 'Managing Director' : 'Director',
				director_income: this.rng.range(50000, 500000),
				director_cibilScore: this.generateCreditScore(tier)
			}))
		};
	}

	private generateExistingLoans(tier: 1 | 2 | 3): ExistingLoan[] {
		const count =
			tier === 1 ? this.rng.range(0, 2) : tier === 2 ? this.rng.range(1, 3) : this.rng.range(2, 5);

		return Array.from({ length: count }, () => ({
			loanType: this.rng.choice(['Personal Loan', 'Car Loan', 'Credit Card', 'Home Loan']),
			bankName: this.rng.choice(['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank']),
			emi: this.rng.range(5000, 30000),
			tenure: this.rng.range(12, 240),
			interestRate: this.rng.range(8, 18),
			remainingTenure: this.rng.range(6, 180),
			selectedToClose: this.rng.choice(['Yes', 'No'])
		}));
	}

	private generateLowCreditReasons(creditScore: number): any[] {
		const reasons: any[] = [];
		if (creditScore < 600) {
			reasons.push({ loanDefault: true });
		}
		if (creditScore < 650) {
			reasons.push({ delayedEMI: true, highCreditUtilization: true });
		}
		if (creditScore < 700) {
			reasons.push({ minimumDueOnly: true });
		}
		return reasons;
	}
}

// ==================== PROPERTY PROFILE GENERATOR ====================

export class PropertyProfileGenerator {
	private rng: SeededRandom;

	constructor(seed: number = Date.now()) {
		this.rng = new SeededRandom(seed);
	}

	generate(cityTier: CityTier, propertyType: string, tier: 1 | 2 | 3): PropertyProfile {
		const city = this.rng.choice(CITIES_BY_TIER[cityTier]);
		const state = STATE_FOR_CITY[city] || 'Maharashtra';
		const constructionStatus = this.rng.choice<any>(['Ready to Move', 'Under Construction']);

		const propertyCost = this.generatePropertyCost(cityTier, propertyType);
		const expectedLTV = this.calculateLTV(propertyCost, propertyType);
		const downPayment = Math.floor(propertyCost * (1 - expectedLTV / 100));

		return {
			profileId: this.generateId('PROP'),
			profileName: `${cityTier} ${propertyType} - ${constructionStatus}`,
			tags: [
				cityTier.toLowerCase(),
				propertyType.toLowerCase(),
				constructionStatus.toLowerCase().replace(/\s+/g, '-')
			],

			propertyState: state,
			propertyCity: city,
			cityTier,

			propertyType,
			propertyIdentified: true,
			constructionStatus,
			propertyStage:
				constructionStatus === 'Under Construction'
					? this.rng.choice(['Foundation', 'Plinth', 'Superstructure', 'Finishing'])
					: undefined,

			propertyComplianceStatus:
				tier === 1
					? 'fully_compliant'
					: tier === 2
						? this.rng.boolean(0.9)
							? 'fully_compliant'
							: 'authorized_not_per_plan'
						: this.rng.choice(['fully_compliant', 'authorized_not_per_plan', 'not_authorized']),
			propertyRegistered: constructionStatus === 'Ready to Move',

			propertyCost,
			atsValue: propertyCost,
			downPayment,

			expectedLTV,
			description: `${propertyType} in ${city} (${cityTier}), ${constructionStatus}, Cost: ₹${(propertyCost / 100000).toFixed(2)}L`
		};
	}

	private generateId(prefix: string): string {
		return `${prefix}_${Date.now()}_${this.rng.range(1000, 9999)}`;
	}

	private generatePropertyCost(cityTier: CityTier, propertyType: string): number {
		const ranges: Record<CityTier, [number, number]> = {
			Metro: [6000000, 30000000],
			Tier1: [4000000, 15000000],
			Tier2: [2500000, 8000000],
			Tier3: [1500000, 5000000],
			Rural: [1000000, 3000000]
		};

		const [min, max] = ranges[cityTier];
		const multiplier = propertyType === 'Plot' ? 0.6 : propertyType === 'Commercial' ? 1.5 : 1;

		return Math.floor(this.rng.range(min * multiplier, max * multiplier));
	}

	private calculateLTV(propertyCost: number, propertyType: string): number {
		if (propertyType === 'Plot') return 70;
		if (propertyType === 'Commercial') return 65;

		// For residential - based on cost slabs
		if (propertyCost <= 3333333) return 90;
		if (propertyCost <= 9375000) return 80;
		return 75;
	}
}
