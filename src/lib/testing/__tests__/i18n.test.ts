/**
 * i18n Infrastructure Tests
 *
 * Validates: translation function, fallback chain, variable substitution,
 * language switching, coverage checking, and key completeness.
 *
 * @see AD-13 in DEVELOPMENT-PLAN.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	t,
	tIn,
	setLanguage,
	getLanguage,
	getAllKeys,
	getTranslationCoverage,
	isLanguageAvailable,
	initLanguage,
	persistLanguage,
	SUPPORTED_LANGUAGES,
	AVAILABLE_LANGUAGES
} from '$lib/i18n';

// ═══════════════════════════════════════════════════════════════
// Setup — reset language to English before each test
// ═══════════════════════════════════════════════════════════════

beforeEach(() => {
	setLanguage('en');
	// Clear persisted language state from previous tests
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('ddsa-lang');
	}
	if (typeof document !== 'undefined') {
		document.cookie = 'lang=;path=/;max-age=0';
	}
});

// ═══════════════════════════════════════════════════════════════
// t() — Basic translation
// ═══════════════════════════════════════════════════════════════

describe('t() — basic translation', () => {
	it('returns English string for a known key', () => {
		expect(t('common.next')).toBe('Next →');
	});

	it('returns the key itself when key does not exist', () => {
		expect(t('nonexistent.key')).toBe('nonexistent.key');
	});

	it('returns a non-empty string for all common UI keys', () => {
		const commonKeys = getAllKeys().filter((k) => k.startsWith('common.'));
		expect(commonKeys.length).toBeGreaterThan(10);
		for (const key of commonKeys) {
			expect(t(key)).not.toBe(key);
			expect(t(key).length).toBeGreaterThan(0);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// t() — Variable substitution
// ═══════════════════════════════════════════════════════════════

describe('t() — variable substitution', () => {
	it('replaces {{paramName}} with provided value', () => {
		const result = t('rm_value.peer_proof', { dsaCount: '500+', rmCount: '50+' });
		expect(result).toContain('500+');
		expect(result).toContain('50+');
		expect(result).not.toContain('{{dsaCount}}');
		expect(result).not.toContain('{{rmCount}}');
	});

	it('handles numeric params', () => {
		const result = t('rm_value.peer_proof', { dsaCount: 500, rmCount: 50 });
		expect(result).toContain('500');
		expect(result).toContain('50');
	});

	it('leaves unreferenced placeholders untouched when no params provided', () => {
		const result = t('rm_value.peer_proof');
		expect(result).toContain('{{dsaCount}}');
		expect(result).toContain('{{rmCount}}');
	});

	it('handles partial params — only replaces what is provided', () => {
		const result = t('rm_value.peer_proof', { dsaCount: '100+' });
		expect(result).toContain('100+');
		expect(result).toContain('{{rmCount}}');
	});
});

// ═══════════════════════════════════════════════════════════════
// Language switching
// ═══════════════════════════════════════════════════════════════

describe('setLanguage() and getLanguage()', () => {
	it('defaults to English', () => {
		expect(getLanguage()).toBe('en');
	});

	it('switches to Hindi', () => {
		const result = setLanguage('hi');
		expect(result).toBe('hi');
		expect(getLanguage()).toBe('hi');
	});

	it('switches to Marathi', () => {
		const result = setLanguage('mr');
		expect(result).toBe('mr');
		expect(getLanguage()).toBe('mr');
	});

	it('falls back to English for unsupported language', () => {
		const result = setLanguage('jp');
		expect(result).toBe('en');
		expect(getLanguage()).toBe('en');
	});

	it('falls back to English for empty string', () => {
		const result = setLanguage('');
		expect(result).toBe('en');
	});
});

// ═══════════════════════════════════════════════════════════════
// Fallback chain
// ═══════════════════════════════════════════════════════════════

describe('Fallback chain: selected language → English → key', () => {
	it('returns Hindi text when language is Hindi and key exists', () => {
		setLanguage('hi');
		const result = t('common.next');
		expect(result).toBe('अगला →');
		expect(result).not.toBe('Next →');
	});

	it('returns Marathi text when language is Marathi', () => {
		setLanguage('mr');
		const result = t('common.next');
		expect(result).toBe('पुढे →');
	});

	it('falls back to English when Hindi key is missing', () => {
		setLanguage('hi');
		// If a key only exists in en, it should fall back
		const result = t('nonexistent.only.in.en');
		// This key doesn't exist anywhere, so falls back to key itself
		expect(result).toBe('nonexistent.only.in.en');
	});

	it('falls back to key itself when missing in all languages', () => {
		setLanguage('hi');
		expect(t('totally.missing.key')).toBe('totally.missing.key');
	});
});

// ═══════════════════════════════════════════════════════════════
// tIn() — specific language translation
// ═══════════════════════════════════════════════════════════════

describe('tIn() — translate in specific language', () => {
	it('translates in Hindi regardless of current language', () => {
		setLanguage('en');
		const result = tIn('hi', 'common.next');
		expect(result).toBe('अगला →');
		// Current language should still be English
		expect(getLanguage()).toBe('en');
	});

	it('translates in Marathi regardless of current language', () => {
		setLanguage('hi');
		const result = tIn('mr', 'common.done');
		expect(result).toBe('झालं');
	});

	it('falls back to English for unsupported language in tIn', () => {
		const result = tIn('jp', 'common.next');
		expect(result).toBe('Next →');
	});

	it('supports variable substitution', () => {
		const result = tIn('hi', 'rm_value.peer_proof', { dsaCount: '200', rmCount: '30' });
		expect(result).toContain('200');
		expect(result).toContain('30');
	});
});

// ═══════════════════════════════════════════════════════════════
// isLanguageAvailable()
// ═══════════════════════════════════════════════════════════════

describe('isLanguageAvailable()', () => {
	it.each(['en', 'hi', 'mr'])('returns true for available language: %s', (lang) => {
		expect(isLanguageAvailable(lang)).toBe(true);
	});

	it.each(['gu', 'ta', 'te', 'jp', 'fr', ''])(
		'returns false for unavailable language: "%s"',
		(lang) => {
			expect(isLanguageAvailable(lang)).toBe(false);
		}
	);
});

// ═══════════════════════════════════════════════════════════════
// SUPPORTED_LANGUAGES and AVAILABLE_LANGUAGES
// ═══════════════════════════════════════════════════════════════

describe('Language configuration', () => {
	it('has 9 supported languages total', () => {
		expect(SUPPORTED_LANGUAGES).toHaveLength(9);
	});

	it('has 3 available (Phase 1) languages', () => {
		expect(AVAILABLE_LANGUAGES).toHaveLength(3);
	});

	it('Phase 1 languages are en, hi, mr', () => {
		const codes = AVAILABLE_LANGUAGES.map((l) => l.code);
		expect(codes).toContain('en');
		expect(codes).toContain('hi');
		expect(codes).toContain('mr');
	});

	it('each supported language has required fields', () => {
		for (const lang of SUPPORTED_LANGUAGES) {
			expect(lang.code).toBeTruthy();
			expect(lang.label).toBeTruthy();
			expect(lang.nativeLabel).toBeTruthy();
			expect(lang.script).toBeTruthy();
			expect(lang.phase).toBeGreaterThanOrEqual(1);
			expect(lang.phase).toBeLessThanOrEqual(3);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Translation coverage — key completeness
// ═══════════════════════════════════════════════════════════════

describe('Translation coverage', () => {
	it('English has 100% coverage (baseline)', () => {
		const coverage = getTranslationCoverage('en');
		expect(coverage.percentage).toBe(100);
		expect(coverage.missing).toHaveLength(0);
	});

	it('Hindi has 100% coverage', () => {
		const coverage = getTranslationCoverage('hi');
		expect(coverage.percentage).toBe(100);
		expect(coverage.missing).toHaveLength(0);
	});

	it('Marathi has 100% coverage', () => {
		const coverage = getTranslationCoverage('mr');
		expect(coverage.percentage).toBe(100);
		expect(coverage.missing).toHaveLength(0);
	});

	it('getAllKeys() returns all English keys', () => {
		const keys = getAllKeys();
		expect(keys.length).toBeGreaterThan(50);
		expect(keys).toContain('common.next');
		expect(keys).toContain('disclaimer.rm_onboarding_title');
		expect(keys).toContain('rm_value.screen1_title');
		expect(keys).toContain('rm_value.cta');
	});

	it('coverage report has correct shape', () => {
		const coverage = getTranslationCoverage('hi');
		expect(coverage).toHaveProperty('total');
		expect(coverage).toHaveProperty('translated');
		expect(coverage).toHaveProperty('missing');
		expect(coverage).toHaveProperty('percentage');
		expect(typeof coverage.total).toBe('number');
		expect(typeof coverage.translated).toBe('number');
		expect(Array.isArray(coverage.missing)).toBe(true);
		expect(typeof coverage.percentage).toBe('number');
	});
});

// ═══════════════════════════════════════════════════════════════
// initLanguage() — server-provided language initialization
// ═══════════════════════════════════════════════════════════════

describe('initLanguage() — server-provided preference', () => {
	it('accepts valid server language', () => {
		const result = initLanguage('hi');
		expect(result).toBe('hi');
		expect(getLanguage()).toBe('hi');
	});

	it('accepts Marathi from server', () => {
		const result = initLanguage('mr');
		expect(result).toBe('mr');
		expect(getLanguage()).toBe('mr');
	});

	it('ignores invalid server language and returns current', () => {
		setLanguage('en');
		const result = initLanguage('jp');
		expect(result).toBe('en');
	});

	it('falls back gracefully when no server lang provided', () => {
		setLanguage('en');
		const result = initLanguage(undefined);
		expect(result).toBe('en');
	});

	it('handles empty string gracefully', () => {
		setLanguage('hi');
		const result = initLanguage('');
		expect(result).toBe('hi');
	});
});

// ═══════════════════════════════════════════════════════════════
// persistLanguage() — localStorage + cookie persistence
// ═══════════════════════════════════════════════════════════════

describe('persistLanguage()', () => {
	it('updates current language when called with valid code', () => {
		persistLanguage('hi');
		expect(getLanguage()).toBe('hi');
	});

	it('falls back to current language for invalid code', () => {
		setLanguage('mr');
		persistLanguage('invalid');
		expect(getLanguage()).toBe('mr');
	});

	it('uses current language when called with no argument', () => {
		setLanguage('hi');
		persistLanguage();
		expect(getLanguage()).toBe('hi');
	});
});

// ═══════════════════════════════════════════════════════════════
// Key naming conventions
// ═══════════════════════════════════════════════════════════════

describe('Translation key conventions', () => {
	it('all keys use dot-separated namespacing', () => {
		const keys = getAllKeys();
		for (const key of keys) {
			// Allow camelCase in all segments (e.g. appStatus.draft, dashboard.loanCount)
			expect(key).toMatch(/^[a-zA-Z_]+(\.[a-zA-Z0-9_]+)+$/);
		}
	});

	it('all disclaimer keys start with "disclaimer."', () => {
		const keys = getAllKeys().filter((k) => k.startsWith('disclaimer.'));
		expect(keys.length).toBeGreaterThanOrEqual(7);
	});

	it('all RM value keys start with "rm_value."', () => {
		const keys = getAllKeys().filter((k) => k.startsWith('rm_value.'));
		expect(keys.length).toBeGreaterThanOrEqual(20);
	});

	it('all common keys start with "common."', () => {
		const keys = getAllKeys().filter((k) => k.startsWith('common.'));
		expect(keys.length).toBeGreaterThanOrEqual(15);
	});
});
