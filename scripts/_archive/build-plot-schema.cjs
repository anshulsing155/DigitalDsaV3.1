/**
 * Build Plot Loan Schema — Aligned with Home Loan / LAP Structure
 * ================================================================
 * Clones property pages from LAP schema, adapts for vacant land context,
 * adds plot-specific questions, and adds conditional construction page.
 *
 * Run: node scripts/build-plot-schema.cjs
 *
 * Source schemas:
 *   - LAP-schema.json (property pages baseline)
 *   - homeLoanSchemaV2.json (construction questions reference)
 *   - plot-loan-schema.json (non-property pages preserved)
 */

const fs = require('fs');
const path = require('path');

// ─── Read source schemas ────────────────────────────────────────────
const srcDir = path.join(__dirname, '..', 'src', 'lib', 'config');
const lap = JSON.parse(fs.readFileSync(path.join(srcDir, 'LAP-schema.json'), 'utf8'));
const plot = JSON.parse(fs.readFileSync(path.join(srcDir, 'plot-loan-schema.json'), 'utf8'));

// ─── Helpers ────────────────────────────────────────────────────────
function fp(schema, id) {
	return schema.pages.find((p) => p.id === id);
}
function fq(page, bt) {
	return page.questions.find((q) => q.bindsTo_template === bt);
}
function c(obj) {
	return JSON.parse(JSON.stringify(obj));
}

// Source pages
const lapPropId = fp(lap, 'propertyIdentificationPage');
const lapLocation = fp(lap, 'propertyLocation_LAP');
const lapCharacter = fp(lap, 'propertyCharacter_LAP');
const lapCondition = fp(lap, 'propertyCondition_LAP');
const lapLegal = fp(lap, 'propertyLegal_LAP');
const currentPropId = fp(plot, 'propertyIdentification');

// Non-property pages from current schema (pages 1–8, after propertyIdentification)
const nonPropertyPages = plot.pages.slice(1);

// =====================================================================
// PAGE 1: creditHistoryPage
// =====================================================================
const creditHistoryPage = {
	id: 'creditHistoryPage',
	title: 'Credit History Check',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [c(fq(currentPropId, 'creditHistoryStatus'))]
};

// =====================================================================
// PAGE 2: propertyIdentificationPage (clone from LAP)
// =====================================================================
const propIdPage = c(lapPropId);
// First question showWhen: creditHistoryStatus answered (since credit history is on previous page)
propIdPage.questions[0].showWhen = { '!=': [{ var: 'creditHistoryStatus' }, ''] };

// =====================================================================
// PAGE 3: propertyLocation_Plot
// =====================================================================
const areaTypeQ = c(fq(lapLocation, 'propertyAreaType'));
areaTypeQ.question = 'Which type of area is this plot located in?';

const specialAreaQ = c(fq(lapLocation, 'specialAreaRestriction'));

const landUseQ = {
	id: 'q3_landUseClassification',
	bindsTo_template: 'landUseClassification',
	contextKey: 'landUseClassification',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'land-plot' },
	required: true,
	question: 'What is the land use classification of this plot?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏗️</span> Land Use Classification</div><div class='info-box highlight'>Land classification determines whether the plot is financeable. Agricultural land CANNOT be financed through standard bank loans — NA conversion must be completed first.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check the 7/12 extract, Patta, or revenue records for the official land classification. If converted, keep the NA Sanad/order ready.</div>",
	options: [
		{ label: 'Residential', value: 'residential', icon: 'Home' },
		{ label: 'Commercial', value: 'commercial', icon: 'Building2' },
		{ label: 'Agricultural', value: 'agricultural', icon: 'Wheat' },
		{ label: 'Industrial', value: 'industrial', icon: 'Factory' },
		{ label: 'Mixed Use', value: 'mixed_use', icon: 'LayoutGrid' }
	],
	showWhen: { '!=': [{ var: 'propertyAreaType' }, ''] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'landUseClassification' }, 'agricultural'] },
				then: 'Agricultural land cannot be financed through standard bank loans. NA (Non-Agricultural) conversion must be completed first. If conversion is in progress, the loan can only be processed after the NA Sanad/order is obtained.'
			},
			{
				case: { '==': [{ var: 'landUseClassification' }, 'industrial'] },
				then: 'Industrial plot financing is handled as a project/business loan by most lenders. Standard plot loan products may not be available. Consider applying under Business Loan if this is for commercial/industrial use.'
			}
		]
	}
};

