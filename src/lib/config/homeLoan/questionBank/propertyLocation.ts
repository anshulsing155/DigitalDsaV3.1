/**
 * Property Location & Type questions for home loan (page: propertyLocation_homeLoan).
 *
 * 11 questions in page order:
 *   q1_propertyAreaType         — select, always shown (required)
 *   q2a_purchaseType_planned    — radio, PLANNED_AUTHORITY only (4 options incl. authority)
 *   q2b_purchaseType_other      — radio, non-PLANNED_AUTHORITY (3 options, no authority)
 *   q_propertyLocation          — compound location (State + City + Area + Pincode)
 *   q_builderName               — select, dynamic builder options from city (optionResolver)
 *   q_builderNameManual         — text, manual builder entry (when "Other" or no data)
 *   q_projectName               — select, dynamic project options from city+builder (optionResolver)
 *   q_projectNameManual         — text, manual project entry (when "Other" or no data)
 *   q_propertyUsageIntent       — radio, intended property use
 *   + BT Registry questions     — (BT/Top-up only)
 *
 * NOTE: Legacy question IDs q4_propertyStateName, q5_propertyCityName, q6_pincode
 * are referenced as string keys in optionResolver.ts for backward compat with
 * saved forms. The TS exports were removed — only string IDs remain there.
 * Question IDs q_builderName, q_projectName are also in optionResolver.ts.
 *
 * Source of truth: homeLoanSchemaV2.json pages[1]
 */

import type { RawSchemaQuestion } from '../types.js';
import { buildPropertyLocationQuestion } from '../../schema/locationQuestions.js';
import { getBtRegistryQuestions } from './btRegistry.js';
import { q2_propertyIdentified } from './intake.js';

// ---------------------------------------------------------------------------
// q1 — Property Area Type
// ---------------------------------------------------------------------------

