/**
 * Deep Business Profiling — Question Configuration
 * ══════════════════════════════════════════════════
 * Config-driven question sets for Company applicants in unsecured loans.
 * Returns sections based on loan category + business/professional type.
 *
 * Business Loan: common operations + type-specific (Manufacturing/Trading/Services/Commission)
 * Professional Loan: common practice + category-specific (Medical/CA-CS/Legal/Architect)
 * Personal Loan: returns empty (no Company applicants)
 */

// ── Types ────────────────────────────────────────────────────────────

export interface DeepProfileQuestion {
	id: string;
	label: string;
	type: 'radio' | 'select' | 'number' | 'text' | 'multi-select';
	options?: { label: string; value: string }[];
	placeholder?: string;
	required: boolean;
}

export interface DeepProfileSection {
	id: string;
	title: string;
	description: string;
	questions: DeepProfileQuestion[];
}

// ── Business Loan Sections ──────────────────────────────────────────

const BUSINESS_COMMON: DeepProfileSection = {
	id: 'business_operations',
	title: 'Business Operations',
	description: 'Core operational details that credit managers evaluate for unsecured lending.',
	questions: [
		{
			id: 'yearsInCurrentBusiness',
			label: 'How long has this business been running?',
			type: 'select',
			options: [
				{ label: 'Less than 1 year', value: '<1yr' },
				{ label: '1–3 years', value: '1-3yr' },
				{ label: '3–5 years', value: '3-5yr' },
				{ label: '5–10 years', value: '5-10yr' },
				{ label: 'Over 10 years', value: '10+yr' }
			],
			required: true
		},
		{
			id: 'businessOwnership',
			label: 'Business premises ownership',
			type: 'radio',
			options: [
				{ label: 'Owned', value: 'Owned' },
				{ label: 'Rented', value: 'Rented' },
				{ label: 'Leased', value: 'Leased' }
			],
			required: true
		},
		{
			id: 'monthlyRevenueRange',
			label: 'Approximate monthly revenue',
			type: 'select',
			options: [
				{ label: 'Below ₹2 Lakhs', value: '<2L' },
				{ label: '₹2L – ₹5 Lakhs', value: '2-5L' },
				{ label: '₹5L – ₹10 Lakhs', value: '5-10L' },
				{ label: '₹10L – ₹25 Lakhs', value: '10-25L' },
				{ label: '₹25L – ₹50 Lakhs', value: '25-50L' },
				{ label: 'Above ₹50 Lakhs', value: '50L+' }
			],
			required: true
		},
		{
			id: 'primaryRevenueSource',
			label: 'Main source of revenue',
			type: 'text',
			placeholder: 'e.g. Product sales, Service contracts, Commission',
			required: false
		},
		{
			id: 'seasonalVariation',
			label: 'Revenue seasonal pattern',
			type: 'radio',
			options: [
				{ label: 'Steady', value: 'Steady' },
				{ label: 'Moderate variation', value: 'Moderate' },
				{ label: 'Highly seasonal', value: 'Highly seasonal' }
			],
			required: true
		},
		{
			id: 'topClientConcentration',
			label: 'Revenue from top 3 clients',
			type: 'select',
			options: [
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: '50% – 75%', value: '50-75%' },
				{ label: 'Above 75%', value: '75%+' }
			],
			required: true
		},
		{
			id: 'paymentCollectionCycle',
			label: 'Average payment collection cycle',
			type: 'select',
			options: [
				{ label: 'Less than 15 days', value: '<15d' },
				{ label: '15–30 days', value: '15-30d' },
				{ label: '30–60 days', value: '30-60d' },
				{ label: '60–90 days', value: '60-90d' },
				{ label: 'Over 90 days', value: '90+d' }
			],
			required: true
		},
		{
			id: 'bankRelationshipVintage',
			label: 'Banking relationship tenure',
			type: 'select',
			options: [
				{ label: 'Less than 1 year', value: '<1yr' },
				{ label: '1–3 years', value: '1-3yr' },
				{ label: '3–5 years', value: '3-5yr' },
				{ label: 'Over 5 years', value: '5+yr' }
			],
			required: true
		},
		{
			id: 'hasRegularGSTFiling',
			label: 'Regular GST filing?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' },
				{ label: 'Not applicable', value: 'NA' }
			],
			required: true
		},
		{
			id: 'growthTrend',
			label: 'Revenue trend last 2 years',
			type: 'radio',
			options: [
				{ label: 'Growing', value: 'Growing' },
				{ label: 'Stable', value: 'Stable' },
				{ label: 'Declining', value: 'Declining' }
			],
			required: true
		}
	]
};

