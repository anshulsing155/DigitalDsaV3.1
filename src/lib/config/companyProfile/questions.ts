/**
 * Company Profile Questions
 * ═══════════════════════════════════════════════════════════════════
 * Progressive profile questions for Tab 1 (Identity) and Tab 2 (Character).
 * All use RadioIcon-compatible option format.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { BusinessCategoryType } from '$lib/types/companyIncome';

// ── Option type (RadioIcon compatible) ───────────────────────────

export interface ProfileOption {
	label: string;
	value: string;
	icon?: string;
}

export interface ProfileQuestion {
	id: string;
	/** Field key on applicant object or deepProfile */
	key: string;
	label: string;
	options: ProfileOption[];
	required: boolean;
	/** If set, only shown when this condition is met */
	showWhen?: (applicant: Record<string, unknown>) => boolean;
	/** Explains WHY this question is asked — from lender/offer preparation perspective */
	whyAsked?: string;
}

// ══════════════════════════════════════════════════════════════════
// TAB 1: BUSINESS IDENTITY
// ══════════════════════════════════════════════════════════════════

export const IDENTITY_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'gstStatus',
		key: 'gstStatus',
		label: 'Is the business GST registered?',
		required: true,
		whyAsked:
			'GST registration is a key compliance signal. Registered businesses get better terms from most lenders. GST returns also serve as a verifiable income proof alongside ITR.',
		options: [
			{ label: 'Registered (regular)', value: 'registered_regular', icon: 'Check' },
			{ label: 'Registered (composition)', value: 'registered_composition', icon: 'Check' },
			{ label: 'Not registered', value: 'not_registered', icon: 'X' },
			{ label: 'Exempted', value: 'exempted', icon: 'Shield' }
		]
	},
	// NOTE: GST Registration Date rendered separately in CompanyBusinessProfile (DatePicker, not RadioIcon)
	{
		id: 'businessVintage',
		key: 'businessVintage',
		label: 'How long has this business been operational?',
		required: true,
		whyAsked:
			'Lenders use business vintage to assess stability. Under 3 years faces stricter scrutiny — some banks require minimum 3 years for unsecured loans.',
		options: [
			{ label: 'Less than 1 year', value: 'less_1', icon: 'AlertTriangle' },
			{ label: '1–2 years', value: '1_2', icon: 'Clock' },
			{ label: '2–3 years', value: '2_3', icon: 'Clock' },
			{ label: '3–5 years', value: '3_5', icon: 'Clock' },
			{ label: '5–10 years', value: '5_10', icon: 'Landmark' },
			{ label: 'Over 10 years', value: 'over_10', icon: 'Landmark' }
		]
	},
	{
		id: 'annualTurnover',
		key: 'annualTurnover',
		label: 'What is the approximate annual turnover?',
		required: true,
		whyAsked:
			'Turnover determines the maximum eligible loan amount. Higher turnover unlocks better offers and more lender options. Most banks cap loans at 20-30% of annual turnover.',
		options: [
			{ label: 'Below ₹25 Lakhs', value: 'below_25l', icon: 'TrendingDown' },
			{ label: '₹25L – ₹50 Lakhs', value: '25l_50l', icon: 'TrendingUp' },
			{ label: '₹50L – ₹1 Crore', value: '50l_1cr', icon: 'TrendingUp' },
			{ label: '₹1Cr – ₹5 Crore', value: '1cr_5cr', icon: 'TrendingUp' },
			{ label: '₹5Cr – ₹10 Crore', value: '5cr_10cr', icon: 'TrendingUp' },
			{ label: 'Above ₹10 Crore', value: 'above_10cr', icon: 'TrendingUp' }
		]
	},
	{
		id: 'employeeCount',
		key: 'employeeCount',
		label: 'How many employees does the business currently have?',
		required: true,
		whyAsked:
			'Employee count signals business scale and sustainability. Larger teams indicate established operations — some lenders offer better terms for businesses with 10+ employees.',
		options: [
			{ label: 'Solo / Self', value: 'solo', icon: 'User' },
			{ label: '1–5 employees', value: '1_5', icon: 'Users' },
			{ label: '6–20 employees', value: '6_20', icon: 'Users' },
			{ label: '21–50 employees', value: '21_50', icon: 'Users' },
			{ label: 'Over 50 employees', value: 'over_50', icon: 'Building2' }
		]
	}
];

