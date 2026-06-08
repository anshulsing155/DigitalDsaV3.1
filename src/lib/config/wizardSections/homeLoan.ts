import type { WizardSectionConfig, DsaGuidance } from '$lib/types/wizard';

export const homeLoanSections: WizardSectionConfig = {
	loanProduct: 'Home Loan',
	sections: [
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Getting Started',
				dsaGuidance: {
					summary:
						'Captures loan type, applicant classification, and property location. These answers drive the entire form flow — pages shown, questions asked, and bank eligibility.',
					keyPoints: [
						'Loan type (New / BT / BT+Top-up / Top-up) determines which pages appear',
						'NRI selection triggers additional documentation requirements',
						'Property location (state + city) affects stamp duty, LTV, and lender availability'
					],
					watchFor: [
						'BT + Top-up is NOT the same as Top-up Only — different bank policies',
						'Previously rejected applicants: check reason before proceeding',
						'Incorrect state/city will surface wrong zone and compliance questions'
					],
					proTips: [
						'Unsure BT vs BT+Top-up? Start BT+Top-up — easier to drop top-up later than add it',
						'Metro cities (Mumbai, Delhi, Bangalore, etc.) have higher loan limits at most banks'
					]
				}
			},
			subsections: [
				{
					id: 'case-assessment',
					label: 'Case Assessment',
					pageIds: ['caseIntake_homeLoan'],
					contextInfo: {
						title: 'Case Assessment',
						dsaGuidance: {
							summary:
								'First page of the form. Captures the assessment status — whether this is a fresh case, recently rejected, or has an existing sanction. Helps identify hidden history and flag lenders to watch.',
							keyPoints: [
								'Fresh assessment: standard flow, no prior lender baggage',
								'Rejected/sanctioned: select which lenders — they will be highlighted in offer comparison',
								'This helps DSA detect if loan seeker is hiding prior rejections'
							],
							watchFor: [
								'If applicant says "Fresh" but has recent hard inquiries on CIBIL, something is hidden',
								'"Sanctioned, Not Disbursed" means an offer exists — understand why it was not accepted before proceeding'
							],
							proTips: [
								'Always probe gently — many applicants hide rejections out of embarrassment',
								`If "Don't Know" is selected, flag for follow-up after CIBIL pull`
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const status = a['assessmentStatus'] as string;
							if (status === 'rejected') {
								g.keyPoints = [
									'Rejected recently — selected lenders will be highlighted in offer comparison'
								];
								g.watchFor = [
									'Check cooling-off period (30-90 days at most banks before re-applying)'
								];
							}
							if (status === 'sanctioned_not_disbursed') {
								g.keyPoints = ['Has existing sanction — understand why terms were not acceptable'];
								g.watchFor = [
									'Compare existing offer terms against new offers to identify better deals'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'location',
					label: 'Location',
					pageIds: ['propertyLocation_homeLoan'],
					// Mirrors the page-level gate on `propertyLocation_homeLoan`
					// (`assessmentStatus != ''`) so the sidebar chip doesn't appear before
					// case intake is answered. Added 2026-06-02 (S212) as part of the D13
					// wizard-sidebar/page-gate-pairing audit per spec
					// TECH-DEBT-CLEANUP-2026-05-31.md §3 D13. Without this gate the chip
					// rendered while the page itself was hidden — clicking would land on a
					// page that immediately hides itself. `assessmentStatus` is required on
					// the case-intake page so the gap is brief in practice, but the
					// sidebar should still tell the truth.
					showWhen: (answers) => (answers['assessmentStatus'] as string) !== '',
					contextInfo: {
						title: 'Property & Residence Location',
						dsaGuidance: {
							summary:
								'Captures property state/city and residence state/city. These drive zone-specific compliance questions, stamp duty, and lender branch mapping.',
							keyPoints: [
								'Property state determines coastal zone (CRZ) and special area questions',
								'Residence location maps to the servicing bank branch',
								'Both locations together determine if remote processing applies'
							],
							watchFor: [
								'Coastal states (Goa, Kerala, Maharashtra coast) trigger CRZ zone questions',
								'Property in one state + residence in another may limit lender options',
								'Tier-3 cities may have lower property valuation caps'
							],
							proTips: [
								'If property location is undecided, pick the most likely city — you can change it later without restarting the form'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							if (a['propertyIdentified'] === 'No') {
								g.summary =
									'Property not identified yet — capture the intended State and City where the customer is searching. Routes to pre-approval flow.';
								g.proTips = [
									'Pre-approval gives the applicant a budget range before property hunting',
									"If the customer is exploring multiple cities, pick the most likely one — it can be updated later without restarting the form"
								];
							}
							if (a['propertyIdentified'] === 'Yes') {
								g.keyPoints = [
									'Property identified — both property and residence locations will be captured'
								];
							}
							return g;
						}
					}
				}
			]
		},
		{
			id: 'property',
			label: 'Property',
			showWhen: (answers) =>
				answers['propertyIdentified'] === 'Yes' || answers['loanType'] != 'New Loan',
			contextInfo: {
				title: 'Property Details',
				dsaGuidance: {
					summary:
						'Technical property details that banks use for valuation, LTV calculation, and risk assessment. Only shows when property is identified.',
					keyPoints: [
						'Property type (Flat / House / Plot) determines valuation method',
						'Construction status (Ready / Under Construction) affects disbursement schedule',
						'Age of building impacts loan tenure ceiling at some banks'
					],
					watchFor: [
						'Under Construction properties need valid RERA registration',
						'Properties over 25 years old may face rejection at certain banks',
						'Converted residential plots may need additional zone clearance'
					],
					proTips: [
						'If property is UC (Under Construction), confirm builder has bank tie-ups — this speeds up processing significantly'
					]
				}
			},
			subsections: [
				{
					id: 'property-character',
					label: 'Property Character',
					pageIds: ['propertyCharacter_homeLoan'],
					showWhen: (answers) =>
						answers['propertyIdentified'] === 'Yes' || answers['loanType'] !== 'New Loan',
					contextInfo: {
						title: 'Property Character',
						dsaGuidance: {
							summary:
								'Construction type, property stage, age, and area measurements. These directly impact valuation method and structural risk assessment.',
							keyPoints: [
								'Construction type (RCC / Load Bearing / Pre-fab) affects structural assessment',
								'Property stage (Ready to Move / Under Construction) drives disbursement schedule',
								'Carpet area vs built-up area distinction matters for valuation'
							],
							watchFor: [
								'Pre-fab and load-bearing structures have lower LTV at most banks',
								'Properties over 25 years old may face rejection at certain banks',
								'Carpet area mismatch with documents = valuation dispute'
							],
							proTips: [
								'Get the approved plan copy early — banks will ask for it',
								'For resale flats, check if the society has a completion certificate'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const stage = a['PropertyStage'] as string;
							const conType = a['constructionType'] as string;
							const propType = a['propertyType'] as string;
							if (stage === 'Under Construction') {
								g.keyPoints = [
									'Under Construction — RERA, builder track record, and construction progress will be asked'
								];
								g.watchFor = [
									'UC disbursement is stage-linked — bank releases funds as construction progresses'
								];
							}
							if (stage === 'Ready to Move') {
								g.keyPoints = ['Ready to Move — OC/CC availability and property age are critical'];
							}
							if (conType === 'load_bearing' || conType === 'prefabricated') {
								g.watchFor = [
									...(g.watchFor || []),
									`${conType === 'load_bearing' ? 'Load-bearing' : 'Pre-fab'} structure — expect lower LTV (70-75%) and limited lender options`
								];
							}
							if (propType === 'Plot') {
								g.summary =
									'Plot purchase — only land cost is financed. Construction loan is separate.';
								g.keyPoints = ['Plot loans have lower LTV (60-70%) compared to built property'];
							}
							if (propType === 'Independent House / Villa') {
								g.proTips = [
									'Independent houses need separate land and construction valuation — ensure both documents are ready'
								];
							}
							const age = Number(a['propertyAge']);
							if (age > 20) {
								g.watchFor = [
									...(g.watchFor || []),
									`Property age ${age}+ years — some banks cap at 25 years for structural risk`
								];
							}
							return g;
						}
					}
				},
				{
					id: 'compliance-legal',
					label: 'Compliance & Legal',
					pageIds: ['complianceLegal_homeLoan'],
					showWhen: (answers) =>
						answers['purchaseType'] !== 'direct_from_authority' &&
						(answers['propertyIdentified'] === 'Yes' || answers['loanType'] !== 'New Loan'),
					contextInfo: {
						title: 'Property Condition & Compliance',
						dsaGuidance: {
							summary:
								'Compliance status, approvals, RERA registration, zone classification, and municipal records. Banks need these to confirm the property is legally clear.',
							keyPoints: [
								'OC/CC (Occupancy / Completion Certificate) is mandatory for RTM properties',
								'RERA registration is mandatory for Under Construction in most states',
								'Zone classification must match the actual property use (residential, commercial, mixed)'
							],
							watchFor: [
								'Missing OC/CC = rejection at most banks for Ready to Move properties',
								'Unauthorized additions or alterations can block approval',
								'Revenue record mismatch with property documents = legal risk',
								'Special area restrictions (CRZ, forest, cantonment) can delay or block approval'
							],
							proTips: [
								'If OC/CC is pending, check if builder has applied — some banks accept "applied" status with conditions',
								'For older societies, check conveyance deed status — banks increasingly require it'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const stage = a['PropertyStage'] as string;
							if (stage === 'Under Construction') {
								g.keyPoints = [
									'Under Construction — RERA registration, construction progress, and builder approvals are the focus'
								];
								g.proTips = [
									'Check if builder is approved by your target bank — speeds up technical verification'
								];
							}
							if (stage === 'Ready to Move') {
								g.keyPoints = [
									'Ready to Move — OC/CC, municipal tax receipts, and any unauthorized additions are key checks'
								];
							}
							return g;
						}
					}
				}
			]
		},
		{
			id: 'legal-seller',
			label: 'Legal & Seller',
			showWhen: (answers) =>
				answers['loanType'] === 'New Loan' &&
				answers['propertyIdentified'] === 'Yes' &&
				answers['purchaseType'] !== 'direct_from_builder',
			contextInfo: {
				title: 'Legal & Seller Verification',
				dsaGuidance: {
					summary:
						'Legal document status and seller details. Banks need clear title chain and verified seller identity before disbursement.',
					keyPoints: [
						'Title chain must be clear for at least 13-30 years (varies by bank)',
						'Seller details must match property documents exactly',
						'Encumbrance certificate must be current (within 30 days)'
					],
					watchFor: [
						'Multiple sellers (inherited property) need all signatures and NOCs',
						'Power of Attorney sales have restrictions at many banks',
						'Society properties without conveyance deed face limited lender options'
					],
					proTips: [
						'Start legal document collection before filing — this is the #1 cause of delays',
						'For resale, get seller NOC from existing lender upfront if property has a mortgage'
					]
				}
			},
			subsections: [
				{
					id: 'seller-transaction',
					label: 'Seller & Transaction',
					pageIds: ['sellerTransaction_homeLoan'],
					showWhen: (answers) =>
						answers['propertyIdentified'] === 'Yes' &&
						['New Loan'].includes(answers['loanType'] as string) &&
						['resale_normal', 'resale_endorsement'].includes(answers['purchaseType'] as string),
					contextInfo: {
						title: 'Seller & Transaction Details',
						dsaGuidance: {
							summary:
								'Seller identity, ownership type, acquisition method, and existing loan status. Banks verify seller details before processing disbursement.',
							keyPoints: [
								'Seller ownership type (sole / joint / inherited) determines required documents',
								'POA (Power of Attorney) sales need additional verification at most banks',
								'If seller has an existing loan, NOC from their bank is mandatory'
							],
							watchFor: [
								'Property under litigation = immediate rejection at all banks',
								'Inherited property needs succession certificate / legal heir certificate',
								'POA sales restricted by many banks — verify with target lender first'
							],
							proTips: [
								'For resale with existing loan, get seller bank NOC and outstanding statement early — this is the critical path item',
								'If seller is NRI, anticipate 4-6 weeks extra for POA/documentation'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const purchaseType = a['purchaseType'] as string;
							if (purchaseType === 'resale_normal') {
								g.summary =
									'Resale (normal) — seller identity, ownership chain, and title verification are the focus.';
								g.keyPoints = ['Get seller PAN, address proof, and property chain documents'];
							}
							if (purchaseType === 'resale_endorsement') {
								g.summary =
									'Resale via endorsement — ensure the endorsement is registered and builder has approved the transfer.';
								g.keyPoints = [
									'Endorsement letter from builder + original allotment letter needed'
								];
								g.watchFor = [
									"Some banks don't accept endorsement transfers — verify with target bank first"
								];
							}
							if (purchaseType === 'direct_from_builder') {
								g.summary =
									'Direct from builder — focus on builder credentials, RERA, and agreement terms.';
								g.keyPoints = [
									'Builder agreement copy + RERA certificate + approved plan are essential'
								];
								g.proTips = [
									'Check if builder has existing tie-up with your target bank — accelerates processing'
								];
							}
							const sellerOnLoan = a['sellerOnLoan'] as string;
							if (sellerOnLoan === 'Yes') {
								g.watchFor = [
									...(g.watchFor || []),
									'Seller has existing loan — their bank NOC and loan closure timeline must be coordinated with your disbursement'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'authority-details',
					label: 'Authority Details',
					pageIds: ['sellerTransaction_authority_homeLoan'],
					showWhen: (answers) =>
						answers['purchaseType'] === 'direct_from_authority' &&
						answers['loanType'] === 'New Loan',
					contextInfo: {
						title: 'Authority Allotment Details',
						dsaGuidance: {
							summary:
								'Development authority allotment details — authority name, allotment letter status, payment history, and possession certificate.',
							keyPoints: [
								'Allotment letter (original or certified copy) is the primary document',
								'All payment receipts to authority must be available',
								'Possession certificate or TDR confirms physical handover'
							],
							watchFor: [
								'Outstanding dues to authority can block loan disbursement',
								'Allotment letter not available = case cannot proceed',
								'Some authorities have blacklisted properties — verify before filing'
							],
							proTips: [
								'Get NOC from authority BEFORE filing the loan application — this is where most delays happen',
								'If authority dues are partially paid, get a statement showing exact outstanding'
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
						'Multi-applicant setup. Each applicant gets their own profile, income, and credit assessment. Combined eligibility is calculated from all applicants.',
					keyPoints: [
						'Adding co-applicants increases combined income and eligibility',
						'Each applicant needs separate income documentation',
						'Relationship between applicants affects property title requirements'
					],
					watchFor: [
						'Non-family co-applicants (friends, business partners) are rejected by most banks',
						'All co-applicants must be co-owners on the property title',
						'Credit issues on ANY applicant can impact the entire case'
					],
					proTips: [
						'Spouse as co-applicant is universally accepted and can unlock tax benefits under Sec 80C / 24(b)',
						'Add high-income earner as primary applicant for better rate negotiation'
					]
				}
			},
			subsections: [
				{
					id: 'whos-applying',
					label: "Who's Applying",
					pageIds: ['tellUs_homeLoan'],
					applicantStep: 0,
					contextInfo: {
						title: "Who's Applying",
						dsaGuidance: {
							summary:
								'Basic identity for each applicant. Name, DOB, gender, and contact. This data feeds into KYC and credit bureau checks.',
							keyPoints: [
								'Name must match PAN card exactly — mismatches cause rejection',
								'DOB determines age-at-maturity (affects max tenure)',
								'Gender impacts stamp duty concession in some states (e.g., Delhi, Haryana)'
							],
							watchFor: [
								'Age below 21 = not eligible at most banks',
								'Age above 58 (salaried) or 65 (self-employed) limits tenure',
								'Contact details are optional — no PII required by system'
							],
							proTips: [
								'For joint applications, enter the higher earner as Applicant 1 — banks use primary applicant for rate card lookup'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const count = a['__applicantCount'] as number;
							if (count > 1) {
								g.summary = `${count} applicants added. Each gets their own profile, income, and credit assessment. Combined eligibility will be calculated.`;
								g.keyPoints = [
									'Enter the highest earner as Applicant 1 — this drives the primary rate card'
								];
								g.proTips = [
									'Complete all applicants before moving on — incomplete applicants block the assessment'
								];
							}
							const residency = a['residencyStatus'] as string;
							if (residency === 'NRI') {
								g.watchFor = [
									'NRI applicant — overseas address, FEMA compliance, and NRE/NRO account details will be needed'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'relationships',
					label: 'Relationships',
					pageIds: ['tellUs_homeLoan'],
					applicantStep: 1,
					showWhen: (answers) => (answers['__individualApplicantCount'] as number) > 1,
					contextInfo: {
						title: 'Applicant Relationships',
						dsaGuidance: {
							summary:
								'Defines co-applicant relationships. Banks have strict rules on who can co-borrow — this determines if the combination is processable.',
							keyPoints: [
								'Spouse is universally accepted as co-applicant',
								'Parent-child is accepted but may have age restrictions',
								'Siblings require additional justification at some banks'
							],
							watchFor: [
								'Friends/business partners as co-applicants = rejection at most banks',
								'Live-in partners are not accepted as co-applicants',
								'Same co-applicant cannot be on multiple active home loans at some banks'
							],
							proTips: [
								'If co-applicant relationship is borderline, check target bank policy before proceeding — saves rework'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const count = a['__individualApplicantCount'] as number;
							if (count === 2) {
								g.keyPoints = [
									'2 applicants — define the relationship between them (spouse, parent-child, sibling, etc.)'
								];
							}
							if (count > 2) {
								g.keyPoints = [
									`${count} applicants — define relationship of each co-applicant to Applicant 1`
								];
								g.watchFor = [
									'With 3+ applicants, ensure all relationships are bank-acceptable — some banks limit co-applicants to 3'
								];
							}
							return g;
						}
					}
				},
				// Single-applicant Applicant Profile — moved into the Applicants section
				// so the sidebar lists it between Who's Applying and GPA. Matches the
				// user's mental model.
				{
					id: 'applicant-profile-single',
					label: 'Applicant Profile',
					pageIds: ['applicantProfilePage'],
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Applicant Profile',
						dsaGuidance: {
							summary:
								'Education, caste category, existing property ownership, and residence details. Banks use these for segment-specific schemes.',
							keyPoints: [
								'Education level affects eligible loan products at some banks',
								'SC/ST/OBC category may qualify for government subsidy schemes (PMAY)',
								'Existing property ownership affects LTV for 2nd home purchase'
							],
							watchFor: [
								'2nd home loan has lower LTV (typically 75% vs 80-90% for 1st home)',
								'NRI profile requires overseas address and FEMA compliance'
							],
							proTips: [
								'Check PMAY eligibility early — subsidy can be up to 2.67L and must be claimed at sanction stage'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const empCat = a['employmentCategory'] as string;
							if (empCat === 'Salaried') {
								g.keyPoints = [
									'Salaried applicant — company profile and employment stability matter for rate negotiation'
								];
							}
							if (empCat === 'Self Employed') {
								g.keyPoints = [
									'Self-employed — business vintage (years) and ITR consistency are key eligibility factors'
								];
								g.watchFor = ['Business vintage < 3 years may limit options to NBFCs'];
							}
							const residency = a['residencyStatus'] as string;
							if (residency === 'NRI') {
								g.watchFor = [
									...(g.watchFor || []),
									'NRI — overseas address details and power of attorney may be needed for property documentation'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'gpa-nri',
					label: 'GPA (Power of Attorney)',
					pageIds: ['tellUs_homeLoan'],
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
					pageIds: ['tellUs_homeLoan'],
					applicantStep: 3,
					showWhen: (answers) => (answers['__applicantCount'] as number) > 1,
					contextInfo: {
						title: 'Profile & Financials',
						dsaGuidance: {
							summary:
								'Per-applicant modal: profile, income sources, credit score, and obligations. Each applicant fills this independently inside the modal.',
							keyPoints: [
								'Profile tab comes first — education, religion, existing properties',
								'Income tab shows only the profiles selected earlier',
								'Credit and obligations tabs assess repayment capacity'
							],
							watchFor: [
								'If any applicant has CIBIL below 650, the case may need manual routing',
								'Undisclosed obligations found later in bureau check = credibility issue',
								'All applicants must be assessed — banks reject incomplete multi-applicant cases'
							],
							proTips: [
								'Complete the primary applicant first — their profile determines the base rate card',
								'If one applicant has low credit, consider restructuring who is primary vs co-applicant'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const profiles = a['selectedIncomeProfiles'] as string[];
							if (profiles && profiles.length > 0) {
								g.keyPoints = [
									`${profiles.length} income source${profiles.length > 1 ? 's' : ''} selected — each will need separate documentation`
								];
								if (profiles.includes('salaried_regular')) {
									g.proTips = ['Salaried income: keep last 3 months pay slips + Form 16 ready'];
								}
								if (
									profiles.includes('business_proprietorship') ||
									profiles.includes('business_partnership') ||
									profiles.includes('director_company') ||
									profiles.includes('professional_practice')
								) {
									g.proTips = [
										...(g.proTips || []),
										'Self-employed: last 2 years ITR + computation + balance sheet required'
									];
								}
							}
							return g;
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
						'Single-applicant flow: profile, income, credit, and obligations spread across dedicated pages. This determines the loan amount and rate the applicant qualifies for.',
					keyPoints: [
						'Income assessment uses bank-specific haircuts (salaried: 0%, self-employed: up to 30%)',
						'FOIR (Fixed Obligation to Income Ratio) cap varies by bank and income level',
						'Credit score 750+ gets the best rate brackets at most banks'
					],
					watchFor: [
						'Undocumented income (cash, informal) cannot be used for eligibility',
						'High existing obligations reduce net eligible amount significantly',
						'Credit inquiries in last 30 days may flag the applicant'
					],
					proTips: [
						'For self-employed, use average of last 2 years ITR — some banks use best of 2',
						'Closing a small credit card or personal loan before filing can boost eligibility 10-15%'
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
							summary:
								'Income source selection page. Pick all applicable types — each source adds to combined eligibility. 12 income types supported.',
							keyPoints: [
								'Multiple income sources significantly increase eligibility',
								'Each type has different documentation requirements',
								'Rental income needs registered rent agreement or bank statements'
							],
							watchFor: [
								'"No current income" is valid but limits options to asset-backed loans',
								'Agricultural income is tax-free but counted differently by banks',
								'Commission-based income needs 2 years history minimum'
							],
							proTips: [
								"Don't skip rental or freelance income — even small amounts boost FOIR capacity",
								'If applicant is between jobs, use "no current income" — some banks still process based on assets'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const profiles = a['selectedIncomeProfiles'] as string[];
							if (profiles && profiles.length > 0) {
								const names = profiles.map((p) => p.replace(/_/g, ' ')).join(', ');
								g.summary = `${profiles.length} income source${profiles.length > 1 ? 's' : ''} selected: ${names}. Each will be assessed with bank-specific haircuts.`;
								if (profiles.length >= 3) {
									g.proTips = [
										'3+ income sources — document preparation will be extensive, but combined eligibility will be significantly higher'
									];
								}
							}
							if (a['__hasOnlyNoCurrentIncome']) {
								g.summary =
									'No current income selected — applicant will be assessed on assets and collateral only. Limited lender options.';
								g.watchFor = [
									'Asset-backed loans typically have higher interest rates and stricter LTV'
								];
							}
							return g;
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
							summary:
								'Detailed income figures for each selected source. These numbers feed directly into bank-specific eligibility calculations with income-type haircuts.',
							keyPoints: [
								'Salaried: use gross monthly salary (before deductions)',
								'Self-employed: net profit from latest ITR',
								'Business turnover and profit margin both matter'
							],
							watchFor: [
								'Income must be documentable — banks will verify against pay slips / ITR / bank statements',
								'Large salary jump (>30%) in last 6 months may need explanation letter',
								'Cash income cannot be included in bank assessment'
							],
							proTips: [
								'For businesses, average of 2-year profit is safer than latest year alone — avoids issues if latest year dipped',
								'Include incentives and bonuses in salary if they show on pay slip consistently'
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
								if (profiles.includes('professional_practice')) {
									g.keyPoints = [
										...(g.keyPoints || []),
										'Professional income: enter gross receipts minus professional expenses'
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
					label: 'Credit Score',
					pageIds: ['creditScorePage'],
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Credit Score & Behaviour',
						dsaGuidance: {
							summary:
								'Credit score and credit behaviour inputs. Score directly determines rate bracket and lender eligibility.',
							keyPoints: [
								'750+ score: eligible at all banks with best rates',
								'700-749: eligible at most banks, slightly higher rates',
								'Below 650: limited to select NBFCs, significantly higher rates'
							],
							watchFor: [
								'Multiple loan inquiries in last 90 days = "credit hungry" flag',
								'EMI bounces in last 12 months can cause rejection regardless of score',
								'DPD (Days Past Due) > 30 is a red flag for most banks'
							],
							proTips: [
								'If score is borderline (680-720), ask the applicant to clear any small overdue before you file — even 20 points can change rate brackets'
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
									'Below 700 — limited to select lenders. Check for any quick score improvements (clear overdue, reduce credit utilization)'
								];
							} else if (score > 0) {
								g.summary = `Credit score ${score} — needs attention. Only select NBFCs will consider this application.`;
								g.watchFor = [
									'Score below 650 — very limited options. Consider credit repair before filing, or add a co-applicant with strong credit'
								];
							} else if (score === 0 || isNaN(score)) {
								g.summary = "Enter the applicant's CIBIL score to see lender eligibility guidance.";
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
					showWhen: (answers) => (answers['__applicantCount'] as number) <= 1,
					contextInfo: {
						title: 'Existing Loans & Obligations',
						dsaGuidance: {
							summary:
								'List all running EMIs and credit obligations. Banks use these to calculate FOIR — the ratio of obligations to income. Higher obligations = lower eligible loan.',
							keyPoints: [
								'Running EMIs directly reduce the max home loan EMI you can get',
								'Credit card outstanding counts as an obligation (5% of limit used as notional EMI)',
								'Personal loans have the highest impact on FOIR'
							],
							watchFor: [
								'Undisclosed loans will surface in bureau check — always capture all',
								'Loan as guarantor also counts as obligation at some banks',
								'Recently closed loans (< 3 months) may still show in bureau'
							],
							proTips: [
								'If FOIR is tight, consider pre-closing a high-EMI personal loan before filing — even one closure can add 5-10L to eligibility'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const loanAmt = Number(a['propCost']);
							if (loanAmt > 0) {
								g.keyPoints = [
									`Target loan: ${(loanAmt / 100000).toFixed(1)}L — total obligations must stay within FOIR limit to qualify`
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
					summary:
						'Financial structuring — property cost, loan amount, tenure, and existing loan details (for BT/Top-up). These determine the final offer from banks.',
					keyPoints: [
						'LTV (Loan to Value) cap varies: 75-90% depending on loan amount and property type',
						'Maximum tenure is capped by applicant age at maturity (60-65 for salaried, 65-70 for SE)',
						'Stamp duty and registration are NOT included in loan amount at most banks'
					],
					watchFor: [
						'Property valuation by bank may differ from agreed price — loan adjusted accordingly',
						'For BT cases, outstanding amount must match lender statement exactly',
						'Top-up amount is limited to property appreciation since original purchase'
					],
					proTips: [
						'Structure the case at 80% LTV even if bank allows 90% — lower LTV gets better rates and faster approval'
					]
				}
			},
			subsections: [
				{
					id: 'deal-financials',
					label: 'Deal & Financials',
					pageIds: ['dealFinancials_homeLoan'],
					showWhen: (answers) =>
						answers['loanType'] === 'New Loan' && answers['propertyIdentified'] === 'Yes',
					contextInfo: {
						title: 'Deal & Financials',
						dsaGuidance: {
							summary:
								'Agreement value, market value, stamp duty, and own contribution. The gap between agreement and market value matters for valuation.',
							keyPoints: [
								'Agreement value = what buyer pays the seller (registered amount)',
								"Market value = bank's assessed value (may differ from agreement)",
								'Loan is sanctioned on the LOWER of agreement or market value'
							],
							watchFor: [
								'If agreement value is much lower than circle rate, bank may flag it',
								'Black component (undisclosed cash) cannot be part of the deal — banks only finance white transactions',
								'Under-construction payments must follow builder payment schedule'
							],
							proTips: [
								'Always get the deal value documented with builder/seller before filing — prevents back-and-forth later'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const propCost = Number(a['propCost']);
							const marketVal = Number(a['marketValue']);
							const deposit = Number(a['deposit']);
							if (propCost > 0 && marketVal > 0) {
								const diff = Math.abs(propCost - marketVal);
								const pctDiff = (diff / Math.max(propCost, marketVal)) * 100;
								if (pctDiff > 15) {
									g.watchFor = [
										`Agreement (${(propCost / 100000).toFixed(0)}L) and market value (${(marketVal / 100000).toFixed(0)}L) differ by ${pctDiff.toFixed(0)}% — bank may flag this gap`
									];
								}
							}
							if (propCost > 0 && deposit > 0) {
								const ltv = ((propCost - deposit) / propCost) * 100;
								if (ltv > 80) {
									g.keyPoints = [
										`LTV ~${ltv.toFixed(0)}% — above 80%. Some banks may require mortgage guarantee or higher rate`
									];
								} else {
									g.proTips = [
										`LTV ~${ltv.toFixed(0)}% — healthy ratio. Should qualify for standard rate brackets`
									];
								}
							}
							const stage = a['PropertyStage'] as string;
							if (stage === 'Under Construction') {
								g.keyPoints = [
									...(g.keyPoints || []),
									'UC property — disbursement will be in stages linked to construction milestones'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'existing-loan-details',
					label: 'Existing Loan Details',
					pageIds: ['btExistingLoan_homeLoan'],
					showWhen: (answers) => answers['loanType'] !== 'New Loan',
					contextInfo: {
						title: 'Existing Loan Details',
						dsaGuidance: {
							summary:
								'Details of the existing home loan being transferred. Existing lender, outstanding, ROI, and EMI track record.',
							keyPoints: [
								'Outstanding amount must match latest lender statement',
								'Current ROI determines if BT makes financial sense',
								'EMI track record (12-month history) is critical for approval'
							],
							watchFor: [
								'Any EMI bounce in last 12 months = BT rejection risk',
								'Foreclosure charges at current bank (typically 2-4% for floating, higher for fixed)',
								'If ROI difference is < 0.5%, BT may not be worth the processing cost'
							],
							proTips: [
								'Get a 12-month bank statement showing EMI debits — this is the #1 document banks ask for in BT cases'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const lt = a['loanType'] as string;
							if (lt === 'Balance Transfer Only') {
								g.summary =
									'Balance Transfer Only — capture existing loan details accurately. The new bank will match or beat the current rate.';
							}
							if (lt === 'Balance Transfer With Top-up') {
								g.summary =
									'BT + Top-up — existing loan details here, top-up requirements on the next page.';
								g.keyPoints = [
									'After BT details, you will specify the top-up amount and purpose separately'
								];
							}
							if (lt === 'Top-up Only') {
								g.summary =
									'Top-up Only — existing loan stays with current lender. Capture current outstanding for headroom calculation.';
								g.proTips = [
									'Top-up headroom = (current market value x LTV) - outstanding. Get a recent valuation estimate.'
								];
							}
							const roi = Number(a['existingInterestRate']);
							if (roi > 0) {
								if (roi >= 9.5) {
									g.proTips = [
										...(g.proTips || []),
										`Current ROI ${roi}% — strong BT case. Most banks offer 8.5-9% range currently`
									];
								} else if (roi <= 8.5) {
									g.watchFor = [
										`Current ROI ${roi}% — already competitive. BT savings may be marginal — check if processing cost is justified`
									];
								}
							}
							const bounces = a['emiBounceHistory'] as string;
							if (bounces === 'yes_recent') {
								g.watchFor = [
									...(g.watchFor || []),
									'Recent EMI bounces reported — this is a BT rejection risk at most banks'
								];
							}
							return g;
						}
					}
				},
				{
					id: 'loan-requirements',
					label: 'Loan Requirements',
					pageIds: ['loanRequirements_homeLoan'],
					showWhen: (answers) => answers['loanType'] !== 'New Loan',
					contextInfo: {
						title: 'Loan Requirements',
						dsaGuidance: {
							summary:
								'Additional funding requirements for BT and Top-up cases. Top-up amount depends on property appreciation and applicant eligibility.',
							keyPoints: [
								'Top-up is additional disbursement over and above BT amount',
								'Maximum top-up = (current market value × LTV) - outstanding',
								'Top-up can be used for any purpose (renovation, education, etc.)'
							],
							watchFor: [
								'Top-up rate may differ from BT rate at some banks',
								'If property has not appreciated, top-up headroom may be zero',
								"Some banks don't offer top-up with BT — check before filing"
							],
							proTips: [
								'Calculate the top-up headroom before promising the client — property valuation by bank is the constraint, not the asking price'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const lt = a['loanType'] as string;
							const outstanding = Number(a['principalOutstanding']);
							const topUp = Number(a['topUpAmount']);
							if (lt === 'Balance Transfer With Top-up' && outstanding > 0 && topUp > 0) {
								const total = outstanding + topUp;
								g.keyPoints = [
									`Total BT+Top-up: ${(total / 100000).toFixed(1)}L (BT: ${(outstanding / 100000).toFixed(1)}L + Top-up: ${(topUp / 100000).toFixed(1)}L)`
								];
							}
							if (lt === 'Top-up Only' && topUp > 0) {
								g.keyPoints = [
									`Top-up amount: ${(topUp / 100000).toFixed(1)}L — ensure property valuation supports this headroom`
								];
							}
							const purpose = a['topUpPurpose'] as string;
							if (purpose) {
								g.proTips = [
									`Top-up purpose: ${purpose.replace(/_/g, ' ')} — some banks offer lower rates for home improvement top-ups`
								];
							}
							return g;
						}
					}
				},
				{
					id: 'pre-sanction',
					label: 'Pre-Sanction Profile',
					pageIds: ['sanctionProfile_homeLoan'],
					showWhen: (answers) =>
						answers['loanType'] === 'New Loan' && answers['propertyIdentified'] === 'No',
					contextInfo: {
						title: 'Pre-Sanction Profile',
						dsaGuidance: {
							summary:
								'Pre-approval (in-principle sanction) when property is not yet identified. Based purely on applicant eligibility.',
							keyPoints: [
								'Pre-approval letter is valid for 3-6 months (bank dependent)',
								'Amount is indicative — final sanction depends on actual property',
								'Helps the buyer know their budget before property hunting'
							],
							watchFor: [
								'Pre-approval is NOT a guarantee — property must still clear bank criteria',
								'If applicant changes job or income changes, pre-approval may need revision',
								'Some banks charge a nominal processing fee for pre-approval'
							],
							proTips: [
								'Position pre-approval as a sales tool — tell the client it strengthens their negotiating position with sellers/builders'
							]
						},
						getDynamicGuidance: (a) => {
							const g: Partial<DsaGuidance> = {};
							const score = Number(a['creditScore']);
							if (score >= 750) {
								g.proTips = [
									'Strong credit score — pre-approval should come through quickly. Use this as a selling point to the client'
								];
							} else if (score > 0 && score < 700) {
								g.watchFor = [
									'Below-700 credit score — pre-approval may come with conditions or higher rate indication'
								];
							}
							const deposit = Number(a['deposit']);
							if (deposit > 0) {
								g.keyPoints = [
									`Own contribution: ${(deposit / 100000).toFixed(1)}L — higher down payment improves pre-approval terms`
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
