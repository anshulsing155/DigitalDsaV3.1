<script lang="ts">
	interface Props {
		onDismiss: () => void;
	}

	let { onDismiss }: Props = $props();
</script>

<div class="sample-banner">
	<div class="banner-content">
		<div class="banner-icon">
			<span class="text-sm">ℹ️</span>
		</div>
		<p class="banner-text">
			You're viewing <strong>sample data</strong> to help you understand the dashboard. Click dismiss
			to clear.
		</p>
	</div>
	<button onclick={onDismiss} class="banner-dismiss"> Dismiss </button>
</div>

<style>
	.sample-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid #bfdbfe;
		background-color: var(--dash-bg-alt);
		padding: 0.75rem 1rem;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.banner-icon {
		display: flex;
		height: 2rem;
		width: 2rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: #dbeafe;
	}

	.banner-text {
		font-size: 0.875rem;
		color: #1e40af;
	}

	.banner-dismiss {
		flex-shrink: 0;
		margin-left: 0.25rem;
		border-radius: 0.5rem;
		border: 1px solid #93c5fd;
		background-color: var(--dash-bg-card);
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #1d4ed8;
		cursor: pointer;
		transition: background-color 0.15s ease;
		min-height: 2.75rem;
	}

	.banner-dismiss:hover {
		background-color: #dbeafe;
	}

	@media (max-width: 768px) {
		.sample-banner {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
			padding: 0.75rem;
		}

		.banner-text {
			font-size: 0.8125rem;
		}

		.banner-dismiss {
			margin-left: 0;
			align-self: flex-end;
		}
	}
</style>
