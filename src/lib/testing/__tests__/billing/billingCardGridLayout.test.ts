/**
 * ═══════════════════════════════════════════════════════════════════════════
 * D.6 polish — billing page card-grid layout locks
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Locks the structural choices in SubscribeRecurringSection.svelte after
 * the radio-row → card-grid redesign:
 *
 *   • 3-col grid on desktop, 2-col on tablet (<= 1023px), 1-col on mobile
 *     (<= 767px). Matches the responsive pattern used by
 *     AffordabilityBreakdown.svelte (the most similar existing
 *     dashboard card grid).
 *   • Surfaces use --dash-* tokens (so dark mode + the 5 selectable
 *     schemes work automatically). NOT --ddsa-border-color or hardcoded
 *     hex — the audit caught two of those during the D.6 close-out.
 *   • Recommended card uses --ddsa-primary-* for the highlight ring +
 *     a 1.02 scale lift at >= 1024px. The scale is intentionally
 *     suppressed at mobile width.
 *   • Radio input present but visually hidden (.sr-only) — the form
 *     semantics + $state bindings stay intact; the visible affordance
 *     is the card + a "Choose"/"Selected" pill.
 *
 * Companion: src/lib/components/dashboard/results/AffordabilityBreakdown.svelte
 * (the precedent for the responsive breakpoint pattern); src/app.css
 * (token namespace map).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PANEL_PATH = resolve('src/lib/components/billing/SubscribeRecurringSection.svelte');

describe('D.6 polish — billing card-grid layout', () => {
	const src = readFileSync(PANEL_PATH, 'utf-8');

	// ── Layer 1: grid structure ─────────────────────────────────────────

	describe('responsive grid', () => {
		it('desktop layout is grid with 3 equal columns', () => {
			// .plan-list at the top level (no media query) — picked up by
			// the default desktop styling.
			expect(src).toMatch(
				/\.plan-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)/
			);
		});

		it('collapses to 2 columns at tablet width (<= 1023px)', () => {
			expect(src).toMatch(
				/@media \(max-width:\s*1023px\)[\s\S]*?grid-template-columns:\s*repeat\(2,\s*1fr\)/
			);
		});

		it('collapses to 1 column at mobile width (<= 767px)', () => {
			expect(src).toMatch(
				/@media \(max-width:\s*767px\)[\s\S]*?grid-template-columns:\s*1fr/
			);
		});

		it('plan-list is display:grid (NOT the legacy flex column)', () => {
			// Specifically negative-check the old shape — catches a future
			// revert that silently brings the radio-row layout back.
			const planListRule = src.match(/\.plan-list\s*\{[\s\S]*?\n\t\}/);
			expect(planListRule).not.toBeNull();
			expect(planListRule![0]).toMatch(/display:\s*grid/);
			expect(planListRule![0]).not.toMatch(/display:\s*flex/);
			expect(planListRule![0]).not.toMatch(/flex-direction:\s*column/);
		});
	});

	// ── Layer 2: token-based surfaces ────────────────────────────────────

	describe('--dash-* tokens for card surfaces', () => {
		// All key surface properties on .plan-option must read from --dash-*
		// tokens so dark mode + the 5 selectable schemes adapt automatically.

		it('card background uses --dash-bg-card', () => {
			expect(src).toMatch(
				/\.plan-option\s*\{[\s\S]*?background:\s*var\(--dash-bg-card/
			);
		});

		it('card border uses --dash-border-light', () => {
			expect(src).toMatch(
				/\.plan-option\s*\{[\s\S]*?border:[\s\S]*?var\(--dash-border-light/
			);
		});

		it('plan name color uses --dash-text', () => {
			expect(src).toMatch(/\.plan-name\s*\{[\s\S]*?color:\s*var\(--dash-text/);
		});

		it('plan price color uses --dash-text', () => {
			expect(src).toMatch(/\.plan-price\s*\{[\s\S]*?color:\s*var\(--dash-text/);
		});

		it('GST note color uses --dash-text-muted', () => {
			expect(src).toMatch(
				/\.plan-gst-note\s*\{[\s\S]*?color:\s*var\(--dash-text-muted/
			);
		});
	});

	// ── Layer 3: Recommended vs Selected card highlight ──────────────────
	//
	// CANONICAL DESIGN (re-locked 2026-06-01 after the visual-ambiguity fix):
	//   .plan-option.recommended → soft cue ONLY (drop shadow + desktop scale
	//     + RECOMMENDED badge). NO border-color, NO ring.
	//   .plan-option.selected → strong primary-green border + color-mix ring.
	//
	// Pre-2026-06-01 both states applied --ddsa-primary-500 border-color, so
	// every recommended-but-unselected card looked identical to the user's
	// actual selection. The earlier lock test ratified that buggy state —
	// retargeting per CLAUDE.md §16 Rule 16 (lock canonical, not current).

	describe('Recommended card is a soft cue (no border ring)', () => {
		it('.plan-option.recommended does NOT apply --ddsa-primary-500 border-color', () => {
			// Negative assertion: if a future change reintroduces the border
			// ring on .recommended, the visual ambiguity returns. Regex uses
			// [^}]* so it stays inside the rule block and does NOT spill into
			// the later .plan-option.selected rule (which DOES use that token).
			expect(src).not.toMatch(
				/\.plan-option\.recommended\s*\{[^}]*?border-color:\s*var\(--ddsa-primary-500/
			);
		});

		it('.plan-option.recommended carries a drop-shadow as the visual cue', () => {
			expect(src).toMatch(
				/\.plan-option\.recommended\s*\{[^}]*?box-shadow:\s*0 8px 20px/
			);
		});

		it('scale lift is gated to >= 1024px (desktop only)', () => {
			// Lift would be redundant at mobile (the 1-col stack already
			// makes every card full-width). Only the desktop breakpoint
			// applies the scale.
			expect(src).toMatch(
				/@media \(min-width:\s*1024px\)[\s\S]*?\.plan-option\.recommended[\s\S]*?transform:\s*scale\(1\.02\)/
			);
		});
	});

	describe('Selected card owns the primary-token border + ring', () => {
		it('.plan-option.selected border-color uses --ddsa-primary-500', () => {
			expect(src).toMatch(
				/\.plan-option\.selected\s*\{[\s\S]*?border-color:\s*var\(--ddsa-primary-500/
			);
		});

		it('.plan-option.selected outer ring composed from --ddsa-primary-500 via color-mix', () => {
			expect(src).toMatch(
				/\.plan-option\.selected\s*\{[\s\S]*?color-mix\(in srgb,\s*var\(--ddsa-primary-500\)\s*18%/
			);
		});

		it('.plan-option.selected is declared AFTER .plan-option.recommended in source order', () => {
			// CSS rule order matters when a card has both classes (Pro is
			// both recommended-by-default AND user-selected). The later rule
			// at equal specificity wins → selected must come after recommended
			// so the selection ring is visible on the recommended card.
			const recIdx = src.indexOf('.plan-option.recommended');
			const selIdx = src.indexOf('.plan-option.selected {');
			expect(recIdx).toBeGreaterThan(-1);
			expect(selIdx).toBeGreaterThan(-1);
			expect(selIdx).toBeGreaterThan(recIdx);
		});
	});

	// ── Layer 4: hidden radio + visible Choose affordance ───────────────

	describe('hidden radio + Choose pill (accessibility)', () => {
		it('radio input carries the sr-only class', () => {
			expect(src).toMatch(/<input[\s\S]*?type="radio"[\s\S]*?class="sr-only"/);
		});

		it('sr-only class definition is present in the style block', () => {
			// Standard WCAG-safe screen-reader-only pattern. Without this
			// the radio is unfocusable AND invisible, breaking keyboard nav.
			expect(src).toMatch(/\.sr-only\s*\{[\s\S]*?clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
		});

		it('Choose/Selected pill renders inside each card', () => {
			expect(src).toMatch(/<span class="plan-choose"/);
			expect(src).toMatch(/isSelected \? '✓ Selected' : 'Choose'/);
		});

		it('Choose pill is decorative (aria-hidden="true")', () => {
			// The form state lives on the radio; the pill is visual only.
			// Setting aria-hidden avoids reading "Choose" twice to AT users
			// (once for the radio label, once for the pill).
			expect(src).toMatch(/<span class="plan-choose"\s+aria-hidden="true">/);
		});
	});
});
