<script lang="ts">
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';
	import { ArrowRight, RotateCcw, Trash2 } from '$lib/utils/iconRegistry';
	import { generateId } from '$lib/utils';

	type ResumeChoice = 'resume' | 'restart' | 'clear';

	interface Props {
		open?: boolean;
		onSelect: (choice: ResumeChoice) => void;
	}

	let { open = false, onSelect }: Props = $props();

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

	const options: Array<{
		key: ResumeChoice;
		title: string;
		description: string;
		iconKey: 'arrow' | 'rotate' | 'trash';
	}> = [
		{
			key: 'resume',
			title: 'Continue where I left off',
			description: 'Restore saved page position and keep all data',
			iconKey: 'arrow'
		},
		{
			key: 'restart',
			title: 'Review from the beginning',
			description: 'Go to page 1, keep all filled data intact',
			iconKey: 'rotate'
		},
		{
			key: 'clear',
			title: 'Start fresh',
			description: 'Clear all saved data and begin a new application',
			iconKey: 'trash'
		}
	];
</script>

{#if open}
	<div class="modal-overlay">
		<div class="modal-container">
			<!-- Header -->
			<div class="modal-header bg-ddsa-gradient-primary">
				<div class="header-icon">
					<RotateCcw class="h-5 w-5" />
				</div>
				<div>
					<h3 class="text-labelQuestion !m-0 text-[var(--bg-header-text)]">Application in Progress</h3>
					<p class="descriptionText text-[var(--bg-header-subtext)]">
						You have saved progress from a previous session
					</p>
				</div>
			</div>

			<!-- Content -->
			<div class="modal-content">
				<p class="text-sectionHeadingText text-[var(--form-text-label)]">
					How would you like to proceed?
				</p>

				<div class="options-list">
					{#each options as opt}
						<button type="button" class="option-card" onclick={() => onSelect(opt.key)}>
							<div class="option-icon">
								{#if opt.iconKey === 'arrow'}
									<ArrowRight class="h-5 w-5" />
								{:else if opt.iconKey === 'rotate'}
									<RotateCcw class="h-5 w-5" />
								{:else}
									<Trash2 class="h-5 w-5" />
								{/if}
							</div>
							<div class="option-text">
								<p class="text-labelText text-[var(--form-text-label)] font-titleMedium !m-0">{opt.title}</p>
								<p class="descriptionText text-[var(--form-text-muted)]">{opt.description}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--form-bg-card);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 1rem;
		animation: fadeIn 0.2s ease-out;
	}

	.modal-container {
		background: var(--color-bg-main);
		border-radius: 1rem;
		width: 100%;
		max-width: 26rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
	}

	.modal-header {
		color: var(--bg-header-text);
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon {
		background: var(--bg-header-icon-bg);
		padding: 0.625rem;
		border-radius: 50%;
		color: var(--bg-header-icon-color);
	}

	.modal-content {
		padding: 1.25rem 1.5rem;
	}

	.options-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.option-card {
		width: 100%;
		text-align: left;
		padding: 0.875rem 1rem;
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
		background: var(--color-bg-main);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.option-card:hover {
		border-color: var(--ddsa-primary-500);
		background: var(--ddsa-primary-100);
	}

	.option-icon {
		background: var(--ddsa-primary-50);
		padding: 0.5rem;
		border-radius: 50%;
		color: var(--ddsa-primary-500);
		flex-shrink: 0;
	}

	.option-text {
		flex: 1;
		min-width: 0;
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
