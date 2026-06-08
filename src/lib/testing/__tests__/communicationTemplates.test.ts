import { describe, it, expect } from 'vitest';
import {
	COMMUNICATION_TEMPLATES,
	type CommunicationTemplate,
	type TemplateVariable
} from '$lib/server/data/communicationTemplates';
import {
	renderTemplate,
	getTemplateById,
	getTemplatesForStage,
	generateWhatsAppUrl
} from '$lib/server/templateRenderer';

// ═══════════════════════════════════════════════════════════════
// Template Data — structural integrity
// ═══════════════════════════════════════════════════════════════

const EXPECTED_TEMPLATE_IDS = [
	'doc_request',
	'status_processing',
	'status_query',
	'congratulations_sanctioned',
	'followup_pending_docs',
	'ack_documents_received',
	'new_file_preview',
	'full_file_submission',
	'query_response',
	'followup_file_status',
	'thankyou_sanction',
	'lead_acknowledgment',
	'lead_update_status',
	'lead_update_sanctioned',
	'lead_update_rejected',
	'general_update'
];

const VALID_CATEGORIES = ['customer', 'rm', 'source'] as const;
const VALID_CHANNELS = ['whatsapp', 'email', 'sms'] as const;

describe('Communication Templates — all 16 templates exist', () => {
	it('has exactly 16 templates', () => {
		expect(COMMUNICATION_TEMPLATES.length).toBe(16);
	});

	it.each(EXPECTED_TEMPLATE_IDS)('template "%s" exists', (templateId) => {
		const template = COMMUNICATION_TEMPLATES.find((t) => t.template_id === templateId);
		expect(template, `Template "${templateId}" should exist`).toBeDefined();
	});
});

describe('Communication Templates — all template IDs are unique', () => {
	it('no duplicate template_ids', () => {
		const ids = COMMUNICATION_TEMPLATES.map((t) => t.template_id);
		const uniqueIds = new Set(ids);
		expect(
			uniqueIds.size,
			`Duplicate template IDs found: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`
		).toBe(ids.length);
	});
});

describe('Communication Templates — required fields', () => {
	it.each(
		COMMUNICATION_TEMPLATES.map((t) => [t.template_id, t] as [string, CommunicationTemplate])
	)('template "%s" has all required fields', (_id, template) => {
		expect(template.template_id).toBeDefined();
		expect(typeof template.template_id).toBe('string');
		expect(template.template_id.length).toBeGreaterThan(0);

		expect(template.name).toBeDefined();
		expect(typeof template.name).toBe('string');
		expect(template.name.length).toBeGreaterThan(0);

		expect(template.category).toBeDefined();
		expect(VALID_CATEGORIES).toContain(template.category);

		expect(template.channel).toBeDefined();
		expect(VALID_CHANNELS).toContain(template.channel);

		expect(template.subject).toBeDefined();
		expect(typeof template.subject).toBe('string');
		expect(template.subject.length).toBeGreaterThan(0);

		expect(template.body).toBeDefined();
		expect(typeof template.body).toBe('string');
		expect(template.body.length).toBeGreaterThan(0);

		expect(template.variables).toBeDefined();
		expect(Array.isArray(template.variables)).toBe(true);
		expect(template.variables.length).toBeGreaterThan(0);
	});
});

describe('Communication Templates — category distribution', () => {
	it('has 6 customer-facing templates', () => {
		const customerTemplates = COMMUNICATION_TEMPLATES.filter((t) => t.category === 'customer');
		expect(customerTemplates.length).toBe(6);
	});

	it('has 5 rm-facing templates', () => {
		const rmTemplates = COMMUNICATION_TEMPLATES.filter((t) => t.category === 'rm');
		expect(rmTemplates.length).toBe(5);
	});

	it('has 5 source-facing templates', () => {
		const sourceTemplates = COMMUNICATION_TEMPLATES.filter((t) => t.category === 'source');
		expect(sourceTemplates.length).toBe(5);
	});
});