const MANUFACTURING_SECTION: DeepProfileSection = {
	id: 'manufacturing_profile',
	title: 'Manufacturing Profile',
	description: 'Production capacity, supply chain, and quality certifications.',
	questions: [
		{
			id: 'capacityUtilization',
			label: 'Current capacity utilization',
			type: 'select',
			options: [
				{ label: 'Below 50%', value: '<50%' },
				{ label: '50% – 70%', value: '50-70%' },
				{ label: '70% – 85%', value: '70-85%' },
				{ label: 'Above 85%', value: '85%+' }
			],
			required: true
		},
		{
			id: 'rawMaterialDependency',
			label: 'Supplier concentration',
			type: 'radio',
			options: [
				{ label: 'Single supplier', value: 'Single' },
				{ label: 'Few (2–5)', value: 'Few' },
				{ label: 'Diversified', value: 'Diversified' }
			],
			required: true
		},
		{
			id: 'inventoryTurnoverDays',
			label: 'Inventory cycle in days',
			type: 'select',
			options: [
				{ label: 'Less than 30 days', value: '<30' },
				{ label: '30–60 days', value: '30-60' },
				{ label: '60–90 days', value: '60-90' },
				{ label: 'Over 90 days', value: '90+' }
			],
			required: true
		},
		{
			id: 'orderBookPosition',
			label: 'Current order book',
			type: 'select',
			options: [
				{ label: 'Empty', value: 'Empty' },
				{ label: 'Less than 1 month', value: '<1mo' },
				{ label: '1–3 months', value: '1-3mo' },
				{ label: '3–6 months', value: '3-6mo' },
				{ label: 'Over 6 months', value: '6+mo' }
			],
			required: true
		},
		{
			id: 'qualityCertifications',
			label: 'Quality certifications held',
			type: 'multi-select',
			options: [
				{ label: 'ISO', value: 'ISO' },
				{ label: 'BIS', value: 'BIS' },
				{ label: 'FSSAI', value: 'FSSAI' },
				{ label: 'GMP', value: 'GMP' },
				{ label: 'Other', value: 'Other' }
			],
			required: false
		},
		{
			id: 'exportContribution',
			label: 'Export % of revenue',
			type: 'select',
			options: [
				{ label: 'None', value: 'None' },
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: 'Above 50%', value: '50%+' }
			],
			required: false
		}
	]
};

