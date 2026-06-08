<script lang="ts">
	import { uiState } from '$lib/state/ui.svelte';
	import Toast from './Toast.svelte';
</script>

<div class="toast-container" role="status" aria-live="polite" aria-atomic="false">
	{#each uiState.toasts as toast (toast.id)}
		<Toast {toast} />
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
		width: max-content;
		max-width: min(90vw, 420px);
	}

	.toast-container :global(.toast) {
		pointer-events: auto;
	}

	@media (max-width: 640px) {
		.toast-container {
			top: 0.75rem;
			width: calc(100% - 1.5rem);
			max-width: none;
		}
	}
</style>
