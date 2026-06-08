/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pitfall #57 — NRI flip must stash NRI-incompatible business income entries
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPRO (user 2026-05-26):
 *   "If user changes any existing applicant, with business income details in
 *    any loan, to NRI, business incomes gets hidden but previous entries
 *    still remain there at next page where we capture income profile wise
 *    incomes and this makes the payload unusable."
 *
 * The product rule: NRIs are only supported as salaried — lenders cannot
 * verify business / directorship / professional-practice income from
 * non-resident applicants. The income-profile cards have a
 * `showWhen: { '==': ['isNRI', 'No'] }` gate, so once isNRI flips to Yes
 * those CARDS disappear from the UI. But the ENTRIES already in
 * `formState.applicants[idx].incomeEntries` were not cleaned, so the
 * submitted payload still carried e.g. `director_company` rows against
 * an isNRI=Yes applicant.
 *
 * FIX
 * ───
 * `applyNriIncomeStashForApplicant(applicantId, becomingNRI)` in
 * `unsecuredApplicantHandlers.ts`:
 *   - becomingNRI=true → filter entries by NRI_INCOMPATIBLE profile list,
 *     move them to `_stashedIncomeEntries[profileType]`, drop those
 *     profiles from `selectedIncomeProfiles`, leave NRI-compatible
 *     entries untouched.
 *   - becomingNRI=false → pop stashed incompatible entries back into
 *     `incomeEntries` AND restore those profiles into
 *     `selectedIncomeProfiles`.
 *
 * Wired into `updateFormField` of all 3 unsecured AddApplicant components
 * (Business / Professional / Personal) — on every isNRI change.
 *
 * Parity: secured-loan path runs through
 * `applicantFormManager.applyNriCleanup` which calls
 * `applicantDataStore.updateSelectedProfiles` (auto-soft-deletes via
 * `softDeleteProfileEntries`). This new helper covers the unsecured-loan
 * data path (formState.applicants[idx].incomeEntries).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formState } from '$lib/state/form.svelte';
import { applyNriIncomeStashForApplicant } from '$lib/utils/unsecuredApplicantHandlers';
import type { IncomeSourceEntry, IncomeProfileType } from '$lib/types/incomeProfile';

function makeEntry(
	profileType: IncomeProfileType,
	id: string,
	entityName = ''
): IncomeSourceEntry {
	return {
		id,
		profileType,
		entityName,
		monthlyIncome: '50000'
	} as unknown as IncomeSourceEntry;
}