const TRADING_SECTION: DeepProfileSection = {
	id: 'trading_profile',
	title: 'Trading Profile',
	description: 'Sales model, inventory management, and credit terms.',
	questions: [
		{
			id: 'tradingModel',
			label: 'Business model',
			type: 'radio',
			options: [
				{ label: 'B2B', value: 'B2B' },
				{ label: 'B2C', value: 'B2C' },
				{ label: 'Both', value: 'Both' }
			],
			required: true
		},
		{
			id: 'inventoryHoldingDays',
			label: 'Average inventory holding days',
			type: 'select',
			options: [
				{ label: 'Less than 15 days', value: '<15' },
				{ label: '15–30 days', value: '15-30' },
				{ label: '30–60 days', value: '30-60' },
				{ label: 'Over 60 days', value: '60+' }
			],
			required: true
		},
		{
			id: 'creditSalesPercent',
			label: 'Sales on credit',
			type: 'select',
			options: [
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: '50% – 75%', value: '50-75%' },
				{ label: 'Above 75%', value: '75%+' }
			],
			required: true
		},
		{
			id: 'supplierCreditTerms',
			label: 'Credit terms from suppliers',
			type: 'select',
			options: [
				{ label: 'Cash only', value: 'Cash' },
				{ label: 'Less than 30 days', value: '<30d' },
				{ label: '30–60 days', value: '30-60d' },
				{ label: '60–90 days', value: '60-90d' },
				{ label: 'Over 90 days', value: '90+d' }
			],
			required: true
		},
		{
			id: 'returnRejectionRate',
			label: 'Average return/rejection rate',
			type: 'select',
			options: [
				{ label: 'Less than 2%', value: '<2%' },
				{ label: '2% – 5%', value: '2-5%' },
				{ label: '5% – 10%', value: '5-10%' },
				{ label: 'Above 10%', value: '10%+' }
			],
			required: false
		},
		{
			id: 'salesChannelMix',
			label: 'Sales channel',
			type: 'radio',
			options: [
				{ label: 'Online', value: 'Online' },
				{ label: 'Offline', value: 'Offline' },
				{ label: 'Both', value: 'Both' }
			],
			required: true
		}
	]
};

const SERVICES_SECTION: DeepProfileSection = {
	id: 'services_profile',
	title: 'Services Profile',
	description: 'Revenue model, client base, and key-person dependency.',
	questions: [
		{
			id: 'serviceModel',
			label: 'Revenue model',
			type: 'radio',
			options: [
				{ label: 'Project-based', value: 'Project-based' },
				{ label: 'Retainer', value: 'Retainer' },
				{ label: 'Subscription', value: 'Subscription' },
				{ label: 'Mixed', value: 'Mixed' }
			],
			required: true
		},
		{
			id: 'activeClientCount',
			label: 'Number of active clients',
			type: 'select',
			options: [
				{ label: '1–5', value: '1-5' },
				{ label: '6–20', value: '6-20' },
				{ label: '21–50', value: '21-50' },
				{ label: 'Over 50', value: '50+' }
			],
			required: true
		},
		{
			id: 'contractPipeline',
			label: 'Signed contracts pipeline',
			type: 'select',
			options: [
				{ label: 'None', value: 'None' },
				{ label: 'Less than 3 months', value: '<3mo' },
				{ label: '3–6 months', value: '3-6mo' },
				{ label: '6–12 months', value: '6-12mo' },
				{ label: 'Over 12 months', value: '12+mo' }
			],
			required: true
		},
		{
			id: 'keyPersonDependency',
			label: 'Business key-person risk',
			type: 'radio',
			options: [
				{ label: 'High', value: 'High' },
				{ label: 'Medium', value: 'Medium' },
				{ label: 'Low', value: 'Low' }
			],
			required: true
		},
		{
			id: 'recurringRevenuePercent',
			label: 'Recurring vs one-time revenue',
			type: 'select',
			options: [
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: '50% – 75%', value: '50-75%' },
				{ label: 'Above 75%', value: '75%+' }
			],
			required: true
		}
	]
};

