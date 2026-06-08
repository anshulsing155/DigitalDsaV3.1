import { describe, it, expect } from 'vitest';
import {
	rmContactSchema,
	rmContactCreateSchema,
	rmContactUpdateSchema,
	rmDesignationEnum
} from '$lib/schemas/rmContact.schema.js';

/**
 * RM contact validation tests.
 *
 * Existing coverage in rmContact.schema.test.ts covers:
 *  - Basic schema acceptance, missing required fields, invalid email, designation enum
 *  - Create/update schemas with partial fields
 *
 * This file adds:
 *  - Email format edge cases (various valid/invalid formats)
 *  - Phone/whatsapp field behavior
 *  - Loan types array validation edge cases
 *  - Designation enum exhaustive tests
 *  - notes_by_dsa record validation
 *  - contributed_by array validation
 *  - Full schema required fields boundary tests
 *  - Update schema combining multiple fields
 */

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function fullRmContact() {
	return {
		rm_name: 'Vijay Kumar',
		lender_name: 'HDFC Bank',
		branch: 'Andheri West',
		city: 'Mumbai',
		phone: '9876543210',
		email: 'vijay@hdfc.com',
		whatsapp: '9876543210',
		designation: 'Senior RM' as const,
		loan_types_handled: ['Home Loan', 'LAP'],
		contributed_by: ['dsa-001'],
		contributed_at: NOW,
		last_confirmed_at: NOW,
		confirmation_count: 2,
		is_active: true,
		notes_by_dsa: { 'dsa-001': 'Very responsive' },
		created_at: NOW,
		updated_at: NOW
	};
}

// ═══════════════════════════════════════════════════════════════
// rmDesignationEnum — exhaustive validation
// ═══════════════════════════════════════════════════════════════

