<script lang="ts">
	import { shouldShowEncoded, type ShowWhenCondition } from '$lib/config/showWhenEngine';
	import { onMount, tick } from 'svelte';
	import GroupHeader from './GroupHeader.svelte';
	import ToggleItem from './ToggleItem.svelte';
	import type { Answers } from '$lib/types/formTypes';

	interface GroupItem {
		label: string;
		value: string;
		description?: string;
		showWhen?: ShowWhenCondition | string | null;
	}

	interface OptionGroup {
		label: string;
		value: string;
		items: GroupItem[];
		showWhen?: ShowWhenCondition | string | null;
	}

	interface VisibleGroup extends OptionGroup {
		items: GroupItem[];
	}

	interface GroupProgress {
		completed: number;
		total: number;
		percentage: number;
	}

	interface Props {
		options?: OptionGroup[];
		questionId: string;
		answers: Answers;
		onAnswersChange?: (key: string, value: unknown) => void;
		compact?: boolean;
		/** Session ID for decoding encoded showWhen conditions (production anti-scraping). */
		sessionId?: string;
	}

	let {
		options = [],
		questionId,
		answers = $bindable({}),
		onAnswersChange,
		compact = false,
		sessionId
	}: Props = $props();

	let visibleGroups: VisibleGroup[] = $state([]);
	let selected: Record<string, boolean> = $state({});
	let expandedGroups: Record<string, boolean> = $state({});
	let groupLockStates: Record<string, boolean> = $state({});
	let manuallyToggledGroups: Set<string> = new Set();
	let checkContinue = $state(false);
	let errorMsg = $state('');
	let highlightedItem = $state('');
	let validated = $state(false);
	let wasValidated = $state(false); // Track if user previously validated then changed answer

	// Guards to prevent cascading $effect updates
	let lastSelectedHash = '';
	let lastVisibleGroupsHash = '';
	let prevItemCounts: Record<string, number> = {};

	onMount(() => {
		selected = answers?.[questionId] ?? {};

		// validated = answers?.[questionId + 'Validate'] ?? false;

		// if(validated)
		// {
		// 	 groupLockStates.
		// }
	});

	// Auto-validate in compact mode when all options are answered
	$effect(() => {
		if (!compact) return;
		if (checkContinue && !answers[questionId + 'Validate']) {
			if (onAnswersChange) {
				onAnswersChange(questionId, selected);
				onAnswersChange(questionId + 'Validate', true);
			} else {
				answers[questionId] = selected;
				answers[questionId + 'Validate'] = true;
			}
			validated = true;
		} else if (!checkContinue && answers[questionId + 'Validate']) {
			if (onAnswersChange) {
				onAnswersChange(questionId + 'Validate', false);
			} else {
				answers[questionId + 'Validate'] = false;
			}
			validated = false;
		}
	});

	function getContext() {
		return {
			...(answers || {}),
			...(answers?.[questionId] || {})
		};
	}

	function choose(val: boolean, key: string) {
		selected = { ...selected, [key]: val };

		// Update via callback if provided (for store updates)
		if (onAnswersChange) {
			onAnswersChange(questionId, selected);
			onAnswersChange(questionId + 'Validate', false);
		} else {
			answers[questionId] = selected;
			answers[questionId + 'Validate'] = false;
			answers = { ...answers }; // Trigger reactivity
		}

		// Track if user changed answer after previously validating
		if (validated) {
			wasValidated = true;
		}
		validated = false;
		errorMsg = '';
		highlightedItem = '';
	}

	function visibleItems(items: GroupItem[]): GroupItem[] {
		const ctx = getContext();
		return items.filter((item: GroupItem) => {
			if (!item.showWhen) return true;
			return shouldShowEncoded(item.showWhen, ctx, sessionId);
		});
	}

	function getGroupProgress(group: VisibleGroup): GroupProgress {
		const items = visibleItems(group.items || []);
		const completed = items.filter((item: GroupItem) => selected[item.value] !== undefined).length;
		return {
			completed,
			total: items.length,
			percentage: items.length > 0 ? (completed / items.length) * 100 : 0
		};
	}

	function isGroupComplete(group: VisibleGroup): boolean {
		const { completed, total } = getGroupProgress(group);
		return completed === total && total > 0;
	}

	function isGroupLocked(groupIndex: number): boolean {
		if (groupIndex === 0) return false;
		const prevGroup = visibleGroups[groupIndex - 1];
		return !isGroupComplete(prevGroup);
	}

	function toggleGroup(groupValue: string): void {
		expandedGroups[groupValue] = !expandedGroups[groupValue];
		expandedGroups = { ...expandedGroups };

		// Prevent auto-collapse when user manually toggles
		manuallyToggledGroups.add(groupValue);
	}

	async function findFirstIncompleteItem(): Promise<{
		group: VisibleGroup;
		item: GroupItem;
	} | null> {
		for (const group of visibleGroups) {
			const items = visibleItems(group.items || []);
			for (const item of items) {
				if (selected[item.value] === undefined) {
					return { group, item };
				}
			}
		}
		return null;
	}

	async function scrollToItem(itemValue: string): Promise<void> {
		await tick();
		const element = document.querySelector(`[data-opt-value="${itemValue}"]`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	async function ContinueFunction(): Promise<void> {
		if (!checkContinue) {
			const incomplete = await findFirstIncompleteItem();
			if (incomplete) {
				expandedGroups[incomplete.group.value] = true;
				expandedGroups = { ...expandedGroups };
				await tick();

				highlightedItem = incomplete.item.value;
				scrollToItem(incomplete.item.value);
				errorMsg = `Please answer: "${incomplete.item.label}"`;
			} else {
				errorMsg = 'Please answer all visible statements';
			}
			return;
		}

		validated = true;
		wasValidated = false; // Reset after successful validation
		errorMsg = '';
		highlightedItem = '';

		Object.keys(expandedGroups).forEach((key) => {
			expandedGroups[key] = false;
		});
		expandedGroups = { ...expandedGroups };

		// Update via callback if provided (for store updates)
		if (onAnswersChange) {
			onAnswersChange(questionId, selected);
			onAnswersChange(questionId + 'Validate', true);
		} else {
			// Trigger reactivity by reassigning the entire answers object
			answers = {
				...answers,
				[questionId]: selected,
				[questionId + 'Validate']: true
			};
		}
	}

	// Recalculate visible groups and check answers - with guards to prevent cascading
	$effect(() => {
		if (!options || !answers) return;

		// Create hash of current selected state to detect actual changes
		const currentSelectedHash = JSON.stringify(selected);
		if (currentSelectedHash === lastSelectedHash && visibleGroups.length > 0) {
			// Only check if continue state needs update
			const allVisibleItems = visibleGroups.flatMap((g) => g.items);
			const newCheckContinue =
				allVisibleItems.length > 0 &&
				allVisibleItems.every((item) => selected[item.value] !== undefined);
			if (newCheckContinue !== checkContinue) {
				checkContinue = newCheckContinue;
			}
			return;
		}
		lastSelectedHash = currentSelectedHash;

		const ctx = getContext();
		const newVisibleGroups = options
			.filter((group) => shouldShowEncoded(group.showWhen, ctx, sessionId))
			.map((group) => ({
				...group,
				items: visibleItems(group.items || [])
			}))
			.filter((group) => group.items.length > 0);

		// Only update visibleGroups if they actually changed
		const newGroupsHash = JSON.stringify(newVisibleGroups.map((g) => g.value));
		if (newGroupsHash !== lastVisibleGroupsHash) {
			lastVisibleGroupsHash = newGroupsHash;
			visibleGroups = newVisibleGroups;
		}

		const allVisibleItems = newVisibleGroups.flatMap((g) => g.items);
		const newCheckContinue =
			allVisibleItems.length > 0 &&
			allVisibleItems.every((item) => selected[item.value] !== undefined);
		if (newCheckContinue !== checkContinue) {
			checkContinue = newCheckContinue;
		}
	});

	// Handle expansion logic separately after visibility is settled - with batched updates
	$effect(() => {
		if (visibleGroups.length === 0 || !selected || validated) return;

		const newExpandedGroups = { ...expandedGroups };
		const newLockStates: Record<string, boolean> = {};
		let hasChanges = false;

		visibleGroups.forEach((group, index) => {
			const complete = isGroupComplete(group);
			const locked = isGroupLocked(index);
			const currentlyExpanded = newExpandedGroups[group.value] ?? false;
			const manuallyToggled = manuallyToggledGroups.has(group.value);
			const currentItemCount = visibleItems(group.items).length;
			const prevCount = prevItemCounts[group.value];
			const itemCountChanged = prevCount !== undefined && currentItemCount !== prevCount;

			// Always track the latest item count
			prevItemCounts[group.value] = currentItemCount;

			// Store lock state
			newLockStates[group.value] = locked;

			// Rule 1: If group doesn't exist in expandedGroups, initialize it
			if (newExpandedGroups[group.value] === undefined) {
				newExpandedGroups[group.value] = !locked && !complete;
				hasChanges = true;
			}
			// Rule 2: If user manually toggled, respect their choice (don't auto-collapse)
			else if (manuallyToggled) {
				// Keep the current state as-is
			}
			// Rule 3: If complete and not manually toggled, close it
			// BUT skip auto-collapse if item count just changed (new nested question appeared)
			else if (complete && currentlyExpanded && !manuallyToggled && !itemCountChanged) {
				newExpandedGroups[group.value] = false;
				hasChanges = true;
			}
			// Rule 4: If not locked and not complete and currently closed, open it
			else if (!locked && !complete && !currentlyExpanded) {
				newExpandedGroups[group.value] = true;
				hasChanges = true;
			}
		});

		// Batch the state updates to prevent multiple re-renders
		if (hasChanges) {
			expandedGroups = newExpandedGroups;
			groupLockStates = newLockStates;
		}
	});
</script>

{#if visibleGroups.length > 0}
	{@const totalItems = visibleGroups.flatMap((g) => g.items).length}
	{@const answeredItems = Object.keys(selected).length}

	<div class="property-checklist-container" class:compact>
		<!-- Groups List -->
		<div class="groups-container">
			{#each visibleGroups as group, groupIndex (group.value)}
				{@const progress = getGroupProgress(group)}
				{@const isComplete = isGroupComplete(group)}
				{@const isLocked = groupLockStates[group.value] ?? isGroupLocked(groupIndex)}
				{@const isExpanded = expandedGroups[group.value]}

				<div
					class="group-card {isComplete ? 'group-complete' : isExpanded ? 'group-expanded' : ''}"
					class:group-odd={groupIndex % 2 === 1}
					class:group-locked={isLocked}
				>
					<GroupHeader
						{group}
						{progress}
						{isComplete}
						{isLocked}
						{isExpanded}
						onToggle={() => toggleGroup(group.value)}
					/>

					{#if isExpanded && !isLocked}
						<div class="accordion-content">
							<div class="flex flex-col gap-3">
								{#each visibleItems(group.items) as item (item.value)}
									<ToggleItem
										{item}
										selected={selected[item.value]}
										highlighted={highlightedItem === item.value}
										{validated}
										{errorMsg}
										onChoose={(detail) => choose(detail.value, detail.key)}
									/>
								{/each}
							</div>
						</div>
					{/if}

					{#if isLocked}
						<div class="locked-message">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0110 0v4" />
							</svg>
							<span>Complete the previous section to unlock</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if !compact}
			<!-- Footer -->
			<div class="checklist-footer">
				{#if errorMsg}
					<p class="error-message">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
						{errorMsg}
					</p>
				{/if}

				<button
					onclick={ContinueFunction}
					type="button"
					class="continue-btn"
					class:enabled={checkContinue}
					class:needs-reconfirm={checkContinue && wasValidated}
				>
					{#if checkContinue && wasValidated}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round" />
							<path
								d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Re-confirm & Continue
					{:else if checkContinue}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						All Done - Continue
					{:else}
						{answeredItems} of {totalItems} answered
					{/if}
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Main Container */
	.property-checklist-container {
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 16px;
		overflow: hidden;
		margin-top: 1.5rem;
	}

	.property-checklist-container.compact {
		border: none;
		border-radius: 0;
		background: transparent;
		margin-top: 0;
	}

	/* Groups Container */
	.groups-container {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: none;
		overflow-y: visible;
	}

	/* Group Card */
	.group-card {
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid var(--form-border);
		transition: all 0.2s ease;
	}

	.group-card.group-complete {
		border-color: var(--form-border-hover);
	}

	.group-card.group-expanded {
		border-color: var(--color-primary);
	}

	.group-card.group-locked {
		opacity: 0.8;
	}

	/* Odd groups get subtle variation */
	.group-card.group-odd:not(.group-locked):not(.group-expanded) {
		background: var(--form-bg-alt);
	}

	/* Accordion Content */
	.accordion-content {
		background: var(--form-bg-card);
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--form-border);
		animation: slideDown 0.25s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Locked Message */
	.locked-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--form-bg-disabled);
		border-top: 1px solid var(--form-border);
		font-family: var(--font-paragraph);
		font-size: 12px;
		color: var(--form-text-muted);
		cursor: not-allowed;
	}

	/* Footer */
	.checklist-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem;
		background: #1a1a1a;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-paragraph);
		font-size: 13px;
		color: #ff6b6b;
		margin: 0;
	}

	.continue-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		max-width: 300px;
		padding: 0.875rem 1.5rem;
		background: #333333;
		border: none;
		border-radius: 10px;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 15px;
		color: #888888;
		cursor: not-allowed;
		transition: all 0.2s ease;
	}

	.continue-btn.enabled {
		background: var(--color-primary);
		color: #1a1a1a;
		cursor: pointer;
	}

	.continue-btn.enabled:hover {
		background: #e6b800;
		transform: translateY(-1px);
	}

	.continue-btn.needs-reconfirm {
		background: var(--color-primary);
		color: #1a1a1a;
		cursor: pointer;
		animation: pulse-btn 1.5s ease-in-out infinite;
	}

	@keyframes pulse-btn {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(255, 204, 0, 0);
		}
	}

	/* Scrollbar */
	.groups-container::-webkit-scrollbar {
		width: 6px;
	}

	.groups-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.groups-container::-webkit-scrollbar-thumb {
		background: var(--form-border-hover);
		border-radius: 10px;
	}

	.groups-container::-webkit-scrollbar-thumb:hover {
		background: var(--form-text-muted);
	}

	/* Mobile */
	@media (max-width: 640px) {
		.groups-container {
			padding: 0.75rem;
			max-height: 400px;
		}

		.accordion-content {
			padding: 0.875rem 1rem;
		}

		.checklist-footer {
			padding: 1rem 1.25rem;
		}

		.continue-btn {
			max-width: 100%;
		}
	}
</style>