const COMMISSION_SECTION: DeepProfileSection = {
	id: 'commission_profile',
	title: 'Commission / Agency Profile',
	description: 'Principal relationships, territory, and collection handling.',
	questions: [
		{
			id: 'commissionModel',
			label: 'Commission structure',
			type: 'radio',
			options: [
				{ label: 'Fixed', value: 'Fixed' },
				{ label: 'Percentage', value: 'Percentage' },
				{ label: 'Hybrid', value: 'Hybrid' }
			],
			required: true
		},
		{
			id: 'principalCount',
			label: 'Number of principal companies',
			type: 'select',
			options: [
				{ label: '1', value: '1' },
				{ label: '2–5', value: '2-5' },
				{ label: '6–10', value: '6-10' },
				{ label: 'Over 10', value: '10+' }
			],
			required: true
		},
		{
			id: 'longestPrincipalRelationship',
			label: 'Longest principal relationship',
			type: 'select',
			options: [
				{ label: 'Less than 1 year', value: '<1yr' },
				{ label: '1–3 years', value: '1-3yr' },
				{ label: '3–5 years', value: '3-5yr' },
				{ label: 'Over 5 years', value: '5+yr' }
			],
			required: true
		},
		{
			id: 'territoryExclusivity',
			label: 'Exclusive territory rights?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' },
				{ label: 'Partial', value: 'Partial' }
			],
			required: true
		},
		{
			id: 'handlesCollections',
			label: 'Handles payment collections?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			],
			required: true
		}
	]
};

/** Maps businessType values (from CompanyBusinessProfile BUSINESS_CATEGORY_OPTIONS) to sections */
const BUSINESS_TYPE_MAP: Record<string, DeepProfileSection> = {
	manufacturing: MANUFACTURING_SECTION,
	trading: TRADING_SECTION,
	b2b_services: SERVICES_SECTION,
	'commission-business': COMMISSION_SECTION
};

// ── Professional Loan Sections ──────────────────────────────────────

const PROFESSIONAL_COMMON: DeepProfileSection = {
	id: 'practice_operations',
	title: 'Practice Operations',
	description: 'Core practice details for professional loan assessment.',
	questions: [
		{
			id: 'practiceYears',
			label: 'Years in active practice',
			type: 'select',
			options: [
				{ label: 'Less than 2 years', value: '<2yr' },
				{ label: '2–5 years', value: '2-5yr' },
				{ label: '5–10 years', value: '5-10yr' },
				{ label: '10–20 years', value: '10-20yr' },
				{ label: 'Over 20 years', value: '20+yr' }
			],
			required: true
		},
		{
			id: 'practiceSetup',
			label: 'Practice structure',
			type: 'radio',
			options: [
				{ label: 'Solo', value: 'Solo' },
				{ label: 'Partnership', value: 'Partnership' },
				{ label: 'Firm', value: 'Firm' }
			],
			required: true
		},
		{
			id: 'monthlyBillingAvg',
			label: 'Average monthly billing',
			type: 'select',
			options: [
				{ label: 'Below ₹1 Lakh', value: '<1L' },
				{ label: '₹1L – ₹3 Lakhs', value: '1-3L' },
				{ label: '₹3L – ₹10 Lakhs', value: '3-10L' },
				{ label: '₹10L – ₹25 Lakhs', value: '10-25L' },
				{ label: 'Above ₹25 Lakhs', value: '25L+' }
			],
			required: true
		},
		{
			id: 'clientRetentionRate',
			label: 'Returning client percentage',
			type: 'select',
			options: [
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: '50% – 75%', value: '50-75%' },
				{ label: 'Above 75%', value: '75%+' }
			],
			required: true
		},
		{
			id: 'hasProfessionalInsurance',
			label: 'Professional indemnity insurance?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			],
			required: false
		},
		{
			id: 'regulatoryCompliance',
			label: 'All licenses/registrations current?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' },
				{ label: 'Partial', value: 'Partial' }
			],
			required: true
		},
		{
			id: 'supportStaffCount',
			label: 'Support staff count',
			type: 'select',
			options: [
				{ label: 'None', value: 'None' },
				{ label: '1–3', value: '1-3' },
				{ label: '4–10', value: '4-10' },
				{ label: '11–25', value: '11-25' },
				{ label: 'Over 25', value: '25+' }
			],
			required: true
		},
		{
			id: 'practiceGrowthTrend',
			label: 'Practice revenue trend (2 years)',
			type: 'radio',
			options: [
				{ label: 'Growing', value: 'Growing' },
				{ label: 'Stable', value: 'Stable' },
				{ label: 'Declining', value: 'Declining' }
			],
			required: true
		}
	]
};

