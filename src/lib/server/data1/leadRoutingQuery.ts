/**
 * DATA-1 — Lead-routing orchestrator (3-pass + k-anonymity gate).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 + §9.
 *
 * Given an inbound customer's intent (loan_type, pincode, locality,
 * target_price), returns up to 5 ranked LeadRoutingCandidates.
 *
 * Strategy
 * --------
 *   Pass 1 (PINCODE)   — exact pincode match, ±40% price band.
 *                        Stop if cohort < k (suppression → Pass 3).
 *                        Stop if ≥ 3 distinct DSAs match.
 *   Pass 2 (LOCALITY)  — bucketed-locality match, same price band.
 *                        Stop if Pass1∪Pass2 cohort < k (→ Pass 3).
 *                        Stop if Pass1∪Pass2 has ≥ 3 distinct DSAs.
 *   Pass 3 (LOAN_TYPE) — loan-type only across the full vault. Last
 *                        resort; ALWAYS allowed (no k-anonymity gate
 *                        because no geography is exposed — count
 *                        alone over the entire vault is non-PII).
 *
 * k-anonymity:
 *   - Pass 1 and 2 each apply the spec §9 suppression: the COHORT size
 *     (total vault rows matching geography + price band, regardless of
 *     DSA) must be ≥ k. For target_price ≥ ₹3 Cr (luxury), k = 10;
 *     otherwise k = 5. Failing the gate redirects to Pass 3.
 *   - Suppression is logged via the caller's logger so we can monitor
 *     suppression rate post-launch (no PII in the log — bucket values
 *     + count + the gate that fired).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Collection } from 'mongodb';
import type { LeadAttributionVaultEntry, LeadRoutingCandidate } from './types.js';
import { rankCandidates } from './routingRanker.js';
import { priceBand, kAnonymityThreshold, type PriceBand } from './priceBand.js';
import { quarterFromDate } from './recencyScore.js';
import { localityBucket } from './localityBucket.js';

export interface RoutingInput {
	loan_type: string;
	pincode: string;
	locality: string; // raw text — bucketized inside this function
	target_price: number;
}

export interface RoutingDeps {
	vault: Collection<LeadAttributionVaultEntry>;
	now: Date;
	/** Optional logger — when present, k-anonymity suppressions are recorded. */
	logger?: { info: (obj: Record<string, unknown>, msg: string) => void };
}

const MIN_DSA_COUNT_TO_STOP = 3;

/**
 * Pass 1: pincode + loan_type + price band.
 * Returns the matched entries and the absolute cohort size (used for k-anon).
 */
async function pincodeMatch(
	input: RoutingInput,
	band: PriceBand,
	deps: RoutingDeps
): Promise<LeadAttributionVaultEntry[]> {
	return await deps.vault
		.find({
			loan_type: input.loan_type,
			property_pincode: input.pincode,
			property_price_bucket: { $gte: band.lower, $lte: band.upper }
		})
		.toArray();
}

/** Pass 2: locality_bucket + loan_type + price band. */
async function localityMatch(
	input: RoutingInput,
	bucketedLocality: string,
	band: PriceBand,
	deps: RoutingDeps
): Promise<LeadAttributionVaultEntry[]> {
	return await deps.vault
		.find({
			loan_type: input.loan_type,
			property_locality_bucket: bucketedLocality,
			property_price_bucket: { $gte: band.lower, $lte: band.upper }
		})
		.toArray();
}

/** Pass 3: loan_type only, recent first. Caller deduplicates if merging. */
async function loanTypeMatch(
	input: RoutingInput,
	deps: RoutingDeps
): Promise<LeadAttributionVaultEntry[]> {
	// Cap the read — we never need more than a few quarters of data to rank
	// the top 5 DSAs. 200 entries is generous and bounds the query.
	return await deps.vault
		.find({ loan_type: input.loan_type })
		.sort({ closed_quarter: -1 })
		.limit(200)
		.toArray();
}

