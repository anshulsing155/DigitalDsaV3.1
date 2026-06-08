<script lang="ts">
	import { RotateCcw, X, Check } from '$lib/utils/iconRegistry';

	interface Props {
		displayName: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { displayName, onConfirm, onCancel }: Props = $props();
</script>

<div class="pending-restore-banner flex flex-col lg:flex-row lg:items-center w-full" role="alert">
	<div class="banner-content">
		<div class="banner-icon">
			<RotateCcw class="h-4 w-4" />
		</div>
		<div class="banner-text ">
			<p class="alertText text-[var(--form-text-secondary)] font-titleBold">Restored: {displayName}</p>
			<p class="banner-subtitle">
				Basic info pre-filled. Confirm to load income, obligations & CIBIL data.
			</p>
		</div>
	</div>
	<div class="banner-actions justify-end">
		<button type="button" class="btn-cancel tinyText" onclick={onCancel}>
			<X class="h-3.5 w-3.5" />
			Cancel
		</button>
		<button type="button" class="btn-confirm bg-ddsa-gradient-primary buttonText" onclick={onConfirm}>
			<Check class="h-3.5 w-3.5" />
			Confirm & Load Data
		</button>
	</div>
</div>

<style>
	.pending-restore-banner {
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
		border: 1px solid rgba(16, 185, 129, 0.25);
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	:global(.dark) .pending-restore-banner {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
		border-color: rgba(16, 185, 129, 0.2);
	}
	.banner-content {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		flex: 1;
	}
	.banner-icon {
		padding: 0.375rem;
		border-radius: 50%;
		background: rgba(16, 185, 129, 0.15);
		color: #059669;
		flex-shrink: 0;
	}
	:global(.dark) .banner-icon {
		color: #34d399;
	}

	.banner-subtitle {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-xs, 0.75rem);
		color: var(--color-text-light);
		margin: 0.125rem 0 0 0;
	}
	.banner-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	.btn-cancel {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--form-border);
		background: var(--color-bg-main);
		color: var(--color-text-light);
		cursor: pointer;
		transition: all 0.4s ease;
	}
	.btn-cancel:hover {
		background: var(--color-bg-alt);
	}
	.btn-confirm {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		border: none;
		color: var(--bg-header-text);
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}
	.btn-confirm:hover {
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		opacity: 0.9;
	}
</style>
