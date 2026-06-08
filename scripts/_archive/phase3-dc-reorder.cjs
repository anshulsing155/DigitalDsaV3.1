/**
 * Phase 3: DC Page Reordering
 *
 * Changes:
 * 1. wizardState.svelte.ts: Add getSectionConfig optional getter for reactive section switching
 * 2. BL wizardSections: Move business-profile from Getting Started to Applicants (Fresh reorder)
 * 3. All 3 +page.svelte: Import DC sections, use getSectionConfig with reactive loanType detection
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

function readFile(relPath) {
	return fs.readFileSync(path.join(BASE, relPath), 'utf8');
}

function writeFile(relPath, content) {
	fs.writeFileSync(path.join(BASE, relPath), content, 'utf8');
}

function assertReplace(content, searchLF, replacementLF, label) {
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';
	const search = searchLF.replace(/\n/g, eol);
	const replacement = replacementLF.replace(/\n/g, eol);
	if (!content.includes(search)) {
		const firstLine = searchLF.split('\n')[0];
		const idx = content.indexOf(firstLine.replace(/\n/g, eol));
		if (idx >= 0) {
			const snippet = content
				.substring(idx, idx + 300)
				.replace(/\r/g, '\\r')
				.replace(/\n/g, '\\n');
			throw new Error(
				`[${label}] Found first line at ${idx} but full match failed. Snippet:\n${snippet}`
			);
		}
		throw new Error(`[${label}] Could not find search string`);
	}
	return content.replace(search, replacement);
}

let changes = 0;

// ═══════════════════════════════════════════════════════════════════════
// 1. wizardState.svelte.ts: Add getSectionConfig support
// ═══════════════════════════════════════════════════════════════════════

{
	const relPath = 'src/lib/components/form-wizard/wizardState.svelte.ts';
	let content = readFile(relPath);

	// Add getSectionConfig to the options interface
	content = assertReplace(
		content,
		'sectionConfig: WizardSectionConfig;',
		'sectionConfig: WizardSectionConfig;\n\tgetSectionConfig?: () => WizardSectionConfig;',
		'wizardState: add getSectionConfig to interface'
	);
	changes++;

	// Add getSectionConfig to the destructuring + resolve logic
	content = assertReplace(
		content,
		'\tconst {\n\t\tsectionConfig,',
		'\tconst {\n\t\tsectionConfig: staticSectionConfig,\n\t\tgetSectionConfig: getSectionConfigOpt,',
		'wizardState: destructure getSectionConfig'
	);
	changes++;

	// Add the resolution right after destructuring closes (after getCurrentPageId)
	content = assertReplace(
		content,
		'\t} = options;\n\n\t// Detect 4-step applicant flow',
		'\t} = options;\n\n\t// Resolve sectionConfig: reactive getter takes precedence over static value\n\tconst resolveSectionConfig = getSectionConfigOpt ?? (() => staticSectionConfig);\n\n\t// Detect 4-step applicant flow',
		'wizardState: add resolveSectionConfig'
	);
	changes++;

	// Replace static sectionConfig references with resolveSectionConfig() calls
	// In the 4-step detection loop:
	content = assertReplace(
		content,
		'\tfor (const section of sectionConfig.sections) {\n\t\tfor (const sub of section.subsections) {\n\t\t\tif (sub.applicantStep !== undefined && sub.applicantStep > maxApplicantStep) {\n\t\t\t\tmaxApplicantStep = sub.applicantStep;\n\t\t\t}\n\t\t}\n\t}',
		'\tfor (const section of resolveSectionConfig().sections) {\n\t\tfor (const sub of section.subsections) {\n\t\t\tif (sub.applicantStep !== undefined && sub.applicantStep > maxApplicantStep) {\n\t\t\t\tmaxApplicantStep = sub.applicantStep;\n\t\t\t}\n\t\t}\n\t}',
		'wizardState: 4-step detection'
	);
	changes++;

	// In completionOpts:
	content = assertReplace(
		content,
		'requireResidencePattern: SECURED_LOAN_TYPES.includes(sectionConfig.loanType)',
		'requireResidencePattern: SECURED_LOAN_TYPES.includes(resolveSectionConfig().loanType)',
		'wizardState: completionOpts'
	);
	changes++;

	// In visibleSections $derived:
	content = assertReplace(
		content,
		'\treturn sectionConfig.sections.filter(',
		'\treturn resolveSectionConfig().sections.filter(',
		'wizardState: visibleSections'
	);
	changes++;

	// In findSectionForPage:
	content = assertReplace(
		content,
		'\tfor (const section of sectionConfig.sections) {\n\t\t\tfor (const sub of section.subsections) {',
		'\tfor (const section of resolveSectionConfig().sections) {\n\t\t\tfor (const sub of section.subsections) {',
		'wizardState: findSectionForPage'
	);
	changes++;

	// In getFirstPageIndexForSection:
	content = assertReplace(
		content,
		'\tconst section = sectionConfig.sections.find((s) => s.id === sectionId);',
		'\tconst section = resolveSectionConfig().sections.find((s) => s.id === sectionId);',
		'wizardState: getFirstPageIndexForSection'
	);
	changes++;

	// In getFirstPageIndexForSubsection:
	content = assertReplace(
		content,
		'\tfor (const section of sectionConfig.sections) {\n\t\t\tconst sub = section.subsections.find((s) => s.id === subsectionId);',
		'\tfor (const section of resolveSectionConfig().sections) {\n\t\t\tconst sub = section.subsections.find((s) => s.id === subsectionId);',
		'wizardState: getFirstPageIndexForSubsection'
	);
	changes++;

	// In getSubsectionApplicantStep:
	content = assertReplace(
		content,
		'\tfor (const section of sectionConfig.sections) {\n\t\t\tconst sub = section.subsections.find((s) => s.id === subsectionId);\n\t\t\tif (sub) return sub.applicantStep;',
		'\tfor (const section of resolveSectionConfig().sections) {\n\t\t\tconst sub = section.subsections.find((s) => s.id === subsectionId);\n\t\t\tif (sub) return sub.applicantStep;',
		'wizardState: getSubsectionApplicantStep'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ wizardState.svelte.ts: getSectionConfig support added');
}

// ═══════════════════════════════════════════════════════════════════════
// 2. BL wizardSections: Move business-profile from Getting Started to Applicants
// ═══════════════════════════════════════════════════════════════════════

{
	const relPath = 'src/lib/config/wizardSections/businessLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	// Find and remove the business-profile subsection from getting-started section
	const bpStart = content.indexOf("id: 'business-profile'");
	if (bpStart === -1) throw new Error('BL wizard: business-profile subsection not found');

	// Find the opening brace
	let braceStart = content.lastIndexOf('{', bpStart);
	let lineStart = content.lastIndexOf(eol, braceStart) + eol.length;

	// Find the closing brace at matching depth
	let depth = 0;
	let i = braceStart;
	while (i < content.length) {
		if (content[i] === '{') depth++;
		if (content[i] === '}') {
			depth--;
			if (depth === 0) break;
		}
		i++;
	}
	let endPos = i + 1;
	if (content[endPos] === ',') endPos++;
	if (content.substring(endPos, endPos + eol.length) === eol) endPos += eol.length;

	// Extract the subsection block for reinsertion
	const bpBlock = content.substring(lineStart, endPos);
	content = content.substring(0, lineStart) + content.substring(endPos);
	changes++;
	console.log('  BL wizard: removed business-profile from getting-started');

	// Insert business-profile into applicants section, right after whos-applying
	const whosApplyingEnd = content.indexOf("id: 'whos-applying'");
	if (whosApplyingEnd === -1) throw new Error('BL wizard: whos-applying not found');

	// Find the closing of whos-applying subsection
	let wsStart = content.lastIndexOf('{', whosApplyingEnd);
	depth = 0;
	i = wsStart;
	while (i < content.length) {
		if (content[i] === '{') depth++;
		if (content[i] === '}') {
			depth--;
			if (depth === 0) break;
		}
		i++;
	}
	// i is at closing }. Include the trailing comma + eol
	let insertPos = i + 1;
	if (content[insertPos] === ',') insertPos++;
	if (content.substring(insertPos, insertPos + eol.length) === eol) insertPos += eol.length;

	content = content.substring(0, insertPos) + bpBlock + content.substring(insertPos);
	changes++;
	console.log('  BL wizard: inserted business-profile into applicants section');

	writeFile(relPath, content);
	console.log('✓ BL wizardSections: business-profile moved to applicants');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. All 3 +page.svelte: Use getSectionConfig for DC reactivity
// ═══════════════════════════════════════════════════════════════════════

// PL +page.svelte
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte';
	let content = readFile(relPath);

	// Add DC section import
	content = assertReplace(
		content,
		"import { personalLoanSections } from '$lib/config/wizardSections/personalLoan';",
		"import { personalLoanSections, personalLoanDCSections } from '$lib/config/wizardSections/personalLoan';",
		'PL: DC section import'
	);
	changes++;

	// Replace static sectionConfig with reactive getSectionConfig
	content = assertReplace(
		content,
		'sectionConfig: personalLoanSections,',
		"sectionConfig: personalLoanSections,\n\t\tgetSectionConfig: () => {\n\t\t\tconst lt = currentAnswers.loanType as string;\n\t\t\tconst isDC = lt === 'Debt Consolidation' || lt === 'Debt Consolidation with Extra Funds';\n\t\t\treturn isDC ? personalLoanDCSections : personalLoanSections;\n\t\t},",
		'PL: getSectionConfig'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ PL +page.svelte: DC section support added');
}

// BL +page.svelte
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte';
	let content = readFile(relPath);

	// Add DC section import
	content = assertReplace(
		content,
		"import { businessLoanSections } from '$lib/config/wizardSections/businessLoan';",
		"import { businessLoanSections, businessLoanDCSections } from '$lib/config/wizardSections/businessLoan';",
		'BL: DC section import'
	);
	changes++;

	// Replace static sectionConfig with reactive getSectionConfig
	content = assertReplace(
		content,
		'sectionConfig: businessLoanSections,',
		"sectionConfig: businessLoanSections,\n\t\tgetSectionConfig: () => {\n\t\t\tconst lt = (currentAnswers as Record<string, unknown>).loanType as string;\n\t\t\tconst isDC = lt === 'Debt Consolidation' || lt === 'Debt Consolidation with Extra Funds';\n\t\t\treturn isDC ? businessLoanDCSections : businessLoanSections;\n\t\t},",
		'BL: getSectionConfig'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ BL +page.svelte: DC section support added');
}

// Prof +page.svelte
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte';
	let content = readFile(relPath);

	// Add DC section import
	content = assertReplace(
		content,
		"import { professionalLoanSections } from '$lib/config/wizardSections/professionalLoan';",
		"import { professionalLoanSections, professionalLoanDCSections } from '$lib/config/wizardSections/professionalLoan';",
		'Prof: DC section import'
	);
	changes++;

	// Replace static sectionConfig with reactive getSectionConfig
	content = assertReplace(
		content,
		'sectionConfig: professionalLoanSections,',
		"sectionConfig: professionalLoanSections,\n\t\tgetSectionConfig: () => {\n\t\t\tconst lt = currentAnswers.loanType as string;\n\t\t\tconst isDC = lt === 'Debt Consolidation' || lt === 'Debt Consolidation with Extra Funds';\n\t\t\treturn isDC ? professionalLoanDCSections : professionalLoanSections;\n\t\t},",
		'Prof: getSectionConfig'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ Prof +page.svelte: DC section support added');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Append DC wizard section exports to each wizard section file
// ═══════════════════════════════════════════════════════════════════════

// Helper: DC section generation
// DC flow: LoanReq first → Applicant block → Financials → Location last
// The DC sections remap 'Getting Started' to only have amount-terms,
// and add a new 'Location' section at the end referencing locationPageDC.

// PL DC Sections
{
	const relPath = 'src/lib/config/wizardSections/personalLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	const dcExport = `
/**
 * DC (Debt Consolidation) wizard section variant.
 * Page order: LoanReq → Applicant → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const personalLoanDCSections: WizardSectionConfig = {
	loanType: 'Personal Loan',
	sections: [
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary: 'Specify your consolidation needs — which loans to close and the total amount required.',
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
							summary: 'Specify loan purpose, amount, and preferred tenure for your debt consolidation.',
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
			contextInfo: personalLoanSections.sections[1].contextInfo,
			subsections: personalLoanSections.sections[1].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => (answers['__applicantCount'] as number) <= 1,
			contextInfo: personalLoanSections.sections[2].contextInfo,
			subsections: personalLoanSections.sections[2].subsections
		},
		{
			id: 'location-details',
			label: 'Location',
			contextInfo: {
				title: 'Residence Location',
				dsaGuidance: {
					summary: 'Your residence location helps us find lenders serving your area.',
					keyPoints: [
						'Lenders operate in specific areas',
						'Affects verification process',
						'Determines available offers'
					],
					watchFor: [
						'Some lenders do not operate in Tier-3 cities — check coverage first'
					],
					proTips: [
						'Use current residence address',
						'Metro cities have more options',
						'Address proof will be needed'
					]
				}
			},
			subsections: [
				{
					id: 'location-dc',
					label: 'Location',
					pageIds: ['locationPageDC'],
					contextInfo: {
						title: 'Residence Location',
						dsaGuidance: {
							summary: 'Your residence location helps us find lenders serving your area.',
							keyPoints: [
								'Lenders operate in specific areas',
								'Affects verification process',
								'Determines available offers'
							],
							watchFor: [
								'Some lenders do not operate in Tier-3 cities — check coverage first'
							],
							proTips: [
								'Use current residence address',
								'Metro cities have more options',
								'Address proof will be needed'
							]
						}
					}
				}
			]
		}
	]
};
`;

	content = content.trimEnd() + eol + dcExport.replace(/\n/g, eol);
	writeFile(relPath, content);
	changes++;
	console.log('✓ PL wizardSections: DC export added');
}

// BL DC Sections
{
	const relPath = 'src/lib/config/wizardSections/businessLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	const dcExport = `
/**
 * DC (Debt Consolidation) wizard section variant.
 * Page order: LoanReq → Applicant → BizProfile → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const businessLoanDCSections: WizardSectionConfig = {
	loanType: 'Business Loan',
	sections: [
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary: 'Specify your business debt consolidation needs — which loans to close and the total amount required.',
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
							summary: 'Specify your business funding purpose, amount, and preferred tenure for debt consolidation.',
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
			contextInfo: businessLoanSections.sections[1].contextInfo,
			subsections: businessLoanSections.sections[1].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => (answers['__applicantCount'] as number) <= 1,
			contextInfo: businessLoanSections.sections[2].contextInfo,
			subsections: businessLoanSections.sections[2].subsections
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
					label: 'Location',
					pageIds: ['locationPageDC'],
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
`;

	content = content.trimEnd() + eol + dcExport.replace(/\n/g, eol);
	writeFile(relPath, content);
	changes++;
	console.log('✓ BL wizardSections: DC export added');
}

// Prof DC Sections
{
	const relPath = 'src/lib/config/wizardSections/professionalLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	const dcExport = `
/**
 * DC (Debt Consolidation) wizard section variant.
 * Page order: LoanReq → Applicant → Profile → Income → Credit → Obligations → Location
 * Location moves to a separate section at the end.
 */
