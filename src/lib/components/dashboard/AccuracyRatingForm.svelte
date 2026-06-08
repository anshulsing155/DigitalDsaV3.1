<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';

	// ── Props ────────────────────────────────────────────────────
	interface ExistingRating {
		rating: number;
		category: string;
		comment?: string;
	}

	interface Props {
		caseId: string;
		lenderAppId: string;
		lenderName: string;
		existingRating?: ExistingRating;
		onRated?: () => void;
	}

	let { caseId, lenderAppId, lenderName, existingRating, onRated }: Props = $props();

	// ── Category options ────────────────────────────────────────
	const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
		{ value: 'income_estimation', label: 'Income Estimation' },
		{ value: 'property_valuation', label: 'Property Valuation' },
		{ value: 'eligibility_check', label: 'Eligibility Check' },
		{ value: 'documentation', label: 'Documentation' },
		{ value: 'overall', label: 'Overall' }
	];

	const CATEGORY_LABELS: Record<string, string> = {
		income_estimation: 'Income Estimation',
		property_valuation: 'Property Valuation',
		eligibility_check: 'Eligibility Check',
		documentation: 'Documentation',
		overall: 'Overall'
	};

	// ── Form state ──────────────────────────────────────────────
	let selectedRating = $state(0);
	let hoveredRating = $state(0);
	let selectedCategory = $state('overall');
	let comment = $state('');
	let submitting = $state(false);
	let submitError = $state('');
	let submitSuccess = $state(false);

	// ── Derived ─────────────────────────────────────────────────
	const isReadOnly = $derived(!!existingRating);
	const canSubmit = $derived(selectedRating >= 1 && selectedRating <= 5 && selectedCategory !== '');
	const commentLength = $derived(comment.length);

	// ── Star interaction ────────────────────────────────────────
	function handleStarClick(star: number) {
		if (isReadOnly) return;
		selectedRating = star;
	}

	function handleStarHover(star: number) {
		if (isReadOnly) return;
		hoveredRating = star;
	}

	function handleStarLeave() {
		if (isReadOnly) return;
		hoveredRating = 0;
	}

	// ── Determine star fill state ───────────────────────────────
	function getStarFill(star: number): 'filled' | 'hovered' | 'empty' {
		if (isReadOnly && existingRating) {
			return star <= existingRating.rating ? 'filled' : 'empty';
		}
		if (hoveredRating > 0) {
			return star <= hoveredRating ? 'hovered' : 'empty';
		}
		return star <= selectedRating ? 'filled' : 'empty';
	}

	// ── Submit rating ───────────────────────────────────────────
	async function submitRating() {
		if (!canSubmit || submitting) return;

		submitting = true;
		submitError = '';

		try {
			const res = await secureFetch('/api/rm/ratings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					case_id: caseId,
					lender_app_id: lenderAppId,
					lender_name: lenderName,
					rating: selectedRating,
					category: selectedCategory,
					comment: comment.trim() || undefined,
					disclaimer_accepted: true
				})
			});

			const result = await res.json();

			if (result.success) {
				submitSuccess = true;
				if (onRated) onRated();
			} else if (res.status === 409) {
				submitError = 'You have already rated this assessment.';
			} else {
				submitError = result.error || 'Failed to submit rating. Please try again.';
			}
		} catch {
			submitError = 'Network error. Please check your connection and try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-3">
	{#if isReadOnly && existingRating}
		<!-- ═════════════════════════════════════════════════════════ -->
		<!-- READ-ONLY: Already rated                                 -->
		<!-- ═════════════════════════════════════════════════════════ -->
		<div class="space-y-2">
			<p class="text-[13px] font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase">
				You rated this assessment
			</p>

			<!-- Stars (read-only) -->
			<div class="flex items-center gap-1">
				{#each [1, 2, 3, 4, 5] as star}
					<svg
						class="h-5 w-5 {star <= existingRating.rating
							? 'text-[var(--dash-accent-text)]'
							: 'text-[var(--dash-text-muted)]'}"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						/>
					</svg>
				{/each}
				<span class="ml-2 text-xs font-medium text-[var(--dash-text-secondary)]">
					{existingRating.rating}/5
				</span>
			</div>

			<!-- Category -->
			<div class="flex items-center gap-2">
				<span
					class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
				>
					{CATEGORY_LABELS[existingRating.category] || existingRating.category}
				</span>
			</div>

			<!-- Comment -->
			{#if existingRating.comment}
				<p class="text-xs text-[var(--dash-text-secondary)] italic">"{existingRating.comment}"</p>
			{/if}
		</div>
	{:else if submitSuccess}
		<!-- ═════════════════════════════════════════════════════════ -->
		<!-- SUCCESS STATE                                            -->
		<!-- ═════════════════════════════════════════════════════════ -->
		<div class="flex items-center gap-2 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2">
			<svg
				class="h-4 w-4 text-[var(--dash-accent-text)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span class="text-xs font-medium text-[var(--dash-accent-text)]"
				>Rating submitted. Thank you!</span
			>
		</div>
	{:else}
		<!-- ═════════════════════════════════════════════════════════ -->
		<!-- INTERACTIVE FORM                                         -->
		<!-- ═════════════════════════════════════════════════════════ -->
		<div class="space-y-3">
			<p class="text-[13px] font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase">
				Rate this assessment
			</p>

			<!-- Star rating -->
			<div class="flex items-center gap-1" role="group" aria-label="Star rating">
				{#each [1, 2, 3, 4, 5] as star}
					{@const fill = getStarFill(star)}
					<button
						type="button"
						onclick={() => handleStarClick(star)}
						onmouseenter={() => handleStarHover(star)}
						onmouseleave={handleStarLeave}
						class="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ddsa-accent-500)]/50"
						aria-label="Rate {star} star{star !== 1 ? 's' : ''}"
					>
						<svg
							class="h-6 w-6 transition-colors {fill === 'filled'
								? 'text-[var(--dash-accent-text)]'
								: fill === 'hovered'
									? 'text-[var(--dash-accent-text)]/60'
									: 'text-[var(--dash-text-muted)]'}"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path
								d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
							/>
						</svg>
					</button>
				{/each}
				{#if selectedRating > 0}
					<span class="ml-2 text-xs font-medium text-[var(--dash-text-secondary)]">
						{selectedRating}/5
					</span>
				{/if}
			</div>

			<!-- Category dropdown -->
			<div class="space-y-1">
				<label
					for="rating-category-{lenderAppId}"
					class="block text-[13px] text-[var(--dash-text-secondary)]"
				>
					Category
				</label>
				<select
					id="rating-category-{lenderAppId}"
					bind:value={selectedCategory}
					class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text-secondary)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
				>
					{#each CATEGORY_OPTIONS as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<!-- Optional comment -->
			<div class="space-y-1">
				<label
					for="rating-comment-{lenderAppId}"
					class="block text-[13px] text-[var(--dash-text-secondary)]"
				>
					Comment <span class="text-[var(--dash-text-muted)]">(optional)</span>
				</label>
				<textarea
					id="rating-comment-{lenderAppId}"
					bind:value={comment}
					maxlength={500}
					rows={2}
					placeholder="Any additional feedback..."
					class="w-full resize-none rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
				></textarea>
				{#if commentLength > 0}
					<p class="text-right text-[12px] text-[var(--dash-text-muted)]">{commentLength}/500</p>
				{/if}
			</div>

			<!-- Per-rating disclaimer (inline) -->
			<p class="text-[12px] leading-relaxed text-[var(--dash-text-muted)]">
				This rating helps improve platform accuracy. It does not affect this or any application.
			</p>

			<!-- Submit button -->
			<button
				type="button"
				onclick={submitRating}
				disabled={!canSubmit || submitting}
				class="w-full rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-semibold text-[var(--dash-btn-text)] transition-colors hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if submitting}
					Submitting...
				{:else}
					Submit Rating
				{/if}
			</button>

			<!-- Error message -->
			{#if submitError}
				<div
					class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
				>
					{submitError}
				</div>
			{/if}
		</div>
	{/if}
</div>
