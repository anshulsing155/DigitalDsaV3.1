/**
 * Explicit foreground/background pairs to audit.
 *
 * Each entry declares a design-intent pair: "this text token is meant to be
 * readable on this background token." The audit computes the WCAG contrast
 * ratio for each pair across every theme variant and flags any combo below
 * the declared minRatio.
 *
 * Why an explicit list (and not auto-pair every text/bg combo)?
 *   - Most token combinations are NOT intentional pairings. `--form-bg-disabled`
 *     was never meant to host `--form-text-secondary`. Auto-pairing produces
 *     thousands of false positives.
 *   - This list is the "design contract": these are the combinations the UI
 *     actually puts on screen, and they MUST stay readable.
 *   - When a new token is added, declaring its intended pair forces the
 *     designer to think about contrast at definition time.
 *
 * minRatio guidelines (WCAG 2.1 AA):
 *   - 4.5  → body text (<18pt or <14pt bold)        DEFAULT
 *   - 3.0  → large text (>=18pt or >=14pt bold) AND non-text UI (icons, borders)
 *
 * Adding a new pair: figure out whether the rendered text is body-sized
 * (4.5) or display-sized (3.0). When in doubt, use 4.5 — it's the safer
 * default and most copy in this app is body-sized.
 *
 * Translucent backgrounds: if `bg` resolves to an rgba()/hsla() with alpha < 1,
 * declare a `behindBg` token naming the opaque surface the translucent layer
 * sits on top of. The audit composites bg-on-behindBg before computing
 * contrast — this matches what the user actually sees. Without `behindBg`,
 * the audit can't compute a meaningful ratio and reports a resolution error.
 */

const BODY = 4.5;
const LARGE = 3.0;

