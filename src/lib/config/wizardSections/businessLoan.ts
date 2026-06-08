import type { WizardSectionConfig, DsaGuidance } from '$lib/types/wizard';

// ── Shared wizard-level visibility helpers ──────────────────────────
const isCompanyApplicant = (answers: Record<string, unknown>): boolean =>
	answers['__onlyCompanyApplicant'] === true;
const isNotCompanyApplicant = (answers: Record<string, unknown>): boolean =>
	answers['__onlyCompanyApplicant'] !== true;
const isSingleApplicant = (answers: Record<string, unknown>): boolean =>
	(answers['__applicantCount'] as number) <= 1;

// ── Shared contextInfo blocks (reused across Fresh & DC) ────────────
const creditBehaviourContextInfo = {
	title: 'Credit Behaviour',
	dsaGuidance: {
		summary: 'Your CIBIL score significantly impacts the interest rate and loan amount offered.',
		keyPoints: [
			'750+ score gets best interest rates',
			'Low score may limit lender options',
			'Existing loans affect available credit'
		],
		watchFor: ['Business loan applicants need minimum 700+ CIBIL score for most lenders'],
		proTips: [
			'Check your CIBIL score before applying',
			'Clear small outstanding dues',
			'Avoid multiple loan inquiries'
		]
	} as DsaGuidance,
	getDynamicGuidance: (a: Record<string, unknown>) => {
		const g: Partial<DsaGuidance> = {};
		const score = Number(a['creditScore']);
		if (score >= 750) {
			g.summary = `Credit score ${score} — excellent. Eligible at all banks with best rate brackets.`;
			g.proTips = ['Strong score — use it as leverage to negotiate processing fee waiver'];
		} else if (score >= 700) {
			g.summary = `Credit score ${score} — good. Most banks will process, slightly above best rates.`;
			g.proTips = [
				'Score is good but not top-tier — clearing any small overdue could push it to 750+ bracket'
			];
		} else if (score >= 650) {
			g.summary = `Credit score ${score} — fair. Some banks may decline, NBFCs will process at higher rates.`;
			g.watchFor = [
				'Below 700 — limited to select lenders. Check for any quick score improvements'
			];
		} else if (score > 0) {
			g.summary = `Credit score ${score} — needs attention. Only select NBFCs will consider this application.`;
			g.watchFor = [
				'Score below 650 — very limited options. Consider credit repair or add a co-applicant with strong credit'
			];
		}
		if (a['ObligationsRunning'] === 'Yes') {
			g.keyPoints = [
				'Running obligations reported — these will reduce the eligible loan amount via FOIR calculation'
			];
		}
		return g;
	}
};

const existingLoansContextInfo = {
	title: 'Existing Loans',
	dsaGuidance: {
		summary:
			'Details of your current loans and credit limits help calculate available repayment capacity.',
		keyPoints: [
			'Running EMIs reduce eligible loan amount',
			'Credit utilization affects credit score',
			'Closing small loans can boost eligibility'
		],
		watchFor: ['High credit card utilization and bounced cheques are red flags for business loans'],
		proTips: [
			'Include all running EMIs',
			'Credit card limits count as obligations',
			'Consider closing high-interest loans first'
		]
	} as DsaGuidance,
	getDynamicGuidance: (a: Record<string, unknown>) => {
		const g: Partial<DsaGuidance> = {};
		const loanAmt = Number(a['loanAmount']);
		if (loanAmt > 0) {
			g.keyPoints = [
				`Target loan: \u20B9${(loanAmt / 100000).toFixed(1)}L — total obligations must stay within FOIR limit to qualify`
			];
		}
		const lt = a['loanType'] as string;
		if (lt === 'Debt Consolidation' || lt === 'Debt Consolidation with Extra Funds') {
			g.proTips = [
				'Debt consolidation — list ALL business loans to be consolidated. Missed loans will affect the consolidation plan.'
			];
		}
		return g;
	}
};

