<script lang="ts">
	/**
	 * ContradictionWarningModal
	 * Shows a warning when Step 0 changes conflict with data in later steps.
	 *
	 * Three action modes:
	 * - "Go Back" → stay on Step 0, no changes
	 * - "Keep & Continue" → remove hard contradictions, keep soft ones (shown only when keepable items exist)
	 * - "Remove All" → remove everything (original behavior)
	 */
	import Modal from '$lib/components/Modal.svelte';
	import { AlertTriangle } from '$lib/utils/iconRegistry';
	import type { Contradiction } from '$lib/utils/crossStepValidator';

	interface Props {
		open: boolean;
		contradictions: Contradiction[];
		onProceed: () => void;
		onKeep?: (keptRelationshipIds: Set<string>) => void;
		onGoBack: () => void;
	}

	let { open = $bindable(), contradictions, onProceed, onKeep, onGoBack }: Props = $props();

	// Split contradictions into hard (must remove) and soft (can keep)
	const hardItems = $derived(
		contradictions.filter((c) => !c.keepable && c.category !== 'completion_stale')
	);
	const softItems = $derived(contradictions.filter((c) => c.keepable));
	const hasKeepableItems = $derived(softItems.length > 0 && !!onKeep);

	// Group contradictions by applicant name
	const grouped = $derived.by(() => {
		const map = new Map<string, Contradiction[]>();
		for (const c of contradictions) {
			if (c.category === 'completion_stale') continue;
			const key = c.applicantName;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(c);
		}
		return map;
	});

	const totalAffected = $derived(hardItems.length + softItems.length);

	function handleKeep() {
		if (!onKeep) return;
		// Collect all keepable relationship IDs
		const keptIds = new Set<string>();
		for (const c of softItems) {
			if (c.detail.relationshipId) {
				keptIds.add(c.detail.relationshipId);
			}
		}
		onKeep(keptIds);
	}
</script>

<Modal bind:showModal={open}>
	<div class="contradiction-modal">
		<!-- Header -->
		<div class="contradiction-header">
			<div class="contradiction-icon">
				<AlertTriangle class="h-6 w-6 text-amber-500" />
			</div>
			<div>
				<h3 class="text-base font-semibold text-[var(--form-text)]">
					Changes Affect Existing Data
				</h3>
				<p class="mt-1 text-sm text-[var(--form-text-muted)]">
					Your changes conflict with data entered in later steps.
					{#if totalAffected > 0}
						{#if hasKeepableItems && hardItems.length === 0}
							You can choose to keep these relationships or remove them.
						{:else if hasKeepableItems}
							{hardItems.length} item{hardItems.length > 1 ? 's' : ''} must be removed.
							{softItems.length} can be kept.
						{:else}
							If you proceed, {totalAffected} item{totalAffected > 1 ? 's' : ''} will be removed.
						{/if}
					{/if}
				</p>
			</div>
		</div>

		<!-- Contradiction list grouped by applicant -->
		<div class="contradiction-list">
			{#each [...grouped] as [applicantName, items]}
				<div class="contradiction-group">
					<p class="contradiction-group-name">{applicantName}</p>
					{#each items as item}
						<div
							class="contradiction-item"
							class:contradiction-hard={!item.keepable}
							class:contradiction-soft={item.keepable}
						>
							<div class="contradiction-item-header">
								<p class="contradiction-message">{item.message}</p>
								{#if hasKeepableItems}
									<span
										class="contradiction-badge"
										class:badge-hard={!item.keepable}
										class:badge-soft={item.keepable}
									>
										{item.keepable ? 'Can be kept' : 'Must remove'}
									</span>
								{/if}
							</div>
							<p class="contradiction-affected">→ {item.affectedData}</p>
						</div>
					{/each}
				</div>
			{/each}
		</div>

		<!-- Actions -->
		<div class="contradiction-actions">
			<button class="contradiction-btn-back" onclick={onGoBack}> Go Back </button>
			{#if hasKeepableItems}
				<button class="contradiction-btn-keep" onclick={handleKeep}> Keep & Continue </button>
			{/if}
			<button class="contradiction-btn-proceed" onclick={onProceed}>
				{hasKeepableItems ? 'Remove All' : 'Proceed & Remove'}
			</button>
		</div>
	</div>
</Modal>

<style>
	.contradiction-modal {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.contradiction-header {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.contradiction-icon {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.contradiction-list {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.contradiction-group {
		border: 1px solid var(--form-border, #e5e7eb);
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: var(--form-bg, #fafafa);
	}

	.contradiction-group-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--form-text, #1f2937);
		margin-bottom: 0.5rem;
	}

	.contradiction-item {
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		margin-bottom: 0.375rem;
	}

	.contradiction-item:last-child {
		margin-bottom: 0;
	}

	.contradiction-item-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.contradiction-hard {
		background: rgba(239, 68, 68, 0.08);
		border-left: 3px solid #ef4444;
	}

	.contradiction-soft {
		background: rgba(245, 158, 11, 0.08);
		border-left: 3px solid #f59e0b;
	}

	.contradiction-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		white-space: nowrap;
	}

	.badge-hard {
		background: rgba(239, 68, 68, 0.12);
		color: #dc2626;
	}

	.badge-soft {
		background: rgba(245, 158, 11, 0.12);
		color: #d97706;
	}

	.contradiction-message {
		font-size: 0.8125rem;
		color: var(--form-text, #374151);
		line-height: 1.4;
	}

	.contradiction-affected {
		font-size: 0.75rem;
		color: var(--form-text-muted, #6b7280);
		margin-top: 0.25rem;
		font-style: italic;
	}

	.contradiction-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--form-border, #e5e7eb);
	}

	.contradiction-btn-back {
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-500, #f59e0b),
			var(--ddsa-accent-500, #ea580c)
		);
		color: white;
		border: none;
		transition: opacity 0.15s;
	}

	.contradiction-btn-back:hover {
		opacity: 0.9;
	}

	.contradiction-btn-keep {
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: transparent;
		color: #d97706;
		border: 1px solid #d97706;
		transition: all 0.15s;
	}

	.contradiction-btn-keep:hover {
		background: rgba(217, 119, 6, 0.08);
	}

	.contradiction-btn-proceed {
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: transparent;
		color: #ef4444;
		border: 1px solid #ef4444;
		transition: all 0.15s;
	}

	.contradiction-btn-proceed:hover {
		background: rgba(239, 68, 68, 0.08);
	}
</style>
