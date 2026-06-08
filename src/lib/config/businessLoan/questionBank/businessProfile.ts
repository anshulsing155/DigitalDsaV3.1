/**
 * Business Profile Questions
 * Page: businessProfilePage
 *
 * Note: businessEntityType is captured on the prior "Who's Applying" page
 * (AddApplicantBusiness.svelte). It is intentionally NOT asked again here.
 * Downstream questions on this page that depend on businessEntityType (e.g.,
 * q6_numberOfEmployees) read it from formState.applicationData where the
 * Who's Applying page has already written it.
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q2_businessIndustrySector: RawSchemaQuestion = {
	id: 'q2_businessIndustrySector',
	bindsTo_template: 'businessIndustrySector',
	contextKey: 'businessIndustrySector',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'factory'
	},
	required: true,
	question: 'Which industry sector does this business belong to?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏭</span> Industry Sector</div><div class='info-box highlight'>Some sectors get preferential rates while others may face restrictions.</div>",
	options: [
		{
			label: 'Manufacturing',
			value: 'manufacturing',
			icon: 'Factory'
		},
		{
			label: 'Trading',
			value: 'trading',
			icon: 'ArrowLeftRight'
		},
		{
			label: 'Services',
			value: 'services',
			icon: 'Briefcase'
		},
		{
			label: 'IT / Technology',
			value: 'it_technology',
			icon: 'Monitor'
		},
		{
			label: 'Healthcare',
			value: 'healthcare',
			icon: 'Heart'
		},
		{
			label: 'Construction / Real Estate',
			value: 'construction_realestate',
			icon: 'Building'
		},
		{
			label: 'Agriculture / Agri-business',
			value: 'agriculture',
			icon: 'Wheat'
		},
		{
			label: 'Other',
			value: 'other',
			icon: 'CircleDot'
		}
	]
};

export const q3_businessVintage: RawSchemaQuestion = {
	id: 'q3_businessVintage',
	bindsTo_template: 'businessVintage',
	contextKey: 'businessVintage',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'timer'
	},
	required: true,
	question: 'How long has this business been operational?',
	description:
		"<div class='info-title'><span class='info-icon green'>⏱️</span> Business Vintage</div><div class='info-box highlight'>Business vintage is one of the primary eligibility filters. Most banks require minimum 2 years.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Vintage is typically counted from the date of GST registration, Udyam registration, or incorporation — whichever is earliest.</div>",
	options: [
		{
			label: 'Less than 1 year',
			value: 'less_than_1',
			icon: 'AlertTriangle'
		},
		{
			label: '1-2 years',
			value: '1_to_2',
			icon: 'Clock'
		},
		{
			label: '2-3 years',
			value: '2_to_3',
			icon: 'Clock'
		},
		{
			label: '3-5 years',
			value: '3_to_5',
			icon: 'Timer'
		},
		{
			label: '5-10 years',
			value: '5_to_10',
			icon: 'Award'
		},
		{
			label: 'Over 10 years',
			value: 'over_10',
			icon: 'Trophy'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'businessIndustrySector'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'businessVintage' }, 'less_than_1']
				},
				then: 'Most banks require a minimum business vintage of 2 years for unsecured business loans. With less than 1 year, options will be very limited.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'businessVintage' }, 'less_than_1'] },
						{ '==': [{ var: 'businessIndustrySector' }, 'construction_realestate'] }
					]
				},
				then: 'Construction/Real Estate with <1 year vintage has no completion track record. Most lenders will decline \u2014 this sector typically requires 3+ years.'
			}
		]
	}
};

export const q4_gstRegistrationStatus: RawSchemaQuestion = {
	id: 'q4_gstRegistrationStatus',
	bindsTo_template: 'gstRegistrationStatus',
	contextKey: 'gstRegistrationStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'receipt'
	},
	required: true,
	question: 'Is the business GST registered?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📋</span> GST Registration</div><div class='info-box highlight'>GST registration is often mandatory for business loans. It validates business legitimacy and provides verifiable turnover data.</div>",
	options: [
		{
			label: 'Yes — GST registered',
			value: 'registered',
			icon: 'CheckCircle'
		},
		{
			label: 'No — not registered',
			value: 'not_registered',
			icon: 'XCircle'
		},
		{
			label: 'Exempted from GST',
			value: 'exempted',
			icon: 'MinusCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'businessVintage'
			},
			''
		]
	}
};

export const q5_annualTurnoverRange: RawSchemaQuestion = {
	id: 'q5_annualTurnoverRange',
	bindsTo_template: 'annualTurnoverRange',
	contextKey: 'annualTurnoverRange',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'trending-up'
	},
	required: true,
	question: 'What is the approximate annual turnover of the business?',
	description:
		"<div class='info-title'><span class='info-icon green'>📈</span> Annual Turnover</div><div class='info-box highlight'>Turnover determines the maximum loan amount — typically capped at 1-2x annual turnover for unsecured business loans.</div>",
	options: [
		{
			label: 'Below ₹25 Lakhs',
			value: 'below_25l',
			icon: 'TrendingDown'
		},
		{
			label: '₹25L - ₹50 Lakhs',
			value: '25l_to_50l',
			icon: 'TrendingUp'
		},
		{
			label: '₹50L - ₹1 Crore',
			value: '50l_to_1cr',
			icon: 'TrendingUp'
		},
		{
			label: '₹1Cr - ₹5 Crore',
			value: '1cr_to_5cr',
			icon: 'TrendingUp'
		},
		{
			label: 'Above ₹5 Crore',
			value: 'above_5cr',
			icon: 'TrendingUp'
		}
	],
	showWhen: {
		'!=': [{ var: 'gstRegistrationStatus' }, '']
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'gstRegistrationStatus' }, 'not_registered'] },
						{ in: [{ var: 'annualTurnoverRange' }, ['50l_to_1cr', '1cr_to_5cr', 'above_5cr']] }
					]
				},
				then: 'GST registration is mandatory for businesses with turnover above \u20b940L. Turnover \u20b950L+ without GST is non-compliant \u2014 lenders will likely decline as income cannot be verified through GST returns.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'businessVintage' }, 'less_than_1'] },
						{ in: [{ var: 'annualTurnoverRange' }, ['1cr_to_5cr', 'above_5cr']] }
					]
				},
				then: 'Turnover \u20b91Cr+ is unusual for a business less than 1 year old. Verify this is accurate \u2014 lenders will scrutinize closely for data fabrication.'
			}
		]
	}
};

export const q6_numberOfEmployees: RawSchemaQuestion = {
	id: 'q6_numberOfEmployees',
	bindsTo_template: 'numberOfEmployees',
	contextKey: 'numberOfEmployees',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'users'
	},
	required: false,
	question: 'How many employees does the business currently have?',
	description:
		"<div class='info-title'><span class='info-icon blue'>👥</span> Employee Count</div><div class='info-box highlight'>Helps lenders assess business scale and operational capacity.</div>",
	options: [
		{
			label: 'Solo / Self',
			value: 'solo',
			icon: 'User'
		},
		{
			label: '1-5 employees',
			value: '1_to_5',
			icon: 'Users'
		},
		{
			label: '6-20 employees',
			value: '6_to_20',
			icon: 'Users'
		},
		{
			label: '21-50 employees',
			value: '21_to_50',
			icon: 'Users'
		},
		{
			label: 'Over 50 employees',
			value: 'over_50',
			icon: 'Users'
		}
	],
	showWhen: {
		and: [
			{ '!=': [{ var: 'annualTurnoverRange' }, ''] },
			// Hide for proprietorship — solo by definition
			{ '!=': [{ var: 'businessEntityType' }, 'proprietorship'] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'businessVintage' }, 'less_than_1'] },
						{ in: [{ var: 'numberOfEmployees' }, ['21_to_50', 'over_50']] }
					]
				},
				then: '20+ employees in a business less than 1 year old is unusual. Verify this is not a restructured or acquired company.'
			}
		]
	}
};

/** Returns all questions for the Business Profile page */
export function getBusinessProfilePageQuestions(): RawSchemaQuestion[] {
	return [
		q2_businessIndustrySector,
		q3_businessVintage,
		q4_gstRegistrationStatus,
		q5_annualTurnoverRange,
		q6_numberOfEmployees
	];
}
