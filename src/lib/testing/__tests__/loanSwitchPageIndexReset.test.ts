/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: per-loan page indices reset across loan-switch + restore via undo
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * CLAUDE.md Pitfall #38: every loan-scoped store MUST register with
 * `loanSwitchOrchestrator`; ad-hoc cleanup leaves stale state bleeding into
 * the next loan. Commit `62dd4f6c` (2026-05-28) added the 7 page-index fields
 * (Home Loan's `currentPageIndex`, `lapPageIndex`, `plotLoanPageIndex`,
 * `businessLoanPageIndex`, `personalLoanPageIndex`, `professionalLoanPageIndex`,
 * `applicantPageIndex`) to the orchestrator after a user-reported bug:
 *
 *   submit Home Loan → browser-back → switch to Plot Loan > BT Only (no submit)
 *   → switch back to Home Loan → click Next on picker
 *   → user lands directly on the LAST page (Pre-Sanction Profile), applicants
 *     gone from sidebar, button says "Next" not "Show Offers", loader stalls
 *
 * Root cause: `formState.currentPageIndex` (and the 6 siblings) weren't in
 * the chokepoint's registry, so they survived every loan switch.
 *
 * THIS TEST
 * ─────────
 * Two layers — static + integration.
 *
 *   1. Static scan: the orchestrator source MUST contain a
 *      `registerLoanSwitchOwner('formState.pageIndices', ...)` block and the
 *      block MUST mention all 7 page-index field names. A future rename or
 *      partial-deregister regression fails one of these.
 *
 *   2. Integration: set known values on every page index, call
 *      `switchLoanType`, assert all 7 are zeroed. Then call `undoLastSwitch`
 *      and assert all 7 are restored. Round-trips the dump/clear/restore
 *      contract via the public API rather than the registry internals.
 *
 * Companion: CLAUDE.md §3 Pitfall #38, §4 grep recipe, loanSwitchOrchestrator.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { userFormConformationState } from '$lib/stores/userFormConformation.svelte';
import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
import { loanParkingState } from '$lib/state/loanParking.svelte';
import {
	switchLoanType,
	undoLastSwitch
} from '$lib/utils/loanSwitchOrchestrator.svelte';

const ORCHESTRATOR_PATH = 'src/lib/utils/loanSwitchOrchestrator.svelte.ts';

// The 7 per-loan + cross-loan page-index fields, all stored directly on
// formState. Reordering this list is fine; renaming a field requires updating
// the orchestrator owner block AND this list together (intentional friction).
const PAGE_INDEX_FIELDS = [
	'currentPageIndex',
	'applicantPageIndex',
	'lapPageIndex',
	'plotLoanPageIndex',
	'businessLoanPageIndex',
	'personalLoanPageIndex',
	'professionalLoanPageIndex'
] as const;

type PageIndexField = (typeof PAGE_INDEX_FIELDS)[number];

function resetAllOwners(): void {
	formState.replaceApplicants([]);
	formState.replaceLoanData({});
	formState.applicationData = {} as typeof formState.applicationData;
	userFormConformationState.reset();
	userRelationships.set([]);
	applicantState.clearAll();
	loanParkingState._resetForTests();
	// Reset every page index to a known baseline so each test sees a clean slate.
	for (const f of PAGE_INDEX_FIELDS) {
		(formState as unknown as Record<PageIndexField, number>)[f] = 0;
	}
}

function setAllPageIndices(value: number): void {
	for (const f of PAGE_INDEX_FIELDS) {
		(formState as unknown as Record<PageIndexField, number>)[f] = value;
	}
}

function readPageIndex(field: PageIndexField): number {
	return (formState as unknown as Record<PageIndexField, number>)[field];
}

describe('loanSwitchOrchestrator — page-index owner registration (Pitfall #38)', () => {
	// ── Static scan: source asserts the owner exists with all 7 fields ──────

	describe('static source scan', () => {
		const src = readFileSync(resolve(ORCHESTRATOR_PATH), 'utf8');

		it('registers an owner with id "formState.pageIndices"', () => {
			expect(
				/registerLoanSwitchOwner\(\s*['"]formState\.pageIndices['"]/.test(src),
				`Expected registerLoanSwitchOwner('formState.pageIndices', ...) in ${ORCHESTRATOR_PATH} — without it, every page index survives a loan switch and the next loan +page.svelte mounts on a stale page (Pitfall #38)`
			).toBe(true);
		});

		// Locate the owner block — from the registration call to its closing
		// });  — and assert each field appears inside it. The block extraction is
		// deliberately loose (greedy across newlines) because we only care that
		// all field names appear within the registration; the dump/clear/restore
		// closures can rearrange how they reference them.
		const blockMatch = src.match(
			/registerLoanSwitchOwner\(\s*['"]formState\.pageIndices['"][\s\S]*?\n\}\);/
		);

		it('extracts the owner block from source', () => {
			expect(
				blockMatch,
				`Could not locate the formState.pageIndices owner block in ${ORCHESTRATOR_PATH} — refactor likely changed the registration shape`
			).not.toBeNull();
		});

		for (const field of PAGE_INDEX_FIELDS) {
			it(`owner block mentions ${field}`, () => {
				expect(blockMatch).not.toBeNull();
				const block = blockMatch![0];
				expect(
					block.includes(field),
					`formState.pageIndices owner block is missing "${field}". Either dump/clear/restore was partially refactored, or a new sibling page-index field was added without wiring it through the chokepoint — same class of bug as 62dd4f6c.`
				).toBe(true);
			});
		}
	});

	// ── Integration: dump → clear → restore via public API ──────────────────

	describe('switchLoanType + undoLastSwitch round-trip', () => {
		beforeEach(() => {
			resetAllOwners();
		});

		it('switchLoanType zeroes every page index', () => {
			// Arrange — give the orchestrator non-trivial prior state so it
			// runs the full park-clear-migrate path (hasMeaningfulPriorData is
			// the gate; loanData with answered keys satisfies it).
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});
			setAllPageIndices(7);

			// Act
			switchLoanType('Personal Loan', 'Plot Loan');

			// Assert — every page index reset to 0 (clean slate for the new loan)
			for (const f of PAGE_INDEX_FIELDS) {
				expect(readPageIndex(f), `${f} should be 0 after switchLoanType`).toBe(0);
			}
		});

		it('undoLastSwitch restores every page index to its pre-switch value', () => {
			// Arrange — give each index a distinct value so we can detect any
			// cross-wiring in the restore path (e.g. lapPageIndex restored from
			// currentPageIndex's blob slot).
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});
			const distinctValues: Record<PageIndexField, number> = {
				currentPageIndex: 11,
				applicantPageIndex: 12,
				lapPageIndex: 13,
				plotLoanPageIndex: 14,
				businessLoanPageIndex: 15,
				personalLoanPageIndex: 16,
				professionalLoanPageIndex: 17
			};
			for (const f of PAGE_INDEX_FIELDS) {
				(formState as unknown as Record<PageIndexField, number>)[f] = distinctValues[f];
			}

			// Act — switch (everything goes to 0) then undo (everything should
			// come back to its distinct pre-switch value).
			switchLoanType('Personal Loan', 'Plot Loan');
			const undoApplied = undoLastSwitch();

			// Assert — undo claimed success AND every field round-tripped exactly.
			expect(undoApplied).toBe(true);
			for (const f of PAGE_INDEX_FIELDS) {
				expect(
					readPageIndex(f),
					`${f} should be restored to ${distinctValues[f]} after undoLastSwitch`
				).toBe(distinctValues[f]);
			}
		});
	});
});