const propLocationPage = {
	id: 'propertyLocation_Plot',
	title: 'Plot Area & Location',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [areaTypeQ, specialAreaQ, landUseQ]
};

// =====================================================================
// PAGE 4: propertyCharacter_Plot
// =====================================================================
const plotSourceQ = {
	id: 'q1_plotSource',
	bindsTo_template: 'plotSource',
	contextKey: 'plotSource',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'map-pinned' },
	required: true,
	question: 'How was this plot originally acquired / from whom?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📋</span> Plot Source</div><div class='info-box highlight'>The source of the plot is the <strong>#1 eligibility filter</strong> for plot loans. Authority allotments get near-universal acceptance, while revenue sites are refused by most banks.</div>",
	options: [
		{
			label: 'Development Authority allotment (DDA, HUDA, BDA, etc.)',
			value: 'authority_allotment',
			icon: 'Building'
		},
		{
			label: 'RERA-registered developer project / township',
			value: 'developer_project',
			icon: 'Building2'
		},
		{ label: 'Approved private layout', value: 'approved_layout', icon: 'LayoutGrid' },
		{ label: 'Revenue site / Revenue layout', value: 'revenue_site', icon: 'FileWarning' },
		{ label: 'Individual resale / Direct purchase', value: 'individual_resale', icon: 'Users' }
	],
	showWhen: { '!=': [{ var: 'landUseClassification' }, ''] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'plotSource' }, 'revenue_site'] },
				then: 'Revenue layout plots are formed without planning authority approval. Most nationalised banks refuse to finance revenue sites. Processing will proceed but lender options may be severely limited. Only select NBFCs may consider this.'
			}
		]
	}
};

const devAuthorityQ = {
	id: 'q2_developmentAuthority',
	bindsTo_template: 'developmentAuthority',
	contextKey: 'developmentAuthority',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: { placeholder: 'Select development authority', icon: 'landmark' },
	required: true,
	question: 'Which development authority allotted this plot?',
	description: 'Select the government development authority that originally allotted this plot.',
	options: [
		{ label: 'DDA (Delhi Development Authority)', value: 'DDA' },
		{ label: 'HUDA / HSVP (Haryana)', value: 'HUDA' },
		{ label: 'BDA (Bangalore Development Authority)', value: 'BDA' },
		{ label: 'MHADA (Maharashtra)', value: 'MHADA' },
		{ label: 'HMDA (Hyderabad Metropolitan)', value: 'HMDA' },
		{ label: 'JDA (Jaipur Development Authority)', value: 'JDA' },
		{ label: 'LDA (Lucknow Development Authority)', value: 'LDA' },
		{ label: 'BIAPPA / BDA (Bihar)', value: 'BIAPPA' },
		{ label: 'DTCP (Directorate of Town & Country Planning)', value: 'DTCP' },
		{ label: 'CIDCO (Maharashtra)', value: 'CIDCO' },
		{ label: 'PCMC / PMC (Pune)', value: 'PCMC' },
		{ label: 'Other authority', value: 'OTHER' }
	],
	showWhen: { '==': [{ var: 'plotSource' }, 'authority_allotment'] }
};

// Clone propertyType from current schema
const propTypeQ = c(fq(currentPropId, 'propertyType'));
propTypeQ.showWhen = {
	and: [
		{ '!=': [{ var: 'plotSource' }, ''] },
		{ in: [{ var: 'propertyComplianceStatus' }, ['fully_compliant', 'authorized_not_per_plan']] }
	]
};
// Remove any loanName / loanType conditions that were in the old showWhen
propTypeQ.showWhen = { '!=': [{ var: 'plotSource' }, ''] };

// Clone leaseRemainingPeriod from LAP
const leaseQ = c(fq(lapCharacter, 'leaseRemainingPeriod'));
leaseQ.showWhen = { '==': [{ var: 'propertyType' }, 'Lease Hold'] };