export const businessLoanSections: WizardSectionConfig = {
	loanProduct: 'Business Loan',
	sections: [
		{
			id: 'case-assessment',
			label: 'Case Assessment',
			subsections: [
				{
					id: 'assessment-status',
					label: 'Assessment Status',
					pageIds: ['caseIntake_businessLoan'],
					contextInfo: {
						title: 'Case Assessment',
						dsaGuidance: {
							summary:
								'Understand the current status of this case — fresh, rejected, or previously sanctioned.',
							keyPoints: [
								'Helps identify lenders to avoid',
								'Rejected lenders will be flagged in offer comparison',
								'Sanctioned offers can be compared against new ones'
							],
							watchFor: ['Loan seekers may not disclose prior rejections — probe gently'],
							proTips: [
								'Ask for rejection letters if available — helps understand reasons',
								"If sanctioned but not disbursed, ask why the offer wasn't accepted"
							]
						}
					}
				}
			]
		},
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Getting Started',
				dsaGuidance: {
					summary:
						'Tell us what funding you need, then we verify eligibility and business details to match with the right lenders.',
					keyPoints: [
						'Loan purpose helps match specialized products',
						'Determines available loan products',
						'Saves time by filtering early'
					],
					watchFor: [
						'Business vintage below 2 years is a hard rejection at most banks',
						'Use registered business address, not personal residence — verification will be at business location'
					],
					proTips: [
						'Business should be operational',
						'Minimum vintage requirements vary',
						'GST registration often required'
					]
				}
			},
			subsections: [
				{
					id: 'amount-terms',
					label: 'Amount & Terms',
					pageIds: ['loanRequirementPage'],
					contextInfo: {
						title: 'Loan Requirements',
						dsaGuidance: {
							summary:
								'Specify your business funding purpose, amount, and preferred tenure — this drives the entire assessment.',
							keyPoints: [
								'Purpose helps match specialized products',
								'Amount linked to turnover',
								'Tenure affects EMI burden'
							],
							watchFor: [
								'Loan amount is typically capped at 1-2x annual turnover — keep expectations realistic'
							],
							proTips: [
								'Loan usually up to 2x turnover',
								'Shorter tenure for lower interest',
								'Match tenure with cash cycles'
							]
						}
					}
				},
				{
					id: 'location',
					label: 'Location',
					pageIds: ['locationPage'],
					// Mirror page-level NOT_DC gate in businessLoan/pages.ts.
					// DC flows route Location to the end via locationPageDC.
					showWhen: (answers) =>
						!['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Business Location',
						dsaGuidance: {
							summary: 'Where your business operates affects loan availability and terms.',
							keyPoints: [
								'Lenders have geographic preferences',
								'Affects verification process',
								'Determines servicing branch'
							],
							watchFor: [
								'Use registered business address, not personal residence — verification will be at business location'
							],
							proTips: [
								'Use GST registered address',
								'Multiple locations? Use primary',
								'Urban areas have more options'
							]
						}
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			contextInfo: {
				title: 'Business & Owner Details',
				dsaGuidance: {
					summary: 'Information about your business and its key stakeholders.',
					keyPoints: [
						'Establishes business identity',
						'Required for credit assessment',
						'Determines guarantor requirements'
					],
					watchFor: [
						'All partners or directors may need to be co-applicants and personal guarantors',
						'Non-business-partner co-applicants may not be accepted for business loans'
					],
					proTips: [
						'All directors/partners may be required',
						'Keep business registration docs',
						'Have ITR copies ready'
					]
				}
			},
			subsections: [
				{
					id: 'whos-applying',
					label: "Who's Applying",
					pageIds: ['applicantPage'],
					applicantStep: 0,
					contextInfo: {
						title: "Who's Applying",
						dsaGuidance: {
							summary: 'Provide information about your business and yourself.',
							keyPoints: ['Business verification basis', 'Credit check requirements'],
							watchFor: [
								'All partners or directors may need to be co-applicants and personal guarantors'
							],
							proTips: ['Business PAN mandatory', 'Proprietor details for sole prop']
						}
					}
				},
				{
					id: 'relationships',
					label: 'Relationships',
					pageIds: ['applicantPage'],
					applicantStep: 1,
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__individualApplicantCount'] as number) > 1,
					contextInfo: {
						title: 'Applicant Relationships',
						dsaGuidance: {
							summary: 'Define relationships between co-applicants for loan processing.',
							keyPoints: [
								'Banks have rules on valid co-applicant relationships',
								'Affects loan agreement terms',
								'Required for loan structure'
							],
							watchFor: [
								'Non-business-partner co-applicants may not be accepted for business loans'
							],
							proTips: [
								'Spouse is the most preferred co-applicant',
								'Parents and children can be co-applicants',
								'Siblings may need additional documentation'
							]
						}
					}
				},
				{
					id: 'gpa-nri',
					label: 'GPA (Power of Attorney)',
					pageIds: ['applicantPage'],
					applicantStep: 2,
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__allIndividualsNRI'] as boolean) === true,
					contextInfo: {
						title: 'GPA — General Power of Attorney',
						dsaGuidance: {
							summary:
								'NRI applicants need a GPA (General Power of Attorney) holder who can represent them for the loan process in India.',
							keyPoints: [
								'Each NRI applicant must have a GPA holder assigned',
								'GPA holder must be an Indian resident with valid ID',
								'GPA details are mandatory for loan documentation and property registration'
							],
							watchFor: [
								'GPA must be notarized and apostilled — expired or unregistered GPA will block processing',
								'Some banks require specific GPA format — check target lender requirements'
							],
							proTips: [
								'Family member as GPA holder is preferred by most banks',
								'Get GPA notarized at Indian consulate/embassy before filing the application'
							]
						}
					}
				},
				// ── Single-applicant profile (Individual: education/religion/properties/residence;
				//     Company: properties + office proximity). Moved into Applicants
				//     section so the sidebar shows it between Who's Applying and the
				//     financial pages — matches the user's mental model. ─────────
				{
					id: 'applicant-profile-single',
					label: 'Applicant Profile',
					pageIds: ['applicantProfilePage'],
					showWhen: (answers: Record<string, unknown>) => isSingleApplicant(answers),
					contextInfo: {
						title: 'Applicant Profile',
						dsaGuidance: {
							summary:
								'Education, religion, owned properties, and residence/office proximity to the business location — these affect lender matching and verification.',
							keyPoints: [
								'Education level can affect eligibility at certain lenders',
								'Owned property history strengthens the applicant profile',
								'Office/residence proximity to business helps verification'
							],
							watchFor: [
								'NRI applicants must select country — many business loan lenders restrict NRI cases',
								'Office far from business location may need additional verification'
							],
							proTips: [
								'List all owned properties — strengthens the profile',
								'Use the address that matches your KYC',
								'Stable office address helps approval'
							]
						}
					}
				},
				{
					id: 'income-credit',
					label: 'Income & Credit',
					pageIds: ['applicantPage'],
					applicantStep: 3,
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__applicantCount'] as number) > 1,
					contextInfo: {
						title: 'Income & Credit Details',
						dsaGuidance: {
							summary:
								'Financial information helps determine loan amount and interest rate you qualify for.',
							keyPoints: [
								'Income determines EMI affordability',
								'Credit score affects interest rate',
								'Existing obligations reduce eligibility'
							],
							watchFor: [
								'Personal and business credit scores are both checked for proprietorship firms'
							],
							proTips: [
								'Include all sources of income',
								'Check your credit score beforehand',
								'Clear small outstanding dues'
							]
						}
					}
				}
			]
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => isSingleApplicant(answers),
			contextInfo: {
				title: 'Financial Profile',
				dsaGuidance: {
					summary:
						'Your income, employment, and credit details help determine the loan amount and rate you qualify for.',
					keyPoints: [
						'Income determines EMI affordability and loan amount',
						'Credit history affects interest rate offered',
						'Existing obligations reduce available eligibility'
					],
					watchFor: [
						'GST returns and bank statements for last 12 months are typically mandatory',
						'Business loan applicants need minimum 700+ CIBIL score for most lenders'
					],
					proTips: [
						'Include all active income sources for maximum eligibility',
						'Check your CIBIL score before applying',
						'Consider closing small high-interest loans first'
					]
				}
			},
			subsections: [
				// ── Individual-only: Income profile selection ────────────
				{
					id: 'employment-income',
					label: 'Employment & Income',
					pageIds: ['incomeProfilesPage'],
					showWhen: (answers: Record<string, unknown>) =>
						isSingleApplicant(answers) && isNotCompanyApplicant(answers),
					contextInfo: {
						title: 'Employment & Income Sources',
						dsaGuidance: {
							summary: 'Select all your sources of income so we can assess repayment capacity.',
							keyPoints: [
								'Multiple income sources increase eligibility',
								'Each source needs specific documentation',
								'Helps match with the right loan products'
							],
							watchFor: [
								'GST returns and bank statements for last 12 months are typically mandatory'
							],
							proTips: [
								'Include business income',
								'Rental income counts too',
								'Business income needs ITR proof'
							]
						}
					}
				},
				// ── Individual-only: Income details entry ────────────────
				{
					id: 'income-details',
					label: 'Income Details',
					pageIds: ['incomeDetailsPage'],
					showWhen: (answers: Record<string, unknown>) =>
						isSingleApplicant(answers) && isNotCompanyApplicant(answers),
					contextInfo: {
						title: 'Income Details',
						dsaGuidance: {
							summary: 'Provide detailed information for each income source you selected.',
							keyPoints: [
								'Accurate figures ensure realistic offers',
								'Banks verify income against documents',
								'Higher documented income means better terms'
							],
							watchFor: [
								'ITR filing for last 2-3 years is mandatory — unfiled returns block processing'
							],
							proTips: [
								'Have ITR copies ready',
								'Know your net monthly income',
								'Business turnover documents needed'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const profiles = a['selectedIncomeProfiles'] as string[];
							if (profiles) {
								if (
									profiles.includes('business_proprietorship') ||
									profiles.includes('business_partnership') ||
									profiles.includes('director_company')
								) {
									g.keyPoints = [
										'Business income: enter net profit from P&L statement (after expenses, before tax)'
									];
									g.watchFor = [
										'Profit margin below 8% may trigger additional scrutiny from banks'
									];
								}
								if (profiles.includes('salaried_regular')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Salaried: enter gross monthly salary (CTC/12 or take-home + deductions)'
									];
								}
								if (profiles.includes('rental_income')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Rental income: banks typically apply 30% haircut (only 70% counted)'
									];
								}
							}
							return g;
						}
					}
				},
				// ── Both Individual & Company: Credit Behaviour ──────────
				// Note: a "Company Financials" subsection used to live here pointing at
				// `companyFinancialsPage`. Removed 2026-06-02 (S212) as part of the D13
				// wizard-sidebar-vs-page-gate audit. The page was intentionally dropped
				// from `businessLoan/pages.ts` getAllPages() earlier (Pattern D from S207
				// — see the comment block there): Company applicants now capture business
				// profile + financials inside the applicant modal (Identity/Character/
				// Income tabs), not as a separate wizard page. The sidebar chip therefore
				// pointed at a non-existent page — dead UI. The data still gets captured
				// via the modal so nothing is lost.
				//
				// Sunset (per CLAUDE.md §16 Rule #15): this comment can be deleted once
				// `buildCompanyFinancialsPage` is removed from the build-functions surface
				// of `businessLoan/pages.ts` (it's currently kept "for reference") — at
				// that point the original intent is unambiguous from the code alone.
				{
					id: 'credit-behaviour',
					label: 'Credit Behaviour',
					pageIds: ['creditScorePage'],
					showWhen: (answers: Record<string, unknown>) => isSingleApplicant(answers),
					contextInfo: creditBehaviourContextInfo
				},
				// ── Both Individual & Company: Existing Loans ────────────
				{
					id: 'existing-loans',
					label: 'Existing Loans',
					pageIds: ['obligationsPage'],
					showWhen: (answers: Record<string, unknown>) => {
						return isSingleApplicant(answers);
					},
					contextInfo: existingLoansContextInfo
				}
			]
		}
	]
};

