/**
 * Platform Detection — Capacitor Native App Detection
 * ═══════════════════════════════════════════════════════════════════
 * Detects if the request comes from a Capacitor native app.
 * Native apps need tokens in the response body because they
 * can't reliably auto-send httpOnly cookies across fetch boundaries.
 * ═══════════════════════════════════════════════════════════════════
 */

export function isNativePlatform(request: Request): boolean {
	const capacitorHeader = request.headers.get('x-capacitor-platform');
	if (capacitorHeader) return true;

	const ua = request.headers.get('user-agent') || '';
	return /DigitalDSA\/(ios|android)/i.test(ua);
}