// plotAge (adapted from propertyAge)
const plotAgeQ = {
	id: 'q5_plotAge',
	bindsTo_template: 'plotAge',
	contextKey: 'plotAge',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: { placeholder: 'Select plot age', icon: 'calendar' },
	required: true,
	question: 'When was this plot first allotted or sold?',
	description:
		'Select the approximate age since the plot was first allotted by authority or first sold. This helps determine title chain requirements.',
	options: [
		{ label: 'Less than 5 years', value: '0-5' },
		{ label: '5–10 years', value: '5-10' },
		{ label: '10–20 years', value: '10-20' },
		{ label: '20–30 years', value: '20-30' },
		{ label: 'More than 30 years', value: '30+' }
	],
	showWhen: { '!=': [{ var: 'propertyType' }, ''] }
};

// Keep PlotArea from current schema
const plotAreaQ = c(fq(currentPropId, 'PlotArea'));
// Ensure it shows after plotAge
plotAreaQ.showWhen = { '!=': [{ var: 'plotAge' }, ''] };

const plotBoundaryQ = {
	id: 'q7_plotBoundaryStatus',
	bindsTo_template: 'plotBoundaryStatus',
	contextKey: 'plotBoundaryStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'square-dashed-bottom' },
	required: true,
	question: 'What is the boundary demarcation status of this plot?',
	description:
		"<div class='info-box highlight'>Banks require clear boundary demarcation for physical verification and valuation. Unclear boundaries can delay or prevent loan approval.</div>",
	options: [
		{
			label: 'Clear demarcation with boundary stones',
			value: 'clear_demarcation',
			icon: 'CheckCircle'
		},
		{ label: 'Partially demarcated', value: 'partially_demarcated', icon: 'AlertTriangle' },
		{ label: 'No clear boundaries', value: 'no_boundaries', icon: 'XCircle' },
		{ label: 'Compound wall / fencing exists', value: 'compound_wall', icon: 'Fence' }
	],
	showWhen: {
		and: [{ '!=': [{ var: 'plotArea' }, ''] }, { '!=': [{ var: 'plotArea' }, undefined] }]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'plotBoundaryStatus' }, 'no_boundaries'] },
				then: 'Banks require clear boundary demarcation for physical verification. This may delay or prevent loan approval. Consider getting a boundary survey done before applying.'
			}
		]
	}
};

const propCharacterPage = {
	id: 'propertyCharacter_Plot',
	title: 'Plot Character & Ownership',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [plotSourceQ, devAuthorityQ, propTypeQ, leaseQ, plotAgeQ, plotAreaQ, plotBoundaryQ]
};

// =====================================================================
// PAGE 5: constructionDetails_Plot (CONDITIONAL)
// Only visible for Plot & Construction Loan / Construction Loan Only
// =====================================================================
const constructionTypeQ = {
	id: 'q1_constructionType',
	bindsTo_template: 'constructionType',
	contextKey: 'constructionType',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'home' },
	required: true,
	question: 'What type of construction is planned / being built?',
	description:
		"<div class='info-box highlight'>Select the type of building being constructed on this plot. This affects loan terms, LTV ratio, and documentation requirements.</div>",
	options: [
		{ label: 'Independent House', value: 'House', icon: 'Home' },
		{ label: 'Villa', value: 'Villa', icon: 'Castle' },
		{ label: 'Row House', value: 'Row House', icon: 'LayoutGrid' },
		{ label: 'Farm House', value: 'Farm House', icon: 'TreePine' }
	]
};

const constructionApprovalQ = {
	id: 'q2_constructionApprovalStatus',
	bindsTo_template: 'constructionApprovalStatus',
	contextKey: 'constructionApprovalStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'clipboard-check' },
	required: true,
	question: 'What is the status of the building plan approval?',
	description:
		'Approved building plans are required by lenders before construction disbursement begins.',
	options: [
		{ label: 'Approved building plan obtained', value: 'approved', icon: 'CheckCircle' },
		{ label: 'Plan submitted, pending approval', value: 'pending', icon: 'Clock' },
		{ label: 'No building plan yet', value: 'no_plan', icon: 'FileX' }
	],
	showWhen: { '!=': [{ var: 'constructionType' }, ''] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'constructionApprovalStatus' }, 'no_plan'] },
				then: 'Most lenders require an approved building plan before sanctioning the construction component. The plot purchase portion may still proceed, but construction disbursement will be held until plan approval.'
			}
		]
	}
};

