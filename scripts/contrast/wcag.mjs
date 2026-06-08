/**
 * WCAG 2.1 contrast ratio computation.
 *
 * Formula reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 *   1. Convert sRGB channel value (0..255) to a 0..1 scale.
 *   2. Linearize each channel:
 *        c_lin = c <= 0.03928 ? c/12.92 : ((c + 0.055)/1.055)^2.4
 *   3. Relative luminance:
 *        L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 *   4. Contrast ratio:
 *        (L_lighter + 0.05) / (L_darker + 0.05)
 *      Result is in [1, 21]. WCAG AA requires:
 *        - 4.5 for normal body text (<18pt or <14pt bold)
 *        - 3.0 for large text (>=18pt or >=14pt bold) and UI components
 */

/**
 * Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`,
 * or named colors into { r, g, b, a } with channels in 0..255 and alpha in 0..1.
 *
 * Returns null on parse failure (e.g. gradient strings, currentColor, etc.).
 */
export function parseColor(input) {
	if (!input || typeof input !== 'string') return null;
	const v = input.trim().toLowerCase();

	// #rgb / #rgba / #rrggbb / #rrggbbaa
	if (v.startsWith('#')) {
		const hex = v.slice(1);
		if (hex.length === 3 || hex.length === 4) {
			const r = parseInt(hex[0] + hex[0], 16);
			const g = parseInt(hex[1] + hex[1], 16);
			const b = parseInt(hex[2] + hex[2], 16);
			const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
			return { r, g, b, a };
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
			return { r, g, b, a };
		}
		return null;
	}

	// rgb(r, g, b) or rgba(r, g, b, a) — accept commas or spaces
	const rgbMatch = v.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
	if (rgbMatch) {
		const r = clamp255(parseFloat(rgbMatch[1]));
		const g = clamp255(parseFloat(rgbMatch[2]));
		const b = clamp255(parseFloat(rgbMatch[3]));
		let a = 1;
		if (rgbMatch[4]) {
			a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
		}
		return { r, g, b, a };
	}

	// hsl(...) and hsla(...) — convert via standard formula
	const hslMatch = v.match(/^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
	if (hslMatch) {
		const h = parseFloat(hslMatch[1]);
		const s = parseFloat(hslMatch[2]) / 100;
		const l = parseFloat(hslMatch[3]) / 100;
		let a = 1;
		if (hslMatch[4]) {
			a = hslMatch[4].endsWith('%') ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]);
		}
		const { r, g, b } = hslToRgb(h, s, l);
		return { r, g, b, a };
	}

	// We don't handle named colors (e.g. "red", "white") — out of scope for this audit.
	// Tokens in app.css use hex/rgb/hsl exclusively.
	return null;
}

function clamp255(n) {
	if (Number.isNaN(n)) return 0;
	return Math.max(0, Math.min(255, Math.round(n)));
}

function hslToRgb(h, s, l) {
	// Standard HSL→RGB conversion
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let rp = 0,
		gp = 0,
		bp = 0;
	if (h < 60) [rp, gp, bp] = [c, x, 0];
	else if (h < 120) [rp, gp, bp] = [x, c, 0];
	else if (h < 180) [rp, gp, bp] = [0, c, x];
	else if (h < 240) [rp, gp, bp] = [0, x, c];
	else if (h < 300) [rp, gp, bp] = [x, 0, c];
	else [rp, gp, bp] = [c, 0, x];
	return {
		r: Math.round((rp + m) * 255),
		g: Math.round((gp + m) * 255),
		b: Math.round((bp + m) * 255)
	};
}

/**
 * If the foreground has alpha < 1, composite it onto the background using
 * standard alpha compositing. This gives the effective rendered colour the
 * user actually sees.
 */
export function composite(fg, bg) {
	if (fg.a >= 1) return fg;
	const a = fg.a;
	return {
		r: Math.round(fg.r * a + bg.r * (1 - a)),
		g: Math.round(fg.g * a + bg.g * (1 - a)),
		b: Math.round(fg.b * a + bg.b * (1 - a)),
		a: 1
	};
}

/**
 * WCAG relative luminance for a fully opaque color.
 */
export function luminance({ r, g, b }) {
	const linearize = (c) => {
		const cs = c / 255;
		return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG contrast ratio between two colors. Foreground may be translucent and
 * is composited onto the (assumed-opaque) background first.
 */
export function contrastRatio(fgColor, bgColor) {
	const compositedFg = composite(fgColor, bgColor);
	const lFg = luminance(compositedFg);
	const lBg = luminance(bgColor);
	const lighter = Math.max(lFg, lBg);
	const darker = Math.min(lFg, lBg);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Format a contrast ratio for display (e.g. 4.501 → "4.50").
 */
export function formatRatio(ratio) {
	return ratio.toFixed(2);
}
