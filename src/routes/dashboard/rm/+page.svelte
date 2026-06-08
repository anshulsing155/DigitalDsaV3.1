<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { formatCurrency } from '$lib/i18n';
	import GlanceCard from '$lib/components/dashboard/GlanceCard.svelte';
	import NeedsAttentionZone from '$lib/components/dashboard/NeedsAttentionZone.svelte';
	import RecentCasesZone from '$lib/components/dashboard/RecentCasesZone.svelte';
	import PipelineFunnelZone from '$lib/components/dashboard/PipelineFunnelZone.svelte';
	import DSAConnectionsZone from '$lib/components/dashboard/DSAConnectionsZone.svelte';
	import SuggestedDsasZone from '$lib/components/dashboard/SuggestedDsasZone.svelte';
	import SampleDataBanner from '$lib/components/dashboard/SampleDataBanner.svelte';
	import EmailVerificationModal from '$lib/components/dashboard/EmailVerificationModal.svelte';
	import { dashboardState } from '$lib/stores/dashboard.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import {
		Users,
		Search,
		CircleCheck,
		Briefcase,
		MessageCircle,
		CheckCircle2,
		Inbox,
		Building2,
		CalendarClock,
		ArrowRight,
		AlertTriangle
	} from 'lucide-svelte';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			rmProfile: {
				name: string;
				bankName?: string;
				city?: string;
				designation?: string;
			} | null;
			stats: {
				casesReceived: number;
				activeCases: number;
				dsaConnections: number;
				openQueries: number;
				sanctionedThisMonth: { count: number; amount: number };
				initialReviewCount: number;
				finalReviewCount: number;
				lendersOwned: number;
				policiesNeedVerify: number;
			};
			pipeline: Array<{
				stage: string;
				label: string;
				count: number;
				color: string;
			}>;
			attentionItems: Array<{
				type: 'open_query' | 'expiring_document' | 'stuck_stage';
				case_id: string;
				label: string;
				description: string;
				severity: 'warning' | 'critical';
				days: number;
			}>;
			recentCases: Array<{
				case_id: string;
				label: string;
				loan_type: string;
				stage: string;
				stage_label: string;
				lenders: string[];
				updated_at: string;
				is_sample: boolean;
				dsa_name: string;
			}>;
			recentActivity: Array<{
				event_type: string;
				description: string;
				created_at: string;
				case_id: string;
			}>;
			dsaConnections: Array<{
				dsa_id: string;
				dsa_name: string;
				case_count: number;
				last_shared_at: string;
			}>;
			hasCases: boolean;
			hasRealCases: boolean;
			hasSampleCases: boolean;
			needsEmailVerification: boolean;
			rmEmail: string;
			actionRequired: Array<{
				type: 'clarification_needed' | 'pending_review';
				id: string;
				title: string;
				subtitle: string;
				urgency?: string;
				updated_at: string;
				link: string;
			}>;
			recentlyApproved: Array<{
				version_id: string;
				lender_name: string;
				product_label: string;
				variation_label: string;
				version_number: number;
				activated_at: string;
			}>;
			suggestedDsas: Array<{
				dsa_id: string;
				dsa_name: string;
				city: string;
				score: number;
				reasons: string[];
			}>;
			preferredDsaIds: string[];
		}
	);

	// ── Derived values ───────────────────────────────────────────
	// C.1 — greeting fallback chain: name → last-4-of-mobile → "there".
	// Spec called out "Good evening, there." as a real bug; the RM page load
	// has the mobile on $page.data.user so we surface that before the generic
	// fallback.
	const rmMobileTail = $derived.by(() => {
		const m = ($page.data as { user?: { mobileNumber?: string } }).user?.mobileNumber || '';
		if (!m) return '';
		return m.length > 4 ? `RM ${m.slice(-4)}` : `RM ${m}`;
	});
	const rmName = $derived(data.rmProfile?.name || rmMobileTail || 'there');
	const rmBank = $derived(data.rmProfile?.bankName || '');
	const rmDesignation = $derived(data.rmProfile?.designation || '');
	const rmCity = $derived(data.rmProfile?.city || '');
	const hasCases = $derived(data.hasCases);
	const hasRealCases = $derived(data.hasRealCases);
	const hasSampleCases = $derived(data.hasSampleCases);
	const showSampleBanner = $derived(dashboardState.rm && hasSampleCases);
	const showClearSamplePrompt = $derived(hasRealCases && hasSampleCases);

	// ── Greeting — time-of-day aware ─────────────────────────────
	const greeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	});

	// ── Attention count for greeting subtitle ────────────────────
	const attentionCount = $derived(data.attentionItems?.length || 0);
	const actionRequiredCount = $derived(data.actionRequired?.length || 0);

	// ── Quick Glance: sanctioned amount label ────────────────────
	const sanctionedAmountLabel = $derived(
		data.stats.sanctionedThisMonth.amount > 0
			? formatCurrency(data.stats.sanctionedThisMonth.amount, true)
			: '--'
	);

	// ── RM subtitle line (bank / designation / city) ─────────────
	const rmSubtitle = $derived.by(() => {
		const parts = [rmBank, rmDesignation, rmCity].filter(Boolean);
		return parts.join(' · ');
	});

	// ── Editorial hero: today's date formatted for the eyebrow line ──
	// Locked to Asia/Kolkata so server- and client-side renders agree;
	// formatted as "Sat, 31 May" — short, banking-formal, no year noise.
	const todayLabel = $derived.by(() => {
		try {
			return new Intl.DateTimeFormat('en-IN', {
				weekday: 'short',
				day: '2-digit',
				month: 'short',
				timeZone: 'Asia/Kolkata'
			}).format(new Date());
		} catch {
			return '';
		}
	});

	// ── Lead-story attention item: the single most-urgent item ───
	// AttentionItems are already sorted critical-first by the server
	// (see +page.server.ts buildAttentionItems). The first item is the
	// lead; the rest are surfaced via the bento Needs-Attention tile.
	const leadAttention = $derived(data.attentionItems[0] ?? null);

	// ── Concise summary phrase under the headline ────────────────
	const heroSummary = $derived.by(() => {
		if (!hasCases) {
			return 'Welcome to DigitalDSA. When DSAs share cases with you, they will appear here.';
		}
		if (attentionCount === 0 && actionRequiredCount === 0) {
			return 'All caught up — your cases are on track.';
		}
		const parts: string[] = [];
		if (attentionCount > 0) {
			parts.push(`${attentionCount} case${attentionCount === 1 ? '' : 's'} need attention`);
		}
		if (actionRequiredCount > 0) {
			parts.push(`${actionRequiredCount} action${actionRequiredCount === 1 ? '' : 's'} required`);
		}
		return parts.join(' · ') + ' today.';
	});

	// ── Email verification handler ──────────────────────────────
	function handleEmailVerified() {
		goto(ROUTES.DASHBOARD.RM.ROOT, { invalidateAll: true });
	}

	// ── Clearing sample data ─────────────────────────────────────
	let clearingSamples = $state(false);
	let clearSamplesError = $state('');

	async function clearSampleData() {
		clearingSamples = true;
		clearSamplesError = '';
		try {
			const res = await secureFetch('/api/rm/sample-data', { method: 'DELETE' });
			if (res.ok) {
				dashboardState.dismissRm();
				await invalidateAll();
			} else {
				clearSamplesError = 'Failed to clear sample data. Please try again.';
			}
		} catch {
			clearSamplesError = 'Network error. Please check your connection and try again.';
		} finally {
			clearingSamples = false;
		}
	}

	// ── Preferred DSA tagging ────────────────────────────────────
	// Seeded from SSR `data.preferredDsaIds` so the star icons render correctly
	// on first paint. Mutations (toggle below) update optimistically — the API
	// endpoint persists the change.
	// svelte-ignore state_referenced_locally
	let preferredDsaIds = $state<string[]>(data.preferredDsaIds);
	let togglingPreferred = $state<Record<string, boolean>>({});

	async function togglePreferred(dsaId: string) {
		togglingPreferred = { ...togglingPreferred, [dsaId]: true };
		const isCurrentlyPreferred = preferredDsaIds.includes(dsaId);
		try {
			const res = await secureFetch('/api/rm/preferred-dsas', {
				method: isCurrentlyPreferred ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dsa_id: dsaId })
			});
			if (res.ok) {
				if (isCurrentlyPreferred) {
					preferredDsaIds = preferredDsaIds.filter((id) => id !== dsaId);
				} else {
					preferredDsaIds = [...preferredDsaIds, dsaId];
				}
			}
		} catch {
			// Silently fail
		} finally {
			togglingPreferred = { ...togglingPreferred, [dsaId]: false };
		}
	}