const constructionProgressQ = {
	id: 'q3_constructionProgress',
	bindsTo_template: 'constructionProgress',
	contextKey: 'constructionProgress',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'hard-hat' },
	required: true,
	question: 'What is the current construction progress?',
	description: 'This determines the disbursement stage and valuation approach.',
	options: [
		{ label: 'Not started', value: 'not_started', icon: 'Circle' },
		{ label: 'Foundation stage', value: 'foundation', icon: 'Layers' },
		{ label: 'Plinth level', value: 'plinth', icon: 'BoxSelect' },
		{ label: 'Superstructure (walls & slab)', value: 'superstructure', icon: 'Building' },
		{ label: 'Finishing stage', value: 'finishing', icon: 'PaintBucket' },
		{ label: 'Construction completed', value: 'completed', icon: 'CheckCircle2' }
	],
	showWhen: {
		or: [
			{ '!=': [{ var: 'PlotLoanActivity' }, 'Balance Transfer Only'] },
			{ '==': [{ var: 'btConstructionStatus' }, 'in_progress'] }
		]
	}
};

const builtAreaQ = {
	id: 'q4_builtArea',
	bindsTo_template: 'builtArea',
	contextKey: 'builtArea',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: { placeholder: 'Enter built-up area in sq ft', icon: 'ruler' },
	required: false,
	question: 'What is the planned / actual built-up area? (in sq ft)',
	description:
		'Enter the total built-up area as per the approved building plan or actual construction.',
	showWhen: { '!=': [{ var: 'constructionType' }, ''] },
	validation: {
		min: 100,
		max: 50000,
		errorMessage: 'Built-up area should be between 100 and 50,000 sq ft'
	}
};

const ocCcQ = {
	id: 'q5_ocCcAvailable',
	bindsTo_template: 'ocCcAvailable',
	contextKey: 'ocCcAvailable',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'file-check-2' },
	required: true,
	question:
		'Has the building received its OC (Occupancy Certificate) / CC (Completion Certificate)?',
	description:
		"<div class='info-box highlight'>OC/CC is proof that the construction complies with approved building plans. Required for completed buildings.</div>",
	options: [
		{ label: 'Both OC and CC obtained', value: 'BOTH', icon: 'CheckCircle2' },
		{ label: 'Only CC obtained', value: 'CC_ONLY', icon: 'CheckCircle' },
		{ label: 'Neither available', value: 'NONE', icon: 'XCircle' },
		{ label: 'Not sure', value: 'UNKNOWN', icon: 'HelpCircle' }
	],
	showWhen: {
		or: [
			{ '==': [{ var: 'constructionProgress' }, 'completed'] },
			{ '==': [{ var: 'btConstructionStatus' }, 'completed'] }
		]
	}
};

const municipalApprovalQ = {
	id: 'q6_municipalApproval',
	bindsTo_template: 'municipalApproval',
	contextKey: 'municipalApproval',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'landmark' },
	required: true,
	question: 'Was the building plan approved / sanctioned by the local municipal authority?',
	description: 'Municipal approval (building permission) is required for all new construction.',
	options: [
		{ label: 'Yes — approved building plan', value: 'APPROVED', icon: 'CheckCircle' },
		{ label: 'Partial approval', value: 'PARTIAL', icon: 'AlertTriangle' },
		{ label: 'No plan approval', value: 'NO_PLAN', icon: 'XCircle' },
		{ label: 'Not sure', value: 'UNKNOWN', icon: 'HelpCircle' }
	],
	showWhen: { '!=': [{ var: 'constructionType' }, ''] }
};

const constructorTypeQ = {
	id: 'q7_constructorType',
	bindsTo_template: 'constructorType',
	contextKey: 'constructorType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'wrench' },
	required: true,
	question: 'Who is handling the construction?',
	description:
		'The type of constructor affects documentation requirements and disbursement process.',
	options: [
		{ label: 'Self-construction (own supervision)', value: 'self_construction', icon: 'User' },
		{ label: 'Licensed contractor / engineer', value: 'licensed_contractor', icon: 'HardHat' },
		{ label: 'Builder / developer', value: 'builder', icon: 'Building2' }
	],
	showWhen: { '!=': [{ var: 'constructionType' }, ''] }
};

