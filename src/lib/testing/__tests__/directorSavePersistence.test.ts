/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: saving a director from the modal commits to formState immediately
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Pre-S103 (Issue #7, 2026-05-15): `handleDirectorSave` in
 * `AddApplicantBusiness.svelte` and `AddApplicantProfessional.svelte` only
 * updated the LOCAL `directorForms` $state — persistence to
 * `formState.applicants[Company].directors` was deferred to the Next-click
 * validation block. So clicking Previous (which unmounts the component)
 * lost the just-saved director data; on remount `initDirectorForms` read
 * the empty `company.directors` and fell back to "Director N" placeholders
 * with `isComplete: false` — the table showed "Pending" again.
 *
 * Fix: commit via `commitDirectorsToApplicants` + `formState.replaceApplicants`
 * inside `handleDirectorSave` itself, so a Previous-click never loses the
 * just-saved data.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of both components' `handleDirectorSave` body.
 * Asserts it calls `commitDirectorsToApplicants(...)` AND
 * `formState.replaceApplicants(...)`. Source-pattern tests catch refactors
 * that re-introduce the regression (the original bug had the same wording).
 *
 * Companion: CLAUDE.md §3 Pitfall #25.
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

/** Extract the body of `function handleDirectorSave` — returns the {...} body or null. */
function extractHandleDirectorSaveBody(src: string): string | null {
	const headerIdx = src.indexOf('function handleDirectorSave');
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

describe('handleDirectorSave commits to formState on save (not deferred to Next)', () => {
	for (const { label, path } of COMPONENTS) {
		describe(label, () => {
			const src = readFileSync(resolve(process.cwd(), path), 'utf8');
			const body = extractHandleDirectorSaveBody(src);

			it('has a handleDirectorSave function', () => {
				expect(body, `handleDirectorSave not found in ${path}`).not.toBeNull();
			});

			it('calls commitDirectorsToApplicants(...) inside the save handler', () => {
				expect(
					body!.includes('commitDirectorsToApplicants('),
					`${label}.handleDirectorSave must call commitDirectorsToApplicants so the director persists to formState.applicants[Company].directors. Without this, clicking Previous after saving loses the data and the row reverts to "Pending" on remount. See CLAUDE.md Pitfall #25.`
				).toBe(true);
			});

			it('calls formState.replaceApplicants(...) to persist the new applicants list', () => {
				expect(
					body!.includes('formState.replaceApplicants('),
					`${label}.handleDirectorSave must call formState.replaceApplicants after commitDirectorsToApplicants. See CLAUDE.md Pitfall #25.`
				).toBe(true);
			});
		});
	}
});
