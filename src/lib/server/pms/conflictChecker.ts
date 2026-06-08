/**
 * PMS Conflict Checker
 * ══════════════════════════════════════════════════════════════════
 * Detects conflicts between ConditionalOverrides on a PolicyDocument.
 *
 * Two conflict types:
 *   same_field_override  — two overrides write the same fieldPath on the
 *                          same or overlapping scope with overlapping conditions
 *   overlapping_scope    — two overrides target the same scope category
 *                          and could activate simultaneously
 *
 * Called from the policy-save API before each override is persisted,
 * and from Pass 4 (Verify) during the AI pipeline.
 * ══════════════════════════════════════════════════════════════════
 */

import type { ConditionalOverride, ConflictRecord, ConditionScope } from '$lib/config/pms/policyTypes.js';

// ── Scope overlap matrix ──────────────────────────────────────────────────────
// Scopes that can overlap with each other (symmetric — only list each pair once)
const SCOPE_OVERLAPS: [ConditionScope, ConditionScope][] = [
	['primary_applicant', 'any_applicant'],
	['primary_applicant', 'all_applicants'],
	['any_applicant', 'all_applicants']
];

function scopesCanOverlap(a: ConditionScope, b: ConditionScope): boolean {
	if (a === b) return true;
	return SCOPE_OVERLAPS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// ── JSON-Logic field extraction ───────────────────────────────────────────────

/**
 * Extracts all {"var": "..."} paths referenced in a JSON-Logic rule.
 * Used to detect whether two conditions reference the same fields
 * (heuristic for overlapping condition detection).
 */
function extractVarPaths(rule: unknown, collected: Set<string> = new Set()): Set<string> {
	if (!rule || typeof rule !== 'object') return collected;

	const ruleObj = rule as Record<string, unknown>;

	if ('var' in ruleObj && typeof ruleObj.var === 'string') {
		collected.add(ruleObj.var);
		return collected;
	}

	for (const value of Object.values(ruleObj)) {
		if (Array.isArray(value)) {
			for (const item of value) extractVarPaths(item, collected);
		} else if (typeof value === 'object') {
			extractVarPaths(value, collected);
		}
	}

	return collected;
}

// ── Core conflict detection ───────────────────────────────────────────────────

/**
 * Checks a candidate override against a list of existing overrides.
 * Returns any conflicts found. Empty array = no conflicts.
 *
 * @param candidate   The override being added or updated
 * @param existing    All other overrides already on the policy document
 */
export function checkForConflicts(
	candidate: ConditionalOverride,
	existing: ConditionalOverride[]
): ConflictRecord[] {
	const conflicts: ConflictRecord[] = [];

	const candidateVars = extractVarPaths(candidate.condition);

	for (const other of existing) {
		// Skip self-comparison (happens on update)
		if (other.id === candidate.id) continue;

		// ── Check 1: Same field override ─────────────────────────────────────
		// Both overrides write to the same fieldPath and their scopes overlap.
		if (
			other.effect.fieldPath === candidate.effect.fieldPath &&
			scopesCanOverlap(other.scope, candidate.scope)
		) {
			// Only flag if condition variables share at least one field
			// (i.e., they could activate in the same evaluation context)
			const otherVars = extractVarPaths(other.condition);
			const sharedVars = [...candidateVars].filter((v) => otherVars.has(v));

			if (sharedVars.length > 0 || candidateVars.size === 0 || otherVars.size === 0) {
				conflicts.push({
					existingOverrideId: other.id,
					existingLabel: other.label,
					conflictType: 'same_field_override',
					description:
						`Both overrides write to "${candidate.effect.fieldPath}". ` +
						`Shared condition variables: ${sharedVars.length > 0 ? sharedVars.join(', ') : 'none detected'}. ` +
						`If both conditions can be true simultaneously, the last-applied override wins — ` +
						`review which should take precedence.`
				});
			}
		}

		// ── Check 2: Overlapping scope ────────────────────────────────────────
		// Both overrides target the same effect operation on a field that affects
		// the same scope, but with different (potentially overlapping) conditions.
		// Warn when both are additive operations on the same field and scope — the
		// combined effect may be unintentional (e.g., two ROI loadings stacking).
		if (
			other.effect.fieldPath === candidate.effect.fieldPath &&
			other.effect.operation !== 'set' &&
			candidate.effect.operation !== 'set' &&
			other.effect.operation === candidate.effect.operation &&
			scopesCanOverlap(other.scope, candidate.scope)
		) {
			// Avoid duplicate conflict with same_field_override
			const alreadyFlagged = conflicts.some((c) => c.existingOverrideId === other.id);
			if (!alreadyFlagged) {
				conflicts.push({
					existingOverrideId: other.id,
					existingLabel: other.label,
					conflictType: 'overlapping_scope',
					description:
						`Both overrides apply "${candidate.effect.operation}" to "${candidate.effect.fieldPath}" ` +
						`on overlapping scopes (${candidate.scope} vs ${other.scope}). ` +
						`If both conditions activate together, the values will stack — confirm this is intentional.`
				});
			}
		}
	}

	return conflicts;
}

/**
 * Rebuilds conflict check records for every override on a policy.
 * Run after bulk import or admin manual-entry to ensure the conflict
 * state is consistent across all overrides.
 *
 * Returns a new array of overrides with refreshed conflictCheck fields.
 * Does not mutate the input array.
 */
export function rebuildAllConflicts(
	overrides: ConditionalOverride[]
): ConditionalOverride[] {
	const now = new Date();

	return overrides.map((candidate) => {
		const others = overrides.filter((o) => o.id !== candidate.id);
		const conflicts = checkForConflicts(candidate, others);

		return {
			...candidate,
			conflictCheck: {
				ranAt: now,
				conflicts,
				// Preserve existing acknowledgements if conflicts are the same set
				acknowledgedBy:
					conflicts.length === 0 ? null : (candidate.conflictCheck?.acknowledgedBy ?? null),
				acknowledgedAt:
					conflicts.length === 0 ? null : (candidate.conflictCheck?.acknowledgedAt ?? null)
			}
		};
	});
}

/**
 * Returns true if all overrides on a policy have either no conflicts,
 * or have conflicts that have been explicitly acknowledged.
 * Used as a gate before policy submission to admin.
 */
export function allConflictsAcknowledged(overrides: ConditionalOverride[]): boolean {
	return overrides.every((o) => {
		if (!o.conflictCheck) return true;
		if (o.conflictCheck.conflicts.length === 0) return true;
		return o.conflictCheck.acknowledgedBy !== null;
	});
}
