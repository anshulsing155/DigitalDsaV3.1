/**
 * Lock test — ConfirmModal redesign state computer
 * ══════════════════════════════════════════════════════════════════════
 * `computeConfirmModalState` is the pure decision function feeding the
 * submit/edit ConfirmModal: given (quotaState, inFlightCase, isEdit) it
 * returns the locked copy + icon + badge + footer + CTAs.
 *
 * Owner-locked at S204→S217 with 5 decisions:
 *   1. Headline copy (state-specific)
 *   2. Icon (Send / AlertCircle / Edit3)
 *   3. Exhausted UX (primary CTA = Upgrade plan when wired)
 *   4. In-flight footer policy (only when quota is approaching/exhausted)
 *   5. Quota badge wording ("N of M saves used [· N-M left]")
 *
 * This test pins each decision. Changing the helper's behaviour without
 * updating this test means a UX regression slipped through.
 *
 * LEND-1 stack-pop, 2026-06-02.
 */

import { describe, it, expect } from 'vitest';
import { computeConfirmModalState } from '$lib/utils/computeConfirmModalState';
import type { QuotaState } from '$lib/server/billing/quotaState';
import type { InFlightCaseSummary } from '$lib/server/billing/getInFlightCase';

// ── Factories ──────────────────────────────────────────────────────────

function makeQuota(opts: Partial<QuotaState> = {}): QuotaState {
	return {
		planId: 'pro',
		planName: 'Pro',
		caseLimit: 5,
		saveBuffer: 5,
		activeCount: 1,
		blockedCount: 0,
		bufferRemaining: 5,
		isExhausted: false,
		isBufferFull: false,
		newCaseDisabled: false,
		editFormDisabled: false,
		recommendedPlan: 'pro',
		recommendedPlanName: 'Pro',
		recommendedPlanLimit: 5,
		...opts
	};
}

function makeInFlight(stage: 'intake' | 'profiling' | 'file_building' = 'intake'): InFlightCaseSummary {
	return {
		case_id: 'HL-2026-0042',
		label: 'Test Customer',
		stage,
		created_at: '2026-06-01T00:00:00Z'
	};
}

// ── State classification ───────────────────────────────────────────────

describe('computeConfirmModalState — state classification', () => {
	it('classifies as normal when more than 1 save would remain after submit', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 1, caseLimit: 5 }), // 3 left after submit
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.state).toBe('normal');
		expect(cfg.title).toBe('Ready to submit?');
		expect(cfg.icon).toBe('send');
	});

	it('classifies as approaching when exactly 1 save would remain after submit', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 4, caseLimit: 5 }), // 0 left after submit
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.state).toBe('approaching');
		expect(cfg.title).toBe('Ready to submit?');
	});

	it('classifies as exhausted when quota.isExhausted is true', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 5, caseLimit: 5, isExhausted: true }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.state).toBe('exhausted');
		expect(cfg.title).toBe('Quota exhausted for this cycle');
		expect(cfg.icon).toBe('alert');
	});

	it('classifies as edit when isEdit is true (regardless of quota state)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ isExhausted: true }),
			inFlightCase: null,
			isEdit: true
		});
		expect(cfg.state).toBe('edit');
		expect(cfg.title).toBe('Save changes to this application?');
		expect(cfg.icon).toBe('edit');
		expect(cfg.confirmLabel).toBe('Save and resubmit');
	});

	it('falls back to normal when no quotaState is provided (legacy callers)', () => {
		const cfg = computeConfirmModalState({
			quotaState: null,
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.state).toBe('normal');
		expect(cfg.badge).toBeUndefined();
		expect(cfg.footerNote).toBeUndefined();
	});
});

// ── Badge wording + tint ───────────────────────────────────────────────

describe('computeConfirmModalState — quota badge', () => {
	it('builds badge text as "N of M saves used · K left"', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 2, caseLimit: 5 }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.badge?.text).toBe('2 of 5 saves used · 3 left');
		expect(cfg.badge?.tint).toBe('green');
	});

	it('drops the "left" suffix when quota is fully used', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 5, caseLimit: 5, isExhausted: true }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.badge?.text).toBe('5 of 5 saves used');
		expect(cfg.badge?.tint).toBe('red');
	});

	it('uses amber tint on approaching state', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 4, caseLimit: 5 }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.badge?.tint).toBe('amber');
	});

	it('omits the badge entirely for Enterprise (Infinity caseLimit)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ caseLimit: Infinity }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.badge).toBeUndefined();
	});
});

