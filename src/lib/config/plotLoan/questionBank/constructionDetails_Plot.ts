/**
 * Construction Details Questions
 * Page: constructionDetails_Plot
 *
 * For Construction Loan Only: includes plot current state + mortgage status questions
 * at the top (hidden for Plot & Construction Loan via showWhen).
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ---------------------------------------------------------------------------
// Construction Loan Only — Plot State & Mortgage (q0 series)
// These only appear when loanVariant === 'Construction Loan Only'
// (Plot Loan variant is stored in `loanVariant` post-2026-05-31 rename — ADR-0020.)
// ---------------------------------------------------------------------------

const IS_CONSTRUCTION_ONLY = {
	'==': [{ var: 'loanVariant' }, 'Construction Loan Only']
};

export const q0_plotCurrentState: RawSchemaQuestion = {
	id: 'q0_plotCurrentState',
	bindsTo_template: 'plotCurrentState',
	contextKey: 'plotCurrentState',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'clipboard-list'
	},
	required: true,
	question: 'What is the current state of the plot / property?',
	description:
		"<div class='info-box highlight'>This determines the type of construction loan product and documentation required. Each scenario has different lender options and disbursement approaches.</div>",
	// flagKey auto-derives constructionProgress so the redundant Q2
	// (q3_constructionProgress) only needs to be asked for the partial_construction
	// case — the other two cases have a single logical answer:
	//   vacant_plot     → constructionProgress='not_started'
	//   existing_house  → constructionProgress='completed'
	//   partial_*       → cleared so user picks the actual stage in Q2
	// Eliminates the "Vacant plot + Construction completed" contradiction
	// the user reported on 2026-05-11.
	options: [
		{
			label: 'Vacant plot — no construction exists',
			value: 'vacant_plot',
			icon: 'Circle',
			flagKey: { constructionProgress: 'not_started' }
		},
		{
			label: 'Partial construction (foundation/walls started but incomplete)',
			value: 'partial_construction',
			icon: 'Layers',
			flagKey: { constructionProgress: '' }
		},
		{
			label: 'Existing house — want to add floors or extend',
			value: 'existing_house',
			icon: 'Building',
			flagKey: { constructionProgress: 'completed' }
		}
	],
	showWhen: IS_CONSTRUCTION_ONLY,
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'plotCurrentState' }, 'existing_house']
				},
				then: 'Adding floors requires a structural stability certificate, revised building plan approval, and FSI/FAR compliance check. This is treated as a Home Extension Loan — not all lenders offer this product.'
			},
			{
				case: {
					'==': [{ var: 'plotCurrentState' }, 'partial_construction']
				},
				then: 'Bank will inspect existing construction quality before sanctioning. Disbursement starts from the next incomplete stage — no funds released for already-completed stages.'
			}
		]
	}
};

export const q0b_plotMortgageStatus: RawSchemaQuestion = {
	id: 'q0b_plotMortgageStatus',
	bindsTo_template: 'plotMortgageStatus',
	contextKey: 'plotMortgageStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'landmark'
	},
	required: true,
	question: 'Is there an existing loan / mortgage on this plot or property?',
	description:
		"<div class='info-box highlight'>If the plot has a running loan, the construction loan options depend on whether the same lender can extend the facility or a balance transfer is needed.</div>",
	options: [
		{
			label: 'No — plot/property is owned outright, free from any loan',
			value: 'free',
			icon: 'CheckCircle'
		},
		{
			label: 'Yes — there is a running loan on this plot/property',
			value: 'has_loan',
			icon: 'AlertTriangle'
		}
	],
	showWhen: {
		and: [IS_CONSTRUCTION_ONLY, { '!=': [{ var: 'plotCurrentState' }, ''] }]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'plotMortgageStatus' }, 'has_loan']
				},
				then: 'If another lender holds the mortgage, they must either extend a construction loan (top-up) OR a new lender must do Balance Transfer + Construction. Direct construction loan from a different lender is not possible without clearing the existing mortgage first.'
			}
		]
	}
};

export const q0c_plotLoanLender: RawSchemaQuestion = {
	id: 'q0c_plotLoanLender',
	bindsTo_template: 'plotLoanLender',
	contextKey: 'banksName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select current lender',
		icon: 'landmark'
	},
	required: true,
	question: 'Which lender currently holds the loan on this plot/property?',
	showWhen: {
		'==': [{ var: 'plotMortgageStatus' }, 'has_loan']
	}
};

// ---------------------------------------------------------------------------
// Standard Construction Questions (shared by Plot & Construction + Construction Only)
// ---------------------------------------------------------------------------

export const q1_constructionType: RawSchemaQuestion = {
	id: 'q1_constructionType',
	bindsTo_template: 'constructionType',
	contextKey: 'constructionType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'home'
	},
	required: true,
	question: 'What type of construction is planned / being built?',
	description:
		"<div class='info-box highlight'>Select the type of building being constructed. This affects loan terms, LTV ratio, and documentation requirements.</div>",
	options: [
		{
			label: 'Independent House',
			value: 'House',
			icon: 'Home'
		},
		{
			label: 'Villa',
			value: 'Villa',
			icon: 'Castle'
		},
		{
			label: 'Row House',
			value: 'Row House',
			icon: 'LayoutGrid'
		},
		{
			label: 'Farm House',
			value: 'Farm House',
			icon: 'TreePine'
		},
		{
			label: 'Floor addition / extension on existing house',
			value: 'floor_addition',
			icon: 'Building',
			showWhen: {
				'==': [{ var: 'plotCurrentState' }, 'existing_house']
			}
		}
	]
};

export const q2_constructionApprovalStatus: RawSchemaQuestion = {
	id: 'q2_constructionApprovalStatus',
	bindsTo_template: 'constructionApprovalStatus',
	contextKey: 'constructionApprovalStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'clipboard-check'
	},
	required: true,
	question: 'Has the building plan been approved / sanctioned by the local municipal authority?',
	description:
		"<div class='info-box highlight'>An approved building plan from the municipal corporation or development authority is <strong>mandatory</strong> before any lender will disburse construction funds. Without this, only the plot purchase portion can proceed.</div>",
	options: [
		{
			label: 'Yes — approved and sanctioned',
			value: 'approved',
			icon: 'CheckCircle'
		},
		{
			label: 'Partially approved (some conditions pending)',
			value: 'partial',
			icon: 'AlertTriangle'
		},
		{
			label: 'Plan submitted, pending approval',
			value: 'pending',
			icon: 'Clock'
		},
		{
			label: 'No building plan yet',
			value: 'no_plan',
			icon: 'FileX'
		}
	],
	showWhen: {
		'!=': [{ var: 'constructionType' }, '']
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'constructionApprovalStatus' }, 'no_plan']
				},
				then: 'No lender will disburse construction funds without an approved building plan. The plot purchase portion may still proceed, but construction disbursement will be held until plan approval.'
			},
			{
				case: {
					'==': [{ var: 'constructionApprovalStatus' }, 'partial']
				},
				then: 'Partial approval may delay disbursement. Some lenders may proceed with initial stages but hold remaining tranches until full approval.'
			}
		]
	}
};

export const q3_constructionProgress: RawSchemaQuestion = {
	id: 'q3_constructionProgress',
	bindsTo_template: 'constructionProgress',
	contextKey: 'constructionProgress',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'hard-hat'
	},
	required: true,
	question: 'What is the current construction progress?',
	description:
		"<div class='info-box highlight'>Banks disburse construction loans <strong>stage-wise</strong> — funds are released only after verifying each completed stage. Disbursement starts from the current stage forward.</div>",
	options: [
		{
			label: 'Not started',
			value: 'not_started',
			icon: 'Circle'
		},
		{
			label: 'Foundation stage',
			value: 'foundation',
			icon: 'Layers'
		},
		{
			label: 'Plinth level',
			value: 'plinth',
			icon: 'BoxSelect'
		},
		{
			label: 'Superstructure (walls & slab)',
			value: 'superstructure',
			icon: 'Building'
		},
		{
			label: 'Finishing stage',
			value: 'finishing',
			icon: 'PaintBucket'
		},
		{
			label: 'Construction completed',
			value: 'completed',
			icon: 'CheckCircle2'
		}
	],
	// In the Construction Loan Only flow, only ask when plotCurrentState
	// === 'partial_construction' — the other two states (vacant_plot,
	// existing_house) have a single logical progress value already set by
	// q0_plotCurrentState's flagKey, so re-asking is redundant and lets
	// the user pick a contradictory answer. The BT branch
	// (btConstructionStatus === 'in_progress') is preserved unchanged
	// because plotCurrentState isn't captured in the BT flow.
	showWhen: {
		or: [
			{
				and: [
					{ '!=': [{ var: 'loanType' }, 'Balance Transfer Only'] },
					{ '!=': [{ var: 'constructionType' }, ''] },
					{ '==': [{ var: 'plotCurrentState' }, 'partial_construction'] }
				]
			},
			{ '==': [{ var: 'btConstructionStatus' }, 'in_progress'] }
		]
	}
};

export const q4_builtArea: RawSchemaQuestion = {
	id: 'q4_builtArea',
	bindsTo_template: 'builtArea',
	contextKey: 'builtArea',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'number_fields',
	uiMeta: {
		placeholder: 'Enter built-up area',
		showAreaUnitDropdown: true,
		showNumberInWords: true,
		maxLength: 5
	},
	required: false,
	minLimit: 100,
	maxLimit: 50000,
	question: {
		switch: [
			{
				case: { '==': [{ var: 'plotCurrentState' }, 'existing_house'] },
				then: 'What is the planned built-up area for the new floor / extension?'
			}
		],
		default: 'What is the planned / actual built-up area?'
	},
	description:
		'Enter the total built-up area as per the approved building plan or actual construction.',
	showWhen: {
		'!=': [{ var: 'constructionType' }, '']
	},
	validation: {
		condition: [
			{
				case: {
					'>': [{ var: 'builtArea' }, 50000]
				},
				then: 'Built-up area should not exceed 50,000'
			},
			{
				case: {
					and: [{ '!=': [{ var: 'builtArea' }, ''] }, { '<': [{ var: 'builtArea' }, 100] }]
				},
				then: 'Built-up area should be at least 100'
			}
		]
	}
};

export const q5_ocCcAvailable: RawSchemaQuestion = {
	id: 'q5_ocCcAvailable',
	bindsTo_template: 'ocCcAvailable',
	contextKey: 'ocCcAvailable',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'file-check-2'
	},
	required: true,
	question:
		'Has the building received its OC (Occupancy Certificate) / CC (Completion Certificate)?',
	description:
		"<div class='info-box highlight'>OC/CC is proof that the construction complies with approved building plans. Required for completed buildings.</div>",
	options: [
		{
			label: 'Both OC and CC obtained',
			value: 'BOTH',
			icon: 'CheckCircle2'
		},
		{
			label: 'Only CC obtained',
			value: 'CC_ONLY',
			icon: 'CheckCircle'
		},
		{
			label: 'Neither available',
			value: 'NONE',
			icon: 'XCircle'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		or: [
			{ '==': [{ var: 'constructionProgress' }, 'completed'] },
			{ '==': [{ var: 'btConstructionStatus' }, 'completed'] }
		]
	}
};

export const q7_constructorType: RawSchemaQuestion = {
	id: 'q7_constructorType',
	bindsTo_template: 'constructorType',
	contextKey: 'constructorType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'wrench'
	},
	required: true,
	question: 'Who is handling the construction?',
	description:
		'The type of constructor affects documentation requirements and disbursement process.',
	options: [
		{
			label: 'Self-construction (own supervision)',
			value: 'self_construction',
			icon: 'User'
		},
		{
			label: 'Licensed contractor / engineer',
			value: 'licensed_contractor',
			icon: 'HardHat'
		},
		{
			label: 'Builder / developer',
			value: 'builder',
			icon: 'Building2'
		}
	],
	showWhen: {
		'!=': [{ var: 'constructionType' }, '']
	}
};

export const q8_btConstructionStatus: RawSchemaQuestion = {
	id: 'q8_btConstructionStatus',
	bindsTo_template: 'btConstructionStatus',
	contextKey: 'btConstructionStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'arrow-left-right'
	},
	required: true,
	question: 'What is the current status of construction on this plot?',
	description:
		'For balance transfer of composite loans, the current construction status determines documentation and valuation requirements.',
	options: [
		{
			label: 'Construction not started',
			value: 'not_started',
			icon: 'Circle'
		},
		{
			label: 'Construction in progress',
			value: 'in_progress',
			icon: 'Loader'
		},
		{
			label: 'Construction completed',
			value: 'completed',
			icon: 'CheckCircle2'
		}
	],
	showWhen: {
		'==': [{ var: 'loanType' }, 'Balance Transfer Only']
	}
};

/** Returns all questions for the Construction Details page */
export function getConstructionDetailsPlotQuestions(): RawSchemaQuestion[] {
	return [
		// Construction Loan Only — plot state & mortgage (hidden for other loan types)
		q0_plotCurrentState,
		q0b_plotMortgageStatus,
		q0c_plotLoanLender,
		// Standard construction questions
		q1_constructionType,
		q2_constructionApprovalStatus,
		q3_constructionProgress,
		q4_builtArea,
		q5_ocCcAvailable,
		q7_constructorType,
		q8_btConstructionStatus
	];
}
