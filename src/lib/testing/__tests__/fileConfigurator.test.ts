import { describe, it, expect } from 'vitest';
import { computePayloadHash } from '$lib/server/snapshotHelpers';
import {
	stripPII,
	getDefaultFileConfig,
	buildFilePayload,
	validateFileIntegrity
} from '$lib/server/fileConfigurator';

// ═══════════════════════════════════════════════════════════════
// stripPII — PII redaction
// ═══════════════════════════════════════════════════════════════

describe('stripPII', () => {
	it('strips full_name to "[REDACTED]"', () => {
		const data = { full_name: 'Ramesh Kumar Singh' };
		const result = stripPII(data);
		expect(result.full_name).toBe('[REDACTED]');
	});

	it('strips pan_number to "XXXXX####X" pattern (keeps last 4)', () => {
		const data = { pan_number: 'ABCDE1234F' };
		const result = stripPII(data);
		// PAN: ABCDE1234F → last 4 = "234F", result = "XXXXX234FX"
		expect(result.pan_number).toMatch(/X{5}.{4}X/);
	});

	it('strips aadhaar_number to "XXXX XXXX ####" pattern (keeps last 4)', () => {
		const data = { aadhaar_number: '1234 5678 9012' };
		const result = stripPII(data);
		expect(result.aadhaar_number).toMatch(/X{4}\s?X{4}\s?\d{4}/);
	});

	it('strips mobile to "XXXXXX####" pattern (keeps last 4)', () => {
		const data = { mobile: '9876543210' };
		const result = stripPII(data);
		expect(result.mobile).toMatch(/X{6}\d{4}/);
	});

	it('strips email to redacted pattern', () => {
		const data = { email: 'ramesh@example.com' };
		const result = stripPII(data);
		expect(result.email).not.toBe('ramesh@example.com');
		expect(result.email).toContain('*');
	});

	it('strips address to "[Address Redacted]"', () => {
		const data = { address: '123 MG Road, Andheri West, Mumbai 400058' };
		const result = stripPII(data);
		expect(result.address).toBe('[Address Redacted]');
	});

	it('strips dob to "[DOB Redacted]"', () => {
		const data = { dob: '1990-05-15' };
		const result = stripPII(data);
		expect(result.dob).toBe('[DOB Redacted]');
	});

	it('works recursively on nested objects', () => {
		const data = {
			applicant: {
				full_name: 'Ramesh Kumar',
				pan_number: 'ABCDE1234F',
				loan_amount: 5000000
			}
		};
		const result = stripPII(data);
		const applicant = result.applicant as Record<string, unknown>;
		expect(applicant.full_name).toBe('[REDACTED]');
		expect(applicant.loan_amount).toBe(5000000);
	});

	it('works on arrays of objects', () => {
		const data = {
			applicants: [
				{ full_name: 'Ramesh', mobile: '9876543210' },
				{ full_name: 'Suresh', mobile: '9876543211' }
			]
		};
		const result = stripPII(data);
		const applicants = result.applicants as Record<string, unknown>[];
		expect(applicants[0].full_name).toBe('[REDACTED]');
		expect(applicants[1].full_name).toBe('[REDACTED]');
	});

	it('preserves non-PII fields unchanged', () => {
		const data = {
			loan_type: 'Home Loan',
			loan_amount: 5000000,
			tenure_years: 20,
			city: 'Mumbai'
		};
		const result = stripPII(data);
		expect(result.loan_type).toBe('Home Loan');
		expect(result.loan_amount).toBe(5000000);
		expect(result.tenure_years).toBe(20);
		expect(result.city).toBe('Mumbai');
	});

	it('handles null/undefined values gracefully', () => {
		const data = { full_name: null, pan_number: undefined, mobile: '9876543210' };
		const result = stripPII(data);
		expect(result).toBeDefined();
	});

	it('returns a deep clone (original not modified)', () => {
		const original = { full_name: 'Ramesh Kumar', loan_amount: 5000000 };
		const result = stripPII(original);
		expect(original.full_name).toBe('Ramesh Kumar');
		expect(original.loan_amount).toBe(5000000);
		expect(result).not.toBe(original);
	});

	it('handles empty object', () => {
		const result = stripPII({});
		expect(result).toEqual({});
	});
});

// ═══════════════════════════════════════════════════════════════
// getDefaultFileConfig
// ═══════════════════════════════════════════════════════════════

