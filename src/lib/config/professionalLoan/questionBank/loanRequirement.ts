/**
 * Your Loan Requirements Questions
 * Page: loanRequirementPage
 *
 * Facility-aware: questions adapt based on facilityType (Term/OD/DOD/CC)
 * and loanType (New Loan / Debt Consolidation / DC with Extra Funds).
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ── Reusable JSON-Logic fragments ──────────────────────────────────────────
// IS_CREDIT_LINE: standard 3-facility credit-line gate (OD / DOD / CC).
//
// Intentionally OMITS 'Flexi Drop-line OverDraft (Flexi DOD)' even though the
// facilityType selector in commonPage.json:178-181 offers it as a fourth
// unsecured-loan facility. Reason: Flexi DOD has a 2-year interest-only window
// (per commonPage.json:181 labelDescription) that doesn't match the standard
// amortization assumptions baked into the downstream gates this constant drives
// (loanPurpose adaptive copy, EMI / DC-related question reveals, etc.).
//
// Sunset trigger: when product confirms Flexi DOD should share the standard
// credit-line gating, OR when Flexi DOD gets its own constant / gate path.
// Until then, this omission is load-bearing — adding 'Flexi Drop-line
// OverDraft (Flexi DOD)' to the array would silently change form behavior for
// Flexi DOD applicants.
const IS_CREDIT_LINE = {
	in: [
		{ var: 'facilityType' },
		['Overdraft (OD)', 'Drop-line OverDraft (DOD)', 'Cash Credit (CC)']
	]
};
const IS_DC = { '==': [{ var: 'loanType' }, 'Debt Consolidation'] };
const IS_DC_EXTRA = { '==': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] };
const IS_DC_ANY = {
	in: [{ var: 'loanType' }, ['Debt Consolidation', 'Debt Consolidation with Extra Funds']]
};

// ── Applicant type: same 3-option selector as the Applicant Details page ──
// Asked FIRST on Loan Requirements so professional category can adapt.
// Values match AddApplicantProfessional.svelte's selector (individual/joint/company).
export const q_professionalApplicantType: RawSchemaQuestion = {
	id: 'q_professionalApplicantType',
	bindsTo_template: 'professionalApplicantType',
	contextKey: 'professionalApplicantType',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	// 1 column on phones, 3 across from tablet+. The previous `sm:grid-cols-3`
	// kicked in at 640px and forced each card to ~200px wide — the
	// labelDescription wrapped to single-word-per-line on phones in landscape
	// and small tablets in portrait.
	optionContainerClass: 'grid grid-cols-1 md:grid-cols-3 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'users'
	},
	required: true,
	question: 'Who is applying?',
	description:
		"<div class='info-box highlight'>This determines how the loan is assessed and which professional categories are available. The Applicants page will be pre-configured based on your selection.</div>",
	options: [
		{
			label: 'Individual',
			value: 'individual',
			labelDescription: 'Single professional applying alone',
			icon: 'User'
		},
		{
			label: 'Joint',
			value: 'joint',
			labelDescription: 'Two or more professionals applying together',
			icon: 'Users'
		},
		{
			label: 'Company / Firm',
			value: 'company',
			labelDescription: 'Partnership, LLP, or Pvt Ltd professional firm',
			icon: 'Building2'
		}
	]
};

export const q_professionalCategory: RawSchemaQuestion = {
	id: 'q_professionalCategory',
	bindsTo_template: 'professionalCategory',
	contextKey: 'professionalCategory',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'stethoscope'
	},
	required: true,
	question: {
		switch: [
			{
				case: { '==': [{ var: 'professionalApplicantType' }, 'company'] },
				then: 'What type of professional practice is this?'
			}
		],
		default: 'What type of professional is applying?'
	},
	description: {
		switch: [
			{
				case: { '==': [{ var: 'professionalApplicantType' }, 'company'] },
				then: "<div class='info-title'><span class='info-icon green'>🏢</span> Practice Category</div><div class='info-box highlight'>Select the type of professional practice. This determines documentation requirements and eligible lenders.</div>"
			}
		],
		default:
			"<div class='info-title'><span class='info-icon green'>👤</span> Professional Category</div><div class='info-box highlight'>Select the primary applicant's profession. This determines available loan products, purpose options, and eligible lenders.</div>"
	} as unknown as string,
	showWhen: {
		'!=': [{ var: 'professionalApplicantType' }, '']
	},
	options: [
		// Individual professional categories — shown for Individual and Joint
		{
			label: 'Doctor / Medical',
			value: 'doctor',
			icon: 'Stethoscope',
			showWhen: { in: [{ var: 'professionalApplicantType' }, ['individual', 'joint']] }
		},
		{
			label: 'Chartered Accountant (CA)',
			value: 'ca',
			icon: 'Calculator',
			showWhen: { in: [{ var: 'professionalApplicantType' }, ['individual', 'joint']] }
		},
		{
			label: 'Lawyer / Advocate',
			value: 'lawyer',
			icon: 'Scale',
			showWhen: { in: [{ var: 'professionalApplicantType' }, ['individual', 'joint']] }
		},
		{
			label: 'Architect',
			value: 'architect',
			icon: 'Ruler',
			showWhen: { in: [{ var: 'professionalApplicantType' }, ['individual', 'joint']] }
		},
		// Professional firm / practice categories
		{
			label: 'Medical Clinic / Hospital',
			value: 'clinic_hospital',
			icon: 'Building2',
			helperText: 'Clinic, nursing home, diagnostic center, hospital, pathology lab',
			showWhen: { '==': [{ var: 'professionalApplicantType' }, 'company'] }
		},
		{
			label: 'Law Firm',
			value: 'law_firm',
			icon: 'Scale',
			helperText: 'Legal practice, advocates firm, solicitors firm',
			showWhen: { '==': [{ var: 'professionalApplicantType' }, 'company'] }
		},
		{
			label: 'CA / Accounting Firm',
			value: 'ca_firm',
			icon: 'Calculator',
			helperText: 'CA practice, tax consultancy, audit firm',
			showWhen: { '==': [{ var: 'professionalApplicantType' }, 'company'] }
		},
		{
			label: 'Architecture / Design Firm',
			value: 'architecture_firm',
			icon: 'Ruler',
			helperText: 'Architecture practice, interior design firm, town planning',
			showWhen: { '==': [{ var: 'professionalApplicantType' }, 'company'] }
		}
	]
};

export const q0_loanPurpose: RawSchemaQuestion = {
	id: 'q0_loanPurpose',
	bindsTo_template: 'loanPurpose',
	contextKey: 'loanPurpose',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'target'
	},
	required: true,
	question: {
		switch: [
			{
				case: IS_DC_EXTRA,
				then: 'What will the extra funds be used for?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'What is the primary purpose of this professional loan?'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_DC_EXTRA,
				then: "<div class='info-title'><span class='info-icon green'>🎯</span> Extra Funds Purpose</div><div class='info-box highlight'>The primary purpose (debt consolidation) is already set. Select what the <span class='bold'>additional funds</span> will be used for.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who have special programs for professional needs.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Options are tailored to your profession — some are profession-specific.</div>"
			}
		]
	},
	options: [
		// ── Profession-specific options (filtered by professionalCategory) ──
		{
			label: 'Clinic / Hospital Setup',
			value: 'clinic_hospital_setup',
			icon: 'Building2',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'Medical Equipment & Technology',
			value: 'medical_equipment',
			icon: 'Cog',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'Office Setup & Fitout',
			value: 'office_setup',
			icon: 'Building2',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		{
			label: 'Audit / Accounting Software',
			value: 'audit_software',
			icon: 'Monitor',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		{
			label: 'Chamber / Office Setup',
			value: 'chamber_setup',
			icon: 'Building2',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		{
			label: 'Legal Library & Research Tools',
			value: 'legal_library',
			icon: 'BookOpen',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		{
			label: 'Design Studio Setup',
			value: 'studio_setup',
			icon: 'Building2',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		},
		{
			label: 'Design Software & Equipment',
			value: 'design_software',
			icon: 'Monitor',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		},
		// ── Universal options (always visible) ──
		{
			label: 'Working Capital',
			value: 'working_capital',
			icon: 'Wallet'
		},
		{
			label: 'Practice Expansion',
			value: 'practice_expansion',
			icon: 'TrendingUp'
		},
		{
			label: 'Higher Education / Training',
			value: 'education',
			icon: 'GraduationCap'
		},
		{
			label: 'Personal Needs',
			value: 'personal',
			icon: 'User'
		},
		{
			label: 'Other',
			value: 'other',
			icon: 'CircleDot'
		}
	],
	// Hide for pure Debt Consolidation — purpose is implicit (debt consolidation)
	// Show for New Loan (all purposes) and DC+Extra (extra funds purpose)
	// Also requires professionalCategory to be set (for profession-specific filtering)
	showWhen: {
		and: [
			{ '!=': [{ var: 'loanType' }, 'Debt Consolidation'] },
			{ '!=': [{ var: 'professionalCategory' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{
							in: [
								{ var: 'loanPurpose' },
								['clinic_hospital_setup', 'office_setup', 'chamber_setup']
							]
						},
						{ '==': [{ var: 'practiceType' }, 'employed'] }
					]
				},
				then: 'Clinic/office setup loans require independent practice. Employed professionals typically use institutional facilities \u2014 verify the applicant is transitioning to independent practice.'
			},
			{
				case: {
					and: [
						IS_CREDIT_LINE,
						{
							in: [
								{ var: 'loanPurpose' },
								['clinic_hospital_setup', 'office_setup', 'chamber_setup', 'medical_equipment']
							]
						}
					]
				},
				then: 'Setup and equipment purchases require term financing with fixed EMIs \u2014 not revolving credit (OD/CC). Consider switching to a Term Loan.'
			}
		]
	}
};

export const q1_loanTenure: RawSchemaQuestion = {
	id: 'q1_loanTenure',
	bindsTo_template: 'loanTenure',
	contextKey: 'loanTenure',
	type: 'select',
	uiGroup: 'select_fields',
	selectClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Select tenure in years',
		icon: 'calendar'
	},
	required: true,
	question: {
		switch: [
			{
				// Credit-line facilities (OD/DOD/CC) — no fixed EMI, annual renewal
				case: IS_CREDIT_LINE,
				then: 'What is the desired facility period?'
			},
			{
				// Term loan — traditional EMI-based tenure
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'How long would the applicant like the loan term to be?'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Facility Period</div><div class='info-box highlight'>Select the desired facility tenure. Credit facilities (OD/CC) are typically renewed annually by the bank.</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>OD / CC:</span> <span class='diagram-value'>Annual renewal, interest on utilized amount</span></div><div class='diagram-row'><span class='bold'>Drop-line OD:</span> <span class='diagram-value'>Limit reduces over the period</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Most banks offer OD/CC with 1-year renewable periods. DOD tenures are typically 3-5 years.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Professionals often prefer shorter tenures to minimize interest burden.</div>"
			}
		]
	},
	options: [
		{ label: '1', value: '1' },
		{ label: '2', value: '2' },
		{ label: '3', value: '3' },
		{ label: '4', value: '4' },
		{ label: '5', value: '5' },
		{ label: '6', value: '6' },
		{ label: '7', value: '7' }
	],
	// Show when purpose is answered (New Loan / DC+Extra flow)
	// OR when loanType is pure DC (purpose question is hidden, skip to tenure)
	// Both paths require professionalCategory to be set first
	showWhen: {
		and: [
			{ '!=': [{ var: 'professionalCategory' }, ''] },
			{
				or: [{ '!=': [{ var: 'loanPurpose' }, ''] }, IS_DC]
			}
		]
	}
};

export const q2_loanAmount: RawSchemaQuestion = {
	id: 'q2_loanAmount',
	bindsTo_template: 'loanAmount',
	contextKey: 'loanAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: false,
	minLimit: 25000,
	maxLimit: 100000000,
	question: {
		switch: [
			// ── Takeover (DC) paths ──
			{
				// DC + Credit-line → existing facility limit
				case: { and: [IS_DC, IS_CREDIT_LINE] },
				then: 'What is the existing facility limit to be taken over?'
			},
			{
				// DC + Term loan → consolidation amount
				case: IS_DC,
				then: 'Expected consolidation amount (if known)'
			},
			// ── Enhancement (DC+Extra) paths ──
			{
				// DC+Extra + Credit-line → enhancement above current limit
				case: { and: [IS_DC_EXTRA, IS_CREDIT_LINE] },
				then: 'What enhancement amount is needed above the current limit?'
			},
			{
				// DC+Extra + Term loan → extra amount
				case: IS_DC_EXTRA,
				then: 'What extra amount is needed above consolidation?'
			},
			// ── New facility paths ──
			{
				// New + Credit-line → credit limit
				case: IS_CREDIT_LINE,
				then: 'What credit limit is required?'
			},
			{
				// New + Term loan (default)
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "Enter the applicant's desired loan amount"
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_DC_ANY,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Takeover Amount</div><div class='info-box highlight'>Enter the existing facility amount to be taken over. Leave blank if not yet confirmed.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check the latest sanction letter or account statement for the exact outstanding/limit.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final takeover amount depends on the new lender's assessment and NOC from the existing bank.</div>"
			},
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Credit Limit Required</div><div class='info-box highlight'>Enter the credit limit needed. Leave blank for maximum eligible limit.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on ITR</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Practice revenue, existing commitments, and cash flow cycle when deciding the limit.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for professional practice needs. Leave blank for maximum eligible amount.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on ITR</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Practice revenue, existing EMIs, and future expansion plans when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on professional income, ITR, and lender evaluation.</div>"
			}
		]
	},
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'loanAmount' }, 100000]
				},
				then: 'Please enter minimum 1 lakh amount'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'loanTenure' }, '']
	}
};

export const q3_urgencyLevel: RawSchemaQuestion = {
	id: 'q3_urgencyLevel',
	bindsTo_template: 'urgencyLevel',
	contextKey: 'urgencyLevel',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-3 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'clock'
	},
	required: false,
	question: {
		switch: [
			{
				case: IS_DC_ANY,
				then: 'How urgently is the takeover needed?'
			},
			{
				case: IS_CREDIT_LINE,
				then: 'How urgently is the facility needed?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'How urgently is the loan needed?'
			}
		]
	},
	description:
		"<div class='info-title'><span class='info-icon orange'>⏰</span> Urgency Assessment</div><div class='info-box highlight'>Helps prioritize your application and match with lenders who offer faster processing.</div>",
	options: [
		{
			label: 'Immediately (within 1 week)',
			value: 'immediate',
			icon: 'Zap'
		},
		{
			label: 'Soon (within 1 month)',
			value: 'soon',
			icon: 'Clock'
		},
		{
			label: 'Planning ahead',
			value: 'planning',
			icon: 'Calendar'
		}
	],
	showWhen: {
		'!=': [{ var: 'loanTenure' }, '']
	},
	// Session 33: Item 36 — warn when urgent but no amount specified
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'urgencyLevel' }, 'immediate'] },
						{
							or: [
								{ '==': [{ var: 'loanAmount' }, ''] },
								{ '==': [{ var: 'loanAmount' }, 0] },
								{ '!': [{ var: 'loanAmount' }] }
							]
						}
					]
				},
				then: 'Immediate urgency selected but loan amount not specified \u2014 lenders need an amount to process urgent applications. Please enter at least an approximate amount.'
			}
		]
	}
};

/**
 * @deprecated Replaced by `q6_banksOfCurrentAccount` on the Professional Location
 * page, which captures all banking relationships (CA / OD / CC) in one
 * multi-select. CC/OD facility specifics are captured in Obligations.
 * Hidden via showWhen: never.
 */
