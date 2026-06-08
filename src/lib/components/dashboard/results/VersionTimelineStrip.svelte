<script lang="ts">
	interface VersionEntry {
		version: number;
		trigger: string;
		created_at: string;
		change_summary?: string;
	}

	interface Props {
		versions: VersionEntry[];
		currentVersion: number;
		onVersionSelect: (version: number) => void;
	}

	let { versions, currentVersion, onVersionSelect }: Props = $props();

	const TRIGGER_LABELS: Record<string, string> = {
		initial_submit: 'Initial',
		form_edit: 'Form Edit',
		manual_refresh: 'Refresh',
		policy_update: 'Policy Update'
	};

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	}

	// Show versions in ascending order (oldest → newest)
	const sortedVersions = $derived([...versions].sort((a, b) => a.version - b.version));
</script>

<div class="version-strip">
	<div class="strip-track">
		{#each sortedVersions as entry, i (entry.version)}
			{@const isActive = entry.version === currentVersion}
			{@const isLatest = i === sortedVersions.length - 1}

			<!-- Connecting line (before dot, skip first) -->
			{#if i > 0}
				<div class="strip-line {entry.version <= currentVersion ? 'strip-line-active' : ''}"></div>
			{/if}

			<!-- Version dot -->
			<button
				type="button"
				class="strip-dot-btn"
				onclick={() => onVersionSelect(entry.version)}
				title="v{entry.version} — {TRIGGER_LABELS[entry.trigger] ?? entry.trigger}"
			>
				<div
					class="strip-dot {isActive
						? 'strip-dot-current'
						: isLatest
							? 'strip-dot-latest'
							: 'strip-dot-past'}"
				>
					{#if isActive}
						<span class="dot-inner-ring"></span>
					{/if}
				</div>
				<div class="strip-label">
					<span class="strip-version {isActive ? 'strip-version-active' : ''}"
						>v{entry.version}</span
					>
					<span class="strip-date">{formatDate(entry.created_at)}</span>
					<span class="strip-trigger">{TRIGGER_LABELS[entry.trigger] ?? entry.trigger}</span>
				</div>
			</button>
		{/each}
	</div>
</div>

<style>
	.version-strip {
		padding: 0.5rem 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.version-strip::-webkit-scrollbar {
		display: none;
	}

	.strip-track {
		display: flex;
		align-items: flex-start;
		min-width: max-content;
		padding: 0 0.25rem;
	}

	.strip-line {
		width: 2rem;
		height: 2px;
		background: var(--dash-border);
		margin-top: 0.5rem;
		flex-shrink: 0;
	}

	.strip-line-active {
		background: var(--ddsa-primary-500, #cb997e);
	}

	.strip-dot-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		min-width: 3.5rem;
		flex-shrink: 0;
	}

	.strip-dot-btn:hover .strip-dot {
		transform: scale(1.2);
	}

	.strip-dot {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}

	.strip-dot-current {
		background: var(--ddsa-primary-500, #cb997e);
		box-shadow: 0 0 0 3px rgba(203, 153, 126, 0.2);
	}

	.strip-dot-latest {
		background: var(--ddsa-accent-500, #ddbea9);
	}

	.strip-dot-past {
		background: var(--dash-text-muted);
	}

	.dot-inner-ring {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: white;
	}

	.strip-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.375rem;
		gap: 0.0625rem;
	}

	.strip-version {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-muted);
	}

	.strip-version-active {
		color: var(--ddsa-primary-500, #cb997e);
		font-weight: 700;
	}

	.strip-date {
		font-size: 0.5625rem;
		color: var(--dash-text-muted);
	}

	.strip-trigger {
		font-size: 0.5rem;
		color: var(--dash-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
</style>
