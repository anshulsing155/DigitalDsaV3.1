/**
 * Made-up but realistic payload fixtures for the 6 loan types DigitalDSA
 * supports. Used by pdfGeneratorContent.test.ts to verify the PDF generator
 * produces correct output across the full surface.
 *
 * Each fixture mirrors the typical sections a real loan application produces,
 * derived from the question banks and case schema — but the actual data is
 * synthetic. No real customer information.
 */

export type LoanFixture = {
	name: string;
	loanType: string;
	payload: Record<string, unknown>;
};

// ── HOME LOAN ───────────────────────────────────────────────────────────────

export const homeLoanFixture: LoanFixture = {
	name: 'Home Loan',
	loanType: 'home_loan',
	payload: {
		case_id: 'HL-2026-00042',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		created_at: '2026-01-15T10:00:00Z',
		form_version: 3,
		applicant_details: {
			full_name: 'Suresh Mehta',
			pan_number: 'ABCDE1234F',
			aadhaar_number: '1234 5678 9012',
			mobile: '9876543210',
			email: 'suresh.mehta@example.com',
			dob: '1985-03-22',
			address: '12 Lake Rd, Powai, Mumbai 400076',
			employer: 'Infosys Ltd',
			designation: 'Tech Lead',
			employment_type: 'Salaried'
		},
		income_details: {
			net_salary_monthly: 185000,
			rental_income_monthly: 22000,
			total_assessed_monthly: 207000
		},
		property_details: {
			type: 'Under Construction Flat',
			builder: 'Lodha Developers',
			project: 'Lodha Park Phase 2',
			city: 'Mumbai',
			agreement_value: 7500000,
			bua_sqft: 1100,
			construction_status: 'Slab cast',
			possession_date: '2027-06-30'
		},
		obligation_details: [
			{ type: 'Car Loan', emi: 15000, outstanding_principal: 320000 },
			{ type: 'Credit Card', emi: 4500, outstanding_principal: 65000 }
		],
		eligibility_summary: {
			foir: 0.34,
			ltv: 0.67,
			eligible: true,
			max_eligible_amount: 5500000
		}
	}
};

// ── LAP (Loan Against Property) ─────────────────────────────────────────────

export const lapFixture: LoanFixture = {
	name: 'LAP',
	loanType: 'lap',
	payload: {
		case_id: 'LAP-2026-00017',
		loan: { type: 'LAP', amount_required: 3500000 },
		applicant_details: {
			full_name: 'Anita Krishnamurthy',
			pan_number: 'XYZAB5678G',
			mobile: '9123456789',
			employment_type: 'Self Employed Professional',
			profession: 'Chartered Accountant',
			years_in_practice: 12
		},
		income_details: {
			itr_filed_y1: 1850000,
			itr_filed_y2: 2120000,
			itr_filed_y3: 2380000,
			net_assessed_monthly: 165000
		},
		property_details: {
			type: 'Self-Occupied Residential Flat',
			city: 'Bengaluru',
			locality: 'Indiranagar',
			market_value: 11000000,
			ownership: 'Self',
			property_age_years: 8,
			ltv_offered: 0.32
		},
		mortgage_purpose: {
			end_use: 'Business Expansion',
			amount_used_for: 'Office equipment + working capital'
		},
		obligation_details: [
			{ type: 'Business Loan', emi: 38000, outstanding_principal: 850000 }
		],
		eligibility_summary: {
			foir: 0.38,
			ltv: 0.32,
			eligible: true
		}
	}
};

// ── PLOT LOAN ───────────────────────────────────────────────────────────────

export const plotLoanFixture: LoanFixture = {
	name: 'Plot Loan',
	loanType: 'plot_loan',
	payload: {
		case_id: 'PLT-2026-00009',
		loan: { type: 'Plot Loan', amount_required: 1800000 },
		applicant_details: {
			full_name: 'Rohit Sharma',
			pan_number: 'PQRST9999H',
			mobile: '9988776655',
			employment_type: 'Salaried',
			employer: 'Wipro Technologies',
			designation: 'Senior Architect'
		},
		income_details: {
			net_salary_monthly: 145000,
			variable_pay_avg: 35000
		},
		property_details: {
			type: 'Residential Plot',
			authority_approved: true,
			authority: 'GMADA',
			plot_area_sqyd: 250,
			location: 'Mohali Sector 117',
			rate_per_sqyd: 12000,
			market_value: 3000000
		},
		obligation_details: [],
		eligibility_summary: {
			foir: 0.28,
			ltv: 0.6,
			eligible: true
		}
	}
};