const MEDICAL_SECTION: DeepProfileSection = {
	id: 'medical_practice',
	title: 'Medical Practice',
	description: 'Facility details, specialization, and patient volume.',
	questions: [
		{
			id: 'facilityType',
			label: 'Facility type',
			type: 'radio',
			options: [
				{ label: 'Clinic', value: 'Clinic' },
				{ label: 'Hospital', value: 'Hospital' },
				{ label: 'Nursing Home', value: 'Nursing Home' },
				{ label: 'Diagnostic Centre', value: 'Diagnostic Centre' }
			],
			required: true
		},
		{
			id: 'bedCount',
			label: 'Number of beds',
			type: 'select',
			options: [
				{ label: 'OPD only', value: 'OPD only' },
				{ label: 'Less than 10', value: '<10' },
				{ label: '10–25', value: '10-25' },
				{ label: '25–50', value: '25-50' },
				{ label: 'Over 50', value: '50+' }
			],
			required: true
		},
		{
			id: 'specialization',
			label: 'Primary specialization',
			type: 'select',
			options: [
				{ label: 'General', value: 'General' },
				{ label: 'Dental', value: 'Dental' },
				{ label: 'Orthopaedics', value: 'Orthopaedics' },
				{ label: 'Cardiology', value: 'Cardiology' },
				{ label: 'Neurology', value: 'Neurology' },
				{ label: 'Gynaecology', value: 'Gynaecology' },
				{ label: 'Paediatrics', value: 'Paediatrics' },
				{ label: 'Ophthalmology', value: 'Ophthalmology' },
				{ label: 'ENT', value: 'ENT' },
				{ label: 'Other', value: 'Other' }
			],
			required: true
		},
		{
			id: 'insurancePanelCount',
			label: 'Insurance/TPA empanelments',
			type: 'select',
			options: [
				{ label: 'None', value: 'None' },
				{ label: '1–3', value: '1-3' },
				{ label: '4–10', value: '4-10' },
				{ label: 'Over 10', value: '10+' }
			],
			required: false
		},
		{
			id: 'avgDailyPatients',
			label: 'Average daily patient footfall',
			type: 'select',
			options: [
				{ label: 'Less than 10', value: '<10' },
				{ label: '10–25', value: '10-25' },
				{ label: '25–50', value: '25-50' },
				{ label: '50–100', value: '50-100' },
				{ label: 'Over 100', value: '100+' }
			],
			required: true
		},
		{
			id: 'majorEquipmentAge',
			label: 'Age of major equipment',
			type: 'select',
			options: [
				{ label: 'Less than 2 years', value: '<2yr' },
				{ label: '2–5 years', value: '2-5yr' },
				{ label: '5–10 years', value: '5-10yr' },
				{ label: 'Over 10 years', value: '10+yr' }
			],
			required: false
		}
	]
};

const CA_CS_SECTION: DeepProfileSection = {
	id: 'ca_cs_practice',
	title: 'CA / CS / CMA Practice',
	description: 'Client base, practice areas, and seasonal patterns.',
	questions: [
		{
			id: 'auditClientCount',
			label: 'Audit/compliance clients',
			type: 'select',
			options: [
				{ label: 'Less than 10', value: '<10' },
				{ label: '10–25', value: '10-25' },
				{ label: '25–50', value: '25-50' },
				{ label: '50–100', value: '50-100' },
				{ label: 'Over 100', value: '100+' }
			],
			required: true
		},
		{
			id: 'retainerClientCount',
			label: 'Monthly retainer clients',
			type: 'select',
			options: [
				{ label: 'Less than 5', value: '<5' },
				{ label: '5–15', value: '5-15' },
				{ label: '15–30', value: '15-30' },
				{ label: '30–50', value: '30-50' },
				{ label: 'Over 50', value: '50+' }
			],
			required: true
		},
		{
			id: 'filingSeasonConcentration',
			label: 'Revenue concentration in filing season',
			type: 'select',
			options: [
				{ label: 'Less than 30%', value: '<30%' },
				{ label: '30% – 50%', value: '30-50%' },
				{ label: '50% – 70%', value: '50-70%' },
				{ label: 'Above 70%', value: '70%+' }
			],
			required: true
		},
		{
			id: 'firmNetworkMember',
			label: 'Part of multi-city network?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			],
			required: false
		},
		{
			id: 'practiceAreas',
			label: 'Key practice areas',
			type: 'multi-select',
			options: [
				{ label: 'Audit', value: 'Audit' },
				{ label: 'Tax', value: 'Tax' },
				{ label: 'Corporate Law', value: 'Corporate Law' },
				{ label: 'GST', value: 'GST' },
				{ label: 'Transfer Pricing', value: 'Transfer Pricing' },
				{ label: 'Insolvency', value: 'Insolvency' },
				{ label: 'Advisory', value: 'Advisory' }
			],
			required: false
		}
	]
};

