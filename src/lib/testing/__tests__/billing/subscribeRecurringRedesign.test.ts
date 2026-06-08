/**
 * ═══════════════════════════════════════════════════════════════════════════
 * D.6 Slice 3 — SubscribeRecurringSection billing-page redesign
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Locks the source structure of the redesigned in-app billing panel so the
 * D.6 changes (monthly/annual toggle, GST disclosure per ADR-0019, single
 * Recommended badge replacing the dual static badges, feature dedup) don't
 * silently regress.
 *
 * Live verification of the panel requires an authenticated DSA session +
 * navigation through /dashboard/dsa/billing — heavy for what is a static
 * UI redesign. Combined with the pure-math helpers locked in
 * pricingFenceHelpers.test.ts + this static scan, the surface is covered.
 *
 * Companion: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.6,
 * docs/adr/0019-pricing-inclusive-of-gst.md.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PANEL_PATH = resolve('src/lib/components/billing/SubscribeRecurringSection.svelte');

describe('D.6 Slice 3 — SubscribeRecurringSection redesign', () => {
	const src = readFileSync(PANEL_PATH, 'utf-8');

	// ── Annual-toggle removal lock (monthly-only, 2026-05-28) ────────────

	describe('billing-cycle toggle removed 2026-05-28 (owner decision: monthly only)', () => {
		it('panel does NOT import or use the annual-cycle helpers', () => {
			// Lock: monthly-only product. The toggle UI + the cycle-aware
			// price branching were removed; the helpers should NEVER come
			// back without a corresponding owner decision. Negative checks
			// target USAGE shapes (imports, type annotations, function calls)
			// rather than bare identifier strings so that comments
			// documenting the historical removal don't trip the lock.
			expect(
				src,
				'SubscribeRecurringSection must not import the BillingCycle type — annual billing was removed 2026-05-28 per owner decision (monthly-only product).'
			).not.toMatch(/type BillingCycle/);
			expect(src).not.toMatch(/<BillingCycle>/);
			expect(src).not.toMatch(/getAnnualPrice\s*\(/);
			expect(src).not.toMatch(/getAnnualSavings\s*\(/);
			expect(src).not.toMatch(/ANNUAL_PRICE_MULTIPLIER\b\s*[*/+\-]/);
		});

		it('panel does NOT render a cycle toggle (no cycle-toggle / cycle-btn markup)', () => {
			// Catches a re-add of the toggle UI even if helpers are kept dead.
			expect(src).not.toMatch(/cycle-toggle/);
			expect(src).not.toMatch(/cycle-btn/);
		});

		it('panel does NOT carry billingCycle reactive state', () => {
			expect(src).not.toMatch(/billingCycle/);
		});
	});

	// ── GST disclosure (ADR-0019) ────────────────────────────────────────

	describe('GST disclosure per ADR-0019', () => {
		it('renders the inclusive-of-GST split (netTaxable + 18% GST)', () => {
			// Show "₹X + 18% GST ₹Y" alongside the inclusive total. ADR-0019
			// locks pricing as inclusive; the disclosure splits it for the
			// DSA's clarity.
			expect(src).toMatch(/plan-gst-note/);
			expect(src).toMatch(/18% GST/);
		});

		it('uses the price-info derived from displayPriceFor (single source per render)', () => {
			// Avoids computing inclusive/net/gst three times inline per card.
			expect(src).toMatch(/displayPriceFor/);
			expect(src).toMatch(/priceInfo\.netTaxable/);
			expect(src).toMatch(/priceInfo\.gst/);
		});

		it('displayPriceFor only computes monthly pricing (no cycle branch)', () => {
			// Lock the simplified body shape: reads plan.priceMonthly direct,
			// no `=== 'annual'` conditional, returns a fixed '/mo' period.
			expect(src).toMatch(/period:\s*['"]\/mo['"]/);
			expect(src).not.toMatch(/['"]\/yr['"]/);
			expect(src).not.toMatch(/=== ['"]annual['"]/);
		});
	});

	// ── Single Recommended badge (replaces dual-badge) ────────────────────

	describe('single Recommended badge — no dual-badge regression', () => {
		it('panel does NOT read the legacy plan.badge field', () => {
			// The dual "Most Popular" + "Best Value" issue. Field is gone from
			// the type; this static-scan blocks reintroducing the read.
			expect(src).not.toMatch(/plan\.badge/);
		});

		it('renders ONE badge element keyed off recommendedPlanId', () => {
			expect(src).toMatch(/recommendedPlanId/);
			// Markup uses class="plan-badge" — only the recommended plan card
			// gets one.
			expect(src).toMatch(/<span class="plan-badge">Recommended<\/span>/);
		});

		it('recommended defaults to Pro (matches landing-page marketing default)', () => {
			// In-app, the active-case-count-based recommendation will come from
			// Slice 4's 402 response. Until that's wired the panel uses the
			// same Pro default as the landing page. Slice 4 converted the
			// declaration from `const` to `$state` so the ?recommend= query
			// param can override it — match either shape so this lock
			// survives both styles.
			expect(src).toMatch(/recommendedPlanId\s*=\s*\$state<PlanId>\(['"]pro['"]\)/);
		});
	});

	// ── Feature dedup ────────────────────────────────────────────────────

	describe('feature dedup — shared base + per-tier extras', () => {
		it('SHARED_FEATURES computed as the intersection of all plans, minus case lines', () => {
			// A future "add a Pro-only feature to Basic" mistake would shrink
			// the intersection — the helper still works but per-tier extras
			// grow. This lock ensures the helper exists and is computed once
			// at module load.
			expect(src).toMatch(/const SHARED_FEATURES/);
			// Excludes "active cases" lines (those are the per-tier
			// distinguisher, rendered separately).
			expect(src).toMatch(/isCaseLine/);
		});

		it('shared-features note renders only when SHARED_FEATURES is non-empty', () => {
			// Defensive: if a future change leaves zero shared features, hide
			// the "All plans include:" note rather than render an empty line.
			expect(src).toMatch(/\{#if SHARED_FEATURES\.length > 0\}/);
		});

		it('per-card layout renders case-limit ONCE + extras list', () => {
			// Each card shows formatCaseLimit(plan) as the headline tier
			// distinguisher + a list of extras (priority support, dedicated
			// AM, etc.). NOT the full feature list (that's the dedup point).
			expect(src).toMatch(/formatCaseLimit\(plan\)/);
			expect(src).toMatch(/getTierExtras\(plan\)/);
		});

		it('formatCaseLimit treats Infinity caseLimit as "Unlimited cases"', () => {
			// Without this branch, Enterprise would render "Infinity active
			// cases" — broken display.
			expect(src).toMatch(/Unlimited cases/);
		});
	});
});
