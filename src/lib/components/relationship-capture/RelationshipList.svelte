<script lang="ts">
	import type { Applicant, Relationship } from './types';
	import { getCategoryDisplayName } from './categoryClassifier';
	import { getRelationshipArrow, formatRelationshipDisplay } from './reciprocalRelations';
	import { Trash, Trash2, X } from '$lib/utils/iconRegistry';

	interface Props {
		applicants?: Applicant[];
		userRelationships?: Relationship[];
		inferredRelationships?: Relationship[];
		onDelete: (relationshipId: string) => void;
	}

	let {
		applicants = [],
		userRelationships = [],
		inferredRelationships = [],
		onDelete
	}: Props = $props();

	function getApplicantName(id: string): string {
		const fullName = applicants.find((a) => a.id === id)?.fullName || 'Unknown';

		return fullName.trim().split(/\s+/)[0];
	}

	let groupedUserRelationships = $derived(
		(() => {
			const groups: Record<string, Relationship[]> = {
				direct_family: [],
				grandparent_family: [],
				in_law_family: [],
				extended_family: [],
				non_family: []
			};

			userRelationships.forEach((rel) => {
				if (groups[rel.category]) {
					groups[rel.category].push(rel);
				}
			});

			return groups;
		})()
	);

	// Only categories that actually have USER relationships
	let activeCategories = $derived(
		Object.entries(groupedUserRelationships).filter(([_, rels]) => rels.length > 0)
	);

	function shouldDisplayInferred(rel: Relationship, all: Relationship[]): boolean {
		const hasReverse = all.some(
			(r) =>
				r.id !== rel.id && r.fromId === rel.toId && r.toId === rel.fromId && r.source === 'inferred'
		);

		return !hasReverse || rel.fromId < rel.toId;
	}

	function shouldDisplay(rel: Relationship, all: Relationship[]): boolean {
		const hasReverse = all.some(
			(r) => r.id !== rel.id && r.fromId === rel.toId && r.toId === rel.fromId
		);

		// If no reciprocal → always show
		if (!hasReverse) return true;

		// If reciprocal exists → show only one deterministically
		return rel.fromId < rel.toId;
	}

	let visibleInferredRelationships = $derived(
		inferredRelationships.filter((rel) => shouldDisplayInferred(rel, inferredRelationships))
	);
</script>

<div class="relationship-list-section">
	{#if activeCategories.length === 0}
		<div class="empty-state">
			<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			<p class="text-labelText text-[var(--form-text-secondary)]">No relationships defined yet</p>
			<p class="alertText text-[var(--form-text-label)]">Use the form above to add relationships between applicants</p>
		</div>
	{:else}
		<div class="relationships-container">
			{#each activeCategories as [category, rels] (category)}
				<div class="category-group">
					<h3 class="category-title">{getCategoryDisplayName(category as any)}</h3>

					<div class="relationships-list">
						{#each rels as rel (rel.id ?? `${rel.fromId}-${rel.toId}-${rel.relationType}`)}
							{#if shouldDisplay(rel, rels)}
								<div class="relationship-row">
									<div class="relationship-content">
										<span class="person-name ">{getApplicantName(rel.fromId)}</span>
										<span class="relation-arrow">{getRelationshipArrow()}</span>
										<span class="relation-type">{formatRelationshipDisplay(rel)}</span>
										<span class="person-name">{getApplicantName(rel.toId)}</span>
									</div>
									<div class="relationship-meta">
										<span class="source-tag">{rel.source}</span>
										<button
											type="button"
											onclick={() => onDelete(rel.id)}
											class="delete-button"
											aria-label="Delete relationship"
										>
											<Trash2 size="18" />
										</button>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}

			<!-- Inferred relationships -->
			{#if visibleInferredRelationships.length > 0}
				<div class="category-group inferred">
					<h3 class="category-title">System-Inferred</h3>
					<div class="relationships-list">
						{#each visibleInferredRelationships as rel (rel.id ?? `${rel.fromId}-${rel.toId}-${rel.relationType}`)}
							<div class="relationship-row inferred">
								<div class="relationship-content">
									<span class="person-name">{getApplicantName(rel.fromId)}</span>
									<span class="relation-arrow">{getRelationshipArrow()}</span>
									<span class="relation-type">{formatRelationshipDisplay(rel)}</span>
									<span class="person-name">{getApplicantName(rel.toId)}</span>
								</div>
								<span class="source-tag inferred">inferred</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.relationship-list-section {
		margin-bottom: 0;
	}

	.empty-state {
		text-align: center;
		padding: 2.5rem 1.5rem;
		background: var(--form-bg-card);
		border: 1px dashed var(--form-border);
		border-radius: 12px;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		color: var(--form-text-muted);
	}

	.relationships-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-group {
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		box-shadow: 0 2px 8px rgba(43, 45, 66, 0.04);
	}

	.category-group.inferred {
		background: var(--form-bg-alt);
		border-style: dashed;
		border-color: var(--form-border);
	}

	.category-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.75rem;
		color: var(--form-text-muted);
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--form-border);
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.relationships-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.relationship-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--card-bg-card);
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	/* .relationship-row:hover {
		background: var(--form-bg);
	} */

	.relationship-row.inferred {
		background: var(--form-bg-card);
		border: 1px dashed var(--form-border);
	}

	.relationship-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.person-name {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--form-text-secondary);
	}

	.relation-arrow {
		color: var(--form-text-muted);
		font-size: 0.8125rem;
	}

	.relation-type {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.6875rem;
		color: #ffffff;
		padding: 0.25rem 0.625rem;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 100px;
		box-shadow: 0 2px 6px rgba(203, 153, 126, 0.25);
	}

	.relationship-meta {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.source-tag {
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.5625rem;
		color: var(--form-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.5rem;
		background: var(--form-border);
		border-radius: 100px;
	}

	.source-tag.inferred {
		color: var(--form-text-muted);
		background: var(--form-bg-alt);
		font-style: italic;
	}

	.delete-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		color: var(--form-text-muted);
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.delete-button:hover {
		background: rgba(221, 190, 169, 0.1);
		color: var(--ddsa-accent-500);
	}

	@media (max-width: 540px) {
		.category-group {
			padding: 0.875rem 1rem;
			border-radius: 10px;
		}

		.category-title {
			font-size: 0.6875rem;
			margin-bottom: 0.625rem;
			padding-bottom: 0.375rem;
		}

		.relationships-list {
			gap: 0.375rem;
		}

		.relationship-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.625rem;
			padding: 0.75rem;
			border-radius: 8px;
		}

		.relationship-content {
			gap: 0.375rem;
		}

		.relationship-meta {
			width: 100%;
			justify-content: space-between;
		}

		.person-name {
			font-size: 0.8125rem;
		}

		.relation-type {
			font-size: 0.625rem;
			padding: 0.1875rem 0.5rem;
		}

		.delete-button {
			width: 28px;
			height: 28px;
		}

		.empty-state {
			padding: 2rem 1rem;
			border-radius: 10px;
		}

		.empty-icon {
			width: 40px;
			height: 40px;
		}
	}
</style>