// ══════════════════════════════════════════════════════════════════
// TAB 2: BUSINESS CHARACTER — Common Questions
// ══════════════════════════════════════════════════════════════════

export const CHARACTER_COMMON_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'revenuePattern',
		key: 'revenuePattern',
		label: 'What best describes the revenue pattern?',
		required: true,
		whyAsked:
			'Seasonal or lumpy revenue needs different EMI structuring. Steady income gets standard offers; seasonal businesses may need step-up EMI or balloon payments.',
		options: [
			{ label: 'Steady monthly', value: 'steady', icon: 'TrendingUp' },
			{ label: 'Seasonal (peak months)', value: 'seasonal', icon: 'Calendar' },
			{ label: 'Project-based (lumpy)', value: 'project_based', icon: 'Layers' },
			{ label: 'Daily cash collections', value: 'daily_cash', icon: 'Wallet' }
		]
	},
	{
		id: 'customerBase',
		key: 'customerBase',
		label: 'How is the customer base structured?',
		required: true,
		whyAsked:
			'Concentrated revenue (few large clients) is a risk signal — losing one client can derail repayment. Diversified client base gets better risk assessment from lenders.',
		options: [
			{ label: 'Many small clients', value: 'many_small', icon: 'Users' },
			{ label: 'Mix of small & large', value: 'mixed', icon: 'Users' },
			{ label: 'Few large clients (>50% from top 3)', value: 'concentrated', icon: 'User' },
			{ label: 'Govt / institutional contracts', value: 'institutional', icon: 'Landmark' }
		]
	},
	{
		id: 'businessPremises',
		key: 'businessPremises',
		label: 'What is the business premises situation?',
		required: true,
		whyAsked:
			'Owned premises add to net worth and can serve as collateral. Rented premises are neutral. Home-based may limit loan amounts with some lenders.',
		options: [
			{ label: 'Owned commercial', value: 'owned', icon: 'Building2' },
			{ label: 'Rented commercial', value: 'rented', icon: 'Building2' },
			{ label: 'Home-based', value: 'home_based', icon: 'Home' },
			{ label: 'No fixed premises', value: 'no_fixed', icon: 'MapPin' }
		]
	},
	{
		id: 'growthTrend',
		key: 'growthTrend',
		label: 'What is the growth trend (last 2 years)?',
		required: true,
		whyAsked:
			'Growing businesses are more attractive to lenders — indicates repayment capacity will improve. Declining trend triggers manual review at most banks.',
		options: [
			{ label: 'Growing (revenue up 15%+)', value: 'growing', icon: 'TrendingUp' },
			{ label: 'Stable', value: 'stable', icon: 'Minus' },
			{ label: 'Declining', value: 'declining', icon: 'TrendingDown' },
			{ label: 'New business (<2yr)', value: 'new_business', icon: 'Sparkles' }
		]
	}
];

// ── Conditional Questions ────────────────────────────────────────

