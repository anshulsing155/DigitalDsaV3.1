/**
 * Snapshot Helper Functions
 * ══════════════════════════════════════════════════════════════════
 * Utilities for form snapshot hash computation and diff comparison.
 *
 * - computePayloadHash: SHA-256 of JSON.stringify(payload)
 * - computeSnapshotDiff: top-level key diff between two payloads
 * ══════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ============================================================================
// COMPUTE PAYLOAD HASH
// ============================================================================

/**
 * Recursively sorts object keys so JSON.stringify produces deterministic output.
 * Arrays preserve order (their index-based ordering is meaningful).
 */
function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(sortKeysDeep);

	// Sort keys alphabetically, recurse into values
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
	}
	return sorted;
}

/**
 * Computes a SHA-256 hex digest of the JSON-stringified payload.
 * Keys are sorted recursively for deterministic hashing — same data
 * always produces the same hash regardless of key insertion order.
 */
export function computePayloadHash(payload: Record<string, any>): string {
	const deterministic = JSON.stringify(sortKeysDeep(payload));
	return createHash('sha256').update(deterministic).digest('hex');
}

// ============================================================================
// COMPUTE SNAPSHOT DIFF
// ============================================================================

/**
 * Compares two payloads at the top-level key level.
 * Returns lists of added, removed, and changed keys.
 */
export function computeSnapshotDiff(
	payload1: Record<string, any>,
	payload2: Record<string, any>
): { added: string[]; removed: string[]; changed: string[] } {
	const keys1 = new Set(Object.keys(payload1));
	const keys2 = new Set(Object.keys(payload2));

	const added: string[] = [];
	const removed: string[] = [];
	const changed: string[] = [];

	// Keys in payload2 but not in payload1 => added
	for (const key of keys2) {
		if (!keys1.has(key)) {
			added.push(key);
		}
	}

	// Keys in payload1 but not in payload2 => removed
	for (const key of keys1) {
		if (!keys2.has(key)) {
			removed.push(key);
		}
	}

	// Keys in both => check if value changed
	for (const key of keys1) {
		if (keys2.has(key)) {
			if (JSON.stringify(payload1[key]) !== JSON.stringify(payload2[key])) {
				changed.push(key);
			}
		}
	}

	return { added, removed, changed };
}
