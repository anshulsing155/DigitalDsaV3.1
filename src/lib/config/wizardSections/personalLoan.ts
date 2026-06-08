import type { WizardSectionConfig, DsaGuidance } from '$lib/types/wizard';

export const personalLoanSections: WizardSectionConfig = {
	loanProduct: 'Personal Loan',
	sections: [
		{
			id: 'case-assessment',
			label: 'Case Assessment',
			subsections: [
				{
					id: 'assessment-status',
					label: 'Assessment Status',
					pageIds: ['caseIntake_personalLoan'],
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
						'Tell us what you need and where you are — this helps match you with the right personal loan products and lenders.',
					keyPoints: [
						'Loan purpose helps match specialized products',
						'Location filters lenders by geographic coverage',
						'Ensures smooth application process'
					],
					watchFor: [
						'Minimum salary requirements vary by lender — typically ₹15K-25K/month for salaried',
						'Some lenders do not operate in Tier-3 cities — check coverage first'
					],
					proTips: [
						'Salaried? Keep salary slips ready',
						'Good CIBIL score gets better rates',
						'Stable employment helps approval'
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
								'Specify loan purpose, amount, and preferred tenure — this drives the entire assessment.',
							keyPoints: [
								'Purpose helps match specialized products',
								'Amount based on income and obligations',
								'Tenure impacts monthly budget'
							],
							watchFor: [
								'Personal loan tenure is short (1-5 years) — ensure EMI fits monthly budget'
							],
							proTips: [
								'Personal loans up to 25-30 lakhs',
								'Tenure usually 1-5 years',
								'Consider prepayment flexibility'
							]
						}
					}
				},
				{
					id: 'location',
					label: 'Processing Location',
					pageIds: ['locationPage'],
					// Mirror page-level NOT_DC gate in personalLoan/pages.ts.
					// DC flows route Location to the end via locationPageDC.
					showWhen: (answers) =>
						!['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Loan Processing Location',
						dsaGuidance: {
							summary:
								"Pick the city where you'd like this loan to be processed. Typically the applicant's residence city, but it can be the workplace city or a major metro for wider branch coverage.",
							keyPoints: [
								'Drives which lenders are eligible (branch coverage)',
								'Decides where KYC, documentation pickup, and verification happen',
								"Doesn't have to match the applicant's residence — co-applicants can mark their own residence relative to this city on the Applicants page"
							],
							watchFor: [
								'Some lenders do not operate in Tier-3 cities — check coverage first',
								'If processing city ≠ residence city, address proof must be from the chosen city OR the applicant must accept doorstep verification at residence'
							],
							proTips: [
								'For salaried applicants: pick the city where salary is credited — fastest profile match',
								'Major metros have wider lender coverage and faster turnaround',
								"Family in village + applicant in metro? Pick the metro for branch convenience; co-applicants in the village can still sign — they'll mark Different city/state below"
							]
						}
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			icon: 'Users',
			contextInfo: {
				title: 'Your Information',
				dsaGuidance: {
					summary: 'Personal details for identity verification and loan assessment.',
					keyPoints: [
						'Required for identity verification',
						'Needed for credit bureau check',
						'Determines loan eligibility'
					],
					watchFor: [
						'Name must match PAN card exactly — mismatches cause verification delays',
						'Non-family co-applicants are generally not accepted for personal loans'
					],
					proTips: [
						'Use name as per PAN card',
						'Have employment details ready',
						'Know your monthly income'
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
							summary: 'Provide your personal details.',
							keyPoints: ['KYC verification', 'Identity confirmation', 'Age eligibility'],
							watchFor: ['Name must match PAN card exactly — mismatches cause verification delays'],
							proTips: ['Use name as per PAN card', 'Age must match ID proof']
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
							watchFor: ['Non-family co-applicants are generally not accepted for personal loans'],
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
					id: 'applicant-profile-single',
					label: 'Applicant Profile',
					pageIds: ['applicantProfilePage'],
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Applicant Profile',
						dsaGuidance: {
							summary:
								'Education, religion, owned properties, and residence pattern — these affect lender matching for personal loans.',
							keyPoints: [
								'Education level can affect eligibility at certain lenders',
								'Owned property history strengthens the profile',
								'Residence proximity to office aids verification'
							],
							watchFor: [
								'NRI applicants must select country — many PL lenders restrict NRI cases',
								'Frequent address changes can weaken the residence stability signal'
							],
							proTips: [
								'Use the address that matches your KYC and salary credit bank',
								'List all owned residential properties — boosts profile strength',
								'Stable 3+ years at one residence helps approval'
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
							watchFor: ['Combine income from all applicants for maximum loan eligibility'],
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
			showWhen: (answers: Record<string, unknown>) => (answers['__applicantCount'] as number) <= 1,
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
						'Frequent job changes (less than 1 year each) can hurt approval chances',
						'Score below 700 significantly limits personal loan options and raises rates'
					],
					proTips: [
						'Include all active income sources for maximum eligibility',
						'Check your CIBIL score before applying',
						'Consider closing small high-interest loans first'
					]
				}
			},
			subsections: [
				{
					id: 'employment-income',
					label: 'Employment & Income',
					pageIds: ['incomeProfilesPage'],
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__applicantCount'] as number) <= 1,
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
							watchFor: ['Frequent job changes (less than 1 year each) can hurt approval chances'],
							proTips: [
								'Include all active income sources',
								'Salaried + rental = higher eligibility',
								'Business income needs ITR proof'
							]
						}
					}
				},
				{
					id: 'income-details',
					label: 'Income Details',
					pageIds: ['incomeDetailsPage'],
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__applicantCount'] as number) <= 1,
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
								'Mismatch between salary slips and bank credits is a common rejection reason'
							],
							proTips: [
								'Have salary slips ready',
								'Know your net monthly income',
								'Keep latest ITRs handy'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const profiles = a['selectedIncomeProfiles'] as string[];
							if (profiles) {
								if (profiles.includes('salaried_regular')) {
									g.keyPoints = [
										'Salaried: enter gross monthly salary (CTC/12 or take-home + deductions)'
									];
									g.proTips = [
										'Include HRA, special allowance, and variable pay if consistent over 6+ months'
									];
								}
								if (
									profiles.includes('business_proprietorship') ||
									profiles.includes('business_partnership')
								) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Business income: enter net profit from P&L statement (after expenses, before tax)'
									];
									g.watchFor = [
										'Profit margin below 8% may trigger additional scrutiny from banks'
									];
								}
								if (profiles.includes('rental_income')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Rental income: banks typically apply 30% haircut (only 70% counted)'
									];
								}
								if (profiles.includes('pension')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Pension: full amount counted, but max tenure limited by age'
									];
								}
							}
							return g;
						}
					}
				},
				{
					id: 'credit-behaviour',
					label: 'Credit Behaviour',
					pageIds: ['creditScorePage'],
					showWhen: (answers: Record<string, unknown>) =>
						(answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Credit Behaviour',
						dsaGuidance: {
							summary:
								'Your CIBIL score significantly impacts the interest rate and loan amount offered.',
							keyPoints: [
								'750+ score gets best interest rates',
								'Low score may limit lender options',
								'Existing loans affect available credit'
							],
							watchFor: [
								'Score below 700 significantly limits personal loan options and raises rates'
							],
							proTips: [
								'Check your CIBIL score before applying',
								'Clear small outstanding dues',
								'Avoid multiple loan inquiries'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const score = Number(a['creditScore']);
							if (score >= 750) {
								g.summary = `Credit score ${score} — excellent. Eligible at all banks with best rate brackets.`;
								g.proTips = [
									'Strong score — use it as leverage to negotiate processing fee waiver'
								];
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
					}
				},
				{
					id: 'existing-loans',
					label: 'Existing Loans',
					pageIds: ['obligationsPage'],
					showWhen: (answers: Record<string, unknown>) => {
						return (answers['__applicantCount'] as number) <= 1;
					},
					contextInfo: {
						title: 'Existing Loans',
						dsaGuidance: {
							summary:
								'Details of your current loans and credit limits help calculate available repayment capacity.',
							keyPoints: [
								'Running EMIs reduce eligible loan amount',
								'Credit utilization affects credit score',
								'Closing small loans can boost eligibility'
							],
							watchFor: ['Undisclosed EMIs found during CIBIL check lead to immediate rejection'],
							proTips: [
								'Include all running EMIs',
								'Credit card limits count as obligations',
								'Consider closing high-interest loans first'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const loanAmt = Number(a['loanAmount']);
							if (loanAmt > 0) {
								g.keyPoints = [
									`Target loan: ₹${(loanAmt / 100000).toFixed(1)}L — total obligations must stay within FOIR limit to qualify`
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
					}
				}
			]
		}
	]
};

/**
 * DC (Debt Consolidation) wizard section variant.
 * Page order: CaseIntake → LoanReq → Applicant → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const personalLoanDCSections: WizardSectionConfig = {
	loanProduct: 'Personal Loan',
	sections: [
		// Case intake — same as regular personal loan (assessment status, prior rejections, etc.)
		personalLoanSections.sections[0],
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary:
						'Specify your consolidation needs — which loans to close and the total amount required.',
					keyPoints: [
						'List all loans you want to consolidate',
						'Total amount drives the consolidation plan',
						'Tenure should fit your repayment capacity'
					],
					watchFor: [
						'Personal loan tenure is short (1-5 years) — ensure consolidated EMI fits monthly budget'
					],
					proTips: [
						'Include all high-interest loans for maximum savings',
						'Consider prepayment charges on existing loans',
						'Shorter tenure = less total interest paid'
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
								'Specify loan purpose, amount, and preferred tenure for your debt consolidation.',
							keyPoints: [
								'Amount should cover all loans to be consolidated',
								'Factor in prepayment charges of existing loans',
								'Tenure impacts monthly budget'
							],
							watchFor: [
								'Personal loan tenure is short (1-5 years) — ensure EMI fits monthly budget'
							],
							proTips: [
								'Calculate total outstanding + prepayment charges',
								'Consider a small buffer for processing costs',
								'Shorter tenure saves more on interest'
							]
						}
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			icon: 'Users',
			// Index 2 = 'applicants' section in fresh config (0=case-assessment, 1=getting-started, 2=applicants)
			contextInfo: personalLoanSections.sections[2].contextInfo,
			subsections: personalLoanSections.sections[2].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => (answers['__applicantCount'] as number) <= 1,
			// Index 3 = 'financials' section in fresh config
			contextInfo: personalLoanSections.sections[3].contextInfo,
			subsections: personalLoanSections.sections[3].subsections
		},
		{
			id: 'location-details',
			label: 'Location',
			contextInfo: {
				title: 'Loan Processing Location',
				dsaGuidance: {
					summary:
						"Pick the city where you'd like this loan to be processed. Typically the applicant's residence city, but it can be the workplace city or a major metro for wider branch coverage.",
					keyPoints: [
						'Drives which lenders are eligible (branch coverage)',
						'Decides where KYC, documentation pickup, and verification happen',
						"Doesn't have to match the applicant's residence — co-applicants can mark their own residence relative to this city on the Applicants page"
					],
					watchFor: [
						'Some lenders do not operate in Tier-3 cities — check coverage first',
						'If processing city ≠ residence city, address proof must be from the chosen city OR the applicant must accept doorstep verification at residence'
					],
					proTips: [
						'For salaried applicants: pick the city where salary is credited — fastest profile match',
						'Major metros have wider lender coverage and faster turnaround',
						"Family in village + applicant in metro? Pick the metro for branch convenience; co-applicants in the village can still sign — they'll mark Different city/state below"
					]
				}
			},
			subsections: [
				{
					id: 'location-dc',
					label: 'Processing Location',
					pageIds: ['locationPageDC'],
					// Mirror page-level IS_DC gate. Only shown for Debt Consolidation flows.
					showWhen: (answers) =>
						['Debt Consolidation', 'Debt Consolidation with Extra Funds'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Loan Processing Location',
						dsaGuidance: {
							summary:
								"Pick the city where you'd like this loan to be processed. Typically the applicant's residence city, but it can be the workplace city or a major metro for wider branch coverage.",
							keyPoints: [
								'Drives which lenders are eligible (branch coverage)',
								'Decides where KYC, documentation pickup, and verification happen',
								"Doesn't have to match the applicant's residence — co-applicants can mark their own residence relative to this city on the Applicants page"
							],
							watchFor: [
								'Some lenders do not operate in Tier-3 cities — check coverage first',
								'If processing city ≠ residence city, address proof must be from the chosen city OR the applicant must accept doorstep verification at residence'
							],
							proTips: [
								'For salaried applicants: pick the city where salary is credited — fastest profile match',
								'Major metros have wider lender coverage and faster turnaround',
								"Family in village + applicant in metro? Pick the metro for branch convenience; co-applicants in the village can still sign — they'll mark Different city/state below"
							]
						}
					}
				}
			]
		}
	]
};
