/**
 * Lock test — LEND-1 Phase 4: lender_offer section in file-builder PDF
 * ══════════════════════════════════════════════════════════════════════
 * The file-builder PDF surfaces the per-lender offer alongside form data.
 * Standard fields (Sanction / ROI / EMI / Tenure) render for every loan
 * type. Plot & Equity Loan additionally surfaces a 4-number breakdown
 * when the engine populates the four plot_equity_* fields.
 *
 * This test locks:
 *   1. Section omitted when no LenderResult is provided (e.g., no eval yet)
 *   2. Standard fields render for non-Plot-Equity LenderResult
 *   3. Plot & Equity 4-number breakdown nests when those fields are populated
 *   4. DSA can hide the section via sections_visibility (existing behavior)
 *
 * Why a lock test: the LenderResult shape can grow; the lender_offer section
 * must continue to render the canonical 4-number breakdown for Plot & Equity
 * — that's the DSA's customer-conversation surface in the printed file.
 */

import { describe, it, expect } from 'vitest';
import { getDefaultFileConfig, buildFilePayload } from '$lib/server/fileConfigurator';
import type { LenderResult } from '$lib/types/lenderResults';

function makeStandardResult(): LenderResult {
	return {
		lender_application_id: 'app-1',
		lender_name: 'Test Bank',
		lender_id: 'lender-1',
		traffic_light: 'green',
		traffic_light_message: '',
		offered_amount: 5_000_000,
		roi: 8.5,
		emi: 48_500,
		tenure_months: 240,
		key_metrics: {
			foir: 35,
			ltv: 80,
			net_income: 150_000,
			cibil: 750,
			approval_probability: 85
		}
	} as LenderResult;
}

function makePlotEquityResult(): LenderResult {
	const base = makeStandardResult();
	return {
		...base,
		plot_equity_sanction_headline: 7_000_000,
		plot_equity_seller_disbursement: 1_800_000,
		plot_equity_buyer_cash_component: 4_000_000,
		plot_equity_buyer_net_out_of_pocket: 4_200_000
	};
}

describe('LEND-1 Phase 4 — lender_offer section in buildFilePayload', () => {
	it('does NOT emit a lender_offer section when no LenderResult is provided', () => {
		const config = getDefaultFileConfig('case-1', 'Home Loan');
		const formData = { loanData: { propCost: 5_000_000 } };
		const payload = buildFilePayload(formData, config);
		expect(payload.lender_offer).toBeUndefined();
	});

	it('emits the standard 5-field lender_offer for a non-Plot-Equity result', () => {
		const config = getDefaultFileConfig('case-1', 'Home Loan');
		const formData = { loanData: { propCost: 5_000_000 } };
		const result = makeStandardResult();

		const payload = buildFilePayload(formData, config, result);
		const offer = payload.lender_offer as Record<string, unknown>;

		expect(offer).toBeDefined();
		expect(offer['Lender']).toBe('Test Bank');
		expect(offer['Sanction Amount']).toBe(5_000_000);
		expect(offer['Interest Rate (ROI)']).toBe('8.5%');
		expect(offer['Monthly EMI']).toBe(48_500);
		expect(offer['Tenure (months)']).toBe(240);
		// No Plot & Equity breakdown should be present
		expect(offer['Plot & Equity Breakdown']).toBeUndefined();
	});

	it('nests the 4-number Plot & Equity breakdown when those engine fields are populated', () => {
		const config = getDefaultFileConfig('case-1', 'Plot Loan');
		const formData = { loanData: { propCost: 10_000_000 } };
		const result = makePlotEquityResult();

		const payload = buildFilePayload(formData, config, result);
		const offer = payload.lender_offer as Record<string, unknown>;

		expect(offer).toBeDefined();
		expect(offer['Plot & Equity Breakdown']).toBeDefined();

		const breakdown = offer['Plot & Equity Breakdown'] as Record<string, unknown>;
		expect(breakdown['Sanction Headline']).toBe(7_000_000);
		expect(breakdown['Seller Payment (plot-loan file)']).toBe(1_800_000);
		expect(breakdown['Buyer Cash (LAP file)']).toBe(4_000_000);
		expect(breakdown['Buyer Net Cash Needed (out of pocket)']).toBe(4_200_000);

		// Gold-standard reference: matches PLOT-EQUITY-LOAN-DESIGN.md §3
		// (₹1Cr market, ₹20L registry, 70-90-40 → 70L/18L/40L/42L)
		// Numbers match exactly so a Phase 4 PDF regression is caught here.
	});

	it('respects sections_visibility — DSA can hide the lender_offer section', () => {
		const config = getDefaultFileConfig('case-1', 'Plot Loan');
		config.sections_visibility['lender_offer'] = false;
		const formData = { loanData: { propCost: 5_000_000 } };
		const result = makePlotEquityResult();

		const payload = buildFilePayload(formData, config, result);
		expect(payload.lender_offer).toBeUndefined();
	});

	it('renders even when only standard fields exist (Plot Loan that is NOT the Equity variant)', () => {
		// A Plot Loan Only / Plot & Construction case will have a LenderResult
		// without the 4 plot_equity_* fields. The lender_offer section must still
		// render its standard fields — only the variant-specific breakdown is gated.
		const config = getDefaultFileConfig('case-1', 'Plot Loan');
		const formData = { loanData: {} };
		const result = makeStandardResult(); // no plot_equity_* fields

		const payload = buildFilePayload(formData, config, result);
		const offer = payload.lender_offer as Record<string, unknown>;

		expect(offer['Lender']).toBe('Test Bank');
		expect(offer['Plot & Equity Breakdown']).toBeUndefined();
	});
});
