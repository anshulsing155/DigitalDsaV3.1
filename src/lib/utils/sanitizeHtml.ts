/**
 * HTML sanitizer for {@html} bindings.
 *
 * Uses `sanitize-html` (pure-JS, htmlparser2-based) for robust XSS prevention.
 * Used ONLY for content rendered via Svelte's {@html} directive.
 *
 * ──────────────────────────────────────────────────────────────────
 * MIGRATED 2026-06-04 from `isomorphic-dompurify` → `sanitize-html`.
 *
 * Reason: isomorphic-dompurify uses DOMPurify backed by `jsdom` on the
 * server, which dragged jsdom + its native-dep tree (canvas, html-encoding-
 * sniffer → @exodus/bytes, etc.) into the SSR bundle. That tree caused
 * THREE production incidents needing one-off vite.config patches:
 *
 *   1. b171d318 — add isomorphic-dompurify chain to ssr.noExternal
 *   2. 8bb1b289 — gate jsdom noExternal to build-only
 *   3. 85e35695 / 5261393b (2026-06-04 prod-wide outage) — canvas-resolve
 *      failure on first cold-start of /form/* routes
 *
 * sanitize-html is pure JS, ~50KB bundled, no native deps, no jsdom.
 * After this lands, the corresponding noExternal entries (isomorphic-
 * dompurify, jsdom, html-encoding-sniffer, @exodus/bytes) and the
 * canvas resolve.alias + canvas-stub in vite.config.ts can be removed
 * — kept for one cycle as documentation, scheduled for cleanup in a
 * follow-up commit once production is verified stable on sanitize-html.
 *
 * API differences from DOMPurify (caller-visible):
 *   - Function signature is identical (string | null | undefined → string).
 *   - sanitize-html strips disallowed tags by removing them entirely
 *     (with their textContent preserved by default); DOMPurify did the
 *     same for our config. No caller-visible behaviour change for the
 *     ALLOWED_TAGS / ALLOWED_ATTR set we use.
 *   - sanitize-html's `allowedAttributes` is keyed per-tag with `'*'`
 *     as wildcard; DOMPurify's `ALLOWED_ATTR` was a flat list. Mapping
 *     below preserves attribute semantics (e.g. `href` only on `a`).
 * ──────────────────────────────────────────────────────────────────
 */

import sanitize from 'sanitize-html';

/**
 * Allowed tags — formatting only, no scripts/frames/forms/canvas.
 * Same set as the previous DOMPurify config (`ALLOWED_TAGS`).
 */
const allowedTags = [
	'div',
	'span',
	'p',
	'br',
	'hr',
	'strong',
	'b',
	'em',
	'i',
	'u',
	'small',
	'sub',
	'sup',
	'ul',
	'ol',
	'li',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'a',
	'img',
	'table',
	'thead',
	'tbody',
	'tr',
	'td',
	'th',
	'pre',
	'code',
	'blockquote'
];

/**
 * Allowed attributes — keyed per-tag, with `'*'` matching every allowed
 * tag. Pattern intentionally restrictive: no event handlers, no
 * javascript:/data: URLs (sanitize-html defaults), no inline forms.
 *
 * Mapping note: the previous DOMPurify `ALLOWED_ATTR` was a flat list of
 * 14 attrs that applied to any tag. sanitize-html requires per-tag keys.
 * We split into a wildcard set (truly universal — `class`, `style`,
 * `id`, `title`, plus `data-lucide` for icon rendering) and tag-specific
 * sets where the attribute only makes sense on certain elements (`href`
 * on `a`, `src` on `img`, `colspan`/`rowspan` on table cells, etc.).
 */
const allowedAttributes: sanitize.IOptions['allowedAttributes'] = {
	'*': ['class', 'style', 'id', 'title', 'data-lucide'],
	a: ['href', 'target', 'rel'],
	img: ['src', 'alt', 'width', 'height'],
	td: ['colspan', 'rowspan'],
	th: ['colspan', 'rowspan']
};

/**
 * sanitize-html options. Keep this object constant — re-parsing options
 * per call has measurable cost on the form pages that sanitize many
 * dynamic guidance strings.
 */
const options: sanitize.IOptions = {
	allowedTags,
	allowedAttributes,
	// Same scheme allowlist DOMPurify defaults to. Explicit so a future
	// sanitize-html version change doesn't silently widen the surface.
	allowedSchemes: ['http', 'https', 'mailto', 'tel'],
	allowedSchemesByTag: {},
	allowedSchemesAppliedToAttributes: ['href', 'src'],
	// `style` attribute is allowed by tag list above; without an
	// allowedStyles map sanitize-html would still permit any CSS prop
	// value. Tighten to a conservative set — matches what DSA guidance
	// HTML actually uses (color hints + spacing). Extend if a real
	// content need surfaces.
	allowedStyles: {
		'*': {
			color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
			'background-color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
			'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
			'font-weight': [/^bold$/, /^normal$/, /^\d{3}$/],
			'font-style': [/^italic$/, /^normal$/],
			'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
			'margin-left': [/^\d+(?:px|em|rem|%)$/],
			'margin-right': [/^\d+(?:px|em|rem|%)$/],
			'padding-left': [/^\d+(?:px|em|rem|%)$/],
			'padding-right': [/^\d+(?:px|em|rem|%)$/]
		}
	}
};

/**
 * Sanitize an HTML string — remove dangerous tags + attributes, return
 * a string safe for `{@html ...}` rendering.
 *
 * Null/undefined/empty input returns the empty string (preserves the
 * previous DOMPurify behaviour so callers don't need to add their own
 * guards).
 */
export function sanitizeHtml(html: string | undefined | null): string {
	if (!html) return '';
	return sanitize(html, options);
}
