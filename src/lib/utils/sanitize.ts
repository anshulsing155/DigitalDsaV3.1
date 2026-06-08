/**
 * Input Sanitization Utilities
 *
 * Provides functions for sanitizing user input to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection patterns (for logging/detection)
 * - Prototype pollution via input
 * - Excessive whitespace/formatting issues
 *
 * @example
 * ```typescript
 * import { sanitizeInput, sanitizeHtml } from '$lib/utils/sanitize';
 *
 * const userInput = sanitizeInput(rawInput);
 * const safeHtml = sanitizeHtml(htmlContent);
 * ```
 */

// ============================================================================
// HTML ENTITY ENCODING
// ============================================================================

const HTML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;'
};

const HTML_ENTITY_PATTERN = /[&<>"'`=/]/g;

/**
 * Encode HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
	if (typeof str !== 'string') return '';
	return str.replace(HTML_ENTITY_PATTERN, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decode HTML entities back to characters
 */
export function unescapeHtml(str: string): string {
	if (typeof str !== 'string') return '';

	const entities: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#x27;': "'",
		'&#x2F;': '/',
		'&#x60;': '`',
		'&#x3D;': '=',
		'&#39;': "'"
	};

	return str.replace(
		/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#39);/g,
		(entity) => entities[entity] || entity
	);
}

// ============================================================================
// GENERAL INPUT SANITIZATION
// ============================================================================

export interface SanitizeOptions {
	/** Maximum allowed length (default: 10000) */
	maxLength?: number;
	/** Trim whitespace from start/end (default: true) */
	trim?: boolean;
	/** Collapse multiple spaces to single space (default: true) */
	collapseSpaces?: boolean;
	/** Remove control characters (default: true) */
	removeControlChars?: boolean;
	/** Escape HTML entities (default: false for plain text, true for HTML context) */
	escapeHtml?: boolean;
	/** Convert to lowercase (default: false) */
	lowercase?: boolean;
	/** Convert to uppercase (default: false) */
	uppercase?: boolean;
	/** Allow only specific characters (regex pattern) */
	allowPattern?: RegExp;
	/** Remove specific characters (regex pattern) */
	removePattern?: RegExp;
}

/**
 * Sanitize general text input
 */
export function sanitizeInput(input: unknown, options: SanitizeOptions = {}): string {
	// Convert to string
	if (input === null || input === undefined) return '';
	if (typeof input !== 'string') {
		input = String(input);
	}

	let str = input as string;

	const {
		maxLength = 10000,
		trim = true,
		collapseSpaces = true,
		removeControlChars = true,
		escapeHtml: shouldEscape = false,
		lowercase = false,
		uppercase = false,
		allowPattern,
		removePattern
	} = options;

	// Remove control characters (except newline, tab, carriage return)
	if (removeControlChars) {
		// eslint-disable-next-line no-control-regex
		str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
	}

	// Trim whitespace
	if (trim) {
		str = str.trim();
	}

	// Collapse multiple spaces
	if (collapseSpaces) {
		str = str.replace(/\s+/g, ' ');
	}

	// Apply allow pattern (keep only matching characters)
	if (allowPattern) {
		str = str
			.split('')
			.filter((char) => allowPattern.test(char))
			.join('');
	}

	// Apply remove pattern
	if (removePattern) {
		str = str.replace(removePattern, '');
	}

	// Case conversion
	if (lowercase) {
		str = str.toLowerCase();
	} else if (uppercase) {
		str = str.toUpperCase();
	}

	// Escape HTML if needed
	if (shouldEscape) {
		str = escapeHtml(str);
	}

	// Enforce max length
	if (str.length > maxLength) {
		str = str.substring(0, maxLength);
	}

	return str;
}

// ============================================================================
// SPECIALIZED SANITIZERS
// ============================================================================

/**
 * Sanitize a name field (person's name)
 */
