/**
 * Entity Name Pool - Realistic Indian entity names per income profile type
 *
 * Provides deterministic entity name selection for synthetic profile generation.
 * Each profile type has a pool of realistic names that match what DSAs would
 * encounter in real loan applications.
 */

import type { SeededRandom } from './namePool.js';

// ============================================================================
// EMPLOYER NAMES (for salaried profiles)
// ============================================================================

const SALARIED_EMPLOYERS = [
	'Tata Consultancy Services',
	'Infosys Ltd',
	'Wipro Ltd',
	'HCL Technologies',
	'HDFC Bank',
	'ICICI Bank',
	'State Bank of India',
	'Reliance Industries',
	'Larsen & Toubro',
	'Mahindra & Mahindra',
	'Bajaj Finance',
	'Asian Paints',
	'Hindustan Unilever',
	'ITC Limited',
	'Maruti Suzuki India',
	'Axis Bank',
	'Kotak Mahindra Bank',
	'Tech Mahindra',
	'Cognizant Technology Solutions',
	'Accenture India',
	'Amazon India',
	'Flipkart Internet',
	'Bharti Airtel',
	'Godrej Industries',
	'Adani Group'
] as const;

const CONTRACTUAL_EMPLOYERS = [
	'Randstad India',
	'TeamLease Services',
	'ABC Consultants',
	'Quess Corp Ltd',
	'Genius Consultants',
	'CIEL HR Services',
	'Manpower India',
	'Adecco India',
	'Kelly Services India',
	'Hays India'
] as const;

const GOVERNMENT_EMPLOYERS = [
	'Ministry of Defence',
	'Indian Railways',
	'Department of Revenue',
	'Central Board of Indirect Taxes',
	'Ministry of Home Affairs',
	'Department of Posts',
	'Ministry of Education',
	'Department of Health',
	'State PWD',
	'Municipal Corporation'
] as const;

// ============================================================================
// BUSINESS NAMES (for proprietorship)
// ============================================================================

const BUSINESS_NAMES_TRADING = [
	'Sharma Trading Co',
	'Gupta Electronics',
	'Patel Hardware Store',
	'Agarwal Textiles',
	'Singh Auto Parts',
	'Mehta Traders',
	'Jain Provisioners',
	'Reddy General Store',
	'Das Stationers',
	'Shah Mobiles',
	'Verma Steel Traders',
	'Desai Jewellers'
] as const;

const BUSINESS_NAMES_MANUFACTURING = [
	'Sharma Industries',
	'Gupta Packaging Works',
	'Patel Precision Engineers',
	'Agarwal Paper Mills',
	'Singh Fabricators',
	'Mehta Plastics',
	'Jain Ceramics',
	'Reddy Foods Pvt Ltd',
	'Das Printing Press',
	'Shah Garment Works'
] as const;

const BUSINESS_NAMES_SERVICES = [
	'Sharma Logistics',
	'Gupta IT Solutions',
	'Patel Transport',
	'Agarwal Tours & Travels',
	'Singh Security Services',
	'Mehta Consulting',
	'Jain Catering Services',
	'Reddy Events Management',
	'Das Courier Services',
	'Shah Real Estate Agency'
] as const;

// ============================================================================
// PARTNERSHIP / DIRECTOR COMPANY NAMES
// ============================================================================

const PARTNERSHIP_FIRMS = [
	'S.K. Associates',
	'R.P. Traders & Co',
	'Patel & Shah Partners',
	'Gupta Brothers Trading',
	'Singh & Sons',
	'Mehta Commercial LLP',
	'Jain & Agarwal Associates',
	'Reddy & Rao Partners',
	'Das & Bose LLP',
	'Shah & Desai Trading Co'
] as const;

const DIRECTOR_COMPANIES = [
	'Zenith Solutions Pvt Ltd',
	'Vertex Technologies Pvt Ltd',
	'Atlas Enterprises Pvt Ltd',
	'Phoenix Industries Pvt Ltd',
	'Nexus Consulting Pvt Ltd',
	'Prime Infrastructure Pvt Ltd',
	'Apex Trading Pvt Ltd',
	'Metro Services Pvt Ltd',
	'Horizon Healthcare Pvt Ltd',
	'Summit Realty Pvt Ltd'
] as const;

// ============================================================================
// PROFESSIONAL PRACTICE NAMES (template-based)
// ============================================================================

