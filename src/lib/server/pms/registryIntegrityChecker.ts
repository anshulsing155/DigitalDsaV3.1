/**
 * Registry Integrity Checker — Runtime Health Check
 * ══════════════════════════════════════════════════════════════════
 * Scans every ConditionalOverride.condition across all published
 * policies and flags:
 *   - Stale keys:     var paths that reference deprecated registry entries
 *   - Unknown keys:   var paths not found in the registry at all
 *   - Ready to encode: future-queue items whose key is now in the registry
 *
 * This is the runtime complement to the CI gate (scripts/check-registry-integrity.cjs).
 * CI catches issues before merge; this catches issues on every deploy.
 *
 * See: docs/specs/PMS-IMPLEMENTATION-PLAN.md §11.4
 * ══════════════════════════════════════════════════════════════════
 */

import { PmsLenderPolicies, PolicyFutureQueue } from '$lib/database/mongo.js';
import { KEY_REGISTRY, getKeyEntry } from '$lib/config/pms/keyRegistry.js';
import type { KeyRegistryEntry } from '$lib/config/pms/keyRegistry.js';
import type { ConditionalOverride } from '$lib/config/pms/policyTypes.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StaleKeyOccurrence {
	keyPath: string;
	overrideId: string;
	overrideLabel: string;
	deprecatedAt: string;
	replacedBy: string | null;
}

export interface StalePolicyReport {
	policyId: string;
	lenderId: string;
	loanProduct: string;
	staleKeys: StaleKeyOccurrence[];
}

export interface FutureQueueReadyItem {
	keyPath: string;
	addedAt: string;
	queuedClauseCount: number;
}

export interface RegistryHealthReport {
	ranAt: Date;
	totalPoliciesScanned: number;
	healthyPolicies: number;
	stalePolicies: StalePolicyReport[];
	unknownKeyPaths: { keyPath: string; policyId: string; overrideId: string }[];
	futureQueueReady: FutureQueueReadyItem[];
	registrySummary: {
		totalKeys: number;
		activeKeys: number;
		deprecatedKeys: number;
	};
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Run a full registry health check across all published policies.
 * Returns a report — does NOT write to DB (caller decides what to store).
 */
export async function runRegistryHealthCheck(): Promise<RegistryHealthReport> {
	const ranAt = new Date();

	// ── Load all published policies ───────────────────────────────────────────
	const publishedPolicies = await PmsLenderPolicies.find(
		{ status: 'published' },
		{
			projection: {
				_id: 1,
				lenderId: 1,
				loanProduct: 1,
				conditionalOverrides: 1
			}
		}
	).toArray();

	// ── Scan each policy for stale / unknown var paths ────────────────────────
	const stalePolicies: StalePolicyReport[] = [];
	const unknownKeyPaths: { keyPath: string; policyId: string; overrideId: string }[] = [];

	for (const policy of publishedPolicies) {
		const policyStale: StaleKeyOccurrence[] = [];

		for (const override of (policy.conditionalOverrides ?? []) as ConditionalOverride[]) {
			const varPaths = extractVarPaths(override.condition);

			for (const keyPath of varPaths) {
				const entry = getKeyEntry(keyPath);

				if (!entry) {
					// Completely unknown — not in registry
					unknownKeyPaths.push({
						keyPath,
						policyId: policy._id.toString(),
						overrideId: override.id
					});
					continue;
				}

				if (entry.deprecatedAt !== null) {
					// Deprecated — policy is stale
					policyStale.push({
						keyPath,
						overrideId: override.id,
						overrideLabel: override.label,
						deprecatedAt: entry.deprecatedAt,
						replacedBy: entry.replacedBy
					});
				}
			}
		}

		if (policyStale.length > 0) {
			stalePolicies.push({
				policyId: policy._id.toString(),
				lenderId: policy.lenderId,
				loanProduct: policy.loanProduct,
				staleKeys: policyStale
			});
		}
	}

	const healthyPolicies = publishedPolicies.length - stalePolicies.length;

	// ── Future queue items ready to encode ───────────────────────────────────
	// A future-queue item is "ready" when its proposed key is now in the registry.
	// NOTE: previous code projected `intendedKeyPath` / `addedAt`, neither of which
	// exist on FutureEnhancementItem (correct fields are `proposedKeyPath` /
	// `createdAt`). MongoDB silently dropped the unknown projection fields, so the
	// loop body's `item.intendedKeyPath` was always undefined — `futureQueueReady`
	// was permanently empty. Fixed in this pass.
	const futureQueueItems = await PolicyFutureQueue.find(
		{ status: 'pending' },
		{ projection: { _id: 0, proposedKeyPath: 1, createdAt: 1 } }
	).toArray();

	// Group by key path, count queued clauses
	const readyMap = new Map<string, { addedAt: Date; count: number }>();
	for (const item of futureQueueItems) {
		const keyPath = (item as unknown as { proposedKeyPath?: string | null }).proposedKeyPath;
		if (!keyPath) continue;

		const entry = getKeyEntry(keyPath);
		if (entry && entry.deprecatedAt === null) {
			// Key is now active in registry — this item is ready to encode
			const existing = readyMap.get(keyPath);
			if (existing) {
				existing.count++;
			} else {
				readyMap.set(keyPath, {
					addedAt: entry.addedAt ? new Date(entry.addedAt) : new Date(),
					count: 1
				});
			}
		}
	}

	const futureQueueReady: FutureQueueReadyItem[] = [...readyMap.entries()].map(
		([keyPath, { addedAt, count }]) => ({
			keyPath,
			addedAt: addedAt.toISOString(),
			queuedClauseCount: count
		})
	);

	// ── Registry summary ──────────────────────────────────────────────────────
	const activeKeys = KEY_REGISTRY.filter((e) => e.deprecatedAt === null).length;
	const deprecatedKeys = KEY_REGISTRY.length - activeKeys;

	return {
		ranAt,
		totalPoliciesScanned: publishedPolicies.length,
		healthyPolicies,
		stalePolicies,
		unknownKeyPaths,
		futureQueueReady,
		registrySummary: {
			totalKeys: KEY_REGISTRY.length,
			activeKeys,
			deprecatedKeys
		}
	};
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Recursively extract all { "var": "..." } path values from a JSON-Logic rule.
 * Returns a deduplicated set.
 *
 * Exported for unit testing — not part of the public API surface.
 */
export function extractVarPaths(rule: unknown, found: Set<string> = new Set()): Set<string> {
	if (!rule || typeof rule !== 'object') return found;

	if (Array.isArray(rule)) {
		for (const item of rule) extractVarPaths(item, found);
		return found;
	}

	const obj = rule as Record<string, unknown>;

	// JSON-Logic var operator: { "var": "some.path" }
	if ('var' in obj && typeof obj.var === 'string') {
		found.add(obj.var);
		return found;
	}

	// Recurse into all values
	for (const value of Object.values(obj)) {
		extractVarPaths(value, found);
	}

	return found;
}

/**
 * Checks whether a single key path is stale (deprecated) or unknown.
 * Used by the condition builder for real-time validation.
 */
export function checkKeyPathStatus(
	keyPath: string
): { status: 'active' | 'deprecated' | 'unknown'; entry: KeyRegistryEntry | null } {
	const entry = getKeyEntry(keyPath);
	if (!entry) return { status: 'unknown', entry: null };
	if (entry.deprecatedAt !== null) return { status: 'deprecated', entry };
	return { status: 'active', entry };
}