export const CHARACTER_CONDITIONAL_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'priorExperience',
		key: 'priorExperience',
		label: 'Does the promoter have prior industry experience?',
		required: true,
		showWhen: (a) => {
			const v = a.businessVintage as string;
			return v === 'less_1' || v === '1_2' || v === '2_3';
		},
		options: [
			{ label: 'Same industry 5+ years', value: 'same_5plus', icon: 'Award' },
			{ label: 'Same industry 2–5 years', value: 'same_2_5', icon: 'Clock' },
			{ label: 'Different industry', value: 'different', icon: 'ArrowRight' },
			{ label: 'First-time entrepreneur', value: 'first_time', icon: 'Sparkles' }
		]
	},
	{
		id: 'gstFiling',
		key: 'gstFiling',
		label: 'How regular is the GST filing?',
		required: true,
		showWhen: (a) => {
			const g = a.gstStatus as string;
			return g === 'registered_regular' || g === 'registered_composition';
		},
		options: [
			{ label: 'Always on time', value: 'on_time', icon: 'Check' },
			{ label: 'Occasional delays', value: 'occasional_delay', icon: 'Clock' },
			{ label: 'Frequently late', value: 'frequently_late', icon: 'AlertTriangle' },
			{ label: 'Recently registered', value: 'recently_registered', icon: 'Sparkles' }
		]
	}
];

// ══════════════════════════════════════════════════════════════════
// TAB 2: BUSINESS CHARACTER — Category-Specific Questions
// ══════════════════════════════════════════════════════════════════

export interface CategorySection {
	categoryValue: BusinessCategoryType;
	categoryLabel: string;
	questions: ProfileQuestion[];
}

const MANUFACTURING_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'mfg_capacityUtil',
		key: 'mfg_capacityUtil',
		label: 'What is the current capacity utilization?',
		required: true,
		options: [
			{ label: 'Below 50%', value: 'below_50', icon: 'Gauge' },
			{ label: '50–75%', value: '50_75', icon: 'Gauge' },
			{ label: '75–90%', value: '75_90', icon: 'TrendingUp' },
			{ label: 'Above 90%', value: 'above_90', icon: 'TrendingUp' }
		]
	},
	{
		id: 'mfg_market',
		key: 'mfg_market',
		label: 'What is the primary market?',
		required: true,
		options: [
			{ label: 'Domestic only', value: 'domestic', icon: 'MapPin' },
			{ label: 'Some export (<25%)', value: 'some_export', icon: 'Package' },
			{ label: 'Significant export (25%+)', value: 'significant_export', icon: 'Package' }
		]
	},
	{
		id: 'mfg_orderBook',
		key: 'mfg_orderBook',
		label: 'What is the current order book visibility?',
		required: true,
		options: [
			{ label: '6+ months', value: '6plus_months', icon: 'Calendar' },
			{ label: '3–6 months', value: '3_6_months', icon: 'Calendar' },
			{ label: 'Less than 3 months', value: 'less_3_months', icon: 'Clock' },
			{ label: 'Walk-in / spot orders only', value: 'walkin_only', icon: 'ShoppingCart' }
		]
	}
];

const TRADING_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'trd_model',
		key: 'trd_model',
		label: 'What is the primary business model?',
		required: true,
		options: [
			{ label: 'Mostly B2B (wholesale)', value: 'b2b', icon: 'Building2' },
			{ label: 'Mostly B2C (retail)', value: 'b2c', icon: 'Store' },
			{ label: 'Both equally', value: 'both', icon: 'Layers' },
			{ label: 'E-commerce / online', value: 'ecommerce', icon: 'Monitor' }
		]
	},
	{
		id: 'trd_creditSales',
		key: 'trd_creditSales',
		label: 'What percentage of sales are on credit?',
		required: true,
		options: [
			{ label: 'Mostly cash / advance', value: 'mostly_cash', icon: 'Banknote' },
			{ label: 'Less than 30% credit', value: 'less_30', icon: 'CreditCard' },
			{ label: '30–60% credit', value: '30_60', icon: 'CreditCard' },
			{ label: 'More than 60% credit', value: 'more_60', icon: 'CreditCard' }
		]
	},
	{
		id: 'trd_inventory',
		key: 'trd_inventory',
		label: 'What is the typical inventory holding period?',
		required: true,
		options: [
			{ label: 'Less than 15 days', value: 'less_15', icon: 'Clock' },
			{ label: '15–30 days', value: '15_30', icon: 'Clock' },
			{ label: '30–60 days', value: '30_60', icon: 'Package' },
			{ label: '60+ days', value: '60plus', icon: 'Package' }
		]
	}
];