const btConstructionStatusQ = {
	id: 'q8_btConstructionStatus',
	bindsTo_template: 'btConstructionStatus',
	contextKey: 'btConstructionStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'arrow-left-right' },
	required: true,
	question: 'What is the current status of construction on this plot?',
	description:
		'For balance transfer of composite loans, the current construction status determines documentation and valuation requirements.',
	options: [
		{ label: 'Construction not started', value: 'not_started', icon: 'Circle' },
		{ label: 'Construction in progress', value: 'in_progress', icon: 'Loader' },
		{ label: 'Construction completed', value: 'completed', icon: 'CheckCircle2' }
	],
	showWhen: { '==': [{ var: 'PlotLoanActivity' }, 'Balance Transfer Only'] }
};

const constructionPage = {
	id: 'constructionDetails_Plot',
	title: 'Construction Details',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	showWhen: {
		in: [{ var: 'loanType' }, ['Plot & Construction Loan', 'Construction Loan Only']]
	},
	questions: [
		constructionTypeQ,
		constructionApprovalQ,
		constructionProgressQ,
		builtAreaQ,
		ocCcQ,
		municipalApprovalQ,
		constructorTypeQ,
		btConstructionStatusQ
	]
};

// =====================================================================
// PAGE 6: propertyCondition_Plot
// Clone compliance variants from LAP, adapt text for land/plot context,
// add new plot-specific compliance questions
// =====================================================================

// 5 area-type-specific compliance variants (adapted from LAP for plot/land)
const compliancePlanned = {
	id: 'q1a_propertyComplianceStatus_planned',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'shield-check' },
	required: true,
	question:
		'Is this plot in an approved layout with development authority / municipal corporation approval?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏛️</span> Plot Compliance — Development Authority Area</div><div class='info-box highlight'>Plots in approved layouts by development authorities (DDA, HUDA, BDA, etc.) have the highest lender acceptance. Allotment letter + possession letter is usually sufficient documentation.</div>",
	options: [
		{
			label: 'Yes — approved layout, all permissions in place',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Approved area but some permissions pending',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{ label: 'Not in an approved / authorized layout', value: 'not_authorized', icon: 'XCircle' }
	],
	showWhen: { '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
				then: 'Plots not in an approved layout face significantly limited financing options. Only select NBFCs may consider this. Proceed with caution.'
			}
		]
	}
};

const complianceConverted = {
	id: 'q1b_propertyComplianceStatus_converted',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'shield-check' },
	required: true,
	question:
		'Has this plot been fully converted from agricultural to non-agricultural (NA) use with valid conversion order?',
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Converted Land</div><div class='info-box highlight'>NA (Non-Agricultural) conversion is <strong>mandatory</strong> for bank financing. Without a valid NA Sanad/order, no bank or NBFC will process this loan.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Keep the NA conversion order / Sanad ready. State-specific: Maharashtra (NA order from Collector), Karnataka (DC conversion), Gujarat (NA Sanad from Mamlatdar).</div>",
	options: [
		{
			label: 'Yes — fully converted with NA Sanad/order',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Conversion applied but still pending',
			value: 'authorized_not_per_plan',
			icon: 'Clock'
		},
		{ label: 'Not converted — still agricultural land', value: 'not_authorized', icon: 'XCircle' }
	],
	showWhen: { '==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'authorized_not_per_plan'] },
				then: 'NA conversion is still pending. Loan processing can begin but disbursement will be held until the conversion order is obtained. Keep the application reference number ready.'
			},
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
				then: 'Unconverted agricultural land CANNOT be financed through standard bank loans. NA conversion must be completed before any lender will process this application.'
			}
		]
	}
};

const complianceMunicipal = {
	id: 'q1c_propertyComplianceStatus_municipal',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'shield-check' },
	required: true,
	question:
		'Is this plot within municipal corporation limits with proper layout approval and building permission zone?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏛️</span> Plot Compliance — Municipal Area</div><div class='info-box highlight'>Plots within municipal limits with proper zoning and layout approval have good lender acceptance. Municipal property records and tax receipts are key documents.</div>",
	options: [
		{
			label: 'Yes — within municipal limits, proper layout approval',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Within municipal limits but layout approval unclear',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{
			label: 'Outside municipal limits / no proper approval',
			value: 'not_authorized',
			icon: 'XCircle'
		}
	],
	showWhen: { '==': [{ var: 'propertyAreaType' }, 'OLD_MUNICIPAL'] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
				then: 'Plots outside municipal limits or without proper layout approval face limited financing options. Only select NBFCs may consider this.'
			}
		]
	}
};

