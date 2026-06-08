/**
 * Family-Control Derivation — Graph-Based Detection
 * ═══════════════════════════════════════════════════════════════════
 * Derives whether a company is family-controlled by analyzing
 * director-to-director relationships using a connected component
 * algorithm (Union-Find / BFS).
 *
 * "Family-controlled" = the largest family cluster contains
 * >= 50% of directors. This is derived, never self-declared.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { DirectorInfo, FamilyControlResult } from '$lib/types/form';
import type { RelationType, Relationship } from '$lib/components/relationship-capture/types';

// ── Family relation types (all are "family" for clustering) ──────
const FAMILY_RELATIONS: Set<RelationType> = new Set([
	// Direct family
	'Husband of',
	'Wife of',
	'Father of',
	'Mother of',
	'Son of',
	'Daughter of',
	'Brother of',
	'Sister of',
	// Grandparents & grandchildren
	'Grandfather of',
	'Grandmother of',
	'Grandson of',
	'Granddaughter of',
	// In-laws
	'Father-in-law of',
	'Mother-in-law of',
	'Son-in-law of',
	'Daughter-in-law of',
	'Brother-in-law of',
	'Sister-in-law of',
	// Extended family
	'Uncle of',
	'Aunt of',
	'Nephew of',
	'Niece of',
	'Cousin of'
]);

// ── Union-Find data structure ────────────────────────────────────
class UnionFind {
	private parent: Map<string, string> = new Map();
	private rank: Map<string, number> = new Map();

	constructor(ids: string[]) {
		for (const id of ids) {
			this.parent.set(id, id);
			this.rank.set(id, 0);
		}
	}

	find(x: string): string {
		const p = this.parent.get(x);
		if (p === undefined) return x;
		if (p !== x) {
			// Path compression
			const root = this.find(p);
			this.parent.set(x, root);
			return root;
		}
		return x;
	}

	union(a: string, b: string): void {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA === rootB) return;

		const rankA = this.rank.get(rootA) ?? 0;
		const rankB = this.rank.get(rootB) ?? 0;

		if (rankA < rankB) {
			this.parent.set(rootA, rootB);
		} else if (rankA > rankB) {
			this.parent.set(rootB, rootA);
		} else {
			this.parent.set(rootB, rootA);
			this.rank.set(rootA, rankA + 1);
		}
	}

	/** Get all connected components */
	getComponents(): Map<string, string[]> {
		const components = new Map<string, string[]>();
		for (const id of this.parent.keys()) {
			const root = this.find(id);
			const group = components.get(root) ?? [];
			group.push(id);
			components.set(root, group);
		}
		return components;
	}
}

/**
 * Derive family-control status for a company.
 *
 * @param companyId - The company applicant's ID
 * @param directors - All directors of this company (co-applicant + non-co-applicant)
 * @param relationships - All relationships from the relationship step
 * @returns FamilyControlResult with cluster analysis
 */
export function deriveCompanyFamilyControl(
	companyId: string,
	directors: DirectorInfo[],
	relationships: Relationship[]
): FamilyControlResult {
	// Default: not family-controlled (single director or no directors)
	const defaultResult: FamilyControlResult = {
		familyControlled: false,
		familyStakePercent: 0,
		familyDominance: 'LOW',
		familyClusterSize: directors.length > 0 ? 1 : 0,
		totalDirectors: directors.length,
		outsiderCount: directors.length > 0 ? directors.length - 1 : 0,
		familyClusterIds: directors.length > 0 ? [directors[0].id] : []
	};

	if (directors.length <= 1) {
		return defaultResult;
	}

	// Build set of director IDs for this company
	const directorIds = new Set(directors.map((d) => d.id));
	const directorMap = new Map(directors.map((d) => [d.id, d]));

	// Build union-find with all director IDs
	const uf = new UnionFind([...directorIds]);

	// Process relationships — union directors who are family-related
	for (const rel of relationships) {
		const fromIsDirector = directorIds.has(rel.fromId);
		const toIsDirector = directorIds.has(rel.toId);

		// Only care about relationships between directors of this company
		if (!fromIsDirector || !toIsDirector) continue;

		// Only family relations create family clusters
		if (FAMILY_RELATIONS.has(rel.relationType)) {
			uf.union(rel.fromId, rel.toId);
		}
	}

	// Find the largest connected component (family cluster)
	const components = uf.getComponents();
	let largestCluster: string[] = [];

	for (const [, members] of components) {
		if (members.length > largestCluster.length) {
			largestCluster = members;
		}
	}

	// Calculate metrics
	const familyStakePercent = largestCluster.reduce((sum, id) => {
		const d = directorMap.get(id);
		return sum + (d?.ownershipPercent ?? 0);
	}, 0);

	const familyRatio = largestCluster.length / directors.length;

	// Family-controlled = largest family cluster has >= 50% of directors
	const familyControlled = familyRatio >= 0.5 && largestCluster.length > 1;

	const dominance: FamilyControlResult['familyDominance'] =
		familyStakePercent >= 75 ? 'HIGH' : familyStakePercent >= 50 ? 'MEDIUM' : 'LOW';

	return {
		familyControlled,
		familyStakePercent,
		familyDominance: dominance,
		familyClusterSize: largestCluster.length,
		totalDirectors: directors.length,
		outsiderCount: directors.length - largestCluster.length,
		familyClusterIds: largestCluster
	};
}

