/**
 * Communication Templates
 * ══════════════════════════════════════════════════════════════════
 * Pre-defined message templates for DSA communication with
 * customers, RMs (Relationship Managers), and sources/brokers.
 *
 * Used by the template renderer and communication API routes
 * to generate WhatsApp, email, and SMS messages.
 * ══════════════════════════════════════════════════════════════════
 */

import type { CaseStage, LenderAppStatus } from '$lib/types/case.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateVariable {
	name: string;
	description: string;
	required: boolean;
}

export interface CommunicationTemplate {
	template_id: string;
	name: string;
	category: 'customer' | 'rm' | 'source';
	channel: 'whatsapp' | 'email' | 'sms';
	subject: string;
	body: string;
	variables: TemplateVariable[];
	trigger_stage?: CaseStage | LenderAppStatus;
}

// ============================================================================
// CUSTOMER-FACING TEMPLATES (6)
// ============================================================================

const customerTemplates: CommunicationTemplate[] = [
	{
		template_id: 'doc_request',
		name: 'Document Request',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Document Request — {{dsa_name}}',
		body: `Dear {{customer_name}},

Greetings from {{dsa_name}}. To proceed with your loan application, we need the following documents:

{{pending_docs}}

Kindly share these at your earliest convenience. If you have any queries, feel free to call us at {{dsa_phone}}.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{
				name: 'pending_docs',
				description: 'Comma-separated list of pending documents',
				required: true
			},
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true },
			{ name: 'dsa_phone', description: 'DSA contact phone number', required: false }
		],
		trigger_stage: 'file_building'
	},
	{
		template_id: 'status_processing',
		name: 'Status Update — Processing',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Your Loan Application is Being Processed — {{lender_name}}',
		body: `Dear {{customer_name}},

Good news! Your loan file has been submitted to {{lender_name}} and is currently being processed. We will keep you updated on the progress.

Thank you for your patience.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{ name: 'lender_name', description: 'Name of the lender bank/NBFC', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'processing'
	},
	{
		template_id: 'status_query',
		name: 'Status Update — Query',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Query Raised on Your Loan Application — {{lender_name}}',
		body: `Dear {{customer_name}},

{{lender_name}} has raised a query on your application:

{{query_details}}

Please respond by {{deadline}}. Kindly share the required information so we can resolve this quickly.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{ name: 'lender_name', description: 'Name of the lender bank/NBFC', required: true },
			{
				name: 'query_details',
				description: 'Details of the query raised by the lender',
				required: true
			},
			{ name: 'deadline', description: 'Deadline to respond to the query', required: false },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'query'
	},
	{
		template_id: 'congratulations_sanctioned',
		name: 'Congratulations — Sanctioned',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Congratulations! Your Loan is Sanctioned — {{lender_name}}',
		body: `Dear {{customer_name}},

Congratulations! Your loan has been sanctioned by {{lender_name}}.

Sanction Amount: Rs. {{sanction_amount}}
Rate of Interest: {{roi}}%
Tenure: {{tenure_months}} months

We will guide you through the next steps for disbursement. Thank you for choosing us!

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{ name: 'lender_name', description: 'Name of the lender bank/NBFC', required: true },
			{ name: 'sanction_amount', description: 'Sanctioned loan amount in rupees', required: true },
			{ name: 'roi', description: 'Rate of interest (percentage)', required: false },
			{ name: 'tenure_months', description: 'Loan tenure in months', required: false },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'sanctioned'
	},
	{
		template_id: 'followup_pending_docs',
		name: 'Follow-up — Pending Documents',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Reminder: Pending Documents for Your Loan Application',
		body: `Dear {{customer_name}},

This is a gentle reminder that the following documents are still pending for {{days_pending}} days:

{{pending_docs}}

Your loan processing cannot proceed without these. Kindly share them at the earliest.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{
				name: 'pending_docs',
				description: 'Comma-separated list of pending documents',
				required: true
			},
			{
				name: 'days_pending',
				description: 'Number of days the documents have been pending',
				required: false
			},
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'file_building'
	},
	{
		template_id: 'ack_documents_received',
		name: 'Acknowledgment — Documents Received',
		category: 'customer',
		channel: 'whatsapp',
		subject: 'Documents Received — Thank You',
		body: `Dear {{customer_name}},

Thank you! We have received the following documents:

{{received_docs}}

We will now proceed with your loan application and keep you updated.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'customer_name', description: 'Full name of the customer', required: true },
			{
				name: 'received_docs',
				description: 'Comma-separated list of received documents',
				required: true
			},
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		]
	}
];