describe('rmDesignationEnum — exhaustive designation tests', () => {
	const ALL_DESIGNATIONS = ['RM', 'Senior RM', 'Credit Manager', 'Branch Manager', 'Other'];

	it('has exactly 5 valid designations', () => {
		let count = 0;
		for (const d of ALL_DESIGNATIONS) {
			if (rmDesignationEnum.safeParse(d).success) count++;
		}
		expect(count).toBe(5);
	});

	it.each(ALL_DESIGNATIONS)('accepts valid designation: %s', (designation) => {
		const result = rmDesignationEnum.safeParse(designation);
		expect(result.success).toBe(true);
	});

	it.each([
		'VP',
		'CEO',
		'AGM',
		'Manager',
		'Relationship Manager',
		'rm',
		'SENIOR RM',
		'credit_manager',
		''
	])('rejects invalid designation: %s', (designation) => {
		const result = rmDesignationEnum.safeParse(designation);
		expect(result.success).toBe(false);
	});

	it('rejects null designation', () => {
		expect(rmDesignationEnum.safeParse(null).success).toBe(false);
	});

	it('rejects numeric designation', () => {
		expect(rmDesignationEnum.safeParse(1).success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Email format validation edge cases
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — email format edge cases', () => {
	it('accepts email with subdomain', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			email: 'vijay@branch.hdfc.com'
		});
		expect(result.success).toBe(true);
	});

	it('accepts email with plus tag', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			email: 'vijay+loans@hdfc.com'
		});
		expect(result.success).toBe(true);
	});

	it('rejects email without @ sign', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			email: 'vijay.hdfc.com'
		});
		expect(result.success).toBe(false);
	});

	it('rejects email without domain', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			email: 'vijay@'
		});
		expect(result.success).toBe(false);
	});

	it('rejects plaintext name as email', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			email: 'Vijay Kumar'
		});
		expect(result.success).toBe(false);
	});

	it('accepts omitting email entirely (optional)', () => {
		const { email, ...noEmail } = fullRmContact();
		const result = rmContactSchema.safeParse(noEmail);
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactCreateSchema — email in create context
// ═══════════════════════════════════════════════════════════════

describe('rmContactCreateSchema — email validation', () => {
	it('accepts creation without email', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Test RM',
			lender_name: 'Test Bank'
		});
		expect(result.success).toBe(true);
	});

	it('accepts creation with valid email', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Test RM',
			lender_name: 'Test Bank',
			email: 'rm@testbank.in'
		});
		expect(result.success).toBe(true);
	});

	it('rejects creation with invalid email', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Test RM',
			lender_name: 'Test Bank',
			email: 'bad-email'
		});
		expect(result.success).toBe(false);
	});

	it('error message mentions valid email', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Test RM',
			lender_name: 'Test Bank',
			email: 'bad'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
			expect(emailIssue).toBeDefined();
			expect(emailIssue?.message).toContain('email');
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Phone and whatsapp field behavior
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — phone and whatsapp fields', () => {
	it('accepts phone as any string (no format validation in schema)', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			phone: '9876543210'
		});
		expect(result.success).toBe(true);
	});

	it('accepts phone with country code', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			phone: '+919876543210'
		});
		expect(result.success).toBe(true);
	});

	it('accepts phone with dashes/spaces (schema accepts any string)', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			phone: '987-654-3210'
		});
		expect(result.success).toBe(true);
	});

	it('phone is optional', () => {
		const { phone, ...noPhone } = fullRmContact();
		const result = rmContactSchema.safeParse(noPhone);
		expect(result.success).toBe(true);
	});

	it('whatsapp is optional', () => {
		const { whatsapp, ...noWhatsapp } = fullRmContact();
		const result = rmContactSchema.safeParse(noWhatsapp);
		expect(result.success).toBe(true);
	});

	it('accepts both phone and whatsapp as different numbers', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			phone: '9876543210',
			whatsapp: '9876543211'
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Loan types handled — array validation
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — loan_types_handled array', () => {
	it('accepts single loan type', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			loan_types_handled: ['Home Loan']
		});
		expect(result.success).toBe(true);
	});

	it('accepts multiple loan types', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			loan_types_handled: ['Home Loan', 'LAP', 'Personal Loan', 'Business Loan - Unsecured']
		});
		expect(result.success).toBe(true);
	});

	it('accepts empty loan_types_handled array', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			loan_types_handled: []
		});
		expect(result.success).toBe(true);
	});

	it('loan_types_handled is optional', () => {
		const { loan_types_handled, ...noLoanTypes } = fullRmContact();
		const result = rmContactSchema.safeParse(noLoanTypes);
		expect(result.success).toBe(true);
	});

	it('loan_types_handled accepts any string values (no enum constraint)', () => {
		// The schema uses z.array(z.string()), not z.array(loanTypeEnum)
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			loan_types_handled: ['Custom Loan', 'Special Product']
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactCreateSchema — loan_types_handled in creation
// ═══════════════════════════════════════════════════════════════

describe('rmContactCreateSchema — loan_types_handled', () => {
	it('accepts creation with loan types', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'RM',
			lender_name: 'Bank',
			loan_types_handled: ['Home Loan', 'LAP']
		});
		expect(result.success).toBe(true);
	});

	it('accepts creation with empty loan types array', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'RM',
			lender_name: 'Bank',
			loan_types_handled: []
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// notes_by_dsa — record validation
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — notes_by_dsa record', () => {
	it('accepts empty notes_by_dsa record', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			notes_by_dsa: {}
		});
		expect(result.success).toBe(true);
	});

	it('accepts notes_by_dsa with multiple DSA entries', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			notes_by_dsa: {
				'dsa-001': 'Very responsive',
				'dsa-002': 'Takes long to respond',
				'dsa-003': 'Good for home loans'
			}
		});
		expect(result.success).toBe(true);
	});

	it('notes_by_dsa is required in full schema', () => {
		const { notes_by_dsa, ...noNotes } = fullRmContact();
		const result = rmContactSchema.safeParse(noNotes);
		expect(result.success).toBe(false);
	});

	it('notes_by_dsa is optional in create schema', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'RM',
			lender_name: 'Bank'
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// contributed_by — array validation
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — contributed_by array', () => {
	it('accepts contributed_by with one entry', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			contributed_by: ['dsa-001']
		});
		expect(result.success).toBe(true);
	});

	it('accepts contributed_by with multiple entries', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			contributed_by: ['dsa-001', 'dsa-002', 'dsa-003']
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing contributed_by (required)', () => {
		const { contributed_by, ...noContrib } = fullRmContact();
		const result = rmContactSchema.safeParse(noContrib);
		expect(result.success).toBe(false);
	});

	it('accepts empty contributed_by array (schema allows it)', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			contributed_by: []
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactSchema — confirmation_count and is_active
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — confirmation_count field', () => {
	it('accepts zero confirmation_count', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			confirmation_count: 0
		});
		expect(result.success).toBe(true);
	});

	it('accepts positive confirmation_count', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			confirmation_count: 50
		});
		expect(result.success).toBe(true);
	});

	it('rejects negative confirmation_count', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			confirmation_count: -1
		});
		expect(result.success).toBe(false);
	});

	it('rejects fractional confirmation_count', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			confirmation_count: 2.5
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing confirmation_count', () => {
		const { confirmation_count, ...noCount } = fullRmContact();
		const result = rmContactSchema.safeParse(noCount);
		expect(result.success).toBe(false);
	});
});

