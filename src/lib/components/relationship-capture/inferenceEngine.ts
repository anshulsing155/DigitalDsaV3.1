import type { Applicant, Relationship, RelationType } from './types';
import { getRelationshipCategory } from './categoryClassifier';
import { getReciprocalRelation } from './reciprocalRelations';

type FamilyGraph = Map<string, Set<string>>;

type CanonicalRelation = 'PARENT' | 'SPOUSE';
type CanonicalRelationship = {
	fromId: string;
	toId: string;
	type: CanonicalRelation;
};

function buildFamilyGraph(rels: CanonicalRelationship[]): FamilyGraph {
	const graph: FamilyGraph = new Map();

	for (const r of rels) {
		if (r.type !== 'PARENT') continue;
		if (!graph.has(r.fromId)) graph.set(r.fromId, new Set());
		graph.get(r.fromId)!.add(r.toId);
	}

	return graph;
}

function buildSpouseMap(rels: CanonicalRelationship[]): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();

	for (const r of rels) {
		if (r.type !== 'SPOUSE') continue;
		if (!map.has(r.fromId)) map.set(r.fromId, new Set());
		map.get(r.fromId)!.add(r.toId);
	}

	return map;
}

function getAncestors(start: string, graph: FamilyGraph): Map<string, number> {
	const visited = new Map<string, number>();
	const queue: [string, number][] = [[start, 0]];

	while (queue.length) {
		const [node, dist] = queue.shift()!;
		if (visited.has(node)) continue;
		visited.set(node, dist);

		const parents = graph.get(node);
		if (parents) {
			for (const p of parents) queue.push([p, dist + 1]);
		}
	}

	return visited;
}

function findLCA(
	aId: string,
	bId: string,
	graph: FamilyGraph
): { distA: number; distB: number } | null {
	const aAnc = getAncestors(aId, graph);
	const bAnc = getAncestors(bId, graph);

	let best: { distA: number; distB: number } | null = null;

	for (const [id, distA] of aAnc) {
		const distB = bAnc.get(id);
		if (distB !== undefined) {
			if (!best || distA + distB < best.distA + best.distB) {
				best = { distA, distB };
			}
		}
	}

	return best;
}

/* ======================================================
   NORMALIZATION
====================================================== */

function normalizeRelationships(rels: Relationship[]): CanonicalRelationship[] {
	const out: CanonicalRelationship[] = [];

	for (const r of rels) {
		switch (r.relationType) {
			case 'Father of':
			case 'Mother of':
				out.push({ fromId: r.fromId, toId: r.toId, type: 'PARENT' });
				break;

			case 'Son of':
			case 'Daughter of':
				out.push({ fromId: r.toId, toId: r.fromId, type: 'PARENT' });
				break;

			case 'Husband of':
			case 'Wife of':
				out.push({ fromId: r.fromId, toId: r.toId, type: 'SPOUSE' });
				out.push({ fromId: r.toId, toId: r.fromId, type: 'SPOUSE' });
				break;
		}
	}

	return out;
}

/* ======================================================
   SAFE BLOOD INFERENCE (NO PARENTS)
====================================================== */

function mapBloodRelation(distA: number, distB: number, A: Applicant): RelationType | null {
	if (distA === 1 && distB === 1) {
		return A.gender === 'male' ? 'Brother of' : 'Sister of';
	}

	if (distA === 2 && distB === 2) {
		return 'Cousin of';
	}

	return null;
}

/* ======================================================
   SIBLING MAP + REVERSE PARENT MAP
====================================================== */

function buildSiblingMap(
	userRels: Relationship[],
	canonical: CanonicalRelationship[]
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();

	const addPair = (a: string, b: string) => {
		if (!map.has(a)) map.set(a, new Set());
		if (!map.has(b)) map.set(b, new Set());
		map.get(a)!.add(b);
		map.get(b)!.add(a);
	};

	// From user-defined sibling relations
	for (const r of userRels) {
		if (r.relationType === 'Brother of' || r.relationType === 'Sister of') {
			addPair(r.fromId, r.toId);
		}
	}

	// From shared parents in canonical
	const childrenByParent = new Map<string, string[]>();
	for (const r of canonical) {
		if (r.type === 'PARENT') {
			if (!childrenByParent.has(r.fromId)) childrenByParent.set(r.fromId, []);
			const arr = childrenByParent.get(r.fromId)!;
			if (!arr.includes(r.toId)) arr.push(r.toId);
		}
	}
	for (const children of childrenByParent.values()) {
		for (let i = 0; i < children.length; i++) {
			for (let j = i + 1; j < children.length; j++) {
				addPair(children[i], children[j]);
			}
		}
	}

	return map;
}

