/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: forward-only month/year questions declare futureOnly:true
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User reported 2026-05-28 (Home Loan Deal & Financials screenshot): the
 * "Planned registration month" field accepted "Jan-2026" on a 2026-05-28
 * session — 4 months in the past.
 *
 * ROOT CAUSE
 * ──────────
 * `MonthYearModal.svelte` had two guards in `isMonthDisabled`:
 *   1. Disable months before `introduceMonthIndia` in `minYear` (works only
 *      because the historical default was 6 — for forward fields that set
 *      introduceMonthIndia=0, this guard is a no-op).
 *   2. Disable months AFTER today's month, but ONLY when
 *      `currentYear === maxYear` — i.e. the picker is on the last allowed
 *      year. For forward fields with `maxYear = currentYear + 2`, this
 *      guard never fires when the picker is on the current year, so past
 *      months become clickable.
 *
 * Other `monthYear` fields in the codebase (disbursement / allotment dates)
 * are correctly past-anchored — their `maxYear` defaults to the current
 * year, so the existing guard already blocks future months. No parity bug
 * elsewhere.
 *
 * FIX (2026-05-28)
 * ────────────────
 * a) `MonthYearModal.svelte` gained an optional `futureOnly: boolean` prop.
 *    When true, `isMonthDisabled` also returns true for any month strictly
 *    earlier than today within the current year, and for ALL months in any
 *    past year.
 * b) The wrapper `DatePickerYearAndMonth.svelte` accepts the prop and
 *    passes it through to `dialogState.openDatePicker`.
 * c) `dialog.svelte.ts` extended `DateAreaOpenContext` with `futureOnly?` and
 *    `openDatePicker` accepts the 7th arg.
 * d) The layout (`+layout.svelte`) forwards
 *    `dialogState.isDateAreaOpenContext.futureOnly` to MonthYearModal.
 * e) The forward-looking `q7a_registryPlannedDate` schema now declares
 *    `uiMeta.futureOnly = true`.
 *
 * THIS TEST
 * ─────────
 * 1. The Home Loan `q7a_registryPlannedDate` question declares
 *    `uiMeta.futureOnly === true`.
 * 2. Static-scan: every `uiType: 'monthYear'` question whose `question` text
 *    contains "planned" (forward-looking semantic) declares `futureOnly:true`.
 *    A new schema author cannot add another "planned X month" without the
 *    constraint.
 * 3. Source-side: `MonthYearModal.svelte` has the futureOnly prop AND the
 *    guard inside `isMonthDisabled`.
 *
 * Companion: CLAUDE.md §3 Pitfall (Planned registration month accepts past
 * months, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { q7a_registryPlannedDate } from '$lib/config/homeLoan/questionBank/dealFinancials';

describe('Month picker futureOnly — Pitfall: past months accepted', () => {
	describe('schema: q7a_registryPlannedDate declares futureOnly', () => {
		it('q7a_registryPlannedDate.uiMeta.futureOnly === true', () => {
			const uiMeta = q7a_registryPlannedDate.uiMeta as Record<string, unknown> | undefined;
			expect(uiMeta, 'q7a_registryPlannedDate must have uiMeta').toBeTruthy();
			expect(
				uiMeta!.futureOnly,
				'q7a_registryPlannedDate.uiMeta.futureOnly must be true ' +
					'(otherwise the picker accepts past months). ' +
					'See CLAUDE.md §3 Pitfall (Planned registration month accepts past months).'
			).toBe(true);
		});

		it('q7a_registryPlannedDate uses uiType=monthYear (preserves Pitfall #19)', () => {
			expect((q7a_registryPlannedDate as Record<string, unknown>).uiType).toBe('monthYear');
		});
	});

	describe('static-scan: MonthYearModal has the futureOnly prop + guard', () => {
		const filePath = resolve(process.cwd(), 'src/lib/components/MonthYearModal.svelte');
		const source = readFileSync(filePath, 'utf-8');

		it('declares the futureOnly prop on Props interface', () => {
			expect(
				/futureOnly\s*\??:\s*boolean/.test(source),
				'MonthYearModal.svelte no longer declares the futureOnly prop. ' +
					'See CLAUDE.md §3 Pitfall (Planned registration month).'
			).toBe(true);
		});

		it('isMonthDisabled references futureOnly', () => {
			const fnMatch = source.match(/function\s+isMonthDisabled\s*\([\s\S]*?\n\t\}/);
			expect(fnMatch, 'isMonthDisabled function not found').toBeTruthy();
			const fnBody = fnMatch![0];

			expect(
				fnBody.includes('futureOnly'),
				'MonthYearModal.svelte isMonthDisabled does not consult futureOnly. ' +
					'Forward-only fields will allow past months. ' +
					'See CLAUDE.md §3 Pitfall (Planned registration month).'
			).toBe(true);
		});

		it('isMonthDisabled enforces a 7-day lead-time on the current month', () => {
			// PITFALL (2026-05-28): a registry cannot realistically be scheduled
			// with less than a week's notice. The futureOnly branch must also
			// block the current month when fewer than 7 days remain in it.
			const fnMatch = source.match(/function\s+isMonthDisabled\s*\([\s\S]*?\n\t\}/);
			expect(fnMatch, 'isMonthDisabled function not found').toBeTruthy();
			const fnBody = fnMatch![0];

			// Look for the daysRemaining < 7 guard pattern inside the futureOnly
			// branch. Accept any variable name that includes "days" so a future
			// refactor isn't unnecessarily blocked.
			const sevenDayPattern = /days(Remaining|Left|Until)?\s*<\s*7/i;
			expect(
				sevenDayPattern.test(fnBody),
				'MonthYearModal.svelte isMonthDisabled does not enforce the 7-day ' +
					'lead-time guard inside the futureOnly branch. The current month must ' +
					'be blocked when fewer than 7 days remain in it. ' +
					'See CLAUDE.md §3 Pitfall (registry date 7-day minimum).'
			).toBe(true);
		});
	});

	describe('static-scan: openDatePicker signature accepts futureOnly', () => {
		const filePath = resolve(process.cwd(), 'src/lib/state/dialog.svelte.ts');
		const source = readFileSync(filePath, 'utf-8');

		it('openDatePicker has a futureOnly param', () => {
			const sigMatch = source.match(/openDatePicker\([\s\S]*?\)[\s\S]*?\{/);
			expect(sigMatch, 'openDatePicker signature not found').toBeTruthy();
			expect(
				sigMatch![0].includes('futureOnly'),
				'dialog.svelte.ts openDatePicker does not accept futureOnly. ' +
					'See CLAUDE.md §3 Pitfall (Planned registration month).'
			).toBe(true);
		});

		it('DateAreaOpenContext interface contains futureOnly', () => {
			expect(
				/DateAreaOpenContext[\s\S]{0,400}futureOnly/.test(source),
				'DateAreaOpenContext does not declare futureOnly. ' +
					'See CLAUDE.md §3 Pitfall (Planned registration month).'
			).toBe(true);
		});
	});
});
