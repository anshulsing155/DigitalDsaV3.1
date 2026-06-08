/**
 * ═══════════════════════════════════════════════════════════════════════════
 * safeRedirectPath — strict same-origin path validation for post-auth nav
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Covers the open-redirect class of attack on the login flow. Every entry
 * in the "should REJECT" table below corresponds to a real attack vector
 * documented in OWASP's "Unvalidated Redirects and Forwards" cheatsheet
 * (CWE-601). The "should ACCEPT" table covers legitimate deep-link paths
 * the platform actually uses.
 *
 * Companion: src/lib/utils/safeRedirectPath.ts header.
 */

import { describe, it, expect } from 'vitest';
import { isSafeRedirectPath, safeRedirectPath } from '$lib/utils/safeRedirectPath';

describe('safeRedirectPath — same-origin path validation', () => {
	describe('REJECTS attacker-controlled inputs', () => {
		const reject = [
			['empty string', ''],
			['null', null],
			['undefined', undefined],
			['number', 42],
			['object', { url: '/safe' }],
			['absolute URL — https', 'https://evil.com/'],
			['absolute URL — http', 'http://evil.com/'],
			['absolute URL — javascript:', 'javascript:alert(1)'],
			['absolute URL — data:', 'data:text/html,<script>alert(1)</script>'],
			['protocol-relative — //evil.com', '//evil.com/dashboard'],
			['protocol-relative — //evil.com/dashboard?foo=bar', '//evil.com/dashboard?foo=bar'],
			['Windows-style — /\\evil.com', '/\\evil.com'],
			['embedded backslash — /foo\\evil.com', '/foo\\evil.com'],
			['no leading slash — relative path', 'dashboard/dsa'],
			['no leading slash — domain-like', 'evil.com/foo'],
			['/api/ prefix — JSON dump', '/api/auth/login'],
			['/api/ prefix nested', '/api/cases/123'],
			// Long string that looks like a path but has a backslash mid-way —
			// some parsers treat the backslash as a path separator and the
			// rest as a host. The path-only `/` rule does not catch this
			// without the includes('\\') guard.
			['long path with backslash mid-way', '/dashboard/dsa\\evil.com/case/123']
		] as const;

		for (const [label, input] of reject) {
			it(`rejects: ${label}`, () => {
				expect(isSafeRedirectPath(input)).toBe(false);
			});
		}
	});

	describe('ACCEPTS legitimate same-origin paths', () => {
		const accept = [
			['dashboard root', '/dashboard'],
			['DSA dashboard', '/dashboard/dsa'],
			['nested case', '/dashboard/dsa/cases/68311abc123'],
			['form deep-link', '/form/home-loan'],
			['form with query string', '/form/home-loan?step=4'],
			['form with hash', '/dashboard/dsa#cases'],
			['form with both', '/form/home-loan?step=4#applicant-2'],
			['billing page', '/dashboard/dsa/billing'],
			['billing with ?recommend=', '/dashboard/dsa/billing?recommend=pro'],
			['legal page', '/terms']
		] as const;

		for (const [label, input] of accept) {
			it(`accepts: ${label}`, () => {
				expect(isSafeRedirectPath(input)).toBe(true);
			});
		}
	});

	describe('safeRedirectPath — falls back when input is unsafe', () => {
		it('returns input when safe', () => {
			expect(safeRedirectPath('/dashboard/dsa/cases/123', '/dashboard/dsa')).toBe(
				'/dashboard/dsa/cases/123'
			);
		});

		it('returns fallback when input is undefined', () => {
			expect(safeRedirectPath(undefined, '/dashboard/dsa')).toBe('/dashboard/dsa');
		});

		it('returns fallback when input is an absolute URL', () => {
			expect(safeRedirectPath('https://evil.com/', '/dashboard/dsa')).toBe('/dashboard/dsa');
		});

		it('returns fallback when input is protocol-relative', () => {
			expect(safeRedirectPath('//evil.com/', '/dashboard/dsa')).toBe('/dashboard/dsa');
		});

		it('returns fallback when input is an /api/ path', () => {
			expect(safeRedirectPath('/api/auth/login', '/dashboard/dsa')).toBe('/dashboard/dsa');
		});

		it('returns fallback when input contains a backslash', () => {
			expect(safeRedirectPath('/dashboard\\evil.com', '/dashboard/dsa')).toBe('/dashboard/dsa');
		});
	});
});
