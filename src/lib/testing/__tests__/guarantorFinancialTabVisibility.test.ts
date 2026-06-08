/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: Guarantor (Financial) renders all 5 income tabs
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User-reported 2026-05-28 (Home Loan multi-applicant screenshot):
 *   - Applicant 2 was a Guarantor (Financial) with onEMI=No + onProperty=No.
 *   - Inside the per-applicant edit modal: ZERO tabs rendered, the Done
 *     button was disabled-gray (looked invisible), no message to the DSA.
 *   - The applicant was unfinishable; the case was stuck.
 *
 * ROOT CAUSE
 * ──────────
 * `buildIncomeTabs` in `src/lib/utils/incomeTabState.ts` previously excluded
 * `guarantor_financial` from the classification-aware tab-filtering branch
 * (the author intended for it to fall through to `return baseTabs` — all 5
 * tabs). But the role-based legacy branch immediately AFTER the classification
 * check intercepts first: for a Guarantor with onEMI=No+onProperty=No,
 * `getApplicantRole` resolves to `'not_on_loan'` → `getRequiredTabs('not_on_loan')`
 * returns `[]` → the filter produces ZERO tabs.
 *
 * FIX (2026-05-28)
 * ────────────────
 * Removed the `&& classification !== 'guarantor_financial'` exclusion from
 * line 526 of `incomeTabState.ts`. With the exclusion gone, `guarantor_financial`
 * enters the classification branch and calls
 * `getRequiredTabsForClassification('guarantor_financial')` which correctly
 * returns all 5 tabs (profile / income_profiles / income_details /
 * credit_score / obligations_details).
 *
 * THIS TEST
 * ─────────
 * Behavioral test: `buildIncomeTabs` for `classification='guarantor_financial'`
 * must return all 5 tabs regardless of what `role` is passed (including
 * `'not_on_loan'`, `undefined`, `'pending'`).
 *
 * PLUS a static-scan that asserts the exclusion is NOT silently re-added —
 * pattern scan looks for `classification !== 'guarantor_financial'` in the
 * source.
 *
 * Same enforcement model as `directorAutoIncomeWiring.test.ts` (Pitfall #46).
 *
 * Companion: CLAUDE.md §3 Pitfall (Guarantor Done-button dead-end, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildIncomeTabs } from '$lib/utils/incomeTabState';

const ALL_5_TAB_IDS = [
	'profile',
	'income_profiles',
	'income_details',
	'credit_score',
	'obligations_details'
];

describe('Guarantor (Financial) tab visibility — Pitfall: Done-button dead-end', () => {
	describe('behavioral — buildIncomeTabs returns all 5 tabs for guarantor_financial', () => {
		const applicant = {
			id: 'g1',
			applicantType: 'Individual',
			creditScore: 750
		};

		it('returns all 5 tabs when role is not_on_loan (the reproduction)', () => {
			const tabs = buildIncomeTabs(applicant, {}, 'not_on_loan', 'guarantor_financial');
			expect(tabs.map((t) => t.id)).toEqual(ALL_5_TAB_IDS);
		});

		it('returns all 5 tabs when role is undefined', () => {
			const tabs = buildIncomeTabs(applicant, {}, undefined, 'guarantor_financial');
			expect(tabs.map((t) => t.id)).toEqual(ALL_5_TAB_IDS);
		});

		it('returns all 5 tabs when role is pending', () => {
			const tabs = buildIncomeTabs(applicant, {}, 'pending', 'guarantor_financial');
			expect(tabs.map((t) => t.id)).toEqual(ALL_5_TAB_IDS);
		});

		it('returns all 5 tabs when role is borrower (passthrough sanity)', () => {
			// 'borrower' is the role for someone on EMI OR property — a normal
			// co-applicant. The classification is what drives the tab list.
			const tabs = buildIncomeTabs(applicant, {}, 'borrower', 'guarantor_financial');
			expect(tabs.map((t) => t.id)).toEqual(ALL_5_TAB_IDS);
		});
	});

	describe('regression guard — static-scan ensures exclusion is not re-added', () => {
		it('incomeTabState.ts must NOT exclude guarantor_financial from the classification branch', () => {
			const filePath = resolve(
				process.cwd(),
				'src/lib/utils/incomeTabState.ts'
			);
			const source = readFileSync(filePath, 'utf-8');

			// Find the buildIncomeTabs function body
			const fnStart = source.indexOf('export function buildIncomeTabs');
			expect(fnStart, 'buildIncomeTabs not found in incomeTabState.ts').toBeGreaterThan(-1);

			// Slice 4000 chars from buildIncomeTabs to bound the scan
			const slice = source.slice(fnStart, fnStart + 4000);

			// The exclusion pattern that caused the bug
			const offendingPattern = /classification\s*!==\s*['"]guarantor_financial['"]/;

			expect(
				offendingPattern.test(slice),
				'BUG REGRESSION — guarantor_financial exclusion has been re-added to ' +
					'buildIncomeTabs. This routes Guarantor (Financial) applicants into ' +
					'the role-legacy branch where role=not_on_loan returns ZERO tabs, ' +
					'making the Done button disabled-gray and the case unfinishable. ' +
					'See CLAUDE.md §3 Pitfall (Guarantor Done-button dead-end).'
			).toBe(false);
		});
	});
});