const LEGAL_SECTION: DeepProfileSection = {
	id: 'legal_practice',
	title: 'Legal Practice',
	description: 'Court level, practice area, and caseload.',
	questions: [
		{
			id: 'courtLevel',
			label: 'Primary court level',
			type: 'select',
			options: [
				{ label: 'District Court', value: 'District' },
				{ label: 'High Court', value: 'High Court' },
				{ label: 'Supreme Court', value: 'Supreme Court' },
				{ label: 'Tribunals', value: 'Tribunals' },
				{ label: 'Mixed', value: 'Mixed' }
			],
			required: true
		},
		{
			id: 'practiceArea',
			label: 'Primary practice area',
			type: 'select',
			options: [
				{ label: 'Civil', value: 'Civil' },
				{ label: 'Criminal', value: 'Criminal' },
				{ label: 'Corporate', value: 'Corporate' },
				{ label: 'Tax', value: 'Tax' },
				{ label: 'Family', value: 'Family' },
				{ label: 'Intellectual Property', value: 'Intellectual Property' },
				{ label: 'Real Estate', value: 'Real Estate' },
				{ label: 'Labour', value: 'Labour' },
				{ label: 'Mixed', value: 'Mixed' }
			],
			required: true
		},
		{
			id: 'activeCaseload',
			label: 'Active cases count',
			type: 'select',
			options: [
				{ label: 'Less than 10', value: '<10' },
				{ label: '10–25', value: '10-25' },
				{ label: '25–50', value: '25-50' },
				{ label: '50–100', value: '50-100' },
				{ label: 'Over 100', value: '100+' }
			],
			required: true
		},
		{
			id: 'seniorDesignation',
			label: 'Senior advocate designation?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			],
			required: false
		},
		{
			id: 'feeStructure',
			label: 'Fee structure',
			type: 'radio',
			options: [
				{ label: 'Fixed', value: 'Fixed' },
				{ label: 'Hourly', value: 'Hourly' },
				{ label: 'Success-based', value: 'Success-based' },
				{ label: 'Mixed', value: 'Mixed' }
			],
			required: true
		}
	]
};