const PROFESSIONAL_PRACTICE_TEMPLATES: Record<string, string[]> = {
	'MBBS Doctor': [
		'Dr. {name} Clinic',
		'{name} Health Centre',
		'Dr. {name} Hospital',
		'{name} Medical Practice'
	],
	'Chartered Accountant(CA)': [
		'{name} & Associates CA',
		'{name} & Co. Chartered Accountants',
		'{name} Financial Advisors'
	],
	Architect: ['{name} Design Studio', '{name} Architects', '{name} & Associates Architects'],
	Lawyer: ['{name} Legal', '{name} & Associates Advocates', 'Law Office of {name}'],
	'Company Secretary': [
		'{name} CS & Associates',
		'{name} Corporate Services',
		'{name} & Co. Company Secretaries'
	],
	'Cost Accountant': ['{name} & Associates CMA', '{name} Cost Consulting']
};

// ============================================================================
// OTHER INCOME SOURCE NAMES
// ============================================================================

const PENSION_SOURCES = [
	'Indian Army',
	'Indian Railways',
	'State Government',
	'Central Government',
	'EPFO Pension',
	'State Bank of India (VRS)',
	'LIC of India (VRS)',
	'BSNL (VRS)',
	'Department of Posts',
	'State Police Department'
] as const;

const RENTAL_PROPERTIES = [
	'2BHK Flat - Andheri West',
	'3BHK Apartment - Whitefield',
	'Shop No 5 - MG Road',
	'Office Space - Connaught Place',
	'2BHK Flat - Banjara Hills',
	'1BHK Apartment - Koramangala',
	'Commercial Shop - Lajpat Nagar',
	'3BHK Villa - Wakad',
	'Warehouse - MIDC Bhosari',
	'Office Suite - BKC Mumbai',
	'2BHK Flat - Salt Lake City',
	'Shop - Linking Road'
] as const;

const FREELANCE_DESCRIPTIONS = [
	'IT Consulting',
	'Content Writing & Copywriting',
	'Graphic Design',
	'Digital Marketing',
	'Web Development',
	'Mobile App Development',
	'Video Production',
	'Photography',
	'Translation Services',
	'Data Analytics Consulting'
] as const;

const AGRICULTURE_DESCRIPTIONS = [
	'5 acres - Sugarcane - Pune',
	'10 acres - Paddy - Thanjavur',
	'3 acres - Cotton - Nagpur',
	'8 acres - Wheat - Meerut',
	'2 acres - Coconut - Mangalore',
	'15 acres - Soybean - Indore',
	'4 acres - Banana - Jalgaon',
	'6 acres - Grapes - Nashik',
	'12 acres - Rice - Nellore',
	'7 acres - Pulses - Gulbarga'
] as const;

const INVESTMENT_DESCRIPTIONS = [
	'Mutual Funds Portfolio',
	'Fixed Deposits',
	'Stock Market Investments',
	'NPS Account',
	'PPF Account',
	'Bond Portfolio',
	'Real Estate Investment Trust',
	'Dividend Income - Equities'
] as const;

// ============================================================================
// PUBLIC API
// ============================================================================

export function pickEntityName(
	rng: SeededRandom,
	profileType: string,
	options?: { lastName?: string; professionType?: string; businessType?: string }
): string {
	switch (profileType) {
		case 'salaried_regular':
			return rng.choice(SALARIED_EMPLOYERS);
		case 'salaried_contractual':
			return rng.choice(CONTRACTUAL_EMPLOYERS);
		case 'business_proprietorship': {
			const bType = options?.businessType?.toLowerCase() ?? '';
			if (bType.includes('manufacturing')) return rng.choice(BUSINESS_NAMES_MANUFACTURING);
			if (bType.includes('trading') || bType.includes('retail'))
				return rng.choice(BUSINESS_NAMES_TRADING);
			return rng.choice(BUSINESS_NAMES_SERVICES);
		}
		case 'business_partnership':
			return rng.choice(PARTNERSHIP_FIRMS);
		case 'director_company':
			return rng.choice(DIRECTOR_COMPANIES);
		case 'professional_practice': {
			const profType = options?.professionType ?? 'Chartered Accountant(CA)';
			const templates =
				PROFESSIONAL_PRACTICE_TEMPLATES[profType] ??
				PROFESSIONAL_PRACTICE_TEMPLATES['Chartered Accountant(CA)'];
			const template = rng.choice(templates);
			const name = options?.lastName ?? 'Sharma';
			return template.replace('{name}', name);
		}
		case 'pension':
			return rng.choice(PENSION_SOURCES);
		case 'rental_income':
			return rng.choice(RENTAL_PROPERTIES);
		case 'freelance_consulting':
			return rng.choice(FREELANCE_DESCRIPTIONS);
		case 'agriculture_income':
			return rng.choice(AGRICULTURE_DESCRIPTIONS);
		case 'investment_income':
			return rng.choice(INVESTMENT_DESCRIPTIONS);
		default:
			return '';
	}
}

export function pickGovernmentEmployer(rng: SeededRandom): string {
	return rng.choice(GOVERNMENT_EMPLOYERS);
}