// ============================================================================
// RM-FACING TEMPLATES (5)
// ============================================================================

const rmTemplates: CommunicationTemplate[] = [
	{
		template_id: 'new_file_preview',
		name: 'New File — Preview Share',
		category: 'rm',
		channel: 'whatsapp',
		subject: 'New File Preview — {{applicant_label}} ({{loan_type}})',
		body: `Dear {{rm_name}},

We have a new {{loan_type}} case for your review:

Applicant: {{applicant_label}}
Loan Amount: Rs. {{loan_amount}}

Please let us know your initial assessment and if you need any additional details.

Regards,
{{dsa_name}}
{{dsa_firm}}`,
		variables: [
			{ name: 'rm_name', description: 'Name of the Relationship Manager', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'loan_type', description: 'Type of loan (e.g. Home Loan, LAP)', required: true },
			{ name: 'loan_amount', description: 'Requested loan amount', required: false },
			{ name: 'dsa_name', description: 'Name of the DSA', required: true },
			{ name: 'dsa_firm', description: 'DSA firm or company name', required: false }
		],
		trigger_stage: 'profiling'
	},
	{
		template_id: 'full_file_submission',
		name: 'Full File Submission',
		category: 'rm',
		channel: 'whatsapp',
		subject: 'File Submission — {{applicant_label}} ({{loan_type}})',
		body: `Dear {{rm_name}},

The complete file for the following case has been submitted:

Applicant: {{applicant_label}}
Loan Type: {{loan_type}}
Loan Amount: Rs. {{loan_amount}}
Login Number: {{login_number}}

Kindly acknowledge receipt and share the expected processing timeline.

Regards,
{{dsa_name}}
{{dsa_firm}}`,
		variables: [
			{ name: 'rm_name', description: 'Name of the Relationship Manager', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'loan_type', description: 'Type of loan', required: true },
			{ name: 'loan_amount', description: 'Requested loan amount', required: false },
			{ name: 'login_number', description: 'Lender login/reference number', required: false },
			{ name: 'dsa_name', description: 'Name of the DSA', required: true },
			{ name: 'dsa_firm', description: 'DSA firm or company name', required: false }
		],
		trigger_stage: 'submitted'
	},
	{
		template_id: 'query_response',
		name: 'Query Response',
		category: 'rm',
		channel: 'whatsapp',
		subject: 'Query Response — {{applicant_label}}',
		body: `Dear {{rm_name}},

Regarding the query on {{applicant_label}}:

Query: {{query_details}}

Response: {{response}}

Please review and let us know if anything else is needed.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'rm_name', description: 'Name of the Relationship Manager', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'query_details', description: 'Original query raised by the lender', required: true },
			{ name: 'response', description: 'DSA response to the query', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA', required: true }
		],
		trigger_stage: 'query'
	},
	{
		template_id: 'followup_file_status',
		name: 'Follow-up — File Status',
		category: 'rm',
		channel: 'whatsapp',
		subject: 'Follow-up: File Status — {{applicant_label}}',
		body: `Dear {{rm_name}},

Requesting a status update on the following case:

Applicant: {{applicant_label}}
Login Number: {{login_number}}
Days Since Submission: {{days_since_submission}}

Kindly share the current status at your convenience.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'rm_name', description: 'Name of the Relationship Manager', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'login_number', description: 'Lender login/reference number', required: false },
			{
				name: 'days_since_submission',
				description: 'Number of days since file was submitted',
				required: false
			},
			{ name: 'dsa_name', description: 'Name of the DSA', required: true }
		],
		trigger_stage: 'processing'
	},
	{
		template_id: 'thankyou_sanction',
		name: 'Thank You — Sanction',
		category: 'rm',
		channel: 'whatsapp',
		subject: 'Thank You — Sanction for {{applicant_label}}',
		body: `Dear {{rm_name}},

Thank you for the sanction on {{applicant_label}} for Rs. {{sanction_amount}}. We appreciate your support and look forward to more business together.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'rm_name', description: 'Name of the Relationship Manager', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'sanction_amount', description: 'Sanctioned loan amount', required: false },
			{ name: 'dsa_name', description: 'Name of the DSA', required: true }
		],
		trigger_stage: 'sanctioned'
	}
];

// ============================================================================
// SOURCE/BROKER-FACING TEMPLATES (5)
// ============================================================================

const sourceTemplates: CommunicationTemplate[] = [
	{
		template_id: 'lead_acknowledgment',
		name: 'Lead Acknowledgment',
		category: 'source',
		channel: 'whatsapp',
		subject: 'Lead Received — {{applicant_label}}',
		body: `Dear {{source_name}},

Thank you for referring {{applicant_label}}. We have received the lead and will begin working on it right away. We will keep you posted on the progress.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'source_name', description: 'Name of the source or broker', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'intake'
	},
	{
		template_id: 'lead_update_status',
		name: 'Lead Update — Status',
		category: 'source',
		channel: 'whatsapp',
		subject: 'Lead Update — {{applicant_label}} Status',
		body: `Dear {{source_name}},

Here is an update on the lead you referred — {{applicant_label}}:

Current Stage: {{current_stage}}

We are actively working on this case and will share further updates as we progress.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'source_name', description: 'Name of the source or broker', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'current_stage', description: 'Current stage of the case', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		]
	},
	{
		template_id: 'lead_update_sanctioned',
		name: 'Lead Update — Sanctioned',
		category: 'source',
		channel: 'whatsapp',
		subject: 'Great News! Lead Sanctioned — {{applicant_label}}',
		body: `Dear {{source_name}},

Great news! The loan for {{applicant_label}} has been sanctioned by {{lender_name}} for Rs. {{sanction_amount}}.

Thank you for this referral. Looking forward to more business together!

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'source_name', description: 'Name of the source or broker', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{ name: 'lender_name', description: 'Name of the lender bank/NBFC', required: true },
			{ name: 'sanction_amount', description: 'Sanctioned loan amount', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'sanctioned'
	},
	{
		template_id: 'lead_update_rejected',
		name: 'Lead Update — Rejected',
		category: 'source',
		channel: 'whatsapp',
		subject: 'Lead Update — {{applicant_label}} Not Approved',
		body: `Dear {{source_name}},

Unfortunately, the loan for {{applicant_label}} could not be approved at this time.

Next Steps: {{next_steps}}

We will continue to explore other options. Please feel free to reach out for any queries.

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'source_name', description: 'Name of the source or broker', required: true },
			{ name: 'applicant_label', description: 'Applicant name or case label', required: true },
			{
				name: 'next_steps',
				description: 'Suggested next steps or alternative options',
				required: false
			},
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		],
		trigger_stage: 'rejected'
	},
	{
		template_id: 'general_update',
		name: 'General Update',
		category: 'source',
		channel: 'whatsapp',
		subject: 'Update from {{dsa_name}}',
		body: `Dear {{source_name}},

{{update_text}}

Regards,
{{dsa_name}}`,
		variables: [
			{ name: 'source_name', description: 'Name of the source or broker', required: true },
			{ name: 'update_text', description: 'Free-form update text', required: true },
			{ name: 'dsa_name', description: 'Name of the DSA or firm', required: true }
		]
	}
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
	...customerTemplates,
	...rmTemplates,
	...sourceTemplates
];
