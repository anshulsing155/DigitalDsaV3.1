<script lang="ts">
	import { List, HelpCircle } from '$lib/utils/iconRegistry';

	interface Props {
		onSectionsClick: () => void;
		onHelpClick: () => void;
		overallProgress?: number;
	}

	let { onSectionsClick, onHelpClick, overallProgress = 0 }: Props = $props();
</script>

<div class="floating-buttons">
	<!-- Sections Button (Left) -->
	<button
		type="button"
		class="fab fab-sections"
		onclick={onSectionsClick}
		aria-label="Open form sections"
	>
		<div class="fab-progress" style="--progress: {overallProgress}%"></div>
		<List class="fab-icon" />
		<span class="fab-label">Sections</span>
	</button>

	<!-- Help/Tips Button (Right) -->
	<button type="button" class="fab fab-help" onclick={onHelpClick} aria-label="Open help and tips">
		<HelpCircle class="fab-icon" />
		<span class="fab-label">Help</span>
	</button>
</div>

<style>
	.floating-buttons {
		position: fixed;
		bottom: 76px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding: 0 1rem calc(0.5rem + env(safe-area-inset-bottom));
		pointer-events: none;
		z-index: 100;
	}

	.fab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 50px;
		border: none;
		cursor: pointer;
		/* font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.8125rem; */
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		transition: all 0.2s ease;
		pointer-events: auto;
		position: relative;
		overflow: hidden;
	}

	.fab:active {
		transform: scale(0.95);
	}

	.fab-sections {
		background: var(--form-bg-card);
		color: var(--form-text);
		border: 2px solid var(--form-border);
	}

	.fab-sections::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		width: var(--progress, 0%);
		background: linear-gradient(90deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		transition: width 0.3s ease;
	}

	.fab-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		width: var(--progress, 0%);
		background: linear-gradient(90deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		transition: width 0.3s ease;
	}

	.fab-help {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		color: white;
	}

	.fab-label {
		white-space: nowrap;
	}

	/* Hide labels on very small screens */
	@media (max-width: 360px) {
		.fab-label {
			display: none;
		}

		.fab {
			padding: 0.875rem;
			border-radius: 50%;
		}
	}
</style>