export const PAIRS = [
	// ─── Form (wizard pages, all 6 loan types) ───────────────────────────
	{ name: 'Form body text on form bg', fg: '--form-text', bg: '--form-bg', minRatio: BODY, namespace: 'form' },
	{ name: 'Form body text on form card', fg: '--form-text', bg: '--form-bg-card', minRatio: BODY, namespace: 'form' },
	{ name: 'Form secondary text on form card', fg: '--form-text-secondary', bg: '--form-bg-card', minRatio: BODY, namespace: 'form' },
	{ name: 'Form muted text on form card', fg: '--form-text-muted', bg: '--form-bg-card', minRatio: BODY, namespace: 'form' },
	{ name: 'Form label text on form card', fg: '--form-text-label', bg: '--form-bg-card', minRatio: BODY, namespace: 'form' },
	{ name: 'Form input text on input bg', fg: '--form-text', bg: '--form-bg-input', behindBg: '--form-bg-card', minRatio: BODY, namespace: 'form' },
	{ name: 'Form muted text on alt bg', fg: '--form-text-muted', bg: '--form-bg-alt', minRatio: BODY, namespace: 'form' },
	{ name: 'Form label on disabled bg', fg: '--form-text-muted', bg: '--form-bg-disabled', minRatio: LARGE, namespace: 'form' },

	// ─── Dashboard (DSA + RM portals) ────────────────────────────────────
	{ name: 'Dash body text on dash bg', fg: '--dash-text', bg: '--dash-bg', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash body text on dash card', fg: '--dash-text', bg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash secondary on dash card', fg: '--dash-text-secondary', bg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash muted on dash card', fg: '--dash-text-muted', bg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash muted on dash bg', fg: '--dash-text-muted', bg: '--dash-bg', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash accent text on card', fg: '--dash-accent-text', bg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash accent link on card', fg: '--dash-accent-link', bg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash CTA button text on bg', fg: '--dash-btn-text', bg: '--dash-btn-bg', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash ghost button text on bg', fg: '--dash-btn-ghost-text', bg: '--dash-btn-ghost-bg', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash contrast text on contrast-light', fg: '--dash-contrast-text', bg: '--dash-contrast-light', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash text on elevated card', fg: '--dash-text', bg: '--dash-bg-elevated', minRatio: BODY, namespace: 'dash' },
	{ name: 'Dash secondary on elevated', fg: '--dash-text-secondary', bg: '--dash-bg-elevated', minRatio: BODY, namespace: 'dash' },

	// ─── Landing (marketing site) ────────────────────────────────────────
	{ name: 'Landing body text on landing bg', fg: '--landing-text', bg: '--landing-bg', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing body text on landing card', fg: '--landing-text', bg: '--landing-bg-card', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing body text on alt bg', fg: '--landing-text', bg: '--landing-bg-alt', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing secondary on landing bg', fg: '--landing-text-secondary', bg: '--landing-bg', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing muted on landing bg', fg: '--landing-text-muted', bg: '--landing-bg', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing accent text on yellow CTA', fg: '--landing-accent-text', bg: '--landing-bg-yellow', minRatio: BODY, namespace: 'landing' },
	{ name: 'Landing accessible accent on bg', fg: '--landing-accent-accessible', bg: '--landing-bg', minRatio: LARGE, namespace: 'landing' },

	// ─── Color (legacy / Tailwind @theme classes — bg-main, text-main, etc.) ─
	{ name: 'Color text-main on bg-main', fg: '--color-text-main', bg: '--color-bg-main', minRatio: BODY, namespace: 'color' },
	{ name: 'Color text-main on bg-alt', fg: '--color-text-main', bg: '--color-bg-alt', minRatio: BODY, namespace: 'color' },
	{ name: 'Color text-light on bg-main', fg: '--color-text-light', bg: '--color-bg-main', minRatio: BODY, namespace: 'color' },
	{ name: 'Button text on primary', fg: '--button-text', bg: '--color-primary', minRatio: BODY, namespace: 'color' },
	{ name: 'Button secondary text on bg-main', fg: '--button-secondary-text', bg: '--color-bg-main', minRatio: BODY, namespace: 'color' },
	{ name: 'Disabled button text on disabled bg', fg: '--button-disabled-text', bg: '--button-disabled-bg', minRatio: LARGE, namespace: 'color' },
	{ name: 'Color border on bg-main (non-text)', fg: '--color-border', bg: '--color-bg-main', minRatio: LARGE, namespace: 'color' },

	// ─── System status pills (success/warning/error/info) ────────────────
	// In dark mode the *-light tokens become translucent (rgba), sitting on dash-bg-card.
	// In light mode they're opaque hexes, so behindBg is unused (composite is a no-op).
	{ name: 'Success dark on success light', fg: '--ddsa-success-dark', bg: '--ddsa-success-light', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'status' },
	{ name: 'Warning dark on warning light', fg: '--ddsa-warning-dark', bg: '--ddsa-warning-light', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'status' },
	{ name: 'Error dark on error light', fg: '--ddsa-error-dark', bg: '--ddsa-error-light', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'status' },
	{ name: 'Info dark on info light', fg: '--ddsa-info-dark', bg: '--ddsa-info-light', behindBg: '--dash-bg-card', minRatio: BODY, namespace: 'status' }
];

/**
 * The theme contexts to evaluate every pair against. 12 in total — default
 * light + dark, plus 5 named schemes × 2 modes.
 */
export const THEMES = [
	{ id: 'light',          label: 'Light (default)',         scheme: null,     dark: false },
	{ id: 'dark',           label: 'Dark (default)',          scheme: null,     dark: true },
	{ id: 'ocean-light',    label: 'Light (ocean scheme)',    scheme: 'ocean',  dark: false },
	{ id: 'ocean-dark',     label: 'Dark (ocean scheme)',     scheme: 'ocean',  dark: true },
	{ id: 'forest-light',   label: 'Light (forest scheme)',   scheme: 'forest', dark: false },
	{ id: 'forest-dark',    label: 'Dark (forest scheme)',    scheme: 'forest', dark: true },
	{ id: 'slate-light',    label: 'Light (slate scheme)',    scheme: 'slate',  dark: false },
	{ id: 'slate-dark',     label: 'Dark (slate scheme)',     scheme: 'slate',  dark: true },
	{ id: 'rose-light',     label: 'Light (rose scheme)',     scheme: 'rose',   dark: false },
	{ id: 'rose-dark',      label: 'Dark (rose scheme)',      scheme: 'rose',   dark: true },
	{ id: 'amber-light',    label: 'Light (amber scheme)',    scheme: 'amber',  dark: false },
	{ id: 'amber-dark',     label: 'Dark (amber scheme)',     scheme: 'amber',  dark: true }
];

/**
 * Known baseline failures to suppress (carry-forward list). Each entry must
 * have a remediation owner + due date in the comment. If a pair is on this
 * list, it will appear in the report under "Known/accepted failures" rather
 * than as a new finding. Empty by default — populate after the first audit
 * run if you decide some pairs need to be deferred.
 */
export const KNOWN_FAILURES = [
	// Decorative card outlines. WCAG 1.4.11 requires 3:1 only for borders that
	// are *essential* to identifying a UI element. Cards have other affordances
	// (background fill, content, shadow), so the gray-200/white border at 1.5:1
	// is exempt. If we ever build a button-only border or an unlabeled icon-only
	// affordance, that would need its own pair at 3:1.
	...['light', 'dark', 'ocean-light', 'ocean-dark', 'forest-light', 'forest-dark',
	    'slate-light', 'slate-dark', 'rose-light', 'rose-dark', 'amber-light', 'amber-dark'
	].map((themeId) => ({
		pairName: 'Color border on bg-main (non-text)',
		themeId,
		reason: 'Decorative card outline — WCAG 1.4.11 exempt (card has other affordances)',
		owner: 'design',
		dueBy: null
	}))
];
