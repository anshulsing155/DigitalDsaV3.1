<script lang="ts">
	interface Props {
		item: any;
		selected?: boolean;
		highlighted?: boolean;
		validated?: boolean;
		errorMsg?: string;
		onChoose?: (detail: { value: boolean; key: string }) => void;
	}

	let {
		item,
		selected = undefined,
		highlighted = false,
		validated = false,
		errorMsg = '',
		onChoose = () => {}
	}: Props = $props();

	function choose(val: boolean) {
		onChoose({ value: val, key: item.value });
	}

	let isNested = $derived(item.nestedLabel === 1);
	let isAnswered = $derived(selected !== undefined);
	let showValidatedCheck = $derived(validated && selected === true);
</script>

<div data-opt-value={item.value} class="relative transition-all {isNested ? 'ml-6 md:ml-8' : ''}">
	<!-- Nested Connector Line -->
	{#if isNested}
		<div class="absolute top-0 -left-4 h-full w-px bg-[var(--form-border)] md:-left-5"></div>
		<div class="absolute top-1/2 -left-4 h-px w-4 bg-[var(--form-border)] md:-left-5 md:w-5"></div>
	{/if}

	<!-- Item Card -->
	<div
		class="group relative rounded-md border p-2 transition-all {isAnswered
			? 'border-primary bg-primary/10'
			: highlighted
				? 'animate-pulse border-red-500'
				: errorMsg
					? 'border-red-500'
					: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:border-primary'}"
	>
		<div class="flex w-full items-center justify-between gap-4">
			<div class="flex flex-col">
				<span class="inputText text-[var(--form-text)]">
					{item.label}
				</span>
				{#if item.optionsDescription}
					<p class="smallText text-[var(--form-text-muted)]">
						{item.optionsDescription}
					</p>
				{/if}
			</div>

			<div class="flex flex-shrink-0 gap-2">
				<button
					onclick={() => choose(true)}
					type="button"
					class="yes-btn"
					class:selected={selected === true}
					aria-label="Yes"
					aria-pressed={selected === true}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
					>
						<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span>Yes</span>
				</button>

				<button
					onclick={() => choose(false)}
					type="button"
					class="no-btn"
					class:selected={selected === false}
					aria-label="No"
					aria-pressed={selected === false}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span>No</span>
				</button>
			</div>
		</div>

		<!-- {#if showValidatedCheck}
			<div
				class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-sm md:right-3 md:top-3"
			>
				<span class="text-xs text-white">✓</span>
			</div>
		{/if} -->
	</div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}

	.animate-pulse {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) 3;
	}

	/* Yes/No Button Styles */
	.yes-btn,
	.no-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border: 2px solid var(--form-border);
		border-radius: 8px;
		background: var(--form-bg-card);
		font-family: var(--font-title);
		font-size: 13px;
		font-weight: 500;
		color: var(--form-text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		touch-action: manipulation;
	}

	.yes-btn:hover,
	.no-btn:hover {
		border-color: var(--form-border-hover);
		background: var(--form-bg-input);
	}

	.yes-btn.selected {
		background: var(--form-bg-card);
		border: 2px solid transparent;
		background-image:
			linear-gradient(var(--form-bg-card), var(--form-bg-card)),
			linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		background-origin: border-box;
		background-clip: padding-box, border-box;
		color: var(--ddsa-accent-500);
		font-weight: 600;
	}

	.no-btn.selected {
		background: #1a1a1a;
		border-color: #1a1a1a;
		color: #ffffff;
	}

	:global(.dark) .no-btn.selected {
		background: #e5e7eb;
		border-color: #e5e7eb;
		color: #1a1a1a;
	}

	@media (max-width: 640px) {
		.yes-btn,
		.no-btn {
			padding: 0.5rem 0.75rem;
			font-size: 12px;
		}
	}
</style>
