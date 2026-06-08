import { describe, it, expect } from 'vitest';
import {
	LENDER_DOCUMENT_TEMPLATES,
	type DocumentTemplate
} from '$lib/server/data/documentTemplates';

// ═══════════════════════════════════════════════════════════════
// Lender Document Templates — structural integrity
// ═══════════════════════════════════════════════════════════════

const REQUIRED_LENDERS = ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Bajaj Finance'];
const VALID_CATEGORIES = ['identity', 'income', 'property', 'lender_specific', 'other'] as const;
const COMMON_DOCUMENTS = ['PAN Card', 'Aadhaar Card', 'Bank Statements'];

describe('Lender Document Templates — lender coverage', () => {
	it.each(REQUIRED_LENDERS)('template exists for %s', (lender) => {
		expect(LENDER_DOCUMENT_TEMPLATES).toHaveProperty(lender);
		expect(Array.isArray(LENDER_DOCUMENT_TEMPLATES[lender])).toBe(true);
	});
});

describe('Lender Document Templates — minimum document count', () => {
	it.each(REQUIRED_LENDERS)('%s has at least 10 documents', (lender) => {
		const docs = LENDER_DOCUMENT_TEMPLATES[lender];
		expect(
			docs.length,
			`${lender} should have >= 10 documents, has ${docs.length}`
		).toBeGreaterThanOrEqual(10);
	});
});

describe('Lender Document Templates — required fields', () => {
	for (const lender of REQUIRED_LENDERS) {
		describe(`${lender}`, () => {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender] || [];
			it.each(docs.map((d, i) => [i, d.doc_name, d] as [number, string, DocumentTemplate]))(
				'doc[%i] "%s" has required fields: doc_name, category, is_mandatory',
				(_index, _name, doc) => {
					expect(doc.doc_name).toBeDefined();
					expect(typeof doc.doc_name).toBe('string');
					expect(doc.doc_name.length).toBeGreaterThan(0);

					expect(doc.category).toBeDefined();
					expect(typeof doc.category).toBe('string');

					expect(doc.is_mandatory).toBeDefined();
					expect(typeof doc.is_mandatory).toBe('boolean');
				}
			);
		});
	}
});

describe('Lender Document Templates — valid categories', () => {
	for (const lender of REQUIRED_LENDERS) {
		describe(`${lender}`, () => {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender] || [];
			it.each(docs.map((d) => [d.doc_name, d.category]))(
				'"%s" has valid category "%s"',
				(_docName, category) => {
					expect(VALID_CATEGORIES).toContain(category);
				}
			);
		});
	}
});

describe('Lender Document Templates — common documents across lenders', () => {
	it('PAN Card appears in all lender templates', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const docNames = docs.map((d) => d.doc_name);
			expect(docNames, `${lender} should include PAN Card`).toContain('PAN Card');
		}
	});

	it('Aadhaar Card appears in all lender templates', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const docNames = docs.map((d) => d.doc_name);
			expect(docNames, `${lender} should include Aadhaar Card`).toContain('Aadhaar Card');
		}
	});

	it('Bank Statements (some variant) appear in all lender templates', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const hasBankStatements = docs.some((d) =>
				d.doc_name.toLowerCase().includes('bank statement')
			);
			expect(hasBankStatements, `${lender} should include a Bank Statements document`).toBe(true);
		}
	});
});

describe('Lender Document Templates — no duplicate doc_names within a lender', () => {
	it.each(REQUIRED_LENDERS)('%s has no duplicate doc_names', (lender) => {
		const docs = LENDER_DOCUMENT_TEMPLATES[lender];
		const docNames = docs.map((d) => d.doc_name);
		const uniqueNames = new Set(docNames);
		expect(
			uniqueNames.size,
			`${lender} has duplicate doc_names: ${docNames.filter((n, i) => docNames.indexOf(n) !== i).join(', ')}`
		).toBe(docNames.length);
	});
});

describe('Lender Document Templates — freshness_rule_days', () => {
	it.each(REQUIRED_LENDERS)('%s: freshness_rule_days is non-negative when present', (lender) => {
		const docs = LENDER_DOCUMENT_TEMPLATES[lender];
		for (const doc of docs) {
			if (doc.freshness_rule_days !== undefined && doc.freshness_rule_days !== null) {
				expect(
					doc.freshness_rule_days,
					`${lender} > "${doc.doc_name}": freshness_rule_days should be >= 0`
				).toBeGreaterThanOrEqual(0);
			}
		}
	});

});

describe('Lender Document Templates — structural consistency', () => {
	it('every lender has at least one mandatory identity document', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const mandatoryIdentity = docs.filter(
				(d) => d.category === 'identity' && d.is_mandatory === true
			);
			expect(
				mandatoryIdentity.length,
				`${lender} should have at least one mandatory identity document`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it('every lender has at least one income document', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const incomeDocs = docs.filter((d) => d.category === 'income');
			expect(
				incomeDocs.length,
				`${lender} should have at least one income document`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it('every lender has at least one property document', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const propertyDocs = docs.filter((d) => d.category === 'property');
			expect(
				propertyDocs.length,
				`${lender} should have at least one property document`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it('every lender has at least one lender_specific document', () => {
		for (const lender of REQUIRED_LENDERS) {
			const docs = LENDER_DOCUMENT_TEMPLATES[lender];
			const lenderSpecific = docs.filter((d) => d.category === 'lender_specific');
			expect(
				lenderSpecific.length,
				`${lender} should have at least one lender_specific document`
			).toBeGreaterThanOrEqual(1);
		}
	});
});