/** Distinct DSA count from a result set. */
function distinctDsas(entries: LeadAttributionVaultEntry[]): number {
	return new Set(entries.map((e) => e.source_dsa_id.toString())).size;
}

/** Merge two passes, deduplicating entries by _id (same vault row can't appear twice). */
function mergePasses(
	a: LeadAttributionVaultEntry[],
	b: LeadAttributionVaultEntry[]
): LeadAttributionVaultEntry[] {
	const seen = new Set<string>();
	const out: LeadAttributionVaultEntry[] = [];
	for (const e of [...a, ...b]) {
		const id = e._id?.toString();
		if (!id) {
			out.push(e); // shouldn't happen with persisted entries, but defensive
			continue;
		}
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(e);
	}
	return out;
}

/**
 * Main entry point. Returns up to 5 LeadRoutingCandidates.
 *
 * Pure-ish: side effects limited to DB reads (via `deps.vault`) and an
 * optional log emission on k-anonymity suppression.
 */
export async function findLeadCandidates(
	input: RoutingInput,
	deps: RoutingDeps
): Promise<LeadRoutingCandidate[]> {
	const band = priceBand(input.target_price);
	const k = kAnonymityThreshold(band);
	const currentQuarter = quarterFromDate(deps.now);

	// ── Pass 1: pincode ────────────────────────────────────────────────
	const p1Entries = await pincodeMatch(input, band, deps);

	// k-anonymity gate on Pass 1 cohort. Suppression redirects to Pass 3.
	if (p1Entries.length > 0 && p1Entries.length < k) {
		deps.logger?.info(
			{
				pass: 1,
				cohort_size: p1Entries.length,
				k_threshold: k,
				pincode: input.pincode,
				price_band: band,
				loan_type: input.loan_type
			},
			'DATA-1 routing: Pass 1 cohort suppressed (k-anonymity)'
		);
		return await pass3(input, deps, currentQuarter);
	}

	if (distinctDsas(p1Entries) >= MIN_DSA_COUNT_TO_STOP) {
		return rankCandidates(p1Entries, 'pincode', currentQuarter);
	}

	// ── Pass 2: locality ───────────────────────────────────────────────
	const bucketedLocality = localityBucket(input.locality);
	let p2Entries: LeadAttributionVaultEntry[] = [];
	if (bucketedLocality) {
		p2Entries = await localityMatch(input, bucketedLocality, band, deps);
	}

	const merged = mergePasses(p1Entries, p2Entries);

	// k-anonymity gate on combined Pass 1 + Pass 2 geography cohort.
	// We apply the gate on the MERGED size, not Pass 2 alone, because if
	// Pass 1 already had 4 entries and Pass 2 adds 1 more, the combined
	// cohort is 5 — which DOES satisfy the standard threshold.
	if (merged.length > 0 && merged.length < k) {
		deps.logger?.info(
			{
				pass: 2,
				cohort_size: merged.length,
				k_threshold: k,
				pincode: input.pincode,
				locality_bucket: bucketedLocality,
				price_band: band,
				loan_type: input.loan_type
			},
			'DATA-1 routing: Pass 1+2 cohort suppressed (k-anonymity)'
		);
		return await pass3(input, deps, currentQuarter);
	}

	if (distinctDsas(merged) >= MIN_DSA_COUNT_TO_STOP) {
		// Stamp candidates from the merged set as locality match — the
		// PINCODE label is reserved for results that survived Pass 1 alone.
		// If a user cares about pincode-vs-locality, the spec calls this
		// reasonable; thin-cohort merging is fundamentally a fuzzy fallback.
		return rankCandidates(merged, 'locality', currentQuarter);
	}

	// ── Pass 3: loan_type only (last resort) ───────────────────────────
	return await pass3(input, deps, currentQuarter);
}

async function pass3(
	input: RoutingInput,
	deps: RoutingDeps,
	currentQuarter: string
): Promise<LeadRoutingCandidate[]> {
	const entries = await loanTypeMatch(input, deps);
	return rankCandidates(entries, 'loan_type_only', currentQuarter);
}