// ── In-flight footer policy ────────────────────────────────────────────

describe('computeConfirmModalState — in-flight footer', () => {
	it('does NOT render the footer on normal state, even when an in-flight case exists', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 1 }),
			inFlightCase: makeInFlight('intake'),
			isEdit: false
		});
		expect(cfg.state).toBe('normal');
		expect(cfg.footerNote).toBeUndefined();
	});

	it('renders the footer on approaching state when an in-flight case exists', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 4, caseLimit: 5 }),
			inFlightCase: makeInFlight('intake'),
			isEdit: false
		});
		expect(cfg.state).toBe('approaching');
		expect(cfg.footerNote).toContain('Test Customer');
		expect(cfg.footerNote).toContain('still in intake');
		expect(cfg.footerNote).toContain('uses your last save');
	});

	it('renders the footer on exhausted state with different copy', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 5, caseLimit: 5, isExhausted: true }),
			inFlightCase: makeInFlight('file_building'),
			isEdit: false
		});
		expect(cfg.state).toBe('exhausted');
		expect(cfg.footerNote).toContain('Test Customer');
		expect(cfg.footerNote).toContain('in file-building');
		expect(cfg.footerNote).toContain('still counts in this cycle');
	});

	it('does NOT render the footer on edit state (in-flight case would be the one being edited)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota(),
			inFlightCase: makeInFlight(),
			isEdit: true
		});
		expect(cfg.state).toBe('edit');
		expect(cfg.footerNote).toBeUndefined();
	});

	it('does NOT render the footer when no in-flight case exists, even in exhausted state', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 5, caseLimit: 5, isExhausted: true }),
			inFlightCase: null,
			isEdit: false
		});
		expect(cfg.state).toBe('exhausted');
		expect(cfg.footerNote).toBeUndefined();
	});
});

// ── Exhausted-state CTAs ───────────────────────────────────────────────

describe('computeConfirmModalState — exhausted state CTAs', () => {
	it('primary CTA is "Upgrade plan" when onUpgrade is wired', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ isExhausted: true, caseLimit: 5, activeCount: 5 }),
			inFlightCase: null,
			isEdit: false,
			onUpgrade: () => {}
		});
		expect(cfg.confirmLabel).toBe('Upgrade plan');
	});

	it('primary CTA falls back to "Submit application" when onUpgrade is NOT wired (legacy /evaluating handles gate)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ isExhausted: true, caseLimit: 5, activeCount: 5 }),
			inFlightCase: null,
			isEdit: false
			// no onUpgrade
		});
		expect(cfg.confirmLabel).toBe('Submit application');
	});

	it('exposes secondaryAction "Save for next cycle" when onSaveForNextCycle is wired and buffer is available', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({
				isExhausted: true,
				caseLimit: 5,
				activeCount: 5,
				bufferRemaining: 1
			}),
			inFlightCase: null,
			isEdit: false,
			onSaveForNextCycle: () => {}
		});
		expect(cfg.secondaryAction?.label).toBe('Save for next cycle');
		expect(cfg.secondaryAction?.style).toBe('secondary');
	});

	it('omits secondaryAction when buffer is full (bufferRemaining=0)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({
				isExhausted: true,
				caseLimit: 5,
				activeCount: 5,
				bufferRemaining: 0
			}),
			inFlightCase: null,
			isEdit: false,
			onSaveForNextCycle: () => {}
		});
		expect(cfg.secondaryAction).toBeUndefined();
	});
});

// ── Edit state copy ────────────────────────────────────────────────────

describe('computeConfirmModalState — edit state', () => {
	it('uses edit-specific copy regardless of quota state', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 4 }), // would be approaching for new
			inFlightCase: makeInFlight(),
			isEdit: true
		});
		expect(cfg.title).toBe('Save changes to this application?');
		expect(cfg.confirmLabel).toBe('Save and resubmit');
		expect(cfg.icon).toBe('edit');
		expect(cfg.message).toContain('new version');
	});

	it('still surfaces the quota badge on edit (DSA needs to know their remaining count)', () => {
		const cfg = computeConfirmModalState({
			quotaState: makeQuota({ activeCount: 2, caseLimit: 5 }),
			inFlightCase: null,
			isEdit: true
		});
		expect(cfg.badge?.text).toBe('2 of 5 saves used · 3 left');
		expect(cfg.badge?.tint).toBe('green');
	});
});
