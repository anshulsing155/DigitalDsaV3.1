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
		watchFor: ['Professional loans offer preferential rates only above 750 CIBIL score'],
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
		watchFor: ['Undisclosed education loans from professional degree can surface during checks'],
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
				'Debt consolidation — list ALL loans to be consolidated. Missed loans will affect the consolidation plan.'
			];
		}
		return g;
	}
};

export const professionalLoanSections: WizardSectionConfig = {
	loanProduct: 'Professional Loan',
	sections: [
		{
			id: 'case-assessment',
			label: 'Case Assessment',
			subsections: [
				{
					id: 'assessment-status',
					label: 'Assessment Status',
					pageIds: ['caseIntake_professionalLoan'],
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
						'Specify loan needs and practice location — these drive lender matching and product selection.',
					keyPoints: [
						'Profession determines available products and limits',
						'Only licensed/registered professionals qualify',
						'Practice vintage and registration are key eligibility filters'
					],
					watchFor: [
						'Only recognized professions qualify — Doctors, CAs, Lawyers, Architects',
						'Practice address will be verified against professional registration — ensure they match'
					],
					proTips: [
						'Doctors and CAs typically get the best rates',
						'Professional registration must be active',
						'Practice vintage of 2+ years is preferred'
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
								'Specify your loan purpose, desired amount, and repayment tenure — options are tailored to your profession.',
							keyPoints: [
								'Purpose options adapt to profession selected',
								'Amount linked to professional income proof',
								'Tenure affects monthly cash flow'
							],
							watchFor: [
								'Professional loans have higher limits than personal (up to 50L) — leverage this'
							],
							proTips: [
								'Professionals get up to 50 lakhs',
								'Tenure up to 5-7 years',
								'Flexible repayment options available'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const prof = a['professionalCategory'] as string;
							if (prof === 'doctor') {
								g.proTips = [
									'Doctors: clinic setup and medical equipment loans often get preferential terms from select banks'
								];
							} else if (prof === 'ca') {
								g.proTips = [
									'CAs: office setup and audit software loans are common — some banks have dedicated CA loan products'
								];
							} else if (prof === 'lawyer') {
								g.proTips = [
									'Lawyers: chamber setup and legal library expenses qualify — tenure of practice matters for limits'
								];
							} else if (prof === 'architect') {
								g.proTips = [
									'Architects: design studio and software loans are eligible — CoA registration is mandatory'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'location',
					label: 'Location',
					pageIds: ['locationPage'],
					// Mirror page-level NOT_DC gate in professionalLoan/pages.ts.
					// DC flows route Location to the end via locationPageDC.
					showWhen: (answers) =>
						!['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Practice Location',
						dsaGuidance: {
							summary: 'Where you practice affects available loan options and lender matching.',
							keyPoints: [
								'Lenders prefer certain locations',
								'Clinic/office verification needed',
								'Impacts processing timeline'
							],
							watchFor: [
								'Practice address will be verified against professional registration — ensure they match'
							],
							proTips: [
								'Hospital affiliation helps',
								'Multiple locations? Use primary',
								'Keep address proof ready'
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
				title: 'Professional Details',
				dsaGuidance: {
					summary: 'Tell us about yourself and your professional practice.',
					keyPoints: [
						'Establishes professional identity',
						'Required for credit assessment',
						'Determines loan eligibility'
					],
					watchFor: [
						'Professional registration certificate must be current and not expired or suspended',
						'Co-applicant should ideally be spouse or parent for professional loans'
					],
					proTips: [
						'Have qualification docs ready',
						'Know your annual income',
						'Registration must be current'
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
							summary: 'Provide your personal and professional details.',
							keyPoints: [
								'Professional verification',
								'Identity confirmation',
								'Credential validation'
							],
							watchFor: [
								'Professional registration certificate must be current and not expired or suspended'
							],
							proTips: ['Use name as per registration', 'Age must match ID proof']
						}
					}
				},
				{
					id: 'applicant-profile',
					label: 'Applicant Profile',
					pageIds: ['applicantProfilePage'],
					showWhen: (answers) => answers['professionalApplicantType'] === 'individual',
					contextInfo: {
						title: 'Professional Profile',
						dsaGuidance: {
							summary:
								'Professional credentials, practice vintage, and registration status determine eligibility and loan limits.',
							keyPoints: [
								'Professional category determines available products',
								'Qualification level affects maximum loan amount',
								'Active registration is mandatory — expired/suspended disqualifies'
							],
							watchFor: [
								'Only licensed/registered professionals qualify — Doctors (NMC/SMC), CAs (ICAI), Lawyers (Bar Council), Architects (CoA)',
								'Practice vintage below 2 years limits options significantly',
								'Expired registration is a hard block — must be renewed first'
							],
							proTips: [
								'Keep registration certificate and membership ID ready',
								'Doctors with super-specialization get highest limits',
								'Hospital employment counts towards practice vintage'
							]
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
							watchFor: ['Co-applicant should ideally be spouse or parent for professional loans'],
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
							watchFor: ['Both personal and professional income are assessed separately'],
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
						'Practice income and hospital/firm salary are treated differently by lenders',
						'Professional loans offer preferential rates only above 750 CIBIL score'
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
							summary:
								'Select all the ways you earn income so we can assess your total repayment capacity.',
							keyPoints: [
								'Multiple income sources increase eligibility',
								'Each source needs specific documentation',
								'Helps match with the right loan products'
							],
							watchFor: [
								'Practice income and hospital/firm salary are treated differently by lenders'
							],
							proTips: [
								'Include practice income',
								'Consulting income counts too',
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
							watchFor: ['Professional fees must be supported by ITR and bank statement proof'],
							proTips: [
								'Have ITR copies ready',
								'Know your net monthly income',
								'Keep latest salary slips handy'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const profiles = a['selectedIncomeProfiles'] as string[];
							if (profiles) {
								if (profiles.includes('professional_practice')) {
									g.keyPoints = [
										'Professional income: enter gross receipts minus professional expenses'
									];
									g.proTips = [
										'Include consultation fees, retainer fees, and hospital/firm salary if dual-practice'
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
				// ── Company-only: Company Financials ─────────────────────
				{
					id: 'company-financials',
					label: 'Firm Financials',
					pageIds: ['companyFinancialsPage'],
					showWhen: (answers: Record<string, unknown>) =>
						isSingleApplicant(answers) && isCompanyApplicant(answers),
					contextInfo: {
						title: 'Firm Financials',
						dsaGuidance: {
							summary:
								'How the firm reports and earns income drives the assessment — ITR-based or cash-based, each has different documentation requirements.',
							keyPoints: [
								'ITR filing history is the strongest income proof for lenders',
								'Cash-heavy practices need strong bank statement support',
								'Monthly bank deposits validate declared income'
							],
							watchFor: [
								'Firms without 2+ years of ITR have very limited lender options',
								'Cash income above 40% of revenue raises scrutiny — banks prefer documented income'
							],
							proTips: [
								'Keep last 3 years ITR + computation ready',
								'12 months current account statements will be required',
								'Higher bank deposits = better loan eligibility'
							]
						}
					}
				},
				// ── Both Individual & Company: Credit Behaviour ──────────
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
 * Page order: CaseIntake → LoanReq → Applicant → Profile → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const professionalLoanDCSections: WizardSectionConfig = {
	loanProduct: 'Professional Loan',
	sections: [
		// Case intake — same as regular professional loan (assessment status, prior rejections, etc.)
		professionalLoanSections.sections[0],
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary:
						'Specify your professional debt consolidation needs — which loans to close and the total amount required.',
					keyPoints: [
						'List all loans you want to consolidate',
						'Total amount drives the consolidation plan',
						'Professional loans offer up to 50L — leverage this for consolidation'
					],
					watchFor: [
						'Professional loans have higher limits than personal (up to 50L) — leverage this'
					],
					proTips: [
						'Include all high-interest professional and personal loans',
						'Factor in prepayment charges on existing loans',
						'Professional rates are typically lower — consolidation saves more'
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
								'Specify your loan purpose, desired amount, and repayment tenure for debt consolidation.',
							keyPoints: [
								'Amount should cover all loans to be consolidated',
								'Factor in prepayment charges of existing loans',
								'Tenure affects monthly cash flow'
							],
							watchFor: [
								'Professional loans have higher limits than personal (up to 50L) — leverage this'
							],
							proTips: [
								'Calculate total outstanding + prepayment charges',
								'Professionals get up to 50 lakhs',
								'Flexible repayment options available'
							]
						},
						// Index 1 = 'getting-started' in fresh config (0=case-assessment, 1=getting-started)
						getDynamicGuidance:
							professionalLoanSections.sections[1].subsections[0].contextInfo?.getDynamicGuidance
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			// Index 2 = 'applicants' in fresh config (0=case-assessment, 1=getting-started, 2=applicants)
			contextInfo: professionalLoanSections.sections[2].contextInfo,
			subsections: professionalLoanSections.sections[2].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => isSingleApplicant(answers),
			// Index 3 = 'financials' in fresh config
			contextInfo: professionalLoanSections.sections[3].contextInfo,
			subsections: professionalLoanSections.sections[3].subsections
		},
		{
			id: 'location-details',
			label: 'Location',
			contextInfo: {
				title: 'Practice Location',
				dsaGuidance: {
					summary: 'Where you practice affects available loan options and lender matching.',
					keyPoints: [
						'Lenders prefer certain locations',
						'Clinic/office verification needed',
						'Impacts processing timeline'
					],
					watchFor: [
						'Practice address will be verified against professional registration — ensure they match'
					],
					proTips: [
						'Hospital affiliation helps',
						'Multiple locations? Use primary',
						'Keep address proof ready'
					]
				}
			},
			subsections: [
				{
					id: 'location-dc',
					label: 'Practice Location',
					pageIds: ['locationPageDC'],
					// Mirror page-level IS_DC gate. Only shown for Debt Consolidation flows.
					showWhen: (answers) =>
						['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Practice Location',
						dsaGuidance: {
							summary: 'Where you practice affects available loan options and lender matching.',
							keyPoints: [
								'Lenders prefer certain locations',
								'Clinic/office verification needed',
								'Impacts processing timeline'
							],
							watchFor: [
								'Practice address will be verified against professional registration — ensure they match'
							],
							proTips: [
								'Hospital affiliation helps',
								'Multiple locations? Use primary',
								'Keep address proof ready'
							]
						}
					}
				}
			]
		}
	]
};
