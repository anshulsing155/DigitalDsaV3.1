<script lang="ts">
	import type {
		Applicant,
		Relationship,
		RelationType,
		ForbiddenRelation,
		GraphStatus
	} from './types';

	import { getRelationshipCategory } from './categoryClassifier';
	import { getReciprocalRelation } from './reciprocalRelations';
	import { computeInferredRelationships } from './inferenceEngine';
	import { checkGraphConnectivity } from './graphConnectivity';
	import {
		userRelationships,
		addRelationship as addToStore,
		removeRelationship as removeFromStore,
		removeRelationshipsBatch
	} from './relationshipStore';
	import { findInvalidRelationships } from './relationshipValidator';
	import RelationshipForm from './RelationshipForm.svelte';
	import RelationshipList from './RelationshipList.svelte';
	import CompletionStatus from './CompletionStatus.svelte';
	import { untrack } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import { Users } from '$lib/utils/iconRegistry';

	interface Props {
		applicants: Applicant[];
		isNextEnabled: boolean;
		onComplete?: ((relationships: Relationship[]) => void) | null;
	}

	let { applicants, isNextEnabled = $bindable(false), onComplete = null }: Props = $props();

	// Local state
	let inferredRelationships: Relationship[] = $state([]);
	let forbiddenRelationships: ForbiddenRelation[] = $state([]);
	let graphStatus: GraphStatus = $state({
		isComplete: false,
		totalGroups: 0,
		groups: [],
		suggestions: [],
		completionPercentage: 0
	});

	/* ======================================================
	   STARTUP-TIME CLEANUP (covers restored / loaded cases)
	   The applicant-field handler in applicantFormManager only fires on
	   user edits. Cases that load with already-stale relationships
	   (e.g. data restored from a prior schema, applicant edited via a
	   different surface) need a one-time pass to remove logically
	   impossible relationships before they're rendered.
	====================================================== */
	let didStartupScan = false;
	$effect(() => {
		if (didStartupScan) return;
		if (applicants.length === 0) return;
		const rels = $userRelationships;
		if (rels.length === 0) {
			didStartupScan = true;
			return;
		}
		const invalidMap = findInvalidRelationships(applicants as any, rels);
		const hardIds = new Set<string>();
		for (const [relId, reason] of invalidMap) {
			// Retain ORPHANS (an endpoint is not in the applicants list right now).
			// On "Previous"/remount this scan can run while the applicants list is
			// still transiently rebuilding, so a perfectly valid relationship looks
			// orphaned for an instant — hard-deleting it here would lose the data
			// permanently (bug P10). Genuine applicant deletion removes its
			// relationships at the deletion site, so only hard-prune relationships
			// that are logically IMPOSSIBLE (gender mismatch / reversed-age).
			if (!reason.keepable && reason.check !== 'orphan') hardIds.add(relId);
		}
		if (hardIds.size > 0) {
			removeRelationshipsBatch(hardIds);
		}
		didStartupScan = true;
	});

	/* ======================================================
	   INFERENCE (USER → INFERRED)
	====================================================== */

	$effect(() => {
		if (applicants.length > 0) {
			const inferred = computeInferredRelationships(applicants, $userRelationships);

			inferredRelationships = inferred;
			forbiddenRelationships = []; // handled elsewhere if needed
		}
	});

	/* ======================================================
	   GRAPH CONNECTIVITY
	====================================================== */

	$effect(() => {
		if (applicants.length > 0) {
			const allRels = [...$userRelationships, ...inferredRelationships];
			graphStatus = checkGraphConnectivity(applicants, allRels);
		}
	});

	/* ======================================================
	   ADD RELATIONSHIP
	====================================================== */

	function handleAddRelationship(personA: Applicant, relation: RelationType, personB: Applicant) {
		const forwardRel: Relationship = {
			id: `user-${personA.id}-${personB.id}-${Date.now()}`,
			fromId: personA.id,
			toId: personB.id,
			relationType: relation,
			category: getRelationshipCategory(relation),
			source: 'user-defined',
			createdAt: new Date()
		};

		const reciprocalType = getReciprocalRelation(relation, personB.gender);

		addToStore(forwardRel);

		// Add reciprocal ONLY if valid
		if (reciprocalType) {
			const reciprocalRel: Relationship = {
				id: `user-${personB.id}-${personA.id}-${Date.now()}`,
				fromId: personB.id,
				toId: personA.id,
				relationType: reciprocalType,
				category: getRelationshipCategory(reciprocalType),
				source: 'user-defined',
				createdAt: new Date()
			};
			addToStore(reciprocalRel);
		}
	}

	/* ======================================================
	   DELETE RELATIONSHIP
	====================================================== */

	function handleDeleteRelationship(relationshipId: string) {
		const rel = $userRelationships.find((r) => r.id === relationshipId);
		if (!rel) return;

		const reciprocal = $userRelationships.find(
			(r) => r.fromId === rel.toId && r.toId === rel.fromId
		);

		removeFromStore(relationshipId);
		if (reciprocal) {
			removeFromStore(reciprocal.id);
		}
	}

	/* ======================================================
	   PERSIST + CONTINUE GATE
	   Persist to formState on EVERY change (Pitfall #25 — data must
	   persist immediately, never deferred to Next). Was previously gated on
	   `graphStatus.isComplete`, so partial relationships were never written
	   to formState. After Previous → Next the page remounted, the cleanup
	   effects below pruned the sessionStorage store, and the user lost
	   everything they had typed.
	   The Next-enable gate stays on `graphStatus.isComplete` — that part
	   was correct (Next should require a fully connected graph).
	====================================================== */

	$effect(() => {
		const rels = $userRelationships;
		// untrack applicationData to avoid read→write→re-run infinite loop
		const currentData = untrack(() => formState.applicationData);
		formState.replaceApplicationData({
			...currentData,
			relationData: structuredClone(rels)
		} as any);
	});

	$effect(() => {
		isNextEnabled = graphStatus.isComplete;
	});
</script>

<div class="relationship-page">
	<div class="page-header">
		<div class="header-icon">
			<Users class="h-5 w-5 shrink-0" />
		</div>
		<div class="header-text">
			<h1 class="font-titleBold text-sectionHeadingText !m-0 text-[var(--form-text-secondary)]">
				Family Relationships
			</h1>
			<p class="alertText text-[var(--form-text-label)]">
				Define how applicants are related to each other
			</p>
		</div>
	</div>

	<RelationshipForm
		{applicants}
		existingRelationships={[...$userRelationships, ...inferredRelationships]}
		{forbiddenRelationships}
		isComplete={graphStatus.isComplete}
		onAdd={handleAddRelationship}
	/>

	<RelationshipList
		{applicants}
		userRelationships={$userRelationships}
		{inferredRelationships}
		onDelete={handleDeleteRelationship}
	/>

	<CompletionStatus {graphStatus} {applicants} />
</div>

<style>
	.relationship-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 0.5rem;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 12px;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.25);
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	@media (max-width: 540px) {
		.relationship-page {
			gap: 1rem;
		}

		.page-header {
			padding: 0.875rem 1rem;
			border-radius: 10px;
		}

		.header-icon {
			width: 40px;
			height: 40px;
			border-radius: 10px;
		}
	}
</style>