export const q1_propertyAreaType: RawSchemaQuestion = {
	id: 'q1_propertyAreaType',
	bindsTo_template: 'propertyAreaType',
	contextKey: 'propertyAreaType',
	type: 'select',
	selectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select Area Type',
		icon: 'map-pin'
	},
	required: true,

	question: {
		switch: [
			{
				case: { '==': [{ var: 'propertyIdentified' }, 'No'] },
				then: 'What type of area is the customer looking to buy in?'
			},
			{
				case: { '==': [{ var: 'propertyIdentified' }, 'Yes'] },
				then: 'Which type of area is this property located in?'
			}
		],
		default: 'Which type of area is this property located in?'
	},
	description: {
		switch: [
			{
				case: { '==': [{ var: 'propertyIdentified' }, 'No'] },
				then: "<div class='info-title'><i data-lucide='flag-triangle-right' class='inline-block h-4 w-4'></i>  Intended Area Type</div><div class='info-box info-title dark:text-gray-400'>The customer is coming for sanction/pre-approval — sanctions are conditional. Knowing the intended area type helps narrow down which lenders are likely to approve. If the area isn't decided yet, select 'Not Decided Yet'.</div>"
			}
		],
		default:
			"<div class='info-title'><i data-lucide='flag-triangle-right' class='inline-block h-4 w-4'></i>  Property Area Type</div><div class='info-box info-title dark:text-gray-400'>The surrounding area helps determine which lenders can finance the property.</div> <div class='info-box h-auto tip info-title dark:text-gray-400 flex items-center gap-2'><span class=''><i data-lucide='lightbulb' class='h-4 w-4 text-yellow-400'></i></span> Tip: Choose the option that best matches how the area looks and is commonly described.</div>"
	} as unknown as string,

	options: [
		{
			label: 'Planned / Development Authority Area',
			value: 'PLANNED_AUTHORITY',
			helperText: 'approved layout, township, large housing society'
		},
		{
			label: 'Converted Land / Approved Residential Use',
			value: 'CONVERTED_RESIDENTIAL',
			helperText: 'earlier agricultural or village land, now residential'
		},
		{
			label: 'Old Municipal Area / Traditional Mohalla',
			value: 'OLD_MUNICIPAL',
			helperText: 'inside city limits, older houses, narrow streets'
		},
		{
			label: 'Local Colony / Village / Panchayat Area',
			value: 'LOCAL_COLONY',
			helperText: 'non-planned or organic development'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			helperText: "I'm not certain about the area classification",
			showWhen: { '==': [{ var: 'propertyIdentified' }, 'Yes'] }
		},
		{
			label: 'Not Decided Yet',
			value: 'NOT_DECIDED',
			helperText: "Customer hasn't decided on a specific type of area",
			showWhen: { '==': [{ var: 'propertyIdentified' }, 'No'] }
		}
	],

	// FG-2 #15: Negative area detection beyond pincode — remind DSAs that specific
	// localities or sub-areas may be in bank negative lists even if the broader city/pincode
	// is acceptable. The rule engine checks negative areas during evaluation, but DSAs
	// should be aware of this risk factor at the form-filling stage.
	warning: {
		condition: [
			{
				case: {
					in: [{ var: 'propertyAreaType' }, ['CONVERTED_RESIDENTIAL', 'LOCAL_COLONY']]
				},
				then: 'Converted land and local colony areas are frequently on bank negative lists. Even if the city or pincode is serviceable, the specific locality may be excluded by individual lenders. The system will check this during evaluation — ensure the exact pincode is entered for accurate lender matching.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q2a — Purchase Type (PLANNED_AUTHORITY only — includes authority option)
// ---------------------------------------------------------------------------

export const q2a_purchaseType_planned: RawSchemaQuestion = {
	id: 'q2a_purchaseType_planned',
	bindsTo_template: 'purchaseType',
	contextKey: 'purchaseType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'What is the nature of property purchase?',
	description:
		"<div class='info-title'><i data-lucide='handshake' class='inline-block text-yellow-400 h-4 w-4'></i> Nature of Property Purchase</div><div class='info-box highlight dark:text-gray-400'>The loan process varies based on who you are buying the property from.</div>",

	options: [
		{
			label: 'Direct from Development Authority',
			value: 'direct_from_authority',
			helperText: 'Allotment from LDA, HUDA, PCMC, BDA, or similar development authority',
			uiMeta: { icon: 'Circle' },
			icon: 'Landmark',
			flagKey: { PropertyStage: '' }
		},
		{
			label: 'Direct from Builder',
			value: 'direct_from_builder',
			uiMeta: { icon: 'Circle' },
			icon: 'CircleDollarSign',
			flagKey: { PropertyStage: '' }
		},
		{
			label: 'Resale (via Endorsement)',
			value: 'resale_endorsement',
			helperText: 'Transfer of allotment through builder/authority to new buyer',
			uiMeta: { icon: 'Circle' },
			icon: 'FileKey',
			flagKey: { PropertyStage: '' }
		},
		{
			label: 'Resale (Normal)',
			value: 'resale_normal',
			uiMeta: { icon: 'Circle' },
			icon: 'ArrowLeftRight',
			flagKey: { PropertyStage: 'Ready To Move' }
		}
	],

	// Show only for New Loan with property identified in PLANNED_AUTHORITY areas.
	// BT/Top-up: property already purchased — purchase type is irrelevant.
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
			{ '==': [{ var: 'loanType' }, 'New Loan'] },
			{ '==': [{ var: 'propertyIdentified' }, 'Yes'] }
		]
	}
};

// ---------------------------------------------------------------------------
// q2b — Purchase Type (non-PLANNED_AUTHORITY — no authority option)
// ---------------------------------------------------------------------------

export const q2b_purchaseType_other: RawSchemaQuestion = {
	id: 'q2b_purchaseType_other',
	bindsTo_template: 'purchaseType',
	contextKey: 'purchaseType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'What is the nature of property purchase?',
	description:
		"<div class='info-title'><i data-lucide='handshake' class='inline-block text-yellow-400 h-4 w-4'></i> Nature of Property Purchase</div><div class='info-box highlight dark:text-gray-400'>The loan process varies based on who you are buying the property from.</div>",

	options: [
		{
			label: 'Direct from Builder',
			value: 'direct_from_builder',
			uiMeta: { icon: 'Circle' },
			icon: 'CircleDollarSign',
			flagKey: { PropertyStage: '' }
		},
		{
			label: 'Resale (via Endorsement)',
			value: 'resale_endorsement',
			helperText: 'Transfer of allotment through builder to new buyer',
			uiMeta: { icon: 'Circle' },
			icon: 'FileKey',
			flagKey: { PropertyStage: '' }
		},
		{
			label: 'Resale (Normal)',
			value: 'resale_normal',
			uiMeta: { icon: 'Circle' },
			icon: 'ArrowLeftRight',
			flagKey: { PropertyStage: 'Ready To Move' }
		}
	],

	// Show for New Loan with property identified, non-PLANNED_AUTHORITY areas.
	// BT/Top-up: property already purchased — purchase type is irrelevant.
	showWhen: {
		and: [
			{ '!=': [{ var: 'propertyAreaType' }, ''] },
			{ '!=': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
			{ '==': [{ var: 'loanType' }, 'New Loan'] },
			{ '==': [{ var: 'propertyIdentified' }, 'Yes'] }
		]
	}
};

// ---------------------------------------------------------------------------
// q_propertyLocation — Compound location (State + City + Area + Pincode)
// Replaces q4_propertyStateName + q5_propertyCityName + q6_pincode
// ---------------------------------------------------------------------------
// IDENTIFIED branch only — full picker (state + city + area + pincode).
// Pre-approval (propertyIdentified=No) uses q_propertySearchLocation below
// which captures state + city only. Both bind to the same propertyStateName/
// propertyCityName fields via the `property` prefix, so the values carry
// over seamlessly when the DSA toggles propertyIdentified.

export const q_propertyLocation: RawSchemaQuestion = buildPropertyLocationQuestion({
	question: 'Where is the property located?',
	// When property identified: show after purchaseType. BT/Top-up: show after area type.
	showWhen: {
		or: [
			// BT/Top-up: always show after area type
			{
				and: [
					{ '!=': [{ var: 'propertyAreaType' }, ''] },
					{ '!=': [{ var: 'loanType' }, 'New Loan'] }
				]
			},
			// New Loan with identified property: after purchaseType
			{
				and: [
					{ '==': [{ var: 'propertyIdentified' }, 'Yes'] },
					{ '!=': [{ var: 'purchaseType' }, ''] }
				]
			}
		]
	}
});

// ---------------------------------------------------------------------------
// q_propertySearchLocation — State + City only (pre-approval / "still exploring")
// ---------------------------------------------------------------------------
// Shown when propertyIdentified=No. Same `property` prefix → binds to
// propertyStateName + propertyCityName, so the answers flow into the same
// case route + lender geo-filter as the identified path. Pincode + area are
// hidden because they're meaningless when the customer hasn't picked a
// specific property yet — sidebar guidance suggests picking the most likely
// city if exploring multiple.

export const q_propertySearchLocation: RawSchemaQuestion = buildPropertyLocationQuestion({
	id: 'q_propertySearchLocation',
	question: 'Where is the customer searching for the property?',
	descriptionHeader:
		'Pick the State and City the customer is targeting. This filters lender availability for pre-approval — exact area/pincode is captured later once a property is shortlisted.',
	locationConfig: {
		// Pre-approval doesn't need pincode (the actual property pincode is
		// unknown) or area (no specific locality yet). Just enough geo to
		// filter lenders by serviceable city.
		showArea: false,
		showPincode: false
	},
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyIdentified' }, 'No'] },
			{ '!=': [{ var: 'propertyAreaType' }, ''] }
		]
	}
});

