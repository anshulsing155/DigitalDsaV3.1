/**
 * Name-field input validation with context-aware rules.
 *
 * Three severity levels — UI surfaces them differently:
 *   block — prevent submit, show red error message
 *   warn  — show yellow advisory ("This name looks unusual..."), allow submit
 *   ok    — no message
 *
 * Three contexts — different rules per field type:
 *   person  — full name, GPA holder name, RM contact, etc. Stricter character set
 *             (letters, spaces, dots, apostrophes, hyphens). Examples accepted:
 *             "K.K. Sharma", "O'Brien", "Mary-Anne", "Mohammed bin Salman".
 *             Repeated full word ("Rao Rao", "Kumar Kumar") → soft warn (valid
 *             Indian names but worth confirming).
 *   entity  — company / firm / builder / bank / authority / project name.
 *             Very permissive — most printable input is fine. Examples accepted:
 *             "AAA Industries", "AAR EES Properties", "5G Networks Pvt Ltd",
 *             "M&A Partners", "7-Eleven India", "L&T Realty Ltd.".
 *             Only 4+ consecutive identical letters ("AAAA Foo") → soft warn.
 *   generic — fallback. Same rules as the historical (pre-Phase-1) checker so
 *             unmigrated callers see no behaviour change.
 */

export type Severity = 'block' | 'warn' | 'ok';
export type ValidationContext = 'person' | 'entity' | 'generic';

export interface ValidationResult {
	severity: Severity;
	reason: string | null;
}

/** Legacy boolean shape — kept for callers/tests not yet migrated. */
export interface GibberishCheckResult {
	gibberish: boolean;
	reason: string | null;
}

const SOFT_FLAG_REASON = 'This name looks unusual. Continue if correct.';

// Person-name allowed characters: letters, spaces, dots (K.K.), straight or
// curly apostrophes (O'Brien / O’Brien), hyphens (Mary-Anne).
const PERSON_ALLOWED_CHARS = /^[A-Za-z\s.’'-]+$/;

// Entity-name block list: only control characters and angle brackets.
// Everything else (numbers, &, /, parens, etc.) is permitted.
const ENTITY_BLOCK_CHARS = /[\x00-\x1F<>]/;

/**
 * Main validator. New callers should pass an explicit context.
 * Default `'generic'` preserves historical behaviour for unmigrated callers.
 */
export function checkGibberish(
	text: string,
	context: ValidationContext = 'generic'
): ValidationResult {
	const trimmed = (text ?? '').trim();

	if (context === 'entity') return checkEntityName(trimmed);
	if (context === 'person') return checkPersonName(trimmed);
	return checkGeneric(trimmed);
}

/**
 * Legacy boolean-shape wrapper for callers not yet migrated to the severity API.
 * Maps `severity === 'block'` → `gibberish: true`. Warn/ok both map to false
 * since the legacy callers had no concept of soft-flags.
 *
 * @deprecated Use `checkGibberish(text, context)` and inspect `result.severity`.
 */
export function checkGibberishLegacy(text: string): GibberishCheckResult {
	const result = checkGibberish(text, 'generic');
	return {
		gibberish: result.severity === 'block',
		reason: result.reason
	};
}

// ─── Person ──────────────────────────────────────────────────────────────────

function checkPersonName(text: string): ValidationResult {
	if (text.length === 0) return { severity: 'block', reason: 'Name is required' };
	if (text.length > 100) return { severity: 'block', reason: 'Name is too long' };

	// All-numeric in a name field is almost certainly a typo into the wrong field.
	if (/^\d+$/.test(text)) {
		return { severity: 'block', reason: 'Name cannot be only digits' };
	}

	if (!PERSON_ALLOWED_CHARS.test(text)) {
		return {
			severity: 'block',
			reason: 'Names can use letters, spaces, dots, apostrophes, and hyphens only'
		};
	}

	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) return { severity: 'block', reason: 'Name is required' };

	// Single-word, single-letter input is spam ("a", "x"). Multi-word with a
	// single-letter middle initial ("Ravi K Sharma") is fine.
	if (words.length === 1) {
		const lettersOnly = words[0].replace(/[.’'-]/g, '');
		if (lettersOnly.length < 2) {
			return { severity: 'block', reason: 'Please enter your full name' };
		}
	}

	for (const word of words) {
		if (word.length > 50) {
			return { severity: 'block', reason: 'Each name part must be 50 characters or fewer' };
		}
		// All-same-letter spam like "aaaa" or "xxxx". Strip punctuation first so
		// "K.K." (letters "KK") doesn't get caught.
		const lettersOnly = word.replace(/[.’'-]/g, '');
		if (lettersOnly.length >= 3 && /^([A-Za-z])\1+$/.test(lettersOnly)) {
			return { severity: 'block', reason: 'Avoid repeated characters' };
		}
	}

	// Soft warn — repeated full word ("Rao Rao", "Kumar Kumar"). These ARE valid
	// Indian names; we just want a "confirm correct" prompt.
	if (words.length >= 2) {
		const lower = words.map((w) => w.toLowerCase());
		for (let i = 1; i < lower.length; i++) {
			if (lower[i] === lower[i - 1]) {
				return { severity: 'warn', reason: SOFT_FLAG_REASON };
			}
		}
	}

	return { severity: 'ok', reason: null };
}

// ─── Entity ──────────────────────────────────────────────────────────────────

function checkEntityName(text: string): ValidationResult {
	if (text.length === 0) return { severity: 'block', reason: 'Name is required' };
	if (text.length > 200) return { severity: 'block', reason: 'Name is too long' };
	if (ENTITY_BLOCK_CHARS.test(text)) {
		return { severity: 'block', reason: 'Name contains invalid characters' };
	}

	// Soft warn for 4+ consecutive identical letters ("AAAA Foo"). Three is fine
	// because AAA / BBB / etc. are legitimate Indian company-name patterns
	// (e.g., "AAA Industries", four partners with same initial).
	if (/([A-Za-z])\1{3,}/.test(text)) {
		return { severity: 'warn', reason: SOFT_FLAG_REASON };
	}

	return { severity: 'ok', reason: null };
}

// ─── Generic (legacy behaviour) ──────────────────────────────────────────────

function checkGeneric(text: string): ValidationResult {
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) {
		return { severity: 'block', reason: 'Please avoid short words' };
	}

	for (const word of words) {
		const cleaned = word.toLowerCase();
		const length = cleaned.length;

		if (!/^[A-Za-z]+$/.test(cleaned)) {
			return { severity: 'block', reason: 'Name can only contain letters' };
		}
		if (length < 3) return { severity: 'block', reason: 'Please avoid short words' };
		if (length > 20) return { severity: 'block', reason: 'Please avoid long words' };
		if (cleaned[0] === cleaned[1] && cleaned[1] === cleaned[2]) {
			return { severity: 'block', reason: 'First three characters are identical' };
		}
		if (/(.)\1{2,}/.test(cleaned)) {
			return { severity: 'block', reason: 'Too many repeated characters' };
		}
		const vowels = cleaned.match(/[aeiou]/g) || [];
		const vowelRatio = vowels.length / length;
		if (length >= 7 && (vowelRatio < 0.2 || vowelRatio > 0.8)) {
			return { severity: 'block', reason: 'Please avoid random text' };
		}
	}

	return { severity: 'ok', reason: null };
}
