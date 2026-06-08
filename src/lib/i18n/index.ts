/**
 * i18n Infrastructure — Internationalization system for DigitalDSA
 *
 * Design: Simple flat key-value system with English default and fallback chain.
 * All translations use colloquial/conversational register (बोलचाल की भाषा)
 * in native script. English technical terms stay in English.
 *
 * Usage:
 *   import { t, setLanguage, getLanguage, SUPPORTED_LANGUAGES } from '$lib/i18n';
 *   t('disclaimer.broadcast_footer')  // returns translated string
 *   setLanguage('hi')                  // switches to Hindi
 *
 * @see AD-13 in DEVELOPMENT-PLAN.md for full design
 */

import { browser } from '$app/environment';
import { en } from './en';
import { hi } from './hi';
import { mr } from './mr';

// ── Supported Languages ──────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
	{ code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin', phase: 1 },
	{ code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari', phase: 1 },
	{ code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari', phase: 1 },
	{ code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', script: 'Gujarati', phase: 2 },
	{ code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil', phase: 2 },
	{ code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu', phase: 2 },
	{ code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada', phase: 2 },
	{ code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali', phase: 3 },
	{ code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', phase: 3 }
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export type Phase1Language = 'en' | 'hi' | 'mr';

/** Languages with translations available right now */
export const AVAILABLE_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.phase === 1);

// ── Translation Maps ─────────────────────────────────────────

export type TranslationKey = keyof typeof en;

type TranslationMap = Record<string, string>;

const translations: Record<Phase1Language, TranslationMap> = {
	en,
	hi,
	mr
};

// ── Persistence ─────────────────────────────────────────────

const STORAGE_KEY = 'ddsa-lang';
const COOKIE_NAME = 'lang';

// ── Current Language State ───────────────────────────────────

let currentLanguage: Phase1Language = 'en';

/**
 * Get the current active language
 */
export function getLanguage(): Phase1Language {
	return currentLanguage;
}

/**
 * Set the active language. Falls back to 'en' if not available.
 * Does NOT persist — call persistLanguage() after if you want persistence.
 */
export function setLanguage(lang: string): Phase1Language {
	if (lang in translations) {
		currentLanguage = lang as Phase1Language;
	} else {
		currentLanguage = 'en';
	}
	return currentLanguage;
}

/**
 * Initialize language from stored preference.
 * Priority: localStorage > cookie > server DB > 'en'
 *
 * localStorage/cookie represent the user's most recent explicit choice
 * (set immediately on selection). Server DB is a backup that may be stale
 * if the PATCH /api/user/language call was slow or failed.
 *
 * Call this once on app mount (e.g. in root layout onMount).
 */
export function initLanguage(serverLang?: string): Phase1Language {
	if (!browser) {
		// SSR: use server preference or default
		if (serverLang && serverLang in translations) {
			currentLanguage = serverLang as Phase1Language;
		}
		return currentLanguage;
	}

	// 1. localStorage — user's most recent explicit choice
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && stored in translations) {
		currentLanguage = stored as Phase1Language;
		return currentLanguage;
	}

	// 2. Cookie (set pre-auth, survives across tabs)
	const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
	if (cookieMatch) {
		const cookieLang = cookieMatch[1];
		if (cookieLang in translations) {
			currentLanguage = cookieLang as Phase1Language;
			localStorage.setItem(STORAGE_KEY, currentLanguage);
			return currentLanguage;
		}
	}

	// 3. Server-provided preference (from user's DB profile) — fallback
	if (serverLang && serverLang in translations) {
		currentLanguage = serverLang as Phase1Language;
		persistLanguage(currentLanguage);
		return currentLanguage;
	}

	return currentLanguage;
}

/**
 * Persist the current language to localStorage + cookie.
 * Cookie is non-httpOnly so server can read it for SSR if needed.
 */
export function persistLanguage(lang?: string): void {
	const effective = (lang && lang in translations ? lang : currentLanguage) as Phase1Language;
	currentLanguage = effective;

	if (!browser) return;

	localStorage.setItem(STORAGE_KEY, effective);
	// 1-year cookie, path=/, SameSite=Lax (readable by server on navigation)
	document.cookie = `${COOKIE_NAME}=${effective};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

/**
 * Check if a language code has translations available
 */
export function isLanguageAvailable(lang: string): lang is Phase1Language {
	return lang in translations;
}

// ── Translation Function ─────────────────────────────────────

/**
 * Translate a key to the current language.
 * Fallback chain: selected language → English
 *
 * @param key - Translation key (e.g. 'disclaimer.broadcast_footer')
 * @param params - Optional key-value pairs for variable substitution
 * @returns Translated string, or the key itself if not found in any language
 *
 * @example
 * t('common.next')           // "अगला →" (if language is 'hi')
 * t('common.next')           // "Next →" (if language is 'en')
 * t('greeting', { name: 'Raj' }) // "Hello Raj" (with variable substitution)
 */
export function t(key: string, params?: Record<string, string | number>): string {
	// Try current language first, then fall back to English
	let value = translations[currentLanguage]?.[key] ?? translations.en?.[key] ?? key;

	// Variable substitution: {{name}} → actual value
	if (params) {
		for (const [paramKey, paramValue] of Object.entries(params)) {
			value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
		}
	}

	return value;
}

/**
 * Get a translation for a specific language (ignores current language setting).
 * Useful for server-side rendering where you need a specific language.
 */
export function tIn(lang: string, key: string, params?: Record<string, string | number>): string {
	const effectiveLang = (lang in translations ? lang : 'en') as Phase1Language;
	let value = translations[effectiveLang]?.[key] ?? translations.en?.[key] ?? key;

	if (params) {
		for (const [paramKey, paramValue] of Object.entries(params)) {
			value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
		}
	}

	return value;
}

// ── Pluralization ────────────────────────────────────────────

/**
 * Simple pluralization: pick between one-key and many-key based on count.
 * Uses `_one` and `_many` suffix convention on translation keys.
 *
 * @param oneKey - Key for singular form (e.g. 'cases.query_one')
 * @param manyKey - Key for plural form (e.g. 'cases.query_many')
 * @param count - The count to determine singular vs plural
 * @param params - Optional extra params for variable substitution
 * @returns Translated string with {{count}} substituted
 *
 * @example
 * tPlural('cases.lender_one', 'cases.lender_many', 3)  // "lenders"
 * tPlural('cases.lender_one', 'cases.lender_many', 1)  // "lender"
 */
export function tPlural(
	oneKey: string,
	manyKey: string,
	count: number,
	params?: Record<string, string | number>
): string {
	const key = count === 1 ? oneKey : manyKey;
	return t(key, { count, ...params });
}

// ── Number Formatting ───────────────────────────────────────

/**
 * Indian locale numbering system.
 *
 * Maps language codes to their Intl locale with Indian numbering system.
 * hi-IN and mr-IN use Devanagari digits by default;
 * we force 'latn' to keep Arabic numerals (industry standard in fintech).
 */
const LOCALE_MAP: Record<Phase1Language, string> = {
	en: 'en-IN',
	hi: 'hi-IN-u-nu-latn',
	mr: 'mr-IN-u-nu-latn'
};

/**
 * Format a number using Indian locale conventions.
 * Uses the current language for locale.
 *
 * @example
 * formatNumber(1234567)     // "12,34,567" (Indian grouping)
 * formatNumber(1234567.89)  // "12,34,567.89"
 */
export function formatNumber(value: number): string {
	const locale = LOCALE_MAP[currentLanguage] || 'en-IN';
	return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format currency in Indian Rupees using the current language.
 *
 * @param value - Amount in INR
 * @param compact - If true, use compact notation (e.g. "12.3L" / "1.5Cr")
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234567)         // "₹12,34,567"
 * formatCurrency(1234567, true)   // "₹12.3 L"
 * formatCurrency(12500000, true)  // "₹1.25 Cr"
 * formatCurrency(0, true)         // "--"
 * formatCurrency(null, true)      // "--"
 */
export function formatCurrency(value: number, compact = false): string {
	if (!value && value !== 0) return '--';
	if (compact && !value) return '--';

	const locale = LOCALE_MAP[currentLanguage] || 'en-IN';

	if (compact) {
		// Indian compact: L (lakh), Cr (crore)
		if (Math.abs(value) >= 1_00_00_000) {
			const cr = value / 1_00_00_000;
			return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
		}
		if (Math.abs(value) >= 1_00_000) {
			const l = value / 1_00_000;
			return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
		}
		if (Math.abs(value) >= 1_000) {
			const k = value / 1_000;
			return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
		}
	}

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'INR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

/**
 * Format a relative time string using translation keys.
 *
 * @param date - Date or timestamp to format relative to now
 * @returns Translated relative time string (e.g. "5m ago", "2d ago")
 */
export function formatTimeAgo(date: Date | number | null | undefined): string {
	if (date == null) return '';
	const now = Date.now();
	const then = typeof date === 'number' ? date : date.getTime();
	if (Number.isNaN(then)) return '';
	const diffMs = now - then;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHr = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHr / 24);
	const diffWeek = Math.floor(diffDay / 7);

	if (diffMin < 1) return t('time.just_now');
	if (diffHr < 1) return t('time.minutes_ago', { count: diffMin });
	if (diffDay < 1) return t('time.hours_ago', { count: diffHr });
	if (diffWeek < 1) return t('time.days_ago', { count: diffDay });
	return t('time.weeks_ago', { count: diffWeek });
}

// ── Key Introspection ───────────────────────────────────────

/**
 * Get all translation keys (useful for testing completeness)
 */
export function getAllKeys(): string[] {
	return Object.keys(en);
}

/**
 * Check translation completeness for a given language against English baseline
 */
export function getTranslationCoverage(lang: Phase1Language): {
	total: number;
	translated: number;
	missing: string[];
	percentage: number;
} {
	const enKeys = Object.keys(en);
	const langMap = translations[lang] || {};
	const missing = enKeys.filter((key) => !(key in langMap));

	return {
		total: enKeys.length,
		translated: enKeys.length - missing.length,
		missing,
		percentage: Math.round(((enKeys.length - missing.length) / enKeys.length) * 100)
	};
}