export function sanitizeName(input: unknown): string {
	return sanitizeInput(input, {
		maxLength: 200,
		trim: true,
		collapseSpaces: true,
		removeControlChars: true,
		// Allow letters, spaces, hyphens, apostrophes, periods (for Jr., Sr., etc.)
		allowPattern: /[a-zA-Z\s\-'.]/
	});
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(input: unknown): string {
	const str = sanitizeInput(input, {
		maxLength: 254, // RFC 5321
		trim: true,
		lowercase: true,
		removeControlChars: true
	});

	// Basic email character filter
	return str.replace(/[^a-z0-9@._+-]/g, '');
}

/**
 * Sanitize a phone number (keep only digits and allowed characters)
 */
export function sanitizePhone(input: unknown): string {
	const str = sanitizeInput(input, {
		maxLength: 20,
		trim: true
	});

	// Keep only digits, +, -, spaces, parentheses
	return str.replace(/[^0-9+\-\s()]/g, '');
}

/**
 * Sanitize a numeric string (for amounts, ages, etc.)
 */
export function sanitizeNumeric(input: unknown, allowDecimal = true): string {
	const str = sanitizeInput(input, {
		maxLength: 50,
		trim: true
	});

	if (allowDecimal) {
		// Keep only digits, decimal point, minus sign
		return str.replace(/[^0-9.\-]/g, '');
	}

	// Keep only digits and minus sign
	return str.replace(/[^0-9\-]/g, '');
}

/**
 * Sanitize alphanumeric input (IDs, codes, etc.)
 */
export function sanitizeAlphanumeric(input: unknown, allowUnderscore = true): string {
	const str = sanitizeInput(input, {
		maxLength: 100,
		trim: true,
		removeControlChars: true
	});

	if (allowUnderscore) {
		return str.replace(/[^a-zA-Z0-9_]/g, '');
	}

	return str.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Sanitize a URL
 */
export function sanitizeUrl(input: unknown): string {
	const str = sanitizeInput(input, {
		maxLength: 2048, // Common browser limit
		trim: true
	});

	// Check for dangerous protocols
	const lowerStr = str.toLowerCase().trim();
	if (
		lowerStr.startsWith('javascript:') ||
		lowerStr.startsWith('data:') ||
		lowerStr.startsWith('vbscript:')
	) {
		return '';
	}

	return str;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if input contains potential SQL injection patterns
 * Note: This is for logging/detection only, not for prevention
 */
export function containsSqlInjectionPatterns(input: string): boolean {
	const patterns = [
		/('|"|;|--|\b(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b)/i,
		/\b(EXEC|EXECUTE|xp_|sp_)\b/i,
		/\/\*[\s\S]*?\*\//,
		/\b(WAITFOR|DELAY|BENCHMARK)\b/i
	];

	return patterns.some((pattern) => pattern.test(input));
}

/**
 * Check if input contains potential XSS patterns
 */
export function containsXssPatterns(input: string): boolean {
	const patterns = [
		/<script/i,
		/javascript:/i,
		/on\w+\s*=/i,
		/<iframe/i,
		/<embed/i,
		/<object/i,
		/expression\s*\(/i,
		/url\s*\(/i
	];

	return patterns.some((pattern) => pattern.test(input));
}

/**
 * Check if input contains prototype pollution patterns
 */
export function containsPrototypePollution(input: string): boolean {
	const patterns = [/__proto__/i, /constructor/i, /prototype/i];

	return patterns.some((pattern) => pattern.test(input));
}

// ============================================================================
// OBJECT SANITIZATION
// ============================================================================

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
	obj: T,
	options: SanitizeOptions = {}
): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => {
			if (typeof item === 'string') {
				return sanitizeInput(item, options);
			}
			if (typeof item === 'object' && item !== null) {
				return sanitizeObject(item as Record<string, unknown>, options);
			}
			return item;
		}) as unknown as T;
	}

	const result: Record<string, unknown> = {};

	for (const key of Object.keys(obj)) {
		// Skip dangerous keys
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
			continue;
		}

		const value = obj[key];

		if (typeof value === 'string') {
			result[key] = sanitizeInput(value, options);
		} else if (typeof value === 'object' && value !== null) {
			result[key] = sanitizeObject(value as Record<string, unknown>, options);
		} else {
			result[key] = value;
		}
	}

	return result as T;
}

// ============================================================================
// FORM DATA SANITIZATION
// ============================================================================

/**
 * Sanitize form data object with field-specific rules
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
	data: T,
	fieldRules: Record<
		string,
		SanitizeOptions | 'name' | 'email' | 'phone' | 'numeric' | 'alphanumeric'
	> = {}
): T {
	const result: Record<string, unknown> = {};

	for (const key of Object.keys(data)) {
		const value = data[key];
		const rule = fieldRules[key];

		if (typeof value !== 'string') {
			result[key] = value;
			continue;
		}

		// Apply field-specific rule
		if (rule === 'name') {
			result[key] = sanitizeName(value);
		} else if (rule === 'email') {
			result[key] = sanitizeEmail(value);
		} else if (rule === 'phone') {
			result[key] = sanitizePhone(value);
		} else if (rule === 'numeric') {
			result[key] = sanitizeNumeric(value);
		} else if (rule === 'alphanumeric') {
			result[key] = sanitizeAlphanumeric(value);
		} else if (typeof rule === 'object') {
			result[key] = sanitizeInput(value, rule);
		} else {
			// Default sanitization
			result[key] = sanitizeInput(value);
		}
	}

	return result as T;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
	sanitizeInput,
	sanitizeName,
	sanitizeEmail,
	sanitizePhone,
	sanitizeNumeric,
	sanitizeAlphanumeric,
	sanitizeUrl,
	sanitizeObject,
	sanitizeFormData,
	escapeHtml,
	unescapeHtml,
	containsSqlInjectionPatterns,
	containsXssPatterns,
	containsPrototypePollution
};
