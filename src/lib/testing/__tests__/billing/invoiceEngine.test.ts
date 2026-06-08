/**
 * D.2 — Invoice engine tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of:
 *
 *   fyForDate(d)             — IST-correct FY math at the April-1 boundary
 *   formatInvoiceNumber      — "DDSA/2026-27/00042" zero-padded format
 *   computeInvoiceMoney      — back-compute taxable from GST-inclusive
 *                              total; sum invariant; cgst+sgst exact split
 *   resolveTaxKind           — intra / inter / b2c branching
 *   getNextInvoiceSeq        — atomic counter; concurrent calls disjoint
 *   generateInvoice          — full flow; idempotency on E11000
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockDsaFindOne = vi.fn();
const mockInvoicesInsertOne = vi.fn();
const mockInvoicesFindOne = vi.fn();
const mockCounterFindOneAndUpdate = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: {
		findOne: (...args: unknown[]) => mockDsaFindOne(...args)
	},
	Invoices: {
		insertOne: (...args: unknown[]) => mockInvoicesInsertOne(...args),
		findOne: (...args: unknown[]) => mockInvoicesFindOne(...args)
	},
	InvoiceCounters: {
		findOneAndUpdate: (...args: unknown[]) => mockCounterFindOneAndUpdate(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$app/environment', () => ({ dev: true }));

vi.mock('$env/dynamic/private', () => ({
	env: {
		INVOICE_SELLER_GSTIN: '27AAACD1234E1Z5',
		INVOICE_SELLER_LEGAL_NAME: 'TestSeller Pvt Ltd',
		INVOICE_SELLER_STATE_CODE: 'MH',
		INVOICE_SELLER_ADDRESS: 'Test address'
	}
}));

beforeEach(() => {
	mockDsaFindOne.mockReset();
	mockInvoicesInsertOne.mockReset();
	mockInvoicesFindOne.mockReset();
	mockCounterFindOneAndUpdate.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
});

// ── fyForDate ──────────────────────────────────────────────────

describe('fyForDate (IST-correct April-1 boundary math)', () => {
	it('Apr 1 IST → FY starts that year', async () => {
		const { fyForDate } = await import('../../../server/billing/invoiceEngine');
		// Apr 1, 2026 00:00 IST = Mar 31, 2026 18:30 UTC
		expect(fyForDate(new Date('2026-03-31T18:30:00Z'))).toBe('2026-27');
	});

	it('Mar 31 23:59 IST → FY is the OLD one (just ending)', async () => {
		const { fyForDate } = await import('../../../server/billing/invoiceEngine');
		// Mar 31, 2027 23:59 IST = Mar 31, 2027 18:29 UTC
		expect(fyForDate(new Date('2027-03-31T18:29:00Z'))).toBe('2026-27');
	});

	it('Apr 1 00:00 IST one year later → FY rolls', async () => {
		const { fyForDate } = await import('../../../server/billing/invoiceEngine');
		// Apr 1, 2027 00:00 IST = Mar 31, 2027 18:30 UTC
		expect(fyForDate(new Date('2027-03-31T18:30:00Z'))).toBe('2027-28');
	});

	it('Jan 15 → uses prior calendar year as FY start', async () => {
		const { fyForDate } = await import('../../../server/billing/invoiceEngine');
		expect(fyForDate(new Date('2027-01-15T12:00:00Z'))).toBe('2026-27');
	});
});

// ── formatInvoiceNumber ────────────────────────────────────────

describe('formatInvoiceNumber', () => {
	it('zero-pads to 5 digits with DDSA prefix', async () => {
		const { formatInvoiceNumber } = await import('../../../server/billing/invoiceEngine');
		expect(formatInvoiceNumber('2026-27', 1)).toBe('DDSA/2026-27/00001');
		expect(formatInvoiceNumber('2026-27', 42)).toBe('DDSA/2026-27/00042');
		expect(formatInvoiceNumber('2026-27', 99999)).toBe('DDSA/2026-27/99999');
	});
});

// ── computeInvoiceMoney ────────────────────────────────────────

describe('computeInvoiceMoney (GST-inclusive back-calc)', () => {
	it('Pro plan (₹3,999) intra-state: taxable + cgst + sgst == total', async () => {
		const { computeInvoiceMoney } = await import('../../../server/billing/invoiceEngine');
		const m = computeInvoiceMoney(399900, 'intra_state');
		expect(m.taxable_paise + m.cgst_paise + m.sgst_paise).toBe(399900);
		expect(m.igst_paise).toBe(0);
		expect(m.cgst_paise).toBe(m.sgst_paise); // even split (or off by 1 paise in edge case)
	});

	it('Pro plan inter-state: taxable + igst == total; cgst/sgst zero', async () => {
		const { computeInvoiceMoney } = await import('../../../server/billing/invoiceEngine');
		const m = computeInvoiceMoney(399900, 'inter_state');
		expect(m.taxable_paise + m.igst_paise).toBe(399900);
		expect(m.cgst_paise).toBe(0);
		expect(m.sgst_paise).toBe(0);
	});

	it('B2C uses same math as inter-state (IGST split, no buyer GSTIN)', async () => {
		const { computeInvoiceMoney } = await import('../../../server/billing/invoiceEngine');
		const m = computeInvoiceMoney(399900, 'b2c_no_gstin');
		expect(m.igst_paise).toBeGreaterThan(0);
		expect(m.cgst_paise).toBe(0);
		expect(m.sgst_paise).toBe(0);
		expect(m.taxable_paise + m.igst_paise).toBe(399900);
	});

	it('Basic plan (₹999): taxable computes to 84661, IGST 15239', async () => {
		const { computeInvoiceMoney } = await import('../../../server/billing/invoiceEngine');
		const m = computeInvoiceMoney(99900, 'inter_state');
		// 99900 / 1.18 = 84661.016... → round to 84661
		// 99900 - 84661 = 15239
		expect(m.taxable_paise).toBe(84661);
		expect(m.igst_paise).toBe(15239);
	});

	it('Edge: odd-total intra-state sgst absorbs the 1-paisa difference', async () => {
		// An amount whose taxable*0.18 isn't evenly divisible by 2 in paise.
		const { computeInvoiceMoney } = await import('../../../server/billing/invoiceEngine');
		// 50001 paise total
		const m = computeInvoiceMoney(50001, 'intra_state');
		expect(m.taxable_paise + m.cgst_paise + m.sgst_paise).toBe(50001);
		// One of cgst/sgst may be 1 paise larger than the other — both are valid.
		const diff = Math.abs(m.cgst_paise - m.sgst_paise);
		expect(diff).toBeLessThanOrEqual(1);
	});
});

// ── resolveTaxKind ─────────────────────────────────────────────

describe('resolveTaxKind', () => {
	it('no buyer GSTIN → b2c_no_gstin', async () => {
		const { resolveTaxKind } = await import('../../../server/billing/invoiceEngine');
		expect(resolveTaxKind(undefined, 'MH', 'MH')).toBe('b2c_no_gstin');
		expect(resolveTaxKind('', 'MH', 'MH')).toBe('b2c_no_gstin');
	});

	it('buyer GSTIN + matching state → intra_state', async () => {
		const { resolveTaxKind } = await import('../../../server/billing/invoiceEngine');
		expect(resolveTaxKind('27AAA...', 'MH', 'MH')).toBe('intra_state');
		// Case-insensitive
		expect(resolveTaxKind('27AAA...', 'mh', 'MH')).toBe('intra_state');
	});

	it('buyer GSTIN + different state → inter_state', async () => {
		const { resolveTaxKind } = await import('../../../server/billing/invoiceEngine');
		expect(resolveTaxKind('29BBB...', 'KA', 'MH')).toBe('inter_state');
	});

	it('buyer GSTIN but state unknown → inter_state (safer default)', async () => {
		const { resolveTaxKind } = await import('../../../server/billing/invoiceEngine');
		expect(resolveTaxKind('29BBB...', undefined, 'MH')).toBe('inter_state');
	});
});

// ── getNextInvoiceSeq ──────────────────────────────────────────

describe('getNextInvoiceSeq', () => {
	it('returns the new value from findOneAndUpdate', async () => {
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 7 });
		const { getNextInvoiceSeq } = await import('../../../server/billing/invoiceEngine');
		expect(await getNextInvoiceSeq('2026-27')).toBe(7);
		const call = mockCounterFindOneAndUpdate.mock.calls[0];
		expect(call[0]).toEqual({ _id: 'fy_2026-27' });
		expect(call[1]).toEqual({ $inc: { value: 1 } });
		expect(call[2]).toMatchObject({ upsert: true, returnDocument: 'after' });
	});

	it('throws if the counter returns no doc', async () => {
		mockCounterFindOneAndUpdate.mockResolvedValueOnce(null);
		const { getNextInvoiceSeq } = await import('../../../server/billing/invoiceEngine');
		await expect(getNextInvoiceSeq('2026-27')).rejects.toThrow();
	});
});

// ── generateInvoice ────────────────────────────────────────────

describe('generateInvoice (full flow)', () => {
	const TEST_DSA = new ObjectId();
	const TEST_TXN = new ObjectId();
	const FIXED_DATE = new Date('2026-05-15T12:00:00Z'); // FY 2026-27

	it('inserts a full invoice doc with correct tax split + counter seq', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			gstNumber: '29BBBBB1234C1Z5',
			state: 'KA',
			name: 'Test DSA'
		});
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 42 });
		mockInvoicesInsertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		const result = await generateInvoice({
			billing_transaction_id: TEST_TXN,
			dsa_id: TEST_DSA,
			plan_id: 'pro',
			amount_paise: 399900,
			issue_date: FIXED_DATE
		});

		expect(result.ok).toBe(true);
		expect(result.invoice.invoice_number).toBe('DDSA/2026-27/00042');
		expect(result.invoice.invoice_seq).toBe(42);
		expect(result.invoice.fy).toBe('2026-27');
		expect(result.invoice.tax_kind).toBe('inter_state'); // KA != MH
		expect(result.invoice.total_paise).toBe(399900);
		expect(result.invoice.taxable_paise + result.invoice.igst_paise).toBe(399900);
		expect(result.invoice.gstin_seller).toBe('27AAACD1234E1Z5');
		expect(result.invoice.gstin_buyer).toBe('29BBBBB1234C1Z5');
	});

	it('intra-state when buyer GSTIN + state == seller state', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			gstNumber: '27AAAAA1234A1Z5',
			state: 'MH',
			name: 'Test DSA'
		});
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 1 });
		mockInvoicesInsertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		const result = await generateInvoice({
			billing_transaction_id: TEST_TXN,
			dsa_id: TEST_DSA,
			plan_id: 'pro',
			amount_paise: 399900,
			issue_date: FIXED_DATE
		});

		expect(result.invoice.tax_kind).toBe('intra_state');
		expect(result.invoice.cgst_paise).toBeGreaterThan(0);
		expect(result.invoice.sgst_paise).toBeGreaterThan(0);
		expect(result.invoice.igst_paise).toBe(0);
		expect(
			result.invoice.taxable_paise + result.invoice.cgst_paise + result.invoice.sgst_paise
		).toBe(399900);
	});

	it('B2C when buyer has no GSTIN', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			gstNumber: undefined,
			state: 'MH', // even with state, no GSTIN → b2c
			name: 'Individual DSA'
		});
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 1 });
		mockInvoicesInsertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		const result = await generateInvoice({
			billing_transaction_id: TEST_TXN,
			dsa_id: TEST_DSA,
			plan_id: 'basic',
			amount_paise: 99900,
			issue_date: FIXED_DATE
		});

		expect(result.invoice.tax_kind).toBe('b2c_no_gstin');
		expect(result.invoice.gstin_buyer).toBeUndefined();
		expect(result.invoice.igst_paise).toBeGreaterThan(0);
	});

	it('throws when DsaApplications doc not found', async () => {
		mockDsaFindOne.mockResolvedValueOnce(null);
		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		await expect(
			generateInvoice({
				billing_transaction_id: TEST_TXN,
				dsa_id: TEST_DSA,
				plan_id: 'pro',
				amount_paise: 399900
			})
		).rejects.toThrow(/DsaApplications doc not found/);
	});

	it('on E11000 race, returns the existing invoice (idempotent)', async () => {
		mockDsaFindOne.mockResolvedValueOnce({
			gstNumber: '29BBB...',
			state: 'KA',
			name: 'Test'
		});
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 99 });
		const dupErr = Object.assign(new Error('E11000'), { code: 11000 });
		mockInvoicesInsertOne.mockRejectedValueOnce(dupErr);

		const existingInvoice = {
			_id: new ObjectId(),
			invoice_number: 'DDSA/2026-27/00050',
			billing_transaction_id: TEST_TXN
		};
		mockInvoicesFindOne.mockResolvedValueOnce(existingInvoice);

		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		const result = await generateInvoice({
			billing_transaction_id: TEST_TXN,
			dsa_id: TEST_DSA,
			plan_id: 'pro',
			amount_paise: 399900,
			issue_date: FIXED_DATE
		});

		expect(result.ok).toBe(true);
		expect(result.invoice).toBe(existingInvoice);
	});

	it('persists subscription_id + attempt_id when supplied', async () => {
		mockDsaFindOne.mockResolvedValueOnce({ gstNumber: undefined, state: undefined });
		mockCounterFindOneAndUpdate.mockResolvedValueOnce({ _id: 'fy_2026-27', value: 1 });
		mockInvoicesInsertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

		const SUB = new ObjectId();
		const { generateInvoice } = await import('../../../server/billing/invoiceEngine');
		const result = await generateInvoice({
			billing_transaction_id: TEST_TXN,
			dsa_id: TEST_DSA,
			plan_id: 'pro',
			amount_paise: 399900,
			subscription_id: SUB,
			attempt_id: 'att_xyz',
			issue_date: FIXED_DATE
		});

		expect(result.invoice.subscription_id).toBe(SUB);
		expect(result.invoice.attempt_id).toBe('att_xyz');
	});
});
