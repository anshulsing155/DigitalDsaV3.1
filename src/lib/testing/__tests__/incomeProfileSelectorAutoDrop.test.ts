/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: IncomeProfileSelector auto-DROPS selected profiles hidden by showWhen
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND (Pitfall #62)
 * ────────────────────────
 * When the DSA flips an answer that hides a previously-selected income-profile
 * card (most commonly `isNRI: 'Yes'` which hides business-owner cards via their
 * card-level showWhen), the card disappears from the UI but `selectedProfiles`,
 * `applicantData.selectedProfiles`, and `incomeEntries` all keep the dropped
 * profile. The Income Details step then enumerates `selectedProfiles` and
 * demands an entry for a now-hidden profile with no UI to fulfil it — dead end.
 *
 * Fix: a `$effect` in IncomeProfileSelector.svelte filters `selectedProfiles`
 * to drop entries whose card-level `showWhen` evaluates false (locked profiles
 * excluded so the locked-auto-add $effect doesn't ping-pong) and emits the
 * filtered set via `onSelectionChange`, routing through the parent's existing
 * cleanup cascade (`handleProfileSelectionChange` → `softDeleteProfileEntries`).
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of `IncomeProfileSelector.svelte`. The auto-drop
 * effect is invisible to Vitest's render shims (Svelte 5's `$effect` doesn't
 * run under `@testing-library/svelte` without a full reactive cycle), but the
 * SHAPE of the source is pinnable: imports + a `$effect` block that filters
 * selectedProfiles by `shouldShow(card.showWhen, answersContext)` with the
 * empty-context guard + locked exclusion + onSelectionChange emit.
 *
 * Future refactors that remove any of these guarantees will fail loudly.
 *
 * Companion: CLAUDE.md Pitfall #62; Pitfall #12 is the general auto-clear rule;
 * Pitfall #57 is the unsecured-only NRI stash that this $effect supersedes for
 * the secured-loan path too.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SELECTOR_PATH = 'src/lib/components/IncomeProfileSelector.svelte';
const src = readFileSync(resolve(process.cwd(), SELECTOR_PATH), 'utf8');

// Locate the auto-drop $effect block. There are multiple `$effect(` calls in
// the file (locked-auto-add, auto-drop, reappearance-toast). We identify the
// auto-drop block as the one whose body references both `shouldShow(card.showWhen`
// and a `selectedProfiles =` reassignment. Slice it out for the per-invariant
// asserts so each test only sees the relevant block.
function extractAutoDropEffect(): string {
	const effectStarts: number[] = [];
	const re = /\$effect\(\s*\(\)\s*=>\s*\{/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src)) !== null) {
		effectStarts.push(m.index + m[0].length);
	}

	for (const start of effectStarts) {
		// Find matching close-brace by depth-counting from the position right
		// after the opening brace of the arrow body.
		let depth = 1;
		let i = start;
		while (i < src.length && depth > 0) {
			const ch = src[i];
			if (ch === '{') depth++;
			else if (ch === '}') depth--;
			i++;
		}
		const body = src.slice(start, i - 1);
		// The auto-drop effect is the one that BOTH evaluates shouldShow against
		// card.showWhen AND reassigns selectedProfiles to a filtered subset.
		// (The locked-auto-add effect mutates selectedProfiles too but it spreads
		// `missing` in, not a filter; the reappearance-toast effect references
		// neither shouldShow nor card.showWhen.)
		if (body.includes('shouldShow(card.showWhen') && body.includes('selectedProfiles = filtered')) {
			return body;
		}
	}
	throw new Error(
		'Could not locate auto-drop $effect in IncomeProfileSelector.svelte. ' +
			'Expected an effect that calls shouldShow(card.showWhen, ...) and reassigns ' +
			'selectedProfiles = filtered. See CLAUDE.md Pitfall #62.'
	);
}

