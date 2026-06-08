/**
 * RM Value Screen Content Tests
 *
 * Validates: all i18n keys referenced by Value Screens 1-4 exist in all
 * Phase 1 languages (en, hi, mr). Ensures Devanagari script is used
 * for Hindi and Marathi translations.
 *
 * @see AD-12 in DEVELOPMENT-PLAN.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { t, tIn, setLanguage, getAllKeys } from '$lib/i18n';

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

beforeEach(() => {
	setLanguage('en');
});

// ── Key inventories for each screen ────────────────────────────

const screen1Keys = [
	'rm_value.screen1_title',
	'rm_value.more_dsas_title',
	'rm_value.more_dsas_desc',
	'rm_value.quality_leads_title',
	'rm_value.quality_leads_desc',
	'rm_value.daily_manage_title',
	'rm_value.daily_manage_desc',
	'rm_value.less_effort_title',
	'rm_value.less_effort_desc',
	'rm_value.policy_updates_title',
	'rm_value.policy_updates_desc',
	'rm_value.async_title',
	'rm_value.async_desc'
];

const screen2Keys = [
	'rm_value.screen2_title',
	'rm_value.more_files_title',
	'rm_value.more_files_desc',
	'rm_value.conversion_title',
	'rm_value.conversion_desc',
	'rm_value.time_money_title',
	'rm_value.time_money_desc',
	'rm_value.business_safe_title',
	'rm_value.business_safe_desc',
	'rm_value.performance_title',
	'rm_value.performance_desc',
	'rm_value.free_title',
	'rm_value.free_desc',
	'rm_value.seasonal_title',
	'rm_value.seasonal_desc'
];

const screen3Keys = [
	'rm_value.screen3_title',
	'rm_value.not_official_title',
	'rm_value.not_official_desc',
	'rm_value.no_legal_title',
	'rm_value.no_legal_desc',
	'rm_value.no_customer_data_title',
	'rm_value.no_customer_data_desc',
	'rm_value.network_safe_title',
	'rm_value.network_safe_desc',
	'rm_value.not_magic_title',
	'rm_value.not_magic_desc'
];

const screen4Keys = [
	'rm_value.screen4_title',
	'rm_value.step1_title',
	'rm_value.step1_desc',
	'rm_value.step2_title',
	'rm_value.step2_desc',
	'rm_value.step3_title',
	'rm_value.step3_desc',
	'rm_value.cta'
];

const allScreenKeys = [...screen1Keys, ...screen2Keys, ...screen3Keys, ...screen4Keys];
const additionalKeys = [
	'rm_value.informal_dsas_title',
	'rm_value.informal_dsas_desc',
	'rm_value.peer_proof'
];
const allRmValueKeys = [...allScreenKeys, ...additionalKeys];
const navigationKeys = ['common.next', 'common.back', 'common.skip'];

// ═══════════════════════════════════════════════════════════════
// Screen 1 — "What will this platform do for you?"
// ═══════════════════════════════════════════════════════════════

describe('Screen 1 — Feature benefits', () => {
	it('has 6 benefit items (title + desc pairs)', () => {
		const titles = screen1Keys.filter(
			(k) => k.endsWith('_title') && k !== 'rm_value.screen1_title'
		);
		const descs = screen1Keys.filter((k) => k.endsWith('_desc'));
		expect(titles).toHaveLength(6);
		expect(descs).toHaveLength(6);
	});

	it.each(screen1Keys)('key exists and resolves in English: %s', (key) => {
		const text = t(key);
		expect(text).not.toBe(key);
		expect(text.length).toBeGreaterThan(0);
	});

	it.each(screen1Keys)('key exists in Hindi: %s', (key) => {
		const text = tIn('hi', key);
		expect(text).not.toBe(key);
	});

	it.each(screen1Keys)('key exists in Marathi: %s', (key) => {
		const text = tIn('mr', key);
		expect(text).not.toBe(key);
	});
});

// ═══════════════════════════════════════════════════════════════
// Screen 2 — "The money talk"
// ═══════════════════════════════════════════════════════════════

describe('Screen 2 — Money benefits', () => {
	it('has 7 money items (title + desc pairs)', () => {
		const titles = screen2Keys.filter(
			(k) => k.endsWith('_title') && k !== 'rm_value.screen2_title'
		);
		const descs = screen2Keys.filter((k) => k.endsWith('_desc'));
		expect(titles).toHaveLength(7);
		expect(descs).toHaveLength(7);
	});

	it.each(screen2Keys)('key exists and resolves in English: %s', (key) => {
		const text = t(key);
		expect(text).not.toBe(key);
		expect(text.length).toBeGreaterThan(0);
	});

	it.each(screen2Keys)('key exists in Hindi: %s', (key) => {
		const text = tIn('hi', key);
		expect(text).not.toBe(key);
	});

	it.each(screen2Keys)('key exists in Marathi: %s', (key) => {
		const text = tIn('mr', key);
		expect(text).not.toBe(key);
	});
});

// ═══════════════════════════════════════════════════════════════
// Screen 3 — "What this platform is NOT"
// ═══════════════════════════════════════════════════════════════

describe('Screen 3 — Trust builders', () => {
	it('has 5 trust builder items (title + desc pairs)', () => {
		const titles = screen3Keys.filter(
			(k) => k.endsWith('_title') && k !== 'rm_value.screen3_title'
		);
		const descs = screen3Keys.filter((k) => k.endsWith('_desc'));
		expect(titles).toHaveLength(5);
		expect(descs).toHaveLength(5);
	});

	it.each(screen3Keys)('key exists and resolves in English: %s', (key) => {
		const text = t(key);
		expect(text).not.toBe(key);
		expect(text.length).toBeGreaterThan(0);
	});

	it.each(screen3Keys)('key exists in Hindi: %s', (key) => {
		const text = tIn('hi', key);
		expect(text).not.toBe(key);
	});

	it.each(screen3Keys)('key exists in Marathi: %s', (key) => {
		const text = tIn('mr', key);
		expect(text).not.toBe(key);
	});
});

// ═══════════════════════════════════════════════════════════════
// Screen 4 — "How does it work?"
// ═══════════════════════════════════════════════════════════════

describe('Screen 4 — Steps + CTA', () => {
	it('has 3 step items (title + desc pairs) plus CTA', () => {
		const stepTitles = screen4Keys.filter((k) => k.includes('step') && k.endsWith('_title'));
		const stepDescs = screen4Keys.filter((k) => k.includes('step') && k.endsWith('_desc'));
		expect(stepTitles).toHaveLength(3);
		expect(stepDescs).toHaveLength(3);
	});

	it('CTA key exists', () => {
		expect(screen4Keys).toContain('rm_value.cta');
		expect(t('rm_value.cta')).not.toBe('rm_value.cta');
	});

	it.each(screen4Keys)('key exists and resolves in English: %s', (key) => {
		const text = t(key);
		expect(text).not.toBe(key);
		expect(text.length).toBeGreaterThan(0);
	});

	it.each(screen4Keys)('key exists in Hindi: %s', (key) => {
		const text = tIn('hi', key);
		expect(text).not.toBe(key);
	});

	it.each(screen4Keys)('key exists in Marathi: %s', (key) => {
		const text = tIn('mr', key);
		expect(text).not.toBe(key);
	});
});

// ═══════════════════════════════════════════════════════════════
// Peer proof — variable substitution
// ═══════════════════════════════════════════════════════════════

describe('Peer proof — variable substitution', () => {
	it('English: substitutes dsaCount and rmCount', () => {
		const result = t('rm_value.peer_proof', { dsaCount: '500+', rmCount: '50+' });
		expect(result).toContain('500+');
		expect(result).toContain('50+');
		expect(result).not.toContain('{{');
	});

	it('Hindi: substitutes dsaCount and rmCount', () => {
		const result = tIn('hi', 'rm_value.peer_proof', { dsaCount: '500+', rmCount: '50+' });
		expect(result).toContain('500+');
		expect(result).toContain('50+');
		expect(result).not.toContain('{{');
	});

	it('Marathi: substitutes dsaCount and rmCount', () => {
		const result = tIn('mr', 'rm_value.peer_proof', { dsaCount: '500+', rmCount: '50+' });
		expect(result).toContain('500+');
		expect(result).toContain('50+');
		expect(result).not.toContain('{{');
	});
});

// ═══════════════════════════════════════════════════════════════
// Navigation keys used by carousel
// ═══════════════════════════════════════════════════════════════

describe('Carousel navigation keys', () => {
	it.each(navigationKeys)('navigation key exists in English: %s', (key) => {
		expect(t(key)).not.toBe(key);
	});

	it.each(navigationKeys)('navigation key exists in Hindi: %s', (key) => {
		expect(tIn('hi', key)).not.toBe(key);
	});

	it.each(navigationKeys)('navigation key exists in Marathi: %s', (key) => {
		expect(tIn('mr', key)).not.toBe(key);
	});
});

// ═══════════════════════════════════════════════════════════════
// Script validation — Devanagari for Hindi and Marathi
// ═══════════════════════════════════════════════════════════════

describe('Devanagari script validation', () => {
	/** Check that a string contains at least one Devanagari character */
	function containsDevanagari(str: string): boolean {
		return /[\u0900-\u097F]/.test(str);
	}

	it('Hindi translations use Devanagari script (not Roman transliteration)', () => {
		const keysToCheck = [
			'common.next',
			'common.back',
			'rm_value.screen1_title',
			'rm_value.more_dsas_title',
			'disclaimer.rm_onboarding_title',
			'disclaimer.rm_onboarding_body'
		];
		for (const key of keysToCheck) {
			const text = tIn('hi', key);
			expect(containsDevanagari(text)).toBe(true);
		}
	});

	it('Marathi translations use Devanagari script (not Roman transliteration)', () => {
		const keysToCheck = [
			'common.next',
			'common.back',
			'rm_value.screen1_title',
			'rm_value.more_dsas_title',
			'disclaimer.rm_onboarding_title',
			'disclaimer.rm_onboarding_body'
		];
		for (const key of keysToCheck) {
			const text = tIn('mr', key);
			expect(containsDevanagari(text)).toBe(true);
		}
	});

	it('English translations do NOT use Devanagari script', () => {
		const keysToCheck = [
			'common.next',
			'common.back',
			'rm_value.screen1_title',
			'disclaimer.rm_onboarding_title'
		];
		for (const key of keysToCheck) {
			const text = tIn('en', key);
			expect(containsDevanagari(text)).toBe(false);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Completeness — all rm_value.* keys registered
// ═══════════════════════════════════════════════════════════════

describe('Key completeness', () => {
	it('every rm_value.* key in the system is covered by our screen key lists', () => {
		const systemKeys = getAllKeys().filter((k) => k.startsWith('rm_value.'));
		for (const key of systemKeys) {
			expect(allRmValueKeys).toContain(key);
		}
	});

	it('our key lists only reference keys that actually exist', () => {
		const systemKeys = new Set(getAllKeys());
		for (const key of allRmValueKeys) {
			expect(systemKeys.has(key)).toBe(true);
		}
	});

	it('no duplicate keys across screens', () => {
		const seen = new Set<string>();
		for (const key of allScreenKeys) {
			expect(seen.has(key)).toBe(false);
			seen.add(key);
		}
	});
});