// ── PERSONAL LOAN ───────────────────────────────────────────────────────────

export const personalLoanFixture: LoanFixture = {
	name: 'Personal Loan',
	loanType: 'personal_loan',
	payload: {
		case_id: 'PL-2026-00231',
		loan: { type: 'Personal Loan', amount_required: 600000 },
		applicant_details: {
			full_name: 'Karthik Iyer',
			pan_number: 'CDEFG2222J',
			mobile: '9001122334',
			email: 'karthik.iyer@example.com',
			employment_type: 'Salaried',
			employer: 'HCL Technologies',
			designation: 'Project Manager',
			years_in_current_job: 4
		},
		income_details: {
			net_salary_monthly: 95000,
			bonus_annual: 180000
		},
		residence_details: {
			type: 'Owned',
			city: 'Pune',
			locality: 'Kothrud',
			years_at_address: 6
		},
		obligation_details: [
			{ type: 'Home Loan', emi: 22000, outstanding_principal: 1850000 },
			{ type: 'Credit Card', emi: 3000, outstanding_principal: 42000 }
		],
		loan_purpose: {
			end_use: "Daughter's wedding",
			tenure_months: 36
		},
		eligibility_summary: {
			foir: 0.41,
			cibil_score: 762,
			eligible: true
		}
	}
};

// ── BUSINESS LOAN ───────────────────────────────────────────────────────────

export const businessLoanFixture: LoanFixture = {
	name: 'Business Loan',
	loanType: 'business_loan',
	payload: {
		case_id: 'BL-2026-00088',
		loan: { type: 'Business Loan', amount_required: 2500000 },
		applicant_details: {
			full_name: 'Priya Industries Pvt Ltd',
			pan_number: 'BLABC1111K',
			gst_number: '27ABCDE1234F1Z5',
			cin: 'U72200MH2018PTC123456',
			mobile: '9876501234',
			entity_type: 'Private Limited',
			years_in_business: 7
		},
		directors: [
			{
				name: 'Priya Khanna',
				dob: '1980-08-14',
				ownership_pct: 60,
				designation: 'Director'
			},
			{
				name: 'Rahul Khanna',
				dob: '1978-04-02',
				ownership_pct: 40,
				designation: 'Director'
			}
		],
		business_profile: {
			industry: 'Trading - Auto Parts',
			turnover_y1: 18500000,
			turnover_y2: 21300000,
			turnover_y3: 24900000,
			gst_filed_months: 36,
			employees: 14
		},
		obligation_details: [
			{ type: 'Working Capital CC', limit_sanctioned: 1500000, utilization_pct: 65 }
		],
		end_use: {
			purpose: 'Inventory expansion',
			amount: 2500000
		},
		eligibility_summary: {
			foir: 0.45,
			cibil_score: 798,
			eligible: true
		}
	}
};

// ── PROFESSIONAL LOAN ───────────────────────────────────────────────────────

export const professionalLoanFixture: LoanFixture = {
	name: 'Professional Loan',
	loanType: 'professional_loan',
	payload: {
		case_id: 'PRO-2026-00045',
		loan: { type: 'Professional Loan', amount_required: 1200000 },
		applicant_details: {
			full_name: 'Dr. Sneha Bhatia',
			pan_number: 'DRSNB1234M',
			mobile: '9786543210',
			profession: 'Doctor',
			specialization: 'Dermatologist',
			years_in_practice: 9,
			qualification: 'MBBS, MD',
			council_registration: 'MCI/12345',
			clinic_address: 'Skin Care Clinic, Sector 19, Noida'
		},
		income_details: {
			itr_filed_y1: 1450000,
			itr_filed_y2: 1680000,
			itr_filed_y3: 1920000,
			net_assessed_monthly: 132000
		},
		obligation_details: [],
		end_use: {
			purpose: 'Clinic equipment upgrade',
			items: ['Laser machine', 'Dermatoscope', 'Treatment chairs'],
			vendor: 'MedEquip Solutions Pvt Ltd'
		},
		eligibility_summary: {
			foir: 0.31,
			cibil_score: 815,
			eligible: true
		}
	}
};

// ── ALL FIXTURES — convenient re-export ─────────────────────────────────────

export const allLoanFixtures: LoanFixture[] = [
	homeLoanFixture,
	lapFixture,
	plotLoanFixture,
	personalLoanFixture,
	businessLoanFixture,
	professionalLoanFixture
];
