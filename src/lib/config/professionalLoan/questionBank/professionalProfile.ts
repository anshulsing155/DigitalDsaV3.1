/**
 * Professional Profile Questions
 * Page: professionalProfilePage
 *
 * DESIGN: All questions target EVEN option counts for balanced 2-column grid layout.
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ─────────────────────────────────────────────────────────────
// Q1 — Professional Category (4 options = 2×2 grid)
// ─────────────────────────────────────────────────────────────
export const q1_professionalCategory: RawSchemaQuestion = {
	id: 'q1_professionalCategory',
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
	question: 'What is the professional category?',
	description:
		"<div class='info-title'><span class='info-icon blue'>👨‍⚕️</span> Professional Category</div><div class='info-box highlight'>Professional loans are available only to <span class='bold'>licensed/registered professionals</span> with valid statutory registrations.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Doctors and CAs typically get the best rates and highest limits among professional loans.</div>",
	options: [
		{
			label: 'Doctor / Medical',
			value: 'doctor',
			labelDescription:
				'MBBS, BDS, MD, MS and above — registered with MCI/NMC or State Medical Council',
			icon: 'Stethoscope'
		},
		{
			label: 'Chartered Accountant (CA)',
			value: 'ca',
			labelDescription: 'ICAI members with Certificate of Practice (CoP)',
			icon: 'Calculator'
		},
		{
			label: 'Lawyer / Advocate',
			value: 'lawyer',
			labelDescription: 'Bar Council enrolled advocates with active license',
			icon: 'Scale'
		},
		{
			label: 'Architect',
			value: 'architect',
			labelDescription: 'Council of Architecture (CoA) registered practitioners',
			icon: 'Ruler'
		}
	]
};

// ─────────────────────────────────────────────────────────────
// Q2 — Professional Qualification (per profession)
//   Doctor: 5 (incl. Veterinary), CA: 2, Lawyer: 2, Architect: 2
// ─────────────────────────────────────────────────────────────
export const q2_professionalQualification: RawSchemaQuestion = {
	id: 'q2_professionalQualification',
	bindsTo_template: 'professionalQualification',
	contextKey: 'professionalQualification',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'graduation-cap'
	},
	required: true,
	question: 'What is the highest professional qualification?',
	description:
		"<div class='info-title'><span class='info-icon green'>🎓</span> Professional Qualification</div><div class='info-box highlight'>Higher qualifications and super-specializations may qualify for larger loan amounts.</div>",
	options: [
		// ── Doctor (4 options) ──
		{
			label: 'MBBS / BDS',
			value: 'mbbs_bds',
			labelDescription: 'Medical or dental graduate',
			icon: 'GraduationCap',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'BAMS / BHMS / BUMS',
			value: 'bams_bhms',
			labelDescription: 'AYUSH practitioner (Ayurveda / Homeopathy / Unani)',
			icon: 'GraduationCap',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'MD / MS / MDS',
			value: 'md_ms',
			labelDescription: 'Post-graduate specialization',
			icon: 'Award',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'BVSc / MVSc',
			value: 'bvsc_mvsc',
			labelDescription: 'Veterinary science — some lenders exclude this category',
			icon: 'GraduationCap',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'DM / MCh',
			value: 'dm_mch',
			labelDescription: 'Super-specialization — highest loan limits',
			icon: 'Trophy',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		// ── CA (2 options) ──
		{
			label: 'ACA — Associate CA',
			value: 'aca',
			labelDescription: 'ICAI member with less than 5 years standing',
			icon: 'Award',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		{
			label: 'FCA — Fellow CA',
			value: 'fca',
			labelDescription: 'ICAI member with 5+ years standing',
			icon: 'Trophy',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		// ── Lawyer (2 options) ──
		{
			label: 'LLB',
			value: 'llb',
			labelDescription: 'Bachelor of Law',
			icon: 'GraduationCap',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		{
			label: 'LLM',
			value: 'llm',
			labelDescription: 'Master of Law',
			icon: 'Award',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		// ── Architect (2 options) ──
		{
			label: 'B.Arch',
			value: 'b_arch',
			labelDescription: 'Bachelor of Architecture',
			icon: 'GraduationCap',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		},
		{
			label: 'M.Arch',
			value: 'm_arch',
			labelDescription: 'Master of Architecture',
			icon: 'Award',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'professionalCategory'
			},
			''
		]
	}
};

// ─────────────────────────────────────────────────────────────
// Q3 — Registration Council (2 per profession)
// ─────────────────────────────────────────────────────────────
export const q3_registrationCouncilType: RawSchemaQuestion = {
	id: 'q3_registrationCouncilType',
	bindsTo_template: 'registrationCouncilType',
	contextKey: 'registrationCouncilType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question: 'Where is the professional registered?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🛡️</span> Registration Council</div><div class='info-box highlight'>Valid professional registration is mandatory for professional loan eligibility.</div>",
	options: [
		// ── Doctor (2 options) ──
		{
			label: 'State Medical Council (SMC)',
			value: 'smc',
			labelDescription: 'State-level medical registration',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'National Medical Commission (NMC)',
			value: 'nmc',
			labelDescription: 'Central registration (formerly MCI)',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		{
			label: 'Veterinary Council of India (VCI)',
			value: 'vci',
			labelDescription: 'Statutory body for veterinary practitioners',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'doctor'] }
		},
		// ── CA (2 options) ──
		{
			label: 'ICAI — Institute of Chartered Accountants',
			value: 'icai',
			labelDescription: 'National body for all CAs',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		{
			label: 'ICAI — with Certificate of Practice',
			value: 'icai_cop',
			labelDescription: 'CA with active CoP (required for independent practice)',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'ca'] }
		},
		// ── Lawyer (2 options) ──
		{
			label: 'State Bar Council',
			value: 'state_bar_council',
			labelDescription: 'State-level enrollment and license',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		{
			label: 'Bar Council of India (BCI)',
			value: 'bci',
			labelDescription: 'National-level registration',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'lawyer'] }
		},
		// ── Architect (2 options) ──
		{
			label: 'Council of Architecture (CoA)',
			value: 'coa',
			labelDescription: 'National registration body for architects',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		},
		{
			label: 'Indian Institute of Architects (IIA)',
			value: 'iia',
			labelDescription: 'Professional membership body',
			icon: 'Shield',
			showWhen: { '==': [{ var: 'professionalCategory' }, 'architect'] }
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'professionalQualification'
			},
			''
		]
	}
};

// ─────────────────────────────────────────────────────────────
// Q4 — Practice Vintage (6 options = 3×2 grid)
// ─────────────────────────────────────────────────────────────
export const q4_practiceVintage: RawSchemaQuestion = {
	id: 'q4_practiceVintage',
	bindsTo_template: 'practiceVintage',
	contextKey: 'practiceVintage',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'timer'
	},
	required: true,
	question: 'How long has the applicant been practicing professionally?',
	description:
		"<div class='info-title'><span class='info-icon green'>⏱️</span> Practice Vintage</div><div class='info-box highlight'>Most lenders require a minimum of 2 years of professional practice for eligibility.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Practice vintage includes employed period in relevant profession (e.g., hospital employment for doctors).</div>",
	options: [
		{
			label: 'Less than 1 year',
			value: 'less_than_1',
			icon: 'AlertTriangle'
		},
		{
			label: '1–2 years',
			value: '1_to_2',
			icon: 'Clock'
		},
		{
			label: '2–5 years',
			value: '2_to_5',
			icon: 'Timer'
		},
		{
			label: '5–10 years',
			value: '5_to_10',
			icon: 'Award'
		},
		{
			label: '10–20 years',
			value: '10_to_20',
			icon: 'Trophy'
		},
		{
			label: 'Over 20 years',
			value: 'over_20',
			icon: 'Crown'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'registrationCouncilType'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'practiceVintage' }, 'less_than_1']
				},
				then: 'Most banks require a minimum practice vintage of 2 years for professional loans. Options may be limited with less than 1 year of practice.'
			},
			{
				case: {
					and: [
						{ in: [{ var: 'professionalQualification' }, ['dm_mch', 'llm', 'm_arch', 'fca']] },
						{ '==': [{ var: 'practiceVintage' }, 'less_than_1'] }
					]
				},
				then: 'Post-graduate/super-specialization qualifications (DM/MCh, LLM, FCA, etc.) require 5+ years of prior education and training. Less than 1 year practice is inconsistent \u2014 verify this is accurate.'
			}
		]
	}
};

// ─────────────────────────────────────────────────────────────
// Q5 — Practice Type (4 options = 2×2 grid) — already even ✓
// ─────────────────────────────────────────────────────────────
export const q5_practiceType: RawSchemaQuestion = {
	id: 'q5_practiceType',
	bindsTo_template: 'practiceType',
	contextKey: 'practiceType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'briefcase'
	},
	required: true,
	question: 'What is the current practice setup?',
	description:
		"<div class='info-title'><span class='info-icon blue'>💼</span> Practice Setup</div><div class='info-box highlight'>Practice type affects income documentation requirements and loan structuring.</div>",
	options: [
		{
			label: 'Own clinic / office / firm',
			value: 'own_practice',
			icon: 'Building2'
		},
		{
			label: 'Employed at hospital / firm',
			value: 'employed',
			icon: 'Briefcase'
		},
		{
			label: 'Both — own practice + employed',
			value: 'both',
			icon: 'LayoutGrid'
		},
		{
			label: 'Consulting (visiting)',
			value: 'consulting',
			icon: 'UserCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'practiceVintage'
			},
			''
		]
	},
	// Session 33: Item 32 — clarify "Both" practice type
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'practiceType' }, 'both']
				},
				then: 'Dual practice (own + employed): lenders will assess income from both sources separately. Ensure both income streams are documented \u2014 ITR for own practice and salary slips for employment. If transitioning from employed to independent, clarify the timeline.'
			}
		]
	}
};

// ─────────────────────────────────────────────────────────────
// Q6 — Registration Status (2 options = 1×2 grid)
//   Merged "Renewal pending" into description since it's still
//   technically active. Expired is the only hard block.
// ─────────────────────────────────────────────────────────────
export const q6_registrationStatus: RawSchemaQuestion = {
	id: 'q6_registrationStatus',
	bindsTo_template: 'registrationStatus',
	contextKey: 'registrationStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'check-circle'
	},
	required: true,
	question: 'Is the professional registration currently active and valid?',
	description:
		"<div class='info-title'><span class='info-icon green'>✅</span> Registration Status</div><div class='info-box highlight'>Active registration is mandatory. Expired, suspended, or lapsed registrations will disqualify the application.</div><div class='info-box tip'><span class='bold'>Note:</span> If renewal is pending but registration is not yet expired, select 'Active' — ensure renewal is completed before bank verification.</div>",
	options: [
		{
			label: 'Active and valid',
			value: 'active',
			labelDescription: 'Registration is current — includes renewal pending but not expired',
			icon: 'CheckCircle'
		},
		{
			label: 'Expired / Lapsed',
			value: 'expired',
			labelDescription: 'Registration has expired or been suspended — must renew first',
			icon: 'XCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'practiceType'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'registrationStatus' }, 'expired'] },
						{ '!=': [{ var: 'practiceType' }, 'employed'] }
					]
				},
				then: 'An expired professional registration cannot be used for independent practice or loan application. Please renew the registration first before applying.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'registrationStatus' }, 'expired'] },
						{ '==': [{ var: 'practiceType' }, 'employed'] }
					]
				},
				then: 'Expired personal registration with active employment \u2014 some lenders may accept institutional credentials. Renewing registration is still recommended before applying.'
			}
		]
	}
};

/** Returns all questions for the Professional Profile page.
 *  Session 32: q1_professionalCategory removed — already asked on loanRequirementPage
 *  (gates loan purpose/tenure). Value flows via shared bindsTo key 'professionalCategory'. */
export function getProfessionalProfilePageQuestions(): RawSchemaQuestion[] {
	return [
		// q1_professionalCategory removed — answered on loanRequirementPage (page 0)
		q2_professionalQualification,
		q3_registrationCouncilType,
		q4_practiceVintage,
		q5_practiceType,
		q6_registrationStatus
	];
}
