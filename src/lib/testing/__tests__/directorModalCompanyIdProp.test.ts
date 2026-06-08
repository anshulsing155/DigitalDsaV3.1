/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: BL + Professional Loan DirectorFormModal must receive currentCompanyId
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User reported 2026-05-28 (Business Loan → Pvt Ltd → OPC → Pvt Ltd
 * ping-pong screenshot): Restore button on the "Previous Record Found"
 * modal was completely unresponsive when re-adding a previously-deleted
 * director.
 *
 * ROOT CAUSE
 * ──────────
 * `DirectorFormModal.svelte` builds the `restoreIntentState.directorRestore`
 * payload conditionally on `currentCompanyId` being truthy. If the prop is
 * absent (or undefined), the payload becomes `undefined`. The downstream
 * restore handler (`handleRestoreModalConfirm` in
 * `src/lib/utils/directorRestoreHandler.ts`) checks
 * `restoreIntentState.directorRestore` — when it's undefined, the handler
 * skips the director branch, falls through to the applicant-level path,
 * bails at the `currentIndex === undefined` guard in
 * `prefillApplicantRestore`, resets state, and silently closes the modal.
 * Zero data is written. From the user's perspective: Restore button dead.
 *
 * Secured loans (`AddApplicant.svelte`) correctly pass
 * `currentCompanyId={directorModalData.currentCompanyId}` — which is why
 * director restore works on Home Loan / LAP / Plot Loan but was broken on
 * Business Loan and Professional Loan.
 *
 * The OPC ping-pong reproduction was a red herring — the bug fires any time
 * a BL or Professional director name matches a recovery entry. The
 * ping-pong is just one way to land the name in the recovery bin.
 *
 * FIX (2026-05-28)
 * ────────────────
 * `AddApplicantBusiness.svelte` and `AddApplicantProfessional.svelte` now
 * compute `currentCompanyId` inline via
 * `formState.applicants.find(a => a.applicantType === 'Company')?.id` and
 * pass it as a prop to `DirectorFormModal`.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of the two unsecured AddApplicant components
 * that own a Company → directors flow. For each file, asserts:
 *   1. The `<DirectorFormModal` block contains a `currentCompanyId` prop
 *      (either as `currentCompanyId={...}` or as the Svelte 5 shorthand
 *      `{currentCompanyId}` after a local `{@const}` declaration).
 *   2. The file contains a derivation that looks up the Company applicant
 *      id from `formState.applicants`.
 *
 * Same enforcement model as `directorRemovePickerCommit.test.ts` (Pitfall
 * #52) and `directorAutoIncomeWiring.test.ts` (Pitfall #46).
 *
 * Personal Loan has no director flow and is intentionally NOT covered.
 *
 * Companion: CLAUDE.md §3 Pitfall (BL/Prof director restore dead, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
	{
		label: 'AddApplicantBusiness.svelte',
		path: 'src/lib/components/AddApplicantBusiness.svelte'
	},
	{
		label: 'AddApplicantProfessional.svelte',
		path: 'src/lib/components/AddApplicantProfessional.svelte'
	}
];

describe('DirectorFormModal must receive currentCompanyId in BL + Professional Loan', () => {
	for (const f of FILES) {
		describe(f.label, () => {
			const source = readFileSync(resolve(process.cwd(), f.path), 'utf-8');

			it('contains a <DirectorFormModal block', () => {
				expect(
					source.includes('<DirectorFormModal'),
					`${f.label} does not instantiate DirectorFormModal — test may need updating.`
				).toBe(true);
			});

			it('declares currentCompanyId derived from formState.applicants', () => {
				// Accept either an {@const currentCompanyId = ...} declaration OR
				// a $derived variable. Use [\s\S] (not [^)]*) so the inner
				// arrow `(a) =>` parens don't terminate the match prematurely.
				const companyLookupPattern =
					/currentCompanyId[\s\S]{0,300}?applicants\.find\([\s\S]{0,200}?applicantType\s*===\s*['"]Company['"]/;
				expect(
					companyLookupPattern.test(source),
					`${f.label} does not derive currentCompanyId from ` +
						`formState.applicants.find(a => a.applicantType === 'Company'). ` +
						`Without this, DirectorFormModal cannot wire restoreIntentState.directorRestore ` +
						`and the Restore button silently fails. ` +
						`See CLAUDE.md §3 Pitfall (BL/Prof director restore dead, 2026-05-28).`
				).toBe(true);
			});

			it('passes currentCompanyId as a prop to DirectorFormModal', () => {
				// Find the DirectorFormModal block (open tag to its closing />)
				const blockMatch = source.match(/<DirectorFormModal[\s\S]*?\/>/);
				expect(blockMatch, `${f.label} <DirectorFormModal block not found`).toBeTruthy();
				const block = blockMatch![0];

				// Accept either explicit `currentCompanyId={...}` or shorthand `{currentCompanyId}`
				const explicit = /currentCompanyId\s*=\s*\{/.test(block);
				const shorthand = /\{currentCompanyId\}/.test(block);

				expect(
					explicit || shorthand,
					`${f.label} <DirectorFormModal block does NOT pass the currentCompanyId prop. ` +
						`Without it, the restore intent payload is undefined and the Restore ` +
						`button on "Previous Record Found" modal silently does nothing. ` +
						`See CLAUDE.md §3 Pitfall (BL/Prof director restore dead, 2026-05-28).`
				).toBe(true);
			});
		});
	}
});
