import type { RawSchemaQuestion } from '../types.js';
import {
	q_builderName,
	q_builderNameManual,
	q_projectNameSelection,
	q_projectNameManual
} from './propertyLocation.js';

/**
 * Property Character questions for the `propertyCharacter_homeLoan` page.
 *
 * Covers construction type, carpet area, property stage, age,
 * then the dynamic Project→Builder→Lender chain (Session 46 redesign):
 *   Project (select, RERA data) → Builder (derived from project) →
 *   Builder Role → RERA Status → Project Lenders (multi-select, crowdsourced)
 *
 * Old text-based q5_projectName and q1e_projectLenders replaced with
 * dynamic select fields that capture structured data for lender intelligence.
 */
export function getPropertyCharacterQuestions(): RawSchemaQuestion[] {
	return [
		// ── q1: Construction Type ───────────────────────────────────────
		{
			id: 'q1_constructionType',
			bindsTo_template: 'constructionType',
			contextKey: 'constructionType',
			type: 'select',
			uiGroup: 'select_fields',
			selectClass: 'mt-[1rem] md:mt-[2rem]',
			uiMeta: {
				placeholder: 'Choose Construction Type',
				icon: 'construction'
			},
			required: true,
			question: 'What type of construction is it?',
			options: [
				{ label: 'House/Villa', value: 'House' },
				{ label: 'Flat', value: 'Flat' },
				{ label: 'Floor', value: 'Floor' }
			]
		},

		// ── q4: Carpet Area (moved before PropertyStage — always needed) ─
		{
			id: 'q4_carpetArea',
			bindsTo_template: 'carpetArea',
			contextKey: 'carpetArea',
			type: 'text',
			uiType: 'number',
			textFieldClass: 'mt-8 md:mt-12',
			uiGroup: 'inputNumber',
			uiMeta: {
				placeholder: 'Enter carpet area',
				showAreaUnitDropdown: true,
				showNumberInWords: true,
				maxLength: 6, // 6 digits = max 999,999 sq ft
				minLength: 3
			},
			required: true,
			minLimit: 100,
			maxLimit: 999999,
			question: 'What is the carpet area of the property?',
			description:
				"<div class='info-title'><i data-lucide='drafting-compass' class='inline-block h-4 w-4'></i> Carpet Area</div><div class='info-box highlight dark:text-gray-400'>Carpet area is the actual usable floor area within the walls <i data-lucide='brick-wall' class='inline-block h-4 w-4'></i> the primary metric banks use for property valuation.</div>",
			showWhen: {
				'!=': [{ var: 'constructionType' }, '']
			}
		},

		// ── q2: Property Stage ──────────────────────────────────────
		// For RERA projects: Under Construction = No OC/CC yet; Ready To Move = OC/CC in hand
		// For non-RERA projects: Under Construction = Registry not possible yet;
		//                        Ready To Move = Registry possible
		{
			id: 'q2_PropertyStage',
			bindsTo_template: 'PropertyStage',
			contextKey: 'PropertyStage',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'What is the construction stage of the property?',
			description:
				"<div class='info-title'><i data-lucide='pickaxe' class='inline-block h-4 w-4'></i> Construction Stage</div><div class='info-box highlight dark:text-gray-400'>Loan processing differs based on whether the property is under construction or ready to move in.</div>",
			options: [
				{
					label: 'Under Construction',
					value: 'Under Construction',
					labelDescription: 'No OC/CC yet, registry not open',
					uiMeta: { icon: 'Circle' },
					icon: 'Construction'
				},
				{
					label: 'Ready To Move',
					value: 'Ready To Move',
					labelDescription: 'OC/CC in hand, registry open',
					uiMeta: { icon: 'Circle' },
					icon: 'Home'
				}
			],
			showWhen: {
				and: [
					{ '!=': [{ var: 'constructionType' }, ''] },
					// Normal resale = registry done = always Ready To Move (auto-set via flagKey)
					{ '!=': [{ var: 'purchaseType' }, 'resale_normal'] },
					{
						'!': {
							and: [
								{
									in: [
										{ var: 'loanType' },
										['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
									]
								},
								{ '==': [{ var: 'isRegistryDone' }, 'Yes'] }
							]
						}
					}
				]
			}
		},

		// ── q3: Property Age ────────────────────────────────────────────
		{
			id: 'q3_propertyAge',
			bindsTo_template: 'propertyAge',
			contextKey: 'propertyAge',
			type: 'select',
			selectClass: 'mt-8 md:mt-12',
			uiGroup: 'select_fields',
			uiMeta: {
				placeholder: 'Select Property Age',
				icon: 'calendar'
			},
			required: true,
			question: 'How old is this property?',
			description:
				"<div class='info-title'><i data-lucide='house' class='inline-block h-4 w-4'></i> Property Age</div><div class='info-box highlight dark:text-gray-400'>The age of the property affects loan eligibility, maximum tenure, and valuation.</div>",
			options: [
				{ label: 'New (0–5 years)', value: '0-5' },
				{ label: '6–10 years', value: '6-10' },
				{ label: '11–15 years', value: '11-15' },
				{ label: '16–20 years', value: '16-20' },
				{ label: '21–25 years', value: '21-25' },
				{ label: '26–30 years', value: '26-30' },
				{ label: 'Over 30 years', value: '30+' }
			],
			showWhen: {
				and: [
					{ '!=': [{ var: 'constructionType' }, ''] },
					{
						or: [
							// Normal resale — property age matters (could be decades old)
							{ '==': [{ var: 'purchaseType' }, 'resale_normal'] },
							// BT/Top-up with registry done — existing property, age relevant
							{
								and: [
									{
										in: [
											{ var: 'loanType' },
											['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
										]
									},
									{ '==': [{ var: 'isRegistryDone' }, 'Yes'] }
								]
							}
						]
					}
				]
			}
		},

		// ══════════════════════════════════════════════════════════════
		// Dynamic Builder → Project → Lender chain (Session 46 redesign)
		// City → (all projects → extract builders) → DSA picks Builder →
		// filter projects for builder → DSA picks Project → Lenders
		// ══════════════════════════════════════════════════════════════

		// ── Builder selection (dynamic from city RERA data) ────────────
		// Uses optionResolver q_builderName generator (city → builders via projects).
		{
			...q_builderName,
			// Override showWhen for propertyCharacter context:
			// Show for Under Construction + Flat + applicable loan types
			// Exclude authority purchases — they don't have builders
			showWhen: {
				and: [
					{ '!=': [{ var: 'propertyCityName' }, ''] },
					{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] },
					{ '==': [{ var: 'constructionType' }, 'Flat'] },
					{
						or: [
							// New Loan: only for builder-related purchase types
							{
								and: [
									{ '==': [{ var: 'loanType' }, 'New Loan'] },
									{
										in: [{ var: 'purchaseType' }, ['direct_from_builder', 'resale_endorsement']]
									}
								]
							},
							// BT/Top-up: always show (no purchaseType question)
							{
								in: [{ var: 'loanType' }, ['Balance Transfer Only', 'Balance Transfer With Top-up']]
							}
						]
					}
				]
			}
		},

		// ── Builder name manual entry ─────────────────────────────────
		{
			...q_builderNameManual,
			showWhen: {
				and: [
					{ '==': [{ var: 'builderName' }, '__other__'] },
					{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] },
					{ '==': [{ var: 'constructionType' }, 'Flat'] },
					// Exclude authority purchases
					{ '!': [{ in: [{ var: 'purchaseType' }, ['direct_from_authority']] }] }
				]
			}
		},

		// ── Project selection (derived from selected builder) ─────────
		// Uses optionResolver q_projectName generator (builder + city → projects).
		{
			...q_projectNameSelection,
			// Show when a known builder is selected (not "Other", not empty)
			showWhen: {
				and: [
					{ '!=': [{ var: 'builderName' }, ''] },
					{ '!=': [{ var: 'builderName' }, '__other__'] },
					{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] },
					{ '==': [{ var: 'constructionType' }, 'Flat'] },
					// Exclude authority purchases
					{ '!': [{ in: [{ var: 'purchaseType' }, ['direct_from_authority']] }] }
				]
			}
		},

		// ── Project name manual entry ─────────────────────────────────
		{
			...q_projectNameManual,
			// Show when builder is "Other" (need manual project too) OR project is "Other"
			showWhen: {
				and: [
					{
						or: [
							{ '==': [{ var: 'builderName' }, '__other__'] },
							{ '==': [{ var: 'projectNameSelected' }, '__other__'] }
						]
					},
					{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] },
					{ '==': [{ var: 'constructionType' }, 'Flat'] },
					// Exclude authority purchases
					{ '!': [{ in: [{ var: 'purchaseType' }, ['direct_from_authority']] }] }
				]
			}
		},

		// ── Builder Role ──────────────────────────────────────────────
		{
			id: 'q1c_builderRole',
			bindsTo_template: 'builderRole',
			contextKey: 'builderRole',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: "What is the builder's role in this project?",
			description:
				"<div class='info-title'><i data-lucide='construction' class='inline-block h-4 w-4'></i> Builder vs Developer</div><div class='info-box highlight dark:text-gray-400'>This distinction affects title verification, documentation requirements, and which banks will fund the case. Many small builders don't own the land — they only construct on it.</div>",
			options: [
				{
					label: 'Developer',
					value: 'developer',
					labelDescription: 'Owns the land & constructed the property',
					uiMeta: { icon: 'Circle' },
					icon: 'Building2'
				},
				{
					label: 'Builder (Contractor)',
					value: 'builder_contractor',
					labelDescription: 'Only constructed; land belongs to someone else',
					uiMeta: { icon: 'Circle' },
					icon: 'HardHat'
				},
				{
					label: 'Joint Development',
					value: 'joint_development',
					labelDescription: 'Builder has a development agreement with the landowner',
					uiMeta: { icon: 'Circle' },
					icon: 'Handshake'
				}
			],
			// Show for builder purchases (direct or endorsement) when constructionType is set
			showWhen: {
				and: [
					{ '!=': [{ var: 'constructionType' }, ''] },
					{
						in: [{ var: 'purchaseType' }, ['direct_from_builder', 'resale_endorsement']]
					}
				]
			}
		},

		// ── RERA Status ───────────────────────────────────────────────
		{
			id: 'q1d_reraStatus',
			bindsTo_template: 'reraStatus',
			contextKey: 'reraStatus',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Is the project RERA registered?',
			description:
				"<div class='info-title'><i data-lucide='shield' class='inline-block h-4 w-4'></i> RERA Registration</div><div class='info-box highlight dark:text-gray-400'>RERA registered projects have regulatory oversight and are preferred by most lenders. For non-RERA projects, fewer banks fund and documentation requirements differ.</div>",
			options: [
				{
					label: 'Yes, RERA Registered',
					value: 'rera_registered',
					uiMeta: { icon: 'Circle' },
					icon: 'ShieldCheck'
				},
				{
					label: 'Not Registered',
					value: 'not_registered',
					uiMeta: { icon: 'Circle' },
					icon: 'ShieldX'
				},
				{
					label: 'Not Required',
					value: 'not_required',
					labelDescription: 'e.g., plotted development, individual house',
					uiMeta: { icon: 'Circle' },
					icon: 'ShieldMinus'
				},
				{
					label: 'Not Known',
					value: 'not_known',
					uiMeta: { icon: 'Circle' },
					icon: 'ShieldQuestionMark'
				}
			],
			// Show when builder role is answered (any builder purchase)
			showWhen: {
				and: [
					{ '!=': [{ var: 'constructionType' }, ''] },
					{
						in: [{ var: 'purchaseType' }, ['direct_from_builder', 'resale_endorsement']]
					},
					{ '!=': [{ var: 'builderRole' }, ''] }
				]
			}
		},

		// ── Project Lenders (multi-select — crowdsourced lender intelligence) ──
		// DSA selects which lenders they know fund this project.
		// Over time, this builds a lender→project intelligence database.
		{
			id: 'q_projectLenders',
			bindsTo_template: 'projectLenders',
			contextKey: 'projectLenders',
			type: 'multiple-select',
			selectClass: 'mt-8 md:mt-12',
			uiGroup: 'select_fields',
			uiMeta: {
				placeholder: 'Select lenders funding this project',
				icon: 'landmark'
			},
			required: false,
			question: 'Which lenders are funding this project? (if known)',
			description:
				"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> Project Funding</div><div class='info-box highlight dark:text-gray-400'>If other banks are already funding this project, it means they've done their due diligence. This helps identify which lenders are likely to approve your case too.</div><div class='info-box tip dark:text-gray-400'><span class='bold'><i data-lucide='lightbulb' class='inline-block h-4 w-4 text-yellow-500'></i> Tip:</span> Your inputs here help build intelligence that benefits all DSAs over time.</div>",
			// Options populated by optionResolver q_projectLenders (all banks+NBFCs)
			// Show when construction type is set and RERA is NOT registered
			showWhen: {
				and: [
					{ '!=': [{ var: 'constructionType' }, ''] },
					{ '!=': [{ var: 'reraStatus' }, ''] },
					{ '!=': [{ var: 'reraStatus' }, 'rera_registered'] }
				]
			}
		}
	];
}
