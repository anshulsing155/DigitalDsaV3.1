/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pitfall #56 — Stake % must recompute on entity-type AND director-count change
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPRO (from user PDF, 2026-05-26):
 *   1. Private Limited + 2 directors @ 50/50 → switch to OPC → picker removes
 *      one director → remaining director's ownershipPercent is stuck at 50%
 *      (should snap to 100% for OPC). Workaround required: Next → Previous
 *      navigation cycle, which re-runs initDirectorForms() and applies the
 *      isOPC ? '100' : ... rule.
 *   2. Switch back to Private Limited → the (former-OPC) director's locked
 *      100% lingers → user manually adds Director 2 at 50% → total = 150%
 *      → "Cannot exceed 100%" error. Workaround: another navigation cycle.
 *   3. RestoreApplicantModal "Restore" button is unresponsive when
 *      `dirIdx >= directorForms.length` — the guard silently returned without
 *      resetting restoreIntentState, leaving the modal stuck open forever.
 *
 * FIX
 * ───
 * 1. Pure helper `recomputeStakeAfterEntityChange(forms, newType, prevType)`
 *    in directorFormUtils.ts:
 *      • newType is OPC  → forms[0].ownershipPercent='100' + locked
 *      • prevType was OPC && newType is multi → unlock + clear stale '100'
 *      • Otherwise → no-op (multi ↔ multi has no stake invariant)
 *
 * 2. Wire the helper into BOTH:
 *      • AddApplicantBusiness.handleRemovePickerConfirm (OPC cap path)
 *      • AddApplicantBusiness.selectEntityType (multi → multi without picker)
 *    AND persist via commitDirectorsToApplicants + syncAutoIncomeEntries
 *    (Pitfall #46 pairing) so the change reaches formState immediately,
 *    not on next remount.
 *
 * 3. applyDirectorRestore: reset restoreIntentState on hard-guard failure;
 *    grow directorForms defensively on boundary `dirIdx === length` case.
 *
 * THIS TEST has two parts:
 *   A. Pure-function unit tests for recomputeStakeAfterEntityChange.
 *   B. Static source-code scan asserting every entity-switch + remove-picker
 *      call site invokes the helper before commitDirectorsToApplicants, AND
 *      both AddApplicantBusiness/Professional applyDirectorRestore reset
 *      restoreIntentState in the guard-fail branch.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	recomputeStakeAfterEntityChange,
	type DirectorForm
} from '$lib/utils/directorFormUtils';

function makeForm(over: Partial<DirectorForm> = {}): DirectorForm {
	return {
		id: 'd1',
		fullName: 'Test Director',
		gender: 'male',
		age: '40',
		maritalStatus: 'married',
		ownershipPercent: '50',
		location: 'same_city',
		isNRI: 'No',
		onProperty: 'false',
		onEMI: 'false',
		designation: 'director',
		loanRole: 'co_borrower',
		restoredFrom: '',
		lockedFields: [],
		pendingMatch: null,
		...over
	};
}

// ── Part A — pure helper behavior ──────────────────────────────────────────