describe('rmContactSchema — is_active field', () => {
	it('accepts is_active true', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			is_active: true
		});
		expect(result.success).toBe(true);
	});

	it('accepts is_active false', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			is_active: false
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing is_active', () => {
		const { is_active, ...noActive } = fullRmContact();
		const result = rmContactSchema.safeParse(noActive);
		expect(result.success).toBe(false);
	});

	it('rejects string is_active', () => {
		const result = rmContactSchema.safeParse({
			...fullRmContact(),
			is_active: 'true'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactUpdateSchema — combined multi-field updates
// ═══════════════════════════════════════════════════════════════

describe('rmContactUpdateSchema — combined updates', () => {
	it('accepts update with multiple fields at once', () => {
		const result = rmContactUpdateSchema.safeParse({
			rm_name: 'New Name',
			branch: 'New Branch',
			city: 'New City',
			designation: 'Credit Manager',
			loan_types_handled: ['Home Loan', 'Personal Loan'],
			is_active: false
		});
		expect(result.success).toBe(true);
	});

	it('accepts update with email and phone together', () => {
		const result = rmContactUpdateSchema.safeParse({
			email: 'new@bank.com',
			phone: '1234567890',
			whatsapp: '0987654321'
		});
		expect(result.success).toBe(true);
	});

	it('rejects update with empty lender_name (min 1 char)', () => {
		const result = rmContactUpdateSchema.safeParse({
			lender_name: ''
		});
		expect(result.success).toBe(false);
	});

	it('accepts update changing only notes_by_dsa', () => {
		const result = rmContactUpdateSchema.safeParse({
			notes_by_dsa: { 'dsa-new': 'Added new note during update' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts update setting is_active to false (deactivation)', () => {
		const result = rmContactUpdateSchema.safeParse({
			is_active: false
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactSchema — date fields
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — date field coercion', () => {
	it('coerces string dates to Date objects', () => {
		const result = rmContactSchema.safeParse(fullRmContact());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.contributed_at).toBeInstanceOf(Date);
			expect(result.data.last_confirmed_at).toBeInstanceOf(Date);
			expect(result.data.created_at).toBeInstanceOf(Date);
			expect(result.data.updated_at).toBeInstanceOf(Date);
		}
	});

	it('rejects missing contributed_at', () => {
		const { contributed_at, ...noDate } = fullRmContact();
		const result = rmContactSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});

	it('rejects missing last_confirmed_at', () => {
		const { last_confirmed_at, ...noDate } = fullRmContact();
		const result = rmContactSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});

	it('rejects missing created_at', () => {
		const { created_at, ...noDate } = fullRmContact();
		const result = rmContactSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});

	it('rejects missing updated_at', () => {
		const { updated_at, ...noDate } = fullRmContact();
		const result = rmContactSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactSchema — branch and city optional fields
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema — optional fields: branch and city', () => {
	it('accepts without branch', () => {
		const { branch, ...noBranch } = fullRmContact();
		const result = rmContactSchema.safeParse(noBranch);
		expect(result.success).toBe(true);
	});

	it('accepts without city', () => {
		const { city, ...noCity } = fullRmContact();
		const result = rmContactSchema.safeParse(noCity);
		expect(result.success).toBe(true);
	});

	it('accepts without branch, city, phone, email, whatsapp, designation, loan_types', () => {
		const result = rmContactSchema.safeParse({
			rm_name: 'Minimal RM',
			lender_name: 'Some Bank',
			contributed_by: ['dsa-001'],
			contributed_at: NOW,
			last_confirmed_at: NOW,
			confirmation_count: 0,
			is_active: true,
			notes_by_dsa: {},
			created_at: NOW,
			updated_at: NOW
		});
		expect(result.success).toBe(true);
	});
});