/**
 * Derive family-control status for ALL companies in the application.
 * Returns a map of companyId → FamilyControlResult.
 */
export function deriveAllCompanyFamilyControl(
	applicants: Array<Record<string, any>>,
	relationships: Relationship[]
): Map<string, FamilyControlResult> {
	const results = new Map<string, FamilyControlResult>();

	const companies = applicants.filter((a) => a.applicantType === 'Company');

	for (const company of companies) {
		const companyId = company.id as string;
		const directors = (company.directors ?? []) as DirectorInfo[];

		if (directors.length > 0) {
			results.set(companyId, deriveCompanyFamilyControl(companyId, directors, relationships));
		}
	}

	return results;
}

// ============================================================================
// LOW-STAKE FAMILY OVERLAP DETECTION
// ============================================================================

/** Warning when family members individually below threshold but combined above */
export interface FamilyOverlapWarning {
	companyName: string;
	directors: Array<{ name: string; stake: number }>;
	combinedStake: number;
	message: string;
}

/** Stake threshold — individual below this, but combined may be above */
const INDIVIDUAL_STAKE_THRESHOLD = 20;

/**
 * Detect cases where two or more family members each hold <20% stake in a
 * company but their combined stake >= 20%. This affects lender classification
 * and should be flagged to the DSA.
 *
 * @param applicants - Full applicant list (includes companies with directors)
 * @param familyControlMap - Pre-computed family control results per company
 * @returns Array of warnings, one per company where overlap is detected
 */
export function detectLowStakeFamilyOverlap(
	applicants: Array<Record<string, any>>,
	familyControlMap: Map<string, FamilyControlResult>
): FamilyOverlapWarning[] {
	const warnings: FamilyOverlapWarning[] = [];

	for (const [companyId, familyResult] of familyControlMap) {
		// Only relevant if there's a family cluster with 2+ members
		if (familyResult.familyClusterSize < 2) continue;

		const company = applicants.find((a) => a.id === companyId);
		if (!company) continue;
		const companyName = (company.companyName as string) || 'Unknown Company';
		const directors = (company.directors ?? []) as DirectorInfo[];

		// Find family cluster members whose individual stake < threshold
		const lowStakeFamilyMembers: Array<{ name: string; stake: number }> = [];
		for (const dirId of familyResult.familyClusterIds) {
			const director = directors.find((d) => d.id === dirId);
			if (!director) continue;
			if (director.ownershipPercent < INDIVIDUAL_STAKE_THRESHOLD) {
				lowStakeFamilyMembers.push({
					name: director.fullName || 'Director',
					stake: director.ownershipPercent
				});
			}
		}

		// Need at least 2 low-stake family members
		if (lowStakeFamilyMembers.length < 2) continue;

		const combinedStake = lowStakeFamilyMembers.reduce((sum, d) => sum + d.stake, 0);

		// Only warn if combined stake crosses the threshold
		if (combinedStake >= INDIVIDUAL_STAKE_THRESHOLD) {
			const names = lowStakeFamilyMembers.map((d) => `${d.name} (${d.stake}%)`).join(', ');
			warnings.push({
				companyName,
				directors: lowStakeFamilyMembers,
				combinedStake,
				message: `${names} are family members in ${companyName}. Combined ${combinedStake}% stake may affect lender classification.`
			});
		}
	}

	return warnings;
}
