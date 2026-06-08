<script lang="ts">
	// ── Props ────────────────────────────────────────────────────
	interface Props {
		trafficLight: 'green' | 'amber' | 'red' | 'grey';
		message: string;
		computedAt?: string;
	}

	let { trafficLight, message, computedAt }: Props = $props();

	// ── Traffic light config ────────────────────────────────────
	const LIGHT_CONFIG: Record<string, { dot: string; label: string; ring: string }> = {
		green: { dot: 'bg-emerald-500', label: 'Eligible', ring: 'ring-emerald-200' },
		amber: { dot: 'bg-stone-500', label: 'Marginal', ring: 'ring-stone-200' },
		red: { dot: 'bg-red-500', label: 'Not Eligible', ring: 'ring-red-200' },
		grey: {
			dot: 'bg-[var(--dash-text-muted)]',
			label: 'Unknown',
			ring: 'ring-[var(--dash-border)]'
		}
	};

	const config = $derived(LIGHT_CONFIG[trafficLight] || LIGHT_CONFIG.grey);

	// ── Format timestamp ────────────────────────────────────────
	function formatTimestamp(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString('en-IN', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	}
</script>

<div
	class="flex items-start gap-3 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2.5"
>
	<!-- Traffic light dot -->
	<div class="mt-0.5 flex shrink-0 items-center justify-center">
		<div class="h-3 w-3 rounded-full ring-2 {config.dot} {config.ring}"></div>
	</div>

	<!-- Content -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold text-[var(--dash-text-secondary)]">{config.label}</span>
		</div>
		<p class="mt-0.5 text-[13px] leading-relaxed text-[var(--dash-text-secondary)]">{message}</p>
		{#if computedAt}
			<p class="mt-1 text-[12px] text-[var(--dash-text-muted)]">
				Computed {formatTimestamp(computedAt)}
			</p>
		{/if}
	</div>
</div>