export const q4_existingBankRelationship: RawSchemaQuestion = {
	id: 'q4_existingBankRelationship',
	bindsTo_template: 'existingBankRelationship',
	contextKey: 'existingBankRelationship',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'handshake'
	},
	required: false,
	question: 'Does the applicant have an existing banking relationship for the practice?',
	options: [
		{ label: 'Yes — active account/loan with a bank', value: 'yes', icon: 'CheckCircle' },
		{ label: 'No — no existing banking facility', value: 'no', icon: 'MinusCircle' }
	],
	// Hidden — superseded by q6_banksOfCurrentAccount on the Location page
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/** @deprecated Replaced by current account capture — per-loan lender already in Obligations.
 * Kept for backward compat with saved forms. Hidden via showWhen: false. */
export const q5_dcExistingBank: RawSchemaQuestion = {
	id: 'q5_dcExistingBank',
	bindsTo_template: 'dcExistingBank',
	contextKey: 'dcExistingBank',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select existing bank',
		icon: 'landmark'
	},
	required: false,
	question: 'Which bank/NBFC is the existing facility with?',
	// Hidden — per-loan lender is already captured in the Obligations section
	showWhen: { '==': [{ var: '__never__' }, 'true'] },
	options: []
};

// ── Current Account Capture (replaces dcExistingBank for DC flows) ────────
// Current account banking relationship and turnover are key assessment factors.