// ---------------------------------------------------------------------------
// q_builderName — Builder/Promoter selection (dynamic options from city)
// ---------------------------------------------------------------------------
// Options populated dynamically by optionResolver based on propertyCityName.
// If builders exist for the city → dropdown with builders + "Other".
// If no data for city → only manual text entry (q_builderNameManual).

export const q_builderName: RawSchemaQuestion = {
	id: 'q_builderName',
	bindsTo_template: 'builderName',
	contextKey: 'builderName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select Builder / Promoter',
		icon: 'building-2',
		// When no builder data exists for the selected city, show a text input instead
		fallbackToText: true,
		fallbackLabel: 'Enter the builder / promoter name',
		fallbackPlaceholder: 'Enter builder / promoter name'
	},
	required: true,

	question: 'Who is the builder / promoter?',
	description:
		"<div class='info-title'><i data-lucide='brick-wall' class='inline-block h-4 w-4'></i> Builder / Promoter</div><div class='info-box highlight dark:text-gray-400'>Select the builder or promoter from the list if available. If not listed, choose \"Other\" to enter manually.</div>",

	// Options populated by optionResolver (dynamic from city) — do NOT add inline options
	// Show after property location is answered AND city is selected
	// Only when builder data exists for the city (handled by optionResolver returning options)
	showWhen: {
		and: [
			{ '!=': [{ var: 'propertyCityName' }, ''] },
			{
				or: [
					// New Loan: after purchaseType is answered (property identified = Yes)
					{
						and: [
							{ '==': [{ var: 'loanType' }, 'New Loan'] },
							{ '==': [{ var: 'propertyIdentified' }, 'Yes'] },
							{ '!=': [{ var: 'purchaseType' }, ''] },
							// Only for builder-related purchase types (not authority or normal resale)
							{
								in: [{ var: 'purchaseType' }, ['direct_from_builder', 'resale_endorsement']]
							}
						]
					},
					// BT/Top-up: after area type & city answered
					{
						and: [
							{ '!=': [{ var: 'propertyAreaType' }, ''] },
							{
								in: [
									{ var: 'loanType' },
									['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
								]
							}
						]
					}
				]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q_builderNameManual — Manual builder name entry (when "Other" selected or no data)
// ---------------------------------------------------------------------------

export const q_builderNameManual: RawSchemaQuestion = {
	id: 'q_builderNameManual',
	bindsTo_template: 'builderNameManual',
	contextKey: 'builderNameManual',
	type: 'text',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter builder / promoter name',
		icon: 'building-2'
	},
	required: true,

	question: 'Enter the builder / promoter name',

	// Show when builder dropdown has "Other" selected
	showWhen: {
		'==': [{ var: 'builderName' }, '__other__']
	}
};

// ---------------------------------------------------------------------------
// q_projectName — Project selection (dynamic options from city + builder)
// ---------------------------------------------------------------------------
// Options populated dynamically by optionResolver based on city + builder.
// If projects exist for the builder → dropdown with projects + "Other".
// If no data → only manual text entry (q_projectNameManual).

export const q_projectNameSelection: RawSchemaQuestion = {
	id: 'q_projectName',
	bindsTo_template: 'projectNameSelected',
	contextKey: 'projectNameSelected',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select Project',
		icon: 'home',
		// When no project data exists for the selected builder, show a text input instead
		fallbackToText: true,
		fallbackLabel: 'Enter the project / society name',
		fallbackPlaceholder: 'Enter project / society name'
	},
	required: true,

	question: 'Which project is the property in?',
	description:
		"<div class='info-title'><i data-lucide='house' class='inline-block h-4 w-4'></i>Project Selection</div><div class='info-box highlight dark:text-gray-400'>Select the project from the list if available. If not listed, choose \"Other\" to enter the project name manually.</div>",

	// Options populated by optionResolver (dynamic from city + builder)
	// Show when a known builder is selected (not "Other" and not empty)
	showWhen: {
		and: [{ '!=': [{ var: 'builderName' }, ''] }, { '!=': [{ var: 'builderName' }, '__other__'] }]
	}
};

// ---------------------------------------------------------------------------
// q_projectNameManual — Manual project name entry (when "Other" or no data)
// ---------------------------------------------------------------------------

export const q_projectNameManual: RawSchemaQuestion = {
	id: 'q_projectNameManual',
	bindsTo_template: 'projectNameManual',
	contextKey: 'projectNameManual',
	type: 'text',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter project / society name',
		icon: 'home'
	},
	required: true,

	question: 'Enter the project / society name',

	// Show when:
	// 1. Builder is "Other" (manual entry) — always need manual project name
	// 2. Project dropdown has "Other" selected
	showWhen: {
		or: [
			{ '==': [{ var: 'builderName' }, '__other__'] },
			{ '==': [{ var: 'projectNameSelected' }, '__other__'] }
		]
	}
};

// ---------------------------------------------------------------------------
// q_propertyUsageIntent — NEW: Intended use of the property
// ---------------------------------------------------------------------------

export const q_propertyUsageIntent: RawSchemaQuestion = {
	id: 'q_propertyUsageIntent',
	bindsTo_template: 'propertyUsageIntent',
	contextKey: 'propertyUsageIntent',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	// New Loan: future intent. BT/Top-up: current occupancy status.
	question: {
		switch: [
			{
				case: {
					in: [
						{ var: 'loanType' },
						['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
					]
				},
				then: 'What is the current occupancy status of this property?'
			}
		],
		default: 'What is the intended use of the property?'
	} as unknown as string,

	description: {
		switch: [
			{
				case: {
					in: [
						{ var: 'loanType' },
						['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
					]
				},
				then: "<div class='info-title'><i data-lucide='house' class='inline-block h-4 w-4'></i> Current Occupancy</div><div class='info-box highlight dark:text-gray-400''>Lenders need to know if the applicant resides in the property (security), if it's rented out (income source), or if it's vacant (affects valuation).</div>"
			}
		],
		default:
			"<div class='info-title'><i data-lucide='house' class='inline-block h-4 w-4'></i> Property Usage Intent</div><div class='info-box highlight dark:text-gray-400''>Some lenders offer better rates for self-occupied properties. Investment properties may have different LTV limits.</div>"
	} as unknown as string,

	options: [
		{
			label: 'Self-occupied',
			value: 'self_occupied',
			uiMeta: { icon: 'Circle' },
			icon: 'Home'
		},
		{
			label: 'Rented out',
			value: 'rented_out',
			uiMeta: { icon: 'Circle' },
			icon: 'TrendingUp',
			// BT/Top-up only — for New Loan, "Investment / Rental" is used instead
			showWhen: {
				in: [
					{ var: 'loanType' },
					['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
				]
			}
		},
		{
			label: 'Investment / Rental',
			value: 'investment',
			uiMeta: { icon: 'Circle' },
			icon: 'TrendingUp',
			// New Loan only — for BT, "Rented out" is used instead
			showWhen: { '==': [{ var: 'loanType' }, 'New Loan'] }
		},
		{
			label: 'Vacant',
			value: 'vacant',
			uiMeta: { icon: 'Circle' },
			icon: 'Building',
			// BT/Top-up only — vacant is not relevant for new purchase intent
			showWhen: {
				in: [
					{ var: 'loanType' },
					['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
				]
			}
		},
		{
			label: {
				switch: [
					{
						case: {
							in: [
								{ var: 'loanType' },
								['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
							]
						},
						then: 'Self-use + Rented'
					}
				],
				default: 'Both (partial self-use)'
			} as unknown as string,
			value: 'both',
			uiMeta: { icon: 'Circle' },
			icon: 'Layers'
		}
	],

	// For New Loan: show after purchase type is answered (property identified = Yes).
	// For BT/Top-up: show after area type is answered (purchaseType is not asked in BT).
	showWhen: {
		or: [
			// New Loan: after purchaseType is answered
			{
				and: [
					{ '==': [{ var: 'loanType' }, 'New Loan'] },
					{ '==': [{ var: 'propertyIdentified' }, 'Yes'] },
					{ '!=': [{ var: 'purchaseType' }, ''] }
				]
			},
			// BT/Top-up: after area type is answered (no purchaseType in BT)
			{
				and: [
					{ '!=': [{ var: 'propertyAreaType' }, ''] },
					{
						in: [
							{ var: 'loanType' },
							['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
						]
					}
				]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/**
 * All property location questions in page order.
 *
 * Order matters — it defines the visual sequence on the form page:
 *   1. Area type (what kind of neighbourhood)
 *   2a/2b. Purchase type (who are you buying from — split by area type)
 *   3. Location (compound: State + City + Area + Pincode)
 *   4. Builder/Promoter selection (dynamic from city data)
 *   4b. Builder name manual entry (when "Other" or no data)
 *   5. Project selection (dynamic from city + builder data)
 *   5b. Project name manual entry (when "Other" or no data)
 *   6. Property usage intent (self-occupied vs investment)
 *   7–10. BT Registry questions (BT/Top-up only — auto-hidden for New Loan)
 *
 * BT Registry questions merged here so BT flow has 4-6 Qs instead of 2+2 across pages.
 */
/**
 * All property location questions in page order.
 *
 * NOTE: Builder/project questions (q_builderName, q_builderNameManual,
 * q_projectNameSelection, q_projectNameManual) moved to propertyCharacter page
 * as part of the City→Project→Builder→Lender flow redesign (Session 46).
 * Questions are still exported from this file for backward compat.
 */
export function getPropertyLocationQuestions(): RawSchemaQuestion[] {
	return [
		q2_propertyIdentified,
		q1_propertyAreaType,
		q2a_purchaseType_planned,
		q2b_purchaseType_other,
		q_propertySearchLocation,
		q_propertyLocation,
		q_propertyUsageIntent,
		...getBtRegistryQuestions()
	];
}
