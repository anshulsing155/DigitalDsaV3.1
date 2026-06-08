/**
 * Relationship Store
 * Central reactive store for managing relationships
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { sessionPersisted } from '$lib/stores/_bridge.svelte';
import type { Relationship, RelationshipStats, ForbiddenRelation, GraphStatus } from './types';
import { computeInferredRelationships } from './inferenceEngine';
import { checkGraphConnectivity } from './graphConnectivity';
import { getCategoryDisplayName, getRelationshipCategory } from './categoryClassifier';

// ============================================================================
// BASE STORES
// ============================================================================

/**
 * User-defined relationships (source of truth)
 */
export const userRelationships = sessionPersisted<Relationship[]>('home-user-relationships', []);
export const userReciprocalRelationships = sessionPersisted<Relationship[]>(
	'home-user-reciprocal-relationships',
	[]
);
/**
 * Import applicants store from parent context
 * This assumes $applicantsStore exists in your app
 */
// We'll reference it directly in components using $applicantsStore

// ============================================================================
// DERIVED STORES (REACTIVE)
// ============================================================================

/**
 * Inferred relationships (computed reactively from user relationships)
 */
export const inferredRelationships: Readable<Relationship[]> = derived(
	[userRelationships],
	([$userRels], set) => {
		// We need applicants, but we'll handle that in the component level
		// For now, return empty and compute in component
		set([]);
	}
);

/**
 * Forbidden relationships (computed reactively)
 */
export const forbiddenRelationships: Readable<ForbiddenRelation[]> = derived(
	[userRelationships],
	([$userRels], set) => {
		// Will be computed with applicants in component
		set([]);
	}
);

/**
 * All relationships (user-defined + inferred)
 */
export const allRelationships: Readable<Relationship[]> = derived(
	[userRelationships, inferredRelationships],
	([$userRels, $inferredRels]) => {
		return [...$userRels, ...$inferredRels];
	}
);

/**
 * Relationships grouped by category
 */
export const relationshipsByCategory: Readable<Record<string, Relationship[]>> = derived(
	[allRelationships],
	([$allRels]) => {
		const grouped: Record<string, Relationship[]> = {
			direct_family: [],
			grandparent_family: [],
			in_law_family: [],
			extended_family: [],
			non_family: []
		};

		$allRels.forEach((rel) => {
			grouped[rel.category]?.push(rel);
		});

		return grouped;
	}
);

/**
 * Relationship statistics
 */
export const relationshipStats: Readable<RelationshipStats> = derived(
	[userRelationships, inferredRelationships, allRelationships],
	([$userRels, $inferredRels, $allRels]) => {
		const stats: RelationshipStats = {
			totalRelationships: $allRels.length,
			userDefinedCount: $userRels.length,
			inferredCount: $inferredRels.length,

			// By category
			directFamilyCount: 0,
			grandparentFamilyCount: 0,
			inLawFamilyCount: 0,
			extendedFamilyCount: 0,
			nonFamilyCount: 0,

			// By role (will be computed in component with applicant data)
			bothCount: 0,
			repaymentOnlyCount: 0,
			propertyOnlyCount: 0,

			// Graph status (will be computed in component)
			isFullyConnected: false,
			groupCount: 0
		};

		// Count by category
		$allRels.forEach((rel) => {
			switch (rel.category) {
				case 'direct_family':
					stats.directFamilyCount++;
					break;
				case 'grandparent_family':
					stats.grandparentFamilyCount++;
					break;
				case 'in_law_family':
					stats.inLawFamilyCount++;
					break;
				case 'extended_family':
					stats.extendedFamilyCount++;
					break;
				case 'non_family':
					stats.nonFamilyCount++;
					break;
			}
		});

		return stats;
	}
);

// ============================================================================
// STORE ACTIONS
// ============================================================================

/**
 * Add a new relationship
 */
export function addRelationship(relationship: Relationship): void {
	userRelationships.update((rels) => [...rels, relationship]);
	// userReciprocalRelationships.update((rels) => [...rels, relationship]);
}

export function ReciprocalRelationship(relationship: Relationship): void {
	// userRelationships.update((rels) => [...rels, relationship]);
	userReciprocalRelationships.update((rels) => [...rels, relationship]);
}

/**
 * Remove a relationship
 */
export function removeRelationship(relationshipId: string): void {
	userRelationships.update((rels) => rels.filter((r) => r.id !== relationshipId));
}

/**
 * Remove multiple relationships in a single store update (avoids N individual updates).
 */
export function removeRelationshipsBatch(ids: Set<string>): void {
	userRelationships.update((rels) => rels.filter((r) => !ids.has(r.id)));
}

/**
 * Clear all relationships
 */
export function clearAllRelationships(): void {
	userRelationships.set([]);
	userReciprocalRelationships.set([]);
}

/**
 * Get a relationship by ID
 */
export function getRelationshipById(id: string): Relationship | undefined {
	const allRels = get(allRelationships);
	return allRels.find((r) => r.id === id);
}

/**
 * Check if two applicants have a relationship
 */
export function hasRelationshipBetween(applicantId1: string, applicantId2: string): boolean {
	const allRels = get(allRelationships);
	return allRels.some(
		(rel) =>
			(rel.fromId === applicantId1 && rel.toId === applicantId2) ||
			(rel.fromId === applicantId2 && rel.toId === applicantId1)
	);
}

/**
 * Get all relationships for a specific applicant
 */
export function getRelationshipsForApplicant(applicantId: string): Relationship[] {
	const allRels = get(allRelationships);
	return allRels.filter((rel) => rel.fromId === applicantId || rel.toId === applicantId);
}

/**
 * Get count of user-defined relationships
 */
export function getUserRelationshipCount(): number {
	return get(userRelationships).length;
}

/**
 * Get count of inferred relationships
 */
export function getInferredRelationshipCount(): number {
	return get(inferredRelationships).length;
}