/**
 * @deprecated Duplicate of `pp_hasCurrentAccount` (Professional Practice income
 * specifics), which is the canonical capture used by the rule engine + lender
 * payload. Hidden via showWhen: never.
 */
export const q5a_hasCurrentAccount: RawSchemaQuestion = {
	id: 'q5a_hasCurrentAccount',
	bindsTo_template: 'hasCurrentAccount',
	contextKey: 'hasCurrentAccount',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Does the applicant have any current / savings accounts used for the practice?',
	options: [
		{ label: 'Yes', value: 'Yes', icon: 'CheckCircle' },
		{ label: 'No', value: 'No', icon: 'MinusCircle' }
	],
	// Hidden — superseded by income-profile capture + Location-page multi-select
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/**
 * @deprecated Superseded by `q6_banksOfCurrentAccount` on the Professional Location
 * page. Hidden via showWhen: never.
 */
export const q5b_currentAccountBanks: RawSchemaQuestion = {
	id: 'q5b_currentAccountBanks',
	bindsTo_template: 'currentAccountBanks',
	contextKey: 'banksName',
	type: 'multiple-select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select bank(s)',
		icon: 'landmark'
	},
	required: true,
	question: 'Which banks does the applicant hold current / practice accounts with?',
	options: [],
	// Hidden — superseded by q6_banksOfCurrentAccount on the Location page
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/** Returns all questions for the Your Loan Requirements page */
export function getLoanRequirementPageQuestions(): RawSchemaQuestion[] {
	// q4_existingBankRelationship, q5_dcExistingBank, q5a_hasCurrentAccount, q5b_currentAccountBanks
	// are intentionally excluded — superseded by the q6_banksOfCurrentAccount multi-select on the
	// Professional Location page and the per-income-source `pp_hasCurrentAccount` capture.
	return [
		q_professionalApplicantType,
		q_professionalCategory,
		q0_loanPurpose,
		q1_loanTenure,
		q2_loanAmount
	];
}
