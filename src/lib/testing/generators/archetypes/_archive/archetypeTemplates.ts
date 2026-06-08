/**
 * Archetype Templates - 88 archetype definitions producing ~310 profiles
 *
 * Each archetype represents a real-world loan scenario with demographic +
 * financial parameters. The generator expands each into N variations
 * by randomizing names, exact income, city selection, etc.
 *
 * Valid form paths (21 total):
 *   Home Loan: New Loan | Balance Transfer Only | Balance Transfer With Top-up | Top-up Only
 *   LAP:       New Loan (term) | New Loan (DOD) | Balance Transfer Only | Top-up Only | Balance Transfer With Top-up
 *   Plot Loan: Plot Loan Only | Plot & Construction Loan | Plot & Equity Loan | Construction Loan Only | Plot Balance Transfer
 *   Personal:  New Loan (Term/OD/DOD) | Debt Consolidation with Extra Funds | New Loan (no obligations)
 *   Business:  New Loan (Term/OD/DOD) | Debt Consolidation with Extra Funds | New Loan (no obligations)
 *   Professional: New Loan (Term/OD/DOD) | Debt Consolidation with Extra Funds | New Loan (no obligations)
 */

export interface ArchetypeTemplate {
	id: string;
	description: string;
	loanName: string;
	loanType: string;
	employmentType: string;
	propertyType?: string;
	constructionStatus?: string;
	propertyStage?: string;
	cityHint?: string;
	regionHint?: string;
	tierHint?: 1 | 2 | 3;
	ageRange: [number, number];
	cibilRange: [number, number];
	incomeMultiplier?: number;
	numberOfApplicants: number;
	coApplicantType?: 'spouse' | 'parent' | 'son' | 'business-partner' | 'sibling' | 'in-law';
	applicationStructure?: string;
	hasObligations: boolean;
	obligationCount?: [number, number];
	professionType?: string;
	businessType?: string;
	hasBarCouncilChamber?: boolean;
	isNRI?: boolean;
	isCompany?: boolean;
	companyType?: string;
	loanPurpose?: string;
	propertyAreaType?: string;
	ocCcAvailable?: string;
	municipalApproval?: string;
	purchaseType?: string;
	btLoan?: boolean;
	topUp?: boolean;
	/** Multi-income: primary applicant has additional income sources */
	multiIncome?: string[];
	tags: string[];
	variations: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HOME LOAN ARCHETYPES (17 archetypes -> ~59 profiles)
// Paths: New Loan, Balance Transfer Only, Balance Transfer With Top-up, Top-up Only
// ════════════════════════════════════════════════════════════════════════════

const HOME_LOAN_ARCHETYPES: ArchetypeTemplate[] = [
	// --- New Loan ---
	{
		id: 'HL-SAL-IT-BLR',
		description: 'IT couple buying flat in Bangalore',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Under Construction',
		propertyStage: 'Superstructure',
		cityHint: 'Bangalore',
		regionHint: 'south',
		ageRange: [28, 38],
		cibilRange: [740, 820],
		incomeMultiplier: 1.2,
		numberOfApplicants: 2,
		coApplicantType: 'spouse',
		applicationStructure: 'Couple',
		hasObligations: false,
		tags: ['it-couple', 'under-construction'],
		variations: 5
	},
	{
		id: 'HL-SAL-GOV-DEL',
		description: 'Government employee buying house in Delhi',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Government)',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'New Delhi',
		regionHint: 'north',
		ageRange: [32, 50],
		cibilRange: [720, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['government', 'delhi'],
		variations: 3
	},
	{
		id: 'HL-BIZ-TRADE-SUR',
		description: 'Trading business family buying house in Surat',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Surat',
		regionHint: 'west',
		ageRange: [35, 50],
		cibilRange: [700, 780],
		numberOfApplicants: 2,
		coApplicantType: 'spouse',
		applicationStructure: 'Family',
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['trader', 'surat', 'family'],
		variations: 3
	},
	{
		id: 'HL-PENS-RTM-JAI',
		description: 'Pensioner buying ready-to-move flat in Jaipur',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Pensioner',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Jaipur',
		regionHint: 'north',
		ageRange: [58, 68],
		cibilRange: [740, 810],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['pensioner', 'jaipur'],
		variations: 3
	},
	{
		id: 'HL-PROF-DR-CHN',
		description: 'Doctor buying villa in Chennai',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		propertyType: 'Villa',
		constructionStatus: 'Ready to Move',
		purchaseType: 'Resale',
		cityHint: 'Chennai',
		regionHint: 'south',
		ageRange: [35, 50],
		cibilRange: [760, 830],
		incomeMultiplier: 1.3,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['doctor', 'villa', 'high-income'],
		variations: 3
	},
	{
		id: 'HL-SAL-UC-PUN',
		description: 'Salaried buying under-construction flat in Pune',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Under Construction',
		propertyStage: 'Foundation',
		cityHint: 'Pune',
		regionHint: 'west',
		ageRange: [26, 35],
		cibilRange: [730, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['under-construction', 'pune', 'young'],
		variations: 4
	},
	{
		id: 'HL-SAL-RESALE-AHM',
		description: 'Salaried buying resale house in Ahmedabad',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		purchaseType: 'Resale',
		cityHint: 'Ahmedabad',
		regionHint: 'west',
		ageRange: [30, 45],
		cibilRange: [720, 790],
		numberOfApplicants: 2,
		coApplicantType: 'spouse',
		applicationStructure: 'Couple',
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['resale', 'ahmedabad'],
		variations: 4
	},
	{
		id: 'HL-SAL-YOUNG-BLR',
		description: 'Young salaried first-time buyer in Bangalore',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Under Construction',
		propertyStage: 'Plinth',
		cityHint: 'Bangalore',
		regionHint: 'south',
		ageRange: [25, 30],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['young', 'first-time'],
		variations: 4
	},
	{
		id: 'HL-PROF-CA-MUM',
		description: 'CA buying flat in Mumbai',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Mumbai',
		regionHint: 'west',
		ageRange: [32, 45],
		cibilRange: [750, 820],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['ca', 'mumbai'],
		variations: 3
	},
	{
		id: 'HL-BIZ-FREELANCE-BLR',
		description: 'Freelancer buying flat in Bangalore',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Freelancer',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Bangalore',
		regionHint: 'south',
		ageRange: [28, 38],
		cibilRange: [710, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['freelancer', 'bangalore'],
		variations: 3
	},
	{
		id: 'HL-SAL-T2-LUC',
		description: 'Salaried buying flat in Lucknow',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Lucknow',
		regionHint: 'north',
		ageRange: [28, 40],
		cibilRange: [710, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['tier-2', 'lucknow'],
		variations: 4
	},
	{
		id: 'HL-GOV-FAMILY-BHP',
		description: 'Government employee with son co-applicant in Bhopal',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Government)',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Bhopal',
		regionHint: 'north',
		ageRange: [45, 55],
		cibilRange: [730, 800],
		numberOfApplicants: 2,
		coApplicantType: 'son',
		applicationStructure: 'Family',
		hasObligations: false,
		tags: ['family', 'bhopal', 'government'],
		variations: 3
	},

	// --- Balance Transfer Only ---
	{
		id: 'HL-SAL-BT-MUM',
		description: 'Salaried doing BT in Mumbai',
		loanName: 'Home Loan',
		loanType: 'Balance Transfer Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Mumbai',
		regionHint: 'west',
		ageRange: [30, 42],
		cibilRange: [740, 810],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		tags: ['bt', 'mumbai', 'salaried'],
		variations: 4
	},

	// --- Balance Transfer With Top-up ---
	{
		id: 'HL-SAL-BT-TOPUP',
		description: 'Salaried BT with top-up in Hyderabad',
		loanName: 'Home Loan',
		loanType: 'Balance Transfer With Top-up',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Hyderabad',
		regionHint: 'south',
		ageRange: [30, 40],
		cibilRange: [750, 810],
		numberOfApplicants: 2,
		coApplicantType: 'spouse',
		applicationStructure: 'Couple',
		hasObligations: true,
		obligationCount: [1, 2],
		btLoan: true,
		topUp: true,
		tags: ['bt-topup', 'couple'],
		variations: 4
	},
	{
		id: 'HL-BIZ-BT-TOPUP-DEL',
		description: 'Business owner BT+topup in Delhi',
		loanName: 'Home Loan',
		loanType: 'Balance Transfer With Top-up',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'New Delhi',
		regionHint: 'north',
		ageRange: [35, 48],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		btLoan: true,
		topUp: true,
		tags: ['bt-topup', 'b2b', 'delhi'],
		variations: 3
	},

	// --- Top-up Only ---
	{
		id: 'HL-SAL-TOPUP-KOLK',
		description: 'Top-up only on existing HL in Kolkata',
		loanName: 'Home Loan',
		loanType: 'Top-up Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Kolkata',
		regionHint: 'east',
		ageRange: [35, 48],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		topUp: true,
		tags: ['top-up', 'kolkata'],
		variations: 3
	},
	{
		id: 'HL-PROF-TOPUP-CHN',
		description: 'Doctor top-up only in Chennai',
		loanName: 'Home Loan',
		loanType: 'Top-up Only',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Chennai',
		regionHint: 'south',
		ageRange: [38, 50],
		cibilRange: [760, 820],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		topUp: true,
		tags: ['top-up', 'doctor', 'chennai'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// LAP ARCHETYPES (14 archetypes -> ~48 profiles)
// Paths: New Loan (term), New Loan (DOD), Balance Transfer Only, Top-up Only, Balance Transfer With Top-up
// ════════════════════════════════════════════════════════════════════════════

const LAP_ARCHETYPES: ArchetypeTemplate[] = [
	// --- New Loan (Term LAP) ---
	{
		id: 'LAP-BIZ-TRADE-AHM',
		description: 'Trader pledging property in Ahmedabad for business expansion',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Ahmedabad',
		regionHint: 'west',
		ageRange: [35, 52],
		cibilRange: [700, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'trader', 'business-expansion'],
		variations: 4
	},
	{
		id: 'LAP-PROF-CA-PUN',
		description: 'CA pledging office property in Pune',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		propertyType: 'Commercial',
		constructionStatus: 'Ready to Move',
		cityHint: 'Pune',
		regionHint: 'west',
		ageRange: [35, 48],
		cibilRange: [740, 810],
		numberOfApplicants: 1,
		hasObligations: false,
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'ca', 'commercial'],
		variations: 3
	},
	{
		id: 'LAP-SAL-DEBT-PUN',
		description: 'Salaried LAP for debt consolidation in Pune',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Pune',
		regionHint: 'west',
		ageRange: [35, 50],
		cibilRange: [700, 760],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [2, 3],
		loanPurpose: 'DEBT_CONSOLIDATION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'debt-consolidation'],
		variations: 4
	},
	{
		id: 'LAP-BIZ-MFG-SUR',
		description: 'Manufacturer LAP in Surat',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		propertyType: 'Commercial',
		constructionStatus: 'Ready to Move',
		cityHint: 'Surat',
		regionHint: 'west',
		ageRange: [38, 55],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'manufacturer', 'surat'],
		variations: 4
	},
	{
		id: 'LAP-GOV-BLR',
		description: 'Government employee LAP in Bangalore',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Salaried(Government)',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Bangalore',
		regionHint: 'south',
		ageRange: [38, 52],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		loanPurpose: 'PERSONAL_NEEDS',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'government', 'bangalore'],
		variations: 4
	},
	{
		id: 'LAP-PROF-DR-CHN',
		description: 'Doctor LAP for clinic expansion in Chennai',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		propertyType: 'Commercial',
		constructionStatus: 'Ready to Move',
		cityHint: 'Chennai',
		regionHint: 'south',
		ageRange: [35, 50],
		cibilRange: [750, 820],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'doctor', 'clinic'],
		variations: 4
	},

	// --- New Loan (DOD — Dropline Overdraft, same loanType but different form path) ---
	{
		id: 'LAP-DOD-BIZ-MUM',
		description: 'Business owner DOD LAP in Mumbai',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Mumbai',
		regionHint: 'west',
		ageRange: [35, 50],
		cibilRange: [720, 790],
		incomeMultiplier: 1.1,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'dod', 'b2b', 'mumbai'],
		variations: 4
	},
	{
		id: 'LAP-DOD-TRADE-DEL',
		description: 'Trader DOD LAP in Delhi',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'New Delhi',
		regionHint: 'north',
		ageRange: [38, 52],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'dod', 'trader', 'delhi'],
		variations: 3
	},