describe('applyNriIncomeStashForApplicant (Pitfall #57)', () => {
	beforeEach(() => {
		// Reset to a known clean state
		formState.replaceApplicants([]);
	});

	it('stashes director_company + business_proprietorship entries on isNRI flip to Yes', () => {
		formState.replaceApplicants([
			{
				id: 'app1',
				applicantType: 'Individual',
				fullName: 'Test',
				isNRI: 'No' as unknown as boolean,
				selectedIncomeProfiles: ['salaried_regular', 'director_company', 'business_proprietorship'],
				incomeEntries: [
					makeEntry('salaried_regular' as IncomeProfileType, 'e1'),
					makeEntry('director_company' as IncomeProfileType, 'e2', 'Acme Pvt Ltd'),
					makeEntry('business_proprietorship' as IncomeProfileType, 'e3', 'Sole Shop')
				]
			}
		]);

		applyNriIncomeStashForApplicant('app1', true);

		const a = formState.applicants[0] as Record<string, unknown>;
		expect(a.selectedIncomeProfiles).toEqual(['salaried_regular']);
		expect(a.incomeEntries).toHaveLength(1);
		expect((a.incomeEntries as IncomeSourceEntry[])[0].profileType).toBe('salaried_regular');

		const stash = a._stashedIncomeEntries as Record<string, IncomeSourceEntry[]>;
		expect(Object.keys(stash).sort()).toEqual(['business_proprietorship', 'director_company']);
		expect(stash.director_company[0].entityName).toBe('Acme Pvt Ltd');
		expect(stash.business_proprietorship[0].entityName).toBe('Sole Shop');
	});

	it('restores stashed entries on isNRI flip back to No', () => {
		formState.replaceApplicants([
			{
				id: 'app1',
				applicantType: 'Individual',
				fullName: 'Test',
				isNRI: 'Yes' as unknown as boolean,
				selectedIncomeProfiles: ['salaried_regular'],
				incomeEntries: [makeEntry('salaried_regular' as IncomeProfileType, 'e1')],
				_stashedIncomeEntries: {
					director_company: [makeEntry('director_company' as IncomeProfileType, 'e2', 'Acme')],
					business_proprietorship: [
						makeEntry('business_proprietorship' as IncomeProfileType, 'e3', 'Shop')
					]
				}
			}
		]);

		applyNriIncomeStashForApplicant('app1', false);

		const a = formState.applicants[0] as Record<string, unknown>;
		expect(a.selectedIncomeProfiles).toContain('salaried_regular');
		expect(a.selectedIncomeProfiles).toContain('director_company');
		expect(a.selectedIncomeProfiles).toContain('business_proprietorship');
		expect((a.incomeEntries as IncomeSourceEntry[]).map((e) => e.id).sort()).toEqual([
			'e1',
			'e2',
			'e3'
		]);
		// Stash should be empty after restore.
		expect(Object.keys(a._stashedIncomeEntries as Record<string, unknown>)).toEqual([]);
	});

	it('is a no-op when applicant has no NRI-incompatible profiles', () => {
		formState.replaceApplicants([
			{
				id: 'app1',
				applicantType: 'Individual',
				isNRI: 'No' as unknown as boolean,
				selectedIncomeProfiles: ['salaried_regular', 'rental_income'],
				incomeEntries: [
					makeEntry('salaried_regular' as IncomeProfileType, 'e1'),
					makeEntry('rental_income' as IncomeProfileType, 'e2')
				]
			}
		]);

		const before = JSON.stringify(formState.applicants[0]);
		applyNriIncomeStashForApplicant('app1', true);
		const after = JSON.stringify(formState.applicants[0]);
		// No business profiles → no stash → applicant entry unchanged.
		expect(after).toBe(before);
	});

	it('is a no-op when applicantId is not found', () => {
		formState.replaceApplicants([
			{ id: 'app1', applicantType: 'Individual', isNRI: 'No' as unknown as boolean }
		]);
		const before = JSON.stringify(formState.applicants);
		applyNriIncomeStashForApplicant('nonexistent', true);
		expect(JSON.stringify(formState.applicants)).toBe(before);
	});

	it('preserves NRI-compatible entries (salaried, rental, etc.) when stashing business income', () => {
		formState.replaceApplicants([
			{
				id: 'app1',
				applicantType: 'Individual',
				isNRI: 'No' as unknown as boolean,
				selectedIncomeProfiles: ['salaried_regular', 'rental_income', 'professional_practice'],
				incomeEntries: [
					makeEntry('salaried_regular' as IncomeProfileType, 'e1'),
					makeEntry('rental_income' as IncomeProfileType, 'e2'),
					makeEntry('professional_practice' as IncomeProfileType, 'e3', 'CA Practice')
				]
			}
		]);

		applyNriIncomeStashForApplicant('app1', true);

		const a = formState.applicants[0] as Record<string, unknown>;
		// Only professional_practice should be stashed; salaried + rental untouched.
		expect(a.selectedIncomeProfiles).toEqual(['salaried_regular', 'rental_income']);
		expect((a.incomeEntries as IncomeSourceEntry[]).map((e) => e.id).sort()).toEqual(['e1', 'e2']);
		const stash = a._stashedIncomeEntries as Record<string, IncomeSourceEntry[]>;
		expect(stash.professional_practice[0].entityName).toBe('CA Practice');
	});

	it('handles repeated stash → restore → stash cycles without data loss', () => {
		formState.replaceApplicants([
			{
				id: 'app1',
				applicantType: 'Individual',
				isNRI: 'No' as unknown as boolean,
				selectedIncomeProfiles: ['salaried_regular', 'director_company'],
				incomeEntries: [
					makeEntry('salaried_regular' as IncomeProfileType, 'e1'),
					makeEntry('director_company' as IncomeProfileType, 'e2', 'Acme')
				]
			}
		]);

		applyNriIncomeStashForApplicant('app1', true);
		applyNriIncomeStashForApplicant('app1', false);
		applyNriIncomeStashForApplicant('app1', true);

		const a = formState.applicants[0] as Record<string, unknown>;
		const stash = a._stashedIncomeEntries as Record<string, IncomeSourceEntry[]>;
		expect(stash.director_company[0].entityName).toBe('Acme');
		expect(a.selectedIncomeProfiles).toEqual(['salaried_regular']);
	});
});

// Static source-pattern scan — every unsecured AddApplicant must wire the
// helper on isNRI changes. Same enforcement model as Pitfall #56.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../..');
function read(rel: string): string {
	return readFileSync(resolve(REPO_ROOT, rel), 'utf8');
}

describe('Pitfall #57 source-pattern lock', () => {
	const TARGETS = [
		'src/lib/components/AddApplicantBusiness.svelte',
		'src/lib/components/AddApplicantProfessional.svelte',
		'src/lib/components/AddApplicantPersonal.svelte'
	];

	for (const path of TARGETS) {
		it(`${path} imports applyNriIncomeStashForApplicant`, () => {
			const src = read(path);
			expect(src).toMatch(/applyNriIncomeStashForApplicant/);
		});

		it(`${path} calls the helper inside updateFormField for isNRI`, () => {
			const src = read(path);
			const match = src.match(
				/function updateFormField\([^)]*\)\s*\{([\s\S]*?)\n\t\}\n/
			);
			expect(match, `updateFormField not found in ${path}`).toBeTruthy();
			expect(match![1]).toMatch(/isNRI/);
			expect(match![1]).toMatch(/applyNriIncomeStashForApplicant\(/);
		});
	}
});
