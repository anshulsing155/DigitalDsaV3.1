<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ROUTES } from '$lib/config/routes.js';
	import { formatCurrency } from '$lib/i18n';
	import GlanceCard from '$lib/components/dashboard/GlanceCard.svelte';
	import NeedsAttentionZone from '$lib/components/dashboard/NeedsAttentionZone.svelte';
	import RecentCasesZone from '$lib/components/dashboard/RecentCasesZone.svelte';
	import ReferAndEarnSection from '$lib/components/account/ReferAndEarnSection.svelte';
	import SampleDataBanner from '$lib/components/dashboard/SampleDataBanner.svelte';
	import { dashboardState } from '$lib/stores/dashboard.svelte';
	import TourLauncher from '$lib/components/walkthrough/TourLauncher.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { Plus, UserCircle, CircleCheck } from 'lucide-svelte';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			user?: { name?: string; id?: string };
			dsaProfile: {
				name: string;
				firmName?: string;
				city?: string;
				dsaCode?: string;
				businessType?: string;
				onboarding_v2_completed?: boolean;
			} | null;
			stats: {
				totalCases: number;
				activeCases: number;
				filesSubmittedThisMonth: number;
				filesSubmittedPrev: number;
				sanctionedThisMonth: { count: number; amount: number };
				sanctionedPrev: { count: number; amount: number };
				avgProcessingDays: number;
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
				stage?: string;
				stage_label?: string;
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
			}>;
			recentActivity: Array<{
				event_type: string;
				description: string;
				created_at: string;
				case_id: string;
			}>;
			rmContacts: Array<{
				rm_name: string;
				lender_name: string;
				phone?: string;
				whatsapp?: string;
				designation?: string;
			}>;
			lastUpdatedAt?: string;
			hasCases: boolean;
			hasRealCases: boolean;
			hasSampleCases: boolean;
		}
	);

	// ── Derived values ───────────────────────────────────────────
	const dsaName = $derived(data.dsaProfile?.name || data.user?.name || 'there');
	const hasCases = $derived(data.hasCases);
	const hasRealCases = $derived(data.hasRealCases);
	const hasSampleCases = $derived(data.hasSampleCases);
	const showSampleBanner = $derived(dashboardState.dsa && hasSampleCases);
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

	// ── Quick Glance: stat comparison text ──────────────────────
	const filesCompareText = $derived(
		data.stats.filesSubmittedPrev != null && data.stats.filesSubmittedPrev > 0
			? `vs ${data.stats.filesSubmittedPrev} last month`
			: ''
	);

	const sanctionedCompareText = $derived(
		data.stats.sanctionedPrev?.count != null && data.stats.sanctionedPrev.count > 0
			? `vs ${data.stats.sanctionedPrev.count} last month`
			: ''
	);

	// Trend logic
	const filesTrend = $derived.by((): 'up' | 'down' | 'neutral' => {
		const curr = data.stats.filesSubmittedThisMonth;
		const prev = data.stats.filesSubmittedPrev ?? 0;
		if (curr > prev) return 'up';
		if (curr < prev) return 'down';
		return 'neutral';
	});

	const sanctionedTrend = $derived.by((): 'up' | 'down' | 'neutral' => {
		const curr = data.stats.sanctionedThisMonth.count;
		const prev = data.stats.sanctionedPrev?.count ?? 0;
		if (curr > prev) return 'up';
		if (curr < prev) return 'down';
		return 'neutral';
	});

	// ── Sanctioned amount formatted for Quick Glance card ────────
	const sanctionedAmountLabel = $derived(
		data.stats.sanctionedThisMonth.amount > 0
			? formatCurrency(data.stats.sanctionedThisMonth.amount, true)
			: '--'
	);

	// ── V2 onboarding banner ────────────────────────────────────
	const v2Incomplete = $derived(!data.dsaProfile?.onboarding_v2_completed);
	let v2BannerDismissed = $state(false);

	// ── Clearing sample data ─────────────────────────────────────
	let clearingSamples = $state(false);
	let clearSamplesError = $state('');

	async function clearSampleData() {
		clearingSamples = true;
		clearSamplesError = '';
		try {
			const res = await secureFetch('/api/cases/sample-data', { method: 'DELETE' });
			if (res.ok) {
				dashboardState.dismiss();
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
</script>

<svelte:head>
	<title>Dashboard | DigitalDSA</title>
</svelte:head>

<div class="dashboard-home pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- BANNERS (V2 onboarding + sample data)                      -->
	<!-- ═══════════════════════════════════════════════════════════ -->

	<!-- V2 Onboarding Banner -->
	{#if v2Incomplete && !v2BannerDismissed}
		<div class="banner banner-onboarding">
			<div class="banner-content">
				<div class="banner-icon">
					<UserCircle
						size={16}
						strokeWidth={2}
						class="text-[var(--dash-accent-text)] dark:text-[var(--ddsa-primary-300)]"
					/>
				</div>
				<p class="banner-text">
					Complete your <strong>business profile</strong> to unlock personalized recommendations.
				</p>
			</div>
			<div class="banner-actions">
				<button onclick={() => (v2BannerDismissed = true)} class="banner-btn-secondary">
					Later
				</button>
				<a href="/dashboard/dsa/profile" class="banner-btn-primary"> Set Up Profile </a>
			</div>
		</div>
	{/if}

	<!-- Sample Data Banner -->
	{#if showSampleBanner && !showClearSamplePrompt}
		<SampleDataBanner onDismiss={() => dashboardState.dismiss()} />
	{/if}

	<!-- Clear Sample Data Prompt -->
	{#if showClearSamplePrompt}
		<div class="banner banner-samples">
			<div class="banner-content">
				<div class="banner-icon banner-icon-success">
					<CircleCheck
						size={16}
						strokeWidth={2}
						class="text-[var(--dash-text-secondary)] dark:text-[var(--ddsa-secondary-400)]"
					/>
				</div>
				<p class="banner-text">
					You've created your first case! Would you like to <strong>clear sample data</strong> from your
					dashboard?
				</p>
			</div>
			<div class="banner-actions">
				<button onclick={() => dashboardState.dismiss()} class="banner-btn-secondary">
					Keep Samples
				</button>
				<button onclick={clearSampleData} disabled={clearingSamples} class="banner-btn-primary">
					{clearingSamples ? 'Clearing...' : 'Clear Samples'}
				</button>
			</div>
		</div>
		{#if clearSamplesError}
			<div
				class="mt-2 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-accent-text)] dark:bg-[var(--ddsa-primary-900)]/20 dark:text-[var(--ddsa-primary-300)]"
			>
				{clearSamplesError}
			</div>
		{/if}
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- GREETING                                                    -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<header class="greeting">
		<div class="greeting-main">
			<h1 class="greeting-headline">{greeting}, {dsaName}.</h1>
			{#if hasCases && attentionCount > 0}
				<p class="greeting-subtitle">
					You have <span class="greeting-highlight"
						>{attentionCount} case{attentionCount !== 1 ? 's' : ''}</span
					>
					that need{attentionCount === 1 ? 's' : ''} your attention today.
				</p>
			{:else if hasCases}
				<p class="greeting-subtitle">All caught up — your cases are on track.</p>
			{:else}
				<p class="greeting-subtitle">
					Welcome to DigitalDSA. Create your first case to get started.
				</p>
			{/if}
		</div>
		<TourLauncher variant="dashboard" />
	</header>

	{#if hasCases}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ZONE 1: NEEDS ATTENTION                                    -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if data.attentionItems.length > 0}
			<div data-walkthrough="attention-items">
				<NeedsAttentionZone items={data.attentionItems} maxItems={5} />
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ZONE 2: QUICK GLANCE (4 stat cards)                       -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<section class="glance-zone" data-walkthrough="stats-row">
			<h2 class="zone-label">Quick Glance</h2>
			<div class="glance-grid">
				<GlanceCard
					label="Active Cases"
					value={data.stats.activeCases}
					accent={true}
					href={ROUTES.DASHBOARD.DSA.CASES}
				/>
				<GlanceCard
					label="Files Submitted"
					value={data.stats.filesSubmittedThisMonth}
					trend={filesTrend}
					compareText={filesCompareText}
				/>
				<GlanceCard
					label="Sanctioned"
					value={data.stats.sanctionedThisMonth.count}
					trend={sanctionedTrend}
					compareText={sanctionedCompareText}
				/>
				<GlanceCard label="Total Sanctioned" value={sanctionedAmountLabel} />
			</div>
		</section>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ZONE 3: RECENT CASES                                      -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<RecentCasesZone cases={data.recentCases} maxItems={5} />

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ZONE 4: REFER & EARN (F.1)                                -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="mt-6">
			<ReferAndEarnSection />
		</div>
	{:else}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE (no cases at all)                              -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="empty-state card-glass">
			<div class="empty-icon">
				<Plus size={28} strokeWidth={1.5} class="text-[var(--ddsa-primary-400)]" />
			</div>
			<h2 class="empty-title">Your Dashboard is Ready</h2>
			<p class="empty-subtitle">
				Create your first case to start tracking loan applications and connecting with RMs.
			</p>
			<a href={ROUTES.FORM.HOW_CAN_WE_HELP} class="empty-cta">
				<Plus size={16} strokeWidth={2} />
				Create Your First Case
			</a>
		</div>
	{/if}
</div>

<style>
	/* ═══════════════════════════════════════════════════════════════
	   Dashboard Home — Bold & Premium layout styles
	   ═══════════════════════════════════════════════════════════════ */

	.dashboard-home {
		max-width: 56rem;
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

	/* Primary button uses adaptive tokens — dark bronze bg in light, warm bronze in dark */
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

	/* --- Greeting --- */
	.greeting {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.greeting-headline {
		font-family: var(--font-title);
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: -0.5px;
		color: var(--dash-text);
		line-height: 1.2;
	}

	.greeting-subtitle {
		font-size: 0.9375rem;
		color: var(--dash-text-secondary);
		margin-top: 0.375rem;
	}

	/* Accent highlight uses adaptive token — dark in light mode, light in dark mode */
	.greeting-highlight {
		color: var(--dash-accent-text);
		font-weight: 600;
	}

	/* --- Quick Glance zone --- */
	.glance-zone {
		margin-bottom: 2rem;
	}

	.zone-label {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dash-text-secondary);
		margin-bottom: 0.75rem;
	}

	.glance-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 768px) {
		.glance-grid {
			grid-template-columns: repeat(4, 1fr);
		}
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
		max-width: 24rem;
		margin: 0 auto 1.5rem;
		line-height: 1.5;
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

	/* --- Responsive --- */
	@media (max-width: 640px) {
		.greeting-headline {
			font-size: 1.5rem;
		}
	}
</style>