describe('getDefaultFileConfig', () => {
	it('returns object with all expected keys', () => {
		const config = getDefaultFileConfig('case-001');
		expect(config).toHaveProperty('pii_mode');
		expect(config).toHaveProperty('sections_visibility');
		expect(config).toHaveProperty('dsa_notes');
		expect(config).toHaveProperty('display_mode');
		expect(config).toHaveProperty('section_order');
	});

	it("default pii_mode is 'stripped'", () => {
		const config = getDefaultFileConfig('case-001');
		expect(config.pii_mode).toBe('stripped');
	});

	it("default income mode is 'consolidated'", () => {
		const config = getDefaultFileConfig('case-001');
		expect(config.display_mode.income).toBe('consolidated');
	});

	it('default sections_visibility has pre-filled sections all set to true', () => {
		const config = getDefaultFileConfig('case-001');
		expect(config.sections_visibility).toBeDefined();
		expect(typeof config.sections_visibility).toBe('object');
		expect(Object.keys(config.sections_visibility).length).toBeGreaterThan(0);
		// All sections should be visible by default
		for (const visible of Object.values(config.sections_visibility)) {
			expect(visible).toBe(true);
		}
	});

	it('default dsa_notes is empty record', () => {
		const config = getDefaultFileConfig('case-001');
		expect(config.dsa_notes).toBeDefined();
		expect(typeof config.dsa_notes).toBe('object');
		expect(Object.keys(config.dsa_notes)).toHaveLength(0);
	});

	it('section_order contains default sections', () => {
		const config = getDefaultFileConfig('case-001');
		expect(Array.isArray(config.section_order)).toBe(true);
		expect(config.section_order.length).toBeGreaterThan(0);
		expect(config.section_order).toContain('applicant_details');
		expect(config.section_order).toContain('income_details');
	});
});

// ═══════════════════════════════════════════════════════════════
// buildFilePayload
// ═══════════════════════════════════════════════════════════════

describe('buildFilePayload', () => {
	it('filters sections based on sections_visibility', () => {
		const formData = {
			income_details: { salary: 100000, rental: 20000 },
			property_details: { value: 5000000, type: 'flat' },
			applicant_details: { pan: 'ABCDE1234F' },
			obligation_details: { emi: 15000 }
		};
		const config = getDefaultFileConfig('case-001');
		// Hide some sections
		config.sections_visibility['applicant_details'] = false;
		config.sections_visibility['obligation_details'] = false;

		const result = buildFilePayload(formData, config);
		// Visible sections should be present
		expect(result.income_details).toBeDefined();
		expect(result.property_details).toBeDefined();
		// Hidden sections should be excluded
		expect(result.applicant_details).toBeUndefined();
		expect(result.obligation_details).toBeUndefined();
	});

	it('preserves data when all sections visible', () => {
		const formData = {
			income_details: { salary: 100000 },
			loan_details: { amount: 5000000 }
		};
		const config = getDefaultFileConfig('case-001');

		const result = buildFilePayload(formData, config);
		expect(result.income_details).toBeDefined();
		expect(result.loan_details).toBeDefined();
	});

	it('carries over metadata fields (case_id, loan, etc.)', () => {
		const formData = {
			case_id: 'HL-00001',
			loan: { type: 'Home Loan' },
			income_details: { salary: 100000 }
		};
		const config = getDefaultFileConfig('case-001');

		const result = buildFilePayload(formData, config);
		expect(result.case_id).toBe('HL-00001');
		expect(result.loan).toEqual({ type: 'Home Loan' });
	});

	it('attaches DSA notes to sections when configured', () => {
		const formData = {
			income_details: { salary: 100000 }
		};
		const config = getDefaultFileConfig('case-001');
		config.dsa_notes['income_details'] = 'Income verified via bank statement';

		const result = buildFilePayload(formData, config);
		const incomeDetails = result.income_details as Record<string, unknown>;
		expect(incomeDetails._dsa_note).toBe('Income verified via bank statement');
	});
});

// ═══════════════════════════════════════════════════════════════
// validateFileIntegrity
// ═══════════════════════════════════════════════════════════════

describe('validateFileIntegrity', () => {
	it('returns true for matching hash', () => {
		const payload = { income: 100000, loan_type: 'Home Loan' };
		const hash = computePayloadHash(payload);
		expect(validateFileIntegrity(payload, hash)).toBe(true);
	});

	it('returns false for mismatched hash', () => {
		const payload = { income: 100000, loan_type: 'Home Loan' };
		const wrongHash = 'a'.repeat(64);
		expect(validateFileIntegrity(payload, wrongHash)).toBe(false);
	});

	it('returns false for tampered payload', () => {
		const originalPayload = { income: 100000, loan_type: 'Home Loan' };
		const hash = computePayloadHash(originalPayload);
		const tamperedPayload = { income: 200000, loan_type: 'Home Loan' };
		expect(validateFileIntegrity(tamperedPayload, hash)).toBe(false);
	});
});
