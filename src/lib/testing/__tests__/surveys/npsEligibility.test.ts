/**
 * F.5 — NPS eligibility window math
 * ══════════════════════════════════════════════════════════════════
 * Locks the window boundaries so a future "let's widen this" tweak
 * happens deliberately + with this test failing as a tripwire.
 *
 * Windows:
 *   day30:   signup + 28d → signup + 32d  (4-day window centred on day 30)
 *   day180:  signup + 178d → signup + 182d (4-day window centred on day 180)
 *   else: null
 *
 * Pure function, no DB.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/database/mongo', () => ({
	SurveyResponses: { findOne: vi.fn(), updateOne: vi.fn(), insertOne: vi.fn() }
}));

import { computeNpsWindow } from '$lib/server/account/surveys';
import {
	NPS_DAY30_OPENS_AT_DAYS,
	NPS_DAY30_CLOSES_AT_DAYS,
	NPS_DAY180_OPENS_AT_DAYS,
	NPS_DAY180_CLOSES_AT_DAYS
} from '$lib/types/survey';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysFromSignup(signupDate: Date, ageDays: number): Date {
	return new Date(signupDate.getTime() + ageDays * MS_PER_DAY);
}

const signup = new Date('2026-01-01T00:00:00Z');

describe('computeNpsWindow — day-30 window', () => {
	it('returns null before the window opens (day 27)', () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 27))).toBeNull();
	});

	it("returns 'day30' at the exact open (day 28)", () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, NPS_DAY30_OPENS_AT_DAYS))).toBe(
			'day30'
		);
	});

	it("returns 'day30' at the centre of the window (day 30)", () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 30))).toBe('day30');
	});

	it("returns 'day30' at the exact close (day 32)", () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, NPS_DAY30_CLOSES_AT_DAYS))).toBe(
			'day30'
		);
	});

	it('returns null after the window closes (day 33)', () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 33))).toBeNull();
	});
});

describe('computeNpsWindow — day-180 window', () => {
	it('returns null between the two windows (day 100)', () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 100))).toBeNull();
	});

	it("returns 'day180' at the exact open (day 178)", () => {
		expect(
			computeNpsWindow(signup, daysFromSignup(signup, NPS_DAY180_OPENS_AT_DAYS))
		).toBe('day180');
	});

	it("returns 'day180' at the centre (day 180)", () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 180))).toBe('day180');
	});

	it("returns 'day180' at the exact close (day 182)", () => {
		expect(
			computeNpsWindow(signup, daysFromSignup(signup, NPS_DAY180_CLOSES_AT_DAYS))
		).toBe('day180');
	});

	it('returns null after the window closes (day 183)', () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 183))).toBeNull();
	});
});

describe('computeNpsWindow — edges', () => {
	it('returns null at signup itself (day 0)', () => {
		expect(computeNpsWindow(signup, signup)).toBeNull();
	});

	it('returns null deep into the future (year 5)', () => {
		expect(computeNpsWindow(signup, daysFromSignup(signup, 365 * 5))).toBeNull();
	});

	it('returns null for a "signup in the future" edge case', () => {
		const futureSignup = new Date('2030-01-01T00:00:00Z');
		const now = new Date('2026-01-01T00:00:00Z');
		expect(computeNpsWindow(futureSignup, now)).toBeNull();
	});
});

describe('Window constants — locked', () => {
	it('day-30 window is 28-32 days (centred on 30, 4-day window)', () => {
		expect(NPS_DAY30_OPENS_AT_DAYS).toBe(28);
		expect(NPS_DAY30_CLOSES_AT_DAYS).toBe(32);
	});

	it('day-180 window is 178-182 days (centred on 180, 4-day window)', () => {
		expect(NPS_DAY180_OPENS_AT_DAYS).toBe(178);
		expect(NPS_DAY180_CLOSES_AT_DAYS).toBe(182);
	});
});