export const professionalLoanDCSections: WizardSectionConfig = {
	loanType: 'Professional Loan',
	sections: [
		{
			id: 'getting-started',
			label: 'Getting Started',
			contextInfo: {
				title: 'Debt Consolidation',
				dsaGuidance: {
					summary: 'Specify your professional debt consolidation needs — which loans to close and the total amount required.',
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
							summary: 'Specify your loan purpose, desired amount, and repayment tenure for debt consolidation.',
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
						getDynamicGuidance: professionalLoanSections.sections[0].subsections[0].contextInfo?.getDynamicGuidance
					}
				}
			]
		},
		{
			id: 'applicants',
			label: 'Applicants',
			contextInfo: professionalLoanSections.sections[1].contextInfo,
			subsections: professionalLoanSections.sections[1].subsections
		},
		{
			id: 'financials',
			label: 'Financials',
			showWhen: (answers: Record<string, unknown>) => (answers['__applicantCount'] as number) <= 1,
			contextInfo: professionalLoanSections.sections[2].contextInfo,
			subsections: professionalLoanSections.sections[2].subsections
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
					label: 'Location',
					pageIds: ['locationPageDC'],
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
`;

	content = content.trimEnd() + eol + dcExport.replace(/\n/g, eol);
	writeFile(relPath, content);
	changes++;
	console.log('✓ Prof wizardSections: DC export added');
}

console.log(`\n✅ Phase 3 complete: ${changes} changes applied`);