describe('Communication Templates — all required variables have descriptions', () => {
	for (const template of COMMUNICATION_TEMPLATES) {
		describe(`${template.template_id}`, () => {
			it.each(template.variables.map((v) => [v.name, v] as [string, TemplateVariable]))(
				'variable "%s" has a description',
				(_name, variable) => {
					expect(variable.name).toBeDefined();
					expect(typeof variable.name).toBe('string');
					expect(variable.name.length).toBeGreaterThan(0);

					expect(variable.description).toBeDefined();
					expect(typeof variable.description).toBe('string');
					expect(variable.description.length).toBeGreaterThan(0);

					expect(typeof variable.required).toBe('boolean');
				}
			);
		});
	}
});

describe('Communication Templates — no template body exceeds 1000 chars', () => {
	it.each(COMMUNICATION_TEMPLATES.map((t) => [t.template_id, t.body.length] as [string, number]))(
		'template "%s" body length (%i chars) is within 1000 char limit',
		(_id, bodyLength) => {
			expect(bodyLength).toBeLessThanOrEqual(1000);
		}
	);
});

// ═══════════════════════════════════════════════════════════════
// getTemplateById
// ═══════════════════════════════════════════════════════════════

describe('getTemplateById', () => {
	it('returns the correct template for a valid ID', () => {
		const template = getTemplateById('doc_request');
		expect(template).toBeDefined();
		expect(template!.template_id).toBe('doc_request');
		expect(template!.name).toBe('Document Request');
		expect(template!.category).toBe('customer');
	});

	it('returns undefined for an invalid ID', () => {
		const template = getTemplateById('nonexistent_template');
		expect(template).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		const template = getTemplateById('');
		expect(template).toBeUndefined();
	});
});

// ═══════════════════════════════════════════════════════════════
// renderTemplate — variable substitution
// ═══════════════════════════════════════════════════════════════

