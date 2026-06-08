<script lang="ts">
	interface Props {
		text: string;
		checked?: boolean;
	}

	let { text, checked = true }: Props = $props();
</script>

<div class="checklist-item">
	{#if checked}
		<svg
			class="icon check"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			viewBox="0 0 24 24"
		>
			<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	{:else}
		<svg
			class="icon cross"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			viewBox="0 0 24 24"
		>
			<path d="M18 6 6 18" stroke-linecap="round" stroke-linejoin="round" />
			<path d="m6 6 12 12" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	{/if}
	<span class="label" class:checked>{text}</span>
</div>

<style>
	.checklist-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}
	/* Uses accessible token — black on light bg, yellow on dark bg */
	.icon.check {
		color: var(--landing-accent-accessible);
	}
	.icon.cross {
		color: #888888;
	}
	.label {
		font-size: 1rem;
		color: var(--landing-text-muted);
	}
	.label.checked {
		color: var(--dark-text);
	}
</style>
