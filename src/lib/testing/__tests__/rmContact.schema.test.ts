import { describe, it, expect } from 'vitest';
import {
	rmContactSchema,
	rmContactCreateSchema,
	rmContactUpdateSchema,
	rmDesignationEnum
} from '$lib/schemas/rmContact.schema';

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
		designation: 'Senior RM',
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
// rmContactSchema — full schema
// ═══════════════════════════════════════════════════════════════

describe('rmContactSchema', () => {
	it('accepts minimal RM contact (rm_name + lender_name + required fields)', () => {
		const result = rmContactSchema.safeParse({
			rm_name: 'Vijay',
			lender_name: 'HDFC Bank',
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

	it('accepts full RM contact with all fields', () => {
		const result = rmContactSchema.safeParse(fullRmContact());
		expect(result.success).toBe(true);
	});

	it('rejects missing rm_name', () => {
		const { rm_name, ...noName } = fullRmContact();
		const result = rmContactSchema.safeParse(noName);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('rm_name');
		}
	});

	it('rejects empty rm_name', () => {
		const result = rmContactSchema.safeParse({ ...fullRmContact(), rm_name: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing lender_name', () => {
		const { lender_name, ...noLender } = fullRmContact();
		const result = rmContactSchema.safeParse(noLender);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('lender_name');
		}
	});

	it('rejects invalid email format', () => {
		const result = rmContactSchema.safeParse({ ...fullRmContact(), email: 'not-an-email' });
		expect(result.success).toBe(false);
	});

	it('rejects negative confirmation_count', () => {
		const result = rmContactSchema.safeParse({ ...fullRmContact(), confirmation_count: -1 });
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmDesignationEnum
// ═══════════════════════════════════════════════════════════════

describe('rmDesignationEnum', () => {
	const validDesignations = ['RM', 'Senior RM', 'Credit Manager', 'Branch Manager', 'Other'];

	it('accepts all valid designation values', () => {
		for (const designation of validDesignations) {
			const result = rmDesignationEnum.safeParse(designation);
			expect(result.success, `designation "${designation}" should be valid`).toBe(true);
		}
	});

	it('rejects invalid designation', () => {
		const result = rmDesignationEnum.safeParse('VP');
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactCreateSchema
// ═══════════════════════════════════════════════════════════════

describe('rmContactCreateSchema', () => {
	it('accepts valid creation payload (minimal)', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Vijay Kumar',
			lender_name: 'HDFC Bank'
		});
		expect(result.success).toBe(true);
	});

	it('accepts valid creation payload with all optional fields', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Vijay Kumar',
			lender_name: 'HDFC Bank',
			branch: 'Andheri West',
			city: 'Mumbai',
			phone: '9876543210',
			email: 'vijay@hdfc.com',
			whatsapp: '9876543210',
			designation: 'Senior RM',
			loan_types_handled: ['Home Loan', 'LAP'],
			notes_by_dsa: { 'dsa-001': 'Very responsive' }
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing rm_name', () => {
		const result = rmContactCreateSchema.safeParse({
			lender_name: 'HDFC Bank'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('rm_name');
		}
	});

	it('rejects missing lender_name', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Vijay'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('lender_name');
		}
	});

	it('rejects invalid email in create', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Vijay',
			lender_name: 'HDFC',
			email: 'bad-email'
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid email in create', () => {
		const result = rmContactCreateSchema.safeParse({
			rm_name: 'Vijay',
			lender_name: 'HDFC',
			email: 'vijay@hdfc.com'
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// rmContactUpdateSchema
// ═══════════════════════════════════════════════════════════════

describe('rmContactUpdateSchema', () => {
	it('accepts empty object (all optional for partial update)', () => {
		const result = rmContactUpdateSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts partial update with just rm_name', () => {
		const result = rmContactUpdateSchema.safeParse({ rm_name: 'Updated Name' });
		expect(result.success).toBe(true);
	});

	it('accepts partial update with is_active', () => {
		const result = rmContactUpdateSchema.safeParse({ is_active: false });
		expect(result.success).toBe(true);
	});

	it('accepts partial update with designation', () => {
		const result = rmContactUpdateSchema.safeParse({ designation: 'Branch Manager' });
		expect(result.success).toBe(true);
	});

	it('accepts partial update with loan_types_handled', () => {
		const result = rmContactUpdateSchema.safeParse({
			loan_types_handled: ['Personal Loan', 'Car Loan']
		});
		expect(result.success).toBe(true);
	});

	it('accepts partial update with notes_by_dsa', () => {
		const result = rmContactUpdateSchema.safeParse({
			notes_by_dsa: { 'dsa-002': 'New note' }
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty rm_name in update (min 1 char)', () => {
		const result = rmContactUpdateSchema.safeParse({ rm_name: '' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid designation in update', () => {
		const result = rmContactUpdateSchema.safeParse({ designation: 'CEO' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid email in update', () => {
		const result = rmContactUpdateSchema.safeParse({ email: 'not-email' });
		expect(result.success).toBe(false);
	});
});