function buildReverseParentMap(graph: FamilyGraph): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const [parentId, children] of graph) {
		for (const childId of children) {
			if (!map.has(childId)) map.set(childId, []);
			map.get(childId)!.push(parentId);
		}
	}
	return map;
}

/* ======================================================
   EXTENDED FAMILY INFERENCE (Uncle/Aunt, Nephew/Niece)
====================================================== */

function inferExtendedFamilyRelation(
	A: Applicant,
	B: Applicant,
	siblingMap: Map<string, Set<string>>,
	reverseParentMap: Map<string, string[]>
): RelationType | null {
	const aSiblings = siblingMap.get(A.id);
	const bSiblings = siblingMap.get(B.id);

	// A is sibling of B's parent → A is Uncle/Aunt of B
	const bParents = reverseParentMap.get(B.id) ?? [];
	if (aSiblings) {
		for (const parentId of bParents) {
			if (aSiblings.has(parentId)) {
				return A.gender === 'male' ? 'Uncle of' : 'Aunt of';
			}
		}
	}

	// B is sibling of A's parent → A is Nephew/Niece of B
	const aParents = reverseParentMap.get(A.id) ?? [];
	if (bSiblings) {
		for (const parentId of aParents) {
			if (bSiblings.has(parentId)) {
				return A.gender === 'male' ? 'Nephew of' : 'Niece of';
			}
		}
	}

	return null;
}

/* ======================================================
   IN-LAW INFERENCE
====================================================== */

function inferInLawRelation(
	A: Applicant,
	B: Applicant,
	graph: FamilyGraph,
	spouseMap: Map<string, Set<string>>
): RelationType | null {
	const spouses = spouseMap.get(A.id);
	if (!spouses) return null;

	for (const spouseId of spouses) {
		const rel = findLCA(spouseId, B.id, graph);
		if (!rel) continue;

		// A's spouse is parent of B → A is ALSO parent of B
		if (rel.distA === 1 && rel.distB === 0) {
			return A.gender === 'male' ? 'Father of' : 'Mother of';
		}

		// B is parent of A's spouse → A is child-in-law of B
		if (rel.distA === 0 && rel.distB === 1) {
			return A.gender === 'male' ? 'Son-in-law of' : 'Daughter-in-law of';
		}

		// A's spouse and B share a parent (siblings) → A is in-law sibling of B
		if (rel.distA === 1 && rel.distB === 1) {
			return A.gender === 'male' ? 'Brother-in-law of' : 'Sister-in-law of';
		}
	}

	return null;
}

/* ======================================================
   SIBLING-IN-LAW INFERENCE
   A is sibling of X, B is spouse of X → A is in-law of B
====================================================== */

function inferSiblingInLawRelation(
	A: Applicant,
	B: Applicant,
	siblingMap: Map<string, Set<string>>,
	spouseMap: Map<string, Set<string>>
): RelationType | null {
	const aSiblings = siblingMap.get(A.id);
	if (!aSiblings) return null;

	for (const siblingId of aSiblings) {
		const spouses = spouseMap.get(siblingId);
		if (spouses && spouses.has(B.id)) {
			return A.gender === 'male' ? 'Brother-in-law of' : 'Sister-in-law of';
		}
	}

	return null;
}

/* ======================================================
   UTIL
====================================================== */

function relationExists(
	fromId: string,
	toId: string,
	relationType: RelationType,
	rels: Relationship[]
): boolean {
	return rels.some(
		(r) => r.fromId === fromId && r.toId === toId && r.relationType === relationType
	);
}

/* ======================================================
   MAIN ENTRY
====================================================== */

