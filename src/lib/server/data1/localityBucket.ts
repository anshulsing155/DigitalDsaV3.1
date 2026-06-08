/**
 * DATA-1 — Locality bucketing utility.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.1
 *
 * Transforms a raw address string into a coarse "area-only" bucket used as
 * the routing key when matching new inbound customers to past DSAs. The
 * transformation must be deterministic — the same input must always produce
 * the same bucket, because the bucket is a hash-style equality key in the
 * routing index.
 *
 * Why bucketing is the privacy mechanism
 * --------------------------------------
 * Storing a tower complex + locality + city ("Hiranandani Gardens Powai") is
 * NOT customer PII — many cases share the same bucket. Storing a flat number
 * + tower + locality ("Flat 4B, Hiranandani Gardens, Powai") IS PII — it
 * names a specific household. This utility's only job is to remove the
 * specifying tokens (flat/unit numbers, door numbers, floor designators,
 * leading numeric tokens) and keep the area-naming tokens.
 *
 * Pipeline (applied in order)
 * ---------------------------
 *   1. Strip flat/unit/apartment patterns:  `Flat 4B`, `Unit 201`, `Apt. 12`
 *   2. Strip leading numeric tokens:         `14A, Linking Road` → `Linking Road`
 *   3. Strip survey/door/building/floor/wing tokens
 *   4. Take the first two comma-delimited non-numeric segments
 *   5. Normalize whitespace + title-case
 *
 * Idempotent: bucket(bucket(x)) === bucket(x).
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Patterns that identify specifying tokens (flat numbers, door numbers, etc.).
 * Each pattern is removed from the raw input before segment extraction.
 *
 * Order matters where patterns overlap — strip the most specific (flat 4B)
 * before the most generic (leading numerics).
 */
// Every pattern below MUST require a digit token after the keyword. Without
// that, a case-insensitive `[A-Z]+` tail will greedily consume the rest of
// any word that starts with the keyword's letters — e.g. `h\.?\s*[A-Z]+`
// matches "Hiranandani" in its entirety. Concrete numbers are the
// distinguishing feature of specifying tokens (flat numbers, door numbers,
// survey numbers); patterns that match letter-only suffixes belong in
// curated lists, not in regex.
const STRIPPING_PATTERNS: RegExp[] = [
	// "Flat 4B", "Flat-4B", "Flat No 4B", "F-4B", "Unit 201", "Apt. 12", "Apartment 5"
	/\b(?:flat|unit|apt\.?|apartment|f[-.])\s*(?:no\.?\s*)?\d+[A-Z]?\b/gi,
	// "Door No 14", "House No 22", "H. No. 5", "Survey No 45", "Plot No 12",
	// "Gala No 5", "Building 7", "Bldg 7". `h\.` requires the literal period —
	// `h\.?` would let `h` alone match the start of "Hiranandani" etc.
	/\b(?:door|house|h\.|survey|plot|gala|building|bldg)\s*(?:no\.?|number)?\s*\d+[A-Z]?\b/gi,
	// "Block 7", "Wing 2", "Tower 1" — require a digit after; we don't try to
	// strip letter-only "Block A" because that risks false positives on real
	// area names (e.g. "Block Town") and "Block A" carries no specifying
	// granularity worth removing.
	/\b(?:block|wing|tower)\s+\d+[A-Z]?\b/gi,
	// "2nd Floor", "3rd Floor", "Floor 3"
	/\b\d+(?:st|nd|rd|th)?\s+floor\b/gi,
	/\bfloor\s+\d+(?:st|nd|rd|th)?\b/gi
];

/**
 * Returns true if a segment is "numeric-only" or "numeric-prefixed" — used to
 * filter out e.g. "14A" from a comma-delimited address like "14A, Linking Road".
 * A pure address-name like "MG Road" passes this filter (MG is alphabetic).
 */
function isNumericPrefix(segment: string): boolean {
	const trimmed = segment.trim();
	if (!trimmed) return true;
	// "14", "14A", "14-B", "B-14", "12/34" — anything that's mostly digits
	return /^[\d\-/]+[A-Z]?$/i.test(trimmed);
}

/**
 * Title-case a string while preserving small joiners ("of", "the") lowercase
 * in the middle. First word is always title-cased.
 */
function titleCase(s: string): string {
	const LOWERS = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to']);
	return s
		.split(/\s+/)
		.filter(Boolean)
		.map((word, i) => {
			const lower = word.toLowerCase();
			if (i > 0 && LOWERS.has(lower)) return lower;
			// Preserve short all-caps acronyms ("MG", "DLF", "BTM") but not
			// long all-caps words like "HIRANANDANI" — those are SHOUTY-CASE
			// input that should normalize. Cap at 4 chars.
			if (word.length >= 2 && word.length <= 4 && /^[A-Z]+$/.test(word)) return word;
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');
}

/**
 * Bucket a raw address into an area-only string. Returns '' on empty input or
 * when stripping leaves nothing meaningful — callers must handle the empty
 * case (typically: skip writing a vault entry).
 *
 * @example
 *   localityBucket("Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076")
 *     → "Hiranandani Gardens Powai"
 *
 *   localityBucket("14A, Linking Road, Bandra West")
 *     → "Linking Road Bandra West"
 *
 *   localityBucket("Survey No. 45, Mhalunge, Mulshi Taluka")
 *     → "Mhalunge Mulshi Taluka"
 */
export function localityBucket(raw: string | null | undefined): string {
	if (!raw) return '';

	// Step 1: strip flat/unit/door/floor/survey patterns globally.
	let work = raw;
	for (const pattern of STRIPPING_PATTERNS) {
		work = work.replace(pattern, ' ');
	}

	// Step 2: split into comma-delimited segments.
	const allSegments = work.split(',').map((s) => s.trim());

	// Step 3: drop segments that are numeric-only (e.g. "14A") OR purely
	// pincode-shaped (e.g. "400076"), OR are city-name-with-pincode like
	// "Mumbai 400076" — strip the trailing pincode in that case.
	const meaningful: string[] = [];
	for (const seg of allSegments) {
		if (!seg) continue;
		if (isNumericPrefix(seg)) continue;
		// Strip a trailing 6-digit pincode tail ("Mumbai 400076" → "Mumbai")
		const withoutPincode = seg.replace(/\s+\d{6}\s*$/, '').trim();
		if (!withoutPincode) continue;
		meaningful.push(withoutPincode);
	}

	if (meaningful.length === 0) return '';

	// Step 4: take the first two non-numeric segments and join with a space.
	// One segment is acceptable (single-name village/area); never exceed two
	// because three would creep toward identifying granularity.
	const picked = meaningful.slice(0, 2).join(' ');

	// Step 5: normalize whitespace + title-case.
	const normalized = picked.replace(/\s+/g, ' ').trim();
	return titleCase(normalized);
}
