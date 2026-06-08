/**
 * Lender Document Templates
 * ══════════════════════════════════════════════════════════════════
 * Pre-defined document checklists for major Indian lenders.
 * Used by the "apply-template" endpoint to bulk-add documents
 * to a lender application's document checklist.
 * ══════════════════════════════════════════════════════════════════
 */

export interface DocumentTemplate {
	doc_name: string;
	category: 'identity' | 'income' | 'property' | 'lender_specific' | 'other';
	is_mandatory: boolean;
	freshness_rule_days: number;
	description?: string;
}

// ══════════════════════════════════════════════════════════════════
// Common documents — always applied regardless of employment type
// ══════════════════════════════════════════════════════════════════

export const COMMON_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
	{
		doc_name: 'PAN Card',
		category: 'identity',
		is_mandatory: true,
		freshness_rule_days: 0,
		description: 'Permanent Account Number card copy'
	},
	{
		doc_name: 'Aadhaar Card',
		category: 'identity',
		is_mandatory: true,
		freshness_rule_days: 0,
		description: 'UID Aadhaar card (front & back)'
	},
	{
		doc_name: 'Passport Size Photographs',
		category: 'identity',
		is_mandatory: true,
		freshness_rule_days: 180,
		description: '2 recent passport size photographs'
	}
];

// ══════════════════════════════════════════════════════════════════
// Employment-type-based document templates
// ══════════════════════════════════════════════════════════════════

export const EMPLOYMENT_DOCUMENT_TEMPLATES: Record<string, DocumentTemplate[]> = {
	Salaried: [
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account bank statement for last 6 months'
		},
		{
			doc_name: 'Form 16 (Latest)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Latest Form 16 from employer'
		},
		{
			doc_name: 'Employment/Appointment Letter',
			category: 'income',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Current employment offer/appointment letter'
		}
	],
	'Government Employee': [
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account bank statement for last 6 months'
		},
		{
			doc_name: 'Form 16 (Latest)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Latest Form 16 from employer'
		},
		{
			doc_name: 'Government ID Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Government department identity card'
		}
	],
	'Self-employed(Businessman)': [
		{
			doc_name: 'ITR with Computation (3 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Income Tax Returns for last 3 assessment years with computation sheet'
		},
		{
			doc_name: 'Balance Sheet & P&L (3 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Audited balance sheet and profit & loss for 3 years'
		},
		{
			doc_name: 'Bank Statements (12 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Business/current account statements for last 12 months'
		},
		{
			doc_name: 'GST Returns (12 Months)',
			category: 'income',
			is_mandatory: false,
			freshness_rule_days: 30,
			description: 'GST returns for the last 12 months'
		},
		{
			doc_name: 'Business Registration / GST Certificate',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Shop & establishment / GST registration certificate'
		}
	],
	'Self-employed(Professional)': [
		{
			doc_name: 'ITR with Computation (3 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Income Tax Returns for last 3 assessment years with computation sheet'
		},
		{
			doc_name: 'Balance Sheet & P&L (3 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Audited balance sheet and profit & loss for 3 years'
		},
		{
			doc_name: 'Bank Statements (12 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Professional/current account statements for last 12 months'
		},
		{
			doc_name: 'Professional License/Degree Certificate',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Professional qualification certificate (CA/doctor/engineer etc.)'
		}
	],
	Pensioner: [
		{
			doc_name: 'Pension Passbook / PPO',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Pension Payment Order or pension passbook'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Pension credit bank statement for last 6 months'
		}
	]
};

// ══════════════════════════════════════════════════════════════════
// Lender-specific document templates
// ══════════════════════════════════════════════════════════════════

