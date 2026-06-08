/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: DirectorRemovePickerModal confirm persists to formState immediately
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Pre-2026-05-26 (Issue 3 in the BL Director Restoration PDF):
 * `handleRemovePickerConfirm` in `AddApplicantBusiness.svelte` updated only
 * the LOCAL `directorForms` $state buffer after the user picked which
 * director(s) to keep — persistence to
 * `formState.applicants[Company].directors` was deferred to the next
 * Next-click validation block (or never happened if the user navigated
 * Previous first).
 *
 * Reproduction:
 *   1. Pvt Ltd → add 2 directors (Surbhi, Tanisha)
 *   2. Switch entity → OPC. DirectorRemovePickerModal opens
 *      (OPC requires exactly 1 director).
 *   3. Keep Surbhi, remove Tanisha. handleRemovePickerConfirm runs:
 *      directorForms = [Surbhi], BUT formState.applicants[Company].directors
 *      keeps the stale [Surbhi, Tanisha] array.
 *   4. Switch back to Pvt Ltd, set Number of Stakeholders = 2.
 *   5. Click Previous → Next (component unmount + remount).
 *   6. On remount, initDirectorForms(company) reads the stale
 *      company.directors = [Surbhi, Tanisha] and resurrects Tanisha
 *      without user consent — bypassing the recovery-bin restore flow.
 *
 * Fix: mirror the pattern from the other 3 commit sites in the file
 * (handleDirectorSave, handleDirectorRestore, validateAndCommit) —
 * commitDirectorsToApplicants + syncAutoIncomeEntries (Pitfall #46) +
 * formState.replaceApplicants inside the picker confirm itself.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of `AddApplicantBusiness.svelte`. Asserts the
 * `handleRemovePickerConfirm` function body contains all three calls:
 * commitDirectorsToApplicants, syncAutoIncomeEntries (the Pitfall #46
 * pairing required by directorAutoIncomeWiring.test.ts), and
 * formState.replaceApplicants. Same approach as
 * directorSavePersistence.test.ts (Pitfall #25) and
 * directorAutoIncomeWiring.test.ts (Pitfall #46).
 *
 * Companion: CLAUDE.md §3 Pitfall #52 (and Pitfall #25 for the
 * class-wide pattern that's specialized here).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET = {
	label: 'AddApplicantBusiness',
	path: 'src/lib/components/AddApplicantBusiness.svelte'
};

/** Extract the body of `function handleRemovePickerConfirm` — returns the {...} body or null. */
function extractPickerConfirmBody(src: string): string | null {
	const headerIdx = src.indexOf('function handleRemovePickerConfirm');
	if (headerIdx === -1) return null;
	const open = src.indexOf('{', headerIdx);
	if (open === -1) return null;
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === '{') depth++;
		else if (src[i] === '}') {
			depth--;
			if (depth === 0) return src.slice(open + 1, i);
		}
	}
	return null;
}

describe('handleRemovePickerConfirm commits to formState on confirm (not deferred to Next)', () => {
	const src = readFileSync(resolve(process.cwd(), TARGET.path), 'utf8');
	const body = extractPickerConfirmBody(src);

	it('has a handleRemovePickerConfirm function', () => {
		expect(body, `handleRemovePickerConfirm not found in ${TARGET.path}`).not.toBeNull();
	});

	it('calls commitDirectorsToApplicants(...) inside the picker confirm handler', () => {
		expect(
			body!.includes('commitDirectorsToApplicants('),
			`${TARGET.label}.handleRemovePickerConfirm must call commitDirectorsToApplicants so the kept directors persist to formState.applicants[Company].directors. Without this, on Previous → Next remount initDirectorForms reads the stale pre-removal directors array and resurrects the removed director (BL "Tanisha reappears" repro, 2026-05-26). See CLAUDE.md Pitfall #52 + #25.`
		).toBe(true);
	});

	it('pairs syncAutoIncomeEntries(...) with the commit (Pitfall #46)', () => {
		expect(
			body!.includes('syncAutoIncomeEntries('),
			`${TARGET.label}.handleRemovePickerConfirm must call syncAutoIncomeEntries after commitDirectorsToApplicants to keep the Director-in-Company auto-income rows in sync. See CLAUDE.md Pitfall #46 + #52.`
		).toBe(true);
	});

	it('calls formState.replaceApplicants(...) to persist the new applicants list', () => {
		expect(
			body!.includes('formState.replaceApplicants('),
			`${TARGET.label}.handleRemovePickerConfirm must call formState.replaceApplicants after commitDirectorsToApplicants + syncAutoIncomeEntries. See CLAUDE.md Pitfall #52.`
		).toBe(true);
	});
});