/**
 * DC (Debt Consolidation) wizard section variant.
 * Page order: CaseIntake → LoanReq → Applicant → BizProfile → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const businessLoanDCSections: WizardSectionConfig = {
	loanProduct: 'Business Loan',
	sections: [
		// Case intake — same as regular business loan (assessment status, prior rejections, etc.)
		businessLoanSections.sections[0],
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary:
						'Specify your business debt consolidation needs — which loans to close and the total amount required.',
					keyPoints: [
						'List all business loans you want to consolidate',
						'Total amount drives the consolidation plan',
						'Tenure should fit your business cash flow'
					],
					watchFor: [
						'Loan amount is typically capped at 1-2x annual turnover — keep expectations realistic'
					],
					proTips: [
						'Include all high-interest business loans',
						'Factor in prepayment charges on existing loans',
						'Match tenure with business cash cycles'
					]
				}
			},
			subsections: [
				{
					id: 'amount-terms',
					label: 'Amount & Terms',
					pageIds: ['loanRequirementPage'],
					contextInfo: {
						title: 'Consolidation Requirements',
						dsaGuidance: {
							summary:
								'Specify your business funding purpose, amount, and preferred tenure for debt consolidation.',
							keyPoints: [
								'Amount should cover all loans to be consolidated',
								'Factor in prepayment charges of existing loans',
								'Tenure affects EMI burden on business'
							],
							watchFor: [
								'Loan amount is typically capped at 1-2x annual turnover — keep expectations realistic'
							],
							proTips: [
								'Calculate total outstanding + prepayment charges',
								'Shorter tenure for lower total interest',
								'Match tenure with business cash cycles'
							]
						}
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			// Index 2 = 'applicants' in fresh config (0=case-assessment, 1=getting-started, 2=applicants)
			contextInfo: businessLoanSections.sections[2].contextInfo,
			subsections: businessLoanSections.sections[2].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => isSingleApplicant(answers),
			// Index 3 = 'financials' in fresh config
			contextInfo: businessLoanSections.sections[3].contextInfo,
			subsections: businessLoanSections.sections[3].subsections
		},
		{
			id: 'location-details',
			label: 'Location',
			contextInfo: {
				title: 'Business Location',
				dsaGuidance: {
					summary: 'Where your business operates affects loan availability and terms.',
					keyPoints: [
						'Lenders have geographic preferences',
						'Affects verification process',
						'Determines servicing branch'
					],
					watchFor: [
						'Use registered business address, not personal residence — verification will be at business location'
					],
					proTips: [
						'Use GST registered address',
						'Multiple locations? Use primary',
						'Urban areas have more options'
					]
				}
			},
			subsections: [
				{
					id: 'location-dc',
					label: 'Residence Details',
					pageIds: ['locationPageDC'],
					// Mirror page-level IS_DC gate. Only shown for Debt Consolidation flows.
					showWhen: (answers) =>
						['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Business Location',
						dsaGuidance: {
							summary: 'Where your business operates affects loan availability and terms.',
							keyPoints: [
								'Lenders have geographic preferences',
								'Affects verification process',
								'Determines servicing branch'
							],
							watchFor: [
								'Use registered business address, not personal residence — verification will be at business location'
							],
							proTips: [
								'Use GST registered address',
								'Multiple locations? Use primary',
								'Urban areas have more options'
							]
						}
					}
				}
			]
		}
	]
};