const SERVICES_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'svc_revenueModel',
		key: 'svc_revenueModel',
		label: 'What is the primary revenue model?',
		required: true,
		options: [
			{ label: 'Recurring / retainer (>50%)', value: 'recurring', icon: 'RefreshCw' },
			{ label: 'Project-based', value: 'project_based', icon: 'Layers' },
			{ label: 'Hourly / daily billing', value: 'hourly', icon: 'Clock' },
			{ label: 'Mixed', value: 'mixed', icon: 'Briefcase' }
		]
	},
	{
		id: 'svc_keyPerson',
		key: 'svc_keyPerson',
		label: 'How dependent is the business on key individuals?',
		required: true,
		options: [
			{ label: 'Institutionalized (team-driven)', value: 'institutionalized', icon: 'Users' },
			{ label: 'Moderate (2–3 key people)', value: 'moderate', icon: 'Users' },
			{ label: 'High (founder-dependent)', value: 'founder_dependent', icon: 'User' }
		]
	},
	{
		id: 'svc_clientRetention',
		key: 'svc_clientRetention',
		label: 'What is the client retention rate?',
		required: true,
		options: [
			{ label: '80%+ clients repeat', value: 'high_retention', icon: 'Handshake' },
			{ label: '50–80% repeat', value: 'moderate_retention', icon: 'Handshake' },
			{ label: 'Less than 50% repeat', value: 'low_retention', icon: 'TrendingDown' },
			{ label: 'New business', value: 'new_business', icon: 'Sprout' }
		]
	}
];

const COMMISSION_QUESTIONS: ProfileQuestion[] = [
	{
		id: 'comm_principals',
		key: 'comm_principals',
		label: 'How many principal relationships?',
		required: true,
		options: [
			{ label: 'Single principal', value: 'single', icon: 'User' },
			{ label: '2–5 principals', value: '2_5', icon: 'Users' },
			{ label: '6+ principals', value: '6plus', icon: 'Users' }
		]
	},
	{
		id: 'comm_longestRelation',
		key: 'comm_longestRelation',
		label: 'How long is the longest principal relationship?',
		required: true,
		options: [
			{ label: 'Less than 1 year', value: 'less_1', icon: 'Clock' },
			{ label: '1–3 years', value: '1_3', icon: 'Clock' },
			{ label: '3–5 years', value: '3_5', icon: 'Award' },
			{ label: '5+ years', value: '5plus', icon: 'Award' }
		]
	},
	{
		id: 'comm_incomePredictability',
		key: 'comm_incomePredictability',
		label: 'How predictable is the income?',
		required: true,
		options: [
			{ label: 'Fixed retainer + variable', value: 'retainer_plus', icon: 'Wallet' },
			{ label: 'Purely variable / commission', value: 'purely_variable', icon: 'TrendingUp' },
			{ label: 'Project-based fees', value: 'project_fees', icon: 'Layers' }
		]
	}
];

/** Get category-specific questions for selected categories */
export function getCategoryQuestions(category: BusinessCategoryType): CategorySection {
	switch (category) {
		case 'manufacturing':
			return {
				categoryValue: 'manufacturing',
				categoryLabel: 'Manufacturing & Production',
				questions: MANUFACTURING_QUESTIONS
			};
		case 'trading':
			return { categoryValue: 'trading', categoryLabel: 'Trading', questions: TRADING_QUESTIONS };
		case 'services':
			return {
				categoryValue: 'services',
				categoryLabel: 'Services',
				questions: SERVICES_QUESTIONS
			};
		case 'commission_agency':
			return {
				categoryValue: 'commission_agency',
				categoryLabel: 'Commission & Agency',
				questions: COMMISSION_QUESTIONS
			};
	}
}

/** Get all category sections for an array of selected categories */
export function getCategorySections(categories: BusinessCategoryType[]): CategorySection[] {
	return categories.map(getCategoryQuestions);
}
