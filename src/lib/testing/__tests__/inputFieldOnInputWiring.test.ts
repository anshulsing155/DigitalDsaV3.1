/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every <InputField> / <RendererInputField> with an `onInput=`
 *           prop must also pass `validateOnInput={true}` (Pitfall #55)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Both `InputField.svelte` (line 200-202) and `RendererInputField.svelte`
 * (line 207-209) call the `onInput` callback ONLY when
 * `validateOnInput === true`. The default for `validateOnInput` is `false`.
 * So a caller that passes `onInput={...}` without also passing
 * `validateOnInput={true}` has a SILENTLY DEAD callback — typing in the
 * input never invokes it.
 *
 * This is invisible at type-check time (both props are optional) and at
 * runtime there's no warning. Bugs from this class:
 *
 *   • BusinessRunnerPage 2026-05-26 (user "Father Details" screenshot):
 *     the runner's name + age were persisted to formState via
 *     persistRunnerField() called from onNameInput()/onAgeInput() — both
 *     inside the onInput handler. Without validateOnInput, the persistence
 *     never fired. The DOM showed the value (bind:value worked), but on
 *     Next-then-Previous remount the hydration $effect re-read
 *     runner.fullName from formState (still empty) and cleared the fields.
 *
 *   • ExistingLoanDetails 2026-05-26 (latent — would have surfaced as
 *     missed validation triggers).
 *
 * THIS TEST
 * ─────────
 * Source-pattern scan of every .svelte file under src/lib/components and
 * src/routes (excluding _archive). For each <InputField ...> AND
 * <RendererInputField ...> block that contains an `onInput=` prop, asserts
 * the same block also contains `validateOnInput=`. Same enforcement model
 * as directorSavePersistence (Pitfall #25), directorAutoIncomeWiring
 * (Pitfall #46), directorRemovePickerCommit (Pitfall #52),
 * caseLevelDisabledReasonWiring (Pitfall #53).
 *
 * RendererInputField was added to the scan on 2026-05-27 after an audit
 * confirmed it has the same gated-callback contract as InputField and was
 * not previously covered. The audit found only 2 components in the codebase
 * with this pattern (Audit B, 2026-05-27); no broader pitfall is needed.
 *
 * Companion: CLAUDE.md §3 Pitfall #55.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** Recursively collect .svelte files under a directory, excluding _archive. */
function collectSvelteFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (entry === '_archive' || entry === 'node_modules' || entry === '.svelte-kit') continue;
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			out.push(...collectSvelteFiles(full));
		} else if (entry.endsWith('.svelte')) {
			out.push(full);
		}
	}
	return out;
}

/**
 * Extract each `<TagName ... />` block (self-closing or with body) from
 * a source file, given a specific component tag. Returns the slice from
 * `<TagName` to the matching `/>` or `>` of the opening tag.
 *
 * Parameterized over `tagName` so the same scan runs for InputField AND
 * RendererInputField (both share the gated-callback contract).
 *
 * Care taken to match the EXACT tag — `<InputField` must not also match
 * `<InputFieldX`, and `<RendererInputField` must not match a hypothetical
 * `<RendererInputFieldX`. The check is: the char after the tag name is NOT
 * an identifier char.
 *
 * Handles:
 *  - self-closing `<TagName ... />`
 *  - multi-line attribute lists
 *  - commented-out blocks (we skip these — they're inside `<!-- ... -->`)
 */
function extractTagBlocks(src: string, tagName: string): string[] {
	const blocks: string[] = [];
	const openMarker = `<${tagName}`;

	// Strip HTML comments first so we don't false-flag commented-out usages.
	const noComments = src.replace(/<!--[\s\S]*?-->/g, '');

	let searchFrom = 0;
	while (true) {
		const start = noComments.indexOf(openMarker, searchFrom);
		if (start === -1) break;

		// Guard against prefix collisions (e.g. <InputFieldX). The char
		// immediately after the tag name must NOT be an identifier char.
		const charAfterTag = noComments[start + openMarker.length];
		if (charAfterTag && /[A-Za-z0-9_]/.test(charAfterTag)) {
			searchFrom = start + 1;
			continue;
		}

		// Find the end of this element. For self-closing, it's `/>`. For
		// pair tags, the `>` of the opening tag. We scan forward respecting
		// strings and braces.
		let i = start + openMarker.length;
		let depth = 1;
		let inString: '"' | "'" | '`' | null = null;
		let inBraces = 0;
		while (i < noComments.length) {
			const ch = noComments[i];
			if (inString) {
				if (ch === inString) inString = null;
			} else if (ch === '"' || ch === "'" || ch === '`') {
				if (inBraces > 0) inString = ch;
			} else if (ch === '{') {
				inBraces++;
			} else if (ch === '}') {
				inBraces--;
			} else if (inBraces === 0 && ch === '/' && noComments[i + 1] === '>') {
				// Self-closing: `... />`
				const block = noComments.slice(start, i + 2);
				blocks.push(block);
				searchFrom = i + 2;
				depth = 0;
				break;
			} else if (inBraces === 0 && ch === '>') {
				// Opening-tag close. We capture the opening tag content;
				// pair-tag bodies aren't relevant for the prop scan.
				const block = noComments.slice(start, i + 1);
				blocks.push(block);
				searchFrom = i + 1;
				depth = 0;
				break;
			}
			i++;
		}
		// Safety: if we couldn't find the end, advance one char to avoid
		// an infinite loop on malformed source.
		if (depth !== 0) {
			searchFrom = start + 1;
		}
	}

	return blocks;
}

const ROOTS = ['src/lib/components', 'src/routes'];

/**
 * Components that share the gated-callback contract.
 *
 * Add a tag here if a future audit discovers another component where
 * `onInput` (or a similar callback) is gated by an optional sibling prop
 * with a falsy default. The scan auto-covers every caller in `src/`.
 */
const GATED_TAGS = ['InputField', 'RendererInputField'] as const;

describe('InputField / RendererInputField onInput requires validateOnInput (Pitfall #55)', () => {
	for (const tag of GATED_TAGS) {
		describe(`<${tag}>`, () => {
			const offenders: Array<{ file: string; block: string }> = [];

			for (const root of ROOTS) {
				const abs = resolve(process.cwd(), root);
				const files = collectSvelteFiles(abs);
				for (const file of files) {
					const src = readFileSync(file, 'utf8');
					if (!src.includes(`<${tag}`)) continue;
					const blocks = extractTagBlocks(src, tag);
					for (const block of blocks) {
						const hasOnInput = /\bonInput\s*=/.test(block);
						const hasValidateOnInput = /\bvalidateOnInput\s*=/.test(block);
						if (hasOnInput && !hasValidateOnInput) {
							offenders.push({
								file: file.replace(/\\/g, '/'),
								block: block.slice(0, 200) + (block.length > 200 ? '…' : '')
							});
						}
					}
				}
			}

			it(`every <${tag}> with onInput= also passes validateOnInput={true}`, () => {
				if (offenders.length > 0) {
					const lines = offenders
						.map(
							(o, i) =>
								`  [${i + 1}] ${o.file}\n      ${o.block.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()}`
						)
						.join('\n');
					throw new Error(
						`Pitfall #55: ${offenders.length} <${tag}> block(s) pass onInput= without validateOnInput={true}. ` +
							`${tag}.svelte only invokes onInput when validateOnInput is true (default: false), ` +
							`so the callback is silently dead — typing never fires persistence/validation. ` +
							`Add validateOnInput={true} to each block below:\n${lines}`
					);
				}
				expect(offenders).toHaveLength(0);
			});
		});
	}
});
