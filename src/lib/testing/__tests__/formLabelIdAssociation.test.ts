import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Lock test — `<label for=…>` ↔ `<input id=…>` association in form wrappers.
 *
 * Chrome DevTools Issues panel flags "Incorrect use of <label for=FORM_ELEMENT>"
 * whenever a `<label for="X">` exists in the DOM but no element carries `id="X"`.
 * Before 2026-06-06, three sites in this codebase reliably produced that warning
 * on every loan-form page:
 *
 *   1. TextField.svelte array-input mode (showTitleDropdown / showAreaUnitDropdown):
 *      the outer `<label for={id}>` paired with `<input id={`${id}_${i}`}>` —
 *      no element had `id={id}`, so the label pointed at nothing.
 *   2. NumberField.svelte — identical array-input pattern.
 *   3. DirectorCountPicker.svelte — hardcoded `id="director-count-custom"` on the
 *      custom input meant two pickers on the same page collided; the visible
 *      heading was a `<p>` (not a `<label>` or `aria-labelledby` target) so the
 *      whole picker had no programmatic label at all.
 *
 * Fixes applied 2026-06-06:
 *   • TextField / NumberField — first array input now uses `id={i === 0 ? id : `${id}_${i}`}`
 *     so the outer label associates with the first input. `name=` attributes
 *     left UNCHANGED (no form-data or autofill impact).
 *   • DirectorCountPicker — accepts an optional `id` prop (module-scope counter
 *     fallback when omitted); custom input id derives from `${id}_custom`;
 *     container wrapped in `role="group"` + `aria-labelledby` pointing at the
 *     visible heading.
 *
 * These assertions lock the SOURCE PATTERN so a refactor that reverts the
 * ternary or re-hardcodes the picker id fails `pnpm test:unit` rather than
 * resurfacing in DevTools weeks later. They run sub-millisecond — pure regex
 * scans of source — so no flake risk under CPU contention (the convention
 * established by sessionStatusPollerCanonical.test.ts in commit 876d5759).
 *
 * Companion grep recipe: docs/PREFLIGHT-GREPS.md (Pitfall #78).
 */

const TEXT_FIELD_PATH = resolve(__dirname, '../../components/TextField.svelte');
const NUMBER_FIELD_PATH = resolve(__dirname, '../../components/NumberField.svelte');
const DIRECTOR_PICKER_PATH = resolve(__dirname, '../../components/DirectorCountPicker.svelte');
const QUESTION_RENDERER_PATH = resolve(__dirname, '../../components/QuestionRenderer.svelte');

describe('Form-wrapper label-for / input-id association (Chrome DevTools Issues lock)', () => {

	describe('TextField.svelte', () => {
		const source = readFileSync(TEXT_FIELD_PATH, 'utf-8');

		it('renders the outer `<label for={id}>` heading', () => {
			// The outer label is what the array-mode fix associates with the first input.
			// If this label is removed, the fix's assumption breaks silently.
			expect(source).toMatch(/<label\s+[\s\S]*?for=\{id\}/);
		});

		it('array-input mode: first input uses `id={id}`, others use `${id}_${i}`', () => {
			// The exact source pattern that resolves the broken label-for.
			// Reverting to `id={`${id}_${i}`}` would re-introduce the violation.
			expect(source).toMatch(/id=\{i\s*===\s*0\s*\?\s*id\s*:\s*`\$\{id\}_\$\{i\}`\}/);
		});

		it('array-input mode does NOT use the broken `id={`${id}_${i}`}` pattern without the ternary', () => {
			// Negative-space assertion: nothing in the file may unconditionally suffix
			// the first input. If a future edit ever renders both inputs and the array
			// inputs with the same suffixed pattern, this catches it.
			const arrayInputBlock = source.match(/{#each placeholder as ph, i}[\s\S]*?{\/each}/);
			expect(arrayInputBlock).not.toBeNull();
			// Must contain the ternary form; must not contain a bare-suffix `id=` line.
			expect(arrayInputBlock![0]).not.toMatch(/^\s*id=\{`\$\{id\}_\$\{i\}`\}\s*$/m);
		});

		it('single-input mode still passes `{id}` to its input', () => {
			// Single-input mode was already correct; lock it so refactors don't drop it.
			expect(source).toMatch(/<input\s+[\s\S]*?\{id\}/);
		});
	});

	describe('NumberField.svelte', () => {
		const source = readFileSync(NUMBER_FIELD_PATH, 'utf-8');

		it('array-input mode: first input uses `id={id}`, others use `${id}_${i}`', () => {
			expect(source).toMatch(/id=\{i\s*===\s*0\s*\?\s*id\s*:\s*`\$\{id\}_\$\{i\}`\}/);
		});

		it('single-input mode passes `{id}` to its input', () => {
			expect(source).toMatch(/<input\s+[\s\S]*?\{id\}/);
		});
	});

	describe('DirectorCountPicker.svelte', () => {
		const source = readFileSync(DIRECTOR_PICKER_PATH, 'utf-8');

		it('declares an optional `id?: string` prop', () => {
			expect(source).toMatch(/id\?:\s*string/);
		});

		it('does NOT hardcode the previous `id="director-count-custom"` literal', () => {
			// Hardcoded literal collided when two pickers mounted on the same page.
			// The fix derives a per-instance scoped id from the `id` prop.
			expect(source).not.toMatch(/id="director-count-custom"/);
		});

		it('custom input id derives from the `id` prop via `${id}_custom`', () => {
			expect(source).toMatch(/customInputId\s*=\s*\$derived\(`\$\{id\}_custom`\)/);
		});

		it('container wraps the picker in `role="group"` with `aria-labelledby`', () => {
			// Without this, the visible heading is not programmatically associated
			// with the chip-button group (screen-reader gap).
			expect(source).toMatch(/role="group"/);
			expect(source).toMatch(/aria-labelledby=\{label\s*\?\s*groupLabelId\s*:\s*undefined\}/);
		});

		it('module-scope counter exists so the fallback id is unique across instances', () => {
			// If this counter ever drops back into instance scope (`<script lang="ts">`
			// instead of `<script module lang="ts">`), every fallback instance would
			// re-collide on `…-1` — re-introducing the duplicate-id warning.
			expect(source).toMatch(/<script\s+module\s+lang="ts">[\s\S]*?pickerInstanceCounter/);
		});
	});

	describe('QuestionRenderer.svelte', () => {
		const source = readFileSync(QUESTION_RENDERER_PATH, 'utf-8');

		it('passes `id` to DirectorCountPicker matching sibling-component convention', () => {
			// Other wrappers in this renderer (RendererInputField, NewSelect, BooleanSelect)
			// receive `id={`${q.key}-${index}`}`. DirectorCountPicker was the only one
			// missing it pre-2026-06-06 — its fallback id worked but is a code smell.
			const block = source.match(/<DirectorCountPicker[\s\S]*?\/>/);
			expect(block).not.toBeNull();
			expect(block![0]).toMatch(/id=\{`\$\{q\.key\}-\$\{index\}`\}/);
		});
	});
});