const ARCHITECT_SECTION: DeepProfileSection = {
	id: 'architect_practice',
	title: 'Architecture / Engineering Practice',
	description: 'Project scale, active projects, and registration.',
	questions: [
		{
			id: 'projectScale',
			label: 'Typical project scale',
			type: 'select',
			options: [
				{ label: 'Residential', value: 'Residential' },
				{ label: 'Commercial', value: 'Commercial' },
				{ label: 'Industrial', value: 'Industrial' },
				{ label: 'Infrastructure', value: 'Infrastructure' },
				{ label: 'Mixed', value: 'Mixed' }
			],
			required: true
		},
		{
			id: 'activeProjectCount',
			label: 'Current active projects',
			type: 'select',
			options: [
				{ label: '1–2', value: '1-2' },
				{ label: '3–5', value: '3-5' },
				{ label: '6–10', value: '6-10' },
				{ label: 'Over 10', value: '10+' }
			],
			required: true
		},
		{
			id: 'avgProjectDuration',
			label: 'Typical project duration',
			type: 'select',
			options: [
				{ label: 'Less than 3 months', value: '<3mo' },
				{ label: '3–6 months', value: '3-6mo' },
				{ label: '6–12 months', value: '6-12mo' },
				{ label: '12–24 months', value: '12-24mo' },
				{ label: 'Over 24 months', value: '24+mo' }
			],
			required: true
		},
		{
			id: 'councilRegistration',
			label: 'CoA / IE registration current?',
			type: 'radio',
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			],
			required: true
		},
		{
			id: 'subcontractingPercent',
			label: 'Work subcontracted out',
			type: 'select',
			options: [
				{ label: 'None', value: 'None' },
				{ label: 'Less than 25%', value: '<25%' },
				{ label: '25% – 50%', value: '25-50%' },
				{ label: 'Above 50%', value: '50%+' }
			],
			required: false
		}
	]
};

// ── Professional category matching ──────────────────────────────────

/** Keywords that identify professional categories from professionalCategory string.
 *  ORDERING MATTERS: Legal keywords checked BEFORE CA/CS because "advocate" contains
 *  "ca" substring. Word-boundary regex protects keywords ≤3 chars, but ordering
 *  provides defense-in-depth. Do NOT reorder without checking for false positives. */
const PROFESSIONAL_CATEGORY_MAP: Array<{
	keywords: string[];
	section: DeepProfileSection;
}> = [
	{ keywords: ['doctor', 'medical', 'physician', 'surgeon', 'dentist'], section: MEDICAL_SECTION },
	{ keywords: ['lawyer', 'advocate', 'attorney', 'legal'], section: LEGAL_SECTION },
	{ keywords: ['architect', 'engineer', 'structural'], section: ARCHITECT_SECTION },
	{ keywords: ['chartered', 'company secretary', 'cost accountant', 'cma'], section: CA_CS_SECTION }
];

/** Word-boundary-aware keyword match to prevent substring false positives (e.g. "advocate" matching "ca") */
function matchProfessionalCategory(category: string | undefined): DeepProfileSection | null {
	if (!category) return null;
	const lower = category.toLowerCase();
	for (const entry of PROFESSIONAL_CATEGORY_MAP) {
		if (
			entry.keywords.some((kw) => {
				// For short keywords (<=3 chars), use word boundary match
				if (kw.length <= 3) {
					const regex = new RegExp(`\\b${kw}\\b`, 'i');
					return regex.test(lower);
				}
				return lower.includes(kw);
			})
		) {
			return entry.section;
		}
	}
	return null;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Returns deep profile sections based on loan category and business/professional type.
 *
 * @param loanCategory - 'business' | 'professional' | 'personal'
 * @param businessType - Business category value (from CompanyBusinessProfile BUSINESS_CATEGORY_OPTIONS)
 * @param professionalCategory - Professional category string (matched by keywords)
 * @returns Array of sections. Empty for personal loans or unknown types.
 */
export function getDeepProfileSections(
	loanCategory: 'business' | 'professional' | 'personal' | string,
	businessType?: string,
	professionalCategory?: string
): DeepProfileSection[] {
	if (loanCategory === 'personal') return [];

	if (loanCategory === 'business') {
		const sections: DeepProfileSection[] = [BUSINESS_COMMON];
		if (businessType && BUSINESS_TYPE_MAP[businessType]) {
			sections.push(BUSINESS_TYPE_MAP[businessType]);
		}
		return sections;
	}

	if (loanCategory === 'professional') {
		const sections: DeepProfileSection[] = [PROFESSIONAL_COMMON];
		const specific = matchProfessionalCategory(professionalCategory);
		if (specific) sections.push(specific);
		return sections;
	}

	return [];
}