const complianceColony = {
	id: 'q1d_propertyComplianceStatus_colony',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'shield-check' },
	required: true,
	question:
		'Is this colony / layout authorized by the development authority? Has the layout been approved?',
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Colony / Village Area</div><div class='info-box highlight'>Plots in unauthorized colonies or unapproved layouts are extremely difficult to finance. Regularization status is critical for lender acceptance.</div>",
	options: [
		{
			label: 'Yes — colony is authorized / regularized',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{ label: 'Colony regularization in progress', value: 'authorized_not_per_plan', icon: 'Clock' },
		{ label: 'Unauthorized colony / not regularized', value: 'not_authorized', icon: 'XCircle' }
	],
	showWhen: { '==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY'] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
				then: 'Plots in unauthorized colonies are rejected by virtually all lenders. Colony regularization must be completed or at least formally initiated before any bank will consider financing.'
			}
		]
	}
};

const complianceUnknown = {
	id: 'q1e_propertyComplianceStatus_unknown',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'shield-check' },
	required: true,
	question:
		"Is the plot's legal status clear — does it have any form of government / municipal approval?",
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Status Unknown</div><div class='info-box highlight'>If the area type is unclear, the plot's legal and approval status becomes even more critical. Lenders will require clear documentation of the plot's authorization.</div>",
	options: [
		{
			label: 'Yes — has some form of government approval',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Partial or unclear approval status',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{ label: 'No government approval / authorization', value: 'not_authorized', icon: 'XCircle' }
	],
	showWhen: {
		or: [
			{ '==': [{ var: 'propertyAreaType' }, 'UNKNOWN'] },
			{ '==': [{ var: 'propertyAreaType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
				then: 'Plots without any form of government approval are not financeable by standard lenders. Explore options to obtain at least basic municipal or panchayat approval before applying.'
			}
		]
	}
};

// naConversionStatus (clone from LAP, always relevant for plot)
const naConversionQ = c(fq(lapCondition, 'naConversionStatus'));
// For plot: show when propertyComplianceStatus answered (always relevant for land)
naConversionQ.showWhen = { '!=': [{ var: 'propertyComplianceStatus' }, ''] };

// revenueRecordStatus (clone from LAP, always relevant for plot loans)
const revenueRecordQ = c(fq(lapCondition, 'revenueRecordStatus'));
revenueRecordQ.question =
	'What is the status of revenue records (7/12, Patta, Khata, RTC) for this plot?';
revenueRecordQ.description =
	"<div class='info-box highlight'>Revenue records are <strong>always required</strong> for plot loans — they confirm land ownership, classification, and mutation status. State-specific: 7/12 extract (MH/GJ), Patta/Chitta (TN), RTC (KA), Jamabandi (PB/HR/RJ).</div>";
// Always show for plot loans (not just village/colony areas like in LAP)
revenueRecordQ.showWhen = { '!=': [{ var: 'propertyComplianceStatus' }, ''] };

// NEW: layoutApprovalStatus
const layoutApprovalQ = {
	id: 'q8_layoutApprovalStatus',
	bindsTo_template: 'layoutApprovalStatus',
	contextKey: 'layoutApprovalStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'map' },
	required: true,
	question: 'What type of layout approval does this plot have?',
	description:
		'Layout approval type determines the level of lender acceptance. Planning authority approved layouts get the best terms.',
	options: [
		{
			label: 'Approved by planning authority (TP scheme)',
			value: 'planning_authority',
			icon: 'CheckCircle'
		},
		{
			label: 'Approved by development authority',
			value: 'development_authority',
			icon: 'Building'
		},
		{
			label: 'Revenue layout (no planning approval)',
			value: 'revenue_layout',
			icon: 'FileWarning'
		},
		{ label: 'Approval status unknown', value: 'unknown', icon: 'HelpCircle' }
	],
	showWhen: { '!=': [{ var: 'propertyComplianceStatus' }, ''] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'layoutApprovalStatus' }, 'revenue_layout'] },
				then: 'Revenue layouts are not approved by planning authorities. Most banks refuse to finance plots in revenue layouts. Only select NBFCs may consider this.'
			}
		]
	}
};

