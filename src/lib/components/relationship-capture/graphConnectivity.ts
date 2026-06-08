/**
 * Graph Connectivity Checker
 * Ensures all applicants form a single connected group
 */

import type {
	Applicant,
	Relationship,
	ConnectedGroup,
	GraphStatus,
	ConnectionSuggestion
} from './types';
import { getValidRelations } from './relationshipValidator';

/**
 * Check if the relationship graph is fully connected
 */
export function checkGraphConnectivity(
	applicants: Applicant[],
	relationships: Relationship[]
): GraphStatus {
	if (applicants.length === 0) {
		return {
			isComplete: false,
			totalGroups: 0,
			groups: [],
			suggestions: [],
			completionPercentage: 0
		};
	}

	if (applicants.length === 1) {
		return {
			isComplete: true,
			totalGroups: 1,
			groups: [
				{
					id: 'group-1',
					applicantIds: [applicants[0].id],
					size: 1
				}
			],
			suggestions: [],
			completionPercentage: 100
		};
	}

	// Build adjacency list
	const graph = buildAdjacencyList(applicants, relationships);

	// Find connected components
	const groups = findConnectedGroups(applicants, graph);

	// Calculate completion based on actual connectivity, not raw edge count.
	// With N applicants we start with N groups; each bridge merge reduces by 1.
	// Fully connected = 1 group, so progress = (N - groups) / (N - 1).
	const isComplete = groups.length === 1;
	const n = applicants.length;
	const completionPercentage = n <= 1 ? 100 : Math.round(((n - groups.length) / (n - 1)) * 100);

	// Generate suggestions if not complete
	const suggestions = isComplete ? [] : generateConnectionSuggestions(groups, applicants);

	return {
		isComplete,
		totalGroups: groups.length,
		groups,
		suggestions,
		completionPercentage
	};
}

/**
 * Build adjacency list from relationships
 */
function buildAdjacencyList(
	applicants: Applicant[],
	relationships: Relationship[]
): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>();

	// Initialize with all applicants
	applicants.forEach((app) => {
		graph.set(app.id, new Set());
	});

	// Add edges (undirected graph)
	relationships.forEach((rel) => {
		graph.get(rel.fromId)?.add(rel.toId);
		graph.get(rel.toId)?.add(rel.fromId);
	});

	return graph;
}

/**
 * Find all connected components using DFS
 */
function findConnectedGroups(
	applicants: Applicant[],
	graph: Map<string, Set<string>>
): ConnectedGroup[] {
	const visited = new Set<string>();
	const groups: ConnectedGroup[] = [];

	applicants.forEach((applicant) => {
		if (!visited.has(applicant.id)) {
			const group: string[] = [];
			dfs(applicant.id, graph, visited, group);

			groups.push({
				id: `group-${groups.length + 1}`,
				applicantIds: group,
				size: group.length
			});
		}
	});

	return groups.sort((a, b) => b.size - a.size); // Sort by size, largest first
}

/**
 * Depth-first search to find connected nodes
 */
function dfs(
	nodeId: string,
	graph: Map<string, Set<string>>,
	visited: Set<string>,
	group: string[]
): void {
	visited.add(nodeId);
	group.push(nodeId);

	const neighbors = graph.get(nodeId) || new Set();
	neighbors.forEach((neighborId) => {
		if (!visited.has(neighborId)) {
			dfs(neighborId, graph, visited, group);
		}
	});
}

function formatLabel(p: Applicant): string {
	const name = p.fullName || p.name || 'Unknown';
	const parts: string[] = [];
	if (p.age || p.age) parts.push(String(p.age || p.age));
	if (p.gender) parts.push(p.gender === 'male' ? 'M' : 'F');
	return parts.length > 0 ? `${name} (${parts.join(', ')})` : name;
}

function findBestSuggestion(
	g1: ConnectedGroup,
	g2: ConnectedGroup,
	applicants: Applicant[]
): ConnectionSuggestion | null {
	let familySuggestion: ConnectionSuggestion | null = null;
	let fallback: ConnectionSuggestion | null = null;

	for (const id1 of g1.applicantIds) {
		for (const id2 of g2.applicantIds) {
			const a = applicants.find((x) => x.id === id1);
			const b = applicants.find((x) => x.id === id2);
			if (!a || !b) continue;

			const validRels = getValidRelations(a as any, b as any, []);
			if (validRels.length === 0) continue;

			const aLabel = formatLabel(a);
			const bLabel = formatLabel(b);

			const familyRel = validRels.find(
				(r) => !r.toLowerCase().includes('friend') && !r.toLowerCase().includes('business')
			);

			if (familyRel && !familySuggestion) {
				familySuggestion = {
					fromId: id1,
					toId: id2,
					suggestedRelationType: familyRel,
					explanation: `${aLabel} could be "${familyRel}" ${bLabel}`
				};
			}
			if (!fallback) {
				fallback = {
					fromId: id1,
					toId: id2,
					suggestedRelationType: validRels[0],
					explanation: `Connect ${aLabel} with ${bLabel}`
				};
			}
			if (familySuggestion) break;
		}
		if (familySuggestion) break;
	}
	return familySuggestion || fallback;
}

/**
 * Generate suggestions for connecting disconnected groups
 */
export function generateConnectionSuggestions(
	groups: ConnectedGroup[],
	applicants: Applicant[]
): ConnectionSuggestion[] {
	if (groups.length <= 1) return [];
	const suggestions: ConnectionSuggestion[] = [];

	// Generate one suggestion per adjacent group pair
	for (let i = 0; i < groups.length - 1; i++) {
		const suggestion = findBestSuggestion(groups[i], groups[i + 1], applicants);
		if (suggestion) suggestions.push(suggestion);
	}
	return suggestions;
}

/**
 * Check if a specific applicant is isolated (no relationships)
 */
export function isApplicantIsolated(applicantId: string, relationships: Relationship[]): boolean {
	return !relationships.some((rel) => rel.fromId === applicantId || rel.toId === applicantId);
}

/**
 * Get all applicants connected to a specific applicant
 */
export function getConnectedApplicants(
	applicantId: string,
	relationships: Relationship[]
): string[] {
	const connected = new Set<string>();

	relationships.forEach((rel) => {
		if (rel.fromId === applicantId) {
			connected.add(rel.toId);
		}
		if (rel.toId === applicantId) {
			connected.add(rel.fromId);
		}
	});

	return Array.from(connected);
}

/**
 * Calculate minimum relationships needed for full connectivity
 */
export function getMinimumRelationshipsNeeded(applicantCount: number): number {
	// Minimum edges for a connected graph = n - 1
	return Math.max(0, applicantCount - 1);
}

/**
 * Check if adding a relationship will help connectivity
 */
export function willImproveConnectivity(
	fromId: string,
	toId: string,
	currentGroups: ConnectedGroup[]
): boolean {
	// Check if fromId and toId are in different groups
	const fromGroup = currentGroups.find((g) => g.applicantIds.includes(fromId));
	const toGroup = currentGroups.find((g) => g.applicantIds.includes(toId));

	return fromGroup?.id !== toGroup?.id;
}

export function createsCycle(
	fromId: string,
	toId: string,
	graph: Map<string, Set<string>>
): boolean {
	if (fromId === toId) return true;

	const visited = new Set<string>();
	const stack = [toId];

	while (stack.length) {
		const current = stack.pop()!;
		if (current === fromId) return true;
		if (visited.has(current)) continue;
		visited.add(current);

		const children = graph.get(current);
		if (children) stack.push(...children);
	}
	return false;
}
