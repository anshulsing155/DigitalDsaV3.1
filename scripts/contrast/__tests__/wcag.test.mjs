/**
 * Unit tests for WCAG colour math (parseColor, composite, contrastRatio).
 *
 * Run with:
 *   node --test scripts/contrast/__tests__/wcag.test.mjs
 *   pnpm test:contrast:unit
 *
 * Why this exists: the contrast audit's pass/fail verdict is only as
 * trustworthy as its underlying math. A bug in hex parsing, alpha compositing,
 * or luminance computation would silently produce wrong ratios and let real
 * accessibility regressions through. These tests pin the math layer against
 * known WCAG reference values (black-on-white = 21:1 etc.) so any drift is
 * caught immediately.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, composite, contrastRatio, luminance } from '../wcag.mjs';

// Helper: assert a numeric value is within `tol` of `expected`.
function assertClose(actual, expected, tol = 0.01, msg) {
	assert.ok(
		Math.abs(actual - expected) <= tol,
		msg ?? `expected ${actual} to be within ${tol} of ${expected}`
	);
}

describe('parseColor', () => {
	it('parses 6-digit hex', () => {
		assert.deepEqual(parseColor('#000000'), { r: 0, g: 0, b: 0, a: 1 });
		assert.deepEqual(parseColor('#ffffff'), { r: 255, g: 255, b: 255, a: 1 });
		assert.deepEqual(parseColor('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
	});

	it('parses 3-digit hex (expanded)', () => {
		assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
		assert.deepEqual(parseColor('#000'), { r: 0, g: 0, b: 0, a: 1 });
	});

	it('parses 8-digit hex with alpha', () => {
		const c = parseColor('#80000080');
		assert.equal(c.r, 128);
		assert.equal(c.g, 0);
		assert.equal(c.b, 0);
		assertClose(c.a, 128 / 255, 0.001);
	});

	it('parses rgb() and rgba()', () => {
		assert.deepEqual(parseColor('rgb(255, 0, 0)'), { r: 255, g: 0, b: 0, a: 1 });
		assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 });
	});

	it('parses hsl() — pure red', () => {
		const c = parseColor('hsl(0, 100%, 50%)');
		assert.equal(c.r, 255);
		assert.equal(c.g, 0);
		assert.equal(c.b, 0);
		assert.equal(c.a, 1);
	});

	it('is case-insensitive', () => {
		assert.deepEqual(parseColor('#FFFFFF'), { r: 255, g: 255, b: 255, a: 1 });
	});

	it('returns null for invalid input', () => {
		assert.equal(parseColor(''), null);
		assert.equal(parseColor(null), null);
		assert.equal(parseColor(undefined), null);
		assert.equal(parseColor('not-a-color'), null);
		assert.equal(parseColor('red'), null); // named colours intentionally unsupported
		assert.equal(parseColor('#12345'), null); // wrong hex length
	});
});

describe('luminance', () => {
	it('returns 0 for pure black', () => {
		assertClose(luminance({ r: 0, g: 0, b: 0 }), 0);
	});

	it('returns 1 for pure white', () => {
		assertClose(luminance({ r: 255, g: 255, b: 255 }), 1);
	});

	it('matches WCAG-published value for mid-gray #777', () => {
		// Reference: WebAIM contrast checker reports 0.183 for #777777
		assertClose(luminance({ r: 0x77, g: 0x77, b: 0x77 }), 0.183, 0.01);
	});
});

describe('contrastRatio', () => {
	it('black on white is 21:1 (the WCAG maximum)', () => {
		const black = parseColor('#000000');
		const white = parseColor('#ffffff');
		assertClose(contrastRatio(black, white), 21, 0.01);
	});

	it('white on white is 1:1 (no contrast)', () => {
		const white = parseColor('#ffffff');
		assertClose(contrastRatio(white, white), 1, 0.01);
	});

	it('is symmetric — fg/bg swap returns the same ratio', () => {
		const black = parseColor('#000000');
		const white = parseColor('#ffffff');
		const ab = contrastRatio(black, white);
		const ba = contrastRatio(white, black);
		assertClose(ab, ba, 0.001);
	});

	it('#767676 on white is ~4.54:1 (WCAG AA borderline)', () => {
		// Reference: #767676 is the canonical "barely passing AA" gray on white.
		// WebAIM reports 4.54:1.
		const fg = parseColor('#767676');
		const white = parseColor('#ffffff');
		assertClose(contrastRatio(fg, white), 4.54, 0.05);
	});

	it('#888 on white fails AA body (was the --landing-text-muted bug)', () => {
		// This is the exact case that 91a605a5 fixed — #888 muted text on white
		// computed to ~3.54:1, well below the 4.5 AA threshold for body text.
		const fg = parseColor('#888888');
		const white = parseColor('#ffffff');
		const ratio = contrastRatio(fg, white);
		assertClose(ratio, 3.54, 0.05);
		assert.ok(ratio < 4.5, 'should fail WCAG AA for body text');
	});

	it('#737373 on white passes AA body (the post-fix value)', () => {
		const fg = parseColor('#737373');
		const white = parseColor('#ffffff');
		const ratio = contrastRatio(fg, white);
		assert.ok(ratio >= 4.5, `expected >=4.5, got ${ratio.toFixed(2)}`);
	});
});

describe('composite (alpha compositing)', () => {
	it('fully opaque fg passes through unchanged', () => {
		const fg = { r: 255, g: 0, b: 0, a: 1 };
		const bg = { r: 0, g: 255, b: 0, a: 1 };
		assert.deepEqual(composite(fg, bg), fg);
	});

	it('fully transparent fg becomes bg colour (a=1)', () => {
		const fg = { r: 255, g: 0, b: 0, a: 0 };
		const bg = { r: 100, g: 150, b: 200, a: 1 };
		const out = composite(fg, bg);
		assert.deepEqual(out, { r: 100, g: 150, b: 200, a: 1 });
	});

	it('50% black over white renders mid-gray (~127)', () => {
		const fg = { r: 0, g: 0, b: 0, a: 0.5 };
		const bg = { r: 255, g: 255, b: 255, a: 1 };
		const out = composite(fg, bg);
		// Expected: (0 * 0.5) + (255 * 0.5) = 127.5 → rounded to 128 (or 127 depending on rounding)
		assert.ok(out.r >= 127 && out.r <= 128);
		assert.ok(out.g >= 127 && out.g <= 128);
		assert.ok(out.b >= 127 && out.b <= 128);
		assert.equal(out.a, 1);
	});

	it('translucent fg in contrastRatio uses composited colour', () => {
		// rgba(0, 0, 0, 0.15) on white should compute the same ratio as if the
		// composited grey were used directly. This is the path used by the
		// audit for the dark-mode status pill backgrounds.
		const translucentFg = { r: 0, g: 0, b: 0, a: 0.15 };
		const white = { r: 255, g: 255, b: 255, a: 1 };
		const composited = composite(translucentFg, white);
		const ratioViaComposite = contrastRatio(translucentFg, white);
		const ratioDirect = contrastRatio(composited, white);
		assertClose(ratioViaComposite, ratioDirect, 0.01);
	});
});