// zoneClassification (clone from LAP)
const zoneQ = c(fq(lapCondition, 'zoneClassification'));
// Simplify showWhen for plot: just needs compliance answered
zoneQ.showWhen = {
	and: [
		{ '!=': [{ var: 'propertyComplianceStatus' }, ''] },
		{ '!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] }
	]
};

// reraRegistrationStatus (clone from LAP, show when developer project)
const reraQ = c(fq(lapCondition, 'reraRegistrationStatus'));
reraQ.showWhen = { '==': [{ var: 'plotSource' }, 'developer_project'] };

// municipalTaxStatus (clone from LAP, adapted for land)
const taxQ = c(fq(lapCondition, 'municipalTaxStatus'));
taxQ.question = 'Is the property tax / land revenue tax being paid regularly for this plot?';
// Show when compliance answered (for plot, tax applies even to vacant land)
taxQ.showWhen = { '!=': [{ var: 'propertyComplianceStatus' }, ''] };

// NEW: accessRoadStatus
const accessRoadQ = {
	id: 'q12_accessRoadStatus',
	bindsTo_template: 'accessRoadStatus',
	contextKey: 'accessRoadStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'route' },
	required: true,
	question: 'What is the road access to this plot?',
	description:
		'Road access is assessed during bank physical verification and affects plot valuation significantly.',
	options: [
		{ label: 'Public road (12ft+ wide)', value: 'public_road', icon: 'CheckCircle' },
		{ label: 'Shared / private road', value: 'shared_road', icon: 'AlertTriangle' },
		{ label: 'Narrow lane (< 12ft)', value: 'narrow_lane', icon: 'AlertTriangle' },
		{ label: 'No proper road access', value: 'no_access', icon: 'XCircle' }
	],
	showWhen: { '!=': [{ var: 'propertyComplianceStatus' }, ''] },
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'accessRoadStatus' }, 'no_access'] },
				then: 'Plots without proper road access are extremely difficult to finance. Banks require access for physical verification and valuation. This may result in loan rejection by most lenders.'
			}
		]
	}
};

// NEW: developmentStatus
const devStatusQ = {
	id: 'q13_developmentStatus',
	bindsTo_template: 'developmentStatus',
	contextKey: 'developmentStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'construction' },
	required: true,
	question: 'What is the infrastructure development status of the area?',
	description:
		'Infrastructure availability (water, electricity, drainage, road) affects plot valuation and lender willingness.',
	options: [
		{
			label: 'Fully developed (water, electricity, drainage)',
			value: 'fully_developed',
			icon: 'CheckCircle2'
		},
		{ label: 'Partially developed', value: 'partially_developed', icon: 'AlertTriangle' },
		{ label: 'Undeveloped', value: 'undeveloped', icon: 'XCircle' },
		{ label: 'Under development', value: 'under_development', icon: 'Loader' }
	],
	showWhen: { '!=': [{ var: 'propertyComplianceStatus' }, ''] }
};

// unauthorizedAdditions (clone from LAP, adapted for temporary structures)
const unauthorizedQ = c(fq(lapCondition, 'unauthorizedAdditions'));
unauthorizedQ.question = 'Are there any unauthorized structures or constructions on this plot?';
unauthorizedQ.description =
	"<div class='info-box highlight'>Even vacant plots may have temporary structures, boundary encroachments, or unauthorized constructions that affect valuation and legal status.</div>";
// Simplify showWhen for plot (no constructionType check needed)
unauthorizedQ.showWhen = { '!=': [{ var: 'propertyComplianceStatus' }, ''] };

// colonyRegularizationStatus (clone from LAP, show for colony area)
const colonyRegQ = c(fq(lapCondition, 'colonyRegularizationStatus'));
// Keep same showWhen as LAP (colony area type)

// gramPanchayatPermission (clone from LAP)
const panchayatQ = c(fq(lapCondition, 'gramPanchayatPermission'));
// For plot: show for colony and converted land (same as LAP)

const propConditionPage = {
	id: 'propertyCondition_Plot',
	title: 'Plot Condition & Compliance',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [
		compliancePlanned,
		complianceConverted,
		complianceMunicipal,
		complianceColony,
		complianceUnknown,
		naConversionQ,
		revenueRecordQ,
		layoutApprovalQ,
		zoneQ,
		reraQ,
		taxQ,
		accessRoadQ,
		devStatusQ,
		unauthorizedQ,
		colonyRegQ,
		panchayatQ
	]
};

