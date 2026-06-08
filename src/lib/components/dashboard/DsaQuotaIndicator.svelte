<!--
  DsaQuotaIndicator — three render modes, one source of truth.

  Per owner direction 2026-06-01:
    - sidebar : "Basic Plan / 5 May 26 - 4 Jun 26" block in the left sidebar
    - chip    : compact "Cases Consumed X/Y" pill in the desktop top-bar
    - banner  : full-width strip for mobile (no top-bar at <lg breakpoint)

  Hides entirely when:
    - quotaState is null (load error, demo guest, no DSA id)
    - plan is Enterprise (caseLimit === Infinity — nothing to gate)

  Source data: getQuotaState() in $lib/server/billing/quotaState, loaded
  in dashboard/dsa/+layout.server.ts and inherited via $page.data.
-->
<script lang="ts">
	import type { QuotaState } from '$lib/server/billing/quotaState';

	interface Props {
		quotaState: QuotaState | null;
		mode: 'sidebar' | 'chip' | 'banner';
	}

	let { quotaState, mode }: Props = $props();

	// Visible only when we have real numbers AND the plan is bounded.
	const shouldShow = $derived(
		quotaState !== null &&
			Number.isFinite(quotaState.caseLimit) &&
			quotaState.caseLimit > 0
	);

	// Utilization tier drives the accent color (text-only on chip, soft
	// background tint on sidebar + banner — never garish).
	const utilization = $derived(
		quotaState && Number.isFinite(quotaState.caseLimit)
			? quotaState.activeCount / quotaState.caseLimit
			: 0
	);
	const tier = $derived(
		quotaState?.isExhausted
			? 'exhausted'
			: utilization >= 0.8
				? 'approaching'
				: 'normal'
	);

	// "5 May 26" — Indian-locale short date. Two digits for the year keeps
	// the sidebar block compact (DSAs read the range, not the century).
	function formatShortDate(iso?: string): string | null {
		if (!iso) return null;
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return null;
		return d
			.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
			.replace(/,/g, '');
	}

	const cycleStartLabel = $derived(formatShortDate(quotaState?.cycleStartAt));
	const cycleEndLabel = $derived(formatShortDate(quotaState?.nextCycleAt));
	const cycleRange = $derived(
		cycleStartLabel && cycleEndLabel ? `${cycleStartLabel} – ${cycleEndLabel}` : cycleEndLabel
	);

	const upgradeHref = $derived(
		quotaState
			? `/dashboard/dsa/billing?recommend=${encodeURIComponent(quotaState.recommendedPlan)}`
			: '/dashboard/dsa/billing'
	);

	const billingHref = '/dashboard/dsa/billing';

	// Tooltip on the chip surfaces what the sidebar already shows, so a
	// desktop user with the sidebar visible sees consistent info even when
	// hovering only the chip.
	const chipTooltip = $derived(
		quotaState
			? `${quotaState.planName} plan · ${quotaState.activeCount}/${quotaState.caseLimit} cases this cycle` +
					(cycleRange ? ` · ${cycleRange}` : '')
			: ''
	);
</script>