	// --- Balance Transfer Only ---
	{
		id: 'LAP-BT-CA-MUM',
		description: 'LAP balance transfer by CA in Mumbai',
		loanName: 'Loan Against Property',
		loanType: 'Balance Transfer Only',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Mumbai',
		regionHint: 'west',
		ageRange: [35, 48],
		cibilRange: [750, 810],
		numberOfApplicants: 1,
		hasObligations: false,
		btLoan: true,
		loanPurpose: 'PERSONAL_NEEDS',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'bt', 'ca'],
		variations: 3
	},
	{
		id: 'LAP-BT-SAL-HYD',
		description: 'Salaried LAP BT in Hyderabad',
		loanName: 'Loan Against Property',
		loanType: 'Balance Transfer Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Hyderabad',
		regionHint: 'south',
		ageRange: [35, 48],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		loanPurpose: 'PERSONAL_NEEDS',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'bt', 'salaried', 'hyderabad'],
		variations: 3
	},

	// --- Top-up Only ---
	{
		id: 'LAP-TOPUP-BIZ-AHM',
		description: 'LAP top-up only for trader in Ahmedabad',
		loanName: 'Loan Against Property',
		loanType: 'Top-up Only',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		cityHint: 'Ahmedabad',
		regionHint: 'west',
		ageRange: [38, 52],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		topUp: true,
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'top-up', 'trader', 'ahmedabad'],
		variations: 3
	},
	{
		id: 'LAP-TOPUP-SAL-PUN',
		description: 'Salaried LAP top-up in Pune',
		loanName: 'Loan Against Property',
		loanType: 'Top-up Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Pune',
		regionHint: 'west',
		ageRange: [35, 48],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		topUp: true,
		loanPurpose: 'PERSONAL_NEEDS',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'top-up', 'salaried', 'pune'],
		variations: 3
	},

	// --- Balance Transfer With Top-up ---
	{
		id: 'LAP-BT-TOPUP-MUM',
		description: 'LAP BT with top-up in Mumbai',
		loanName: 'Loan Against Property',
		loanType: 'Balance Transfer With Top-up',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		cityHint: 'Mumbai',
		regionHint: 'west',
		ageRange: [38, 52],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		topUp: true,
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'bt-topup', 'mumbai'],
		variations: 3
	},
	{
		id: 'LAP-BT-TOPUP-DEL',
		description: 'LAP BT+topup by manufacturer in Delhi',
		loanName: 'Loan Against Property',
		loanType: 'Balance Transfer With Top-up',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		propertyType: 'Commercial',
		constructionStatus: 'Ready to Move',
		cityHint: 'New Delhi',
		regionHint: 'north',
		ageRange: [40, 55],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		btLoan: true,
		topUp: true,
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'bt-topup', 'manufacturer', 'delhi'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// LAP SUB-TYPE ARCHETYPES (property type variations)
// ════════════════════════════════════════════════════════════════════════════

const LAP_SUBTYPE_ARCHETYPES: ArchetypeTemplate[] = [
	{
		id: 'LAP-INDUSTRIAL-BIZ',
		description: 'LAP on industrial property by manufacturer',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		propertyType: 'Industrial',
		constructionStatus: 'Ready to Move',
		regionHint: 'west',
		tierHint: 2,
		ageRange: [38, 55],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'industrial', 'manufacturing'],
		variations: 3
	},
	{
		id: 'LAP-PLOT-BIZ',
		description: 'LAP on plot by business owner',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Plot',
		constructionStatus: 'Ready to Move',
		regionHint: 'north',
		tierHint: 2,
		ageRange: [40, 55],
		cibilRange: [700, 760],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'NONE',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'plot', 'business'],
		variations: 3
	},
	{
		id: 'LAP-MIXED-USE',
		description: 'LAP on mixed-use property',
		loanName: 'Loan Against Property',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2C Services',
		propertyType: 'Mixed Use',
		constructionStatus: 'Ready to Move',
		regionHint: 'west',
		tierHint: 1,
		ageRange: [35, 50],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		loanPurpose: 'BUSINESS_EXPANSION',
		propertyAreaType: 'PLANNED_AUTHORITY',
		ocCcAvailable: 'BOTH',
		municipalApproval: 'APPROVED',
		tags: ['lap', 'mixed-use'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// PLOT LOAN ARCHETYPES (10 archetypes -> ~35 profiles)
// Paths: Plot Loan Only, Plot & Construction Loan, Plot & Equity Loan,
//        Construction Loan Only, Plot Balance Transfer
// ════════════════════════════════════════════════════════════════════════════

const PLOT_LOAN_ARCHETYPES: ArchetypeTemplate[] = [
	// --- Plot Loan Only ---
	{
		id: 'PL-SAL-PLOT-JAI',
		description: 'Salaried buying plot only in Jaipur',
		loanName: 'Plot Loan',
		loanType: 'Plot Loan Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Plot',
		cityHint: 'Jaipur',
		regionHint: 'north',
		ageRange: [30, 42],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['plot-only', 'jaipur'],
		variations: 4
	},
	{
		id: 'PL-GOV-PLOT-BHP',
		description: 'Government employee plot purchase in Bhopal',
		loanName: 'Plot Loan',
		loanType: 'Plot Loan Only',
		employmentType: 'Salaried(Government)',
		propertyType: 'Plot',
		cityHint: 'Bhopal',
		regionHint: 'north',
		ageRange: [32, 48],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['plot-only', 'government', 'bhopal'],
		variations: 3
	},

	// --- Plot & Construction Loan ---
	{
		id: 'PL-SAL-CONSTR-PAT',
		description: 'Salaried plot + construction in Patna',
		loanName: 'Plot Loan',
		loanType: 'Plot & Construction Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Plot',
		constructionStatus: 'Plot + Construction',
		propertyStage: 'Foundation',
		cityHint: 'Patna',
		regionHint: 'east',
		ageRange: [28, 42],
		cibilRange: [710, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['plot-construction', 'patna'],
		variations: 4
	},
	{
		id: 'PL-BIZ-CONSTR-IND',
		description: 'Business owner plot + construction in Indore',
		loanName: 'Plot Loan',
		loanType: 'Plot & Construction Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		propertyType: 'Plot',
		constructionStatus: 'Plot + Construction',
		propertyStage: 'Foundation',
		cityHint: 'Indore',
		regionHint: 'north',
		ageRange: [35, 50],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['plot-construction', 'indore', 'manufacturer'],
		variations: 4
	},
	{
		id: 'PL-PROF-CONSTR-COI',
		description: 'Doctor plot + construction in Coimbatore',
		loanName: 'Plot Loan',
		loanType: 'Plot & Construction Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		propertyType: 'Plot',
		constructionStatus: 'Plot + Construction',
		propertyStage: 'Foundation',
		cityHint: 'Coimbatore',
		regionHint: 'south',
		ageRange: [35, 48],
		cibilRange: [750, 810],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['plot-construction', 'doctor'],
		variations: 3
	},

	// --- Plot & Equity Loan ---
	{
		id: 'PL-SAL-EQUITY-DED',
		description: 'Salaried plot + equity in Dehradun',
		loanName: 'Plot Loan',
		loanType: 'Plot & Equity Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Plot',
		cityHint: 'Dehradun',
		regionHint: 'north',
		ageRange: [30, 40],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['plot-equity', 'dehradun'],
		variations: 4
	},

	// --- Construction Loan Only ---
	{
		id: 'PL-SAL-CONSTONLY-RAN',
		description: 'Salaried construction only in Ranchi',
		loanName: 'Plot Loan',
		loanType: 'Construction Loan Only',
		employmentType: 'Salaried(Private)',
		propertyType: 'Plot',
		constructionStatus: 'Plot + Construction',
		propertyStage: 'Foundation',
		cityHint: 'Ranchi',
		regionHint: 'east',
		ageRange: [28, 40],
		cibilRange: [700, 760],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['construction-only', 'ranchi', 'tier-3'],
		variations: 4
	},
	{
		id: 'PL-BIZ-CONSTONLY-NAG',
		description: 'Business family construction only in Nagpur',
		loanName: 'Plot Loan',
		loanType: 'Construction Loan Only',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		propertyType: 'Plot',
		constructionStatus: 'Plot + Construction',
		propertyStage: 'Finishing',
		cityHint: 'Nagpur',
		regionHint: 'west',
		ageRange: [42, 55],
		cibilRange: [710, 770],
		numberOfApplicants: 2,
		coApplicantType: 'son',
		applicationStructure: 'Family',
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['construction-only', 'nagpur', 'family'],
		variations: 3
	},

	// --- Plot Balance Transfer ---
	{
		id: 'PL-SAL-BT-GUW',
		description: 'Plot balance transfer in Guwahati',
		loanName: 'Plot Loan',
		loanType: 'Plot Balance Transfer',
		employmentType: 'Salaried(Private)',
		propertyType: 'Plot',
		cityHint: 'Guwahati',
		regionHint: 'east',
		ageRange: [30, 42],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		tags: ['plot-bt', 'guwahati', 'northeast'],
		variations: 3
	},
	{
		id: 'PL-GOV-BT-AGR',
		description: 'Government employee plot BT in Agra',
		loanName: 'Plot Loan',
		loanType: 'Plot Balance Transfer',
		employmentType: 'Salaried(Government)',
		propertyType: 'Plot',
		cityHint: 'Agra',
		regionHint: 'north',
		ageRange: [35, 48],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		btLoan: true,
		tags: ['plot-bt', 'agra', 'government'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// PERSONAL LOAN ARCHETYPES (9 archetypes -> ~31 profiles)
// Paths: New Loan (with/without obligations), Debt Consolidation with Extra Funds
// ════════════════════════════════════════════════════════════════════════════

const PERSONAL_LOAN_ARCHETYPES: ArchetypeTemplate[] = [
	// --- New Loan (with obligations) ---
	{
		id: 'PL-SAL-FRESH-MUM',
		description: 'Mid-career salaried PL in Mumbai with obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		regionHint: 'west',
		cityHint: 'Mumbai',
		ageRange: [30, 42],
		cibilRange: [720, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['personal-loan', 'mid-career', 'obligations'],
		variations: 4
	},
	{
		id: 'PL-GOV-FRESH-DEL',
		description: 'Government employee PL in Delhi with obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Government)',
		regionHint: 'north',
		cityHint: 'New Delhi',
		ageRange: [30, 50],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['personal-loan', 'government', 'obligations'],
		variations: 3
	},
	{
		id: 'PL-BIZ-FRESH-AHM',
		description: 'Trader PL in Ahmedabad with obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		regionHint: 'west',
		cityHint: 'Ahmedabad',
		ageRange: [30, 48],
		cibilRange: [700, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['personal-loan', 'trader', 'obligations'],
		variations: 3
	},

	// --- New Loan (no obligations) ---
	{
		id: 'PL-SAL-CLEAN-BLR',
		description: 'Young IT professional PL in Bangalore, no obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		regionHint: 'south',
		cityHint: 'Bangalore',
		ageRange: [25, 32],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['personal-loan', 'young', 'no-obligations'],
		variations: 4
	},
	{
		id: 'PL-PROF-CLEAN-CHN',
		description: 'Doctor PL in Chennai, no obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		regionHint: 'south',
		cityHint: 'Chennai',
		ageRange: [30, 45],
		cibilRange: [750, 810],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['personal-loan', 'doctor', 'no-obligations'],
		variations: 3
	},
	{
		id: 'PL-SAL-CLEAN-HYD',
		description: 'Salaried PL in Hyderabad, no obligations',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		regionHint: 'south',
		cityHint: 'Hyderabad',
		ageRange: [28, 40],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['personal-loan', 'hyderabad', 'no-obligations'],
		variations: 4
	},

	// --- Debt Consolidation with Extra Funds ---
	{
		id: 'PL-SAL-DOD-KOLK',
		description: 'Salaried PL debt consolidation in Kolkata',
		loanName: 'Personal Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Salaried(Private)',
		regionHint: 'east',
		cityHint: 'Kolkata',
		ageRange: [28, 42],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [2, 3],
		tags: ['personal-loan', 'debt-consolidation', 'kolkata'],
		variations: 4
	},
	{
		id: 'PL-PROF-DOD-PUN',
		description: 'CA PL debt consolidation in Pune',
		loanName: 'Personal Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		regionHint: 'west',
		cityHint: 'Pune',
		ageRange: [28, 42],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['personal-loan', 'debt-consolidation', 'ca'],
		variations: 3
	},
	{
		id: 'PL-SAL-DOD-JAI',
		description: 'Salaried PL debt consolidation in Jaipur',
		loanName: 'Personal Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Salaried(Private)',
		regionHint: 'north',
		cityHint: 'Jaipur',
		ageRange: [25, 38],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [2, 3],
		tags: ['personal-loan', 'debt-consolidation', 'tier-2'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// BUSINESS LOAN ARCHETYPES (9 archetypes -> ~32 profiles)
// Paths: New Loan (with/without obligations), Debt Consolidation with Extra Funds
// ════════════════════════════════════════════════════════════════════════════

const BUSINESS_LOAN_ARCHETYPES: ArchetypeTemplate[] = [
	// --- New Loan (with obligations) ---
	{
		id: 'BL-BIZ-FRESH-SUR',
		description: 'Manufacturing unit in Surat with obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		regionHint: 'west',
		cityHint: 'Surat',
		ageRange: [35, 52],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'manufacturer', 'surat', 'obligations'],
		variations: 4
	},
	{
		id: 'BL-BIZ-FRESH-MUM',
		description: 'B2B services company in Mumbai with obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		regionHint: 'west',
		cityHint: 'Mumbai',
		ageRange: [32, 48],
		cibilRange: [720, 790],
		incomeMultiplier: 1.1,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'b2b', 'mumbai', 'obligations'],
		variations: 4
	},
	{
		id: 'BL-BIZ-FRESH-AHM',
		description: 'Trading firm in Ahmedabad with obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		regionHint: 'west',
		cityHint: 'Ahmedabad',
		ageRange: [35, 52],
		cibilRange: [700, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'trading', 'ahmedabad', 'obligations'],
		variations: 4
	},
	{
		id: 'BL-COMP-FRESH-DEL',
		description: 'Pvt Ltd company BL in Delhi with obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		isCompany: true,
		companyType: 'Private Limited',
		regionHint: 'north',
		cityHint: 'New Delhi',
		ageRange: [0, 0],
		cibilRange: [730, 790],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'pvt-ltd', 'company', 'obligations'],
		variations: 3
	},

	// --- New Loan (no obligations) ---
	{
		id: 'BL-BIZ-CLEAN-FREELANCE',
		description: 'Freelancer BL, no obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Freelancer',
		regionHint: 'south',
		ageRange: [25, 35],
		cibilRange: [700, 760],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['business-loan', 'freelancer', 'no-obligations'],
		variations: 3
	},
	{
		id: 'BL-COMP-CLEAN-BLR',
		description: 'LLP BL in Bangalore, no obligations',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		isCompany: true,
		companyType: 'LLP',
		regionHint: 'south',
		cityHint: 'Bangalore',
		ageRange: [0, 0],
		cibilRange: [720, 780],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['business-loan', 'llp', 'company', 'no-obligations'],
		variations: 3
	},

	// --- Debt Consolidation with Extra Funds ---
	{
		id: 'BL-BIZ-DOD-KOLK',
		description: 'Trader BL debt consolidation in Kolkata',
		loanName: 'Business Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		regionHint: 'east',
		cityHint: 'Kolkata',
		ageRange: [35, 50],
		cibilRange: [700, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [2, 3],
		tags: ['business-loan', 'debt-consolidation', 'trader', 'kolkata'],
		variations: 4
	},
	{
		id: 'BL-BIZ-DOD-HYD',
		description: 'Commission-based BL debt consolidation in Hyderabad',
		loanName: 'Business Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Other)',
		businessType: 'Commission Based',
		regionHint: 'south',
		cityHint: 'Hyderabad',
		ageRange: [30, 45],
		cibilRange: [690, 750],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'debt-consolidation', 'commission'],
		variations: 3
	},
	{
		id: 'BL-BIZ-DOD-IND',
		description: 'Manufacturing BL debt consolidation in Indore',
		loanName: 'Business Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Other)',
		businessType: 'Manufacturing',
		regionHint: 'north',
		cityHint: 'Indore',
		ageRange: [38, 52],
		cibilRange: [710, 770],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['business-loan', 'debt-consolidation', 'manufacturer', 'indore'],
		variations: 4
	}
];

// ════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL LOAN ARCHETYPES (8 archetypes -> ~29 profiles)
// Paths: New Loan (with/without obligations), Debt Consolidation with Extra Funds
// ════════════════════════════════════════════════════════════════════════════

const PROFESSIONAL_LOAN_ARCHETYPES: ArchetypeTemplate[] = [
	// --- New Loan (with obligations) ---
	{
		id: 'PROF-DR-FRESH-HYD',
		description: 'Doctor expanding clinic in Hyderabad, with obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		regionHint: 'south',
		cityHint: 'Hyderabad',
		ageRange: [35, 48],
		cibilRange: [760, 830],
		incomeMultiplier: 1.3,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['professional-loan', 'doctor', 'expansion', 'obligations'],
		variations: 4
	},
	{
		id: 'PROF-ARCH-FRESH-MUM',
		description: 'Architect equipment purchase in Mumbai, with obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Architect',
		regionHint: 'west',
		cityHint: 'Mumbai',
		ageRange: [32, 45],
		cibilRange: [740, 810],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['professional-loan', 'architect', 'obligations'],
		variations: 3
	},

	// --- New Loan (no obligations) ---
	{
		id: 'PROF-DR-CLEAN-BLR',
		description: 'Doctor clinic setup in Bangalore, no obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		regionHint: 'south',
		cityHint: 'Bangalore',
		ageRange: [30, 42],
		cibilRange: [750, 820],
		incomeMultiplier: 1.3,
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['professional-loan', 'doctor', 'clinic', 'no-obligations'],
		variations: 4
	},
	{
		id: 'PROF-CA-CLEAN-PUN',
		description: 'CA starting practice in Pune, no obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		regionHint: 'west',
		cityHint: 'Pune',
		ageRange: [27, 38],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['professional-loan', 'ca', 'pune', 'no-obligations'],
		variations: 4
	},
	{
		id: 'PROF-LAW-CLEAN-DEL',
		description: 'Lawyer practice expansion in Delhi, no obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Lawyer',
		hasBarCouncilChamber: true,
		regionHint: 'north',
		cityHint: 'New Delhi',
		ageRange: [32, 48],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['professional-loan', 'lawyer', 'delhi', 'no-obligations'],
		variations: 3
	},
	{
		id: 'PROF-CS-CLEAN-CHN',
		description: 'Company Secretary loan in Chennai, no obligations',
		loanName: 'Professional Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Company Secretary',
		regionHint: 'south',
		cityHint: 'Chennai',
		ageRange: [28, 40],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['professional-loan', 'cs', 'chennai', 'no-obligations'],
		variations: 4
	},

	// --- Debt Consolidation with Extra Funds ---
	{
		id: 'PROF-DR-DOD-CHN',
		description: 'Doctor debt consolidation in Chennai',
		loanName: 'Professional Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		regionHint: 'south',
		cityHint: 'Chennai',
		ageRange: [35, 48],
		cibilRange: [750, 820],
		incomeMultiplier: 1.2,
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['professional-loan', 'debt-consolidation', 'doctor'],
		variations: 4
	},
	{
		id: 'PROF-CA-DOD-DEL',
		description: 'CA debt consolidation in Delhi',
		loanName: 'Professional Loan',
		loanType: 'Debt Consolidation with Extra Funds',
		employmentType: 'Self-employed(Professional)',
		professionType: 'Chartered Accountant(CA)',
		regionHint: 'north',
		cityHint: 'New Delhi',
		ageRange: [30, 42],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['professional-loan', 'debt-consolidation', 'ca', 'delhi'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// BOUNDARY / EDGE CASE ARCHETYPES (12 archetypes -> ~50 profiles)
// ════════════════════════════════════════════════════════════════════════════

const EDGE_ARCHETYPES: ArchetypeTemplate[] = [
	// CIBIL boundary cases
	{
		id: 'EDGE-CIBIL-580',
		description: 'CIBIL at 580 — deep subprime',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [30, 45],
		cibilRange: [580, 580],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [2, 3],
		tags: ['cibil-boundary-580', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-CIBIL-650',
		description: 'CIBIL at 650 — marginal',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [28, 42],
		cibilRange: [650, 650],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['cibil-boundary-650', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-CIBIL-700',
		description: 'CIBIL at 700 — common cutoff',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [28, 45],
		cibilRange: [700, 700],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['cibil-boundary-700', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-CIBIL-750',
		description: 'CIBIL at 750 — excellent threshold',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [28, 45],
		cibilRange: [750, 750],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['cibil-boundary-750', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-CIBIL-800',
		description: 'CIBIL at 800 — top tier',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [30, 50],
		cibilRange: [800, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['cibil-boundary-800', 'edge-case'],
		variations: 4
	},
	// FOIR boundary cases
	{
		id: 'EDGE-FOIR-70',
		description: 'FOIR at ~70% — high debt burden',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [30, 45],
		cibilRange: [700, 760],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [3, 4],
		incomeMultiplier: 0.6,
		tags: ['high-foir', 'edge-case'],
		variations: 6
	},
	// Age boundary cases
	{
		id: 'EDGE-AGE-23',
		description: 'Young applicant, 23 — edge of eligibility',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [23, 23],
		cibilRange: [710, 760],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['young-applicant', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-AGE-58',
		description: 'Near-retirement, 58 — short tenure',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		ageRange: [58, 58],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['near-retirement', 'edge-case'],
		variations: 4
	},
	// Special applicant types
	{
		id: 'EDGE-COMPANY',
		description: 'Company applicant (Pvt Ltd)',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		isCompany: true,
		companyType: 'Private Limited',
		regionHint: 'west',
		ageRange: [0, 0],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['company', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-NRI',
		description: 'NRI buying property in India',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Professional)',
		professionType: 'MBBS Doctor',
		propertyType: 'Flat',
		constructionStatus: 'Under Construction',
		propertyStage: 'Superstructure',
		isNRI: true,
		regionHint: 'west',
		cityHint: 'Mumbai',
		ageRange: [32, 45],
		cibilRange: [760, 830],
		incomeMultiplier: 1.5,
		numberOfApplicants: 1,
		hasObligations: false,
		tags: ['nri', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-3-APPLICANTS',
		description: '3 co-applicants family application',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		regionHint: 'north',
		ageRange: [45, 55],
		cibilRange: [730, 790],
		numberOfApplicants: 3,
		coApplicantType: 'son',
		applicationStructure: 'Family',
		hasObligations: false,
		tags: ['3-applicants', 'family', 'edge-case'],
		variations: 4
	},
	{
		id: 'EDGE-PENS-70',
		description: 'Pensioner age 70 — max age boundary',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Pensioner',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		regionHint: 'north',
		ageRange: [70, 70],
		cibilRange: [750, 800],
		numberOfApplicants: 2,
		coApplicantType: 'son',
		applicationStructure: 'Family',
		hasObligations: false,
		tags: ['pensioner-70', 'edge-case'],
		variations: 4
	}
];

// ════════════════════════════════════════════════════════════════════════════
// MULTI-INCOME ARCHETYPES (applicants with 2+ income sources)
// ════════════════════════════════════════════════════════════════════════════

const MULTI_INCOME_ARCHETYPES: ArchetypeTemplate[] = [
	{
		id: 'MI-SAL-RENTAL',
		description: 'Salaried with rental income',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		regionHint: 'west',
		tierHint: 1,
		ageRange: [30, 45],
		cibilRange: [740, 800],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		multiIncome: ['rental_income'],
		tags: ['multi-income', 'salaried-rental'],
		variations: 3
	},
	{
		id: 'MI-DIR-TWO-COS',
		description: 'Director in two companies',
		loanName: 'Business Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'B2B Services',
		regionHint: 'west',
		ageRange: [35, 50],
		cibilRange: [730, 790],
		numberOfApplicants: 1,
		hasObligations: true,
		obligationCount: [1, 2],
		multiIncome: ['director_company'],
		tags: ['multi-income', 'multi-directorship'],
		variations: 3
	},
	{
		id: 'MI-BIZ-PENSION',
		description: 'Business owner with pension co-applicant',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Self-employed(Other)',
		businessType: 'Trading',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		regionHint: 'north',
		tierHint: 2,
		ageRange: [35, 48],
		cibilRange: [710, 770],
		numberOfApplicants: 2,
		coApplicantType: 'parent',
		hasObligations: true,
		obligationCount: [1, 2],
		tags: ['multi-income', 'business-pension'],
		variations: 3
	},
	{
		id: 'MI-SAL-FREELANCE',
		description: 'Salaried with freelance consulting income',
		loanName: 'Personal Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		regionHint: 'south',
		tierHint: 1,
		ageRange: [28, 38],
		cibilRange: [750, 810],
		numberOfApplicants: 1,
		hasObligations: false,
		multiIncome: ['freelance_consulting'],
		tags: ['multi-income', 'salaried-freelance'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP DIVERSITY ARCHETYPES (sibling, in-law co-applicants)
// ════════════════════════════════════════════════════════════════════════════

const RELATIONSHIP_ARCHETYPES: ArchetypeTemplate[] = [
	{
		id: 'REL-SIBLING-HL',
		description: 'Home loan with sibling co-applicant',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Flat',
		constructionStatus: 'Ready to Move',
		regionHint: 'north',
		tierHint: 2,
		ageRange: [28, 40],
		cibilRange: [720, 780],
		numberOfApplicants: 2,
		coApplicantType: 'sibling',
		applicationStructure: 'Family',
		hasObligations: false,
		tags: ['sibling-co-applicant', 'relationship-diversity'],
		variations: 3
	},
	{
		id: 'REL-INLAW-HL',
		description: 'Home loan with in-law co-applicant',
		loanName: 'Home Loan',
		loanType: 'New Loan',
		employmentType: 'Salaried(Private)',
		propertyType: 'Independent House',
		constructionStatus: 'Ready to Move',
		regionHint: 'south',
		tierHint: 2,
		ageRange: [30, 42],
		cibilRange: [730, 790],
		numberOfApplicants: 2,
		coApplicantType: 'in-law',
		applicationStructure: 'Family',
		hasObligations: true,
		obligationCount: [1, 1],
		tags: ['inlaw-co-applicant', 'relationship-diversity'],
		variations: 3
	}
];

// ════════════════════════════════════════════════════════════════════════════
// EXPORT ALL ARCHETYPES
// ════════════════════════════════════════════════════════════════════════════

export const ALL_ARCHETYPES: ArchetypeTemplate[] = [
	...HOME_LOAN_ARCHETYPES,
	...LAP_ARCHETYPES,
	...LAP_SUBTYPE_ARCHETYPES,
	...PLOT_LOAN_ARCHETYPES,
	...PERSONAL_LOAN_ARCHETYPES,
	...BUSINESS_LOAN_ARCHETYPES,
	...PROFESSIONAL_LOAN_ARCHETYPES,
	...MULTI_INCOME_ARCHETYPES,
	...RELATIONSHIP_ARCHETYPES,
	...EDGE_ARCHETYPES
];

/** Total expected profiles */
export const EXPECTED_TOTAL = ALL_ARCHETYPES.reduce((sum, a) => sum + a.variations, 0);