// =====================================================================
// PAGE 7: propertyLegal_Plot
// Clone from LAP, remove occupation/rental, add registration + timeline
// =====================================================================
const acqMethodQ = c(fq(lapLegal, 'propertyAcquisitionMethod'));
const successionQ = c(fq(lapLegal, 'successionStatus'));
const origDocsQ = c(fq(lapLegal, 'originalDocumentsAvailable'));
origDocsQ.description =
	"<div class='info-box highlight'>Lender holds original property documents as mortgage security. For plot loans, key originals include: sale deed/allotment letter, NA order (if converted), revenue records, encumbrance certificate, and approved layout plan.</div>";

const ownershipChainQ = c(fq(lapLegal, 'ownershipChainComplete'));
const encumbranceQ = c(fq(lapLegal, 'existingEncumbrance'));
const legalDisputeQ = c(fq(lapLegal, 'noLegalDispute'));
const ecVerifiedQ = c(fq(lapLegal, 'encumbranceCertificateVerified'));

// ifPropertyRegistered (from current plot schema)
const regQ = c(fq(currentPropId, 'ifPropertyRegistered'));
// Simplify showWhen: show when encumbranceCertificateVerified is answered
regQ.showWhen = { '!=': [{ var: 'encumbranceCertificateVerified' }, ''] };

// NEW: constructionTimeline (only for Plot Only and Plot & Equity)
const timelineQ = {
	id: 'q9_constructionTimeline',
	bindsTo_template: 'constructionTimeline',
	contextKey: 'constructionTimeline',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: { icon: 'calendar-clock' },
	required: true,
	question: 'When do you plan to start construction on this plot?',
	description:
		"<div class='info-box highlight'>Most banks mandate construction to begin within 2-3 years of plot loan disbursement. Failure to begin construction may result in interest rate increase or loan recall. This is a key underwriting consideration.</div>",
	options: [
		{ label: 'Within 1 year', value: 'within_1_year', icon: 'Zap' },
		{ label: '1–3 years', value: '1_to_3_years', icon: 'Clock' },
		{ label: '3–5 years', value: '3_to_5_years', icon: 'Timer' },
		{ label: 'No immediate plans', value: 'no_plans', icon: 'Infinity' }
	],
	showWhen: {
		in: [{ var: 'loanType' }, ['Plot Loan Only', 'Plot & Equity Loan']]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'constructionTimeline' }, 'no_plans'] },
				then: 'Most banks require construction to begin within 2-3 years of plot loan disbursement. Failure to begin may result in interest rate increase or loan recall. Some lenders may decline applications with no construction plans.'
			},
			{
				case: { '==': [{ var: 'constructionTimeline' }, '3_to_5_years'] },
				then: 'A 3-5 year timeline is at the outer edge of most bank policies. Some lenders may impose additional conditions or higher rates for delayed construction.'
			}
		]
	}
};

const propLegalPage = {
	id: 'propertyLegal_Plot',
	title: 'Legal, Title & Registration',
	nextButtonVisibility: { mode: ['allRequiredAnswered'] },
	questions: [
		acqMethodQ,
		successionQ,
		origDocsQ,
		ownershipChainQ,
		encumbranceQ,
		legalDisputeQ,
		ecVerifiedQ,
		regQ,
		timelineQ
	]
};

// =====================================================================
// ASSEMBLE FINAL SCHEMA
// =====================================================================
const newSchema = {
	formId: plot.formId,
	title: plot.title,
	pages: [
		creditHistoryPage,
		propIdPage,
		propLocationPage,
		propCharacterPage,
		constructionPage,
		propConditionPage,
		propLegalPage,
		...nonPropertyPages
	]
};

// ─── Write output ───────────────────────────────────────────────────
const outputPath = path.join(srcDir, 'plot-loan-schema.json');
fs.writeFileSync(outputPath, JSON.stringify(newSchema, null, '\t'));

// ─── Summary ────────────────────────────────────────────────────────
console.log('✓ Plot loan schema generated');
console.log(`  Pages: ${newSchema.pages.length}`);
newSchema.pages.forEach((p, i) => {
	const qCount = (p.questions || []).length;
	const conditional = p.showWhen ? ' [CONDITIONAL]' : '';
	console.log(`  ${i}: ${p.id} — ${qCount} questions${conditional}`);
});
console.log(`\n  Output: ${outputPath}`);
