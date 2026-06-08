<script lang="ts">
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';
	import { ArrowRight, Gauge } from '$lib/utils/iconRegistry';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { generateId } from '$lib/utils';

	const open = $derived(landingNav.showChoiceModal);

	const modalId = generateId();
	let isRegistered = $state(false);

	$effect(() => {
		if (open && !isRegistered) {
			registerModal(modalId);
			isRegistered = true;
		} else if (!open && isRegistered) {
			unregisterModal(modalId);
			isRegistered = false;
		}

		return () => {
			unregisterModal(modalId);
		};
	});
</script>

{#if open}
	<div
		class="modal-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) landingNav.dismiss();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') landingNav.dismiss();
		}}
	>
		<div class="modal-container">
			<div class="modal-header">
				<h3 class="header-title">You have an application in progress</h3>
				<p class="header-subtitle">Where would you like to go?</p>
			</div>

			<div class="modal-content">
				<button type="button" class="option-card" onclick={() => landingNav.resumeApplication()}>
					<div class="option-icon">
						<ArrowRight class="h-5 w-5" />
					</div>
					<div class="option-text">
						<p class="option-title">Resume Application</p>
						<p class="option-desc">Continue where you left off</p>
					</div>
				</button>

				<button type="button" class="option-card" onclick={() => landingNav.goToDashboard()}>
					<div class="option-icon option-icon--secondary">
						<Gauge class="h-5 w-5" />
					</div>
					<div class="option-text">
						<p class="option-title">Go to Dashboard</p>
						<p class="option-desc">View your cases and analytics</p>
					</div>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
		animation: fadeIn 0.2s ease-out;
	}

	.modal-container {
		background: var(--color-bg-main, #fff);
		border-radius: 1rem;
		width: 100%;
		max-width: 24rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
	}

	.modal-header {
		background: linear-gradient(
			to right,
			var(--landing-accent-gradient-from) 0%,
			var(--landing-accent-gradient-to) 51%,
			var(--landing-accent-gradient-from) 100%
		);
		padding: 1.25rem 1.5rem;
	}

	.header-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--landing-accent-text);
		margin: 0;
	}

	.header-subtitle {
		font-size: 0.8125rem;
		color: rgba(15, 23, 42, 0.7);
		margin: 0.25rem 0 0 0;
	}

	.modal-content {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.option-card {
		width: 100%;
		text-align: left;
		padding: 0.875rem 1rem;
		border-radius: 0.75rem;
		border: 2px solid var(--color-border, #e5e7eb);
		background: var(--color-bg-main, #fff);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.option-card:hover {
		border-color: var(--landing-accent);
		background: var(--landing-accent-subtle);
	}

	.option-icon {
		background: var(--landing-accent-medium);
		padding: 0.5rem;
		border-radius: 50%;
		color: var(--landing-accent);
		flex-shrink: 0;
	}

	.option-icon--secondary {
		background: rgba(100, 116, 139, 0.1);
		color: var(--landing-text-muted, #64748b);
	}

	.option-text {
		flex: 1;
		min-width: 0;
	}

	.option-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-main, #1e293b);
		margin: 0;
	}

	.option-desc {
		font-size: 0.8125rem;
		color: var(--color-text-light, #64748b);
		margin: 0.125rem 0 0 0;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
