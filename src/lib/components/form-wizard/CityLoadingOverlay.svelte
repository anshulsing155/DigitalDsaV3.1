<script lang="ts">
	interface Props {
		show: boolean;
		message?: string;
	}

	let { show, message = 'Loading cities' }: Props = $props();
</script>

{#if show}
	<div class="city-loading-overlay">
		<div class="city-loading-card">
			<svg
				class="city-loading-spinner"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path
					d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
				/>
			</svg>
			<p class="city-loading-text">{message}</p>
		</div>
	</div>
{/if}

<style>
	.city-loading-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		z-index: 9999;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.city-loading-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		background: var(--form-bg-card, #fff);
		border-radius: 1rem;
		padding: 2rem 2.5rem;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.14),
			0 0 0 1px color-mix(in srgb, var(--ddsa-primary, #cb997e) 15%, transparent);
	}

	.city-loading-spinner {
		width: 28px;
		height: 28px;
		color: var(--ddsa-primary, #cb997e);
		animation: spinCityLoader 1.2s linear infinite;
	}

	.city-loading-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--form-text-secondary, #4b5563);
	}

	@keyframes spinCityLoader {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