describe('IncomeProfileSelector auto-DROP $effect (Pitfall #62)', () => {
	it('imports shouldShow from $lib/config/showWhenEngine', () => {
		// Without this import the filter has nothing to call — the effect would
		// either fail to compile or be a no-op against undefined.
		expect(
			src.includes(`from '$lib/config/showWhenEngine'`) && src.includes('shouldShow'),
			'IncomeProfileSelector.svelte must import shouldShow from $lib/config/showWhenEngine ' +
				'so the auto-drop filter can evaluate card-level showWhen against answersContext. ' +
				'See CLAUDE.md Pitfall #62.'
		).toBe(true);
	});

	it('contains an auto-drop $effect that filters selectedProfiles by shouldShow(card.showWhen)', () => {
		// extractAutoDropEffect throws if the block is gone — this also covers
		// the "effect deleted in a refactor" regression mode.
		const body = extractAutoDropEffect();
		expect(
			body.includes('shouldShow(card.showWhen'),
			'Auto-drop $effect must invoke shouldShow(card.showWhen, answersContext) — the ' +
				'mechanism that detects which selected profiles became hidden after an answer ' +
				'change (e.g. isNRI=Yes hiding business cards). Pitfall #62.'
		).toBe(true);
	});

	it('guards against empty answersContext to prevent silent drop during initial mount', () => {
		const body = extractAutoDropEffect();
		// shouldShow on a card whose showWhen depends on isNRI returns FALSE when
		// answersContext is {} (no isNRI key) — without this guard, every business
		// card would be treated as hidden during the transient mount window and
		// legit selections would be silently dropped before answersContext loads.
		expect(
			body.includes('Object.keys(answersContext).length === 0') ||
				body.includes('answersContext === undefined') ||
				body.includes('!answersContext'),
			'Auto-drop $effect must early-return when answersContext is empty/unloaded. ' +
				'Without this guard, the transient initial-mount state (before parent answers ' +
				'flow in) drops every business-card selection because shouldShow defaults to ' +
				'false on missing keys. This was the second-pass fix for Pitfall #62 — silent ' +
				'data loss is worse than the bug it tried to fix.'
		).toBe(true);
	});

	it('spares locked profiles from the drop filter (otherwise the locked-auto-add effect ping-pongs)', () => {
		const body = extractAutoDropEffect();
		// Two viable encodings: a Set built from lockedProfiles + lockedSet.has(p)
		// check, or a direct lockedProfiles.includes(p). Either passes; the
		// invariant is that locked profiles bypass the showWhen check.
		const hasLockedSet = body.includes('lockedSet.has(p)') || body.includes('lockedProfiles.includes');
		expect(
			hasLockedSet,
			'Auto-drop $effect must exempt locked profiles from the showWhen filter. ' +
				'Without this, the locked-auto-add $effect (which re-injects missing locked ' +
				'profiles on the next tick) would fight the auto-drop $effect forever — Svelte 5 ' +
				'detects the ping-pong and throws "effect_update_depth_exceeded". Pitfall #62.'
		).toBe(true);
	});

	it('emits the filtered selection via onSelectionChange so the parent cleanup cascade runs', () => {
		const body = extractAutoDropEffect();
		// The mutation `selectedProfiles = filtered` updates the bindable for THIS
		// component, but Pitfall #62's whole point is that lingering selections
		// poison applicantData.selectedProfiles + incomeEntries upstream. The fix
		// MUST route through onSelectionChange — that's where
		// handleProfileSelectionChange → applicantDataStore.updateSelectedProfiles
		// → softDeleteProfileEntries fires.
		expect(
			body.includes('onSelectionChange?.(filtered)') ||
				body.includes('onSelectionChange?.(selectedProfiles)'),
			'Auto-drop $effect must call onSelectionChange?.(filtered) AFTER reassigning ' +
				'selectedProfiles. The bindable mutation alone does not soft-delete the now-' +
				'orphaned incomeEntries — that happens only via the parent\'s ' +
				'handleProfileSelectionChange cascade, which is triggered by onSelectionChange. ' +
				'Pitfall #62.'
		).toBe(true);
	});
});
