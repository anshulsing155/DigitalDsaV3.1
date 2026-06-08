<script lang="ts">
	type StepStatus = 'pending' | 'active' | 'complete';

	let { label, status }: { label: string; status: StepStatus } = $props();
</script>

<div class="flex items-center gap-3 py-1.5 transition-all duration-200">
	<!-- Icon -->
	{#if status === 'complete'}
		<div class="flex h-5 w-5 items-center justify-center">
			<svg
				class="animate-check-bounce h-4 w-4 text-emerald-500"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2.5"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
			</svg>
		</div>
	{:else if status === 'active'}
		<div class="flex h-5 w-5 items-center justify-center">
			<span class="active-dot"></span>
		</div>
	{:else}
		<div class="flex h-5 w-5 items-center justify-center">
			<span
				class="h-2.5 w-2.5 rounded-full border-2 border-[var(--form-border)] bg-[var(--form-bg-card)]"
			></span>
		</div>
	{/if}

	<!-- Label -->
	<span
		class="text-sm transition-all duration-200 {status === 'active'
			? 'font-semibold text-[var(--ddsa-secondary-900,#0f172a)]'
			: status === 'complete'
				? 'text-[var(--form-text-muted)]'
				: 'text-[var(--form-text-muted)]/50'}"
	>
		{label}
	</span>
</div>

<style>
	.active-dot {
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background-color: var(--ddsa-accent-500, #d4a017);
		animation: pulse-dot 1.4s ease-in-out infinite;
		box-shadow: 0 0 0 0 rgba(212, 160, 23, 0.4);
	}

	@keyframes pulse-dot {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(212, 160, 23, 0.4);
			transform: scale(1);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(212, 160, 23, 0);
			transform: scale(1.15);
		}
	}

	.animate-check-bounce {
		animation: check-bounce 300ms ease-out;
	}

	@keyframes check-bounce {
		0% {
			transform: scale(0.5);
			opacity: 0;
		}
		60% {
			transform: scale(1.2);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
</style>
