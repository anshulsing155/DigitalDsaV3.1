/**
 * Build Unsecured Loan Schemas — Comprehensive Rebuild
 * =====================================================
 * Rebuilds all 3 unsecured loan schemas:
 *   - Personal Loan: 8→9 pages, 9→12 questions
 *   - Business Loan:  8→10 pages, 8→17 questions
 *   - Professional Loan: 8→10 pages, 8→17 questions
 *
 * Fixes:
 *   - CR-8: creditHistoryStatus icons inverted (clean→ThumbsUp, adverse→AlertTriangle)
 *   - Business Loan state/city question IDs (q1_ not in optionResolver → harmonize)
 *   - Professional Loan duplicate q4 IDs
 *   - Professional Loan wrong page title ("Business Location" → "Practice Location")
 *   - NRI/GPA description missing from Business/Professional
 *   - creditHistoryPage extracted as separate page
 *   - New domain-specific profile pages (Business, Professional)
 *   - Enhanced loanRequirementPage with purpose/urgency/bank relationship
 *
 * Run: node scripts/build-unsecured-schemas.cjs
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'lib', 'config');
const serverDir = path.join(__dirname, '..', 'src', 'lib', 'server', 'formEngine', 'schemas');

// ─── Helpers ────────────────────────────────────────────────────────
function c(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function writeSchema(filename, schema) {
	const json = JSON.stringify(schema, null, '\t') + '\n';
	const clientPath = path.join(srcDir, filename);
	const serverPath = path.join(serverDir, filename);
	fs.writeFileSync(clientPath, json, 'utf8');
	fs.writeFileSync(serverPath, json, 'utf8');
	console.log(
		`  ✓ ${filename} → ${schema.pages.length} pages, ${schema.pages.reduce((s, p) => s + p.questions.length, 0)} questions`
	);
}

// ════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════════

// Credit History Question — CR-8 FIXED (icons: clean→ThumbsUp, adverse→AlertTriangle)
const creditHistoryQuestion = {
	id: 'q1_creditHistory',
	bindsTo_template: 'creditHistoryStatus',
	contextKey: 'creditHistoryStatus',
	type: 'radio',
	uiGroup: 'loan_details',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiMeta: { icon: 'shield-alert' },
	required: true,
	question:
		'Has any applicant been involved in a loan default, settlement, or acted as guarantor on an unpaid loan?',
	description:
		"<div class='info-title'><span class='info-icon gold'>🛡️</span> Credit History Check</div><div class='info-box highlight'>This helps lenders assess creditworthiness. A history of defaults, settlements, or acting as guarantor on defaulted loans may affect lender eligibility.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Being honest helps find the right lenders who can work with the applicant's credit history.</div>",
	options: [
		{ label: 'None — clean record', value: 'clean', icon: 'ThumbsUp' },
		{ label: 'Yes — involved in default or settlement', value: 'defaulter', icon: 'AlertTriangle' },
		{
			label: 'Yes — was guarantor on unpaid/settled loan',
			value: 'guarantor',
			icon: 'AlertTriangle'
		},
		{ label: 'Both — default/settlement AND guarantor', value: 'both', icon: 'AlertTriangle' }
	],
	warning: {
		condition: [
			{
				case: { in: [{ var: 'creditHistoryStatus' }, ['defaulter', 'guarantor', 'both']] },
				then: 'A prior loan default or settlement where applicant acted as a guarantor may also affect lender eligibility. If no offers appear, applicant may explore our DSA pool, where a few DSAs may assist subject to additional fees or risk mitigation, such as collateral.'
			}
		]
	}
};

// Credit History Page (extracted as separate page)
const creditHistoryPage = {
	id: 'creditHistoryPage',
	title: 'Credit History Check',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [c(creditHistoryQuestion)]
};

// NRI Question for Personal Loan (uses ApplicantIsNRI — capital A — per existing schema)
function makeNriQuestion(bindsToKey, showWhenCondition, includeGpaDesc) {
	const q = {
		id: `q5_applicantIsNRI`,
		bindsTo_template: bindsToKey,
		contextKey: bindsToKey,
		type: 'radio',
		uiGroup: 'radio_fields',
		radioClass: 'mt-8 md:mt-12',
		labelClass: 'text-black',
		optionContainerClass: 'grid md:grid-cols-2 gap-3',
		required: true,
		question: 'Does applicant currently live outside India or hold NRI status?',
		options: [
			{
				label: 'Yes',
				value: 'Yes',
				flagKey: { [bindsToKey]: true },
				uiMeta: { icon: 'Circle' },
				icon: 'ThumbsUp'
			},
			{
				label: 'No',
				value: 'No',
				flagKey: { [bindsToKey]: false },
				uiMeta: { icon: 'Circle' },
				icon: 'ThumbsDown'
			}
		],
		showWhen: showWhenCondition,
		validation: {
			condition: [
				{
					case: { '==': [{ var: bindsToKey }, 'Yes'] },
					then: 'We regret to inform you that your request cannot be processed at this time as the applicant is NRI.'
				}
			]
		}
	};
	if (includeGpaDesc) {
		q.description =
			"<div class='info-title'><span class='info-icon blue'>🌏</span> NRI Status</div><div class='info-box highlight'>If the applicant is an NRI, a General Power of Attorney (GPA) holder in India will be needed for documentation and verification.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Ensure the GPA holder's documents (Aadhaar, PAN, address proof) are ready if the applicant is NRI.</div>";
	}
	return q;
}

// Income Documentation Question (Personal Loan only)
const incomeDocQuestion = {
	id: 'q_incomeDocumentation',
	bindsTo_template: 'incomeDocAvailable',
	contextKey: 'incomeDocAvailable',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'What income documentation is available?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📄</span> Income Documentation</div><div class='info-box highlight'>Select what income proof documents are available for the applicant.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Having both payslips and Form 16 gives the best chances of approval and better rates.</div>",
	options: [
		{
			label: 'Both payslips and Form 16',
			value: 'both',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Payslips only',
			value: 'payslips_only',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		},
		{ label: 'Form 16 only', value: 'form16_only', uiMeta: { icon: 'Circle' }, icon: 'FileText' },
		{
			label: 'ITR available (self-employed / professional)',
			value: 'itr_available',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		},
		{
			label: 'Bank statement available (12 months)',
			value: 'bank_statement_available',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		},
		{ label: 'Neither available', value: 'neither', uiMeta: { icon: 'Circle' }, icon: 'ThumbsDown' }
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'loanName' }, 'Personal Loan'] },
			{ '!=': [{ var: 'creditHistoryStatus' }, ''] }
		]
	}
};

// Shared pages (empty — rendered as custom components)
const applicantPage = {
	id: 'applicantPage',
	title: 'Applicant Details',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: []
};

function makeIncomePages(hasMultiApplicantShowWhen) {
	const swhen = hasMultiApplicantShowWhen
		? { '!=': [{ var: '__multiApplicantMode' }, true] }
		: undefined;

	const pages = [
		{
			id: 'incomeProfilesPage',
			title: 'Income Profiles',
			nextButtonVisibility: { mode: ['allRequiredAnswered'] },
			questions: []
		},
		{
			id: 'incomeDetailsPage',
			title: 'Income Details',
			nextButtonVisibility: { mode: ['allRequiredAnswered'] },
			questions: []
		},
		{
			id: 'creditScorePage',
			title: 'Credit Score',
			nextButtonVisibility: { mode: ['allRequiredAnswered'] },
			questions: []
		}
	];

	if (swhen) {
		pages.forEach((p) => {
			p.showWhen = c(swhen);
		});
	}
	return pages;
}

function makeObligationsPage(hasMultiApplicantShowWhen) {
	const page = {
		id: 'obligationsPage',
		title: 'Existing Loans',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [],
		showWhen: hasMultiApplicantShowWhen
			? {
					and: [
						{ '!=': [{ var: '__multiApplicantMode' }, true] },
						{ '==': [{ var: 'ObligationsRunning' }, 'Yes'] }
					]
				}
			: { '==': [{ var: 'ObligationsRunning' }, 'Yes'] }
	};
	return page;
}

// Tenure options (1-7 years for unsecured)
const tenureOptions = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ label: String(n), value: String(n) }));

// ════════════════════════════════════════════════════════════════════
// PERSONAL LOAN SCHEMA
// ════════════════════════════════════════════════════════════════════

function buildPersonalLoan() {
	// Page 0: Credit History (extracted from collateral_free_selectionPage)
	const page0 = c(creditHistoryPage);

	// Page 1: collateral_free_selectionPage (incomeDoc + NRI — credit history moved out)
	const page1 = {
		id: 'collateral_free_selectionPage',
		title: 'A few check points !',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			c(incomeDocQuestion),
			makeNriQuestion(
				'ApplicantIsNRI',
				{
					and: [
						{ '!=': [{ var: 'incomeDocAvailable' }, ''] },
						{ '!=': [{ var: 'creditHistoryStatus' }, ''] }
					]
				},
				true
			)
		]
	};

	// Page 2: Location (residence)
	const page2 = {
		id: 'locationPage',
		title: 'Residence Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q1_residenceStateName',
				bindsTo_template: 'residenceStateName',
				contextKey: 'residenceStateName',
				type: 'select',
				uiGroup: 'select_fields',
				subLabel: 'State name',
				selectClass: 'mt-[2rem] md:mt-[3rem]',
				uiMeta: { placeholder: 'Select Residence State', icon: 'map' },
				question: 'Location for residence verification ?',
				description:
					'Select the Indian state where the applicant currently resides. For NRI applicants, select the location of nearest family member or GPA (General Power of Attorney) holder.',
				required: true,
				showWhen: { '!=': [{ var: 'ApplicantIsNRI' }, ''] }
			},
			{
				id: 'q2_residenceCityName',
				bindsTo_template: 'residenceCityName',
				contextKey: 'residenceCityName',
				type: 'derivedSelect',
				uiGroup: 'select_fields',
				uiMeta: { placeholder: 'Select City name', icon: 'map-pin' },
				subLabel: 'City name',
				required: true,
				showWhen: { '!=': [{ var: 'ApplicantIsNRI' }, ''] }
			},
			{
				id: 'q2b_residencePincode',
				bindsTo_template: 'residencePincode',
				contextKey: 'residencePincode',
				type: 'text',
				fieldType: 'pincode',
				textFieldClass: 'mt-8 md:mt-12',
				uiGroup: 'inputNumber',
				uiMeta: { placeholder: 'Enter 6-digit pincode', icon: 'map-pin' },
				required: false,
				question: 'Residence pincode (if known)',
				descriptionHeader: 'Helps verify applicant location for lender matching.',
				showWhen: { '!=': [{ var: 'residenceCityName' }, ''] }
			},
			{
				id: 'q6_salariedBankName',
				bindsTo_template: 'salariedBankName',
				contextKey: 'salariedBankName',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Select bank name', icon: 'landmark' },
				required: true,
				question: "Please select the bank associated with the applicant's active salary account.",
				description:
					"<div class='info-title'><span class='info-icon blue'>🏦</span> Salary Account Selection</div><div class='info-box highlight'>Select the bank where the applicant's salary is credited monthly.</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Requirement:</span> <span class='diagram-value'>Active for 12+ months</span></div><div class='diagram-row'><span class='bold'>Purpose:</span> <span class='diagram-value'>Income verification</span></div></div><div class='info-box tip'><span class='bold'>💡 Why this matters:</span> Lenders verify salary credits through bank statements to assess repayment capacity.</div><div class='info-box note'><span class='bold'>Note:</span> Select the primary account where employer deposits salary regularly.</div>",
				showWhen: {
					and: [
						{ in: [{ var: 'employmentType' }, ['Salaried(Private)', 'Salaried(Government)']] },
						{ '!=': [{ var: 'residenceStateName' }, ''] },
						{ '!=': [{ var: 'residenceCityName' }, ''] }
					]
				}
			}
		]
	};

	// Pages 3-6: Shared pages
	const page3 = c(applicantPage);
	const incomePages = makeIncomePages(false);
	const obligationsPage = makeObligationsPage(false);

	// Page 7: Loan Requirements (enhanced with loanPurpose + urgencyLevel)
	const page7 = {
		id: 'loanRequirementPage',
		title: 'Loan Requirements',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q0_loanPurpose',
				bindsTo_template: 'loanPurpose',
				contextKey: 'loanPurpose',
				type: 'radio',
				radioClass: 'mt-[2rem] md:mt-[3rem]',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'target' },
				required: true,
				question: 'What is the primary purpose of this loan?',
				description:
					"<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who specialize in your type of requirement.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Some lenders offer better rates for specific purposes like medical or education.</div>",
				options: [
					{ label: 'Medical / Healthcare', value: 'medical', icon: 'Heart' },
					{ label: 'Education / Training', value: 'education', icon: 'GraduationCap' },
					{ label: 'Home Renovation', value: 'home_renovation', icon: 'Paintbrush' },
					{ label: 'Wedding / Family Event', value: 'wedding', icon: 'PartyPopper' },
					{ label: 'Travel', value: 'travel', icon: 'Plane' },
					{ label: 'Debt Consolidation', value: 'debt_consolidation', icon: 'ArrowLeftRight' },
					{ label: 'Consumer Purchase', value: 'consumer_purchase', icon: 'ShoppingCart' },
					{ label: 'Other Personal Need', value: 'other', icon: 'CircleDot' }
				]
			},
			{
				id: 'q1_mortgageYear',
				bindsTo_template: 'mortgageYear',
				contextKey: 'mortgageYear',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Select loan tenure in years', icon: 'calendar' },
				required: true,
				question: 'How long would the applicant like the loan term to be?',
				description:
					"<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Balance EMI affordability with total interest cost when selecting tenure.</div>",
				options: c(tenureOptions),
				showWhen: { '!=': [{ var: 'loanPurpose' }, ''] }
			},
			{
				id: 'q2_loanAmount',
				bindsTo_template: 'loanAmount',
				contextKey: 'loanAmount',
				type: 'text',
				uiGroup: 'number_fields',
				uiType: 'number',
				textClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Enter amount in rupees', icon: 'indian-rupee' },
				required: false,
				question: {
					switch: [
						{
							case: { '!=': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: 'Enter desired loan amount'
						},
						{
							case: { '==': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: 'Please specify extra loan amount'
						}
					]
				},
				description:
					"<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for personal needs. Leave blank for maximum eligible amount.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Up to 30x Salary</span><span class='stat-label'>Typical Max</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Monthly salary, existing EMIs, and essential expenses when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on CIBIL score, salary, and lender assessment.</div>",
				validation: {
					condition: [
						{
							case: { '<': [{ var: 'loanAmount' }, 100000] },
							then: 'Please enter minimum 1 lakh amount'
						}
					]
				},
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			},
			{
				id: 'q3_urgencyLevel',
				bindsTo_template: 'urgencyLevel',
				contextKey: 'urgencyLevel',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-3 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'clock' },
				required: false,
				question: 'How urgently is the loan needed?',
				description:
					"<div class='info-title'><span class='info-icon orange'>⏰</span> Urgency Assessment</div><div class='info-box highlight'>Helps prioritize your application and match with lenders who offer faster processing.</div>",
				options: [
					{ label: 'Immediately (within 1 week)', value: 'immediate', icon: 'Zap' },
					{ label: 'Soon (within 1 month)', value: 'soon', icon: 'Clock' },
					{ label: 'Planning ahead', value: 'planning', icon: 'Calendar' }
				],
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			}
		]
	};

	return {
		formId: 'loanForm_v1',
		title: 'Loan Application',
		pages: [page0, page1, page2, page3, ...incomePages, obligationsPage, page7]
	};
}

// ════════════════════════════════════════════════════════════════════
// BUSINESS LOAN SCHEMA
// ════════════════════════════════════════════════════════════════════

function buildBusinessLoan() {
	// Page 0: Credit History
	const page0 = c(creditHistoryPage);

	// Page 1: collateral_free_selectionPage (NRI only — credit history moved to page 0)
	const page1 = {
		id: 'collateral_free_selectionPage',
		title: 'A few check points !',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			makeNriQuestion(
				'applicantIsNRI',
				{
					'!=': [{ var: 'creditHistoryStatus' }, '']
				},
				true
			)
		]
	};

	// Page 2: Business Profile (NEW — 6 domain-specific questions)
	const page2 = {
		id: 'businessProfilePage',
		title: 'Business Profile',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q1_businessEntityType',
				bindsTo_template: 'businessEntityType',
				contextKey: 'businessEntityType',
				type: 'radio',
				radioClass: 'mt-[2rem] md:mt-[3rem]',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'building-2' },
				required: true,
				question: 'What type of business entity is this?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🏢</span> Business Entity Type</div><div class='info-box highlight'>The entity type determines documentation requirements and eligible loan products.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Proprietorship firms typically have simpler documentation but lower loan limits than Pvt Ltd companies.</div>",
				options: [
					{ label: 'Proprietorship', value: 'proprietorship', icon: 'User' },
					{ label: 'Partnership', value: 'partnership', icon: 'Users' },
					{ label: 'LLP', value: 'llp', icon: 'Building' },
					{ label: 'Private Limited', value: 'private_limited', icon: 'Building2' },
					{ label: 'One Person Company', value: 'opc', icon: 'UserCircle' },
					{ label: 'Trust / Society', value: 'trust_society', icon: 'Landmark' }
				],
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q2_businessIndustrySector',
				bindsTo_template: 'businessIndustrySector',
				contextKey: 'businessIndustrySector',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'factory' },
				required: true,
				question: 'Which industry sector does this business belong to?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🏭</span> Industry Sector</div><div class='info-box highlight'>Some sectors get preferential rates while others may face restrictions.</div>",
				options: [
					{ label: 'Manufacturing', value: 'manufacturing', icon: 'Factory' },
					{ label: 'Trading', value: 'trading', icon: 'ArrowLeftRight' },
					{ label: 'Services', value: 'services', icon: 'Briefcase' },
					{ label: 'IT / Technology', value: 'it_technology', icon: 'Monitor' },
					{ label: 'Healthcare', value: 'healthcare', icon: 'Heart' },
					{
						label: 'Construction / Real Estate',
						value: 'construction_realestate',
						icon: 'Building'
					},
					{ label: 'Agriculture / Agri-business', value: 'agriculture', icon: 'Wheat' },
					{ label: 'Other', value: 'other', icon: 'CircleDot' }
				],
				showWhen: { '!=': [{ var: 'businessEntityType' }, ''] }
			},
			{
				id: 'q3_businessVintage',
				bindsTo_template: 'businessVintage',
				contextKey: 'businessVintage',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'timer' },
				required: true,
				question: 'How long has this business been operational?',
				description:
					"<div class='info-title'><span class='info-icon green'>⏱️</span> Business Vintage</div><div class='info-box highlight'>Business vintage is one of the primary eligibility filters. Most banks require minimum 2 years.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Vintage is typically counted from the date of GST registration, Udyam registration, or incorporation — whichever is earliest.</div>",
				options: [
					{ label: 'Less than 1 year', value: 'less_than_1', icon: 'AlertTriangle' },
					{ label: '1-2 years', value: '1_to_2', icon: 'Clock' },
					{ label: '2-3 years', value: '2_to_3', icon: 'Clock' },
					{ label: '3-5 years', value: '3_to_5', icon: 'Timer' },
					{ label: '5-10 years', value: '5_to_10', icon: 'Award' },
					{ label: 'Over 10 years', value: 'over_10', icon: 'Trophy' }
				],
				showWhen: { '!=': [{ var: 'businessIndustrySector' }, ''] },
				warning: {
					condition: [
						{
							case: { '==': [{ var: 'businessVintage' }, 'less_than_1'] },
							then: 'Most banks require a minimum business vintage of 2 years for unsecured business loans. With less than 1 year, options will be very limited.'
						}
					]
				}
			},
			{
				id: 'q4_gstRegistrationStatus',
				bindsTo_template: 'gstRegistrationStatus',
				contextKey: 'gstRegistrationStatus',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'receipt' },
				required: true,
				question: 'Is the business GST registered?',
				description:
					"<div class='info-title'><span class='info-icon blue'>📋</span> GST Registration</div><div class='info-box highlight'>GST registration is often mandatory for business loans. It validates business legitimacy and provides verifiable turnover data.</div>",
				options: [
					{ label: 'Yes — GST registered', value: 'registered', icon: 'CheckCircle' },
					{ label: 'No — not registered', value: 'not_registered', icon: 'XCircle' },
					{ label: 'Exempted from GST', value: 'exempted', icon: 'MinusCircle' }
				],
				showWhen: { '!=': [{ var: 'businessVintage' }, ''] }
			},
			{
				id: 'q5_annualTurnoverRange',
				bindsTo_template: 'annualTurnoverRange',
				contextKey: 'annualTurnoverRange',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'trending-up' },
				required: true,
				question: 'What is the approximate annual turnover of the business?',
				description:
					"<div class='info-title'><span class='info-icon green'>📈</span> Annual Turnover</div><div class='info-box highlight'>Turnover determines the maximum loan amount — typically capped at 1-2x annual turnover for unsecured business loans.</div>",
				options: [
					{ label: 'Below ₹25 Lakhs', value: 'below_25l', icon: 'TrendingDown' },
					{ label: '₹25L - ₹50 Lakhs', value: '25l_to_50l', icon: 'TrendingUp' },
					{ label: '₹50L - ₹1 Crore', value: '50l_to_1cr', icon: 'TrendingUp' },
					{ label: '₹1Cr - ₹5 Crore', value: '1cr_to_5cr', icon: 'TrendingUp' },
					{ label: 'Above ₹5 Crore', value: 'above_5cr', icon: 'TrendingUp' }
				],
				showWhen: { '!=': [{ var: 'gstRegistrationStatus' }, ''] }
			},
			{
				id: 'q6_numberOfEmployees',
				bindsTo_template: 'numberOfEmployees',
				contextKey: 'numberOfEmployees',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'users' },
				required: false,
				question: 'How many employees does the business currently have?',
				description:
					"<div class='info-title'><span class='info-icon blue'>👥</span> Employee Count</div><div class='info-box highlight'>Helps lenders assess business scale and operational capacity.</div>",
				options: [
					{ label: 'Solo / Self', value: 'solo', icon: 'User' },
					{ label: '1-5 employees', value: '1_to_5', icon: 'Users' },
					{ label: '6-20 employees', value: '6_to_20', icon: 'Users' },
					{ label: '21-50 employees', value: '21_to_50', icon: 'Users' },
					{ label: 'Over 50 employees', value: 'over_50', icon: 'Users' }
				],
				showWhen: { '!=': [{ var: 'annualTurnoverRange' }, ''] }
			}
		]
	};

	// Page 3: Location — FIXED: harmonized IDs (q1_ prefix consistent with optionResolver)
	// Bug fix: Business Loan uses q1_businessStateName but optionResolver had q4_ (from professional)
	const page3 = {
		id: 'locationPage',
		title: 'Business Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q1_businessStateName',
				bindsTo_template: 'businessStateName',
				contextKey: 'businessStateName',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-[2rem] md:mt-[3rem]',
				uiMeta: { placeholder: 'Select Business State', icon: 'map' },
				subLabel: 'State name',
				question: 'Where is the business located?',
				description:
					"Select the state where the business is registered or primarily operates. For NRI applicants, select the location of the GPA (General Power of Attorney) holder's business.",
				required: true,
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q2_businessCityName',
				bindsTo_template: 'businessCityName',
				contextKey: 'businessCityName',
				type: 'derivedSelect',
				uiGroup: 'select_fields',
				uiMeta: { placeholder: 'Select City name', icon: 'map-pin' },
				subLabel: 'City name',
				required: true,
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q2b_businessPincode',
				bindsTo_template: 'businessPincode',
				contextKey: 'businessPincode',
				type: 'text',
				fieldType: 'pincode',
				textFieldClass: 'mt-8 md:mt-12',
				uiGroup: 'inputNumber',
				uiMeta: { placeholder: 'Enter 6-digit pincode', icon: 'map-pin' },
				required: false,
				question: 'Business location pincode (if known)',
				descriptionHeader: 'Helps verify business location for lender matching.',
				showWhen: { '!=': [{ var: 'businessCityName' }, ''] }
			},
			{
				id: 'q6_banksOfCurrentAccount',
				bindsTo_template: 'banksOfCurrentAccount',
				contextKey: 'banksOfCurrentAccount',
				type: 'multiple-select',
				multipleSelectClass: 'mt-8 md:mt-12',
				uiGroup: 'select_fields',
				uiMeta: { placeholder: 'Select banks' },
				required: true,
				question:
					'Which of these banks have you used for a Current Account, Overdraft (OD), or Cash Credit (CC)?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🏦</span> Business Banking Accounts</div><div class='info-box highlight'>Select all banks where the business receives customer payments.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>📋 Current Account</span></div><div class='diagram-row'><span class='diagram-value'>💳 Overdraft (OD)</span></div><div class='diagram-row'><span class='diagram-value'>💰 Cash Credit (CC)</span></div></div><div class='info-box tip'><span class='bold'>💡 Why needed:</span> Bank statements from these accounts verify business income and cash flow patterns.</div><div class='info-box note'><span class='bold'>Note:</span> Include all operational accounts for accurate income assessment.</div>",
				options: 'bankNameJSON',
				showWhen: {
					and: [
						{ '!=': [{ var: 'businessCityName' }, ''] },
						{ '!=': [{ var: 'businessStateName' }, ''] }
					]
				}
			}
		]
	};

	// Pages 4-7: Shared pages
	const page4 = c(applicantPage);
	const incomePages = makeIncomePages(true);
	const obligationsPage = makeObligationsPage(true);

	// Page 8: Loan Requirements (enhanced)
	const page8 = {
		id: 'loanRequirementPage',
		title: 'Your Loan Requirements',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q0_loanPurpose',
				bindsTo_template: 'loanPurpose',
				contextKey: 'loanPurpose',
				type: 'radio',
				radioClass: 'mt-[2rem] md:mt-[3rem]',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'target' },
				required: true,
				question: 'What is the primary purpose of this business loan?',
				description:
					"<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who specialize in your type of business requirement.</div>",
				options: [
					{ label: 'Working Capital', value: 'working_capital', icon: 'Wallet' },
					{ label: 'Business Expansion', value: 'expansion', icon: 'TrendingUp' },
					{ label: 'Equipment / Machinery', value: 'equipment', icon: 'Cog' },
					{ label: 'Inventory / Stock', value: 'inventory', icon: 'Package' },
					{ label: 'Office / Renovation', value: 'office_renovation', icon: 'Paintbrush' },
					{ label: 'Debt Restructuring', value: 'debt_restructuring', icon: 'ArrowLeftRight' },
					{ label: 'New Project / Venture', value: 'new_project', icon: 'Rocket' },
					{ label: 'Other Business Need', value: 'other', icon: 'CircleDot' }
				]
			},
			{
				id: 'q1_mortgageYear',
				bindsTo_template: 'mortgageYear',
				contextKey: 'mortgageYear',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Select loan tenure in years', icon: 'calendar' },
				required: true,
				question: 'How long would you like your loan term to be?',
				description:
					"<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> This can be adjusted later based on final eligibility and lender offers.</div>",
				options: c(tenureOptions),
				showWhen: { '!=': [{ var: 'loanPurpose' }, ''] }
			},
			{
				id: 'q2_loanAmount',
				bindsTo_template: 'loanAmount',
				contextKey: 'loanAmount',
				type: 'text',
				uiGroup: 'number_fields',
				uiType: 'number',
				textClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Enter amount in rupees', icon: 'indian-rupee' },
				required: false,
				question: {
					switch: [
						{
							case: { '!=': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: 'Enter your desired loan amount'
						},
						{
							case: { '==': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: 'Please specify your extra loan amount'
						}
					]
				},
				description:
					"<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for business purposes. Leave blank for maximum eligible amount.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on ITR</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Monthly cash flow, existing obligations, and business expansion plans when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on business turnover, profitability, and lender assessment.</div>",
				validation: {
					condition: [
						{
							case: { '<': [{ var: 'loanAmount' }, 100000] },
							then: 'Please enter minimum 1 lakh amount'
						}
					]
				},
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			},
			{
				id: 'q3_urgencyLevel',
				bindsTo_template: 'urgencyLevel',
				contextKey: 'urgencyLevel',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-3 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'clock' },
				required: false,
				question: 'How urgently is the loan needed?',
				description:
					"<div class='info-title'><span class='info-icon orange'>⏰</span> Urgency Assessment</div><div class='info-box highlight'>Helps prioritize your application and match with lenders who offer faster processing.</div>",
				options: [
					{ label: 'Immediately (within 1 week)', value: 'immediate', icon: 'Zap' },
					{ label: 'Soon (within 1 month)', value: 'soon', icon: 'Clock' },
					{ label: 'Planning ahead', value: 'planning', icon: 'Calendar' }
				],
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			},
			{
				id: 'q4_existingBankRelationship',
				bindsTo_template: 'existingBankRelationship',
				contextKey: 'existingBankRelationship',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'handshake' },
				required: false,
				question: 'Does the business have an existing banking relationship (CC/OD/term loan)?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🤝</span> Existing Bank Relationship</div><div class='info-box highlight'>Businesses with existing banking relationships often get faster processing and better terms from their existing bank.</div>",
				options: [
					{ label: 'Yes — active CC/OD/loan with a bank', value: 'yes', icon: 'CheckCircle' },
					{ label: 'No — no existing banking facility', value: 'no', icon: 'MinusCircle' }
				],
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			}
		]
	};

	return {
		formId: 'loanForm_v1',
		title: 'Loan Application',
		pages: [page0, page1, page2, page3, page4, ...incomePages, obligationsPage, page8]
	};
}

// ════════════════════════════════════════════════════════════════════
// PROFESSIONAL LOAN SCHEMA
// ════════════════════════════════════════════════════════════════════

function buildProfessionalLoan() {
	// Page 0: Credit History
	const page0 = c(creditHistoryPage);

	// Page 1: collateral_free_selectionPage (NRI only)
	const page1 = {
		id: 'collateral_free_selectionPage',
		title: 'A few check points !',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			makeNriQuestion(
				'applicantIsNRI',
				{
					'!=': [{ var: 'creditHistoryStatus' }, '']
				},
				true
			)
		]
	};

	// Page 2: Professional Profile (NEW — 6 domain-specific questions)
	const page2 = {
		id: 'professionalProfilePage',
		title: 'Professional Profile',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q1_professionalCategory',
				bindsTo_template: 'professionalCategory',
				contextKey: 'professionalCategory',
				type: 'radio',
				radioClass: 'mt-[2rem] md:mt-[3rem]',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'stethoscope' },
				required: true,
				question: 'What is the professional category?',
				description:
					"<div class='info-title'><span class='info-icon blue'>👨‍⚕️</span> Professional Category</div><div class='info-box highlight'>Professional loans are available only to recognized professionals with valid registrations.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Doctors and CAs typically get the best rates and highest limits among professional loans.</div>",
				options: [
					{ label: 'Doctor / Medical', value: 'doctor', icon: 'Stethoscope' },
					{ label: 'Chartered Accountant (CA)', value: 'ca', icon: 'Calculator' },
					{ label: 'Architect', value: 'architect', icon: 'Ruler' },
					{ label: 'Engineer (consulting)', value: 'engineer', icon: 'Cog' },
					{ label: 'Lawyer / Advocate', value: 'lawyer', icon: 'Scale' },
					{ label: 'Company Secretary (CS)', value: 'cs', icon: 'FileText' },
					{ label: 'Cost Accountant (CMA)', value: 'cma', icon: 'Calculator' },
					{ label: 'Other recognized professional', value: 'other', icon: 'Briefcase' }
				],
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q2_professionalQualification',
				bindsTo_template: 'professionalQualification',
				contextKey: 'professionalQualification',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'graduation-cap' },
				required: true,
				question: 'What is the highest professional qualification?',
				description:
					"<div class='info-title'><span class='info-icon green'>🎓</span> Professional Qualification</div><div class='info-box highlight'>Higher qualifications and super-specializations may qualify for larger loan amounts.</div>",
				options: [
					{ label: 'MBBS / BDS', value: 'mbbs_bds', icon: 'GraduationCap' },
					{ label: 'MD / MS / MDS (Post-graduate)', value: 'md_ms', icon: 'Award' },
					{ label: 'DM / MCh (Super-specialization)', value: 'dm_mch', icon: 'Trophy' },
					{ label: 'CA Final / ICAI Member', value: 'ca_final', icon: 'Award' },
					{ label: 'B.Arch / M.Arch', value: 'b_arch', icon: 'GraduationCap' },
					{ label: 'LLB / LLM', value: 'llb_llm', icon: 'GraduationCap' },
					{ label: 'BE / B.Tech (Consulting)', value: 'be_btech', icon: 'GraduationCap' },
					{ label: 'Other professional degree', value: 'other', icon: 'GraduationCap' }
				],
				showWhen: { '!=': [{ var: 'professionalCategory' }, ''] }
			},
			{
				id: 'q3_registrationCouncilType',
				bindsTo_template: 'registrationCouncilType',
				contextKey: 'registrationCouncilType',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'shield-check' },
				required: true,
				question: 'Where is the professional registered?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🛡️</span> Registration Council</div><div class='info-box highlight'>Valid professional registration is mandatory for professional loan eligibility.</div>",
				options: [
					{ label: 'State Medical Council (SMC)', value: 'smc', icon: 'Shield' },
					{ label: 'Medical Council of India (NMC)', value: 'nmc', icon: 'Shield' },
					{ label: 'ICAI (CA)', value: 'icai', icon: 'Shield' },
					{ label: 'Council of Architecture (CoA)', value: 'coa', icon: 'Shield' },
					{ label: 'Bar Council', value: 'bar_council', icon: 'Shield' },
					{
						label: 'State / National Engineering Council',
						value: 'engineering_council',
						icon: 'Shield'
					},
					{ label: 'Other regulatory body', value: 'other', icon: 'Shield' }
				],
				showWhen: { '!=': [{ var: 'professionalQualification' }, ''] }
			},
			{
				id: 'q4_practiceVintage',
				bindsTo_template: 'practiceVintage',
				contextKey: 'practiceVintage',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'timer' },
				required: true,
				question: 'How long has the applicant been practicing professionally?',
				description:
					"<div class='info-title'><span class='info-icon green'>⏱️</span> Practice Vintage</div><div class='info-box highlight'>Most lenders require a minimum of 2 years of professional practice for eligibility.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Practice vintage includes employed period in relevant profession (e.g., hospital employment for doctors).</div>",
				options: [
					{ label: 'Less than 1 year', value: 'less_than_1', icon: 'AlertTriangle' },
					{ label: '1-2 years', value: '1_to_2', icon: 'Clock' },
					{ label: '2-5 years', value: '2_to_5', icon: 'Timer' },
					{ label: '5-10 years', value: '5_to_10', icon: 'Award' },
					{ label: 'Over 10 years', value: 'over_10', icon: 'Trophy' }
				],
				showWhen: { '!=': [{ var: 'registrationCouncilType' }, ''] },
				warning: {
					condition: [
						{
							case: { '==': [{ var: 'practiceVintage' }, 'less_than_1'] },
							then: 'Most banks require a minimum practice vintage of 2 years for professional loans. Options may be limited with less than 1 year of practice.'
						}
					]
				}
			},
			{
				id: 'q5_practiceType',
				bindsTo_template: 'practiceType',
				contextKey: 'practiceType',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'briefcase' },
				required: true,
				question: 'What is the current practice setup?',
				description:
					"<div class='info-title'><span class='info-icon blue'>💼</span> Practice Setup</div><div class='info-box highlight'>Practice type affects income documentation requirements and loan structuring.</div>",
				options: [
					{ label: 'Own clinic / office / firm', value: 'own_practice', icon: 'Building2' },
					{ label: 'Employed at hospital / firm', value: 'employed', icon: 'Briefcase' },
					{ label: 'Both — own practice + employed', value: 'both', icon: 'LayoutGrid' },
					{ label: 'Consulting (visiting)', value: 'consulting', icon: 'UserCircle' }
				],
				showWhen: { '!=': [{ var: 'practiceVintage' }, ''] }
			},
			{
				id: 'q6_registrationStatus',
				bindsTo_template: 'registrationStatus',
				contextKey: 'registrationStatus',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'check-circle' },
				required: true,
				question: 'Is the professional registration currently active and valid?',
				description:
					"<div class='info-title'><span class='info-icon green'>✅</span> Registration Status</div><div class='info-box highlight'>Active registration is mandatory. Expired, suspended, or lapsed registrations will disqualify the application.</div>",
				options: [
					{ label: 'Active and valid', value: 'active', icon: 'CheckCircle' },
					{ label: 'Renewal pending', value: 'renewal_pending', icon: 'Clock' },
					{ label: 'Expired / Lapsed', value: 'expired', icon: 'XCircle' }
				],
				showWhen: { '!=': [{ var: 'practiceType' }, ''] },
				warning: {
					condition: [
						{
							case: { in: [{ var: 'registrationStatus' }, ['expired']] },
							then: 'An expired professional registration cannot be used for loan application. Please renew the registration first before applying.'
						}
					]
				}
			}
		]
	};

	// Page 3: Practice Location — FIXED: title + harmonized IDs
	// Professional Loan uses q4_businessStateName (which IS in optionResolver already)
	const page3 = {
		id: 'locationPage',
		title: 'Practice Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q4_businessStateName',
				bindsTo_template: 'businessStateName',
				contextKey: 'businessStateName',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-[2rem] md:mt-[3rem]',
				uiMeta: { placeholder: 'Select Practice State', icon: 'map' },
				subLabel: 'State name',
				question: 'Where is the professional practice located?',
				description:
					"Select the state where the applicant's practice (clinic, office, firm) is located. For NRI applicants, select the location of the GPA (General Power of Attorney) holder.",
				required: true,
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q5_businessCityName',
				bindsTo_template: 'businessCityName',
				contextKey: 'businessCityName',
				type: 'derivedSelect',
				subLabel: 'City name',
				uiGroup: 'select_fields',
				uiMeta: { placeholder: 'Select City name', icon: 'map-pin' },
				required: true,
				showWhen: { '!=': [{ var: 'applicantIsNRI' }, ''] }
			},
			{
				id: 'q5b_businessPincode',
				bindsTo_template: 'businessPincode',
				contextKey: 'businessPincode',
				type: 'text',
				fieldType: 'pincode',
				textFieldClass: 'mt-8 md:mt-12',
				uiGroup: 'inputNumber',
				uiMeta: { placeholder: 'Enter 6-digit pincode', icon: 'map-pin' },
				required: false,
				question: 'Practice location pincode (if known)',
				descriptionHeader: 'Helps verify practice location for lender matching.',
				showWhen: { '!=': [{ var: 'businessCityName' }, ''] }
			},
			{
				id: 'q6_banksOfCurrentAccount',
				bindsTo_template: 'banksOfCurrentAccount',
				contextKey: 'banksOfCurrentAccount',
				type: 'multiple-select',
				multipleSelectClass: 'mt-8 md:mt-12',
				uiGroup: 'select_fields',
				uiMeta: { placeholder: 'Select banks' },
				required: true,
				question:
					'Which of the following banks has the applicant used for a Current Account, Overdraft (OD), or Cash Credit (CC)?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🏦</span> Professional Practice Banking</div><div class='info-box highlight'>Select all banks where professional fees and client payments are received.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>📋 Current Account</span></div><div class='diagram-row'><span class='diagram-value'>💳 Overdraft (OD)</span></div><div class='diagram-row'><span class='diagram-value'>💰 Cash Credit (CC)</span></div></div><div class='info-box tip'><span class='bold'>💡 Why needed:</span> Bank statements verify professional income and practice cash flow.</div><div class='info-box note'><span class='bold'>Note:</span> Include all accounts used for professional practice operations.</div>",
				options: 'bankNameJSON',
				showWhen: {
					and: [
						{ '==': [{ var: 'employmentType' }, 'Self-employed(Professional)'] },
						{ '!=': [{ var: 'businessStateName' }, ''] },
						{ '!=': [{ var: 'businessCityName' }, ''] }
					]
				}
			}
		]
	};

	// Pages 4-7: Shared pages
	const page4 = c(applicantPage);
	const incomePages = makeIncomePages(false);
	const obligationsPage = makeObligationsPage(false);

	// Page 8: Loan Requirements (enhanced)
	const page8 = {
		id: 'loanRequirementPage',
		title: 'Your Loan Requirements',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: [
			{
				id: 'q0_loanPurpose',
				bindsTo_template: 'loanPurpose',
				contextKey: 'loanPurpose',
				type: 'radio',
				radioClass: 'mt-[2rem] md:mt-[3rem]',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'target' },
				required: true,
				question: 'What is the primary purpose of this professional loan?',
				description:
					"<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who have special programs for professional needs.</div>",
				options: [
					{ label: 'Clinic / Office Setup', value: 'clinic_office_setup', icon: 'Building2' },
					{ label: 'Equipment / Technology', value: 'equipment', icon: 'Cog' },
					{ label: 'Practice Expansion', value: 'practice_expansion', icon: 'TrendingUp' },
					{ label: 'Working Capital', value: 'working_capital', icon: 'Wallet' },
					{ label: 'Higher Education / Training', value: 'education', icon: 'GraduationCap' },
					{ label: 'Personal Needs', value: 'personal', icon: 'User' },
					{ label: 'Debt Consolidation', value: 'debt_consolidation', icon: 'ArrowLeftRight' },
					{ label: 'Other', value: 'other', icon: 'CircleDot' }
				]
			},
			{
				id: 'q1_mortgageYear',
				bindsTo_template: 'mortgageYear',
				contextKey: 'mortgageYear',
				type: 'select',
				uiGroup: 'select_fields',
				selectClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Select loan tenure in years', icon: 'calendar' },
				required: true,
				question: 'How long would the applicant like the loan term to be?',
				description:
					"<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Professionals often prefer shorter tenures to minimize interest burden.</div>",
				options: c(tenureOptions),
				showWhen: { '!=': [{ var: 'loanPurpose' }, ''] }
			},
			{
				id: 'q2_loanAmount',
				bindsTo_template: 'loanAmount',
				contextKey: 'loanAmount',
				type: 'text',
				uiGroup: 'number_fields',
				uiType: 'number',
				textClass: 'mt-8 md:mt-12',
				uiMeta: { placeholder: 'Enter amount in rupees', icon: 'indian-rupee' },
				required: false,
				question: {
					switch: [
						{
							case: { '!=': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: "Enter the applicant's desired loan amount"
						},
						{
							case: { '==': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] },
							then: "Please specify the applicant's extra loan amount"
						}
					]
				},
				description:
					"<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for professional practice needs. Leave blank for maximum eligible amount.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on ITR</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Practice revenue, existing EMIs, and future expansion plans when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on professional income, ITR, and lender evaluation.</div>",
				validation: {
					condition: [
						{
							case: { '<': [{ var: 'loanAmount' }, 100000] },
							then: 'Please enter minimum 1 lakh amount'
						}
					]
				},
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			},
			{
				id: 'q3_urgencyLevel',
				bindsTo_template: 'urgencyLevel',
				contextKey: 'urgencyLevel',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-3 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'clock' },
				required: false,
				question: 'How urgently is the loan needed?',
				description:
					"<div class='info-title'><span class='info-icon orange'>⏰</span> Urgency Assessment</div><div class='info-box highlight'>Helps prioritize your application and match with lenders who offer faster processing.</div>",
				options: [
					{ label: 'Immediately (within 1 week)', value: 'immediate', icon: 'Zap' },
					{ label: 'Soon (within 1 month)', value: 'soon', icon: 'Clock' },
					{ label: 'Planning ahead', value: 'planning', icon: 'Calendar' }
				],
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			},
			{
				id: 'q4_existingBankRelationship',
				bindsTo_template: 'existingBankRelationship',
				contextKey: 'existingBankRelationship',
				type: 'radio',
				radioClass: 'mt-8 md:mt-12',
				optionContainerClass: 'grid md:grid-cols-2 gap-3',
				uiGroup: 'radio_fields',
				uiMeta: { icon: 'handshake' },
				required: false,
				question: 'Does the applicant have an existing banking relationship for the practice?',
				description:
					"<div class='info-title'><span class='info-icon blue'>🤝</span> Existing Bank Relationship</div><div class='info-box highlight'>Professionals with existing banking relationships often get preferential rates and faster processing.</div>",
				options: [
					{ label: 'Yes — active account/loan with a bank', value: 'yes', icon: 'CheckCircle' },
					{ label: 'No — no existing banking facility', value: 'no', icon: 'MinusCircle' }
				],
				showWhen: { '!=': [{ var: 'mortgageYear' }, ''] }
			}
		]
	};

	return {
		formId: 'loanForm_v1',
		title: 'Loan Application',
		pages: [page0, page1, page2, page3, page4, ...incomePages, obligationsPage, page8]
	};
}

// ════════════════════════════════════════════════════════════════════
// BUILD ALL
// ════════════════════════════════════════════════════════════════════

console.log('\n🔨 Building unsecured loan schemas...\n');

const personal = buildPersonalLoan();
const business = buildBusinessLoan();
const professional = buildProfessionalLoan();

writeSchema('personal-loan-schema.json', personal);
writeSchema('businessLoanSchema.json', business);
writeSchema('professional-loan-schema.json', professional);

// ── Validation ──────────────────────────────────────────────────────
let errors = 0;

function validate(name, schema) {
	// Check for duplicate question IDs
	const allIds = schema.pages.flatMap((p) => p.questions.map((q) => q.id));
	const seen = new Set();
	for (const id of allIds) {
		if (seen.has(id)) {
			console.error(`  ✗ ${name}: Duplicate question ID "${id}"`);
			errors++;
		}
		seen.add(id);
	}

	// Check all bindsTo_template present on questions with IDs
	for (const page of schema.pages) {
		for (const q of page.questions) {
			if (!q.bindsTo_template && q.id) {
				console.error(`  ✗ ${name}: Question "${q.id}" missing bindsTo_template`);
				errors++;
			}
		}
	}

	// Check creditHistoryStatus icons — CR-8
	const creditQ = schema.pages
		.flatMap((p) => p.questions)
		.find((q) => q.bindsTo_template === 'creditHistoryStatus');
	if (creditQ) {
		const cleanOpt = creditQ.options.find((o) => o.value === 'clean');
		if (cleanOpt && cleanOpt.icon !== 'ThumbsUp') {
			console.error(
				`  ✗ ${name}: creditHistoryStatus "clean" should have ThumbsUp icon, has "${cleanOpt.icon}"`
			);
			errors++;
		}
		const defaulterOpt = creditQ.options.find((o) => o.value === 'defaulter');
		if (defaulterOpt && defaulterOpt.icon !== 'AlertTriangle') {
			console.error(
				`  ✗ ${name}: creditHistoryStatus "defaulter" should have AlertTriangle icon, has "${defaulterOpt.icon}"`
			);
			errors++;
		}
	}
}

validate('Personal Loan', personal);
validate('Business Loan', business);
validate('Professional Loan', professional);

if (errors > 0) {
	console.error(`\n✗ ${errors} validation error(s) found!`);
	process.exit(1);
} else {
	console.log('\n✅ All 3 schemas built and validated successfully!');
	console.log(
		`   Personal:     ${personal.pages.length} pages, ${personal.pages.reduce((s, p) => s + p.questions.length, 0)} questions`
	);
	console.log(
		`   Business:     ${business.pages.length} pages, ${business.pages.reduce((s, p) => s + p.questions.length, 0)} questions`
	);
	console.log(
		`   Professional: ${professional.pages.length} pages, ${professional.pages.reduce((s, p) => s + p.questions.length, 0)} questions`
	);
}
