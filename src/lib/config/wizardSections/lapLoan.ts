import type { WizardSectionConfig, DsaGuidance } from '$lib/types/wizard';

export const lapLoanSections: WizardSectionConfig = {
	loanProduct: 'LAP',
	sections: [
		{
			id: 'case-assessment',
			label: 'Case Assessment',
			subsections: [
				{
					id: 'assessment-status',
					label: 'Assessment Status',
					pageIds: ['caseIntake_lapLoan'],
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
			id: 'loan-requirement',
			label: 'LAP Requirement',
			/*it shows only with New Loan (Alok)*/
			showWhen: (answers) => answers['loanType'] == 'New Loan',
			subsections: [
				{
					id: 'purpose-amount',
					label: 'Purpose & Amount',
					pageIds: ['loanRequirementPage'],
					contextInfo: {
						title: 'LAP Requirement',
						dsaGuidance: {
							summary:
								'Loan purpose, amount, and tenure — set early because Debt Consolidation changes the entire flow.',
							keyPoints: [
								'Purpose selection affects downstream questions',
								'Debt Consolidation adds obligation capture requirements',
								'Amount limited by property value and LTV ratio'
							],
							watchFor: [
								'If purpose is Debt Consolidation, existing loans MUST be captured in obligations'
							],
							proTips: [
								'Ask the purpose upfront — it determines the entire case strategy',
								'LAP typically offers 50-70% of property value',
								'Keep EMI below 50% of income for best approval chances'
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
					summary: 'Tell us about the property you want to use as collateral and where you reside.',
					keyPoints: [
						'Property location affects lender availability',
						'Determines maximum loan amount possible',
						'Helps assess property documentation needs'
					],
					watchFor: ['Property must be free from all encumbrances for LAP approval'],
					proTips: [
						'Residential properties typically get better rates',
						'Property should be free from legal disputes',
						'Clear title is essential for approval'
					]
				}
			},
			subsections: [
				{
					id: 'location-eligibility',
					label: 'Location & Eligibility',
					pageIds: ['propertyIdentificationPage'],
					contextInfo: {
						title: 'Location & Eligibility',
						dsaGuidance: {
							summary: 'Provide property location and applicant residence details.',
							keyPoints: [
								'Property location determines lender options',
								'Residence city affects processing location',
								'Both locations impact documentation needs'
							],
							watchFor: ['Property must be free from all encumbrances for LAP approval'],
							proTips: [
								'Self-occupied properties are preferred',
								'Joint ownership requires all owners as applicants',
								'Commercial properties may have different terms'
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
				title: 'Property Specifications',
				dsaGuidance: {
					summary:
						'Detailed property specifications help us assess the collateral value accurately.',
					keyPoints: [
						'Determines loan-to-value ratio',
						'Required for property valuation',
						'Affects loan amount sanctioned'
					],
					watchFor: [
						'Unauthorized construction or unapproved deviations reduce valuation significantly'
					],
					proTips: [
						'Have property documents ready',
						'Know the exact built-up or carpet area',
						'Have OC/CC information ready'
					]
				}
			},
			subsections: [
				{
					id: 'area-type',
					label: 'Area & Restrictions',
					pageIds: ['propertyLocation_LAP'],
					contextInfo: {
						title: 'Property Area & Restrictions',
						dsaGuidance: {
							summary:
								'Classify the area type and identify any special restrictions that affect lender eligibility.',
							keyPoints: [
								'Area type is the primary eligibility filter',
								'Planned areas have most lender options',
								'Special zones (Cantonment, CRZ, Tribal) restrict choices'
							],
							watchFor: ['Local colony / village properties have very few lender options for LAP'],
							proTips: [
								'Ask the applicant how locals describe the area',
								'Check if a development authority (DDA, HUDA, BDA) governs the area',
								'Converted land needs NA order for bank financing'
							]
						}
					}
				},
				{
					id: 'character',
					label: 'Character',
					pageIds: ['propertyCharacter_LAP'],
					contextInfo: {
						title: 'Property Character',
						dsaGuidance: {
							summary:
								'Property category, construction type, ownership, age, and area measurements.',
							keyPoints: [
								'Residential gets best LTV (60-70%), commercial (50-60%), industrial (40-55%)',
								'Ownership type (freehold/leasehold) affects eligibility',
								'Construction type and area determine valuation'
							],
							watchFor: ['Leasehold properties with <20 years remaining are difficult to finance'],
							proTips: [
								'Use measurements from sale deed',
								'Know the exact carpet vs built-up area',
								'Vacant plots have very limited LAP options'
							]
						}
					}
				},
				{
					id: 'condition-compliance',
					label: 'Condition & Compliance',
					pageIds: ['propertyCondition_LAP'],
					contextInfo: {
						title: 'Property Condition & Compliance',
						dsaGuidance: {
							summary:
								'Area-specific compliance questions — plan approval, OC/CC, RERA, NA conversion, municipal tax, and more.',
							keyPoints: [
								'Compliance questions change based on area type selected earlier',
								'OC/CC critical for flats and buildings in planned areas',
								'Revenue records important for converted and colony areas'
							],
							watchFor: [
								'Properties without OC/CC in planned areas face rejection from most lenders'
							],
							proTips: [
								'Check OC/CC with housing society or builder',
								'RERA applies mainly to developer projects in planned areas',
								'Village/panchayat properties rarely have formal certifications — that is expected'
							]
						}
					}
				},
				{
					id: 'legal-occupation',
					label: 'Legal & Occupation',
					pageIds: ['propertyLegal_LAP'],
					contextInfo: {
						title: 'Legal, Title & Occupation',
						dsaGuidance: {
							summary:
								'How the property was acquired, title documents, encumbrance status, legal disputes, and current occupation.',
							keyPoints: [
								'GPA transfers are rejected by most lenders (Supreme Court ruling)',
								'Original documents are mandatory for mortgage creation',
								'Existing mortgage means this is a Balance Transfer case'
							],
							watchFor: ['Properties under litigation are automatically rejected by ALL lenders'],
							proTips: [
								'Keep original sale deed accessible',
								'Get encumbrance certificate from sub-registrar',
								'Registered rental agreements are bankable income proof'
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
					summary: 'Details of all applicants help assess combined repayment capacity.',
					keyPoints: [
						'Combined income increases loan eligibility',
						'All property owners must be applicants',
						'Required for credit assessment'
					],
					watchFor: ['All registered property owners must be listed as co-applicants'],
					proTips: [
						'All property owners should apply',
						'Include earning family members',
						'Keep income documents ready'
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
							summary: 'Provide personal and contact information for each applicant.',
							keyPoints: [
								'Required for identity verification',
								'Needed for credit bureau check',
								'Establishes contact for processing'
							],
							watchFor: ['All registered property owners must be listed as co-applicants'],
							proTips: [
								'Use name as per PAN card',
								'Provide active mobile number',
								'Email used for loan communications'
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
							summary: 'Define how the applicants are related to each other.',
							keyPoints: [
								'Validates co-applicant eligibility',
								'Required for legal documentation',
								'Affects property ownership structure'
							],
							watchFor: ['Non-family co-applicants may face stricter scrutiny from lenders'],
							proTips: [
								'Spouse is the ideal co-applicant',
								'Blood relations are generally accepted',
								'Business partners may need extra documents'
							]
						}
					}
				},
				// Single-applicant Applicant Profile — moved into the Applicants section
				// so the sidebar lists it between Who's Applying and GPA.
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
								'Rental income from the mortgaged property may not be counted by all lenders'
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
								'Income determines EMI capacity',
								'Credit history affects interest rate',
								'Existing EMIs reduce eligibility'
							],
							watchFor: [
								'Rental income from the mortgaged property may not be counted by all lenders'
							],
							proTips: [
								'Profile is the first tab inside each applicant modal',
								'Declare all income sources',
								'Check CIBIL score before applying'
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
						'Your profile, income, employment, and credit details help determine loan eligibility and terms.',
					keyPoints: [
						'Income determines EMI affordability',
						'Credit score affects interest rate',
						'Existing obligations reduce eligibility'
					],
					watchFor: ['Rental income from the mortgaged property may not be counted by all lenders'],
					proTips: [
						'Include all active income sources',
						'Check your CIBIL score before applying',
						'Keep latest salary slips and ITRs handy'
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
						title: 'Employment & Income',
						dsaGuidance: {
							summary:
								'Select all the ways you earn income so we can assess your total repayment capacity.',
							keyPoints: [
								'Multiple income sources increase eligibility',
								'Each source needs specific documentation',
								'Helps match with the right loan products'
							],
							watchFor: [
								'Rental income from the mortgaged property may not be counted by all lenders'
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
							summary: 'Provide detailed information for each income source you selected.',
							keyPoints: [
								'Accurate figures ensure realistic offers',
								'Banks verify income against documents',
								'Higher documented income means better terms'
							],
							watchFor: [
								'Mismatch between declared and documented income is a common rejection reason'
							],
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
								if (profiles.includes('pension')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Pension: full amount counted, but max tenure limited by age'
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
							summary:
								'Your credit score significantly impacts the interest rate and loan amount offered.',
							keyPoints: [
								'750+ score gets best interest rates',
								'Low score may limit lender options',
								'Existing loans affect available credit'
							],
							watchFor: [
								'Multiple recent loan inquiries on CIBIL can reduce score and hurt approval'
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
								'Details of your current loans and credit limits help calculate available repayment capacity.',
							keyPoints: [
								'Running EMIs reduce eligible loan amount',
								'Credit utilization affects credit score',
								'Closing small loans can boost eligibility'
							],
							watchFor: ['Undisclosed running EMIs found during verification lead to rejection'],
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
			/*it shows only with BT and BT with TOP-UP (Alok)*/
			showWhen: (answers) => answers['loanType'] !== 'New Loan',
			contextInfo: {
				title: 'Loan Details',
				dsaGuidance: {
					summary:
						'Current loan information, balance transfer options, and your loan requirements.',
					keyPoints: [
						'Helps calculate outstanding amount for transfer',
						'Top-up depends on available equity',
						'Determines monthly EMI burden'
					],
					watchFor: [
						'Outstanding amount from current lender must be verified against latest statement'
					],
					proTips: [
						'Get latest statement from current bank',
						'LAP typically offers 50-70% of property value',
						'Longer tenure means lower EMI but more interest'
					]
				}
			},
			subsections: [
				{
					id: 'current-loan-info',
					label: 'Current Loan Info',
					pageIds: ['existingDetailsPage'],
					// Mirror page-level gate in lapLoan/pages.ts (buildExistingDetailsPage).
					// New-Loan flows have no existing loan to capture.
					showWhen: (answers) =>
						['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'Current Loan Info',
						dsaGuidance: {
							summary: 'Provide information about your current LAP or mortgage.',
							keyPoints: [
								'Outstanding amount determines transfer value',
								'Payment history affects new terms',
								'Required for NOC from existing bank'
							],
							watchFor: [
								'Outstanding amount from current lender must be verified against latest statement'
							],
							proTips: [
								'Have loan account statement ready',
								'Know exact outstanding balance',
								'Check remaining tenure and EMI amount'
							]
						}
					}
				},
				{
					id: 'bt-topup',
					label: 'BT & Top-Up',
					pageIds: ['topUpDetailsPage'],
					// Mirror page-level gate in lapLoan/pages.ts (buildTopUpDetailsPage).
					// Same BT/Top-up scope as current-loan-info above.
					showWhen: (answers) =>
						['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only'].includes(
							answers['loanType'] as string
						),
					contextInfo: {
						title: 'BT & Top-Up',
						dsaGuidance: {
							summary: 'Specify property value, top-up amount, and preferred tenure.',
							keyPoints: [
								'Amount depends on available equity',
								'Purpose may affect approval',
								'Tenure can be aligned with base loan'
							],
							watchFor: ['Top-up amount depends on available equity after outstanding is cleared'],
							proTips: [
								'Calculate equity in property first',
								'Business use may need extra docs',
								'Consider combining with balance transfer'
							]
						}
					}
				}
				/* loanRequirementPage moved to top of wizard — see 'loan-requirement' section */
			]
		}
	]
};
