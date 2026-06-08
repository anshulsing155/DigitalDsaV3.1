/**
 * Shared formatting helpers between the test-runner parent page (run
 * history table) and TestCard (per-card status badge / footer).
 *
 * Extracted to avoid duplication and to keep the status-color tokens
 * in a single canonical place.
 */

export function statusColor(status: string): string {
	switch (status) {
		case 'completed':
			return 'text-[var(--dash-accent-text)] bg-[var(--dash-btn-ghost-bg)]';
		case 'failed':
			return 'text-[var(--dash-contrast-text)] bg-[var(--dash-contrast-ghost-bg)]';
		case 'running':
		case 'page_filling':
		case 'pending':
			return 'text-[var(--dash-text)] bg-[var(--dash-bg-alt)]';
		default:
			return 'text-[var(--dash-text-muted)] bg-[var(--dash-bg-alt)]';
	}
}

export function statusLabel(status: string): string {
	switch (status) {
		case 'completed':
			return 'Passed';
		case 'failed':
			return 'Failed';
		case 'running':
			return 'Running';
		case 'page_filling':
			return 'Filling';
		case 'pending':
			return 'Starting';
		default:
			return 'Idle';
	}
}

export function formatDuration(ms: number | null | undefined): string {
	if (!ms) return '-';
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