describe('renderTemplate — substitutes all variables correctly', () => {
	it('renders doc_request with all variables', () => {
		const result = renderTemplate('doc_request', {
			customer_name: 'Rajesh Kumar',
			pending_docs: 'PAN Card, Aadhaar Card, Bank Statements',
			dsa_name: 'ABC Finance',
			dsa_phone: '9876543210'
		});

		expect(result.subject).toContain('ABC Finance');
		expect(result.body).toContain('Rajesh Kumar');
		expect(result.body).toContain('PAN Card, Aadhaar Card, Bank Statements');
		expect(result.body).toContain('ABC Finance');
		expect(result.body).toContain('9876543210');
		expect(result.missing_vars).toEqual([]);
	});

	it('renders congratulations_sanctioned with all variables', () => {
		const result = renderTemplate('congratulations_sanctioned', {
			customer_name: 'Priya Sharma',
			lender_name: 'HDFC Bank',
			sanction_amount: '50,00,000',
			roi: '8.5',
			tenure_months: '240',
			dsa_name: 'XYZ Associates'
		});

		expect(result.body).toContain('Priya Sharma');
		expect(result.body).toContain('HDFC Bank');
		expect(result.body).toContain('50,00,000');
		expect(result.body).toContain('8.5');
		expect(result.body).toContain('240');
		expect(result.body).toContain('XYZ Associates');
		expect(result.missing_vars).toEqual([]);
	});

	it('renders new_file_preview with all variables', () => {
		const result = renderTemplate('new_file_preview', {
			rm_name: 'Suresh Patel',
			applicant_label: 'Amit Verma - HL',
			loan_type: 'Home Loan',
			loan_amount: '75,00,000',
			dsa_name: 'DSA Corp',
			dsa_firm: 'DSA Corp Pvt Ltd'
		});

		expect(result.body).toContain('Suresh Patel');
		expect(result.body).toContain('Amit Verma - HL');
		expect(result.body).toContain('Home Loan');
		expect(result.body).toContain('75,00,000');
		expect(result.body).toContain('DSA Corp');
		expect(result.body).toContain('DSA Corp Pvt Ltd');
		expect(result.missing_vars).toEqual([]);
	});

	it('renders lead_acknowledgment with all variables', () => {
		const result = renderTemplate('lead_acknowledgment', {
			source_name: 'Vikram Builder',
			applicant_label: 'New Client - Home',
			dsa_name: 'FinServ DSA'
		});

		expect(result.body).toContain('Vikram Builder');
		expect(result.body).toContain('New Client - Home');
		expect(result.body).toContain('FinServ DSA');
		expect(result.missing_vars).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════
// renderTemplate — missing required variables
// ═══════════════════════════════════════════════════════════════

describe('renderTemplate — reports missing required variables', () => {
	it('reports missing customer_name in doc_request', () => {
		const result = renderTemplate('doc_request', {
			pending_docs: 'PAN Card',
			dsa_name: 'Test DSA'
		});

		expect(result.missing_vars).toContain('customer_name');
		// Body should still render, but with empty placeholder for missing var
		expect(result.body).toContain('Dear ');
		expect(result.body).toContain('Test DSA');
	});

	it('reports multiple missing required variables', () => {
		const result = renderTemplate('doc_request', {});

		expect(result.missing_vars).toContain('customer_name');
		expect(result.missing_vars).toContain('pending_docs');
		expect(result.missing_vars).toContain('dsa_name');
	});

	it('reports missing required vars for rm template', () => {
		const result = renderTemplate('query_response', {
			rm_name: 'John'
			// missing: applicant_label, query_details, response, dsa_name
		});

		expect(result.missing_vars).toContain('applicant_label');
		expect(result.missing_vars).toContain('query_details');
		expect(result.missing_vars).toContain('response');
		expect(result.missing_vars).toContain('dsa_name');
		expect(result.missing_vars).not.toContain('rm_name');
	});

	it('returns __template_not_found for invalid template_id', () => {
		const result = renderTemplate('nonexistent', { foo: 'bar' });
		expect(result.missing_vars.length).toBe(1);
		expect(result.missing_vars[0]).toContain('__template_not_found');
	});
});

// ═══════════════════════════════════════════════════════════════
// renderTemplate — optional variables handled gracefully
// ═══════════════════════════════════════════════════════════════

describe('renderTemplate — handles optional variables gracefully', () => {
	it('does not report missing optional variables', () => {
		const result = renderTemplate('doc_request', {
			customer_name: 'Test Customer',
			pending_docs: 'Aadhaar',
			dsa_name: 'My DSA'
			// dsa_phone is optional, not provided
		});

		expect(result.missing_vars).toEqual([]);
		// dsa_phone placeholder should be replaced with empty string
		expect(result.body).not.toContain('{{dsa_phone}}');
	});

	it('optional roi and tenure_months in congratulations are not reported as missing', () => {
		const result = renderTemplate('congratulations_sanctioned', {
			customer_name: 'Test',
			lender_name: 'SBI',
			sanction_amount: '10,00,000',
			dsa_name: 'DSA Test'
			// roi and tenure_months are optional
		});

		expect(result.missing_vars).toEqual([]);
		expect(result.body).not.toContain('{{roi}}');
		expect(result.body).not.toContain('{{tenure_months}}');
	});

	it('optional loan_amount in new_file_preview replaced with empty string', () => {
		const result = renderTemplate('new_file_preview', {
			rm_name: 'RM Test',
			applicant_label: 'Test Label',
			loan_type: 'Home Loan',
			dsa_name: 'DSA Name'
			// loan_amount, dsa_firm are optional
		});

		expect(result.missing_vars).toEqual([]);
		expect(result.body).not.toContain('{{loan_amount}}');
		expect(result.body).not.toContain('{{dsa_firm}}');
	});
});

// ═══════════════════════════════════════════════════════════════
// generateWhatsAppUrl
// ═══════════════════════════════════════════════════════════════

describe('generateWhatsAppUrl — generates correct URLs', () => {
	it('generates URL with 10-digit number (adds 91 prefix)', () => {
		const url = generateWhatsAppUrl('9876543210', 'Hello!');
		expect(url).toBe('https://wa.me/919876543210?text=Hello!');
	});

	it('generates URL with +91 prefix (strips + and spaces)', () => {
		const url = generateWhatsAppUrl('+91 98765 43210', 'Hello!');
		expect(url).toBe('https://wa.me/919876543210?text=Hello!');
	});

	it('generates URL with 91 prefix already present (no double prefix)', () => {
		const url = generateWhatsAppUrl('919876543210', 'Hello!');
		expect(url).toBe('https://wa.me/919876543210?text=Hello!');
	});

	it('strips dashes from phone number', () => {
		const url = generateWhatsAppUrl('98765-43210', 'Test');
		expect(url).toBe('https://wa.me/919876543210?text=Test');
	});

	it('strips parentheses from phone number', () => {
		const url = generateWhatsAppUrl('(91)9876543210', 'Test');
		expect(url).toBe('https://wa.me/919876543210?text=Test');
	});

	it('properly URL-encodes message text', () => {
		const url = generateWhatsAppUrl('9876543210', 'Hello World! How are you?');
		expect(url).toContain('text=Hello%20World!%20How%20are%20you%3F');
	});

	it('encodes newlines in message', () => {
		const url = generateWhatsAppUrl('9876543210', 'Line 1\nLine 2');
		expect(url).toContain('text=Line%201%0ALine%202');
	});

	it('encodes special characters in message', () => {
		const url = generateWhatsAppUrl('9876543210', 'Amount: Rs. 50,00,000 @ 8.5%');
		expect(url).toContain('text=');
		// Should be valid URL (no raw spaces or special chars)
		expect(() => new URL(url)).not.toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════
// getTemplatesForStage
// ═══════════════════════════════════════════════════════════════

describe('getTemplatesForStage — returns appropriate templates', () => {
	it('returns templates for "processing" stage', () => {
		const templates = getTemplatesForStage('processing');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('status_processing');
		expect(ids).toContain('followup_file_status');
	});

	it('returns templates for "sanctioned" stage', () => {
		const templates = getTemplatesForStage('sanctioned');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('congratulations_sanctioned');
		expect(ids).toContain('thankyou_sanction');
		expect(ids).toContain('lead_update_sanctioned');
	});

	it('returns templates for "query" stage', () => {
		const templates = getTemplatesForStage('query');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('status_query');
		expect(ids).toContain('query_response');
	});

	it('returns templates for "intake" stage', () => {
		const templates = getTemplatesForStage('intake');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('lead_acknowledgment');
	});

	it('returns templates for "submitted" stage', () => {
		const templates = getTemplatesForStage('submitted');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('full_file_submission');
	});

	it('returns templates for "rejected" stage', () => {
		const templates = getTemplatesForStage('rejected');
		expect(templates.length).toBeGreaterThan(0);

		const ids = templates.map((t) => t.template_id);
		expect(ids).toContain('lead_update_rejected');
	});

	it('returns empty array for stage with no templates', () => {
		const templates = getTemplatesForStage('closed');
		expect(templates).toEqual([]);
	});

	it('returns empty array for invalid stage', () => {
		const templates = getTemplatesForStage('nonexistent_stage');
		expect(templates).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════
// Template body placeholders — all declared variables appear in body or subject
// ═══════════════════════════════════════════════════════════════

describe('Communication Templates — declared variables appear in body or subject', () => {
	it.each(
		COMMUNICATION_TEMPLATES.map((t) => [t.template_id, t] as [string, CommunicationTemplate])
	)('template "%s" uses all declared variables in body or subject', (_id, template) => {
		for (const variable of template.variables) {
			const placeholder = `{{${variable.name}}}`;
			const usedInBody = template.body.includes(placeholder);
			const usedInSubject = template.subject.includes(placeholder);
			expect(
				usedInBody || usedInSubject,
				`Variable "${variable.name}" is declared but never used in template "${template.template_id}"`
			).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Template placeholders — no undeclared variables in body/subject
// ═══════════════════════════════════════════════════════════════

describe('Communication Templates — no undeclared variables in body or subject', () => {
	it.each(
		COMMUNICATION_TEMPLATES.map((t) => [t.template_id, t] as [string, CommunicationTemplate])
	)('template "%s" has no undeclared {{variables}} in body or subject', (_id, template) => {
		const declaredNames = new Set(template.variables.map((v) => v.name));
		const placeholderRegex = /\{\{(\w+)\}\}/g;

		const allText = template.body + ' ' + template.subject;
		let match;
		while ((match = placeholderRegex.exec(allText)) !== null) {
			expect(
				declaredNames.has(match[1]),
				`Undeclared variable "{{${match[1]}}}" found in template "${template.template_id}"`
			).toBe(true);
		}
	});
});
