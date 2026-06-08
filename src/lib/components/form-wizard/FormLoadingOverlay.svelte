<script lang="ts">
	interface Props {
		visible?: boolean;
	}

	let { visible = false }: Props = $props();
</script>

{#if visible}
	<div class="form-loading-overlay">
		<div class="spinner-ring"></div>
	</div>
{/if}

<style>
	.form-loading-overlay {
		position: fixed;
		inset: 0;
		background: var(--form-bg-card, #ffffff);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	:global(.dark) .form-loading-overlay {
		background: var(--form-bg-card, #1a1a2e);
	}

	.spinner-ring {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 3px solid color-mix(in srgb, var(--ddsa-primary-200, #cb997e) 20%, transparent);
		border-top-color: var(--ddsa-primary-500, #cb997e);
		animation: spinnerRotate 0.8s linear infinite;
	}

	@keyframes spinnerRotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