</script>

<svelte:head>
	<title>RM Dashboard - Digital DSA</title>
</svelte:head>

<div class="rm-dashboard pb-20 lg:pb-0">
	<!-- Email Verification Modal (blocks dashboard until verified) -->
	{#if data.needsEmailVerification && data.rmEmail}
		<EmailVerificationModal rmEmail={data.rmEmail} onVerified={handleEmailVerified} />
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- BANNERS (sample data)                                      -->
	<!-- ═══════════════════════════════════════════════════════════ -->

	<!-- Sample Data Banner -->
	{#if showSampleBanner && !showClearSamplePrompt}
		<SampleDataBanner onDismiss={() => dashboardState.dismissRm()} />
	{/if}

	<!-- Clear Sample Data Prompt -->
	{#if showClearSamplePrompt}
		<div class="banner banner-samples">
			<div class="banner-content">
				<div class="banner-icon banner-icon-success">
					<CircleCheck size={16} strokeWidth={2} class="text-[var(--dash-text-secondary)]" />
				</div>
				<p class="banner-text">
					You've received your first real case! Would you like to <strong>clear sample data</strong> from
					your dashboard?
				</p>
			</div>
			<div class="banner-actions">
				<button onclick={() => dashboardState.dismissRm()} class="banner-btn-secondary">
					Keep Samples
				</button>
				<button onclick={clearSampleData} disabled={clearingSamples} class="banner-btn-primary">
					{clearingSamples ? 'Clearing...' : 'Clear Samples'}
				</button>
			</div>
		</div>
		{#if clearSamplesError}
			<div
				class="mt-2 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-accent-text)]"
			>
				{clearSamplesError}
			</div>
		{/if}
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- EDITORIAL HERO — "Morning Briefing"                         -->
	<!-- Bento redesign 2026-05-31: 60/40 split — left column reads  -->
	<!-- like a newspaper masthead (date eyebrow + display headline  -->
	<!-- + meta + summary), right column promotes the single most-   -->
	<!-- urgent attention item as a "lead story" card with one-tap   -->
	<!-- review CTA. Empty hero (no attention items) collapses the   -->
	<!-- right side gracefully so the headline still feels anchored. -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<header class="hero">
		<div class="hero-text">
			{#if todayLabel}
				<p class="hero-eyebrow">{todayLabel} · Morning briefing</p>
			{/if}
			<h1 class="hero-headline">{greeting}, {rmName}.</h1>
			{#if rmSubtitle}
				<p class="hero-meta">{rmSubtitle}</p>
			{/if}
			<p class="hero-summary">{heroSummary}</p>
		</div>

		{#if hasCases && leadAttention}
			<a class="hero-lead" href="/dashboard/rm/cases/{leadAttention.case_id}">
				<div class="hero-lead-header">
					<span
						class="hero-lead-label"
						class:hero-lead-label-critical={leadAttention.severity === 'critical'}
					>
						<AlertTriangle size={11} strokeWidth={2.25} />
						Lead story
					</span>
					<span class="hero-lead-days">{leadAttention.days}d</span>
				</div>
				<p class="hero-lead-title">{leadAttention.label}</p>
				<p class="hero-lead-desc">{leadAttention.description}</p>
				<span class="hero-lead-cta">
					Review case <ArrowRight size={13} strokeWidth={2.25} />
				</span>
			</a>
		{/if}
	</header>

	{#if hasCases}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- BENTO GRID — 4-column on desktop, 2-column tablet, 1-col    -->
		<!-- mobile. Tile spans (.bento-span-2 etc.) create the varied   -->
		<!-- visual rhythm that flat-stack zones used to lack.           -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="bento">
			<!-- Row 1: Needs Attention + Action Required (2-col + 2-col) -->
			{#if data.attentionItems.length > 0}
				<div class="bento-tile bento-span-2 bento-zone-wrapper">
					<NeedsAttentionZone
						items={data.attentionItems}
						maxItems={4}
						basePath="/dashboard/rm/cases"
						viewAllHref="/dashboard/rm/cases?attention=true"
					/>
				</div>
			{/if}

			{#if data.actionRequired.length > 0}
				<section
					class="bento-tile bento-span-2"
					class:bento-span-4={data.attentionItems.length === 0}
				>
					<div class="zone-header">
						<h2 class="zone-title">Action Required</h2>
					</div>
					{#each data.actionRequired.slice(0, 3) as item (item.id)}
						<a href={item.link} class="action-row card-glass">
							<span
								class="action-badge"
								class:action-badge-accent={item.type === 'clarification_needed'}
							>
								{item.type === 'clarification_needed' ? 'Clarification' : 'Review Policy'}
							</span>
							<div class="action-content">
								<p class="action-title">{item.title}</p>
								<p class="action-subtitle">{item.subtitle}</p>
							</div>
							{#if item.urgency === 'critical' || item.urgency === 'urgent'}
								<span
									class="action-urgency"
									class:action-urgency-critical={item.urgency === 'critical'}
								>
									{item.urgency === 'critical' ? 'Critical' : 'Urgent'}
								</span>
							{/if}
						</a>
					{/each}
					{#if data.actionRequired.length > 3}
						<a href={ROUTES.DASHBOARD.RM.SUBMISSIONS} class="action-view-all">
							+{data.actionRequired.length - 3} more action{data.actionRequired.length - 3 === 1
								? ''
								: 's'}
						</a>
					{/if}
				</section>
			{/if}

			<!-- Row 2: 4 stat tiles (Cases Received, Active, Queries, Sanctioned) -->
			<!-- Each is its own col-1 bento cell. Icons in the corner give        -->
			<!-- instant visual scan: briefcase=workload, message=queries, etc.    -->
			<GlanceCard
				label="Cases Received"
				value={data.stats.casesReceived}
				accent={true}
				href={ROUTES.DASHBOARD.RM.CASES}
			>
				{#snippet icon()}<Inbox size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>
			<GlanceCard
				label="Active Cases"
				value={data.stats.activeCases}
				href={ROUTES.DASHBOARD.RM.CASES}
			>
				{#snippet icon()}<Briefcase size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>
			<GlanceCard
				label="Open Queries"
				value={data.stats.openQueries}
				href="{ROUTES.DASHBOARD.RM.CASES}?stage=query"
			>
				{#snippet icon()}<MessageCircle size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>
			<GlanceCard
				label="Sanctioned"
				value={data.stats.sanctionedThisMonth.count}
				compareText={data.stats.sanctionedThisMonth.amount > 0 ? sanctionedAmountLabel : ''}
				href="{ROUTES.DASHBOARD.RM.CASES}?stage=sanctioned"
			>
				{#snippet icon()}<CheckCircle2 size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>

			<!-- Row 3: Pipeline (span-2) + 2 Policy KPI tiles (span-1 each) -->
			<div class="bento-tile bento-span-2 bento-zone-wrapper">
				<PipelineFunnelZone pipeline={data.pipeline} />
			</div>
			<!-- Strict one-lender rule (2026-05-31): an RM holds exactly one
			     lender at any time. Surface the lender NAME directly via
			     compareText instead of a count of "1" (which would be
			     misleading and add no information). The count value
			     remains as a 0/1 anchor for the empty state. -->
			<GlanceCard
				label="Your Lender"
				value={data.stats.lendersOwned > 0 ? '1' : '—'}
				compareText={rmBank || (data.stats.lendersOwned === 0 ? 'No lender assigned' : '')}
				href="/dashboard/rm/policies"
			>
				{#snippet icon()}<Building2 size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>
			<GlanceCard
				label="Due for Verification"
				value={data.stats.policiesNeedVerify}
				accent={data.stats.policiesNeedVerify > 0}
				href="/dashboard/rm/policies"
				compareText={data.stats.policiesNeedVerify > 0 ? 'Within 7 days' : ''}
			>
				{#snippet icon()}<CalendarClock size={14} strokeWidth={2} />{/snippet}
			</GlanceCard>

			<!-- Row 4: Recent Cases (span-2) + DSA Connections (span-2) -->
			<div class="bento-tile bento-span-2 bento-zone-wrapper">
				<RecentCasesZone
					cases={data.recentCases}
					maxItems={4}
					basePath={ROUTES.DASHBOARD.RM.CASES}
					viewAllHref={ROUTES.DASHBOARD.RM.CASES}
				/>
			</div>
			<div class="bento-tile bento-span-2 bento-zone-wrapper">
				<DSAConnectionsZone
					connections={data.dsaConnections}
					maxItems={4}
					viewAllHref={ROUTES.DASHBOARD.RM.DSA_SEARCH}
					preferredIds={preferredDsaIds}
					onTogglePreferred={togglePreferred}
					togglingMap={togglingPreferred}
				/>
			</div>

			<!-- Row 5: Suggested DSAs (full-width 4-col) — only renders if data exists -->
			{#if data.suggestedDsas.length > 0}
				<div class="bento-tile bento-span-4 bento-zone-wrapper">
					<SuggestedDsasZone
						suggestions={data.suggestedDsas}
						viewAllHref={ROUTES.DASHBOARD.RM.DSA_SEARCH}
						preferredIds={preferredDsaIds}
						onTogglePreferred={togglePreferred}
						togglingMap={togglingPreferred}
					/>
				</div>
			{/if}
		</div>
	{:else}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE (no cases at all)                              -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="empty-state card-glass">
			<div class="empty-icon">
				<Users size={28} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<h2 class="empty-title">Your RM Dashboard is Ready</h2>
			<p class="empty-subtitle">
				Once DSA agents share case files with you, they'll appear here. You can also search for DSAs
				in your area to start building connections.
			</p>
			<div class="empty-cta-row">
				<a href={ROUTES.DASHBOARD.RM.DSA_SEARCH} class="empty-cta">
					<Search size={16} strokeWidth={2} />
					Find DSAs Near You
				</a>
				<!-- C.1 — second core RM workflow surfaced from the empty state.
				     A brand-new RM with no cases yet often has policy work to
				     do; routing them to the policy library makes the home
				     immediately useful instead of waiting for DSA-shared cases. -->
				<a href="/dashboard/rm/policies" class="empty-cta empty-cta-secondary">
					Capture a Policy
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ═══════════════════════════════════════════════════════════════
	   RM Dashboard — Bold & Premium layout (matches DSA pattern)
	   ═══════════════════════════════════════════════════════════════ */

	.rm-dashboard {
		max-width: 72rem;
	}

	/* --- Banners --- */
	.banner {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-card);
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 640px) {
		.banner {
			flex-direction: row;
			align-items: center;
		}
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
		background: var(--dash-btn-ghost-bg);
	}

	.banner-icon-success {
		background: var(--ddsa-success-light);
	}

	.banner-text {
		font-size: 0.875rem;
		color: var(--dash-text);
	}

	.banner-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.banner-btn-secondary {
		border-radius: 0.5rem;
		border: 1px solid var(--dash-border);
		background: transparent;
		padding: 0.4375rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.banner-btn-secondary:hover {
		background: var(--dash-hover);
		border-color: var(--dash-text-muted);
	}

	.banner-btn-primary {
		border-radius: 0.5rem;
		background: var(--dash-btn-bg);
		padding: 0.4375rem 1rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-btn-text);
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s;
	}

	.banner-btn-primary:hover {
		filter: brightness(1.1);
	}

	.banner-btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ───────────────────────────────────────────────────────────────
	   EDITORIAL HERO — "Morning Briefing"
	   60/40 split on desktop, stacks on tablet/mobile. Display-weight
	   headline gives the page a clear visual anchor; the lead-story
	   card on the right promotes the single most-urgent attention
	   item with one-tap CTA.
	   ─────────────────────────────────────────────────────────────── */
	.hero {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		margin-bottom: 2.5rem;
		align-items: stretch;
	}

	@media (min-width: 768px) {
		.hero {
			grid-template-columns: 1.4fr 1fr;
			gap: 2rem;
		}
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	.hero-eyebrow {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dash-text-muted);
		margin-bottom: 0.5rem;
	}

	.hero-headline {
		font-family: var(--font-title);
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -1px;
		line-height: 1.1;
		color: var(--dash-text);
	}

	.hero-meta {
		font-size: 0.875rem;
		color: var(--dash-text-muted);
		margin-top: 0.625rem;
	}

	.hero-summary {
		font-size: 1rem;
		color: var(--dash-text-secondary);
		margin-top: 0.875rem;
		line-height: 1.55;
		max-width: 32rem;
	}

	/* Lead-story card: the "above-the-fold" promoted attention item.
	   Slight gradient + warm accent border so the eye lands here. */
	.hero-lead {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 1.25rem 1.375rem;
		border-radius: 0.875rem;
		border: 1px solid var(--dash-btn-ghost-border, var(--dash-border));
		background: linear-gradient(
			135deg,
			var(--dash-btn-ghost-bg) 0%,
			var(--dash-bg-card) 75%
		);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		min-height: 9rem;
	}

	.hero-lead:hover {
		transform: translateY(-1px);
		border-color: var(--ddsa-primary-500);
		box-shadow: 0 6px 18px -10px var(--dash-shadow, rgba(0, 0, 0, 0.08));
	}

	.hero-lead-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.hero-lead-label {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--dash-accent-text);
	}

	.hero-lead-label-critical {
		color: var(--ddsa-error-dark, var(--dash-contrast-text));
	}

	.hero-lead-days {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.hero-lead-title {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--dash-text);
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.hero-lead-desc {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		line-height: 1.45;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		flex: 1;
	}

	.hero-lead-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-accent-text);
		margin-top: auto;
	}

	/* ───────────────────────────────────────────────────────────────
	   BENTO GRID — varied tile sizes for visual rhythm.
	   - Desktop (≥1024px): 4 columns
	   - Tablet (640–1023px): 2 columns (span-2 tiles stay full row)
	   - Mobile (<640px): 1 column
	   ─────────────────────────────────────────────────────────────── */
	.bento {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.bento {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.bento {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Bento zone wrapper: hosts an existing zone component (which
	   already paints its own card-glass internally on rows) inside a
	   grid cell. The wrapper itself has no visual treatment — it just
	   controls grid placement. We also neutralize the zone's
	   trailing margin so the bento gap is the source of truth. */
	.bento-zone-wrapper :global(section) {
		margin-bottom: 0 !important;
	}

	.bento-tile {
		min-width: 0;
		grid-column: span 1;
	}

	@media (min-width: 640px) {
		.bento-tile.bento-span-2 {
			grid-column: span 2;
		}
		.bento-tile.bento-span-4 {
			grid-column: span 2; /* tablet caps at 2 */
		}
	}

	@media (min-width: 1024px) {
		.bento-tile.bento-span-2 {
			grid-column: span 2;
		}
		.bento-tile.bento-span-4 {
			grid-column: span 4;
		}
	}

	/* Section-level zone title (used inside Action Required tile) */
	.zone-title {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dash-text-secondary);
		margin-bottom: 0.75rem;
	}

	.zone-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.action-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 0.5rem;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}

	.action-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		white-space: nowrap;
		flex-shrink: 0;
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
		border: 1px solid var(--dash-border);
	}

	/* Accent badge for clarifications — draws attention using brand color */
	.action-badge-accent {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		border-color: var(--dash-btn-ghost-border);
	}

	.action-content {
		flex: 1;
		min-width: 0;
	}

	.action-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-subtitle {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-urgency {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		white-space: nowrap;
		flex-shrink: 0;
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
		border: 1px solid var(--dash-contrast-ghost-border);
	}

	.action-urgency-critical {
		background: var(--ddsa-error-light, var(--dash-contrast-ghost-bg));
		color: var(--ddsa-error-dark, var(--dash-contrast-text));
	}

	.action-view-all {
		display: block;
		text-align: center;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		padding: 0.625rem 0;
		text-decoration: none;
	}

	.action-view-all:hover {
		text-decoration: underline;
	}

	/* --- Empty state --- */
	.empty-state {
		padding: 3rem 1.5rem;
		text-align: center;
		margin-top: 1rem;
	}

	.empty-icon {
		display: flex;
		height: 4rem;
		width: 4rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: var(--dash-btn-ghost-bg);
		margin: 0 auto 1rem;
	}

	.empty-title {
		font-family: var(--font-title);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--dash-text);
		margin-bottom: 0.5rem;
	}

	.empty-subtitle {
		font-size: 0.9375rem;
		color: var(--dash-text-secondary);
		max-width: 28rem;
		margin: 0 auto 1.5rem;
		line-height: 1.5;
	}

	.empty-cta-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}

	.empty-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--dash-btn-text);
		background: var(--dash-btn-bg);
		border-radius: 0.625rem;
		text-decoration: none;
		transition: all 0.25s;
	}

	.empty-cta:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}

	/* C.1 — secondary CTA (Capture a Policy) sits next to the primary "Find
	   DSAs" button. Visually subdued so the primary stays the lead action,
	   but actionable without an extra click. */
	.empty-cta-secondary {
		background: transparent;
		color: var(--dash-accent-text);
		border: 1px solid var(--dash-btn-ghost-border);
	}

	.empty-cta-secondary:hover {
		background: var(--dash-btn-ghost-bg);
		transform: translateY(-2px);
	}

	/* --- Responsive --- */
	@media (max-width: 640px) {
		.hero-headline {
			font-size: 1.875rem;
			letter-spacing: -0.5px;
		}

		.hero-summary {
			font-size: 0.9375rem;
		}

		.action-row {
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0.875rem 1rem;
		}
	}
</style>
