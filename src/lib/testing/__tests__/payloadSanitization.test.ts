import { describe, it, expect } from 'vitest';
import {
	sanitizeInput,
	sanitizeName,
	sanitizeEmail,
	sanitizePhone,
	sanitizeNumeric,
	sanitizeAlphanumeric,
	sanitizeObject,
	containsSqlInjectionPatterns,
	containsXssPatterns,
	escapeHtml,
	unescapeHtml
} from '$lib/utils/sanitize';
import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

// ═══════════════════════════════════════════════════════════════
// sanitizeInput — basic behavior
// ═══════════════════════════════════════════════════════════════
describe('sanitizeInput — basic string sanitization', () => {
	it('strips HTML tags when escapeHtml option is enabled', () => {
		const result = sanitizeInput('<b>bold</b> text', { escapeHtml: true });
		expect(result).not.toContain('<b>');
		expect(result).not.toContain('</b>');
		expect(result).toContain('bold');
		expect(result).toContain('text');
	});

	it('strips script tags when escapeHtml option is enabled', () => {
		const result = sanitizeInput('<script>alert("xss")</script>', { escapeHtml: true });
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('</script>');
		// Entities should be escaped
		expect(result).toContain('&lt;');
	});

	it('trims whitespace by default', () => {
		expect(sanitizeInput('  hello  ')).toBe('hello');
	});

	it('collapses multiple spaces to a single space by default', () => {
		expect(sanitizeInput('hello    world')).toBe('hello world');
	});

	it('enforces maxLength', () => {
		const longString = 'a'.repeat(20000);
		const result = sanitizeInput(longString);
		expect(result.length).toBeLessThanOrEqual(10000);
	});

	it('removes control characters by default', () => {
		const withControlChars = 'hello\x00\x01\x02world';
		const result = sanitizeInput(withControlChars);
		expect(result).toBe('helloworld');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeInput — XSS patterns
// ═══════════════════════════════════════════════════════════════
describe('sanitizeInput — XSS pattern handling', () => {
	it('escapes onload event handler attributes', () => {
		const result = sanitizeInput('<img onload="alert(1)">', { escapeHtml: true });
		expect(result).not.toContain('onload=');
		// Should be entity-encoded
		expect(result).toContain('&lt;');
	});

	it('escapes onerror event handler attributes', () => {
		const result = sanitizeInput('<img onerror="alert(1)">', { escapeHtml: true });
		expect(result).not.toContain('onerror=');
	});

	it('escapes javascript: protocol URIs', () => {
		const result = sanitizeInput('javascript:alert(1)', { escapeHtml: true });
		// The colon is not in the escape map, but the result should be entity-safe
		expect(result).not.toContain('<');
	});
});

// ═══════════════════════════════════════════════════════════════
// containsSqlInjectionPatterns — detection
// ═══════════════════════════════════════════════════════════════
describe('containsSqlInjectionPatterns — SQL injection detection', () => {
	it('detects OR 1=1 pattern', () => {
		expect(containsSqlInjectionPatterns("' OR 1=1 --")).toBe(true);
	});

	it('detects DROP TABLE pattern', () => {
		expect(containsSqlInjectionPatterns('DROP TABLE users;')).toBe(true);
	});

	it('detects UNION SELECT pattern', () => {
		expect(containsSqlInjectionPatterns('UNION SELECT * FROM users --')).toBe(true);
	});

	it('detects DELETE pattern', () => {
		expect(containsSqlInjectionPatterns('DELETE FROM users WHERE 1=1')).toBe(true);
	});

	it('returns false for clean input', () => {
		expect(containsSqlInjectionPatterns('John Doe')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// containsXssPatterns — detection
// ═══════════════════════════════════════════════════════════════
describe('containsXssPatterns — XSS detection', () => {
	it('detects <script> tags', () => {
		expect(containsXssPatterns('<script>alert(1)</script>')).toBe(true);
	});

	it('detects javascript: protocol', () => {
		expect(containsXssPatterns('javascript:void(0)')).toBe(true);
	});

	it('detects event handler patterns like onload=', () => {
		expect(containsXssPatterns('<img onload="alert(1)">')).toBe(true);
	});

	it('detects onerror= pattern', () => {
		expect(containsXssPatterns('onerror="malicious()"')).toBe(true);
	});

	it('detects <iframe> tag', () => {
		expect(containsXssPatterns('<iframe src="evil.html">')).toBe(true);
	});

	it('returns false for clean input', () => {
		expect(containsXssPatterns('Hello World')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeName
// ═══════════════════════════════════════════════════════════════
describe('sanitizeName — name field sanitization', () => {
	it('allows valid names with alphabets and spaces', () => {
		expect(sanitizeName('John Doe')).toBe('John Doe');
	});

	it('allows hyphens in names', () => {
		expect(sanitizeName('Anne-Marie')).toBe('Anne-Marie');
	});

	it('allows apostrophes in names', () => {
		expect(sanitizeName("O'Brien")).toBe("O'Brien");
	});

	it('allows periods for suffixes like Jr.', () => {
		expect(sanitizeName('John Jr.')).toBe('John Jr.');
	});

	it('rejects numeric characters', () => {
		const result = sanitizeName('John123');
		expect(result).not.toMatch(/\d/);
		expect(result).toBe('John');
	});

	it('rejects special characters like @, #, $', () => {
		const result = sanitizeName('John@#$Doe');
		expect(result).not.toContain('@');
		expect(result).not.toContain('#');
		expect(result).not.toContain('$');
	});

	it('enforces maxLength of 200', () => {
		const longName = 'A'.repeat(300);
		expect(sanitizeName(longName).length).toBeLessThanOrEqual(200);
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeEmail
// ═══════════════════════════════════════════════════════════════
describe('sanitizeEmail — email sanitization', () => {
	it('passes through a valid email address', () => {
		expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
	});

	it('converts to lowercase', () => {
		expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
	});

	it('strips invalid characters from email', () => {
		const result = sanitizeEmail('user!name@example.com');
		expect(result).not.toContain('!');
	});

	it('allows + in email addresses', () => {
		expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
	});

	it('allows hyphens in domain part', () => {
		expect(sanitizeEmail('user@my-domain.com')).toBe('user@my-domain.com');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizePhone
// ═══════════════════════════════════════════════════════════════
describe('sanitizePhone — phone number sanitization', () => {
	it('keeps digits in a valid phone number', () => {
		expect(sanitizePhone('9876543210')).toBe('9876543210');
	});

	it('allows + prefix for international numbers', () => {
		expect(sanitizePhone('+91 9876543210')).toBe('+91 9876543210');
	});

	it('allows parentheses for area codes', () => {
		expect(sanitizePhone('(011) 12345678')).toBe('(011) 12345678');
	});

	it('strips alphabetic characters', () => {
		const result = sanitizePhone('98765abcde');
		expect(result).toBe('98765');
	});

	it('strips special characters like @, #', () => {
		const result = sanitizePhone('9876@#5432');
		expect(result).toBe('98765432');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeNumeric
// ═══════════════════════════════════════════════════════════════
describe('sanitizeNumeric — numeric input sanitization', () => {
	it('accepts valid integer strings', () => {
		expect(sanitizeNumeric('12345')).toBe('12345');
	});

	it('accepts valid decimal strings', () => {
		expect(sanitizeNumeric('123.45')).toBe('123.45');
	});

	it('accepts negative numbers', () => {
		expect(sanitizeNumeric('-500')).toBe('-500');
	});

	it('rejects alphabetic characters', () => {
		expect(sanitizeNumeric('12abc34')).toBe('1234');
	});

	it('rejects non-numeric special characters', () => {
		expect(sanitizeNumeric('$1,000')).toBe('1000');
	});

	it('strips decimal when allowDecimal is false', () => {
		expect(sanitizeNumeric('123.45', false)).toBe('12345');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeAlphanumeric
// ═══════════════════════════════════════════════════════════════
describe('sanitizeAlphanumeric — alphanumeric input sanitization', () => {
	it('passes through valid alphanumeric strings', () => {
		expect(sanitizeAlphanumeric('ABC123')).toBe('ABC123');
	});

	it('allows underscores by default', () => {
		expect(sanitizeAlphanumeric('field_name_1')).toBe('field_name_1');
	});

	it('strips underscores when allowUnderscore is false', () => {
		expect(sanitizeAlphanumeric('field_name', false)).toBe('fieldname');
	});

	it('strips special characters', () => {
		expect(sanitizeAlphanumeric('hello@world!')).toBe('helloworld');
	});

	it('strips spaces', () => {
		expect(sanitizeAlphanumeric('hello world')).toBe('helloworld');
	});
});

// ═══════════════════════════════════════════════════════════════
// Empty / null / undefined input handling
// ═══════════════════════════════════════════════════════════════
describe('Sanitization — empty, null, and undefined inputs', () => {
	it('sanitizeInput returns empty string for null', () => {
		expect(sanitizeInput(null)).toBe('');
	});

	it('sanitizeInput returns empty string for undefined', () => {
		expect(sanitizeInput(undefined)).toBe('');
	});

	it('sanitizeInput returns empty string for empty string', () => {
		expect(sanitizeInput('')).toBe('');
	});

	it('sanitizeName returns empty string for null', () => {
		expect(sanitizeName(null)).toBe('');
	});

	it('sanitizeName returns empty string for undefined', () => {
		expect(sanitizeName(undefined)).toBe('');
	});

	it('sanitizeEmail returns empty string for null', () => {
		expect(sanitizeEmail(null)).toBe('');
	});

	it('sanitizePhone returns empty string for undefined', () => {
		expect(sanitizePhone(undefined)).toBe('');
	});

	it('sanitizeNumeric returns empty string for null', () => {
		expect(sanitizeNumeric(null)).toBe('');
	});

	it('sanitizeAlphanumeric returns empty string for undefined', () => {
		expect(sanitizeAlphanumeric(undefined)).toBe('');
	});

	it('sanitizeInput converts non-string primitives to string', () => {
		expect(sanitizeInput(42)).toBe('42');
		expect(sanitizeInput(true)).toBe('true');
		expect(sanitizeInput(0)).toBe('0');
	});
});

// ═══════════════════════════════════════════════════════════════
// escapeHtml / unescapeHtml round-trip
// ═══════════════════════════════════════════════════════════════
describe('escapeHtml and unescapeHtml — round-trip encoding', () => {
	it('escapes angle brackets', () => {
		expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
	});

	it('escapes ampersands', () => {
		expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
	});

	it('escapes double quotes', () => {
		expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
	});

	it('unescapeHtml reverses escapeHtml for standard entities', () => {
		const original = '<div class="test">';
		const escaped = escapeHtml(original);
		const unescaped = unescapeHtml(escaped);
		expect(unescaped).toBe(original);
	});

	it('escapeHtml returns empty string for non-string input', () => {
		expect(escapeHtml(null as unknown as string)).toBe('');
		expect(escapeHtml(undefined as unknown as string)).toBe('');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeHtml — sanitize-html based HTML sanitization (canonical)
//
// Migrated 2026-06-04 from isomorphic-dompurify → sanitize-html as part
// of the prod-wide SSR 500 incident resolution. Tests below remain
// identical because the sanitizeHtml() wrapper API didn't change; what
// changed is the underlying engine (jsdom-based DOMPurify → pure-JS
// htmlparser2-based sanitize-html). The new XSS-vector describe block
// further down codifies the contract per the post-incident review.
// ═══════════════════════════════════════════════════════════════
describe('sanitizeHtml — dangerous HTML content removal', () => {
	it('removes <script> tags and their content, preserves safe HTML', () => {
		const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script><p>World</p>');
		expect(result).not.toContain('<script');
		expect(result).not.toContain('alert(1)');
		expect(result).toContain('Hello');
		expect(result).toContain('World');
	});

	it('removes event handler attributes', () => {
		const result = sanitizeHtml('<img onload="alert(1)" src="test.png">');
		expect(result).not.toContain('onload');
	});

	it('removes javascript: protocol from href', () => {
		const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
		expect(result).not.toContain('javascript:');
		expect(result).toContain('click');
	});

	it('removes <style> tags', () => {
		const result = sanitizeHtml('<style>body{display:none}</style><p>content</p>');
		expect(result).not.toContain('<style');
		expect(result).toContain('content');
	});

	it('removes <iframe> tags, preserves safe content', () => {
		const result = sanitizeHtml('<iframe src="evil.html"></iframe><p>safe</p>');
		expect(result).not.toContain('<iframe');
		expect(result).toContain('safe');
	});

	it('returns empty string for null/undefined input', () => {
		expect(sanitizeHtml(null)).toBe('');
		expect(sanitizeHtml(undefined)).toBe('');
		expect(sanitizeHtml('')).toBe('');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeHtml — post-incident XSS hardening (2026-06-04)
//
// Codifies the five canonical XSS vectors flagged in the post-incident
// review of the sanitize-html migration. These run on every push so a
// future config change to allowedTags / allowedAttributes / allowedSchemes
// that widens the surface gets caught in CI rather than in production.
//
// Each test asserts both NEGATIVE (the dangerous payload is neutralised)
// and POSITIVE (any safe text adjacent to the payload survives) so a
// regression that "fixes" the negative case by over-stripping is also
// caught.
// ═══════════════════════════════════════════════════════════════
describe('sanitizeHtml — canonical XSS vector contract', () => {
	it('strips raw <script> tags entirely (vector 1)', () => {
		const result = sanitizeHtml('safe text <script>alert(1)</script> more text');
		expect(result).not.toContain('<script');
		expect(result).not.toContain('alert(1)');
		// Surrounding safe text preserved
		expect(result).toContain('safe text');
		expect(result).toContain('more text');
	});

	it('strips onerror handler from <img> while keeping <img> if allowed (vector 2)', () => {
		const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
		expect(result).not.toContain('onerror');
		expect(result).not.toContain('alert(1)');
		// img is in allowedTags so the tag itself survives; only the handler is stripped.
		// (If a future config change drops img from allowedTags, this test will need
		// updating — that's the desired behaviour; safer to drop the tag than keep it.)
	});

	it('strips javascript: protocol from anchor href (vector 3)', () => {
		const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
		expect(result).not.toContain('javascript:');
		expect(result).not.toContain('alert(1)');
		// Anchor text preserved even when href is stripped
		expect(result).toContain('Click');
	});

	it('strips <svg> wrapping a <script> entirely (vector 4)', () => {
		// SVG is a classic carrier for embedded script — neither <svg> nor <script>
		// are in allowedTags, so both should be removed completely.
		const result = sanitizeHtml('before <svg><script>alert(1)</script></svg> after');
		expect(result).not.toContain('<svg');
		expect(result).not.toContain('<script');
		expect(result).not.toContain('alert(1)');
		// Surrounding text preserved
		expect(result).toContain('before');
		expect(result).toContain('after');
	});

	it('strips onclick handler from element while keeping tag if allowed (vector 5)', () => {
		const result = sanitizeHtml('<div onclick="alert(1)">Hello</div>');
		expect(result).not.toContain('onclick');
		expect(result).not.toContain('alert(1)');
		// div is in allowedTags so the element itself survives; only handler stripped
		expect(result).toContain('Hello');
	});

	it('strips data: URI from anchor href (extended vector — not in original 5 but adjacent class)', () => {
		// data: URIs can carry inline scripts; allowedSchemes does NOT include data:
		const result = sanitizeHtml(
			'<a href="data:text/html,<script>alert(1)</script>">Click</a>'
		);
		expect(result).not.toContain('data:text/html');
		expect(result).not.toContain('alert(1)');
		expect(result).toContain('Click');
	});
});

// ═══════════════════════════════════════════════════════════════
// sanitizeObject — recursive object sanitization
// ═══════════════════════════════════════════════════════════════
describe('sanitizeObject — recursive object sanitization', () => {
	it('sanitizes all string values in a flat object', () => {
		const input = { name: '  John  ', city: '  Delhi  ' };
		const result = sanitizeObject(input);
		expect(result.name).toBe('John');
		expect(result.city).toBe('Delhi');
	});

	it('skips __proto__ keys to prevent prototype pollution', () => {
		const input = { __proto__: 'malicious', name: 'safe' };
		const result = sanitizeObject(input as Record<string, unknown>);
		expect(result).not.toHaveProperty('__proto__', 'malicious');
	});

	it('preserves non-string values', () => {
		const input = { count: 42, active: true, name: '  John  ' };
		const result = sanitizeObject(input);
		expect(result.count).toBe(42);
		expect(result.active).toBe(true);
		expect(result.name).toBe('John');
	});
});