export const LENDER_DOCUMENT_TEMPLATES: Record<string, DocumentTemplate[]> = {
	'HDFC Bank': [
		{
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Permanent Account Number card copy'
		},
		{
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'UID Aadhaar card (front & back)'
		},
		{
			doc_name: 'Passport Size Photographs',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 180,
			description: '2 recent passport size photographs'
		},
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account bank statement for last 6 months'
		},
		{
			doc_name: 'Form 16 (Latest)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Latest Form 16 from employer'
		},
		{
			doc_name: 'ITR with Computation (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Income Tax Returns for last 2 assessment years with computation sheet'
		},
		{
			doc_name: 'Employment/Appointment Letter',
			category: 'income',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Current employment offer/appointment letter'
		},
		{
			doc_name: 'Property Agreement to Sale',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Registered or unregistered agreement to sale'
		},
		{
			doc_name: 'Property Title Documents',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Chain of title documents for the property'
		},
		{
			doc_name: 'Approved Building Plan',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Municipal/authority approved building plan'
		},
		{
			doc_name: 'Encumbrance Certificate',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'EC for last 13 years'
		},
		{
			doc_name: 'HDFC Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Duly filled and signed HDFC home loan application form'
		},
		{
			doc_name: 'Processing Fee Cheque',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Processing fee cheque/DD in favour of HDFC Ltd'
		}
	],

	SBI: [
		{
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Permanent Account Number card copy'
		},
		{
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'UID Aadhaar card (front & back)'
		},
		{
			doc_name: 'Voter ID / Passport / Driving Licence',
			category: 'identity',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Additional photo ID proof'
		},
		{
			doc_name: 'Passport Size Photographs',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 180,
			description: '2 recent passport size photographs'
		},
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips from employer'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account statement for last 6 months'
		},
		{
			doc_name: 'Form 16 (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Form 16 for last 2 financial years'
		},
		{
			doc_name: 'ITR Acknowledgements (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'ITR-V acknowledgements for last 2 years'
		},
		{
			doc_name: 'Property Agreement to Sale',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Registered agreement for sale'
		},
		{
			doc_name: 'Property Title Deed',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Original title deed / conveyance deed'
		},
		{
			doc_name: 'Approved Plan & Commencement Certificate',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Sanctioned plan and CC from local authority'
		},
		{
			doc_name: 'Encumbrance Certificate (15 Years)',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'EC for last 15 years'
		},
		{
			doc_name: 'No Objection Certificate (Society/Builder)',
			category: 'property',
			is_mandatory: false,
			freshness_rule_days: 90,
			description: 'NOC from society or builder for transfer'
		},
		{
			doc_name: 'SBI Home Loan Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Duly filled SBI home loan application'
		},
		{
			doc_name: 'CIBIL Consent Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Signed consent for credit bureau check'
		}
	],

	'ICICI Bank': [
		{
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'PAN card copy (self-attested)'
		},
		{
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Aadhaar card front & back'
		},
		{
			doc_name: 'Passport / Voter ID',
			category: 'identity',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Additional identity proof'
		},
		{
			doc_name: 'Passport Size Photographs',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 180,
			description: '2 recent colour photographs'
		},
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Primary salary account for 6 months'
		},
		{
			doc_name: 'Form 16 (Latest)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Latest Form 16'
		},
		{
			doc_name: 'ITR with Computation (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'ITR with computation for 2 years'
		},
		{
			doc_name: 'Appointment Letter / Offer Letter',
			category: 'income',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Employment proof for current organisation'
		},
		{
			doc_name: 'Property Sale Agreement',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Registered sale agreement'
		},
		{
			doc_name: 'Title Documents & Chain',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Complete chain of title documents'
		},
		{
			doc_name: 'Approved Building Plan',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Plan sanctioned by competent authority'
		},
		{
			doc_name: 'Encumbrance Certificate',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'EC for last 13 years'
		},
		{
			doc_name: 'ICICI Home Loan Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Duly filled ICICI bank application form'
		}
	],

	'Axis Bank': [
		{
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Self-attested PAN card copy'
		},
		{
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Aadhaar card (front & back)'
		},
		{
			doc_name: 'Passport / Driving Licence',
			category: 'identity',
			is_mandatory: false,
			freshness_rule_days: 0,
			description: 'Additional photo ID'
		},
		{
			doc_name: 'Passport Size Photographs',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 180,
			description: '2 recent passport photographs'
		},
		{
			doc_name: 'Salary Slips (3 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 3 months salary slips'
		},
		{
			doc_name: 'Bank Statements (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account statements for 6 months'
		},
		{
			doc_name: 'Form 16 (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Form 16 for last 2 financial years'
		},
		{
			doc_name: 'ITR (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Income Tax Returns for 2 years'
		},
		{
			doc_name: 'Employment Proof',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Offer letter / employment certificate'
		},
		{
			doc_name: 'Property Agreement',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Registered agreement to sell'
		},
		{
			doc_name: 'Title Documents',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Chain of title deeds'
		},
		{
			doc_name: 'Approved Plan & IOD/CC',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Approved plan and commencement certificate'
		},
		{
			doc_name: 'Encumbrance Certificate',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'EC for 13+ years'
		},
		{
			doc_name: 'Axis Bank Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Axis Bank home loan application'
		},
		{
			doc_name: 'ECS / NACH Mandate Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Signed ECS/NACH mandate for EMI deduction'
		}
	],

	'Bajaj Finance': [
		{
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'PAN card copy'
		},
		{
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Aadhaar card (front & back)'
		},
		{
			doc_name: 'Passport Size Photographs',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 180,
			description: '2 recent passport photographs'
		},
		{
			doc_name: 'Address Proof (Utility Bill / Passport)',
			category: 'identity',
			is_mandatory: true,
			freshness_rule_days: 90,
			description: 'Current address proof not older than 3 months'
		},
		{
			doc_name: 'Salary Slips (6 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Latest 6 months salary slips'
		},
		{
			doc_name: 'Bank Statements (12 Months)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'Salary account statements for last 12 months'
		},
		{
			doc_name: 'Form 16 (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'Form 16 for last 2 financial years'
		},
		{
			doc_name: 'ITR with Computation (2 Years)',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 365,
			description: 'ITR with computation for last 2 assessment years'
		},
		{
			doc_name: 'Appointment / Experience Letter',
			category: 'income',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Employment verification letter'
		},
		{
			doc_name: 'Property Agreement to Sale',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Registered/stamped agreement to sell'
		},
		{
			doc_name: 'Title Documents & Search Report',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Title documents with legal search report'
		},
		{
			doc_name: 'Approved Building Plan',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Plan approved by local authority'
		},
		{
			doc_name: 'Encumbrance Certificate',
			category: 'property',
			is_mandatory: true,
			freshness_rule_days: 30,
			description: 'EC for last 15 years'
		},
		{
			doc_name: 'Bajaj Finance Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Duly filled Bajaj Finance home loan application'
		},
		{
			doc_name: 'CIBIL Consent & KYC Declaration',
			category: 'lender_specific',
			is_mandatory: true,
			freshness_rule_days: 0,
			description: 'Signed CIBIL consent and KYC self-declaration'
		}
	]
};