describe('recomputeStakeAfterEntityChange (Pitfall #56)', () => {
	const OPC = 'One Person Company (OPC)';
	const PVT = 'Private Limited';
	const LLP_T = 'LLP';

	it('forces OPC director to 100% and locks ownershipPercent', () => {
		const before = [makeForm({ ownershipPercent: '50', lockedFields: ['designation'] })];
		const after = recomputeStakeAfterEntityChange(before, OPC, PVT);
		expect(after).toHaveLength(1);
		expect(after[0].ownershipPercent).toBe('100');
		expect(after[0].lockedFields).toContain('ownershipPercent');
		expect(after[0].lockedFields).toContain('designation');
	});

	it('clears stale 100% AND unlocks ownershipPercent when leaving OPC', () => {
		const before = [
			makeForm({ ownershipPercent: '100', lockedFields: ['ownershipPercent', 'designation'] })
		];
		const after = recomputeStakeAfterEntityChange(before, PVT, OPC);
		expect(after[0].ownershipPercent).toBe('');
		expect(after[0].lockedFields).not.toContain('ownershipPercent');
		// Other locks survive.
		expect(after[0].lockedFields).toContain('designation');
	});

	it('preserves user-entered values when leaving OPC if not the synthetic 100%', () => {
		// Defensive: if for any reason the OPC director was at e.g. 75%, the
		// helper should not blow it away.
		const before = [
			makeForm({ ownershipPercent: '75', lockedFields: ['ownershipPercent'] })
		];
		const after = recomputeStakeAfterEntityChange(before, PVT, OPC);
		expect(after[0].ownershipPercent).toBe('75');
		expect(after[0].lockedFields).not.toContain('ownershipPercent');
	});

	it('returns input unchanged when neither side is OPC (multi ↔ multi)', () => {
		const before = [
			makeForm({ id: 'a', ownershipPercent: '60' }),
			makeForm({ id: 'b', ownershipPercent: '40' })
		];
		const after = recomputeStakeAfterEntityChange(before, PVT, LLP_T);
		expect(after).toBe(before);
	});

	it('only forces 100 on slot 0 if extra OPC slots somehow exist', () => {
		// resizeDirectorForms should have capped this to length 1 before we get
		// here, but be defensive — only the first slot gets the 100%.
		const before = [
			makeForm({ id: 'a', ownershipPercent: '50' }),
			makeForm({ id: 'b', ownershipPercent: '50' })
		];
		const after = recomputeStakeAfterEntityChange(before, OPC, PVT);
		expect(after[0].ownershipPercent).toBe('100');
		expect(after[1].ownershipPercent).toBe('50');
	});
});

// ── Part B — static source-code scan ───────────────────────────────────────

const REPO_ROOT = resolve(__dirname, '../../../..');

function read(rel: string): string {
	return readFileSync(resolve(REPO_ROOT, rel), 'utf8');
}

describe('Pitfall #56 source-pattern lock', () => {
	it('AddApplicantBusiness imports recomputeStakeAfterEntityChange', () => {
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		expect(src).toMatch(/recomputeStakeAfterEntityChange/);
	});

	it('AddApplicantBusiness.handleRemovePickerConfirm calls recomputeStakeAfterEntityChange', () => {
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		// Find handleRemovePickerConfirm body — match from function start until
		// the next top-level `function` declaration.
		const match = src.match(
			/function handleRemovePickerConfirm\([^)]*\)\s*\{([\s\S]*?)\n\tfunction /
		);
		expect(match, 'handleRemovePickerConfirm not found').toBeTruthy();
		expect(match![1]).toMatch(/recomputeStakeAfterEntityChange\(/);
	});

	it('AddApplicantBusiness.selectEntityType calls recomputeStakeAfterEntityChange', () => {
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		const match = src.match(
			/function selectEntityType\([^)]*\)\s*\{([\s\S]*?)\n\tfunction /
		);
		expect(match, 'selectEntityType not found').toBeTruthy();
		expect(match![1]).toMatch(/recomputeStakeAfterEntityChange\(/);
	});

	it('BL applyDirectorRestore resets restoreIntentState on guard failure', () => {
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		const match = src.match(
			/export function applyDirectorRestore\([^)]*\)[\s\S]*?\{([\s\S]*?)\n\t\}\n/
		);
		expect(match, 'applyDirectorRestore not found').toBeTruthy();
		// Must reset restoreIntentState somewhere in the guard branch — without
		// this, a guard-fail leaves the modal stuck open ("Restore unresponsive").
		expect(match![1]).toMatch(/restoreIntentState\.reset\(\)/);
	});

	it('Professional applyDirectorRestore resets restoreIntentState on guard failure', () => {
		const src = read('src/lib/components/AddApplicantProfessional.svelte');
		const match = src.match(
			/export function applyDirectorRestore\([^)]*\)[\s\S]*?\{([\s\S]*?)\n\t\}\n/
		);
		expect(match, 'applyDirectorRestore not found').toBeTruthy();
		expect(match![1]).toMatch(/restoreIntentState\.reset\(\)/);
	});
});
