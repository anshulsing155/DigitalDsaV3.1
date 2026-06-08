import type { WizardSectionConfig, DsaGuidance } from '$lib/types/wizard';

export const plotLoanSections: WizardSectionConfig = {
	loanProduct: 'Plot Loan',
	sections: [
		{
			id: 'case-assessment',
			label: 'Case Assessment',
			subsections: [
				{
					id: 'assessment-status',
					label: 'Assessment Status',
					pageIds: ['caseIntake_plotLoan'],
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
					summary: 'Plot location to kick off the loan application.',
					keyPoints: [
						'Plot location determines bank coverage and lender options',
						'Pincode accuracy is critical for negative area filtering'
					],
					watchFor: [
						'Agricultural land requires NA conversion before any bank will consider financing'
					],
					proTips: [
						'Have survey number and plot dimensions ready',
						'Know the development authority or layout approval status',
						'Collect allotment letter / sale deed beforehand'
					]
				}
			},
			subsections: [
				{
					id: 'plot-identification',
					label: 'Plot Location',
					pageIds: ['propertyIdentificationPage'],
					contextInfo: {
						title: 'Plot Location',
						dsaGuidance: {
							summary: 'Provide the plot location details.',
							keyPoints: [
								'Plot location determines lender availability',
								'Pincode helps identify negative areas for bank filtering'
							],
							watchFor: [
								'Ensure pincode is accurate — incorrect pincode may trigger negative area filters'
							],
							proTips: [
								'Use the exact location from the sale deed / allotment letter',
								'Have the survey number ready for reference'
							]
						}
					}
				}
			]
		},
		{
			id: 'property',
			label: 'Property',
			contextInfo: {
				title: 'Plot Details',
				dsaGuidance: {
					summary:
						'Detailed plot specifications — area type, land classification, ownership, compliance, and legal status.',
					keyPoints: [
						'Land use classification is the #1 eligibility filter',
						'Plot source (authority/developer/revenue) determines lender acceptance',
						'Area-specific compliance questions adapt based on location type'
					],
					watchFor: ['Revenue site plots are refused by most nationalised banks'],
					proTips: [
						'Have allotment letter, sale deed, and revenue records ready',
						'Know the exact development authority or layout approval',
						'Check NA conversion status if land was ever agricultural'
					]
				}
			},
			subsections: [
				{
					id: 'area-type',
					label: 'Area & Restrictions',
					pageIds: ['propertyLocation_Plot'],
					contextInfo: {
						title: 'Plot Area & Location',
						dsaGuidance: {
							summary:
								'Classify the area type, identify special restrictions, and declare land use classification.',
							keyPoints: [
								'Area type is the primary eligibility filter — planned areas have the most lender options',
								'Special zones (CRZ, Cantonment, Tribal) severely restrict choices',
								'Agricultural land classification = no standard bank loan'
							],
							watchFor: [
								'Agricultural land CANNOT be financed through standard bank loans — NA conversion is mandatory'
							],
							proTips: [
								'Ask the applicant how locals describe the area',
								'Check if a development authority (DDA, HUDA, BDA) governs the area',
								'Verify land use from 7/12 extract, Patta, or revenue records'
							]
						}
					}
				},
				{
					id: 'plot-character',
					label: 'Plot Character',
					pageIds: ['propertyCharacter_Plot'],
					contextInfo: {
						title: 'Plot Character & Ownership',
						dsaGuidance: {
							summary: 'Plot source, ownership type, age, area, and boundary status.',
							keyPoints: [
								'Authority allotment plots get near-universal bank acceptance',
								'Freehold is preferred — leasehold with <20 years remaining is difficult',
								'Clear boundary demarcation is required for bank physical verification'
							],
							watchFor: [
								'Revenue site plots are refused by most nationalised banks — only select NBFCs may consider'
							],
							proTips: [
								'Have allotment letter ready for authority plots',
								'Use measurements from the survey / sale deed',
								'Get boundary survey done if demarcation is unclear'
							]
						}
					}
				},
				{
					id: 'construction',
					label: 'Construction',
					pageIds: ['constructionDetails_Plot'],
					// Post-2026-05-31 rename: Plot Loan VARIANT lives in `loanVariant`.
					// Prior to fix, this read `loanType` (which now carries SCOPE
					// only — 'New Loan' / 'Balance Transfer Only') and compared to
					// variant strings — always false, so the construction subsection
					// never appeared. Matches page-level showWhen in plotLoan/pages.ts:67-74.
					showWhen: (answers) => {
						const lv = answers['loanVariant'] as string | undefined;
						return lv === 'Plot & Construction Loan' || lv === 'Construction Loan Only';
					},
					contextInfo: {
						title: 'Construction Details',
						dsaGuidance: {
							summary:
								'Property current state, mortgage status, construction type, plan approval, and progress.',
							keyPoints: [
								'For Construction Only: first assess if plot is vacant, partial, or has existing house',
								'If plot has existing loan, same lender must extend or BT is needed',
								'Approved building plan required before any construction disbursement',
								'Banks disburse stage-wise — no advance release of funds'
							],
							watchFor: [
								'Adding floors needs structural stability certificate + revised building plan',
								'If plot is mortgaged elsewhere, direct construction loan is NOT possible without BT'
							],
							proTips: [
								'Check if existing plot lender offers construction top-up first',
								'Have approved building plan and cost estimation ready',
								'Know the licensed contractor / architect details'
							]
						}
					}
				},
				{
					id: 'condition-compliance',
					label: 'Condition & Compliance',
					pageIds: ['propertyCondition_Plot'],
					// Post-2026-05-31 rename: variant in `loanVariant`, not `loanType`.
					// Matches page-level showWhen in plotLoan/pages.ts:85-91.
					showWhen: (answers) => answers['loanVariant'] !== 'Construction Loan Only',
					contextInfo: {
						title: 'Plot Condition & Compliance',
						dsaGuidance: {
							summary:
								'Area-specific compliance, NA conversion, revenue records, layout approval, and infrastructure status.',
							keyPoints: [
								'Compliance questions change based on area type selected earlier',
								'Revenue records are always required for plot loans',
								'NA conversion status is critical for any converted agricultural land'
							],
							watchFor: [
								'Plots without proper layout approval or road access face rejection from most banks'
							],
							proTips: [
								'State-specific documents: 7/12 (MH/GJ), Patta (TN), RTC (KA), Jamabandi (PB/HR)',
								'RERA applies mainly to developer project plots',
								'Village/panchayat plots rarely have formal certifications — that is expected'
							]
						}
					}
				},
				{
					id: 'legal',
					label: 'Legal & Title',
					pageIds: ['propertyLegal_Plot'],
					contextInfo: {
						title: 'Legal, Title & Registration',
						dsaGuidance: {
							summary:
								'How the plot was acquired, title documents, encumbrance status, and construction timeline mandate.',
							keyPoints: [
								'GPA transfers are rejected by most lenders (Supreme Court ruling)',
								'Original documents are mandatory for mortgage creation',
								'Banks mandate construction within 2-5 years of plot loan disbursement',
								'Legal disputes are verified by lender — not captured here'
							],
							watchFor: [
								'If encumbrance exists, this becomes BT territory — check construction page mortgage status'
							],
							proTips: [
								'Keep original sale deed / allotment letter accessible',
								'Get encumbrance certificate from sub-registrar before applying',
								'For inherited plots, ensure succession certificate is complete'
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
				title: 'Applicant Information',
				dsaGuidance: {
					summary:
						'Personal details of all loan applicants for identity and relationship verification.',
					keyPoints: [
						'Determines loan eligibility',
						'All plot owners must apply',
						'Co-applicant relationships affect terms'
					],
					watchFor: ['All registered plot owners must be listed as co-applicants'],
					proTips: [
						'Include spouse for better eligibility',
						'Joint ownership needs all applicants',
						'Keep KYC documents ready'
					]
				}
			},
			subsections: [
				{
					id: 'whos-applying',
					label: "Who's Applying",
					pageIds: ['tellUsApplyingPage'],
					applicantStep: 0,
					contextInfo: {
						title: "Who's Applying",
						dsaGuidance: {
							summary: 'Personal identification and contact information for each applicant.',
							keyPoints: [
								'KYC compliance requirement',
								'Credit bureau verification',
								'Communication channel setup'
							],
							watchFor: ['All registered plot owners must be listed as co-applicants'],
							proTips: [
								'Name as per official documents',
								'Active mobile for OTP',
								'Valid email for updates'
							]
						}
					}
				},
				{
					id: 'relationships',
					label: 'Relationships',
					pageIds: ['tellUsApplyingPage'],
					applicantStep: 1,
					showWhen: (answers) => (answers['__individualApplicantCount'] as number) > 1,
					contextInfo: {
						title: 'Applicant Relationships',
						dsaGuidance: {
							summary: 'How are the co-applicants related to each other?',
							keyPoints: [
								'Valid relationships required',
								'Affects ownership structure',
								'Legal documentation needs'
							],
							watchFor: ['Non-family co-applicants face stricter scrutiny in plot loans'],
							proTips: [
								'Family members preferred',
								'Business partners possible',
								'Check bank relationship rules'
							]
						}
					}
				},
				// Single-applicant Applicant Profile (Education, Religion, Category,
				// Residence-relative-to-property) — moved into the Applicants section
				// so the sidebar lists it between Who's Applying and GPA. Matches
				// the user's mental model and matches Professional Loan's structure.
				{
					id: 'applicant-profile-single',
					label: 'Applicant Profile',
					pageIds: ['applicantProfilePage'],
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Applicant Profile',
						dsaGuidance: {
							summary: 'Education, religion, property ownership, and residence details.',
							keyPoints: [
								'Affects lender matching and eligibility',
								'Residence proximity impacts verification',
								'Property ownership history matters for underwriting'
							],
							watchFor: [
								'Plot loans require stronger income proof as they carry higher risk for lenders'
							],
							proTips: [
								'Include all owned properties',
								'Select residence location accurately',
								'NRI applicants must select country'
							]
						}
					}
				},
				{
					id: 'gpa-nri',
					label: 'GPA (Power of Attorney)',
					pageIds: ['tellUsApplyingPage'],
					applicantStep: 2,
					showWhen: (answers) => (answers['__allIndividualsNRI'] as boolean) === true,
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
					id: 'profile-financials',
					label: 'Profile & Financials',
					pageIds: ['tellUsApplyingPage'],
					applicantStep: 3,
					showWhen: (answers) => (answers['__applicantCount'] as number) > 1,
					contextInfo: {
						title: 'Profile & Financials',
						dsaGuidance: {
							summary:
								'Profile details, income sources, credit score, and obligations for each applicant.',
							keyPoints: [
								'EMI affordability calculation',
								'Interest rate determination',
								'Loan amount eligibility'
							],
							watchFor: [
								'Plot loans require stronger income proof as they carry higher risk for lenders'
							],
							proTips: [
								'Profile is the first tab inside each applicant modal',
								'Include all income sources',
								'Good CIBIL score helps'
							]
						}
					}
				}
			]
		},
		{
			id: 'profile-financial',
			label: 'Profile & Financial',
			showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
			contextInfo: {
				title: 'Profile & Financial',
				dsaGuidance: {
					summary:
						'Your profile, income, credit, and obligation details to assess your repayment capacity.',
					keyPoints: [
						'Determines maximum eligible loan amount',
						'Credit behaviour affects interest rate',
						'Existing obligations reduce available capacity'
					],
					watchFor: [
						'Plot loans require stronger income proof as they carry higher risk for lenders'
					],
					proTips: [
						'Include all active income sources',
						'Check your CIBIL score before applying',
						'Clear small outstanding dues for better terms'
					]
				}
			},
			subsections: [
				{
					id: 'employment-income',
					label: 'Employment & Income',
					pageIds: ['incomeProfilesPage'],
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Employment & Income Sources',
						dsaGuidance: {
							summary: 'Select all income sources for accurate eligibility assessment.',
							keyPoints: [
								'Multiple income sources increase eligibility',
								'Each source needs specific documentation',
								'Helps match with the right loan products'
							],
							watchFor: [
								'Plot loans require stronger income proof as they carry higher risk for lenders'
							],
							proTips: [
								'Include all active income sources',
								'Rental income counts if documented',
								'Business income needs ITR proof'
							]
						}
					}
				},
				{
					id: 'income-details',
					label: 'Income Details',
					pageIds: ['incomeDetailsPage'],
					showWhen: (answers) =>
						(answers['__applicantCount'] as number) <= 1 && !answers['__hasOnlyNoCurrentIncome'],
					contextInfo: {
						title: 'Income Details',
						dsaGuidance: {
							summary: 'Provide detailed information for each income source.',
							keyPoints: [
								'Accurate figures ensure realistic offers',
								'Banks verify income against documents',
								'Higher documented income means better terms'
							],
							watchFor: ['Bank statement credits must match declared income sources'],
							proTips: [
								'Use net monthly income for salaried',
								'Business income = profit after tax',
								'Keep latest salary slips and ITRs handy'
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
									profiles.includes('business_partnership') ||
									profiles.includes('director_company')
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
								if (profiles.includes('agriculture_income')) {
									g.proTips = [
										...(g.proTips || []),
										'Agricultural income: not taxable but banks need land records and mandi receipts as proof'
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
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Credit Behaviour',
						dsaGuidance: {
							summary: 'Your credit score impacts the interest rate and loan amount offered.',
							keyPoints: [
								'750+ score gets best interest rates',
								'Low score may limit lender options',
								'Existing loans affect available credit'
							],
							watchFor: [
								'Score below 700 severely limits plot loan options — fewer lenders operate here'
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
					id: 'credit-history',
					label: 'Credit History',
					pageIds: ['obligationsPage'],
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Credit History',
						dsaGuidance: {
							summary:
								'Details of current loans and credit limits help calculate available repayment capacity.',
							keyPoints: [
								'Running EMIs reduce eligible loan amount',
								'Credit utilization affects credit score',
								'Closing small loans can boost eligibility'
							],
							watchFor: [
								'High credit card utilization counts against you even if payments are regular'
							],
							proTips: [
								'Include all running EMIs',
								'Credit card limits count as obligations',
								'Consider closing high-interest loans first'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const loanAmt = Number(a['propCost']);
							if (loanAmt > 0) {
								g.keyPoints = [
									`Target loan: ₹${(loanAmt / 100000).toFixed(1)}L — total obligations must stay within FOIR limit to qualify`
								];
							}
							return g;
						}
					}
				}
			]
		},
		{
			id: 'loan-details',
			label: 'Loan Details',
			contextInfo: {
				title: 'Loan Details',
				dsaGuidance: {
					summary: 'Existing obligations and your plot loan amount and tenure preferences.',
					keyPoints: [
						'Existing loans affect new loan eligibility',
						'Loan amount is based on plot value and capacity',
						'Tenure determines EMI and total interest outgo'
					],
					watchFor: [
						'Plot loans typically have higher interest rates and shorter tenure than home loans'
					],
					proTips: [
						'List all running EMIs accurately',
						'Plot loans usually offer up to 70% LTV',
						'Shorter tenure saves interest overall'
					]
				}
			},
			subsections: [
				{
					id: 'existing-loans',
					label: 'Existing Loans',
					pageIds: ['existingDetailsPage'],
					// Sidebar gate mirrors the page-level gate in plotLoan/pages.ts
					// (buildExistingDetailsPage). New-Loan / construction-only flows do
					// not need existing-loan details, so the sidebar entry would otherwise
					// appear as a dead link.
					showWhen: (answers) => answers['loanType'] === 'Balance Transfer Only',
					contextInfo: {
						title: 'Existing Loans',
						dsaGuidance: {
							summary:
								'Current loan details — outstanding, EMI, tenure, and rate — for balance transfer assessment.',
							keyPoints: [
								'Outstanding principal determines the BT amount',
								'Current EMI and rate help calculate savings potential',
								'Remaining tenure affects new loan structuring'
							],
							watchFor: [
								'If remaining tenure is less than 1 year, BT may not be cost-effective after processing fees'
							],
							proTips: [
								'Ask applicant to check latest loan statement for exact outstanding',
								'Compare current rate with market rates to quantify savings',
								'Include all loans on the property (plot loan, LAP, etc.)'
							]
						}
					}
				},
				{
					id: 'amount-terms',
					label: 'Amount & Terms',
					pageIds: ['loanRequirementPage'],
					contextInfo: {
						title: 'Loan Amount & Terms',
						dsaGuidance: {
							summary: 'Enter your desired loan amount and repayment period.',
							keyPoints: [
								'Amount based on plot value',
								'Tenure affects monthly burden',
								'Both determine interest outgo'
							],
							watchFor: [
								'Plot loans typically have higher interest rates and shorter tenure than home loans'
							],
							proTips: [
								'Consider down payment capacity',
								'Shorter tenure saves interest',
								'Leave room for future needs'
							]
						}
					}
				}
			]
		}
	]
};