{#if shouldShow && quotaState}
	{#if mode === 'sidebar'}
		<!-- ── Sidebar block — plan name + cycle date range ───────────── -->
		<!-- Sits below the Logo / DSA Agent header in dashboard/+layout.svelte.
		     Minimal chrome — feels like an identity / context line, not a CTA.
		     data-walkthrough="plan-badge" anchors the intro tour step (see
		     introTour.ts). -->
		<a
			href={billingHref}
			class="sidebar-block sidebar-block--{tier}"
			title="Open billing"
			data-walkthrough="plan-badge"
		>
			<div class="sidebar-block__plan">{quotaState.planName} Plan</div>
			{#if cycleRange}
				<div class="sidebar-block__range">{cycleRange}</div>
			{/if}
		</a>
	{:else if mode === 'chip'}
		<!-- ── Desktop top-bar chip — "Cases Consumed X/Y" ────────────── -->
		<!-- Matches the existing top-bar buttons' visual language: text-secondary
		     color, rounded-lg padding, hover bg. No background tint at normal
		     utilization; subtle text-color shift at amber / red tiers.
		     data-walkthrough="quota-chip" anchors the intro tour step. -->
		<a
			href={billingHref}
			class="chip chip--{tier}"
			title={chipTooltip}
			aria-label={chipTooltip}
			data-walkthrough="quota-chip"
		>
			<svg
				class="chip__icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M3 3v18h18" />
				<path d="M7 14l4-4 4 4 6-6" />
			</svg>
			<span class="chip__text">
				Cases Consumed <strong>{quotaState.activeCount}/{quotaState.caseLimit}</strong>
			</span>
		</a>
	{:else if mode === 'banner'}
		<!-- ── Mobile banner — both pieces in a single horizontal strip ─ -->
		<!-- Lives inside <main> alongside the trial-expiry banner pattern at
		     dashboard/+layout.svelte lines 909-925, so it appears for mobile
		     users who don't have access to the desktop sidebar OR top-bar. -->
		<a
			href={billingHref}
			class="banner banner--{tier}"
			aria-label={chipTooltip}
		>
			<span class="banner__left">
				<strong>{quotaState.planName} Plan</strong>
				{#if cycleRange}
					<span class="banner__range">· {cycleRange}</span>
				{/if}
			</span>
			<span class="banner__right">
				Cases <strong>{quotaState.activeCount}/{quotaState.caseLimit}</strong>
				{#if tier === 'exhausted'}
					· <span class="banner__cta">Upgrade →</span>
				{/if}
			</span>
		</a>
	{/if}
{/if}

<style>
	/* ═══════════════════════════════════════════════════════════════════
	   SIDEBAR mode — plan name + cycle range, sits in the left sidebar.
	   Visually: a quiet, slightly-elevated card that reads as identity
	   context, not a CTA.
	   ═══════════════════════════════════════════════════════════════════ */
	.sidebar-block {
		display: block;
		margin: 0 0.625rem 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--dash-border);
		border-radius: 0.5rem;
		background: var(--dash-bg-alt);
		text-decoration: none;
		transition: background-color 120ms ease, border-color 120ms ease;
	}
	.sidebar-block:hover {
		background: var(--dash-hover);
		border-color: var(--dash-border);
	}

	.sidebar-block__plan {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-text);
		line-height: 1.1;
	}
	.sidebar-block__range {
		margin-top: 0.125rem;
		font-size: 0.6875rem;
		color: var(--dash-text-muted);
		letter-spacing: 0.01em;
	}

	.sidebar-block--approaching {
		border-color: var(--ddsa-accent-300, var(--dash-border));
	}
	.sidebar-block--approaching .sidebar-block__plan {
		color: var(--dash-accent-text, var(--dash-text));
	}

	.sidebar-block--exhausted {
		border-color: var(--ddsa-accent-500, var(--dash-border));
		background: var(--dash-btn-ghost-bg, var(--dash-bg-alt));
	}
	.sidebar-block--exhausted .sidebar-block__plan {
		color: var(--dash-accent-text, var(--dash-text));
	}

	/* ═══════════════════════════════════════════════════════════════════
	   CHIP mode — desktop top-bar pill.
	   Visually: matches sibling buttons (color picker, theme toggle, Guide,
	   notification bell). Same text color, same hover bg, same padding rhythm.
	   ═══════════════════════════════════════════════════════════════════ */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border-radius: 0.5rem;
		color: var(--dash-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: background-color 120ms ease, color 120ms ease;
	}
	.chip:hover {
		background: var(--dash-hover);
		color: var(--dash-text);
	}
	.chip__icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		opacity: 0.7;
	}
	.chip__text strong {
		font-weight: 700;
	}

	.chip--approaching {
		color: var(--dash-accent-text);
	}
	.chip--approaching .chip__icon {
		opacity: 0.95;
	}

	.chip--exhausted {
		color: var(--dash-contrast-text);
	}
	.chip--exhausted .chip__icon {
		opacity: 1;
	}
	.chip--exhausted:hover {
		background: var(--dash-contrast-ghost-bg, var(--dash-hover));
	}

	/* ═══════════════════════════════════════════════════════════════════
	   BANNER mode — mobile-only strip inside <main>.
	   Visually: mirrors the trial-expiry banner pattern at
	   dashboard/+layout.svelte:909-925 — same height, same border-bottom,
	   same per-tier color treatment.
	   ═══════════════════════════════════════════════════════════════════ */
	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--dash-border-light);
		background: var(--dash-bg-alt);
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		text-decoration: none;
	}
	.banner strong {
		font-weight: 600;
		color: var(--dash-text);
	}
	.banner__range {
		margin-left: 0.25rem;
		color: var(--dash-text-muted);
	}
	.banner__right {
		white-space: nowrap;
	}
	.banner__cta {
		font-weight: 600;
		color: var(--dash-accent-text);
	}

	.banner--approaching {
		background: var(--dash-btn-ghost-bg, var(--dash-bg-alt));
		border-bottom-color: var(--ddsa-accent-300, var(--dash-border));
	}

	.banner--exhausted {
		background: var(--dash-btn-ghost-bg, var(--dash-bg-alt));
		border-bottom-color: var(--ddsa-accent-500, var(--dash-border));
	}
	.banner--exhausted strong {
		color: var(--dash-accent-text);
	}
</style>
