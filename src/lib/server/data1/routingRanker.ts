/**
 * DATA-1 — Routing-candidate ranker (pure function).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 (composite scoring).
 *
 * Takes a set of vault entries that have already been geography-matched
 * (or in Pass 3, loan-type-matched only) and returns up to 5 ranked
 * `LeadRoutingCandidate`s.
 *
 * Composite ranking:
 *   score = 0.6 * recency_score + 0.4 * normalized_case_count
 *
 * Where:
 *   - recency_score for a DSA's group is the recency of their MOST
 *     RECENT entry in the cohort (not the average — we want to reward
 *     recent activity, not penalize the DSA for old historical cases).
 *   - normalized_case_count = group.case_count / max(case_count across all groups)
 *
 * The pure-function shape (input vault entries → ranked candidates) keeps
 * this testable without a Mongo connection. The wrapper in
 * `leadRoutingQuery.ts` runs the actual aggregation and feeds results in.
 *
 * Top-lender selection (spec §4 result shape):
 *   - Distinct lender names from the group
 *   - Sorted by created_at DESC (most recent first)
 *   - Truncated to top 3
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { LeadAttributionVaultEntry, LeadRoutingCandidate } from './types.js';
import { recencyScore } from './recencyScore.js';

const RECENCY_WEIGHT = 0.6;
const COUNT_WEIGHT = 0.4;
const MAX_CANDIDATES = 5;
const MAX_TOP_LENDERS = 3;

interface GroupedDsa {
	dsa_id: ObjectId;
	entries: LeadAttributionVaultEntry[];
}

function groupByDsa(entries: LeadAttributionVaultEntry[]): GroupedDsa[] {
	const buckets = new Map<string, GroupedDsa>();
	for (const e of entries) {
		const key = e.source_dsa_id.toString();
		let g = buckets.get(key);
		if (!g) {
			g = { dsa_id: e.source_dsa_id, entries: [] };
			buckets.set(key, g);
		}
		g.entries.push(e);
	}
	return [...buckets.values()];
}

/** Returns the lexicographically-greatest quarter — equivalent to MAX for "YYYY-Q{1..4}". */
function maxQuarter(entries: LeadAttributionVaultEntry[]): string {
	let max = '';
	for (const e of entries) {
		if (e.closed_quarter > max) max = e.closed_quarter;
	}
	return max;
}

function avgPrice(entries: LeadAttributionVaultEntry[]): number {
	if (entries.length === 0) return 0;
	const sum = entries.reduce((acc, e) => acc + e.property_price_bucket, 0);
	return Math.round(sum / entries.length);
}

/** Top 3 lender names, most-recent first, deduplicated, nulls dropped. */
function topLenders(entries: LeadAttributionVaultEntry[]): string[] {
	const sorted = [...entries].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
	const seen = new Set<string>();
	const out: string[] = [];
	for (const e of sorted) {
		const lender = e.lender_selected;
		if (!lender || seen.has(lender)) continue;
		seen.add(lender);
		out.push(lender);
		if (out.length >= MAX_TOP_LENDERS) break;
	}
	return out;
}

/**
 * Rank an array of vault entries into up to MAX_CANDIDATES LeadRoutingCandidates.
 * The `matchStrength` is stamped onto every output candidate — it tells the
 * caller which pass the result came from.
 *
 * `currentQuarter` is the "as-of" quarter for recency scoring. The endpoint
 * computes this from `new Date()`; tests pass a fixed value for determinism.
 */
export function rankCandidates(
	matchedEntries: LeadAttributionVaultEntry[],
	matchStrength: LeadRoutingCandidate['match_strength'],
	currentQuarter: string
): LeadRoutingCandidate[] {
	const groups = groupByDsa(matchedEntries);
	if (groups.length === 0) return [];

	// Step 1: compute per-group stats.
	const stats = groups.map((g) => {
		const mostRecentQuarter = maxQuarter(g.entries);
		return {
			dsa_id: g.dsa_id,
			case_count: g.entries.length,
			most_recent_quarter: mostRecentQuarter,
			recency: recencyScore(mostRecentQuarter, currentQuarter),
			avg_price_bucket: avgPrice(g.entries),
			top_lenders: topLenders(g.entries)
		};
	});

	// Step 2: normalize case counts against the max.
	const maxCount = stats.reduce((m, s) => Math.max(m, s.case_count), 0);

	// Step 3: composite score + sort desc + truncate.
	const ranked = stats
		.map((s) => ({
			...s,
			composite:
				RECENCY_WEIGHT * s.recency +
				COUNT_WEIGHT * (maxCount > 0 ? s.case_count / maxCount : 0)
		}))
		.sort((a, b) => b.composite - a.composite)
		.slice(0, MAX_CANDIDATES);

	return ranked.map((r) => ({
		dsa_id: r.dsa_id,
		match_strength: matchStrength,
		case_count_in_area: r.case_count,
		most_recent_quarter: r.most_recent_quarter,
		avg_price_bucket: r.avg_price_bucket,
		top_lenders: r.top_lenders
	}));
}