export function computeInferredRelationships(
	applicants: Applicant[],
	userRelationships: Relationship[]
): Relationship[] {
	const inferred: Relationship[] = [];

	/* --------------------------------------------------
	   1. Normalize user relationships
	-------------------------------------------------- */
	let canonical = normalizeRelationships(userRelationships);

	/* --------------------------------------------------
	   2. SPOUSE PATTERN RULES (RUN FIRST, ONCE)
	   These functions work on Relationship[] (user relationships),
	   then we normalize the results to add to canonical
	-------------------------------------------------- */
	const spouseFromSharedChild = inferSpouseFromSharedChild(userRelationships);
	const spouseFromSharedInLaw = inferSpouseFromSharedInLaw(userRelationships);
	const spouseFromDIL = inferSpouseFromSharedDaughterInLaw(userRelationships, applicants);

	// Normalize the inferred spouse relationships and add to canonical
	const inferredSpouses = [...spouseFromSharedChild, ...spouseFromSharedInLaw, ...spouseFromDIL];
	canonical = canonical.concat(normalizeRelationships(inferredSpouses));

	/* --------------------------------------------------
	   3. Build graph AFTER spouse inference
	-------------------------------------------------- */
	const graph = buildFamilyGraph(canonical);
	const spouseMap = buildSpouseMap(canonical);
	const siblingMap = buildSiblingMap(userRelationships, canonical);
	const reverseParentMap = buildReverseParentMap(graph);

	/* --------------------------------------------------
	   4. Include spouse inferences in the result
	   (they were used for graph building above but must
	   also appear in the returned inferred list)
	-------------------------------------------------- */
	for (const rel of inferredSpouses) {
		if (
			!relationExists(rel.fromId, rel.toId, rel.relationType, userRelationships) &&
			!relationExists(rel.fromId, rel.toId, rel.relationType, inferred)
		) {
			inferred.push(rel);
		}
	}

	/* --------------------------------------------------
	   5. Pairwise inference (blood + in-law/parent)
	-------------------------------------------------- */
	for (const A of applicants) {
		for (const B of applicants) {
			if (A.id === B.id) continue;

			let relation: RelationType | null = null;

			/* ---------- BLOOD (STRICT) ---------- */
			const lca = findLCA(A.id, B.id, graph);
			if (lca && isValidBloodRelation(A.id, B.id, lca, canonical)) {
				relation = mapBloodRelation(lca.distA, lca.distB, A);
			}

			/* ---------- IN-LAW / SPOUSE-PARENT ---------- */
			if (!relation) {
				relation = inferInLawRelation(A, B, graph, spouseMap);
			}

			/* ---------- SIBLING IN-LAW (Brother/Sister + Spouse → In-law) ---------- */
			if (!relation) {
				relation = inferSiblingInLawRelation(A, B, siblingMap, spouseMap);
			}

			/* ---------- EXTENDED FAMILY (Uncle/Aunt, Nephew/Niece) ---------- */
			if (!relation) {
				relation = inferExtendedFamilyRelation(A, B, siblingMap, reverseParentMap);
			}

			if (!relation) continue;

			if (
				relationExists(A.id, B.id, relation, userRelationships) ||
				relationExists(A.id, B.id, relation, inferred)
			)
				continue;

			inferred.push(makeInferred(A.id, B.id, relation));
		}
	}

	/* --------------------------------------------------
	   6. Generate reciprocals for ALL inferred relations
	   e.g. Ramesh→"Husband of"→Sita also produces
	        Sita→"Wife of"→Ramesh
	-------------------------------------------------- */
	const allInferred = [...inferred];
	const reciprocals: Relationship[] = [];
	for (const rel of allInferred) {
		const reciprocalSubject = applicants.find((a) => a.id === rel.toId);
		const reciprocalType = getReciprocalRelation(rel.relationType, reciprocalSubject?.gender);
		if (!reciprocalType) continue;

		if (
			relationExists(rel.toId, rel.fromId, reciprocalType, userRelationships) ||
			relationExists(rel.toId, rel.fromId, reciprocalType, allInferred) ||
			relationExists(rel.toId, rel.fromId, reciprocalType, reciprocals)
		)
			continue;

		reciprocals.push(makeInferred(rel.toId, rel.fromId, reciprocalType));
	}

	return [...allInferred, ...reciprocals];
}

/* ======================================================
   RULE 1: SPOUSE FROM SHARED CHILD
====================================================== */

function inferSpouseFromSharedChild(rels: Relationship[]): Relationship[] {
	const inferred: Relationship[] = [];
	const parentsByChild = new Map<string, { father?: string; mother?: string }>();

	for (const r of rels) {
		if (r.relationType === 'Father of' || r.relationType === 'Mother of') {
			const entry = parentsByChild.get(r.toId) ?? {};
			if (r.relationType === 'Father of') entry.father = r.fromId;
			if (r.relationType === 'Mother of') entry.mother = r.fromId;
			parentsByChild.set(r.toId, entry);
		}
	}

	for (const parents of parentsByChild.values()) {
		if (!parents.father || !parents.mother) continue;
		if (hasSpouseRelation(parents.father, parents.mother, rels)) continue;

		inferred.push(makeInferred(parents.father, parents.mother, 'Husband of'));
	}

	return inferred;
}

/* ======================================================
   RULE 2: SPOUSE FROM SHARED IN-LAW
====================================================== */

