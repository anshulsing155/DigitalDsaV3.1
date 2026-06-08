import type { LenderResultsData } from '$lib/types/lenderResults';

// ============================================================================
// MOCK LENDER RESULTS — Home Loan, ₹50L requested, 20yr tenure
// ============================================================================

export const mockLenderResults: LenderResultsData = {
	summary: {
		total_lenders: 6,
		green_count: 3,
		amber_count: 2,
		red_count: 1,
		best_amount: { value: 5200000, lender: 'SBI' },
		best_roi: { value: 8.25, lender: 'HDFC' },
		best_emi: { value: 40845, lender: 'HDFC' },
		requested_amount: 5000000,
		loan_type: 'Home Loan'
	},
	results: [
		// ── #1 SBI — Best Amount ────────────────────────────────────
		{
			lender_application_id: 'la-sbi-001',
			lender_id: 'sbi',
			lender_name: 'SBI',
			traffic_light: 'green',
			traffic_light_message:
				'Strong eligibility. Income and credit profile meet all criteria comfortably.',
			eligible_amount: 5200000,
			ltv_capped_amount: 4500000,
			offered_amount: 5000000,
			roi: 8.5,
			emi: 43391,
			tenure_months: 240,
			processing_fee_percent: 0.35,
			rating: 'excellent',
			metric_ratings: { amount: 'excellent', roi: 'good', emi: 'good', tenure: 'good' },
			factors: [
				{
					id: 'f-sbi-1',
					label: 'High combined net income',
					impact: 'positive',
					description:
						"Combined net income of ₹1.85L/mo comfortably supports the requested EMI. FOIR stays well within SBI's threshold.",
					metric: { label: 'Net Income', value: '₹1,85,000/mo', benchmark: 'min ₹80,000' },
					category: 'income'
				},
				{
					id: 'f-sbi-2',
					label: 'Excellent CIBIL score',
					impact: 'positive',
					description:
						"Primary applicant's CIBIL score of 762 qualifies for SBI's preferred rate tier.",
					metric: { label: 'CIBIL', value: '762', benchmark: 'min 700' },
					category: 'credit'
				},
				{
					id: 'f-sbi-3',
					label: 'Low existing obligations',
					impact: 'positive',
					description:
						'Only ₹12,000/mo in existing EMIs. This keeps FOIR at 30%, well below the 55% cap.',
					metric: { label: 'Existing EMIs', value: '₹12,000/mo' },
					category: 'obligation'
				},
				{
					id: 'f-sbi-4',
					label: 'LTV cap limits disbursable amount',
					impact: 'negative',
					description:
						'Property value of ₹60L with 75% LTV caps disbursement at ₹45L, even though income supports ₹52L.',
					metric: { label: 'LTV', value: '75%', benchmark: 'max 75%' },
					category: 'property'
				},
				{
					id: 'f-sbi-5',
					label: 'Salaried with 5+ years stability',
					impact: 'positive',
					description:
						'Primary applicant is salaried with 5.5 years in current organization. SBI values employment stability.',
					metric: { label: 'Employment', value: '5.5 yrs' },
					category: 'profile'
				}
			],
			suggestions: [
				{
					id: 's-sbi-1',
					title: "Add co-applicant's rental income",
					description:
						'If the co-applicant has provable rental income (rent agreement + bank deposits), it can increase the eligible amount further.',
					potential_impact: {
						metric: 'amount',
						direction: 'increase',
						estimated_value: 'up to ₹3L more'
					},
					effort: 'moderate'
				},
				{
					id: 's-sbi-2',
					title: 'Close the car loan before filing',
					description:
						'The ₹8,000/mo car loan EMI reduces available FOIR. Closing it frees up capacity for a higher home loan amount.',
					potential_impact: {
						metric: 'amount',
						direction: 'increase',
						estimated_value: '~₹4L more'
					},
					effort: 'significant'
				},
				{
					id: 's-sbi-3',
					title: 'Request property revaluation',
					description:
						"If the property can be valued higher by SBI's empanelled valuator, LTV cap would increase proportionally.",
					potential_impact: {
						metric: 'amount',
						direction: 'increase',
						estimated_value: 'depends on valuation'
					},
					effort: 'easy'
				}
			],
			corporate_dsas: [
				{
					name: 'Andromeda Sales',
					payout_percent: 1.1,
					comparison: 'best',
					benefits: ['Dedicated SBI desk', 'Priority processing']
				},
				{
					name: 'PiramalConnect',
					payout_percent: 0.95,
					comparison: 'better',
					benefits: ['Pan-India coverage']
				},
				{ name: 'IIFL Home Loans DSA', payout_percent: 0.85, comparison: 'same' }
			],
			rm_contact: {
				rm_name: 'Rajesh Sharma',
				phone: '9876543210',
				whatsapp: '9876543210',
				designation: 'Senior RM'
			},
			key_metrics: { foir: 30, ltv: 75, net_income: 185000, cibil: 762, approval_probability: 92 },
			computed_at: '2026-02-13T10:30:00Z'
		},

		// ── #2 HDFC — Best ROI ─────────────────────────────────────
		{
			lender_application_id: 'la-hdfc-001',
			lender_id: 'hdfc-bank',
			lender_name: 'HDFC',
			traffic_light: 'green',
			traffic_light_message:
				'Good eligibility. Qualifies for preferred rate based on credit score.',
			eligible_amount: 4850000,
			offered_amount: 4850000,
			roi: 8.25,
			emi: 40845,
			tenure_months: 240,
			processing_fee_percent: 0.5,
			rating: 'good',
			metric_ratings: { amount: 'good', roi: 'excellent', emi: 'excellent', tenure: 'good' },
			factors: [
				{
					id: 'f-hdfc-1',
					label: 'Preferred rate tier unlocked',
					impact: 'positive',
					description:
						'CIBIL 762 qualifies for HDFC\'s "Star" rate tier at 8.25%. This is 25bps below their standard rate.',
					metric: { label: 'Rate Tier', value: 'Star (8.25%)', benchmark: 'Standard 8.50%' },
					category: 'credit'
				},
				{
					id: 'f-hdfc-2',
					label: 'Stable salaried income',
					impact: 'positive',
					description:
						'Regular salaried income with consistent bank credits. HDFC prefers this over variable business income.',
					category: 'income'
				},
				{
					id: 'f-hdfc-3',
					label: 'Stricter FOIR calculation',
					impact: 'negative',
					description:
						"HDFC applies a 50% FOIR cap (vs SBI's 55%). This slightly reduces the maximum eligible amount.",
					metric: { label: 'FOIR Cap', value: '50%', benchmark: 'SBI allows 55%' },
					category: 'policy'
				},
				{
					id: 'f-hdfc-4',
					label: 'No credit card overutilization',
					impact: 'positive',
					description: 'Credit card utilization is at 22%, well below the 40% warning threshold.',
					metric: { label: 'CC Utilization', value: '22%', benchmark: 'max 40%' },
					category: 'credit'
				}
			],
			suggestions: [
				{
					id: 's-hdfc-1',
					title: 'Negotiate processing fee waiver',
					description:
						'HDFC often waives processing fee for profiles with CIBIL 750+. Ask the RM to apply the waiver.',
					potential_impact: {
						metric: 'roi',
						direction: 'decrease',
						estimated_value: 'save ~₹24,000'
					},
					effort: 'easy'
				},
				{
					id: 's-hdfc-2',
					title: 'Submit 24-month bank statement',
					description:
						'HDFC considers higher income if 24-month statements show consistent growth. Could improve eligible amount.',
					potential_impact: {
						metric: 'amount',
						direction: 'increase',
						estimated_value: '~₹2L more'
					},
					effort: 'easy'
				}
			],
			corporate_dsas: [
				{
					name: 'Andromeda Sales',
					payout_percent: 1.0,
					comparison: 'best',
					benefits: ['Fast-track login']
				},
				{ name: 'Connectors', payout_percent: 0.9, comparison: 'better' },
				{ name: 'ART Housing', payout_percent: 0.75, comparison: 'same' }
			],
			rm_contact: {
				rm_name: 'Priya Mehta',
				phone: '9876543211',
				whatsapp: '9876543211',
				designation: 'RM'
			},
			key_metrics: { foir: 34, ltv: 80, net_income: 185000, cibil: 762, approval_probability: 88 },
			computed_at: '2026-02-13T10:30:00Z'
		},

		// ── #3 Axis Bank — Solid green ─────────────────────────────
		{
			lender_application_id: 'la-axis-001',
			lender_id: 'axis-bank',
			lender_name: 'Axis Bank',
			traffic_light: 'green',
			traffic_light_message: 'Eligible with standard terms. No red flags in the profile.',
			eligible_amount: 4700000,
			offered_amount: 4700000,
			roi: 8.75,
			emi: 41654,
			tenure_months: 240,
			processing_fee_percent: 0.5,
			rating: 'good',
			metric_ratings: { amount: 'good', roi: 'average', emi: 'average', tenure: 'good' },
			factors: [
				{
					id: 'f-axis-1',
					label: 'Standard rate applies',
					impact: 'neutral',
					description:
						"CIBIL 762 meets Axis's requirement but their preferred tier starts at 780. Standard rate of 8.75% applies.",
					metric: { label: 'Rate Tier', value: 'Standard', benchmark: 'Preferred needs 780+' },
					category: 'credit'
				},
				{
					id: 'f-axis-2',
					label: 'Good income-to-loan ratio',
					impact: 'positive',
					description:
						'Loan amount is well within 4x annual income guideline that Axis uses for internal scoring.',
					category: 'income'
				},
				{
					id: 'f-axis-3',
					label: 'Property in approved project',
					impact: 'positive',
					description:
						'The property falls in an Axis-approved builder project, which speeds up technical approval.',
					category: 'property'
				},
				{
					id: 'f-axis-4',
					label: 'Moderate processing fee',
					impact: 'neutral',
					description: 'Standard 0.5% processing fee. No waiver applicable at this credit tier.',
					category: 'policy'
				}
			],
			suggestions: [
				{
					id: 's-axis-1',
					title: 'Improve CIBIL to 780+ for preferred rate',
					description:
						"Just 18 points away from Axis's preferred tier. Reducing credit card utilization or paying off a small loan could help.",
					potential_impact: {
						metric: 'roi',
						direction: 'decrease',
						estimated_value: '0.25% lower ROI'
					},
					effort: 'moderate'
				},
				{
					id: 's-axis-2',
					title: 'Bundle insurance for rate discount',
					description:
						'Axis offers 10bps rate reduction when home loan protection plan is bundled.',
					potential_impact: {
						metric: 'roi',
						direction: 'decrease',
						estimated_value: '0.10% lower'
					},
					effort: 'easy'
				}
			],
			corporate_dsas: [
				{
					name: 'Connectors',
					payout_percent: 1.05,
					comparison: 'best',
					benefits: ['Axis specialist desk']
				},
				{ name: 'PiramalConnect', payout_percent: 0.9, comparison: 'better' }
			],
			key_metrics: { foir: 34, ltv: 78, net_income: 185000, cibil: 762, approval_probability: 85 },
			computed_at: '2026-02-13T10:30:00Z'
		},

		// ── #4 ICICI Bank — Amber ──────────────────────────────────
		{
			lender_application_id: 'la-icici-001',
			lender_id: 'icici-bank',
			lender_name: 'ICICI Bank',
			traffic_light: 'amber',
			traffic_light_message:
				'Marginal eligibility. FOIR is near the upper limit due to existing obligations.',
			eligible_amount: 3800000,
			offered_amount: 3800000,
			roi: 9.25,
			emi: 34742,
			tenure_months: 240,
			processing_fee_percent: 0.5,
			rating: 'average',
			metric_ratings: { amount: 'average', roi: 'poor', emi: 'good', tenure: 'good' },
			factors: [
				{
					id: 'f-icici-1',
					label: 'FOIR near upper limit',
					impact: 'negative',
					description:
						'ICICI calculates FOIR at 48%, close to their 50% cap. This limits the eligible loan amount significantly.',
					metric: { label: 'FOIR', value: '48%', benchmark: 'max 50%' },
					category: 'obligation'
				},
				{
					id: 'f-icici-2',
					label: 'Higher base rate than peers',
					impact: 'negative',
					description:
						"ICICI's current EBLR-linked rate starts at 9.10% for this score range, higher than SBI and HDFC.",
					metric: { label: 'Base Rate', value: '9.10%' },
					category: 'policy'
				},
				{
					id: 'f-icici-3',
					label: 'Co-applicant income partially considered',
					impact: 'neutral',
					description:
						"ICICI considers only 75% of co-applicant's income (vs 100% at SBI). This reduces combined eligible income.",
					metric: { label: 'Co-applicant weight', value: '75%', benchmark: 'SBI: 100%' },
					category: 'policy'
				},
				{
					id: 'f-icici-4',
					label: 'Clean repayment history',
					impact: 'positive',
					description:
						'No missed payments or DPDs in the last 36 months. This avoids any penalty loading on the rate.',
					category: 'credit'
				}
			],
			suggestions: [
				{
					id: 's-icici-1',
					title: 'Close credit card dues before filing',
					description:
						"Revolving credit card balance of ₹45,000 adds 5% to FOIR in ICICI's calculation. Clear it to bring FOIR down.",
					potential_impact: {
						metric: 'amount',
						direction: 'increase',
						estimated_value: '~₹5L more'
					},
					effort: 'easy'
				},
				{
					id: 's-icici-2',
					title: 'Consider ICICI only if other lenders reject',
					description:
						'Given the higher ROI and lower amount, ICICI is a backup option. SBI or HDFC offer better terms.',
					effort: 'easy'
				}
			],
			corporate_dsas: [
				{ name: 'Andromeda Sales', payout_percent: 0.85, comparison: 'best' },
				{ name: 'IIFL Home Loans DSA', payout_percent: 0.75, comparison: 'same' }
			],
			rm_contact: { rm_name: 'Amit Patel', phone: '9876543212', designation: 'Credit Manager' },
			key_metrics: { foir: 48, ltv: 63, net_income: 185000, cibil: 762, approval_probability: 68 },
			computed_at: '2026-02-13T10:30:00Z'
		},

		// ── #5 Kotak Mahindra — Amber ──────────────────────────────
		{
			lender_application_id: 'la-kotak-001',
			lender_id: 'kotak-mahindra',
			lender_name: 'Kotak Mahindra',
			traffic_light: 'amber',
			traffic_light_message:
				'Marginal. Conservative income assessment reduces the eligible amount.',
			eligible_amount: 3550000,
			offered_amount: 3550000,
			roi: 9.5,
			emi: 33108,
			tenure_months: 240,
			processing_fee_percent: 0.5,
			rating: 'average',
			metric_ratings: { amount: 'average', roi: 'poor', emi: 'good', tenure: 'good' },
			factors: [
				{
					id: 'f-kotak-1',
					label: 'Conservative income multiplier',
					impact: 'negative',
					description:
						"Kotak uses a 4.5x annual income cap for home loans, which is more conservative than SBI's 5.5x.",
					metric: { label: 'Income Multiple', value: '4.5x', benchmark: 'SBI: 5.5x' },
					category: 'policy'
				},
				{
					id: 'f-kotak-2',
					label: 'Highest ROI among eligible lenders',
					impact: 'negative',
					description:
						"At 9.50%, Kotak's rate is the highest among lenders that approved the application.",
					metric: { label: 'ROI', value: '9.50%', benchmark: 'Best: 8.25%' },
					category: 'policy'
				},
				{
					id: 'f-kotak-3',
					label: 'Strong credit score noted',
					impact: 'positive',
					description:
						'Kotak acknowledged the 762 CIBIL score. Without it, the rate would have been 10%+.',
					category: 'credit'
				}
			],
			suggestions: [
				{
					id: 's-kotak-1',
					title: 'Consider Kotak for balance transfer later',
					description:
						'Kotak offers competitive BT rates for existing loans after 12 months. Can revisit if primary lender rate rises.',
					effort: 'easy'
				}
			],
			corporate_dsas: [
				{
					name: 'PiramalConnect',
					payout_percent: 1.15,
					comparison: 'best',
					benefits: ['Kotak specialist', 'Higher payout']
				},
				{ name: 'Connectors', payout_percent: 0.9, comparison: 'better' }
			],
			key_metrics: { foir: 36, ltv: 59, net_income: 185000, cibil: 762, approval_probability: 72 },
			computed_at: '2026-02-13T10:30:00Z'
		},

		// ── #6 PNB Housing — Red (Not Eligible) ────────────────────
		{
			lender_application_id: 'la-pnb-001',
			lender_id: 'pnb-housing',
			lender_name: 'PNB Housing',
			traffic_light: 'red',
			traffic_light_message:
				"Not eligible. Property location falls outside PNB Housing's approved zones for this loan amount.",
			eligible_amount: 0,
			offered_amount: 0,
			roi: 0,
			emi: 0,
			tenure_months: 0,
			rating: 'poor',
			metric_ratings: { amount: 'poor', roi: 'poor', emi: 'poor', tenure: 'poor' },
			factors: [
				{
					id: 'f-pnb-1',
					label: 'Property location not in approved zone',
					impact: 'negative',
					description:
						'PNB Housing has restricted lending in this micro-market due to builder litigation. No amount can be sanctioned here.',
					category: 'property'
				},
				{
					id: 'f-pnb-2',
					label: 'Builder not on approved list',
					impact: 'negative',
					description:
						"The builder is not on PNB Housing's empanelled list. Technical approval would be denied.",
					category: 'property'
				},
				{
					id: 'f-pnb-3',
					label: 'Income and credit are adequate',
					impact: 'neutral',
					description:
						'The rejection is purely property-related. Income and credit profile would have qualified at other PNB-approved locations.',
					category: 'income'
				}
			],
			suggestions: [
				{
					id: 's-pnb-1',
					title: 'No action needed — property-specific rejection',
					description:
						"This rejection has nothing to do with the applicant's financial profile. Other lenders have no issue with this property.",
					effort: 'easy'
				}
			],
			corporate_dsas: [],
			key_metrics: { foir: 30, net_income: 185000, cibil: 762, approval_probability: 0 },
			computed_at: '2026-02-13T10:30:00Z'
		}
	],

	// ── Cross-Sell Opportunity ──────────────────────────────────
	cross_sell: [
		{
			parent_lender: 'SBI',
			shortfall: 700000,
			loan_type: 'Personal Loan',
			explanation:
				"SBI can sanction ₹52L based on income, but the property's LTV cap limits disbursement to ₹45L. The ₹7L gap can be covered with a Personal Loan to fund the down payment.",
			options: [
				{ lender: 'HDFC', amount: 700000, roi: 11.5, emi: 15876 },
				{ lender: 'ICICI', amount: 700000, roi: 12.0, emi: 16113 },
				{ lender: 'Bajaj Finance', amount: 700000, roi: 11.0, emi: 15642 }
			]
		}
	],

	computed_at: '2026-02-13T10:30:00Z'
};
