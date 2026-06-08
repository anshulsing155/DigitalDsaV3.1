/**
 * F.3 — UTM first-touch attribution helpers
 * ══════════════════════════════════════════════════════════════════════
 * Three primitives:
 *
 *   parseUtmFromUrl(url)
 *     Pulls utm_* + landing_page from a URL. Returns null when none of
 *     the 5 UTM params are present (an "organic" visit — don't pollute
 *     the cookie or the eventual DSA record).
 *
 *   serializeForCookie(attr)
 *     JSON-stringify with a stable key order so the cookie value is
 *     deterministic across visits (eases debugging + analytics).
 *
 *   parseFromCookie(raw)
 *     The inverse — defensive parse. Returns null on any malformed
 *     value rather than throwing (the cookie is user-mutable).
 *
 * Cookie name + lifetime locked here so server + signup endpoint stay
 * in lockstep.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.3
 */

/** Cookie name. First-touch wins — set on first visit with utm_*, kept for 30 days. */
export const UTM_COOKIE_NAME = 'dsa_attribution';

/** 30 days in seconds (cookie max-age). */
export const UTM_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface UtmAttribution {
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_term?: string;
	landing_page?: string;
	first_seen_at: string; // ISO timestamp
}

/**
 * Build an attribution sub-doc from a URL. Returns null when no UTM
 * params are present — we don't want to capture "organic" visits as
 * attribution (they should fall through to source='direct' on the DSA
 * record).
 */
export function parseUtmFromUrl(url: URL, now: Date = new Date()): UtmAttribution | null {
	const params = url.searchParams;
	const utm_source = params.get('utm_source')?.slice(0, 200) || undefined;
	const utm_medium = params.get('utm_medium')?.slice(0, 200) || undefined;
	const utm_campaign = params.get('utm_campaign')?.slice(0, 200) || undefined;
	const utm_content = params.get('utm_content')?.slice(0, 200) || undefined;
	const utm_term = params.get('utm_term')?.slice(0, 200) || undefined;

	// "Has any UTM" gate — if all five are absent it's an organic visit.
	if (!utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term) {
		return null;
	}

	return {
		...(utm_source && { utm_source }),
		...(utm_medium && { utm_medium }),
		...(utm_campaign && { utm_campaign }),
		...(utm_content && { utm_content }),
		...(utm_term && { utm_term }),
		landing_page: url.pathname.slice(0, 500),
		first_seen_at: now.toISOString()
	};
}

/**
 * Serialize for cookie storage. Stable order so the same attribution
 * round-trips to the same string across visits (eases debugging).
 */
export function serializeForCookie(attr: UtmAttribution): string {
	const ordered: Record<string, string | undefined> = {
		utm_source: attr.utm_source,
		utm_medium: attr.utm_medium,
		utm_campaign: attr.utm_campaign,
		utm_content: attr.utm_content,
		utm_term: attr.utm_term,
		landing_page: attr.landing_page,
		first_seen_at: attr.first_seen_at
	};
	// Drop undefineds before stringify so the cookie value stays compact.
	const filtered: Record<string, string> = {};
	for (const [k, v] of Object.entries(ordered)) {
		if (v !== undefined) filtered[k] = v;
	}
	return JSON.stringify(filtered);
}

/**
 * Defensive parse. The cookie value is client-mutable; never throw.
 * Returns null on any malformed input.
 */
export function parseFromCookie(raw: string | undefined): UtmAttribution | null {
	if (!raw) return null;
	try {
		const obj = JSON.parse(raw) as Record<string, unknown>;
		if (typeof obj !== 'object' || obj === null) return null;
		const first_seen_at = obj.first_seen_at;
		if (typeof first_seen_at !== 'string') return null;
		// Build with explicit field whitelist + string-only filtering so a
		// malicious cookie can't smuggle in extra fields that overwrite
		// unrelated DSA-record properties downstream.
		const out: UtmAttribution = { first_seen_at };
		for (const k of [
			'utm_source',
			'utm_medium',
			'utm_campaign',
			'utm_content',
			'utm_term',
			'landing_page'
		] as const) {
			const v = obj[k];
			if (typeof v === 'string' && v.length > 0 && v.length <= 500) {
				out[k] = v;
			}
		}
		return out;
	} catch {
		return null;
	}
}