function inferSpouseFromSharedInLaw(rels: Relationship[]): Relationship[] {
	const inferred: Relationship[] = [];
	const inLawsByPerson = new Map<string, { father?: string; mother?: string }>();

	for (const r of rels) {
		if (r.relationType === 'Father-in-law of' || r.relationType === 'Mother-in-law of') {
			const entry = inLawsByPerson.get(r.toId) ?? {};
			if (r.relationType === 'Father-in-law of') entry.father = r.fromId;
			if (r.relationType === 'Mother-in-law of') entry.mother = r.fromId;
			inLawsByPerson.set(r.toId, entry);
		}
	}

	for (const parents of inLawsByPerson.values()) {
		if (!parents.father || !parents.mother) continue;
		if (hasSpouseRelation(parents.father, parents.mother, rels)) continue;

		inferred.push(makeInferred(parents.father, parents.mother, 'Husband of'));
	}

	return inferred;
}

/* ======================================================
   BLOOD VALIDATION FIX (CRITICAL)
====================================================== */

/**
 * Get parents from canonical relationships (PARENT type only)
 */
function getCanonicalParents(personId: string, rels: CanonicalRelationship[]): string[] {
	return rels.filter((r) => r.toId === personId && r.type === 'PARENT').map((r) => r.fromId);
}

function isValidBloodRelation(
	aId: string,
	bId: string,
	lca: { distA: number; distB: number },
	rels: CanonicalRelationship[]
): boolean {
	// Block parents being inferred as siblings (shared child case)
	if (lca.distA === 1 && lca.distB === 1) {
		const parentsOfA = getCanonicalParents(aId, rels);
		const parentsOfB = getCanonicalParents(bId, rels);

		return parentsOfA.some((p) => parentsOfB.includes(p));
	}
	return true;
}

/* ======================================================
   HELPERS (UNCHANGED CONTRACTS)
====================================================== */

function makeInferred(fromId: string, toId: string, relation: RelationType): Relationship {
	return {
		id: `inf-${fromId}-${toId}-${relation}`,
		fromId,
		toId,
		relationType: relation,
		category: getRelationshipCategory(relation),
		source: 'inferred',
		createdAt: new Date()
	};
}

function hasSpouseRelation(a: string, b: string, rels: Relationship[]): boolean {
	return rels.some(
		(r) =>
			((r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a)) &&
			(r.relationType === 'Husband of' || r.relationType === 'Wife of')
	);
}

function getParents(personId: string, rels: Relationship[]): string[] {
	return rels
		.filter(
			(r) =>
				r.toId === personId && (r.relationType === 'Father of' || r.relationType === 'Mother of')
		)
		.map((r) => r.fromId);
}

function inferSpouseFromSharedDaughterInLaw(
	rels: Relationship[],
	applicants: Applicant[]
): Relationship[] {
	const inferred: Relationship[] = [];

	// A -> [X, Y]
	const dilsByPerson = new Map<string, string[]>();

	for (const r of rels) {
		if (r.relationType === 'Daughter-in-law of') {
			const list = dilsByPerson.get(r.fromId) ?? [];
			list.push(r.toId);
			dilsByPerson.set(r.fromId, list);
		}
	}

	for (const [AId, parents] of dilsByPerson.entries()) {
		if (parents.length < 2) continue;

		// find spouse B of A
		const spouseRel = rels.find(
			(r) =>
				(r.relationType === 'Husband of' || r.relationType === 'Wife of') &&
				(r.fromId === AId || r.toId === AId)
		);
		if (!spouseRel) continue;

		const BId = spouseRel.fromId === AId ? spouseRel.toId : spouseRel.fromId;

		// B must be child of both parents (one Father, one Mother)
		const validParents = parents.filter((parentId) =>
			rels.some(
				(r) =>
					r.fromId === parentId &&
					r.toId === BId &&
					(r.relationType === 'Father of' || r.relationType === 'Mother of')
			)
		);

		if (validParents.length < 2) continue;

		const [X, Y] = validParents;

		// prevent duplicate spouse inference
		if (
			rels.some(
				(r) =>
					((r.fromId === X && r.toId === Y) || (r.fromId === Y && r.toId === X)) &&
					(r.relationType === 'Husband of' || r.relationType === 'Wife of')
			)
		) {
			continue;
		}

		const XApp = applicants.find((a) => a.id === X);
		const YApp = applicants.find((a) => a.id === Y);
		if (!XApp || !YApp) continue;

		if (XApp.gender === 'male') {
			inferred.push(makeInferred(X, Y, 'Husband of'));
		} else {
			inferred.push(makeInferred(Y, X, 'Husband of'));
		}
	}

	return inferred;
}
