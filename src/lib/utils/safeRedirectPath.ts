/**
 * safeRedirectPath — strict same-origin path validation for post-auth navigation.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The login flow accepts `?redirect=<path>` so a DSA who pastes a deep-link
 * URL (or clicks one from email / chat) lands back at that page after OTP
 * verification. The naive implementation —
 *
 *   window.location.href = redirectUrl;
 *
 * — is an OPEN REDIRECT: an attacker who can craft a link
 *   https://digitaldsa.com/login?redirect=https://evil.com
 * harvests the user's trust in the digitaldsa.com domain to send them to
 * the attacker's page after a successful login. Even worse if the attacker
 * sets up a clone of the digitaldsa dashboard at evil.com — the user
 * thinks they're logged in to digitaldsa, but every keystroke goes to evil.
 *
 * This helper enforces the rule "post-auth redirects only land on
 * same-origin PATHS, never URLs". A path is accepted iff:
 *
 *   1. It is a non-empty string
 *   2. It starts with a single `/` (relative same-origin path)
 *   3. It does NOT start with `//` (protocol-relative — could be cross-origin)
 *   4. It does NOT start with `/\\` (Windows-style — some browsers parse as
 *      protocol-relative too)
 *   5. It does NOT contain a backslash anywhere (defence-in-depth — some
 *      URL parsers treat `\` like `/` and could be tricked by `/foo\\evil.com`)
 *   6. It does NOT start with `/api/` (API routes — landing the user there
 *      after login dumps raw JSON in the browser and breaks UX)
 *   7. It can be parsed by `new URL(path, 'http://placeholder')` without
 *      escaping the placeholder origin (final belt + braces)
 *
 * Returns true ONLY when every check passes.
 *
 * THIS IS THE ONLY ALLOWED SOURCE OF REDIRECT VALIDATION ON THE LOGIN FLOW.
 * Any other helper (in particular the legacy `isSafeRedirect` that used a
 * domain allowlist) is now considered unsafe and removed; consumers MUST
 * use `safeRedirectPath(input, fallback)` or `isSafeRedirectPath(input)`.
 */

/**
 * Returns true if `input` is a safe same-origin path suitable for a
 * post-auth redirect. See the file header for the full rule list.
 */
export function isSafeRedirectPath(input: unknown): boolean {
	if (typeof input !== 'string') return false;
	if (input.length === 0) return false;

	// Must start with a single slash (relative same-origin path).
	if (input[0] !== '/') return false;

	// Reject protocol-relative `//evil.com/foo` — some parsers treat as URL.
	if (input.startsWith('//')) return false;

	// Reject Windows-style `/\evil.com` — some browsers parse as protocol-
	// relative too. Also rejects any backslash anywhere in the path for
	// defence-in-depth (a normal SPA route never contains backslashes).
	if (input.includes('\\')) return false;

	// Reject API routes — landing the user on a JSON endpoint is broken UX.
	if (input.startsWith('/api/')) return false;

	// Final belt-and-braces: ask the URL parser. If the parsed origin is NOT
	// the placeholder we passed in, the input snuck a different origin past
	// the prefix checks (extremely unlikely given the rules above, but cheap).
	try {
		const placeholder = 'http://safe-redirect-placeholder.invalid';
		const parsed = new URL(input, placeholder);
		if (parsed.origin !== placeholder) return false;
	} catch {
		return false;
	}

	return true;
}

/**
 * Returns `input` if it passes `isSafeRedirectPath`, otherwise `fallback`.
 * Callers use this as a one-liner at navigation sites:
 *
 *   window.location.href = safeRedirectPath(redirectUrl, dashboardPath);
 *
 * Centralizes the "validate or default" pattern so every login-flow
 * navigation site is impossible to get wrong by accident.
 */
export function safeRedirectPath(input: unknown, fallback: string): string {
	return isSafeRedirectPath(input) ? (input as string) : fallback;
}
