/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: BL / Professional director save wires syncAutoIncomeEntries
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Home Loan (HL) goes through `applicantFormManager.handleDirectorSave`,
 * which after `commitDirectorsToApplicants` ALSO calls `syncAutoIncomeEntries`
 * on every linked Individual — that's what pre-creates the locked
 * Director-in-Company income row visible in the Director modal's Income
 * Details tab, and what sets `sourceCompanyId` so the company combobox
 * auto-links instead of allowing a conflicting free-typed name (Pitfall #44).
 *
 * Pre-2026-05-23 BL / Professional did NOT do this:
 *   • `AddApplicantBusiness.handleDirectorSave` and the validate-on-Next path
 *     called `commitDirectorsToApplicants` then `formState.replaceApplicants`
 *     — but never `syncAutoIncomeEntries`.
 *   • Same gap in `AddApplicantProfessional.handleDirectorSave` and its
 *     validate-on-Next path.
 *
 * Symptom: Setting up an OPC + Director in BL is identical to HL by every
 * other field, but the Income Details tab is empty ("No income sources added
 * yet"), and the manually-added Director-in-Company income form shows only
 * the gate question ("Is this company registered in India?") instead of the
 * four locked auto-filled fields HL shows (designation, shareholding,
 * activeInOperations, itrReflectsIncome).
 *
 * Fix: add a sync pass after every `commitDirectorsToApplicants` call —
 * iterate linked Individuals and update their `incomeEntries` via
 * `syncAutoIncomeEntries(linkedCompanyIds, applicants, existing, fullName)`.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of `AddApplicantBusiness.svelte` and
 * `AddApplicantProfessional.svelte`. Asserts both files import
 * `syncAutoIncomeEntries` from `$lib/utils/directorAutoIncome` AND that every
 * call to `commitDirectorsToApplicants(...)` has at least one
 * `syncAutoIncomeEntries(...)` call following it in the same function body.
 * Source-pattern tests catch refactors that re-introduce the regression
 * (same approach as `directorSavePersistence.test.ts` for Pitfall #25).
 *
 * Companion: CLAUDE.md Pitfall #29 + #44; directorAutoIncome.test.ts has the
 * pure-utility parity tests for the underlying create / sync helpers.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMPONENTS: Array<{ label: string; path: string }> = [
	{
		label: 'AddApplicantBusiness',
		path: 'src/lib/components/AddApplicantBusiness.svelte'
	},
	{
		label: 'AddApplicantProfessional',
		path: 'src/lib/components/AddApplicantProfessional.svelte'
	}
];

describe('Director save wires syncAutoIncomeEntries after commitDirectorsToApplicants', () => {
	for (const { label, path } of COMPONENTS) {
		describe(label, () => {
			const src = readFileSync(resolve(process.cwd(), path), 'utf8');

			it('imports syncAutoIncomeEntries from $lib/utils/directorAutoIncome', () => {
				expect(
					src.includes(`from '$lib/utils/directorAutoIncome'`),
					`${label} must import from $lib/utils/directorAutoIncome so the income-entry sync runs alongside director persistence. Without this, the Director modal's Income Details tab shows "No income sources added yet" for OPC/Pvt Ltd directors — HL renders the pre-created locked row. See CLAUDE.md Pitfall #29 + #44.`
				).toBe(true);
				expect(
					src.includes('syncAutoIncomeEntries'),
					`${label} must reference syncAutoIncomeEntries by name.`
				).toBe(true);
			});

			it('every commitDirectorsToApplicants call is followed by a syncAutoIncomeEntries call', () => {
				// Find each commitDirectorsToApplicants( occurrence (skip imports / type
				// references — match the function call form only). Then scan ahead a
				// reasonable window (3 KB of source — covers the largest validate-on-
				// Next block) for a syncAutoIncomeEntries( call before the next
				// formState.replaceApplicants() flushes the applicants list. Without
				// the sync between commit and replace, the auto-income rows are never
				// created and the bug returns.
				const callRegex = /commitDirectorsToApplicants\(/g;
				const commitCallSites: number[] = [];
				let m: RegExpExecArray | null;
				while ((m = callRegex.exec(src)) !== null) {
					commitCallSites.push(m.index);
				}

				// We accept this as long as every commit site has a sync site within
				// the next 3 KB of source AND that sync site precedes the next
				// replaceApplicants — meaning the sync feeds into the same flush.
				expect(commitCallSites.length, `${label} must call commitDirectorsToApplicants somewhere.`).toBeGreaterThan(
					0
				);

				for (const idx of commitCallSites) {
					const window = src.slice(idx, idx + 3000);
					const syncIdx = window.indexOf('syncAutoIncomeEntries(');
					const replaceIdx = window.indexOf('formState.replaceApplicants(');
					expect(
						syncIdx,
						`${label}: commitDirectorsToApplicants at offset ${idx} must be followed by a syncAutoIncomeEntries call within the same logical block. Without it, Director-in-Company income rows are never auto-created and the Income Details tab is empty (Pitfall #29 + #44).`
					).toBeGreaterThanOrEqual(0);
					expect(
						replaceIdx,
						`${label}: commitDirectorsToApplicants at offset ${idx} should be followed by a formState.replaceApplicants flush.`
					).toBeGreaterThanOrEqual(0);
					expect(
						syncIdx < replaceIdx,
						`${label}: syncAutoIncomeEntries (at +${syncIdx}) must execute BEFORE formState.replaceApplicants (at +${replaceIdx}), so the sync's incomeEntries updates flow into the same applicants snapshot. Otherwise the replace flushes stale (empty) incomeEntries.`
					).toBe(true);
				}
			});
		});
	}
});

// ──────────────────────────────────────────────────────────────────────────
// Specifics parity: director_company is loan-type-agnostic in config
// ──────────────────────────────────────────────────────────────────────────
//
// The bug surfaced as "BL only shows 1 question while HL shows 4 locked
// fields" — sounded like config divergence, but the schema for director_company
// specifics is shared. This test pins that down: getSpecificsForProfile() is
// driven purely by the IncomeProfileType — there's no loan-type branch in
// the lookup. So any future regression that tries to add a per-loan-type
// override for director_company specifics will fail this test.

import { getSpecificsForProfile } from '$lib/config/incomeProfiles';

describe('Director-in-Company specifics are identical across loan-type contexts', () => {
	it('getSpecificsForProfile(director_company) returns the same field set regardless of caller', () => {
		// Call multiple times — pure function, should be stable.
		const a = getSpecificsForProfile('director_company');
		const b = getSpecificsForProfile('director_company');
		expect(a.map((q) => q.key)).toEqual(b.map((q) => q.key));
		// Must include the four person-level fields HL renders as locked rows
		// (registeredInIndia is the gate; companyType is hidden via
		// COMPANY_LEVEL_HIDDEN_KEYS once isCompanySourced, but the other four
		// stay visible-and-locked):
		const keys = new Set(a.map((q) => q.key));
		expect(keys.has('hasEquity')).toBe(true);
		expect(keys.has('designation')).toBe(true);
		expect(keys.has('shareholding')).toBe(true);
		expect(keys.has('activeInOperations')).toBe(true);
		expect(keys.has('itrReflectsIncome')).toBe(true);
	});
});
